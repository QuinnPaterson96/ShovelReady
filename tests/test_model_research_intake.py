"""Offline staging tests; inputs are existing attribution or labelled synthetic faults."""

import hashlib
import json
import subprocess
import sys
from copy import deepcopy

import pytest

from app.model_catalogue.catalogue import SNAPSHOT, load_catalogue
from app.model_catalogue.research_intake import ROOT, stage

FRONTEND = ROOT / "frontend/src/model_catalogue/catalogue.json"


def candidate_data():
    """Existing Click Landing attribution, with a distinct staging identity."""
    data = load_catalogue().model_dump(mode="json")
    data["snapshot_id"] = "sr-53.test-existing-landing.v1"
    data["models"] = [data["models"][0]]
    return data


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(tmp_path, data):
    source = tmp_path / "input.json"
    source.write_text(json.dumps(data), encoding="utf-8")
    report = stage(source, tmp_path / "staged")
    return report, tmp_path / "staged"


def test_existing_attributed_model_roundtrip_and_active_snapshot_unchanged(tmp_path):
    before = (digest(SNAPSHOT), digest(FRONTEND))
    data = candidate_data()
    report, output = run(tmp_path, data)
    assert report["status"] == "valid_unreviewed"
    assert report["gaps"]
    assert any(gap["field"] == "roof_height" for gap in report["gaps"])
    assert any(gap["field"] == "source review" for gap in report["gaps"])
    staged = json.loads((output / "candidate.json").read_text(encoding="utf-8"))
    assert staged == data
    assert (digest(SNAPSHOT), digest(FRONTEND)) == before


@pytest.mark.parametrize(
    "fault",
    [
        pytest.param(
            lambda d: d["models"][0]["measurements"][0].update(source_id="detached"),
            id="detached-provenance",
        ),
        pytest.param(
            lambda d: d["models"][0]["measurements"][0]["quantity"].update(value="999"),
            id="conversion-conflict",
        ),
        pytest.param(
            lambda d: d["models"][0]["measurements"].append(
                deepcopy(d["models"][0]["measurements"][0])
            ),
            id="duplicate-measurement",
        ),
        pytest.param(lambda d: d["models"].append(deepcopy(d["models"][0])), id="duplicate-model"),
        pytest.param(lambda d: d["models"][0]["sources"].clear(), id="missing-sources"),
        pytest.param(
            lambda d: d["models"][0]["sources"].append(deepcopy(d["models"][0]["sources"][0])),
            id="duplicate-source",
        ),
        pytest.param(
            lambda d: d["models"][0]["sources"][0].update(sha256="not-a-digest"),
            id="invalid-digest",
        ),
        pytest.param(
            lambda d: d["models"][0]["sources"][0].update(captured_at="2026-02-30"),
            id="invalid-capture-date",
        ),
        pytest.param(
            lambda d: d["models"][0]["measurements"][5].update(status="known"),
            id="unsupported-height",
        ),
    ],
)
def test_synthetic_invalid_inputs_rejected_without_candidate_or_active_change(tmp_path, fault):
    before = (digest(SNAPSHOT), digest(FRONTEND))
    data = candidate_data()
    fault(data)
    report, output = run(tmp_path, data)
    assert report["status"] == "rejected"
    assert report["errors"]
    assert not (output / "candidate.json").exists()
    assert json.loads((output / "report.json").read_text(encoding="utf-8")) == report
    assert (digest(SNAPSHOT), digest(FRONTEND)) == before


def test_synthetic_duplicate_json_key_rejected(tmp_path):
    before = (digest(SNAPSHOT), digest(FRONTEND))
    source = tmp_path / "input.json"
    source.write_text('{"schema_version": "a", "schema_version": "b"}', encoding="utf-8")
    report = stage(source, tmp_path / "staged")
    assert report["status"] == "rejected"
    assert "duplicate JSON key" in report["errors"][0]
    assert not (tmp_path / "staged/candidate.json").exists()
    assert (digest(SNAPSHOT), digest(FRONTEND)) == before


def test_cannot_reuse_active_snapshot_identity_or_output_directory(tmp_path):
    data = candidate_data()
    data["snapshot_id"] = load_catalogue().snapshot_id
    report, output = run(tmp_path, data)
    assert report["status"] == "rejected"
    assert not (output / "candidate.json").exists()
    with pytest.raises(FileExistsError):
        stage(tmp_path / "input.json", output)


def test_cli_writes_separate_candidate_and_report(tmp_path):
    source = tmp_path / "input.json"
    source.write_text(json.dumps(candidate_data()), encoding="utf-8")
    output = tmp_path / "staged"
    command = [
        sys.executable,
        "-m",
        "app.model_catalogue.research_intake",
        "--input",
        str(source),
        "--output-dir",
        str(output),
    ]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr
    assert (output / "candidate.json").exists()
    assert (output / "report.json").exists()
    repeated = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
    assert repeated.returncode == 2
