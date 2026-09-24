"""Foreground, owned local demo. Preparation is deliberately a separate command."""

import argparse
import json
import os
import re
import shutil
import socket
import subprocess
import sys
from pathlib import Path

from local_database import REPO, LocalDatabase

sys.path.insert(0, str(REPO))


class DemoError(Exception):
    pass


def clean_commit():
    def git(*args):
        return subprocess.check_output(
            ["git", *args], cwd=REPO, text=True, stderr=subprocess.DEVNULL
        ).strip()

    if git("status", "--porcelain", "--untracked-files=all"):
        raise DemoError("A clean Git checkout is required; commit or relocate changes explicitly.")
    return git("rev-parse", "HEAD")


def database_url(config, revision):
    if not re.fullmatch(r"spatial:sha256:[0-9a-f]{64}", revision):
        raise DemoError("Supply an exact spatial:sha256 revision from explicit seed output.")
    if not config.is_file():
        raise DemoError("Owned database configuration is missing; prepare it explicitly first.")
    if any(k.startswith("PG") for k in os.environ):
        raise DemoError("Clear PG environment overrides before launching.")
    try:
        value = json.loads(config.read_text(encoding="utf-8"))
        db = LocalDatabase(config.parent, value["binaries"], value["port"])
        if config.resolve() != db.config:
            raise ValueError("Unsupported configuration filename")
        with db.lock():
            value = db.load()
            if not db.running():
                raise ValueError("Stopped")
            db.verify_server(value)
    except Exception:
        raise DemoError(
            "Owned database unavailable or configuration invalid; check start/status."
        ) from None
    from app.investigation import read_investigation
    from app.persistence import Repository, connect

    engine = None
    try:
        engine = connect(value["SHOVELREADY_DATABASE_URL"])
        read_investigation(Repository(engine), revision)
    except Exception:
        raise DemoError(
            "Selected spatial revision unavailable or invalid; check explicit migrate/seed."
        ) from None
    finally:
        if engine is not None:
            engine.dispose()
    return value["SHOVELREADY_DATABASE_URL"]


def serve(config, revision, port):
    if sys.version_info[:2] != (3, 12) or os.environ.get("SHOVELREADY_ENV", "development") not in {
        "development",
        "test",
    }:
        raise DemoError("Use Python 3.12 and development/test environment.")
    commit = clean_commit()
    # Reserve the actual serving socket through build and startup, avoiding port adoption races.
    with socket.socket() as listener:
        if os.name == "nt":
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        try:
            listener.bind(("127.0.0.1", port))
        except OSError:
            raise DemoError("HTTP port unavailable; choose an explicit free port.") from None
        url = database_url(config, revision)
        npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
        node = shutil.which("node")
        if not npm or not node:
            raise DemoError("Node 22.14+ (22.x) and npm are required.")
        version = subprocess.check_output([node, "--version"], text=True).strip()
        if not re.fullmatch(r"v22\.(?:1[4-9]|[2-9][0-9])\.\d+", version):
            raise DemoError("Node 22.14+ (22.x) is required.")
        env = dict(os.environ, VITE_APPLICATION_COMMIT=commit)
        for command in ([npm, "ci"], [npm, "run", "build"]):
            if subprocess.run(command, cwd=REPO / "frontend", env=env).returncode:
                raise DemoError("Frontend installation/build failed; HTTP was not started.")
        if clean_commit() != commit:
            raise DemoError("Checkout changed during build; launch again from a clean commit.")
        os.environ.update(
            SHOVELREADY_DATABASE_URL=url,
            SHOVELREADY_SPATIAL_COLLECTION="victoria-pilot-three-leads",
            SHOVELREADY_SPATIAL_REVISION=revision,
            SHOVELREADY_APPLICATION_COMMIT=commit,
            SHOVELREADY_FRONTEND_COMMIT=commit,
        )
        import uvicorn

        from app.main import create_app

        print(f"Application/frontend commit: {commit}\nSpatial revision: {revision}", flush=True)
        print(
            f"http://127.0.0.1:{port} — no screening performed; Ctrl+C stops HTTP only.", flush=True
        )
        server = uvicorn.Server(uvicorn.Config(create_app(), host="127.0.0.1", port=port))
        server.run(sockets=[listener])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--port", type=int, default=8012)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("port must be between 1024 and 65535")
    try:
        serve(args.config.resolve(), args.revision, args.port)
    except DemoError as error:
        print(str(error), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        pass
    except Exception:
        print(
            "Demo failed; check tools/configuration. No database changes were requested.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
