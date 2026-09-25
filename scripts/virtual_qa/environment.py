"""Owned local preparation primitives; no participant dispatch or remote database access."""

import hashlib
import json
import os
import re
import shutil
import socket
import stat
import subprocess
import sys
from pathlib import Path
from typing import Literal

from pydantic import model_validator

from scripts.local_database import LocalDatabase, default_root
from scripts.virtual_qa.contracts import Commit, DataIdentity, Digest, Record, Text

TARGET = "frontend/src/preview/InvestigationPreview.tsx"
AUTHOR = "quinnpaterson96"
EMAIL = "60762693+QuinnPaterson96@users.noreply.github.com"


class Replacement(Record):
    path: Literal["frontend/src/preview/InvestigationPreview.tsx"]
    before_sha256: Digest
    after_sha256: Digest
    asset: Text


class Recipe(Record):
    schema_version: Literal["virtual-qa-materialization/v1"]
    baseline_commit: Commit
    case_id: Text
    case_revision: Text
    data: DataIdentity
    entry_path: Literal["/"]
    replacements: tuple[Replacement, ...]

    @model_validator(mode="after")
    def finite_recipe(self):
        if len(self.replacements) > 1:
            raise ValueError("only one reviewed renderer replacement is supported")
        if self.data.kind not in {"synthetic_fixture", "observation"}:
            raise ValueError("accepted releases are outside this runner's scope")
        if self.data.identity.value is None or self.data.revision.value is None:
            raise ValueError("materialization requires exact data identity and revision")
        if self.replacements and self.data.kind != "synthetic_fixture":
            raise ValueError("fault variants must be synthetic")
        if self.data.kind == "observation" and (
            self.data.identity.value != "victoria-pilot-three-leads"
            or not re.fullmatch(r"spatial:sha256:[0-9a-f]{64}", self.data.revision.value)
        ):
            raise ValueError("only pinned Victoria observations are supported")
        return self


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def path_checked(path: Path) -> Path:
    """Refuse symlink/junction components before resolution, including existing parents."""
    path = Path(os.path.abspath(path))
    for part in (path, *path.parents):
        if part.is_symlink() or part.is_junction():
            raise ValueError("symlink/junction paths are not owned locations")
    return path.resolve()


def child(root: Path, relative: str) -> Path:
    if "\\" in relative or ":" in relative:
        raise ValueError("use a relative POSIX artifact path")
    rel = Path(relative)
    if rel.is_absolute() or ".." in rel.parts or not rel.parts:
        raise ValueError("artifact path escapes its root")
    root = path_checked(root)
    result = path_checked(root / rel)
    if not result.is_relative_to(root) or result == root:
        raise ValueError("artifact path escapes its root")
    return result


def external_root(path: Path) -> Path:
    path = path_checked(path)
    if path == Path(path.anchor) or path == Path.home().resolve():
        raise ValueError("explicit dedicated directory required")
    if any((p / ".git").exists() for p in (path, *path.parents)):
        raise ValueError("outputs and scratch must be outside Git checkouts")
    default = default_root().resolve()
    if path == default or path.is_relative_to(default) or default.is_relative_to(path):
        raise ValueError("default database location or its ancestor is forbidden")
    return path


def exclusive_json(path: Path, value):
    path = path_checked(path)
    with path.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False, allow_nan=False)
        stream.write("\n")


def remove_owned_scratch(path: Path, parent: Path, owner: dict):
    path, parent = path_checked(path), path_checked(parent)
    if path.parent != parent or json.loads((path / "owner.json").read_text()) != owner:
        raise ValueError("scratch ownership mismatch")

    def writable_retry(function, filename, error):
        # Git objects are read-only on Windows; do not broaden unrelated error handling.
        if not isinstance(error, PermissionError):
            raise error
        target = path_checked(Path(filename))
        if not target.is_relative_to(path):
            raise ValueError("cleanup escaped owned scratch")
        target.chmod(stat.S_IWRITE | stat.S_IREAD)
        function(filename)

    shutil.rmtree(path, onexc=writable_retry)


def clean_env():
    # Do not inherit app/database/model credentials into npm or the served process.
    return {
        k: v for k, v in os.environ.items()
        if not k.startswith(("PG", "SHOVELREADY_", "VITE_", "GIT_"))
        and not any(word in k.upper() for word in ("TOKEN", "PASSWORD", "SECRET", "API_KEY"))
        and k not in {"DATABASE_URL", "PYTHONPATH", "PYTHONHOME"}
    }


