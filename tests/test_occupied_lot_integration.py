"""Saved City bytes -> existing XY converter -> placement engine -> JSON.

This checks compatibility and independently specified properties, not real-site fit.
"""

import json
from pathlib import Path

import pytest
from shapely.geometry import mapping

from app.scouting_geometry import Assessment, Request, assess
from app.spatial.geometry import xy_polygon
from scripts.acquire_occupied_lots import verify

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "docs/research/occupied-lots/manifest.json").read_bytes())
CASES = [case for case in MANIFEST["cases"] if case["origin"] == "new-capture"]


def test_retained_packet_integrity():
    verify()


def captured_features(source_id, basis=None):
    source = MANIFEST["sources"][source_id]
    response = json.loads((ROOT / source["repository_path"]).read_bytes())
    result = []
    for row in response["features"]:
        geom, issue = xy_polygon(row["geometry"], has_z=response.get("hasZ", False))
        assert issue is None, (source_id, issue)
        assert geom.geom_type == "Polygon"
        record = {
            "id": f"{source_id}:{row['attributes']['OBJECTID']}",
            "shape": {"crs": "EPSG:3157", "geometry": mapping(geom)},
            "source": {
                "provider": "City of Victoria",
                "record_label": source_id,
                "capture_date": source["captured_at_utc"],
                "review_status": "unreviewed",
                "reference": source["repository_path"],
            },
        }
        if basis:
            record["basis"] = basis
        result.append((record, geom))
    return result


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["case_id"])
def test_captured_parcel_and_rooflines_reach_serializable_observations(case):
    oid = case["parcel_object_id"]
    parcel, polygon = captured_features(f"new-{oid}-parcel")[0]
    buildings = captured_features(f"new-{oid}-buildings", "roofline")
    # Deliberately place a synthetic rectangle fully beyond the parcel bounds.
    # The expected outside area is width * depth, independently of engine output.
    x, y = polygon.bounds[2:]
    request = Request.model_validate(
        {
            "schema_version": "scouting-geometry.v1",
            "projected_metre_crs": "EPSG:3157",
            "parcel": parcel,
            "buildings": [record for record, _ in buildings],
            "capture": {
                "completeness": "partial",
                "scope": "captured parcel-intersecting rooflines",
            },
            "placement": {
                "id": "synthetic-outside",
                "centre_xy": [x + 10, y + 10],
                "width_m": 2,
                "depth_m": 3,
            },
        }
    )
    result = assess(request)
    checks = {check.id: check for check in result.checks}
    assert checks["containment"].relation == "outside"
    assert checks["containment"].area_m2 == pytest.approx(6)
    assert all(check.status == "observed" for check in result.checks)
    assert len([check for check in result.checks if check.kind == "building_distance"]) == len(
        buildings
    )
    restored = Assessment.model_validate_json(result.model_dump_json())
    assert restored.input.model_dump(mode="json") == request.model_dump(mode="json")
    assert all(building.basis == "roofline" for building in restored.input.buildings)
    assert restored.conclusion == "tested_placement_observations_only"
    assert any("not verified clear space" in text for text in restored.limitations)
