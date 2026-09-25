"""Offline grading guardrails; all calibration answers are authored, agent-reviewed."""

import json
from copy import deepcopy
from pathlib import Path

import pytest

from scripts.virtual_qa.contracts import CaseDefinition, CasePin, Finding, RunRecord
from scripts.virtual_qa.grading import Assessment, FrozenScoring, grade, main

ROOT = Path(__file__).resolve().parents[1]
SR26 = ROOT / "docs/usability/virtual-qa/sr26-report-example.json"
ANSWERS = Path(__file__).parent / "fixtures/grading/answers.json"
TIME = "2026-09-25T00:46:32Z"


def known(value):
    return {"value": value, "unknown_reason": None}


def unknown(reason="Not recorded in authored calibration"):
    return {"value": None, "unknown_reason": reason}


def ref(locator):
    return {
        "uri": "contract_tests/fixtures/grading/answers.json",
        "revision": known("1"),
        "locator": locator,
    }


def parse(bundle):
    return [
        [model.model_validate(item) for item in bundle[key]]
        for key, model in (
            ("cases", CaseDefinition),
            ("runs", RunRecord),
            ("findings", Finding),
            ("scoring", FrozenScoring),
            ("assessments", Assessment),
        )
    ]


def replay(bundle):
    return grade(*parse(bundle))


def repin(bundle):
    case = CaseDefinition.model_validate(bundle["cases"][0])
    pin = CasePin.from_case(case).model_dump(mode="json")
    for run in bundle["runs"]:
        run["cases"] = [pin]
    for assessment in bundle["assessments"]:
        assessment["pin"] = pin
    bundle["scoring"][0]["pin"] = pin
    bundle["scoring"][0]["rubric"] = case.facilitator.model_dump(mode="json")


@pytest.fixture
def bundle():
    """Use shared SR-27 shape but explicitly replace all historical content/identity."""
    historical = json.loads(SR26.read_text(encoding="utf-8"))
    rubric = {
        "revision": "authored-1",
        "expectations": [
            {
                "check_id": "scope",
                "claim": "Preserve the visible scope limitation",
                "kind": "authored_software_expectation",
                "scored": True,
                "basis": {
                    "kind": "browser_observation",
                    "description": "Authored visible text",
                    "evidence": [ref("supported.visible")],
                },
                "evidence": [ref("supported.visible")],
                "review": {
                    "status": "reviewed",
                    "reviewer": known("Codex SR-30 author (agent)"),
                    "reviewed_at": known(TIME),
                    "rationale": "Authored software only",
                    "disagreements": [],
                },
            }
        ],
        "disagreements": [],
        "seeded_fault": None,
    }
    case = {
        "schema_version": "virtual-qa/v1",
        "record_type": "case",
        "case_id": "authored-calibration",
        "revision": "1",
        "category": "scope",
        "evidence_status": "synthetic",
        "fixtures": [ref("supported.visible")],
        "sources": [],
        "unknowns": ["No human review or real participant"],
        "supported_modes": ["task_completion", "defect_detection"],
        "group": "authored-calibration",
        "split": "development",
        "participant_brief": "Authored calibration; never dispatched",
        "facilitator": rubric,
    }
    run = historical["runs"][0]
    run.update(
        run_id="authored-run",
        source_report=ref("provenance"),
        data={
            "kind": "synthetic_fixture",
            "identity": known("authored-calibration"),
            "revision": known("1"),
        },
        participant_prompt=ref("provenance"),
        final_note=known(ref("supported.answer")),
        evidence=[ref("supported.visible")],
        application_commit=unknown(),
        frontend_commit=unknown(),
        isolation="No participant; authored saved-response calibration",
        model=unknown(),
        model_settings=unknown(),
        tool_settings=unknown(),
    )
    assessment = {
        "schema_version": "virtual-qa-assessment/v1",
        "assessment_id": "review",
        "revision": "1",
        "supersedes": None,
        "run_id": run["run_id"],
        "pin": run["cases"][0],
        "kind": "manual_review",
        "reviewer": json.loads(ANSWERS.read_text())["reviewer"],
        "reviewed_at": TIME,
        "rationale": "Authored calibration",
        "disagreements": [],
        "environment": "ready",
        "environment_evidence": [ref("supported.visible")],
        "evidence_reviews": [
            {"reference": ref(p), "status": "verified", "rationale": "Read saved text"}
            for p in ("supported.visible", "supported.answer")
        ],
        "checks": [
            {
                "check_id": "scope",
                "status": "supported",
                "evidence": [ref("supported.answer")],
                "rationale": "Preserves visible scope",
            }
        ],
        "claims": [],
        "findings": [],
        "control_observable": None,
        "control_evidence": [],
        "review_minutes": unknown(),
    }
    result = {
        "cases": [case],
        "runs": [run],
        "findings": [],
        "assessments": [assessment],
        "scoring": [
            {
                "schema_version": "virtual-qa-scoring/v1",
                "revision": "1",
                "pin": run["cases"][0],
                "rubric": rubric,
                "critical_checks": known(["scope"]),
                "frozen_at": unknown(),
            }
        ],
    }
    repin(result)
    return result


