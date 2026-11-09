"""Public dispatch, measured geometry and retained clauses through HTTP.

20 x 20 = 400 m² independently establishes the lot-area threshold. The retained
Saanich excerpts supply >=12 m width, <=93 m² GFA and >=0.45 landscaped share.
These checks verify the provisional implementation, not legal source acceptance.
"""

import json
from copy import deepcopy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.test_conditional_screening_api import payload as victoria_payload
from tests.test_placement_scenarios_api import request as geometry_payload

client = TestClient(create_app())
URL = "/api/municipal-rules/v1/evaluate"


def profile(city):
    return next(
        p
        for p in client.get("/api/municipal-rules/v1/catalogue").json()["profiles"]
        if p["jurisdiction_id"] == city
    )


def request():
    scenario = geometry_payload()
    return {
        "schema_version": "municipal-screening.request.v1",
        "jurisdiction_id": "ca-bc-saanich",
        "pathway_id": profile("ca-bc-saanich")["pathway_id"],
        "payload": {
            "assumptions": scenario["assumptions"],
            "geometry": scenario["geometry"],
            "model_revision": scenario["model_revision"],
            "proposed_use": "garden_suite",
            "inputs": {},
        },
    }


def measurement(name, value, unit):
    definition = next(
        f["definition"] for f in profile("ca-bc-saanich")["inputs"] if f["id"] == name
    )
    return {
        "quantity": {"value": value, "unit": unit},
        "definition_id": definition["id"],
        "definition_revision": definition["revision"],
        "origin": "user_measurement",
    }


def evaluate(body):
    response = client.post(URL, json=body)
    assert response.status_code == 200, response.text
    return response.json()


def checks(result):
    return {row["rule"]["fact_id"]: row for row in result["screening"]["checks"]}


def test_victoria_dispatch_preserves_every_legacy_result_and_scenario_field():
    payload = victoria_payload()
    body = {
        "schema_version": "municipal-screening.request.v1",
        "jurisdiction_id": "ca-bc-victoria",
        "pathway_id": profile("ca-bc-victoria")["pathway_id"],
        "payload": payload,
    }
    legacy = client.post("/api/conditional-screening/v1/evaluate", json=payload)
    assert evaluate(body)["screening"] == legacy.json()
    body["payload"] = geometry_payload()
    old = client.post("/api/conditional-screening/v1/placement-scenarios", json=body["payload"])
    new = client.post("/api/municipal-rules/v1/placement-scenarios", json=body)
    assert new.status_code == 200
    assert new.json() == old.json()
    catalogue = client.get("/api/municipal-rules/v1/catalogue").json()
    assert catalogue == json.loads(
        Path("frontend/src/municipal_rules/catalogue.json").read_text(encoding="utf-8")
    )


def test_saanich_measured_area_provisional_matches_and_separate_eligibility_questions():
    body = request()
    result = evaluate(body)
    rows = checks(result)
    assert rows["lot_area"]["normalized_observed"] == "400.0"
    assert rows["lot_area"]["status"] == "meets_under_assumptions"
    assert rows["lot_area"]["fact"]["origin"] == "derived_assumption"
    assert rows["location"]["status"] == rows["lot_width"]["status"] == "needs_information"
    assert result["findings"][-1]["status"] == "unsupported"
    assert rows["lot_area"]["rule"]["source"]["review_status"] == "unreviewed"
    assert rows["lot_area"]["rule"]["source"]["source_revision"] is None
    body["payload"]["inputs"] = {
        "lot_width": measurement("lot_width", "12", "m"),
        "floor_area": measurement("floor_area", "93", "m2"),
        "open_space": measurement("open_space", "0.45", "fraction"),
    }
    assert all(
        checks(evaluate(body))[key]["status"] == "meets_under_assumptions"
        for key in ("lot_area", "lot_width", "floor_area", "open_space")
    )
    body["payload"]["inputs"]["lot_area"] = measurement("lot_area", "399.99", "m2")
    assert checks(evaluate(body))["lot_area"]["status"] == "apparent_conflict_under_assumptions"
    # Independently below a minimum / above a maximum. Rounded UI values must
    # never affect these Decimal comparisons.
    for key, value, unit in (
        ("lot_width", "11.999", "m"),
        ("floor_area", "93.001", "m2"),
        ("open_space", "0.44999", "fraction"),
    ):
        body["payload"]["inputs"][key] = measurement(key, value, unit)
    result = evaluate(body)
    assert all(
        checks(result)[key]["status"] == "apparent_conflict_under_assumptions"
        for key in ("lot_width", "floor_area", "open_space")
    )
    assert result["screening"]["request"]["proposal_evidence"]["source_packet"]["source"][
        "snapshot_id"
    ]


@pytest.mark.parametrize(
    "sewer,urban,status",
    [
        (True, None, "meets_under_assumptions"),
        (False, None, "needs_information"),
        (False, False, "apparent_conflict_under_assumptions"),
    ],
)
def test_location_or_does_not_invent_an_answer(sewer, urban, status):
    body = request()
    body["payload"]["inputs"].update(sewer_service_area=sewer, urban_containment=urban)
    rows = checks(evaluate(body))
    assert rows["location"]["status"] == status
    if status == "apparent_conflict_under_assumptions":
        assert rows["lot_area"]["status"] == "unsupported"


def test_definition_mismatch_bad_geometry_and_unavailable_pathway_never_gain_matches():
    body = request()
    body["payload"]["inputs"]["floor_area"] = measurement("floor_area", "50", "m2")
    body["payload"]["inputs"]["floor_area"]["definition_id"] = "victoria-interior-area"
    assert checks(evaluate(body))["floor_area"]["status"] == "needs_information"
    # Self-crossing shell has no valid area assumption, even though Shapely can
    # return a number. The shared geometry assessment must reject the basis.
    body["payload"]["geometry"]["parcel"]["shape"]["geometry"]["coordinates"] = [
        [[0, 0], [20, 20], [0, 20], [20, 0], [0, 0]]
    ]
    assert checks(evaluate(body))["lot_area"]["status"] == "needs_information"
    # The captured pathway permits at most one garden suite. A known existing
    # suite cannot disappear behind otherwise favourable scalar comparisons.
    body = request()
    body["payload"]["assumptions"]["existing_garden_suites"] = {
        "value": 1,
        "origin": "user",
        "note": None,
    }
    rows = checks(evaluate(body))
    assert rows["no_existing_suite"]["status"] == "apparent_conflict_under_assumptions"
    assert rows["lot_area"]["status"] == "unsupported"
    body = request()
    body["payload"]["proposed_use"] = "other"
    assert all(row["status"] == "unsupported" for row in checks(evaluate(body)).values())
    for change in (
        {"jurisdiction_id": "ca-bc-burnaby"},
        {"pathway_id": "victoria-grd1-garden-suite"},
    ):
        invalid = request() | change
        assert client.post(URL, json=invalid).status_code == 422
    invalid = deepcopy(request())
    invalid["payload"]["geometry"]["parcel"]["id"] = "different-property"
    assert client.post(URL, json=invalid).status_code == 422
    assert (
        client.post("/api/municipal-rules/v1/placement-scenarios", json=request()).status_code
        == 422
    )
