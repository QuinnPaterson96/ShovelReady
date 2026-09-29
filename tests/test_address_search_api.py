"""HTTP through the actual adapter using captured public provider bytes.

Only the network edge is replaced.
"""

import copy
import hashlib
import io
import json
import urllib.error
import urllib.parse
from pathlib import Path

from fastapi.testclient import TestClient

from app.address_search.api import get_client
from app.address_search.provider import GeocoderClient
from app.main import create_app

FIXTURES = Path(__file__).parent / "fixtures" / "address_search"


class Response:
    status = 200
    headers = {"Content-Type": "application/json"}

    def __init__(self, data: bytes):
        self.stream = io.BytesIO(data)

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.stream.close()

    def read(self, size: int) -> bytes:
        return self.stream.read(size)


def app_with(opener):
    app = create_app()
    app.dependency_overrides[get_client] = lambda: GeocoderClient(opener)
    return TestClient(app)


def search(client, query="525 Superior St, Victoria, BC"):
    return client.post(
        "/api/address-search",
        json={"schemaVersion": "sr-address-search.v1", "query": query, "maxResults": 5},
    )


def provider(name="victoria"):
    return (FIXTURES / f"{name}-provider.json").read_bytes()


def test_captured_victoria_candidates_are_ordered_and_replayable():
    raw = provider()
    with app_with(lambda _request, timeout: Response(raw)) as client:
        response = search(client)
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "candidates"
        assert body["mayBeTruncated"] is True
        assert body["candidates"][0]["fullAddress"] == "525 Superior St, Victoria, BC"
        assert body["candidates"][0]["point"]["crs"] == "EPSG:4326"
        assert body["candidates"][0]["address"]["streetName"] == "Superior"
        assert body["candidates"][0]["providerSiteId"]
        assert body["candidates"][1]["matchPrecision"] == "STREET"
        assert body["source"]["rawResponse"] == json.loads(raw)
        assert body["source"]["responseSha256"] == hashlib.sha256(raw).hexdigest()
        assert body["source"]["reviewStatus"] == "unreviewed"
        assert body["source"]["fetchedAt"] != body["source"]["providerBaseDataDate"]
        assert "selected" not in body
        assert client.get("/api/site-preparations/lookup").status_code != 404


def test_saanich_query_keeps_saanich_and_victoria_alternatives():
    def source(request, timeout):
        parsed = urllib.parse.urlsplit(request.full_url)
        assert parsed.scheme == "https" and parsed.netloc == "geocoder.api.gov.bc.ca"
        assert parsed.path == "/addresses.json"
        assert urllib.parse.parse_qs(parsed.query) == {
            "addressString": ["200 Gorge Rd W, Saanich, BC"],
            "maxResults": ["5"],
            "outputSRS": ["4326"],
            "echo": ["true"],
            "autoComplete": ["false"],
        }
        assert timeout == 4
        return Response(provider("saanich"))

    with app_with(source) as client:
        body = search(client, "200 Gorge Rd W, Saanich, BC").json()
    assert body["status"] == "candidates"
    assert body["candidates"][0]["locality"] == "Saanich"
    assert body["candidates"][1]["locality"] == "Victoria"
    assert body["candidates"][1]["faults"]


def test_empty_and_fallback_are_distinct():
    raw = json.loads(provider())
    raw[
        "features"
    ] = []  # Simulated empty response; live nonsense query returns locality fallbacks.
    with app_with(lambda _request, timeout: Response(json.dumps(raw).encode())) as client:
        assert search(client).json()["status"] == "no_match"
    with app_with(lambda _request, timeout: Response(provider("missing"))) as client:
        body = search(client, "999999 Imaginary Crescent, Victoria, BC").json()
    assert body["status"] == "candidates"
    assert body["candidates"][0]["matchPrecision"] == "LOCALITY"


def test_malformed_json_wrong_crs_and_oversized_response():
    wrong_crs = json.loads(provider())
    wrong_crs["crs"]["properties"]["code"] = 3005
    for raw in (b"{oops", json.dumps(wrong_crs).encode(), b"x" * 100_001):
        with app_with(lambda _request, timeout, raw=raw: Response(raw)) as client:
            body = search(client).json()
        assert body["status"] == "malformed"
        assert body["candidates"] == []


def test_provider_errors_and_bounded_timeout_retry():
    for code, expected in ((401, "unavailable"), (429, "rate_limited"), (503, "unavailable")):
        calls = []

        def failing(request, timeout, calls=calls, code=code):
            calls.append(timeout)
            raise urllib.error.HTTPError(request.full_url, code, "failure", {}, None)

        with app_with(failing) as client:
            assert search(client).json()["status"] == expected
        assert len(calls) == (2 if code == 503 else 1)
        assert all(timeout == 4 for timeout in calls)

    calls = []

    def timeout(_request, timeout):
        calls.append(timeout)
        raise TimeoutError()

    with app_with(timeout) as client:
        assert search(client).json()["status"] == "unavailable"
    assert calls == [4, 4]


def test_request_validation_and_bad_candidate_coordinates():
    with app_with(lambda _request, timeout: Response(provider())) as client:
        for payload in (
            {"query": "x"},
            {"query": "x" * 161},
            {"query": "123 Main", "maxResults": 6},
            {"schemaVersion": "wrong", "query": "123 Main"},
        ):
            assert client.post("/api/address-search", json=payload).status_code == 422

    invalid = copy.deepcopy(json.loads(provider()))
    invalid["features"][0]["geometry"]["coordinates"][0] = float("inf")
    with app_with(lambda _request, timeout: Response(json.dumps(invalid).encode())) as client:
        assert search(client).json()["status"] == "malformed"


def test_app_construction_does_not_fetch():
    def unexpected_fetch(_request, timeout):
        raise AssertionError("unexpected network fetch")

    with app_with(unexpected_fetch) as client:
        assert client.get("/health").json() == {"status": "ok"}
