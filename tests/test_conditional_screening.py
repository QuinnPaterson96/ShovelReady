"""Synthetic decisions use arithmetic and stated measurement bases as their oracle."""

from decimal import Decimal

import pytest

from app.conditional_screening import evaluate

SOURCE = {
    "provider": "Synthetic test source",
    "record_label": "Illustrative rule set",
    "url": "https://example.test/rules",
    "locator": "examples 1-4",
    "capture_date": "2026-10-05",
    "source_revision": "synthetic.v1",
    "currentness_limitations": ["No real law has been reviewed"],
}


def rule(kind, fact_id, value=None, unit=None, definition=None, role=None, **extra):
    return {
        "logical_id": fact_id,
        "revision_id": "synthetic.v1",
        "kind": kind,
        "fact_id": fact_id,
        "threshold": {"value": value, "unit": unit} if value is not None else None,
        "expected": True if kind == "prerequisite" else None,
        "measurement_definition": definition,
        "boundary_role": role,
        "source": SOURCE,
        **extra,
    }


def fact(fact_id, *, value=None, unit=None, truth=None, definition=None, role=None,
         basis=None, status="known"):
    return {
        "id": fact_id,
        "status": status,
        "truth": truth,
        "quantity": {"value": value, "unit": unit} if value is not None else None,
        "measurement_definition": definition,
        "boundary_role": role,
        "geometry_basis": basis,
        "origin": "user_measurement",
        "source": None,
    }


def request(rules, facts):
    return {
        "schema_version": "conditional-screening.v1",
        "packet_id": "synthetic",
        "packet_revision": "v1",
        "property_revision": "parcel-1",
        "placement_revision": "placement-1",
        "model_revision": "model-1",
        "rules": rules,
        "facts": facts,
    }


def test_independent_distance_and_area_results_with_unit_equivalence():
    # Exactly 2 ft = 0.6096 m; 538.19552 ft² is just below 50 m² using
    # the exact international foot factor (0.3048 m per ft).
    rules = [
        rule("boundary_min", "side", "0.6096", "m", "lot line to suite wall", "side"),
        rule("separation_min", "house", "2.4", "m", "wall to wall"),
        rule("area_max", "floor", "50", "m2", "regulatory floor area"),
    ]
    facts = [
        fact("side", value="2", unit="ft", definition="lot line to suite wall",
             role="side", basis="wall"),
        fact("house", value="2.39", unit="m", definition="wall to wall", basis="wall"),
        fact("floor", value="538.19552", unit="ft2", definition="regulatory floor area"),
    ]
    result = evaluate(request(rules, facts))
    assert [x.status for x in result.checks] == [
        "meets_under_assumptions", "apparent_conflict_under_assumptions",
        "meets_under_assumptions",
    ]
    assert result.checks[0].normalized_observed == Decimal("0.6096")
    assert result.checks[2].normalized_observed == Decimal("49.9999999223808")
    assert result.coverage.apparent_conflict_under_assumptions == 1
    assert result.scope == "supplied_placement_only"
    assert result.request.rules[0].source.locator == "examples 1-4"


@pytest.mark.parametrize("role,basis,definition", [
    ("unknown", "wall", "lot line to suite wall"),
    ("front", "wall", "lot line to suite wall"),
    ("side", "roofline", "lot line to suite wall"),
    ("side", "wall", "roof edge to parcel"),
])
def test_incompatible_boundary_evidence_never_passes(role, basis, definition):
    result = evaluate(request(
        [rule("boundary_min", "edge", "0.6", "m", "lot line to suite wall", "side")],
        [fact("edge", value="1", unit="m", definition=definition, role=role, basis=basis)],
    ))
    assert result.checks[0].status == "needs_information"


def test_floor_area_definition_and_nominal_footprint_do_not_substitute():
    candidate = rule("area_max", "area", "56", "m2", "Part 2.1 Floor Area")
    for supplied in (
        fact("area", value="40", unit="m2", definition="Interior floor area"),
        fact("area", value="40", unit="m2", definition="Part 2.1 Floor Area",
             basis="nominal"),
    ):
        result = evaluate(request([candidate], [supplied]))
        assert result.checks[0].status == "needs_information"


def test_mixed_unknown_exception_conflict_and_pathway_contradiction():
    rules = [
        rule("prerequisite", "building_type"),
        rule("boundary_min", "side", "0.6", "m", "lot line to suite wall", "side",
             required_pathway_facts=["building_type"], unsupported_if_true=["waterfront"]),
        rule("separation_min", "house", "2.4", "m", "wall to wall"),
    ]
    facts = [
        fact("building_type", truth=False),
        fact("side", value="1", unit="m", definition="lot line to suite wall",
             role="side", basis="wall"),
        fact("waterfront", status="unknown"),
        fact("house", value="2.3", unit="m", definition="wall to wall", basis="wall"),
    ]
    result = evaluate(request(rules, facts))
    assert [x.status for x in result.checks] == [
        "apparent_conflict_under_assumptions", "needs_information",
        "apparent_conflict_under_assumptions",
    ]
    assert any("contradicts" in item for item in result.outstanding_prerequisites)
    facts[2] = fact("waterfront", truth=True)
    assert evaluate(request(rules, facts)).checks[1].status == "unsupported"


def test_positive_not_applicability_requires_explicit_rule_state():
    candidate = rule("boundary_min", "flank", "3.5", "m", "lot line to wall",
                     "flanking_street", applicability="not_applicable",
                     applicability_reason="Confirmed interior lot has no flanking street line")
    result = evaluate(request([candidate], []))
    assert result.checks[0].status == "not_applicable"
    assert result.checks[0].reasons == (
        "Confirmed interior lot has no flanking street line",
    )


def test_malformed_duplicate_and_nonfinite_inputs_are_rejected():
    candidate = rule("prerequisite", "suite")
    with pytest.raises(ValueError):
        evaluate(request([candidate, candidate], [fact("suite", truth=True)]))
    with pytest.raises(ValueError):
        evaluate(request(
            [rule("area_max", "floor", "NaN", "m2", "Floor Area")],
            [fact("floor", value="10", unit="m2", definition="Floor Area")],
        ))
