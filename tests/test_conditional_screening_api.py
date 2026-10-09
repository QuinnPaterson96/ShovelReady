"""API cases have independent expected outcomes from stated facts and thresholds."""

from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

client = TestClient(create_app())


def user(value):
    return {"value": value, "origin": "user", "note": None}


def edge(index, role):
    corners = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]
    return {
        "id": f"geom-1:ring-0:segment-{index}", "ring": 0, "segment": index,
        "start": corners[index], "end": corners[(index + 1) % 4],
        "role": user(role),
    }


def measured(value, basis, unit="m"):
    return {
        "value": value, "unit": unit, "basis": basis,
        "origin": "user", "note": None, "placement_revision": "place-1",
    }


def payload():
    """An explicitly constructed ordinary-lot scenario, not a real parcel."""
    edges = [edge(i, role) for i, role in enumerate(("front", "side", "rear", "side"))]
    return {
        "schema_version": "conditional-screening.api.v1",
        "model_revision": "constructed-model-v1",
        "proposal": {
            "proposed_use": "garden_suite", "foundation_attached": True,
            "confirmed_zone": "GRD-1", "confirmed_instrument": "Zoning Bylaw 2018",
            "legal_lot_confirmed": True, "floor_area_definition_acknowledged": True,
            "no_relevant_projections": True,
        },
        "assumptions": {
            "schema_version": "sr.zoning-site-assumptions.v1",
            "property": {
                "case_id": "constructed", "parcel_id": "lot-1",
                "geometry_revision": "geom-1", "crs": "EPSG:3157",
                "source": {"provider": "Constructed example"},
                "capture": {"completeness": "synthetic"},
            },
            "observed_buildings": [
                {"id": "house-1", "basis": "roofline", "source": {"provider": "Synthetic"}}
            ],
            "edges": edges,
            "building_type": user("single_detached"),
            "existing_garden_suites": user(0),
            "principal_building_id": user("house-1"),
            "waterfront": user(False),
            "measurements": {
                "boundary": {
                    edges[1]["id"]: measured(0.7, "proposed_wall_to_lot_line"),
                    edges[2]["id"]: measured(0.6, "proposed_wall_to_lot_line"),
                    edges[3]["id"]: measured(0.4, "proposed_wall_to_lot_line"),
                },
                "principal_separation": measured(3, "principal_wall_to_proposed_wall"),
                "floor_area": measured(54, "regulatory_floor_area", "m2"),
            },
            "placement_revision": "place-1",
            "limitations": [],
        },
    }


def post(value):
    return client.post("/api/conditional-screening/v1/evaluate", json=value)


@pytest.mark.parametrize("zone", ["GRD-1", "GRD-1 (PGA)"])
def test_constructed_mixed_comparison_preserves_candidate_source_and_scope(zone):
    body = payload()
    body["proposal"]["confirmed_zone"] = zone
    response = post(body)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["request"]["packet_revision"] == "candidate-2026-10-06-1"
    assert data["request"]["model_revision"] == "constructed-model-v1"
    assert data["request"]["site_assumptions"]["property"]["source"]["provider"] == (
        "Constructed example"
    )
    assert data["scope"] == "supplied_placement_only"
    checks = {check["rule"]["fact_id"]: check for check in data["checks"]}
    assert checks["proposed_suite_total"]["status"] == "meets_under_assumptions"
    assert checks["floor_area"]["status"] == "meets_under_assumptions"
    assert checks["boundary:geom-1:ring-0:segment-1"]["status"] == "meets_under_assumptions"
    assert checks["boundary:geom-1:ring-0:segment-2"]["status"] == "meets_under_assumptions"
    assert checks["boundary:geom-1:ring-0:segment-3"]["status"] == (
        "apparent_conflict_under_assumptions"
    )
    assert checks["principal_separation"]["status"] == "needs_information"
    assert checks["flanking_presence"]["status"] == "not_applicable"
    assert checks["floor_area"]["rule"]["source"]["review_status"] == "candidate"
    assert "Part 2.1 Floor Area" in checks["floor_area"]["rule"]["source"]["locator"]
    assert any("consolidation" in item for item in data["limitations"])


def test_existing_suite_conflicts_and_waterfront_blocks_ordinary_setbacks():
    body = payload()
    body["assumptions"]["existing_garden_suites"] = user(1)
    body["assumptions"]["waterfront"] = user(True)
    data = post(body).json()
    checks = {check["rule"]["fact_id"]: check for check in data["checks"]}
    assert checks["proposed_suite_total"]["status"] == (
        "apparent_conflict_under_assumptions"
    )
    assert checks["boundary:geom-1:ring-0:segment-1"]["status"] == "unsupported"
    assert checks["floor_area"]["status"] == "meets_under_assumptions"


