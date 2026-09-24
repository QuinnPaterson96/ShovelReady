import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("demo", SCRIPTS / "demo.py")
demo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(demo)


def test_powershell_config_uses_callers_location(tmp_path):
    shell = shutil.which("pwsh") or shutil.which("powershell")
    if not shell:
        pytest.skip("PowerShell executable needed for launcher path regression")
    caller = tmp_path / "caller directory"
    caller.mkdir()
    # PowerShell's current location can differ from the underlying process cwd.
    # Stub only Python dispatch so this exercises the actual wrapper without a DB/build.
    command = r'''
        $ErrorActionPreference = 'Stop'
        function python {
            [Console]::WriteLine((ConvertTo-Json -InputObject @($args) -Compress))
            $global:LASTEXITCODE = 0
        }
        Set-Location -LiteralPath $env:SR_TEST_CALLER
        & $env:SR_TEST_WRAPPER -Config 'relative config.json' -Revision 'test-revision'
        if ((Get-Location).Path -ne $env:SR_TEST_CALLER) { throw 'Caller location changed' }
    '''
    completed = subprocess.run(
        [shell, "-NoProfile", "-NonInteractive", "-Command", command],
        cwd=tmp_path,
        env=dict(os.environ, SR_TEST_CALLER=str(caller),
                 SR_TEST_WRAPPER=str(SCRIPTS / "demo.ps1")),
        text=True, capture_output=True, check=True,
    )
    arguments = json.loads(completed.stdout.strip())
    assert Path(arguments[arguments.index("--config") + 1]) == caller / "relative config.json"


def test_identity_is_frozen_at_creation_and_nonsecret(monkeypatch, tmp_path):
    monkeypatch.setenv("SHOVELREADY_APPLICATION_COMMIT", "a" * 40)
    monkeypatch.setenv("SHOVELREADY_FRONTEND_COMMIT", "b" * 40)
    monkeypatch.setenv("SHOVELREADY_SPATIAL_REVISION", "spatial:sha256:" + "c" * 64)
    app = create_app(frontend_dist=tmp_path)
    monkeypatch.setenv("SHOVELREADY_APPLICATION_COMMIT", "d" * 40)
    monkeypatch.setenv("SHOVELREADY_SPATIAL_REVISION", "spatial:sha256:" + "e" * 64)
    monkeypatch.setenv("SHOVELREADY_DATABASE_URL", "secret://password/private/path")
    with TestClient(app) as client:
        assert client.get("/api/identity").json() == {
            "schema_version": "sr-21.identity.v1",
            "application_commit": "a" * 40,
            "frontend_commit": "b" * 40,
            "spatial_revision": "spatial:sha256:" + "c" * 64,
            "screening_status": "not_performed",
        }
        assert client.get("/health").json() == {"status": "ok"}


def test_unavailable_or_invalid_identity_never_echoed(monkeypatch, tmp_path):
    for name in ("APPLICATION_COMMIT", "FRONTEND_COMMIT", "SPATIAL_REVISION"):
        monkeypatch.setenv("SHOVELREADY_" + name, "secret://private/path")
    with TestClient(create_app(frontend_dist=tmp_path)) as client:
        data = client.get("/api/identity").json()
        assert data["application_commit"] is None
        assert data["frontend_commit"] is None
        assert data["spatial_revision"] is None
        assert "secret" not in str(data)


def test_dirty_checkout_refused(monkeypatch):
    monkeypatch.setattr(demo.subprocess, "check_output", lambda *a, **k: " M app/main.py")
    with pytest.raises(demo.DemoError, match="clean Git checkout"):
        demo.clean_commit()


def test_missing_config_and_invalid_revision(tmp_path):
    with pytest.raises(demo.DemoError, match="exact spatial"):
        demo.database_url(tmp_path / "local.json", "latest")
    with pytest.raises(demo.DemoError, match="configuration is missing"):
        demo.database_url(tmp_path / "local.json", "spatial:sha256:" + "a" * 64)


def test_bad_config_redacted(tmp_path):
    config = tmp_path / "local.json"
    config.write_text('{"secret": "private-password"}')
    with pytest.raises(demo.DemoError, match="configuration invalid") as error:
        demo.database_url(config, "spatial:sha256:" + "a" * 64)
    assert "private-password" not in str(error.value)


def test_build_failure_does_not_start_http(monkeypatch, tmp_path):
    monkeypatch.setattr(demo, "clean_commit", lambda: "a" * 40)
    monkeypatch.setattr(demo, "database_url", lambda *a: "secret")
    monkeypatch.setattr(demo.shutil, "which", lambda name: name)
    monkeypatch.setattr(demo.subprocess, "check_output", lambda *a, **k: "v22.14.0")
    monkeypatch.setattr(
        demo.subprocess, "run", lambda *a, **k: type("Result", (), {"returncode": 1})()
    )
    with pytest.raises(demo.DemoError, match="build failed"):
        demo.serve(tmp_path / "local.json", "spatial:sha256:" + "a" * 64, 0)


def test_checkout_changed_during_build_refused(monkeypatch, tmp_path):
    commits = iter(["a" * 40, "b" * 40])
    monkeypatch.setattr(demo, "clean_commit", lambda: next(commits))
    monkeypatch.setattr(demo, "database_url", lambda *a: "secret")
    monkeypatch.setattr(demo.shutil, "which", lambda name: name)
    monkeypatch.setattr(demo.subprocess, "check_output", lambda *a, **k: "v22.14.0")
    monkeypatch.setattr(
        demo.subprocess, "run", lambda *a, **k: type("Result", (), {"returncode": 0})()
    )
    with pytest.raises(demo.DemoError, match="Checkout changed during build"):
        demo.serve(tmp_path / "local.json", "spatial:sha256:" + "a" * 64, 0)


def test_unsupported_environment_refused_before_database(monkeypatch, tmp_path):
    monkeypatch.setenv("SHOVELREADY_ENV", "production")
    with pytest.raises(demo.DemoError, match="development/test"):
        demo.serve(tmp_path / "local.json", "spatial:sha256:" + "a" * 64, 0)
