"""The expected outcomes follow rectangle-to-edge distances and candidate 0.6/3.5 m limits."""

from copy import deepcopy

import pytest
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


def test_pga_additional_checks_use_rear_yard_denominator_and_keep_roofline_basis():
    # Independent geometry: 20x20 lot, house rear y=10, yard area 200;
    # proposed 2x2 box spans y=15..17: gap 5m, rear-yard share 4/200.
    body = request((10, 16))
    body["proposal"] = {"confirmed_zone": "GRD-1 (PGA)",
                        "confirmed_instrument": "Zoning Bylaw 2018"}
    body["additional_inputs"] = {"height_from_average_grade_m": 4.2}
    body["street_pattern"] = "single"
    body["street_edge_id"] = "geom:ring-0:segment-0"
    house = {"id": "house", "basis": "roofline", "source": SOURCE,
             "shape": {"crs": "EPSG:3157", "geometry": {"type": "Polygon", "coordinates": [
                 [[5, 5], [15, 5], [15, 10], [5, 10], [5, 5]]]}}}
    body["geometry"]["buildings"] = [house]
    for key, value in (("waterfront", False), ("building_type", "single_detached"),
                       ("principal_building_id", "house")):
        body["assumptions"][key]["value"] = value
    result = screen(body)
    checks = {check["id"]: check for check in result["additional_checks"]}
    assert checks["separation"]["observed"] == 5
    assert "roofline" in checks["separation"]["basis"]
    assert checks["rear_occupancy"]["observed"] == .02
    assert checks["rear_location"]["status"] == "checked"
    assert checks["front"]["observed"] == 15
    assert checks["height"]["status"] == "checked"
    assert result["additional_revision"] == "candidate-scouting-2026-10-06-1"
    body["additional_inputs"]["height_from_average_grade_m"] = 4.200001
    assert next(c for c in screen(body)["additional_checks"]
                if c["id"] == "height")["status"] == "conflict"
    body["assumptions"]["principal_building_id"]["value"] = None
    assert next(c for c in screen(body)["additional_checks"]
                if c["id"] == "separation")["status"] == "probable"
    body["geometry"]["buildings"].append({**deepcopy(house), "id": "same-size-outline"})
    assert next(c for c in screen(body)["additional_checks"]
                if c["id"] == "separation")["status"] == "unknown"
    body["proposal"]["confirmed_zone"] = "other"
    assert all(c["status"] == "unsupported" for c in screen(body)["additional_checks"])


def test_additional_height_rejects_bad_units_and_nonfinite_values():
    for value in (-1, "4.2", True):
        body = request()
        body["additional_inputs"] = {"height_from_average_grade_m": value}
        assert client.post("/api/conditional-screening/v1/placement-scenarios",
                           json=body).status_code == 422


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


def test_rear_clue_is_reciprocal_only_for_stated_single_street_lot():
    body = request((2, 10))
    body["rear_edge_id"] = "geom:ring-0:segment-1"
    assert screen(body)["status"] == "clarify"  # clue alone leaves other fronts
    body["street_pattern"] = "single"
    selected = screen(body)
    assert selected["status"] == "bounded_pass"
    assert [item["front_edge_id"] for item in selected["scenarios"]] == [
        "geom:ring-0:segment-3"]
    body["street_edge_id"] = "geom:ring-0:segment-0"
    assert screen(body)["status"] == "unresolved"  # inconsistent pair
    body["street_pattern"] = "corner_or_multiple"
    assert screen(body)["status"] == "clarify"


