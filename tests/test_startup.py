import socket

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_without_database_or_frontend(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "invalid-legacy-default-must-be-ignored")
    with TestClient(create_app(frontend_dist=tmp_path)) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        assert client.get("/").status_code == 503
        assert client.post("/zones/upload", json={}).status_code == 404


@pytest.mark.parametrize("environment", ["development", "demo"])
def test_built_frontend_and_assets(tmp_path, monkeypatch, environment):
    monkeypatch.setenv("SHOVELREADY_ENV", environment)
    (tmp_path / "index.html").write_text("<h1>ShovelReady</h1>", encoding="utf-8")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("// fixture", encoding="utf-8")
    with TestClient(create_app(frontend_dist=tmp_path)) as client:
        assert client.get("/").text == "<h1>ShovelReady</h1>"
        assert client.get("/assets/app.js").status_code == 200
        assert client.get("/assets/missing.js").status_code == 404
        assert client.get("/api/missing").status_code == 404
        assert client.get("/health").json() == {"status": "ok"}


def test_hosted_demo_refuses_incomplete_or_persistent_configuration(tmp_path, monkeypatch):
    monkeypatch.setenv("SHOVELREADY_ENV", "demo")
    with pytest.raises(RuntimeError, match="built frontend"):
        create_app(frontend_dist=tmp_path)
    (tmp_path / "index.html").write_text("<h1>ShovelReady</h1>", encoding="utf-8")
    monkeypatch.setenv("SHOVELREADY_DATABASE_URL", "must-not-connect")
    with pytest.raises(RuntimeError, match="stateless"):
        create_app(frontend_dist=tmp_path)


def test_railway_identity_in_stateless_demo(tmp_path, monkeypatch):
    monkeypatch.setenv("SHOVELREADY_ENV", "demo")
    monkeypatch.delenv("SHOVELREADY_APPLICATION_COMMIT", raising=False)
    monkeypatch.delenv("SHOVELREADY_FRONTEND_COMMIT", raising=False)
    revision = "a" * 40
    monkeypatch.setenv("RAILWAY_GIT_COMMIT_SHA", revision)
    (tmp_path / "index.html").write_text("<h1>ShovelReady</h1>", encoding="utf-8")
    with TestClient(create_app(frontend_dist=tmp_path)) as client:
        identity = client.get("/api/identity").json()
        assert identity["application_commit"] == identity["frontend_commit"] == revision
        assert identity["screening_status"] == "not_performed"


def test_unknown_environment_refused(monkeypatch):
    monkeypatch.setenv("SHOVELREADY_ENV", "production")
    with pytest.raises(RuntimeError, match="deployment is not configured"):
        create_app()


def test_network_guard():
    with pytest.raises(AssertionError, match="External network access is disabled"):
        socket.create_connection(("example.invalid", 443))
