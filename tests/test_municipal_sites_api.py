"""Offline route checks from bounded, genuine City responses captured 2026-09-29 UTC.

Expected 87 area follows independent planar XY calculation in the retained occupied-lot
packet; this exercises the public HTTP path and uncertainty behavior, not source accuracy.
"""

import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient
from shapely.geometry import shape

from app.main import create_app
from app.municipal_sites import api

FIXTURES = Path(__file__).parent / "fixtures" / "municipal_sites"
SOURCE = "city-of-victoria-pid-parcels"


class SavedResponse:
    def __init__(self, url, raw):
        self.url = url
        self.raw = raw

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self, limit):
        return self.raw[:limit]


def client(monkeypatch, replacements=None):
    replacements = replacements or {}

    def saved(url, timeout):
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        layer = parsed.path.split("/")[-2]
        if layer == "0":
            name = "address_87"
        elif layer == "11" and params.get("returnGeometry") == ["false"]:
            name = "parcel_search_87"
        elif layer == "11":
            name = "parcel_observe_87"
        elif layer == "1":
            name = "buildings_87"
        else:
            raise AssertionError(url)
        raw = replacements.get(name)
        if raw is None:
            raw = (FIXTURES / f"{name}.json").read_bytes()
        elif isinstance(raw, dict):
            raw = json.dumps(raw).encode()
        return SavedResponse(url, raw)

    monkeypatch.setattr(api, "urlopen", saved)
    return TestClient(create_app())


def request_search(address="1144 MAY ST", **extra):
    return {"schema_version": api.VERSION, "address": address, **extra}


def request_observe(**extra):
    return {
        "schema_version": api.VERSION,
        "parcel_ref": {"source": SOURCE, "object_id": 87},
        **extra,
    }


def fixture(name):
    return json.loads((FIXTURES / f"{name}.json").read_text())


def test_address_selection_to_geometry_and_export(monkeypatch):
    http = client(monkeypatch)
    result = http.post("/api/municipal-sites/search", json=request_search()).json()
    assert result["status"] == "candidates"
    assert [(x["pid"], x["relation"]) for x in result["candidates"]] == [
        ("001-328-107", "gislink_join")
    ]
    assert result["candidates"][0]["parcel_ref"] == request_observe()["parcel_ref"]
    observation = http.post(
        "/api/municipal-sites/observe", json=request_observe(expected_pid="001-328-107")
    ).json()
    assert observation["status"] == "available"
    assert observation["parcel"]["horizontal_crs"] == "EPSG:3157"
    assert abs(observation["parcel"]["area_m2"] - 642.02) < 0.02
    assert len(observation["rooflines"]) == 1
    assert observation["rooflines"][0]["relationship"] == "spatial_intersection_not_ownership"
    assert all("raw_response_text" in e and "source_url" in e for e in observation["evidence"])


def test_malformed_input_and_out_of_coverage(monkeypatch):
    http = client(monkeypatch)
    assert (
        http.post("/api/municipal-sites/search", json=request_search(pid="001-328-107")).status_code
        == 422
    )
    assert (
        http.post(
            "/api/municipal-sites/search",
            json=request_search(point_hint={"crs": "EPSG:3157", "x": 1, "y": 2}),
        ).status_code
        == 422
    )
    assert (
        http.post(
            "/api/municipal-sites/observe",
            json=request_observe(parcel_ref={"source": "other", "object_id": 87}),
        ).status_code
        == 422
    )


def test_provider_error_limit_and_wrong_crs_do_not_look_empty(monkeypatch):
    for mutation in (
        {"error": {"code": 500}},
        {"exceededTransferLimit": True, "features": []},
        {**fixture("address_87"), "spatialReference": {"wkid": 4326}},
    ):
        http = client(monkeypatch, {"address_87": mutation})
        assert http.post("/api/municipal-sites/search", json=request_search()).status_code == 502


