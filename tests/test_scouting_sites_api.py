"""Retained source bytes through the packaged site API and placement engine."""

import hashlib
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from shapely.geometry import shape

from app.main import create_app
from app.scouting_geometry.payloads import Assessment

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "app/scouting_sites/data"
RESEARCH = ROOT / "docs/research/occupied-lots"


def test_retained_sources_to_api_to_serialized_measurements():
    source_manifest = json.loads((DATA / "sources.json").read_bytes())
    research = json.loads((RESEARCH / "manifest.json").read_bytes())
    assert len(source_manifest) == 6
    for source_id, source in source_manifest.items():
        raw = (DATA / "sources" / f"{source['sha256']}.json").read_bytes()
        assert hashlib.sha256(raw).hexdigest() == source["sha256"]
        assert raw == (ROOT / research["sources"][source_id]["repository_path"]).read_bytes()
        assert source["reference"] == research["sources"][source_id]["resolved_url"]

    client = TestClient(create_app())
    response = client.get("/api/scouting-sites")
    assert response.status_code == 200
    packet = response.json()
    assert packet["schema_version"] == "scouting-sites.v1"
    assert [case["case_id"] for case in packet["cases"]] == ["VIC-087", "VIC-090", "VIC-093"]
    for case in packet["cases"]:
        site = case["site"]
        assert site["capture"]["completeness"] == "partial"
        assert site["named_boundaries"] == []
        assert all(building["basis"] == "roofline" for building in site["buildings"])
        assert all(
            feature["source"]["reference"].startswith("https://maps.victoria.ca/")
            for feature in [site["parcel"], *site["buildings"]]
        )
        parcel = shape(site["parcel"]["shape"]["geometry"])
        x, y = parcel.bounds[2:]
        payload = {
            "schema_version": "scouting-geometry.v1",
            **site,
            "placement": {
                "id": "independent-outside-example",
                "centre_xy": [x + 10, y + 10],
                "width_m": 2,
                "depth_m": 3,
                "angle_degrees": 0,
            },
            "requirements": [],
        }
        assessed = client.post("/api/scouting-geometry/assess", json=payload)
        assert assessed.status_code == 200, assessed.text
        result = Assessment.model_validate(assessed.json())
        checks = {check.id: check for check in result.checks}
        assert checks["containment"].relation == "outside"
        assert checks["containment"].area_m2 == pytest.approx(6)
        assert result.input.parcel.source.reference == site["parcel"]["source"]["reference"]
        assert any("not verified clear space" in item for item in result.limitations)


def test_invalid_request_is_bounded_and_next_request_recovers():
    client = TestClient(create_app())
    site = client.get("/api/scouting-sites").json()["cases"][0]["site"]
    payload = {
        "schema_version": "scouting-geometry.v1", **site,
        "placement": {"id": "test", "centre_xy": [0, 0], "width_m": 2, "depth_m": 3},
    }
    invalid = {**payload, "placement": {**payload["placement"], "width_m": "2"}}
    assert client.post("/api/scouting-geometry/assess", json=invalid).status_code == 422
    assert client.post("/api/scouting-geometry/assess", content=b"{" * 200_001).status_code == 413
    assert client.post("/api/scouting-geometry/assess", json=payload).status_code == 200

    broken_building = {
        **payload,
        "buildings": [
            {
                **site["buildings"][0],
                "shape": {"crs": "EPSG:3157", "geometry": {"type": "Polygon", "coordinates": []}},
            }
        ],
    }
    partial = client.post("/api/scouting-geometry/assess", json=broken_building)
    assert partial.status_code == 200
    checks = {check["id"]: check for check in partial.json()["checks"]}
    assert checks["containment"]["status"] == "observed"
    assert checks["building:new-87-buildings:69542:overlap"]["status"] == "invalid"
