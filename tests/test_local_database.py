"""Offline lifecycle checks; native integration uses ONLY a new temporary cluster."""

import json
import os
import socket
from pathlib import Path

import pytest
from sqlalchemy.exc import ProgrammingError

from scripts.local_database import LocalDatabase
from tests.database_safety import require_disposable_database


def test_cli_failure_is_nonzero_and_redacted(monkeypatch, capsys):
    from scripts.local_database import main

    def failed(self, action):
        raise RuntimeError("secret URL and payload must not escape")

    monkeypatch.setattr(LocalDatabase, "execute", failed)
    monkeypatch.setattr("sys.argv", ["local_database.py", "migrate"])
    assert main() == 1
    output = capsys.readouterr()
    assert "secret URL" not in output.err
    assert "failed" in output.err
    assert "complete" not in output.out


def test_foreign_directory_and_repository_refused(tmp_path):
    foreign = tmp_path / "foreign"
    foreign.mkdir()
    sentinel = foreign / "PG_VERSION"
    sentinel.write_text("17")
    helper = LocalDatabase(foreign, tmp_path)
    with pytest.raises(ValueError, match="Unowned"):
        helper.execute("start")
    assert sentinel.read_text() == "17"
    assert not helper.data.exists()
    (tmp_path / ".git").mkdir()
    with pytest.raises(ValueError, match="outside Git"):
        LocalDatabase(tmp_path / "other", tmp_path).execute("start")


def test_occupied_port_refused_before_initialization(tmp_path):
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        helper = LocalDatabase(tmp_path / "cluster", tmp_path, listener.getsockname()[1])
        with pytest.raises(OSError):
            helper.execute("start")
        assert not helper.data.exists()


def test_override_and_concurrent_operator_refused(tmp_path, monkeypatch):
    helper = LocalDatabase(tmp_path / "cluster", tmp_path)
    monkeypatch.setenv("PGSERVICE", "unrelated")
    with pytest.raises(ValueError, match="PG environment"):
        helper.execute("start")
    monkeypatch.delenv("PGSERVICE")
    with helper.lock(), pytest.raises(FileExistsError):
        helper.execute("start")


def test_native_lifecycle(tmp_path, monkeypatch):
    binaries = os.environ.get("SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN")
    if not binaries:
        pytest.skip("opt in with SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN; fresh scratch only")
    from app.persistence import Repository, connect
    from app.spatial.importer import prepare

    # Never use the manual default path or a supplied database URL.
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    helper = LocalDatabase(tmp_path / "scratch", Path(binaries), port)
    monkeypatch.setenv("DATABASE_URL", "must-not-be-used")
    monkeypatch.setenv("SHOVELREADY_DATABASE_URL", "must-not-be-used")
    try:
        helper.execute("start")
        helper.execute("start")
        helper.execute("status")
        config = json.loads(helper.config.read_text())
        url = config["SHOVELREADY_DATABASE_URL"]
        with pytest.raises(ValueError, match="explicitly disposable"):
            require_disposable_database(dict(SHOVELREADY_ENV="test",
                SHOVELREADY_TEST_DATABASE_DISPOSABLE="yes", SHOVELREADY_TEST_DATABASE_URL=url))
        # Failed import is an error before migrations, never a reported seed success.
        with pytest.raises(ProgrammingError):
            helper.execute("seed")
        helper.execute("migrate")
        helper.execute("migrate")
        helper.execute("seed")
        sources, expected = prepare()
        engine = connect(url)
        try:
            repository = Repository(engine)
            assert repository.get("spatial", expected.identity.revision_id) == expected
            assert len(sources) == 15
            for source in sources:
                assert repository.get("source", source.snapshot_id) == source
            assert (len(expected.observations), len(expected.features), len(expected.parcels)) == (
                9, 10, 3)
            helper.execute("seed")
            assert len(repository.history("spatial", expected.identity.logical_id)) == 1
        finally:
            engine.dispose()
        helper.execute("stop")
        helper.execute("stop")
        helper.execute("status")
        # Occupied configured port while stopped must not attach to a different server.
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", port))
            listener.listen()
            with pytest.raises(OSError):
                helper.execute("start")
        helper.execute("start")
        engine = connect(url)
        try:
            assert Repository(engine).get("spatial", expected.identity.revision_id) == expected
        finally:
            engine.dispose()
        # Exercise the integration seam without replacing connect/Repository: the
        # restarted helper's actual configuration must serve its exact seeded revision.
        from fastapi.testclient import TestClient

        from app.main import create_app

        monkeypatch.setenv("SHOVELREADY_DATABASE_URL", url)
        monkeypatch.setenv("SHOVELREADY_SPATIAL_COLLECTION", expected.identity.logical_id)
        monkeypatch.setenv("SHOVELREADY_SPATIAL_REVISION", expected.identity.revision_id)
        with TestClient(create_app()) as client:
            response = client.get("/api/investigation")
            assert response.status_code == 200
            payload = response.json()
            assert payload["spatial"] == expected.model_dump(mode="json")
            assert len(payload["sources"]) == 15
            assert payload["screening_status"] == "not_performed"
            assert "SHOVELREADY_DATABASE_URL" not in response.text
        original = helper.config.read_text()
        config["system_identifier"] = "foreign-cluster"
        helper.config.write_text(json.dumps(config))
        try:
            with pytest.raises(ValueError, match="Ownership"):
                helper.execute("stop")
            assert helper.running()
        finally:
            helper.config.write_text(original)
    finally:
        if helper.config.exists():
            helper.execute("stop")
