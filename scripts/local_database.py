"""Owned, persistent local PostgreSQL for manual development (never suite fixtures)."""

import argparse
import json
import os
import secrets
import socket
import subprocess
import sys
import tempfile
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlsplit

import psycopg

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))
DATABASE = "shovelready_local"
ROLE = "shovelready_local_owner"
OWNER = "shovelready-local-database-v1"


def default_root():
    base = Path(os.environ.get("LOCALAPPDATA", Path.home() / ".local/share"))
    return base / "ShovelReady/local-database"


def free_port(port):
    with socket.socket() as listener:
        if os.name == "nt":
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        listener.bind(("127.0.0.1", port))


class LocalDatabase:
    def __init__(self, root, binaries, port=55432):
        self.root = Path(root).resolve()
        self.bin = Path(binaries).resolve()
        self.port = port
        self.data = self.root / "data"
        self.config = self.root / "local.json"

    def run(self, name, *args, allowed=(0,)):
        env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
        env["LC_ALL"] = "C"
        executable = self.bin / (name + (".exe" if os.name == "nt" else ""))
        # Files avoid inherited Windows background-server pipe handles.
        with tempfile.TemporaryFile(mode="w+t") as output:
            result = subprocess.run(
                [str(executable), *args], env=env, stdout=output,
                stderr=subprocess.STDOUT, text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            if result.returncode not in allowed:
                raise RuntimeError(f"{name} failed ({result.returncode}); inspect {self.root}")
            output.seek(0)
            return result.returncode, output.read()

    def identifier(self):
        _, output = self.run("pg_controldata", "-D", str(self.data))
        for line in output.splitlines():
            if line.startswith("Database system identifier:"):
                return line.split(":", 1)[1].strip()
        raise ValueError("Cannot read PostgreSQL system identifier")

    def load(self):
        value = json.loads(self.config.read_text(encoding="utf-8"))
        url = urlsplit(value["SHOVELREADY_DATABASE_URL"])
        if (url.scheme != "postgresql" or url.hostname != "127.0.0.1"
                or url.port != self.port or url.username != ROLE
                or url.path != f"/{DATABASE}" or url.query or url.fragment
                or not url.password):
            raise ValueError("Connection configuration is not the dedicated local database")
        if (value["owner"] != OWNER or value["root"] != str(self.root)
                or value["port"] != self.port or value["binaries"] != str(self.bin)
                or self.data.is_symlink() or self.data.resolve() != self.data
                or value["system_identifier"] != self.identifier()):
            raise ValueError("Ownership/configuration mismatch; refusing cluster operation")
        return value

    @contextmanager
    def lock(self):
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        path = self.root / "operator.lock"
        path.open("x").close()
        try:
            yield
        finally:
            path.unlink()

    def initialize(self):
        if self.config.exists():
            self.load()
            return
        if any(p.name != "operator.lock" for p in self.root.iterdir()):
            raise ValueError("Unowned/nonempty directory; refusing initialization")
        free_port(self.port)
        password = secrets.token_hex(32)
        password_file = self.root / "init-password"
        password_file.touch(mode=0o600)
        password_file.write_text(password, encoding="utf-8")
        try:
            self.run("initdb", "-D", str(self.data), "-U", ROLE,
                     "--auth=scram-sha-256", f"--pwfile={password_file}",
                     "--encoding=UTF8", "--no-locale")
        finally:
            password_file.unlink()
        with (self.data / "postgresql.conf").open("a", encoding="utf-8") as config:
            config.write(f"\nlisten_addresses = '127.0.0.1'\nport = {self.port}\n"
                         "unix_socket_directories = ''\n")
        value = dict(owner=OWNER, root=str(self.root), binaries=str(self.bin), port=self.port,
                     system_identifier=self.identifier(),
                     SHOVELREADY_DATABASE_URL=(
                         f"postgresql://{ROLE}:{password}@127.0.0.1:{self.port}/{DATABASE}"))
        self.config.touch(mode=0o600)
        self.config.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")

    def running(self):
        code, _ = self.run("pg_ctl", "-D", str(self.data), "status", allowed=(0, 3))
        return code == 0

    def verify_server(self, value):
        with psycopg.connect(value["SHOVELREADY_DATABASE_URL"], dbname="postgres",
                             connect_timeout=5, autocommit=True) as connection:
            directory, port, host, identifier = connection.execute(
                "SELECT current_setting('data_directory'), current_setting('port'), "
                "current_setting('listen_addresses'), system_identifier::text "
                "FROM pg_control_system()"
            ).fetchone()
            if (Path(directory).resolve() != self.data or int(port) != self.port
                    or host != "127.0.0.1" or identifier != value["system_identifier"]):
                raise ValueError("Connected server is not the owned loopback cluster")

    def start(self):
        self.initialize()
        value = self.load()
        if not self.running():
            free_port(self.port)
            self.run("pg_ctl", "-D", str(self.data), "-l", str(self.root / "server.log"),
                     "-w", "start", "-o", f"-h 127.0.0.1 -p {self.port}")
        self.verify_server(value)
        with psycopg.connect(value["SHOVELREADY_DATABASE_URL"], dbname="postgres",
                             connect_timeout=5, autocommit=True) as connection:
            if not connection.execute("SELECT 1 FROM pg_database WHERE datname = %s",
                                      (DATABASE,)).fetchone():
                connection.execute(psycopg.sql.SQL("CREATE DATABASE {}").format(
                    psycopg.sql.Identifier(DATABASE)))

    def execute(self, action):
        if any((p / ".git").exists() for p in (self.root, *self.root.parents)):
            raise ValueError("Local data/configuration must be outside Git checkouts")
        if any(k.startswith("PG") for k in os.environ):
            raise ValueError("Clear PG environment overrides before using the owned cluster")
        with self.lock():
            if action == "start":
                self.start()
            else:
                value = self.load()
                running = self.running()
                if running:
                    self.verify_server(value)
                if action == "status":
                    print("running" if running else "stopped")
                elif action == "stop":
                    if running:
                        self.run("pg_ctl", "-D", str(self.data), "-w", "stop", "-m", "fast")
                else:
                    if not running:
                        raise ValueError("Owned cluster is stopped; run start first")
                    from app.persistence import Repository, connect
                    from app.persistence.migrate import upgrade
                    from app.spatial.importer import import_pilot

                    engine = connect(value["SHOVELREADY_DATABASE_URL"])
                    try:
                        if action == "migrate":
                            upgrade(engine)
                        elif action == "seed":
                            repository = Repository(engine)
                            result = import_pilot(repository)
                            stored = repository.get("spatial", result.identity.revision_id)
                            if stored != result:
                                raise ValueError("Spatial read-back differs from import")
                            print(f"Spatial revision: {stored.identity.revision_id}")
                            print(f"{len(stored.observations)} responses, "
                                  f"{len(stored.features)} features, "
                                  f"{len(stored.parcels)} parcels; "
                                  "unreviewed; no screening or publication")
                    finally:
                        engine.dispose()
        print(f"{action} complete; local configuration: {self.config}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("start", "status", "migrate", "seed", "stop"))
    parser.add_argument("--root", type=Path, default=default_root())
    parser.add_argument("--postgres-bin", type=Path,
                        default=Path("C:/Program Files/PostgreSQL/17/bin"))
    parser.add_argument("--port", type=int, default=55432)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("port must be between 1024 and 65535")
    try:
        LocalDatabase(args.root, args.postgres_bin, args.port).execute(args.action)
    except Exception as error:
        # Driver/SQL errors can contain secrets or payloads. Never print their text.
        print(f"{args.action} failed ({type(error).__name__}); no success claimed. "
              "Check ownership, local configuration, port and server.log.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
