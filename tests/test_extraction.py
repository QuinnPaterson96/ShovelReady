"""Synthetic state/adapter checks only; no measured legal extraction accuracy."""

import hashlib
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.ingestion.__main__ import main, save_replay
from app.ingestion.benchmark import ContextWindow, assess, context_issues, read_corpus
from app.ingestion.models import ReplayReport, RunInput
from app.ingestion.replay import parse_response, replay

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests/fixtures/extraction"
CORPUS = ROOT / "docs/pilot-inputs/corpus.json"
PROMPT = ROOT / "app/prompts/document_parsing"


def metadata(**changes):
    raw = json.loads((FIXTURES / "metadata.json").read_text(encoding="utf-8"))
    raw.update(changes)
    return RunInput.model_validate(raw)


@pytest.mark.parametrize(
    "name,state",
    [
        ("valid", "normalized"),
        ("malformed", "malformed"),
        ("multiple_objects", "unresolved_reference"),
        ("ambiguous_percentage", "ambiguous"),
        ("wrong_basis", "invalid"),
        ("unsupported_conditions", "unsupported"),
        ("missing_citation", "missing_evidence"),
        ("not_found", "not_found_reported"),
        ("uncertain", "ambiguous"),
        ("not_applicable", "not_applicable_reported"),
        ("omitted", "omitted"),
    ],
)
def test_saved_states(name, state):
    run = metadata(fields={}) if name == "missing_citation" else metadata()
    count, issues, outcomes = replay((FIXTURES / f"{name}.response").read_bytes(), run)
    assert outcomes[0].state == state
    if name == "multiple_objects":
        assert count == 3 and issues == ("auxiliary_objects_retained_unresolved",)
        assert outcomes[0].content.semantics.kind == "unresolved"
    if name == "valid":
        content = outcomes[0].content
        assert str(content.semantics.threshold.value) == "3.0480"
        assert content.runtime_support == "unresolved"
        assert content.evidence == run.fields["setback_distances"].evidence
        assert outcomes[0].rule_identity == run.fields["setback_distances"].rule_identity


@pytest.mark.parametrize(
    "raw",
    [
        b'{"x":1,"x":2}',
        b'{"x":NaN}',
        b"[]",
        b"{} junk",
        b"{} {} {} {}",
        b"```json\n{}\n```",
        b"\xff",
        b"",
        b'{"x":Infinity}',
    ],
)
def test_strict_parsing(raw):
    assert replay(raw, metadata())[2][0].state == "malformed"


def test_ratio_conversion_and_wrong_basis():
    raw = json.loads((FIXTURES / "metadata.json").read_text(encoding="utf-8"))
    context = raw["fields"]["setback_distances"]
    context.update(
        dimension="ratio",
        basis={"numerator": "footprint", "denominator": "lotArea"},
        ratio_encoding="percent_points",
    )
    response = {
        "setback_distances": {
            "units": "%",
            "value": 45,
            "isRatioOf": "lotArea",
            "is_minimum": False,
            "is_maximum": True,
        }
    }
    run = RunInput.model_validate(raw)
    outcome = replay(json.dumps(response).encode(), run)[2][0]
    assert str(outcome.content.semantics.threshold.value) == "0.45"
    assert outcome.content.semantics.threshold.basis.denominator == "lotArea"
    response["setback_distances"]["isRatioOf"] = "floorArea"
    assert replay(json.dumps(response).encode(), run)[2][0].state == "invalid"
    response["setback_distances"]["isRatioOf"] = "lotArea"
    response["setback_distances"]["units"] = "fraction"
    assert replay(json.dumps(response).encode(), run)[2][0].state == "invalid"


@pytest.mark.parametrize(
    "change,expected",
    [
        ({"value": True}, "invalid"),
        ({"value": -1}, "invalid"),
        ({"value": "__import__('os').system('never')"}, "invalid"),
        ({"is_minimum": True}, "ambiguous"),
        ({"units": "m2"}, "invalid"),
        ({"is_maximum": "true"}, "ambiguous"),
        ({"unexpected": 1}, "unsupported"),
    ],
)
def test_adversarial_scalars(change, expected):
    response = parse_response((FIXTURES / "valid.response").read_bytes())[0]
    response["setback_distances"].update(change)
    assert replay(json.dumps(response).encode(), metadata())[2][0].state == expected


