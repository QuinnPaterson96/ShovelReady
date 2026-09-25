"""Offline behavioral checks: preserve evidence and refuse inappropriate promotion."""

import json
import subprocess
import sys
from copy import deepcopy

import pytest
from pydantic import ValidationError

from scripts import diagnose_pilot_case as pilot


def inputs():
    return json.loads(pilot.ANNOTATIONS.read_bytes()), json.loads(pilot.MANIFEST.read_bytes())


def run(annotation=None, manifest=None):
    original_annotation, original_manifest = inputs()
    annotation = deepcopy(annotation if annotation is not None else original_annotation)
    manifest = manifest if manifest is not None else original_manifest
    manifest_bytes = json.dumps(manifest).encode()
    annotation["source_manifest_sha256"] = pilot.digest(manifest_bytes)
    return pilot.diagnose(json.dumps(annotation).encode(), manifest_bytes)


def codes(result):
    return {d["code"] for d in result["diagnostics"]}


def facts(result):
    return {f["identity"]["logical_id"]: f for f in result["mapped_fragments"]["facts"]}


def test_frozen_input_is_reproducible_and_never_evaluated(monkeypatch):
    import app.evaluation.core

    def forbidden(*args, **kwargs):
        pytest.fail("provisional preparation must not invoke the evaluator")

    monkeypatch.setattr(app.evaluation.core, "evaluate", forbidden)
    a, m = pilot.ANNOTATIONS.read_bytes(), pilot.MANIFEST.read_bytes()
    result = pilot.diagnose(a, m)
    assert result == pilot.diagnose(a, m)
    assert result["status"] == "evaluation_not_run"
    assert not {"report", "outcome", "accepted", "release_id"} & result.keys()
    errors = next(
        x["errors"] for x in result["boundary_attempts"] if x["boundary"] == "EvaluationRequest"
    )
    acceptance = [e for e in errors if e["loc"][0] == "rules"]
    assert len(acceptance) == 3
    assert all("attributed acceptance" in e["msg"] for e in acceptance)
    assert all(e["sources"] for e in errors)


def test_corners_and_conflicting_area_are_not_collapsed_or_promoted():
    result = run()
    observed = facts(result)
    assert {k: observed[k]["quantity"]["value"] for k in observed} == {
        "separation": "2.6",
        "rear-southeast": "0.20",
        "rear-northeast": "0.22",
        "area-parsed": "22.25",
        "area-visible": "22.75",
    }
    assert all(f["status"] == "uncertain" for f in observed.values())
    assert all(f["provenance"]["review"]["status"] == "unreviewed" for f in observed.values())
    assert result["mapped_fragments"]["design"]["measurements"][0]["quantity"] is None
    assert "conflicting_area" in codes(result)
    annotation, _ = inputs()
    annotation["observations"][4]["quantity"] = annotation["observations"][3]["quantity"]
    changed = run(annotation)
    assert "conflicting_area" not in codes(changed)  # Derived from values, not fixed output.
    assert len(facts(changed)) == 5
    assert facts(changed)["area-visible"]["status"] == "uncertain"


@pytest.mark.parametrize("mutation", ["observation_period", "later_source", "current_source"])
def test_foreign_period_measurement_retained_but_not_mapped(mutation):
    annotation, _ = inputs()
    observation = annotation["observations"][0]
    if mutation == "observation_period":
        observation["period"] = "2023-property"
    else:
        observation["links"] = [
            {
                "source_id": "PM-PIP" if mutation == "later_source" else "PM-M",
                "locator": "Deliberately incompatible test citation",
            }
        ]
    result = run(annotation)
    assert "incompatible_period" in codes(result)
    assert "separation" not in facts(result)
    retained = result["retained_observations"][0]
    assert retained["quantity"] == observation["quantity"] | {"basis": None}
    assert retained["links"] == observation["links"]
    assert not retained["eligible_for_historical_fact_fragment"]


def test_later_evidence_cannot_supply_historical_rule_or_be_relabelled():
    annotation, _ = inputs()
    annotation["observations"][5]["links"] = [{"source_id": "PM-PIP", "locator": "BP055452"}]
    assert "incompatible_period" in codes(run(annotation))
    annotation["source_periods"]["PM-PIP"] = "2018-proposal"
    with pytest.raises(ValueError, match="cannot be relabelled"):
        run(annotation)


