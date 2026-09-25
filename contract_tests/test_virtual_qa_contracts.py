"""Offline wire and cross-record checks; no app, database, browser or model calls."""

import json
from copy import deepcopy
from pathlib import Path

import pytest
from pydantic import ValidationError

from scripts.virtual_qa.contracts import (
    CaseDefinition,
    CasePin,
    Finding,
    Metadata,
    RunRecord,
    case_digest,
    validate_links,
)

SAMPLE = Path(__file__).resolve().parents[1] / (
    "docs/usability/virtual-qa/sr26-report-example.json"
)


@pytest.fixture
def records():
    return json.loads(SAMPLE.read_text(encoding="utf-8"))


def parse(records):
    return tuple(
        tuple(model.model_validate_json(json.dumps(item)) for item in records[key])
        for key, model in (("cases", CaseDefinition), ("runs", RunRecord), ("findings", Finding))
    )


def test_sample_roundtrip_and_honest_attribution(records):
    cases, runs, findings = parse(records)
    validate_links(cases, runs, findings)
    assert runs[0].provenance == "report_derived_example"
    assert runs[0].model.value is None
    assert runs[0].model.unknown_reason
    assert runs[0].rubric_frozen_at.value is None
    assert findings[0].category == "agent_omission"
    assert findings[0].adjudication.status == "unresolved"
    assert not cases[0].facilitator.expectations[0].scored
    for record in (*cases, *runs, *findings):
        assert type(record).model_validate_json(record.model_dump_json()) == record
        assert "schema_version" in type(record).model_json_schema()["properties"]


@pytest.mark.parametrize("key", ["cases", "runs", "findings"])
@pytest.mark.parametrize("change", [{"schema_version": "virtual-qa/v2"}, {"surprise": True}])
def test_reject_unknown_versions_and_fields(records, key, change):
    records[key][0].update(change)
    with pytest.raises(ValidationError):
        parse(records)


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"value": None, "unknown_reason": None},
        {"value": None, "unknown_reason": " "},
        {"value": "known", "unknown_reason": "unknown"},
    ],
)
def test_unknowns_are_never_implicit(payload):
    with pytest.raises(ValidationError):
        Metadata[str].model_validate(payload)


def test_scored_checks_need_visible_basis_and_legal_review(records):
    item = records["cases"][0]["facilitator"]["expectations"][0]
    item["scored"] = True
    with pytest.raises(ValidationError, match="basis"):
        parse(records)
    item["basis"] = {
        "kind": "task_instruction",
        "description": "Explicit request in brief",
        "evidence": [records["runs"][0]["participant_prompt"]],
    }
    item["kind"] = "legal_expectation"
    with pytest.raises(ValidationError, match="independent review"):
        parse(records)
    item["review"].update(status="independently_reviewed")
    with pytest.raises(ValidationError, match="reviewer and date"):
        parse(records)
    item["review"].update(
        reviewer={"value": "test reviewer", "unknown_reason": None},
        reviewed_at={"value": "2026-09-24T12:00:00Z", "unknown_reason": None},
    )
    parse(records)  # Structural acceptance only; this test invents no accepted source truth.
    item["review"]["status"] = "disputed"
    with pytest.raises(ValidationError, match="cannot be scored"):
        parse(records)


@pytest.mark.parametrize("field", ["participant_brief", "revision"])
def test_case_drift_rejected(records, field):
    records["cases"][0][field] += " changed"
    with pytest.raises(ValueError, match="frozen run pin"):
        validate_links(*parse(records))


def test_fixture_and_rubric_drift_rejected(records):
    for target in ("fixture", "rubric"):
        changed = deepcopy(records)
        if target == "fixture":
            changed["cases"][0]["fixtures"][0]["revision"]["value"] = "different"
        else:
            changed["cases"][0]["facilitator"]["expectations"][0]["claim"] = "Changed answer"
        with pytest.raises(ValueError, match="frozen run pin"):
            validate_links(*parse(changed))