def test_unknown_real_style_input_does_not_gain_false_matches():
    body = payload()
    body["proposal"] = {
        "proposed_use": None, "foundation_attached": None,
        "confirmed_zone": None, "confirmed_instrument": None,
        "legal_lot_confirmed": None, "floor_area_definition_acknowledged": None,
        "no_relevant_projections": None,
    }
    assumptions = body["assumptions"]
    assumptions["building_type"] = user(None)
    assumptions["existing_garden_suites"] = user(None)
    assumptions["principal_building_id"] = user(None)
    assumptions["waterfront"] = user(None)
    assumptions["edges"][1]["role"] = user("unknown")
    assumptions["measurements"] = {
        "boundary": {}, "principal_separation": None, "floor_area": None,
    }
    response = post(body)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["coverage"]["meets_under_assumptions"] == 0
    assert data["coverage"]["needs_information"] > 0
    assert any("waterfront" in reason for reason in data["outstanding_prerequisites"])


def test_project_setting_origins_and_rough_area_remain_explicit():
    body = payload()
    body["proposal"]["confirmed_zone"] = None
    body["proposal"]["confirmed_instrument"] = None
    body["proposal"]["floor_area_definition_acknowledged"] = None
    body["assumptions"]["measurements"]["floor_area"] = measured(
        54, "rough_floor_area_estimate", "m2"
    )
    body["proposal_evidence"] = {
        name: {"value": value, "origin": (
            "unknown" if value is None else "journey_default"
            if name in ("proposed_use", "foundation_attached") else "user"
        ), "source": None, "note": "Explicit scenario setting"}
        for name, value in body["proposal"].items()
    }
    response = post(body)
    assert response.status_code == 200, response.text
    data = response.json()
    facts = {fact["id"]: fact for fact in data["request"]["facts"]}
    assert facts["proposed_use"]["origin"] == "journey_default"
    assert facts["foundation"]["origin"] == "journey_default"
    assert facts["zone"]["status"] == "unknown"
    assert facts["floor_area_definition"]["status"] == "unknown"
    floor = next(check for check in data["checks"] if check["rule"]["fact_id"] == "floor_area")
    assert floor["status"] == "needs_information"
    assert data["request"]["proposal_evidence"]["proposed_use"]["origin"] == "journey_default"
    body["proposal_evidence"]["confirmed_zone"]["value"] = "GRD-1"
    assert post(body).status_code == 422


def test_stale_measurement_and_client_rules_are_rejected():
    body = payload()
    stale = deepcopy(body)
    stale["assumptions"]["measurements"]["floor_area"]["placement_revision"] = "old"
    assert post(stale).status_code == 422
    body["rules"] = [{"threshold": 0}]
    assert post(body).status_code == 422


def test_proposal_cannot_coerce_string_boolean_or_bool_suite_count():
    body = payload()
    body["proposal"]["foundation_attached"] = "false"
    assert post(body).status_code == 422
    body = payload()
    body["assumptions"]["existing_garden_suites"] = user(False)
    assert post(body).status_code == 422


def test_no_edges_does_not_establish_no_flanking_street():
    body = payload()
    body["assumptions"]["edges"] = []
    body["assumptions"]["measurements"]["boundary"] = {}
    response = post(body)
    assert response.status_code == 200, response.text
    checks = {check["rule"]["fact_id"]: check for check in response.json()["checks"]}
    assert checks["flanking_presence"]["status"] == "needs_information"


@pytest.mark.parametrize("state,origin,value,expected", [
    ("assumed", "journey_default", 0, "meets_under_assumptions"),
    ("user_confirmed", "user", 0, "meets_under_assumptions"),
    ("assumed", "user", 1, "apparent_conflict_under_assumptions"),
    ("unknown", "user", None, "needs_information"),
])
def test_homeowner_count_evidence_survives_http_evaluation(state, origin, value, expected):
    # Independent count rule: one proposed + zero existing = 1; +one existing = 2.
    # A confirmation changes provenance, never legal acceptance or source review.
    body = payload()
    fact = {"value": value, "origin": origin, "evidence_state": state, "note": "Unverified"}
    body["assumptions"]["existing_garden_suites"] = fact
    response = post(body)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["request"]["site_assumptions"]["existing_garden_suites"] == fact
    count = next(c for c in data["checks"] if c["rule"]["kind"] == "count_max")
    assert count["status"] == expected
    assert count["fact"]["origin"] == (
        "user_confirmed" if state == "user_confirmed" else
        "journey_default" if origin == "journey_default" else "user_assumption"
    )
    if value == 0:
        body["proposal"]["legal_lot_confirmed"] = None
        unresolved = post(body).json()
        count = next(c for c in unresolved["checks"] if c["rule"]["kind"] == "count_max")
        assert count["status"] == "needs_information"


