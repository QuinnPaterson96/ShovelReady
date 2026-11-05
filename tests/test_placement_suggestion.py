"""Independent rectangular geometry protects meaningful search/API behavior."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.placement_suggestion.api import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)
SOURCE = {"provider": "Synthetic", "record_label": "rectangular test lot",
          "capture_date": None, "reference": None, "review_status": "unreviewed"}


def feature(id, ring, *, building=False):
    return {"id": id, "source": SOURCE,
            "shape": {"crs": "EPSG:3157", "geometry": {
                "type": "Polygon", "coordinates": [ring]}},
            **({"basis": "roofline"} if building else {})}


def request(width=2, depth=2, *, with_context=False):
    ring = [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]]
    geometry = {
        "schema_version": "scouting-geometry.v1", "projected_metre_crs": "EPSG:3157",
        "parcel": feature("parcel", ring), "buildings": [],
        "capture": {"completeness": "partial", "scope": "synthetic mapped outlines"},
        "placement": {"id": "initial", "centre_xy": [10, 10], "width_m": width,
                      "depth_m": depth, "angle_degrees": 0},
    }
    body = {"schema_version": "placement-suggestion.request.v1", "geometry": geometry}
    if with_context:
        edges = [{"id": f"geom:edge-{i}", "ring": 0, "segment": i,
                  "start": ring[i], "end": ring[i + 1],
                  "role": {"value": "unknown", "origin": "user"}} for i in range(4)]
        body["scenario_context"] = {
            "model_revision": "synthetic-model", "street_pattern": "single",
            "street_edge_id": edges[0]["id"], "proposal": {"proposed_use": "garden_suite"},
            "assumptions": {
                "schema_version": "sr.zoning-site-assumptions.v1",
                "property": {"case_id": "synthetic", "parcel_id": "parcel",
                             "geometry_revision": "geom", "crs": "EPSG:3157",
                             "source": SOURCE, "capture": geometry["capture"]},
                "observed_buildings": [], "edges": edges,
                **{key: {"value": None, "origin": "user"} for key in (
                    "building_type", "existing_garden_suites", "principal_building_id",
                    "waterfront")},
                "measurements": {"boundary": {}, "principal_separation": None,
                                 "floor_area": None},
                "planning_buffers_m": {e["id"]: 1 for e in edges},
                "placement_revision": "old-position", "limitations": [],
            },
        }
    return body


def post(body):
    response = client.post("/api/placement-suggestions/v1/suggest", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def test_occupied_centre_gets_full_footprint_in_open_pocket_and_keeps_partial_scope():
    body = request()
    body["geometry"]["buildings"] = [feature(
        "house", [[6, 6], [14, 6], [14, 14], [6, 14], [6, 6]], building=True)]
    result = post(body)
    assert result["status"] == "suggested"
    x, y = result["placement"]["centre_xy"]
    # A 2 m square lies wholly inside 20 m square and outside central 8 m house.
    assert 1 < x < 19 and 1 < y < 19
    assert x + 1 < 6 or x - 1 > 14 or y + 1 < 6 or y - 1 > 14
    assert result["capture"]["completeness"] == "partial"
    assert result["basis"] == "mapped_geometry"
    assert result["selected_scenario"] is None


def test_long_footprint_is_rotated_to_fit_narrow_lot():
    body = request(width=8, depth=2)
    body["geometry"]["parcel"] = feature(
        "parcel", [[0, 0], [4, 0], [4, 12], [0, 12], [0, 0]])
    result = post(body)
    assert result["status"] == "suggested"
    p = result["placement"]
    # Unrotated 8 m width cannot fit 4 m lot; at 90 degrees spans 2 m by 8 m.
    assert p["angle_degrees"] == 90
    x, y = p["centre_xy"]
    assert 1 < x < 3 and 4 < y < 8


def test_complete_scenario_and_planning_margins_use_new_position_not_old_manual_gaps():
    body = request(with_context=True)
    assumptions = body["scenario_context"]["assumptions"]
    assumptions["measurements"]["boundary"] = {"geom:edge-1": {
        "value": 999, "unit": "m", "basis": "proposed_wall_to_lot_line",
        "origin": "user", "placement_revision": "old-position"}}
    result = post(body)
    assert result["status"] == "suggested"
    scenario = result["selected_scenario"]
    assert result["basis"] == "candidate_scenario"
    assert scenario["front_edge_id"] == "geom:edge-0"
    assert {c["edge_id"]: c["role"] for c in scenario["checks"]} == {
        "geom:edge-1": "side", "geom:edge-2": "rear", "geom:edge-3": "side"}
    assert all(c["basis"] == "captured_nominal" and 1.6 <= c["distance_m"] < 20
               and c["planning_buffer_m"] == 1 and c["planning_meets"]
               for c in scenario["checks"])
    assert result["sources"]
    # With supplied supported zone, non-waterfront and sole street at y=0,
    # front-gap geometry is y minus half the 2 m depth. Its separate 7 m
    # planning allowance must still leave the candidate rule's full threshold.
    assumptions["waterfront"]["value"] = False
    assumptions["planning_buffers_m"]["geom:edge-0"] = 7
    body["scenario_context"]["proposal"].update({
        "confirmed_zone": "GRD-1", "confirmed_instrument": "Zoning Bylaw 2018"})
    result = post(body)
    assert result["status"] == "suggested"
    front = next(c for c in result["position_checks"] if c["id"] == "front")
    assert front["observed"] == result["placement"]["centre_xy"][1] - 1
    assert front["observed"] - 7 >= front["threshold"]
    assert result["packet_revision"] and front["source"]["locator"]


def test_no_suggestion_is_bounded_and_invalid_evidence_is_not_ignored():
    result = post(request(width=30, depth=30))
    assert result["status"] == "no_suggestion" and result["placement"] is None
    assert "bounded search" in result["message"]
    # Equal footprints touch the boundary; the existing assessor calls that a conflict.
    assert post(request(width=20, depth=20))["status"] == "no_suggestion"
    body = request(with_context=True)
    body["scenario_context"]["assumptions"]["property"]["parcel_id"] = "another-property"
    assert post(body)["status"] == "unsupported"
    body = request(with_context=True)
    body["scenario_context"]["proposal_evidence"] = {
        field: {"value": None, "origin": "unknown", "note": None} for field in (
            "proposed_use", "foundation_attached", "confirmed_zone", "confirmed_instrument",
            "legal_lot_confirmed", "floor_area_definition_acknowledged", "no_relevant_projections")}
    # Its garden-suite proposal contradicts the supplied unknown-use evidence.
    assert client.post("/api/placement-suggestions/v1/suggest", json=body).status_code == 422
    body = request()
    body["geometry"]["buildings"] = [feature(
        "invalid", [[4, 4], [8, 8], [4, 8], [8, 4], [4, 4]], building=True)]
    assert post(body)["status"] == "unsupported"
    assert client.post("/api/placement-suggestions/v1/suggest", content="[]").status_code == 422
    assert client.post("/api/placement-suggestions/v1/suggest",
                       content=" " * 200001).status_code == 413
