"""Fixed endpoint, packaged runtime and generated consumer boundary checks; no database."""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.case_preparations import api, core
from app.main import create_app

ROOT = Path(__file__).resolve().parents[1]


def test_cli_api_and_consumer_fixture_parity():
    cli = subprocess.run(
        [sys.executable, "scripts/diagnose_pilot_case.py", "--format", "json"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    with TestClient(create_app()) as client:
        response = client.get("/api/case-preparations/pilot")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == json.loads(cli.stdout)
    assert response.json() == json.loads(
        (ROOT / "frontend/src/case_preparations/pilot.test.json").read_text()
    )
    assert api.PilotPreparation.model_json_schema(mode="serialization") == json.loads(
        (ROOT / "frontend/src/case_preparations/schema.json").read_text()
    )


def test_packaged_inputs_match_research_without_duplicated_maintenance():
    for packaged, source in [
        (core.ANNOTATIONS, "docs/case-diagnostics/pilot/annotations.json"),
        (core.MANIFEST, "docs/research/case-readiness/plan-measurements/sources.json"),
    ]:
        assert core.digest(packaged.read_bytes()) == core.digest((ROOT / source).read_bytes())


@pytest.mark.parametrize(
    "error",
    [
        OSError("C:/private/source"),
        ValueError("private bad data"),
        RuntimeError("boundary unexpectedly accepted"),
    ],
)
def test_failures_do_not_leak_or_return_stale_results(monkeypatch, error):
    with TestClient(create_app()) as client:
        assert client.get("/api/case-preparations/pilot").status_code == 200

        def fail(*args):
            raise error

        monkeypatch.setattr(core, "diagnose", fail)
        response = client.get("/api/case-preparations/pilot")
        assert response.status_code == 503
        assert response.json() == {
            "detail": "Pilot preparation is unavailable; no evaluation was run."
        }
        assert "retained_observations" not in response.text


def test_fixed_read_only_route():
    with TestClient(create_app()) as client:
        assert client.post("/api/case-preparations/pilot", json={}).status_code == 405
        assert client.get("/api/case-preparations/unknown").status_code == 404
        assert client.get("/api/case-preparations/pilot?annotations=C:/private").status_code == 400


def test_app_only_container_copy_has_working_endpoint(tmp_path):
    # Dockerfile copies app recursively; test that exact runtime module/data boundary
    # in a fresh process without repository docs, scripts or PYTHONPATH.
    assert "COPY app ./app" in (ROOT / "Dockerfile").read_text()
    shutil.copytree(ROOT / "app", tmp_path / "app", ignore=shutil.ignore_patterns("__pycache__"))
    env = os.environ.copy()
    env.pop("PYTHONPATH", None)
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "from fastapi.testclient import TestClient; from app.main import app; "
            "r=TestClient(app).get('/api/case-preparations/pilot'); "
            "assert r.status_code == 200, r.text; "
            "assert r.json()['status'] == 'evaluation_not_run'",
        ],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