def add_finding(bundle, origin="unsolicited", category="app_defect", status="confirmed"):
    run, a = bundle["runs"][0], bundle["assessments"][0]
    run["application_commit"] = known("a" * 40)
    run["frontend_commit"] = known("b" * 40)
    finding = {
        "schema_version": "virtual-qa/v1",
        "record_type": "finding",
        "finding_id": "f1",
        "revision": "1",
        "supersedes": None,
        "run_id": run["run_id"],
        "case_id": bundle["cases"][0]["case_id"],
        "origin": origin,
        "check_id": "scope" if origin == "rubric_check" else None,
        "category": category,
        "claim": "Authored simulated defect, not a claim about the application",
        "supporting_evidence": [ref("supported.visible")],
        "contradicting_evidence": [],
        "severity": "major",
        "reproduction": "reproduced",
        "reproduction_evidence": [ref("supported.visible")],
        "adjudication": {
            "status": status,
            "reviewer": known(a["reviewer"]["identity"]),
            "reviewed_at": known(TIME),
            "rationale": "Authored guardrail test",
        },
        "linked_issue": None,
    }
    bundle["findings"].append(finding)
    a["findings"].append(
        {
            "finding_id": "f1",
            "revision": "1",
            "app_defect_allegation": True,
            "cause": known("authored-cause"),
            "expected": known("Authored expected behavior"),
            "steps": ["Load the authored fixture"],
            "acceptance": ["Retain scope"],
            "regression_layer": known("UI fixture test"),
            "matched_seed": False,
        }
    )
    return finding


def control(bundle, variant):
    bundle["cases"][0]["facilitator"]["seeded_fault"] = {
        "pair_id": "authored-pair",
        "variant": variant,
        "description": "Authored control",
    }
    bundle["runs"][0]["mode"] = "defect_detection"
    bundle["assessments"][0].update(
        control_observable=True, control_evidence=[ref("supported.visible")]
    )
    repin(bundle)