def test_parcel_conflict_is_input_derived_and_does_not_discard_claims():
    annotation, _ = inputs()
    result = run(annotation)
    assert result["parcel_claims"] == annotation["parcel_claims"]
    assert "parcel_identity_conflict" in codes(result)
    annotation["parcel_claims"][1]["value"] = "5230"
    changed = run(annotation)
    assert "parcel_identity_conflict" not in codes(changed)
    assert changed["status"] == "evaluation_not_run"
    assert "later_house_configuration" in codes(changed)


def test_missing_source_metadata_not_filled_from_annotation_hash():
    _, manifest = inputs()
    plan = next(s for s in manifest["sources"] if s["source_id"] == "PM-PLAN")
    plan["sha256"] = None
    plan["retrieved_at"] = None
    result = run(manifest=manifest)
    attempt = next(a for a in result["boundary_attempts"] if a["item"] == "PM-PLAN")
    assert {tuple(e["loc"]) for e in attempt["errors"]} == {
        ("artifact", "uri"),
        ("artifact", "sha256"),
        ("captured_at",),
    }
    assert attempt["attempted_payload"]["artifact"] == {}
    assert "captured_at" not in attempt["attempted_payload"]
    assert "reviewer" not in attempt["attempted_payload"]["review"] or (
        attempt["attempted_payload"]["review"]["reviewer"] is None
    )


def test_later_source_capture_is_not_a_historical_prerequisite():
    result = run()
    context = [
        d
        for d in result["diagnostics"]
        if d["code"] == "missing_original_source"
        and d["sources"][0]["source_id"] in {"PM-PIP", "PM-LISTING", "PM-A", "PM-M"}
    ]
    assert len(context) == 4
    assert all(d["scope"] == "context_only_not_required_for_historical_request" for d in context)
    request_errors = result["boundary_attempts"][-1]["errors"]
    source_errors = [e for e in request_errors if e["loc"][0] == "sources"]
    assert not {s["source_id"] for e in source_errors for s in e["sources"]} & {
        "PM-PIP",
        "PM-LISTING",
        "PM-A",
        "PM-M",
    }


def test_conditions_and_override_references_survive_mapping():
    annotation, _ = inputs()
    result = run(annotation)
    contents = result["mapped_fragments"]["rule_contents"]
    for source, content in zip(annotation["rule_claims"], contents, strict=True):
        assert content["references"] == source["references"]
        assert content["applicability"]["conditions"] == source["conditions"]
        assert content["semantics"]["kind"] == "unresolved"
    assert contents[-1]["references"][0]["relationship"] == "overrides"
    assert "unresolved_rule_dependencies" in codes(result)


def test_all_geometry_missing_and_no_accepted_flag_allowed():
    annotation, _ = inputs()
    result = run(annotation)
    fragments = result["mapped_fragments"]
    geometries = fragments["site"]["geometry_facts"] + [fragments["placement"]["footprint"]]
    assert {g["role"] for g in geometries} == {
        "parcel",
        "principal_building",
        "lot_line",
        "rear_yard",
        "proposed_placement",
    }
    assert all(g["geometry"] is None and g["status"] == "missing" for g in geometries)
    annotation["review"] = {"status": "accepted"}
    with pytest.raises(ValidationError, match="Extra inputs"):
        run(annotation)


def test_manifest_drift_and_duplicate_json_rejected():
    annotation = pilot.ANNOTATIONS.read_bytes()
    manifest = pilot.MANIFEST.read_bytes()
    with pytest.raises(ValueError, match="manifest changed"):
        pilot.diagnose(annotation, manifest + b" ")
    with pytest.raises(ValueError, match="duplicate JSON key"):
        pilot.read_json(b'{"a": 1, "a": 2}')
    with pytest.raises(ValueError, match="nonfinite"):
        pilot.read_json(b'{"a": NaN}')
    assert pilot.diagnose(annotation, manifest) == pilot.diagnose(
        annotation.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"),
        manifest.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"),
    )


def test_cli_runs_from_another_directory(tmp_path):
    result = subprocess.run(
        [sys.executable, str(pilot.ROOT / "scripts/diagnose_pilot_case.py"), "--format", "json"],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=True,
    )
    output = json.loads(result.stdout)
    assert output["status"] == "evaluation_not_run"
    human = pilot.render_human(output)
    assert "PM-PLAN" in human and "PM-PIP" in human
    assert "2.4" in human and "No EvaluationReport" in human
