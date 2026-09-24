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
        return result.returncode
    finally:
        if started:
            run("pg_ctl", "-D", str(data), "-w", "stop", "-m", "fast")


if __name__ == "__main__":
    raise SystemExit(main())
