"""The expected outcomes follow rectangle-to-edge distances and candidate 0.6/3.5 m limits."""

from copy import deepcopy

from fastapi.testclient import TestClient

from app.main import create_app

client = TestClient(create_app())
SOURCE = {
    "provider": "Synthetic fixture", "record_label": "square lot",
    "capture_date": None, "review_status": "unreviewed", "reference": None,
}


def request(centre=(10, 10), *, width=2, depth=2):
    ring = [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]]
    parcel = {
        "id": "parcel", "source": SOURCE,
        "shape": {"crs": "EPSG:3157", "geometry": {"type": "Polygon", "coordinates": [ring]}},
    }
    edges = [{
        "id": f"geom:ring-0:segment-{index}", "ring": 0, "segment": index,
        "start": ring[index], "end": ring[index + 1],
        "role": {"value": "unknown", "origin": "user", "note": None},
    } for index in range(4)]
    return {
        "schema_version": "placement-scenarios.request.v1",
        "geometry": {
            "schema_version": "scouting-geometry.v1", "projected_metre_crs": "EPSG:3157",
            "parcel": parcel, "buildings": [],
            "capture": {"completeness": "partial", "scope": "synthetic parcel"},
            "placement": {"id": "placement", "centre_xy": centre, "width_m": width,
                          "depth_m": depth, "angle_degrees": 0},
        },
        "assumptions": {
            "schema_version": "sr.zoning-site-assumptions.v1",
            "property": {"case_id": "constructed", "parcel_id": "parcel",
                         "geometry_revision": "geom", "crs": "EPSG:3157",
                         "source": SOURCE, "capture": {"completeness": "partial"}},
            "observed_buildings": [], "edges": edges,
            **{key: {"value": None, "origin": "user", "note": None} for key in (
                "building_type", "existing_garden_suites", "principal_building_id",
                "waterfront")},
            "measurements": {"boundary": {}, "principal_separation": None,
                             "floor_area": None},
            "placement_revision": "place-1", "limitations": [],
        },
        "model_revision": "nominal-test-model", "street_edge_id": None,
        "street_pattern": "unknown",
    }


def screen(body):
    response = client.post("/api/conditional-screening/v1/placement-scenarios", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def test_all_plausible_assignments_pass_only_the_declared_distance_subset():
    result = screen(request())
    assert result["status"] == "bounded_pass"
    assert len(result["scenarios"]) == 16  # four possible fronts × four side/flank pairs
    assert all(scenario["outcome"] == "pass" for scenario in result["scenarios"])
    assert result["edge_distances_m"]["geom:ring-0:segment-0"] == 9
    assert any("Front setback" in item for item in result["limitations"])
    assert result["sources"][0]["provider"] == "City of Victoria"


def test_mixed_assignment_asks_for_boundary_clarification_and_selection_recomputes():
    body = request((2, 10))
    result = screen(body)
    assert result["status"] == "clarify"
    assert result["edge_distances_m"]["geom:ring-0:segment-3"] == 1
    body["street_edge_id"] = "geom:ring-0:segment-3"
    # A street-facing edge does not by itself establish the legal front.
    assert screen(body)["status"] == "clarify"
    body["street_pattern"] = "single"
    selected = screen(body)
    assert selected["status"] == "bounded_pass"
    assert len(selected["scenarios"]) == 1
    body["street_edge_id"] = "geom:ring-0:segment-0"
    body["assumptions"]["edges"][3]["role"]["value"] = "side"
    overridden = screen(body)
    assert overridden["status"] == "bounded_pass"
    assert all(check["role"] != "flanking_street" for check in overridden["scenarios"][0]["checks"])


def test_all_fail_is_for_this_placement_and_does_not_use_global_maximum_filter():
    # Rectangle spans [0.1, 2.1] in both axes. Two edges are each 0.1 m away;
    # any front choice can exempt at most one, so every scenario has a shortfall.
    result = screen(request((1.1, 1.1)))
    assert result["status"] == "apparent_conflict"
    assert all(scenario["outcome"] == "fail" for scenario in result["scenarios"])
    assert "this placement" in result["reason"]


def test_holes_irregular_boundaries_and_stale_edge_identity_remain_unresolved():
    body = request()
    body["geometry"]["parcel"]["shape"]["geometry"]["coordinates"].append(
        [[8, 8], [8, 12], [12, 12], [12, 8], [8, 8]])
    assert screen(body)["status"] == "unresolved"
    body = request()
    ring = [[0, 0], [20, 0], [21, 8], [20, 20], [0, 20], [0, 0]]
    body["geometry"]["parcel"]["shape"]["geometry"]["coordinates"] = [ring]
    assert screen(body)["status"] == "unresolved"
    body = request()
    body["assumptions"]["edges"][0]["start"] = [1, 0]
    assert screen(body)["status"] == "unresolved"


def test_changed_placement_and_conflicting_manual_roles_recompute_without_false_pass():
    body = request()
    assert screen(body)["status"] == "bounded_pass"
    moved = deepcopy(body)
    moved["geometry"]["placement"]["centre_xy"] = [1.1, 1.1]
    moved["assumptions"]["placement_revision"] = "place-2"
    assert screen(moved)["status"] == "apparent_conflict"
    moved["assumptions"]["edges"][0]["role"]["value"] = "front"
    moved["assumptions"]["edges"][2]["role"]["value"] = "front"
    assert screen(moved)["status"] == "unresolved"


def test_known_exception_or_different_pathway_cannot_become_a_pass():
    body = request()
    body["assumptions"]["waterfront"]["value"] = True
    assert screen(body)["status"] == "unresolved"
    body = request()
    body["proposal"] = {"confirmed_zone": "other"}
    assert screen(body)["status"] == "unresolved"
