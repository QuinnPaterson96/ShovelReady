"""HTTP workflow over independently drawn, metre-based municipal source responses."""

import json
from io import BytesIO
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.municipal_sites import api
from app.municipal_sites.sources import LAYERS, SAANICH, VICTORIA


@pytest.mark.parametrize("source", [VICTORIA, SAANICH])
def test_editable_shore_sources_and_contact(monkeypatch, source):
    # A 20 x 30 parcel, split along its south side. Its street-side counterpart
    # places the water 8 m away. A 2 m strip tests a barrier *within* tolerance.
    ring = [[0, 0], [10, 0], [20, 0], [20, 30], [0, 30], [0, 0]]
    site = {"attributes": {"OBJECTID": 7, "PID": "001-234-567"}, "geometry": {"rings": [ring]}}
    water_y, kind, coast, outage, strip = -1, "Water", True, False, False

    def fetch(url, timeout):
        args = parse_qs(urlsplit(url).query)
        layer = next(k for k, v in LAYERS.items() if url.startswith(v.url + "/query?"))
        rows = []
        if layer in ("parcel", "Saanich parcels"):
            rows = [site]
            if strip and "objectIds" not in args:
                rows.append(
                    {
                        "attributes": {"OBJECTID": 8},
                        "geometry": {"rings": [[[0, 0], [20, 0], [20, -2], [0, -2], [0, 0]]]},
                    }
                )
        elif layer == "BC marine coastline":
            if coast:
                rows = [
                    {
                        "attributes": {"OBJECTID": 11},
                        "geometry": {"paths": [[[-15, water_y], [35, water_y]]]},
                    }
                ]
        elif layer in ("Victoria water bodies", "Saanich water bodies"):
            if source == VICTORIA or kind == "Test Lake":
                rows = [
                    {
                        "attributes": {"OBJECTID": 12, "Name": kind, "NAME": kind},
                        "geometry": {
                            "rings": [
                                [
                                    [-15, water_y],
                                    [35, water_y],
                                    [35, -40],
                                    [-15, -40],
                                    [-15, water_y],
                                ]
                            ]
                        },
                    }
                ]
        else:
            raise AssertionError(layer)
        data = {"features": rows}
        if rows:
            data.update(spatialReference={"wkid": 3157}, geometryType=LAYERS[layer].geometry)
        if outage and layer == "BC marine coastline":
            data["exceededTransferLimit"] = True
        reply = BytesIO(json.dumps(data).encode())
        reply.url = url
        return reply

    monkeypatch.setattr(api, "urlopen", fetch)
    client = TestClient(create_app())
    req = {
        "schema_version": api.VERSION,
        "parcel_ref": {"source": source, "object_id": 7},
        "expected_pid": "001-234-567",
    }

    def lookup(**changes):
        resp = client.post("/api/municipal-sites/waterfront-edges", json={**req, **changes})
        assert resp.status_code == 200
        return resp.json()

    result = lookup()
    assert result["parcel_geometry"] == {"type": "Polygon", "coordinates": [ring]}
    assert [(s["segment"], s["label"]) for s in result["suggestions"]] == [
        (0, "Marine shoreline"),
        (1, "Marine shoreline"),
    ]
    s = result["suggestions"][0]
    evidence = result["evidence"][s["evidence_index"]]
    assert evidence["review_status"] == "unreviewed_live_observation"
    assert evidence["raw_response"]["features"][0]["attributes"]["OBJECTID"] == s["feature_id"]
    assert lookup(expected_pid="999-999-999")["status"] == "unavailable"
    strip = True
    blocked = lookup()
    assert not blocked["suggestions"] and blocked["status"] == "no_match"
    water_y, strip = -8, False
    assert lookup()["status"] == "no_match"
    kind, water_y, coast = "Test Lake", -1, False
    lake = lookup()
    if source == VICTORIA:
        assert lake["status"] == "no_match"  # No marine corroboration.
        coast = True
        assert lookup()["status"] == "no_match"  # A named pond near the coast isn't tidal.
    else:
        assert [s["label"] for s in lake["suggestions"]] == ["Test Lake", "Test Lake"]
        outage = True
        partial = lookup()
        assert partial["status"] == "partial" and len(partial["suggestions"]) == 2
    kind, outage = "Water", True
    failed = lookup()
    assert failed["status"] == "unavailable" and not failed["suggestions"]