@pytest.mark.parametrize(
    "example", json.loads(ANSWERS.read_text())["examples"], ids=lambda example: example["id"]
)
def test_saved_calibration(bundle, example):
    a, case, run = bundle["assessments"][0], bundle["cases"][0], bundle["runs"][0]
    visible, answer = ref(example["id"] + ".visible"), ref(example["id"] + ".answer")
    case["fixtures"] = [visible]
    check = case["facilitator"]["expectations"][0]
    check["basis"]["evidence"] = check["evidence"] = [visible]
    run["evidence"], run["final_note"] = [visible], known(answer)
    a["environment_evidence"] = [visible]
    a["evidence_reviews"] = [
        {"reference": r, "status": "verified", "rationale": example["rationale"]}
        for r in (visible, answer)
    ]
    a["checks"][0].update(
        status=example["proposed"], evidence=[answer], rationale=example["rationale"]
    )
    if example["id"] == "environment-failure":
        a["environment"] = "blocked"
        run["status"] = "blocked"
    if example["id"] == "disputed":
        a["evidence_reviews"][0]["status"] = "disputed"
        a["disagreements"] = [example["rationale"]]
    repin(bundle)
    result = replay(bundle)
    row = result["attempts"][0]
    assert row["checks"][0]["status"] == example["expected"]
    assert not result["issue_drafts"]
    assert row["review"]["reviewer"]["role"] == "agent"
    if example["id"] == "critical-omission":
        assert row["critical_omissions"]["numerator"] == 1
    if example["id"] == "correct-unknown":
        assert row["supported_checks"]["value"] == 1


@pytest.mark.parametrize("problem", ["missing", "invalid", "disputed"])
def test_evidence_cannot_produce_success_or_bug(bundle, problem):
    add_finding(bundle)
    bundle["assessments"][0]["evidence_reviews"][0]["status"] = problem
    result = replay(bundle)
    assert result["attempts"][0]["checks"][0]["status"] == "unassessable"
    assert not result["issue_drafts"]


def test_unregistered_evidence_rejected(bundle):
    bundle["assessments"][0]["checks"][0]["evidence"] = [ref("invented-pointer")]
    with pytest.raises(ValueError, match="outside pinned"):
        replay(bundle)


def test_unsolicited_discovery_never_enlarges_checklist(bundle):
    before = replay(bundle)["attempts"][0]["checklist_outcomes"]
    add_finding(bundle)
    result = replay(bundle)
    assert result["attempts"][0]["checklist_outcomes"] == before
    assert len(result["issue_drafts"]) == 1
    assert result["issue_drafts"][0]["occurrences"][0]["finding"]["check_id"] is None
    bundle["findings"][0]["case_id"] = "wrong-case"
    with pytest.raises(ValueError, match="case was not selected"):
        replay(bundle)


@pytest.mark.parametrize("change", ["case", "rubric", "pin", "critical"])
def test_changed_rubrics_and_unknown_checks_rejected(bundle, change):
    if change == "case":
        bundle["cases"][0]["participant_brief"] = "Changed"
    elif change == "rubric":
        bundle["scoring"][0]["rubric"] = deepcopy(bundle["scoring"][0]["rubric"])
        bundle["scoring"][0]["rubric"]["revision"] = "changed"
    elif change == "pin":
        bundle["assessments"][0]["pin"] = {
            **bundle["assessments"][0]["pin"],
            "case_sha256": "0" * 64,
        }
    else:
        bundle["scoring"][0]["critical_checks"] = known(["hidden-check"])
    with pytest.raises(ValueError):
        replay(bundle)


def test_history_retained_and_missing_ancestors_rejected(bundle):
    first = bundle["assessments"][0]
    first["checks"][0]["status"] = "unsupported"
    second = deepcopy(first)
    second.update(revision="2", supersedes="1", rationale="Corrected software judgment")
    second["checks"][0]["status"] = "supported"
    bundle["assessments"].append(second)
    result = replay(bundle)
    assert len(result["assessment_history"]) == 2
    assert result["assessment_history"][0]["checks"][0]["status"] == "unsupported"
    assert result["attempts"][0]["checks"][0]["status"] == "supported"
    bundle["assessments"].pop(0)
    with pytest.raises(ValueError, match="retained root"):
        replay(bundle)


def test_finding_history_and_pending_review_withhold_drafts(bundle):
    first = add_finding(bundle, status="unresolved")
    second = deepcopy(first)
    second.update(revision="2", supersedes="1")
    second["adjudication"]["status"] = "confirmed"
    bundle["findings"].append(second)
    assert not replay(bundle)["issue_drafts"]  # Still reviews revision 1.
    bundle["assessments"][0]["findings"][0]["revision"] = "2"
    assert len(replay(bundle)["issue_drafts"]) == 1
    bundle["findings"].pop(0)
    with pytest.raises(ValueError, match="retained root"):
        replay(bundle)


