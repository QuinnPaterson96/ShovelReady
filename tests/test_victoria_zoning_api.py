"""HTTP replay of ArcGIS-shaped responses with independently calculable 10 m squares."""

import json
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from app.main import create_app
from app.victoria_zoning import api

X, Y = 473000, 5363000


def polygon(x0, y0, x1, y1):
    return {"rings": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}


def response(features):
    return {
        "geometryType": "esriGeometryPolygon", "spatialReference": {"wkid": 3157},
        "features": features,
    }


def parcel(geometry=None):
    return response([{"attributes": {"OBJECTID": 87, "PID": "001-328-107"},
                      "geometry": geometry or polygon(X, Y, X + 10, Y + 10)}])


def zone(oid, bounds, bylaw="ZB2018"):
    return {"attributes": {"OBJECTID": oid, "ZoningBylaw": bylaw,
                           "Zoning": "GRD-1" if bylaw == "ZB2018" else "R1-B",
                           "Title": "source zone title", "URL": "https://www.victoria.ca/media/file/example"},
            "geometry": polygon(*bounds)}


class SavedResponse:
    def __init__(self, url, value):
        self.url = url
        self.raw = json.dumps(value).encode()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self, limit):
        return self.raw[:limit]


def client(monkeypatch, zones, parcel_value=None, fail_zoning=False):
    def saved(url, timeout):
        parsed = urlparse(url)
        if parsed.path.endswith("/12/query"):
            if fail_zoning:
                raise TimeoutError()
            params = parse_qs(parsed.query)
            assert params["geometryType"] == ["esriGeometryPolygon"]
            expected_rings = parcel()["features"][0]["geometry"]["rings"]
            assert json.loads(params["geometry"][0])["rings"] == expected_rings
            return SavedResponse(url, response(zones))
        assert parsed.path.endswith("/11/query")
        return SavedResponse(url, parcel_value or parcel())

    monkeypatch.setattr(api, "urlopen", saved)
    return TestClient(create_app())


def lookup(http, **changes):
    return http.post("/api/victoria-zoning/lookup", json={
        "schema_version": api.VERSION,
        "parcel_ref": {"source": "city-of-victoria-pid-parcels", "object_id": 87},
        "expected_pid": "001-328-107", **changes,
    })


def test_single_covered_mapping_and_evidence(monkeypatch):
    http = client(monkeypatch, [zone(4, (X, Y, X + 10, Y + 10))])
    result = lookup(http).json()
    assert result["status"] == "single_covered_mapping"
    assert result["covered_area_m2"] == 100
    assert result["uncovered_area_m2"] == 0
    assert result["zones"][0]["bylaw_name"] == "Zoning Bylaw 2018 (No. 18-072)"
    assert result["zones"][0]["intersection_area_m2"] == 100
    assert result["zones"][0]["source_fields"]["Zoning"] == "GRD-1"
    assert result["parcel_source_fields"]["OBJECTID"] == 87
    assert result["parcel_source_geometry"]["rings"] == parcel()["features"][0]["geometry"]["rings"]
    assert len(result["source_records"]) == 2
    assert result["source_records"][1]["review_status"] == "unreviewed_live_observation"


def test_split_and_boundary_touch(monkeypatch):
    http = client(monkeypatch, [
        zone(4, (X, Y, X + 5, Y + 10)),
        zone(5, (X + 5, Y, X + 10, Y + 10), "ZB1980"),
        zone(6, (X + 10, Y, X + 20, Y + 10)),
    ])
    result = lookup(http).json()
    assert result["status"] == "split_zones"
    assert [h["object_id"] for h in result["zones"]] == [4, 5]
    assert [h["intersection_area_m2"] for h in result["zones"]] == [50, 50]
    assert result["uncovered_area_m2"] == 0


def test_partial_and_no_match(monkeypatch):
    partial = lookup(client(monkeypatch, [zone(4, (X, Y, X + 9, Y + 10))])).json()
    assert partial["status"] == "partial_coverage"
    assert partial["covered_area_m2"] == 90
    assert partial["uncovered_area_m2"] == 10
    none = lookup(client(monkeypatch, [zone(6, (X + 10, Y, X + 20, Y + 10))])).json()
    assert none["status"] == "no_match"
    assert none["uncovered_area_m2"] == 100


def test_unmapped_bylaw_and_source_failure(monkeypatch):
    unknown = lookup(client(monkeypatch, [zone(4, (X, Y, X + 10, Y + 10), "NEW999")])).json()
    assert unknown["status"] == "unmapped_bylaw"
    assert unknown["zones"][0]["bylaw_name"] is None
    assert unknown["zones"][0]["source_fields"]["ZoningBylaw"] == "NEW999"
    unavailable = lookup(client(monkeypatch, [], fail_zoning=True)).json()
    assert unavailable["status"] == "unavailable"
    assert unavailable["zones"] == []
    assert len(unavailable["source_records"]) == 1


def test_invalid_input_and_unsupported_geometry(monkeypatch):
    http = client(monkeypatch, [])
    assert lookup(http, schema_version="wrong").status_code == 422
    assert lookup(http, parcel_ref={"source": "wrong", "object_id": 87}).status_code == 422
    bad = parcel(polygon(X, Y, X + 10, Y + 10))
    bad["features"][0]["geometry"] = {"rings": [[[X, Y], [X + 1, Y]]]}
    result = lookup(client(monkeypatch, [], parcel_value=bad)).json()
    assert result["status"] == "unsupported_geometry"
    assert result["covered_area_m2"] is None
