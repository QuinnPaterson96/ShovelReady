"""Run tests in a new loopback-only PostgreSQL cluster, then stop that cluster.

Requires installed PostgreSQL binaries. Data/logs are retained in the printed
temporary directory for diagnosis; no existing database is reused or deleted.
"""

import argparse
import os
import socket
import subprocess
import sys
import tempfile
from pathlib import Path
from uuid import uuid4


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--postgres-bin", type=Path, required=True)
    parser.add_argument(
        "--demo",
        action="store_true",
        help="after passing tests, explicitly migrate/import and serve until Ctrl+C",
    )
    parser.add_argument("--http-port", type=int, default=8000)
    args = parser.parse_args()
    root = Path(tempfile.mkdtemp(prefix="shovelready-postgres-"))
    data = root / "data"
    database = "shovelready_test_" + uuid4().hex
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    # Fail on a port race, never attach to a pre-existing server.
    env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
    env.update(
        SHOVELREADY_ENV="test",
        SHOVELREADY_TEST_DATABASE_DISPOSABLE="yes",
        SHOVELREADY_TEST_DATABASE_URL=(f"postgresql://fixture@127.0.0.1:{port}/{database}"),
    )
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0

    def run(name, *arguments):
        executable = args.postgres_bin / (name + (".exe" if os.name == "nt" else ""))
        # pg_ctl's background server can inherit pipe handles on Windows. A file
        # keeps command output readable without waiting for server EOF.
        with tempfile.TemporaryFile(mode="w+t") as output:
            result = subprocess.run(
                [str(executable), *arguments],
                env=env,
                creationflags=flags,
                stdout=output,
                stderr=subprocess.STDOUT,
                text=True,
            )
            output.seek(0)
            print(output.read(), end="", flush=True)
        result.check_returncode()

    print(f"Disposable PostgreSQL files: {root}", flush=True)
    run(
        "initdb", "-D", str(data), "-U", "fixture", "--auth=trust", "--encoding=UTF8", "--no-locale"
    )
    started = False
    try:
        run(
            "pg_ctl",
            "-D",
            str(data),
            "-l",
            str(root / "server.log"),
            "-w",
            "start",
            "-o",
            f"-h 127.0.0.1 -p {port}",
        )
        started = True
        run("createdb", "-h", "127.0.0.1", "-p", str(port), "-U", "fixture", database)
        result = subprocess.run(
            [sys.executable, "-m", "pytest", "-q"],
            env=env,
            creationflags=flags,
            capture_output=True,
            text=True,
        )
        print(result.stdout, end="", flush=True)
        print(result.stderr, end="", file=sys.stderr, flush=True)
        if result.returncode == 0 and args.demo:
            # Separate operator-requested commands, never HTTP startup work.
            demo_env = dict(
                env,
                SHOVELREADY_DATABASE_URL=env["SHOVELREADY_TEST_DATABASE_URL"],
                SHOVELREADY_SPATIAL_COLLECTION="victoria-pilot-three-leads",
            )
            subprocess.run(
                [sys.executable, "-m", "app.persistence.migrate"], env=demo_env, check=True
            )
            imported = subprocess.run(
                [sys.executable, "-m", "app.spatial", "--import-records"],
                env=demo_env,
                check=True,
                capture_output=True,
                text=True,
            )
            print(imported.stdout, flush=True)
            demo_env["SHOVELREADY_SPATIAL_REVISION"] = imported.stdout.split(": ", 1)[0]
            print(
                f"Real observations: http://127.0.0.1:{args.http_port}; Ctrl+C stops demo/DB",
                flush=True,
            )
            try:
                subprocess.run(
                    [
                        sys.executable,
                        "-m",
                        "uvicorn",
                        "app.main:app",
                        "--host",
                        "127.0.0.1",
                        "--port",
                        str(args.http_port),
                    ],
                    env=demo_env,
                    creationflags=flags,
                    check=True,
                )
            except KeyboardInterrupt:
                pass
        return result.returncode
    finally:
        if started:
            run("pg_ctl", "-D", str(data), "-w", "stop", "-m", "fast")


if __name__ == "__main__":
    raise SystemExit(main())
