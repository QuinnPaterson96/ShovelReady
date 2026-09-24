"""Observations only: API boundaries and actual licensed PostgreSQL reads."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

import app.investigation as api
from app.main import create_app
from app.spatial.importer import import_pilot, prepare
from tests.test_persistence import engine as engine
from tests.test_persistence import repo as repo


@pytest.fixture
def configured(monkeypatch):
    sources, spatial = prepare()
    monkeypatch.setenv("SHOVELREADY_DATABASE_URL", "postgresql://unused")
    monkeypatch.setenv("SHOVELREADY_SPATIAL_COLLECTION", api.COLLECTION)
    monkeypatch.setenv("SHOVELREADY_SPATIAL_REVISION", spatial.identity.revision_id)
    return sources, spatial


def test_missing_configuration_no_legacy_fallback(monkeypatch):
    for key in (
        "SHOVELREADY_DATABASE_URL",
        "SHOVELREADY_SPATIAL_COLLECTION",
        "SHOVELREADY_SPATIAL_REVISION",
    ):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("DATABASE_URL", "must never connect")
    monkeypatch.setattr(api, "connect", lambda _: pytest.fail("unexpected connection"))
    client = TestClient(create_app())
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/api/investigation").status_code == 503
    assert client.post("/api/investigation").status_code == 405
    assert client.get("/api/investigation/source/private").status_code == 404


def test_real_import_to_http(repo, monkeypatch, configured):
    spatial = import_pilot(repo)
    monkeypatch.setattr(api, "connect", lambda _: repo.engine)
    response = TestClient(create_app()).get("/api/investigation")
    assert response.status_code == 200
    data = response.json()
    assert data["spatial"] == spatial.model_dump(mode="json")
    assert len(data["sources"]) == 15
    assert len(data["spatial"]["features"]) == 10
    assert len(data["spatial"]["parcels"]) == 3
    assert data["screening_status"] == "not_performed"
    assert "artifact" not in response.text and "repo:" not in response.text
    assert "effective_from" in response.text
    assert all(p["status"] == "needs_investigation" for p in data["spatial"]["parcels"])


def test_missing_revision_and_sanitized_database_failure(repo, monkeypatch, configured):
    monkeypatch.setattr(api, "connect", lambda _: repo.engine)
    client = TestClient(create_app())
    assert client.get("/api/investigation").status_code == 404

    def broken(_):
        raise OperationalError("private connection string", {}, Exception("secret path"))

    monkeypatch.setattr(api, "connect", broken)
    response = client.get("/api/investigation")
    assert response.status_code == 503
    assert "private" not in response.text and "secret" not in response.text


def test_scope_and_pin_rejection(configured):
    sources, spatial = configured
    values = {s.snapshot_id: s for s in sources}
    values[spatial.identity.revision_id] = spatial

    class Reader:
        def get(self, kind, key):
            return values[key]

    reader = Reader()
    assert api.read_investigation(reader, spatial.identity.revision_id)
    original = sources[0]
    values[original.snapshot_id] = original.model_copy(update={"source_url": "file:///private"})
    with pytest.raises(ValueError, match="pinned"):
        api.read_investigation(reader, spatial.identity.revision_id)
    values[original.snapshot_id] = original
    values[spatial.identity.revision_id] = spatial.model_copy(
        update={"source_snapshot_ids": (*spatial.source_snapshot_ids, "private-bylaw")}
    )
    with pytest.raises(ValueError, match="licensed"):
        api.read_investigation(reader, spatial.identity.revision_id)
    values[spatial.identity.revision_id] = spatial.model_copy(update={"schema_version": "future"})
    with pytest.raises(ValueError):
        api.read_investigation(reader, spatial.identity.revision_id)


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "file:///private",
        "https://evil.test",
        "https://maps.victoria.ca@evil.test/",
        "https://maps.victoria.ca/\nx",
    ],
)
def test_unsafe_links(url):
    with pytest.raises(ValueError):
        api.safe_url(url)


def test_frontend_schema_matches_api():
    schema = json.loads(Path("frontend/src/investigation/schema.json").read_text())
    assert schema == api.Investigation.model_json_schema()


def test_tampered_observation_and_revision_are_rejected(configured):
    sources, spatial = configured
    values = {s.snapshot_id: s for s in sources}

    class Reader:
        def get(self, kind, key):
            return spatial if kind == "spatial" else values[key]

    raw = spatial.observations[0].model_dump(mode="json")
    raw["response"]["features"][0]["attributes"]["Parcel"] = "private injected text"
    modified = spatial.observations[0].model_validate(raw)
    spatial = spatial.model_copy(update={"observations": (modified, *spatial.observations[1:])})
    with pytest.raises(ValueError, match="integrity"):
        api.read_investigation(Reader(), spatial.identity.revision_id)
    revision = "spatial:sha256:" + api.digest(spatial.model_dump(mode="json", exclude={"identity"}))
    spatial = spatial.model_copy(
        update={"identity": spatial.identity.model_copy(update={"revision_id": revision})}
    )
    with pytest.raises(ValueError, match="licensed capture"):
        api.read_investigation(Reader(), revision)