def test_evidence_states_cannot_forge_confirmation_or_favourable_legal_defaults():
    body = payload()
    body["assumptions"]["existing_garden_suites"] = {
        "value": 0, "origin": "journey_default", "evidence_state": "user_confirmed"
    }
    assert post(body).status_code == 422
    body["assumptions"]["existing_garden_suites"] = user(0)
    body["assumptions"]["edges"][0]["role"] = {
        "value": "front", "origin": "journey_default", "evidence_state": "assumed"
    }
    assert post(body).status_code == 422


@pytest.mark.parametrize("complete,method", [(False, None), (True, None), (True, "marking")])
def test_street_observations_survive_http_without_becoming_boundary_roles(complete, method):
    body = payload()
    for item in body["assumptions"]["edges"]:
        item["role"] = user("unknown")
    marks = {"edge_ids": [edge(0, "unknown")["id"], edge(1, "unknown")["id"]],
             "all_marked": complete, "origin": "user", "completion_method": method}
    body["assumptions"]["street_adjacency"] = marks
    response = post(body)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["request"]["site_assumptions"]["street_adjacency"] == marks
    assert all(item["role"]["value"] == "unknown"
               for item in data["request"]["site_assumptions"]["edges"])
    # Stated physical street adjacency supplies no legal role or flanking permission.
    checks = {item["rule"]["fact_id"]: item for item in data["checks"]}
    assert checks["flanking_presence"]["status"] == "needs_information"
    for invalid in ([marks["edge_ids"][0]] * 2, ["absent-edge"]):
        body["assumptions"]["street_adjacency"]["edge_ids"] = invalid
        assert post(body).status_code == 422


def test_boundary_suggestions_are_exported_without_supplying_legal_facts():
    body = payload()
    for item in body["assumptions"]["edges"]:
        item["role"] = user("unknown")
    suggestions = {"roles": {edge(0, "unknown")["id"]: "flanking_street"},
                   "conflicts": [], "basis": "user_marks"}
    body["assumptions"]["boundary_role_suggestions"] = suggestions
    response = post(body)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["request"]["site_assumptions"]["boundary_role_suggestions"] == suggestions
    checks = {item["rule"]["fact_id"]: item for item in data["checks"]}
    assert checks["flanking_presence"]["status"] == "needs_information"
    body["assumptions"]["boundary_role_suggestions"]["roles"] = {"absent": "front"}
    assert post(body).status_code == 422


def test_main_outline_default_does_not_satisfy_legal_principal_building_prerequisite():
    body = payload()
    body["assumptions"]["principal_building_id"] = {
        "value": "house-1", "origin": "journey_default", "evidence_state": "assumed",
        "note": "Largest usable captured outline; assumed main building.",
    }
    body["assumptions"]["waterfront"] = {
        "value": False, "origin": "journey_default", "evidence_state": "assumed",
        "note": "Assuming not waterfront; planning only.",
    }
    response = client.post("/api/conditional-screening/v1/evaluate", json=body)
    assert response.status_code == 200, response.text
    waterfront = next(f for f in response.json()["request"]["facts"]
                      if f["id"] == "waterfront")
    assert waterfront["status"] == "unknown"
    assert waterfront["truth"] is None
    assert waterfront["origin"] == "journey_default"
    body["assumptions"]["waterfront"]["value"] = True
    assert post(body).status_code == 422
    principal = next(c for c in response.json()["checks"]
                     if c["rule"]["fact_id"] == "principal_building")
    assert principal["fact"]["status"] == "unknown"
    assert principal["status"] == "needs_information"


def test_demo_scenario_origin_survives_evaluation_without_asserting_legal_facts():
    # The demo supplies a scenario, never title, zoning or confirmed property facts.
    body = payload()
    body["proposal_evidence"] = {
        name: {"value": value, "origin": "user", "source": None, "note": None}
        for name, value in body["proposal"].items()
    }
    body["proposal_evidence"]["proposed_use"]["origin"] = "demo_supplied"
    response = post(body)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["request"]["proposal_evidence"]["proposed_use"]["origin"] == "demo_supplied"
    use = next(fact for fact in data["request"]["facts"] if fact["id"] == "proposed_use")
    assert use["origin"] == "demo_supplied"
    body["proposal_evidence"]["legal_lot_confirmed"]["origin"] = "demo_supplied"
    assert post(body).status_code == 422
