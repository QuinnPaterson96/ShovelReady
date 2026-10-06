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