@pytest.mark.parametrize("field", ["run_id", "case_id", "check_id"])
def test_orphan_findings_rejected(records, field):
    records["findings"][0][field] = "missing"
    with pytest.raises(ValueError):
        validate_links(*parse(records))


def test_retries_preserve_attempt_history(records):
    child = deepcopy(records["runs"][0])
    child.update(run_id="retry-2", attempt=2, retry_of=child["run_id"])
    records["runs"].append(child)
    validate_links(*parse(records))
    child["data"]["revision"]["value"] = "different"
    with pytest.raises(ValueError, match="new experiment"):
        validate_links(*parse(records))
    child["retry_of"] = "missing-parent"
    with pytest.raises(ValueError, match="retry ancestor"):
        validate_links(*parse(records))


@pytest.mark.parametrize(
    "changes",
    [
        {"attempt": 2},
        {"attempt": True},
        {"selection": "seeded"},
        {"application_commit": {"value": "main", "unknown_reason": None}},
        {"provenance": "report_derived_example", "source_report": None},
        {
            "started_at": {"value": "2026-09-24T12:00:00Z", "unknown_reason": None},
            "rubric_frozen_at": {"value": "2026-09-24T12:00:01Z", "unknown_reason": None},
        },
        {
            "started_at": {"value": "2026-09-24T12:00:00Z", "unknown_reason": None},
            "ended_at": {"value": "2026-09-24T11:00:00Z", "unknown_reason": None},
        },
    ],
)
def test_malformed_run_states(records, changes):
    records["runs"][0].update(changes)
    with pytest.raises(ValidationError):
        parse(records)


def test_new_runs_require_real_freeze_and_timing(records):
    run = records["runs"][0]
    run["provenance"] = "participant_run"
    with pytest.raises(ValidationError, match="freeze/dispatch"):
        parse(records)
    for field in ("rubric_frozen_at", "started_at", "ended_at"):
        run[field] = {"value": "2026-09-24T12:00:00Z", "unknown_reason": None}
    parse(records)
    run["status"] = "blocked"
    run["started_at"] = {"value": None, "unknown_reason": "Blocked before dispatch"}
    run["ended_at"] = {"value": None, "unknown_reason": "Never dispatched"}
    parse(records)


def test_confirmed_bug_needs_reproduction_and_adjudicator(records):
    finding = records["findings"][0]
    finding["category"] = "app_defect"
    finding["adjudication"]["status"] = "confirmed"
    with pytest.raises(ValidationError, match="reviewer and date"):
        parse(records)
    finding["adjudication"].update(
        reviewer={"value": "test reviewer", "unknown_reason": None},
        reviewed_at={"value": "2026-09-24T12:00:00Z", "unknown_reason": None},
    )
    with pytest.raises(ValidationError, match="require reproduction"):
        parse(records)
    finding["reproduction"] = "reproduced"
    with pytest.raises(ValidationError, match="reproduction evidence"):
        parse(records)
    finding["reproduction_evidence"] = finding["supporting_evidence"]
    parse(records)  # Doesn't verify that the supplied evidence actually supports this claim.


def test_text_is_data_and_models_are_frozen(records):
    records["cases"][0]["participant_brief"] = "__import__('os').system('never execute')"
    case = parse(records)[0][0]
    assert case.participant_brief == records["cases"][0]["participant_brief"]
    with pytest.raises(ValidationError):
        case.revision = "replacement"
    assert CasePin.from_case(case).case_sha256 == case_digest(case)
    roundtrip = CaseDefinition.model_validate_json(case.model_dump_json())
    assert case_digest(case) == case_digest(roundtrip)


def test_duplicate_and_mode_mismatches(records):
    cases, runs, findings = parse(records)
    with pytest.raises(ValueError, match="duplicate"):
        validate_links(cases, runs + runs, findings)
    records["runs"][0]["mode"] = "defect_detection"
    with pytest.raises(ValueError, match="unsupported"):
        validate_links(*parse(records))