def test_model_suggestion_is_not_adjudication(bundle):
    add_finding(bundle)
    bundle["assessments"][0]["kind"] = "model_suggestion"
    result = replay(bundle)
    assert result["attempts"][0]["supported_checks"]["value"] is None
    assert not result["issue_drafts"]
    assert len(result["assessment_history"]) == 1


@pytest.mark.parametrize("variant", ["clean", "fault"])
def test_paired_control_denominators_and_environment(bundle, variant):
    control(bundle, variant)
    add_finding(bundle, category="false_alarm" if variant == "clean" else "app_defect")
    bundle["assessments"][0]["findings"][0]["matched_seed"] = variant == "fault"
    metric = "seeded_fault_detection" if variant == "fault" else "clean_control_false_alarms"
    result = replay(bundle)
    assert result["attempts"][0][metric]["numerator"] == 1
    assert result["attempts"][0][metric]["denominator"] == 1
    bundle["assessments"][0]["environment"] = "blocked"
    result = replay(bundle)
    assert result["attempts"][0][metric]["value"] is None
    assert result["attempts"][0]["control_unassessable"]
    assert not result["issue_drafts"]


def test_clean_silence_pending_and_seed_miss(bundle):
    control(bundle, "clean")
    assert replay(bundle)["attempts"][0]["clean_control_false_alarms"]["value"] == 0
    add_finding(bundle, status="unresolved")
    assert replay(bundle)["attempts"][0]["clean_control_false_alarms"]["value"] is None
    bundle["findings"] = []
    bundle["assessments"][0]["findings"] = []
    control(bundle, "fault")
    assert replay(bundle)["attempts"][0]["seeded_fault_detection"]["value"] == 0


def test_missing_denominators_and_timing_are_na(bundle):
    bundle["scoring"][0]["critical_checks"] = unknown()
    result = replay(bundle)
    row = result["attempts"][0]
    for metric in (
        "critical_omissions",
        "unsupported_conclusions",
        "confirmed_finding_precision",
        "seeded_fault_detection",
        "clean_control_false_alarms",
        "unknown_defect_recall",
    ):
        assert row[metric]["value"] is None
        assert row[metric]["na_reason"]
    assert result["summary"][0]["review_effort"]["value"] is None


def test_dedup_preserves_runs_and_existing_issue(bundle):
    finding = add_finding(bundle)
    finding["linked_issue"] = "https://example.invalid/existing-issue"
    run, a = deepcopy(bundle["runs"][0]), deepcopy(bundle["assessments"][0])
    run.update(run_id="authored-retry", attempt=2, retry_of="authored-run")
    a.update(assessment_id="retry-review", run_id="authored-retry")
    other = deepcopy(finding)
    other.update(finding_id="f2", run_id="authored-retry")
    a["findings"][0]["finding_id"] = "f2"
    bundle["runs"].append(run)
    bundle["assessments"].append(a)
    bundle["findings"].append(other)
    result = replay(bundle)
    assert len(result["issue_drafts"]) == 1
    assert len(result["issue_drafts"][0]["occurrences"]) == 2
    assert result["issue_drafts"][0]["action"] == "update_existing"
    assert result["summary"][0]["metrics"]["confirmed_finding_precision"]["denominator"] == 2


def test_sr26_remains_unscored_and_has_no_invented_bug():
    bundle = json.loads(SR26.read_text(encoding="utf-8"))
    case = CaseDefinition.model_validate(bundle["cases"][0])
    bundle.update(
        assessments=[],
        scoring=[
            {
                "schema_version": "virtual-qa-scoring/v1",
                "revision": "sr26-retrospective-1",
                "pin": CasePin.from_case(case).model_dump(mode="json"),
                "rubric": case.facilitator.model_dump(mode="json"),
                "critical_checks": unknown("Retrospective unscored subset"),
                "frozen_at": unknown(),
            }
        ],
    )
    result = replay(bundle)
    row = result["attempts"][0]
    assert row["checks"] == []
    assert row["supported_checks"]["denominator"] == 0
    assert row["findings"][0]["finding"]["category"] == "agent_omission"
    assert not result["issue_drafts"]