def test_missing_invalid_stale_and_partial_geometry(monkeypatch):
    missing = fixture("parcel_observe_87")
    missing["features"] = []
    assert (
        client(monkeypatch, {"parcel_observe_87": missing})
        .post("/api/municipal-sites/observe", json=request_observe())
        .json()["status"]
        == "missing"
    )
    assert (
        client(monkeypatch)
        .post("/api/municipal-sites/observe", json=request_observe(expected_pid="999-999-999"))
        .json()["status"]
        == "stale"
    )
    invalid = fixture("parcel_observe_87")
    invalid["features"][0]["geometry"]["rings"][0][0][0] = 0
    assert (
        client(monkeypatch, {"parcel_observe_87": invalid})
        .post("/api/municipal-sites/observe", json=request_observe())
        .json()["status"]
        == "invalid"
    )
    no_roof = fixture("buildings_87")
    no_roof["features"] = []
    result = (
        client(monkeypatch, {"buildings_87": no_roof})
        .post("/api/municipal-sites/observe", json=request_observe())
        .json()
    )
    assert result["status"] == "partial"
    assert "no_usable_intersecting_rooflines_does_not_establish_empty_space" in result["issues"]


def test_ambiguous_address_preserves_rows(monkeypatch):
    addresses = fixture("address_87")
    second = json.loads(json.dumps(addresses["features"][0]))
    second["attributes"]["OBJECTID"] = 9211
    addresses["features"].append(second)
    result = (
        client(monkeypatch, {"address_87": addresses})
        .post("/api/municipal-sites/search", json=request_search())
        .json()
    )
    assert len(result["candidates"]) == 2
    assert {x["address_object_id"] for x in result["candidates"]} == {
        addresses["features"][0]["attributes"]["OBJECTID"],
        9211,
    }


def test_point_fallback_is_only_a_spatial_lead(monkeypatch):
    empty = fixture("address_87")
    empty["features"] = []
    result = (
        client(monkeypatch, {"address_87": empty})
        .post(
            "/api/municipal-sites/search",
            json=request_search(
                address="999 UNKNOWN ST", point_hint={"crs": "EPSG:3157", "x": 473000, "y": 5363000}
            ),
        )
        .json()
    )
    assert result["candidates"][0]["relation"] == "spatial_lead"
    assert result["candidates"][0]["identity_status"] == "spatial_lead_unverified"


def test_roofline_provider_failure_keeps_parcel_evidence(monkeypatch):
    result = (
        client(monkeypatch, {"buildings_87": {"error": {"code": 500}}})
        .post("/api/municipal-sites/observe", json=request_observe())
        .json()
    )
    assert result["status"] == "partial"
    assert result["parcel"]["area_m2"] > 600
    assert result["issues"][0] == "roofline_fetch_failed"
    assert len(result["evidence"]) == 1


def test_multipart_and_hole_geometry_survives_http_to_measurement(monkeypatch):
    # Two 10x10 metre components, with a 2x2 hole: area = 196 m².
    # This reproduces the UI bug that treated every Esri ring after the first as a hole.
    def ring(x, y, size):
        return [[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]

    parcel = fixture("parcel_observe_87")
    parcel["features"][0]["geometry"] = {
        "rings": [ring(473000, 5363000, 10), ring(473002, 5363002, 2), ring(473020, 5363000, 10)]
    }
    http = client(
        monkeypatch, {"parcel_observe_87": parcel, "buildings_87": {"error": {"code": 503}}}
    )
    observed = http.post("/api/municipal-sites/observe", json=request_observe()).json()
    assert observed["status"] == "partial"
    polygon = observed["parcel"]["planar_geometry"]
    assert polygon["type"] == "MultiPolygon"
    assert shape(polygon).area == 196
    result = http.post(
        "/api/scouting-geometry/assess",
        json={
            "schema_version": "scouting-geometry.v1",
            "projected_metre_crs": "EPSG:3157",
            "parcel": {
                "id": "selected",
                "shape": {"crs": "EPSG:3157", "geometry": polygon},
                "source": {
                    "provider": "City of Victoria",
                    "record_label": "synthetic topology regression",
                    "review_status": "unreviewed",
                },
            },
            "buildings": [],
            "capture": {"completeness": "partial", "scope": "roofline request unavailable"},
            "placement": {"id": "test", "centre_xy": [473025, 5363005], "width_m": 2, "depth_m": 2},
        },
    )
    assert result.status_code == 200
    checks = result.json()["checks"]
    # Existing placement engine intentionally accepts single Polygon only. Preserve
    # the whole geometry and an unresolved result rather than inventing one shell.
    containment = next(c for c in checks if c["kind"] == "containment")
    assert containment["status"] == "invalid"
    assert containment["reason"] == "expected_nonempty_Polygon"
    assert containment["relation"] is None
    assert next(c for c in checks if c["kind"] == "parcel_boundary_distance")["distance_m"] is None