def command(args, cwd, *, env=None):
    result = subprocess.run(
        [str(a) for a in args], cwd=cwd, env=env, capture_output=True,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    if result.returncode:
        # Tool output can contain credentials. Never echo arbitrary stderr.
        raise RuntimeError(f"{Path(args[0]).name} failed with exit {result.returncode}")
    return result.stdout


def git(root, *args):
    return command(["git", *args], root, env=clean_env()).decode().strip()


def clean_commit(root):
    if git(root, "status", "--porcelain", "--untracked-files=all"):
        raise ValueError("clean pinned source checkout required")
    return git(root, "rev-parse", "HEAD")


def tracked_bytes(root):
    names = command(["git", "ls-files", "-z"], root).decode().split("\0")
    return {name: digest(child(root, name).read_bytes()) for name in names if name}


def verify_inputs(checkout, case):
    """V1 recipes only support retained, hash-pinned local fixtures/sources."""
    for ref in (*case.fixtures, *case.sources):
        revision = ref.revision.value
        if revision is None or not re.fullmatch(r"sha256:[0-9a-f]{64}", revision):
            raise ValueError("fixture/source needs a retained byte hash")
        if digest(child(checkout, ref.uri).read_bytes()) != revision.removeprefix("sha256:"):
            raise ValueError("fixture/source bytes differ from case pin")


def materialize(source: Path, destination: Path, recipe: Recipe, assets: dict[str, bytes]):
    clean_commit(source)
    if destination.exists():
        raise ValueError("materialization destination already exists")
    command(["git", "clone", "--no-hardlinks", "--no-checkout", str(source),
             str(destination)], source, env=clean_env())
    git(destination, "config", "--local", "core.autocrlf", "false")
    git(destination, "config", "--local", "user.name", AUTHOR)
    git(destination, "config", "--local", "user.email", EMAIL)
    git(destination, "checkout", "--detach", recipe.baseline_commit)
    if clean_commit(destination) != recipe.baseline_commit:
        raise ValueError("baseline commit mismatch")
    before = tracked_bytes(destination)
    for replacement in recipe.replacements:
        target = child(destination, replacement.path)
        payload = assets[replacement.asset]
        if before[replacement.path] != replacement.before_sha256:
            raise ValueError("replacement preimage mismatch")
        if digest(payload) != replacement.after_sha256:
            raise ValueError("replacement asset mismatch")
        target.write_bytes(payload)
    after = tracked_bytes(destination)
    allowed = {r.path: r.after_sha256 for r in recipe.replacements}
    if after != (before | allowed):
        raise ValueError("unexpected tracked-byte changes")
    if recipe.replacements:
        for identity in ("GIT_AUTHOR_IDENT", "GIT_COMMITTER_IDENT"):
            if not git(destination, "var", identity).startswith(f"{AUTHOR} <{EMAIL}>"):
                raise ValueError("personal derived commit identity required")
        git(destination, "add", "--", TARGET)
        git(destination, "-c", "core.hooksPath=", "commit", "-m",
            "Local disposable QA display variant")
    return {
        "baseline_commit": recipe.baseline_commit,
        "derived_commit": clean_commit(destination),
        "derived_tree": git(destination, "rev-parse", "HEAD^{tree}"),
        "changed_paths": sorted(name for name in before if before[name] != after[name]),
        "tracked_sha256": after,
    }


def build(root: Path, receipt: dict):
    node = shutil.which("node")
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not node or not npm or not re.fullmatch(
        r"v22\.(?:1[4-9]|[2-9][0-9])\.\d+", command([node, "--version"], root).decode().strip()
    ):
        raise ValueError("Node 22.14+ (22.x) and npm required")
    env = dict(clean_env(), VITE_APPLICATION_COMMIT=receipt["derived_commit"])
    for args in ([npm, "ci"], [npm, "run", "build"]):
        command(args, root / "frontend", env=env)
    if clean_commit(root) != receipt["derived_commit"]:
        raise ValueError("checkout changed during build")
    if tracked_bytes(root) != receipt["tracked_sha256"]:
        raise ValueError("tracked content changed during build")
    dist = root / "frontend/dist"
    # Only index and hashed assets are exposed by create_app; no repository file server.
    if not (dist / "index.html").is_file():
        raise ValueError("frontend build missing")
    return {
        p.relative_to(dist).as_posix(): digest(p.read_bytes())
        for p in sorted(dist.rglob("*")) if p.is_file()
    }


def loopback_socket(port: int):
    if not 1024 <= port <= 65535:
        raise ValueError("explicit port must be between 1024 and 65535")
    listener = socket.socket()
    try:
        if os.name == "nt":
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        listener.bind(("127.0.0.1", port))
        return listener
    except BaseException:
        listener.close()
        raise


def database(root: Path, binaries: Path, port: int):
    if any(k.startswith("PG") for k in os.environ):
        raise ValueError("clear inherited PG overrides before preparation")
    return LocalDatabase(root, binaries, port)


def serve(checkout: Path, config: Path, ready: Path, port: int):
    """Child process owns its socket; parent keeps a Popen handle, never adopts a PID."""
    values = json.loads(config.read_text())
    if sys.version_info[:2] != (3, 12):
        raise ValueError("Python 3.12 required")
    if clean_commit(checkout) != values["commit"]:
        raise ValueError("served checkout identity differs")
    environment = clean_env()
    os.environ.clear()
    os.environ.update(environment, SHOVELREADY_ENV="test",
                      SHOVELREADY_APPLICATION_COMMIT=values["commit"],
                      SHOVELREADY_FRONTEND_COMMIT=values["commit"])
    if values["database_config"]:
        db_config = json.loads(Path(values["database_config"]).read_text())
        os.environ.update(
            SHOVELREADY_DATABASE_URL=db_config["SHOVELREADY_DATABASE_URL"],
            SHOVELREADY_SPATIAL_COLLECTION="victoria-pilot-three-leads",
            SHOVELREADY_SPATIAL_REVISION=values["revision"],
        )
    sys.path.insert(0, str(checkout))
    import uvicorn

    from app.main import create_app

    with loopback_socket(port) as listener:
        app = create_app(frontend_dist=checkout / "frontend/dist")
        exclusive_json(ready, {"owner": values["owner"]})
        uvicorn.Server(uvicorn.Config(app, log_level="error")).run(sockets=[listener])