def test_prepared_never_graded(bundle):
    bundle["runs"][0]["status"] = "prepared"
    result = replay(bundle)
    assert result["attempts"] == []
    assert result["prepared_runs_not_graded"] == ["authored-run"]


def test_claim_counts_and_severity_do_not_become_checklist_items(bundle):
    a = bundle["assessments"][0]
    a["claims"] = [
        {
            "claim_id": "invented-approval",
            "claim": "Permit guaranteed",
            "status": "unsupported",
            "evidence": [ref("supported.answer")],
            "rationale": "Authored contradiction, not a real participant",
        }
    ]
    result = replay(bundle)
    row = result["attempts"][0]
    assert row["unsupported_conclusions"]["value"] == 1
    assert row["supported_checks"]["denominator"] == 1
    assert (
        result["summary"][0]["checklist_by_severity"]["critical"]["supported"]["denominator"] == 1
    )
    a["evidence_reviews"][1]["status"] = "missing"
    assert replay(bundle)["attempts"][0]["unsupported_conclusions"]["denominator"] == 0


def test_conflicting_same_cause_is_pending_and_withholds_draft(bundle):
    first = add_finding(bundle)
    other = deepcopy(first)
    other["finding_id"] = "f2"
    other["adjudication"]["status"] = "rejected"
    bundle["findings"].append(other)
    decision = deepcopy(bundle["assessments"][0]["findings"][0])
    decision["finding_id"] = "f2"
    bundle["assessments"][0]["findings"].append(decision)
    result = replay(bundle)
    assert result["attempts"][0]["pending_allegations"] == 1
    assert result["attempts"][0]["confirmed_finding_precision"]["denominator"] == 0
    assert not result["issue_drafts"]


def test_prospective_policy_cannot_be_added_after_freeze(bundle):
    run = bundle["runs"][0]
    run.update(
        provenance="participant_run",
        rubric_frozen_at=known("2026-09-25T00:00:00Z"),
        started_at=known("2026-09-25T00:01:00Z"),
        ended_at=known("2026-09-25T00:02:00Z"),
    )
    bundle["scoring"][0]["frozen_at"] = known("2026-09-25T00:00:01Z")
    with pytest.raises(ValueError, match="critical policy must freeze"):
        replay(bundle)
    bundle["scoring"][0]["critical_checks"] = unknown()
    assert replay(bundle)["attempts"][0]["critical_omissions"]["value"] is None


def test_cross_mode_results_are_separate(bundle):
    other = deepcopy(bundle["runs"][0])
    other.update(run_id="detection", mode="defect_detection")
    bundle["runs"].append(other)
    result = replay(bundle)
    assert {s["mode"] for s in result["summary"]} == {"task_completion", "defect_detection"}


def test_cli_local_output_and_refuse_overwrite(bundle, tmp_path):
    add_finding(bundle)
    args = []
    for key, flag in (
        ("cases", "case"),
        ("runs", "run"),
        ("findings", "finding"),
        ("scoring", "scoring"),
        ("assessments", "assessment"),
    ):
        for i, value in enumerate(bundle[key]):
            path = tmp_path / f"{flag}-{i}.json"
            path.write_text(json.dumps(value), encoding="utf-8")
            args.extend(["--" + flag, str(path)])
    output = tmp_path / "graded"
    args.extend(["--output", str(output)])
    assert main(args) == 0
    assert len(list(output.glob("issue-*.md"))) == 1
    original = (output / "grades.json").read_bytes()
    with pytest.raises(FileExistsError):
        main(args)
    assert (output / "grades.json").read_bytes() == original