def test_user_wall_measurement_changes_comparison_but_preserves_captured_distance():
    body = request((2, 10))
    body["street_edge_id"] = "geom:ring-0:segment-0"
    body["street_pattern"] = "single"
    base = screen(body)
    assert base["status"] == "bounded_pass"
    edge_id = "geom:ring-0:segment-3"
    body["assumptions"]["measurements"]["boundary"][edge_id] = {
        "value": 0.59, "unit": "m", "basis": "proposed_wall_to_lot_line",
        "origin": "user", "note": None, "placement_revision": "place-1",
    }
    changed = screen(body)
    assert changed["status"] == "apparent_conflict"
    assert changed["edge_distances_m"][edge_id] == 1
    check = next(item for item in changed["scenarios"][0]["checks"]
                 if item["edge_id"] == edge_id)
    assert (check["distance_m"], check["basis"], check["meets"]) == (
        0.59, "user_wall_to_lot_line", False)
    body["assumptions"]["measurements"]["boundary"][edge_id]["basis"] = "regulatory_floor_area"
    assert screen(body)["status"] == "unresolved"


def test_buffer_estimates_and_front_override_preserve_exact_evidence():
    # Independent arithmetic: 40*1.1=44 m2 and 3.2*1.1+.30=3.82m.
    # Unknown installed grade remains a probable estimate, never a measured pass.
    body = request((10, 16))
    body["proposal"] = {"confirmed_zone": "GRD-1",
                        "confirmed_instrument": "Zoning Bylaw 2018"}
    body["street_pattern"] = "single"
    body["street_edge_id"] = "geom:ring-0:segment-0"
    body["additional_inputs"] = {"nominal_footprint_area_m2": 40.0,
                                 "advertised_height_m": 3.2}
    checks = {c["id"]: c for c in screen(body)["additional_checks"]}
    assert checks["area"]["observed"] == 44
    assert checks["height"]["observed"] == pytest.approx(3.82)
    assert checks["area"]["status"] == checks["height"]["status"] == "probable"
    assert checks["front"]["observed"] == 15
    assert checks["front"]["status"] == "probable"
    body["assumptions"]["measurements"]["boundary"]["geom:ring-0:segment-0"] = {
        "value": 3.99, "unit": "m", "basis": "proposed_wall_to_lot_line",
        "origin": "user", "note": None, "placement_revision": "place-1"}
    result = screen(body)
    front = next(c for c in result["additional_checks"] if c["id"] == "front")
    assert (front["observed"], front["status"]) == (3.99, "conflict")
    assert result["edge_distances_m"]["geom:ring-0:segment-0"] == 15
    body["assumptions"]["measurements"]["floor_area"] = {
        "value": 70.0, "unit": "m2", "basis": "regulatory_floor_area",
        "origin": "user", "note": None, "placement_revision": "place-1"}
    area = next(c for c in screen(body)["additional_checks"] if c["id"] == "area")
    assert (area["observed"], area["status"]) == (70, "conflict")
    body["assumptions"]["measurements"]["floor_area"] = None
    body["additional_inputs"].update(nominal_footprint_area_m2=56.0, advertised_height_m=4.0)
    checks = {c["id"]: c for c in screen(body)["additional_checks"]}
    assert checks["area"]["status"] == checks["height"]["status"] == "unknown"
    body["additional_inputs"]["height_from_average_grade_m"] = 4.200001
    assert next(c for c in screen(body)["additional_checks"]
                if c["id"] == "height")["status"] == "conflict"


def test_completed_corner_marks_limit_coherent_front_and_flanking_choices():
    # A 20m square has streets on south/east, so only those fronts are plausible.
    body = request()
    edges = body["assumptions"]["edges"]
    body["assumptions"]["street_adjacency"] = {
        "edge_ids": [edges[0]["id"], edges[1]["id"]], "all_marked": True,
        "origin": "user", "completion_method": "advance"}
    result = screen(body)
    assert len(result["scenarios"]) == 2
    assert {s["front_edge_id"] for s in result["scenarios"]} == {edges[0]["id"], edges[1]["id"]}
    for scenario in result["scenarios"]:
        assert sum(c["role"] == "flanking_street" for c in scenario["checks"]) == 1
    body["assumptions"]["street_adjacency"]["all_marked"] = False
    assert len(screen(body)["scenarios"]) == 16