def test_raw_bundle_and_failed_run(tmp_path):
    output = tmp_path / "export"
    report = save_replay(
        FIXTURES / "malformed.response", FIXTURES / "metadata.json", PROMPT, output
    )
    assert report.benchmark_status == "not_measured"
    for artifact in (report.raw_response, report.original_prompt, report.metadata_artifact):
        assert hashlib.sha256((output / artifact.uri).read_bytes()).hexdigest() == artifact.sha256
    assert (output / "response.bin").read_bytes() == (FIXTURES / "malformed.response").read_bytes()
    assert ReplayReport.model_validate_json((output / "report.json").read_bytes()) == report
    with pytest.raises(FileExistsError):
        save_replay(FIXTURES / "valid.response", FIXTURES / "metadata.json", PROMPT, output)
    run = metadata(
        origin="saved_provider_response",
        model="supplied-model-id",
        settings={"temperature": 0},
        provider_metadata={"request_id": "saved-id"},
        run_failures=["saved request truncated"],
    )
    assert replay(b"{}", run)[2][0].state == "run_failed"
    assert run.settings == {"temperature": 0}
    assert metadata(origin="saved_provider_response").model is None


def test_metadata_cannot_fabricate_provider_or_evidence():
    with pytest.raises(ValidationError):
        metadata(model="invented-model")
    with pytest.raises(ValidationError):
        metadata(source_snapshot_ids=["other-source"])
    raw = metadata().model_dump(mode="json")
    raw["fields"]["setback_distances"]["evidence"][0]["context"] = ""
    with pytest.raises(ValidationError):
        RunInput.model_validate(raw)


def test_actual_corpus_is_blocked_not_zero_accuracy(capsys, tmp_path):
    report = assess(read_corpus(CORPUS))
    assert (report["total"], report["eligible"], report["status"]) == (25, 0, "blocked")
    assert all(e["reasons"] for e in report["entries"])
    assert report["accuracy"] is None and report["cost"] is None
    assert report["review_seconds"] is None and report["correction_seconds"] is None
    assert main(["eligibility", "--corpus", str(CORPUS)]) == 2
    assert json.loads(capsys.readouterr().out)["measurement_status"] == "not_measured"
    raw = json.loads(CORPUS.read_text(encoding="utf-8"))
    raw["clauses"][0]["benchmark_eligible"] = True
    # Current version cannot be promoted just by flipping a flag.
    invented = tmp_path / "invented.json"
    invented.write_text(json.dumps(raw), encoding="utf-8")
    with pytest.raises(ValidationError):
        read_corpus(invented)


def test_context_holdout_dependencies_and_unreviewed_bytes(tmp_path):
    corpus = read_corpus(CORPUS)
    raw = b"synthetic context, not a bylaw"
    window = ContextWindow(
        schema_version="sr-07.context.v1",
        kind="clause_window",
        split="development",
        clause_ids=("VIC-13",),
        source_snapshot_id=corpus.clauses[0].snapshot_id,
        artifact={"uri": "synthetic.txt", "sha256": hashlib.sha256(raw).hexdigest()},
        review={"status": "unreviewed", "scope": "synthetic", "rationale": "no review"},
    )
    issues = context_issues(corpus, window, raw)
    assert "held_out_or_cross_split_content" in issues
    assert "authorized_excerpt_missing" in issues
    assert "context_requires_attributed_boundary_and_leakage_review" in issues
    assert "context_hash_mismatch" in context_issues(corpus, window, b"changed")
    development = window.model_copy(update={"clause_ids": ("VIC-08",)})
    assert "missing_dependency_context" in context_issues(corpus, development, raw)
    with pytest.raises(ValidationError):
        ContextWindow.model_validate({**window.model_dump(), "kind": "entire_pdf"})
    window_path = tmp_path / "window.json"
    text_path = tmp_path / "context.txt"
    window_path.write_text(window.model_dump_json(), encoding="utf-8")
    text_path.write_bytes(raw)
    assert (
        main(
            [
                "check-context",
                "--corpus",
                str(CORPUS),
                "--window",
                str(window_path),
                "--text",
                str(text_path),
            ]
        )
        == 2
    )


def test_cli_replay_exit_and_retention(tmp_path, capsys):
    args = [
        "replay",
        "--response",
        str(FIXTURES / "malformed.response"),
        "--metadata",
        str(FIXTURES / "metadata.json"),
        "--prompt",
        str(PROMPT),
        "--output",
        str(tmp_path / "result"),
    ]
    assert main(args) == 2
    assert (tmp_path / "result/response.bin").is_file()
    assert main(args) == 1
