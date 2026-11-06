"""Offline HTTP journey with independently drawn street, private drive and intervening lot."""

import json
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient
from shapely.geometry import box

from app.main import create_app
from app.municipal_sites import api
from app.municipal_sites.sources import SAANICH


def test_saanich_selection_and_street_prefill(monkeypatch):
    # Only the south street directly faces this 20 x 30 m lot. The north road
    # is closer but across a separate lot; the east-side drive is mapped private.
    parcel = box(0, 0, 20, 30)
    ring = [[0, 0], [20, 0], [20, 30], [0, 30], [0, 0]]
    spatial = {"spatialReference": {"wkid": 3157}}
    site = {
        "attributes": {"OBJECTID": 7, "PID": "001-234-567", "ADDRESS": "10 TEST ST"},
        "geometry": {"rings": [ring]},
    }
    other = {
        "attributes": {"OBJECTID": 8},
        "geometry": {"rings": [list(box(0, 30, 20, 34).exterior.coords)]},
    }
    unavailable = False

    class Reply:
        def __init__(self, url, data):
            self.url = url
            self.data = json.dumps(data).encode()

        def read(self, limit):
            return self.data[:limit]

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

    def fetch(url, timeout):
        uri = urlparse(url)
        assert uri.hostname == "services7.arcgis.com"
        args = parse_qs(uri.query)
        polygon = {**spatial, "geometryType": "esriGeometryPolygon"}
        if "/Parcel/" in uri.path:
            if "where" in args:
                assert args["where"] == ["ADDRESS='10 TEST ST'"]
            return Reply(
                url, {**polygon, "features": [site, other] if "geometry" in args else [site]}
            )
        if "/Building/" in uri.path:
            return Reply(url, {**polygon, "features": []})
        assert "/Streets/" in uri.path
        lines = [
            ("South St", "Residential", [[-5, -8], [25, -8]]),
            ("Back Road", "Major", [[-5, 36], [25, 36]]),
            ("Drive", "Private", [[24, -5], [24, 35]]),
        ]
        rows = [
            {
                "attributes": {"OBJECTID": n, "FULLSTREETNAME": name, "CLASS": kind},
                "geometry": {"paths": [coords]},
            }
            for n, (name, kind, coords) in enumerate(lines, 1)
        ]
        return Reply(
            url,
            {
                **spatial,
                "geometryType": "esriGeometryPolyline",
                "exceededTransferLimit": unavailable,
                "features": rows,
            },
        )

    monkeypatch.setattr(api, "urlopen", fetch)
    client = TestClient(create_app())
    base = "/api/municipal-sites/"
    search = client.post(
        base + "search",
        json={"schema_version": api.VERSION, "municipality": "saanich", "address": "10 Test St"},
    ).json()
    selected = search["candidates"][0]
    assert selected["parcel_ref"] == {"source": SAANICH, "object_id": 7}
    req = {
        "schema_version": api.VERSION,
        "parcel_ref": selected["parcel_ref"],
        "expected_pid": selected["pid"],
    }
    observation = client.post(base + "observe", json=req).json()
    assert observation["parcel"]["area_m2"] == parcel.area
    result = client.post(base + "street-edges", json=req).json()
    assert result["status"] == "partial"
    assert result["parcel_geometry"] == observation["parcel"]["planar_geometry"]
    assert result["suggestions"] == [
        {"segment": 0, "name": "South St", "road_class": "Residential", "feature_ids": [1]}
    ]
    assert result["evidence"][1]["provider"] == "District of Saanich Open Data"

    unavailable = True
    for payload in (req, {**req, "expected_pid": "999-999-999"}):
        failed = client.post(base + "street-edges", json=payload).json()
        assert failed["status"] == "unavailable" and failed["suggestions"] == []
    assert (
        client.post(
            "/api/victoria-zoning/lookup", json={**req, "schema_version": "victoria-zoning.v1"}
        ).status_code
        == 422
    )
