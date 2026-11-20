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


def test_property_scan_replays_all_sources_and_preserves_partial_failures(monkeypatch):
    # Transport replay protects the full HTTP -> fixed City queries -> sourced findings path.
    # Empty is probably clear only after a successful bounded query, never after failure.
    captured = {}
    failures = set()
    heritage = []
    history = []
    gislink = "02130017"

    def saved(url, timeout):
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        if "OpenData_Land" in parsed.path:
            value = parcel()
            value["features"][0]["attributes"]["GISLINK"] = gislink
            return SavedResponse(url, value)
        layer = int(parsed.path.split("/")[-2])
        captured[layer] = params
        if layer in failures:
            return SavedResponse(url, {"features": [], "exceededTransferLimit": True})
        return SavedResponse(url, {"features": {10: heritage, 18: history}.get(layer, [])})

    monkeypatch.setattr(api, "urlopen", saved)
    http = TestClient(create_app())
    body = {"schema_version": "victoria-property-scan.v1",
            "parcel_ref": {"source": "city-of-victoria-pid-parcels", "object_id": 87},
            "expected_pid": "001-328-107"}
    result = http.post("/api/victoria-zoning/property-scan", json=body).json()
    assert len(result["findings"]) == 6
    assert all(row["status"] == "probably_clear" for row in result["findings"])
    assert set(captured) == {1, 3, 10, 11, 14, 18}
    assert captured[18]["where"] == ["gislink='02130017'"]
    assert captured[10]["returnGeometry"] == ["false"]
    assert captured[10]["spatialRel"] == ["esriSpatialRelIntersects"]
    assert all(row["source"]["sha256"] for row in result["findings"])
    assert result["permit_records"]["status"] == "no_match"
    assert "service capacity" in " ".join(result["limitations"])
    heritage.append({"attributes": {"OBJECTID": 12, "Heritage": "Registered"}})
    history.extend(
        {"attributes": {"OBJECTID": oid, "FOLDER_NUMBER": case, "STATUS": status, "AppType": kind}}
        for oid, case, status, kind in (
            (6, "DDP01187", "ACTIVE", "Delegated Development Permit"),
            (83, "DDP01126", "COMPLETED", "Delegated Development Permit"),
            (537, "DDP00887", "COMPLETED", "Delegated Development Permit"),
            (1138, "REZ00789", "COMPLETED", "Rezoning"),
        )
    )
    failures.add(14)
    result = http.post("/api/victoria-zoning/property-scan", json=body).json()
    assert result["findings"][0]["status"] == "review"
    assert result["findings"][0]["records"][0]["Heritage"] == "Registered"
    assert result["findings"][1]["status"] == "unknown"
    assert result["findings"][1]["source"] is None
    review = result["permit_records"]
    assert review["status"] == "records_found"
    assert review["source"]["captured_at_utc"]
    cases = {record["case_number"]: record for record in review["records"]}
    assert set(cases) == {"DDP01126", "DDP01187", "DDP00887"}
    assert cases["DDP01126"]["case_url"].endswith("folderNumber=DDP01126")
    assert cases["DDP01126"]["issued_on"] == "2026-04-02"
    assert cases["DDP01126"]["issuance_task"] == "dated_completion"
    assert len(set(cases["DDP01126"]["approved_plan_links"])) == 3
    assert cases["DDP01126"]["evidence_checked_on"] == "2026-11-19"
    assert cases["DDP01187"]["issued_on"] is None
    assert cases["DDP01187"]["issuance_task"] == "no_completion_date"
    assert cases["DDP00887"]["issued_on"] is None  # History status alone proves no issue date.
    assert all(row["applicable_condition_reviewed"] is False for row in cases.values())

    gislink = "different-parcel"
    result = http.post("/api/victoria-zoning/property-scan", json=body).json()
    assert all(row["evidence_checked_on"] is None for row in result["permit_records"]["records"])

    history[:] = [history[-1]]
    result = http.post("/api/victoria-zoning/property-scan", json=body).json()
    assert result["permit_records"]["status"] == "no_match"
    history.append({"attributes": {"OBJECTID": 24, "AppType": "Development Permit"}})
    result = http.post("/api/victoria-zoning/property-scan", json=body).json()
    assert result["permit_records"]["status"] == "unavailable"

    failures.add(18)
    result = http.post("/api/victoria-zoning/property-scan", json=body).json()
    assert result["permit_records"]["status"] == "truncated"
    assert result["permit_records"]["records"] == []

    gislink = None
    captured.pop(18)
    result = http.post("/api/victoria-zoning/property-scan", json=body).json()
    assert result["permit_records"]["status"] == "unavailable"
    assert 18 not in captured

    body["expected_pid"] = "changed"
    result = http.post("/api/victoria-zoning/property-scan", json=body).json()
    assert all(row["status"] == "unknown" for row in result["findings"])
