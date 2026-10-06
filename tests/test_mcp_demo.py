"""Actual MCP client over TCP, fixture-backed upstreams and website HTTP parity.

Independent expected geometry: the nominal 3.048 x 9.144 m rectangle is centred in a
30 x 40 m lot. Ordinary distances exceed the candidate 0.6/3.5 m thresholds. Moving
its centre to (1.624, 4.672) leaves two boundaries 0.1 m away; exempting one front
cannot remove both conflicts. These inputs are synthetic, not legally reviewed sites.
Only external network boundaries are replaced; no database or live model calls.
"""

import asyncio
import io
import json
import socket
import threading
import time
from copy import deepcopy
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import httpx
import jsonschema
import pytest
import uvicorn
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from app.address_search import provider
from app.main import create_app
from app.municipal_sites import api as municipal

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def endpoint(monkeypatch):
    monkeypatch.setenv("SHOVELREADY_ENV", "test")
    monkeypatch.setenv("SHOVELREADY_MCP_ENABLED", "true")
    monkeypatch.delenv("SHOVELREADY_MCP_APP_URL", raising=False)

    class SavedResponse:
        status = 200
        headers = {"Content-Type": "application/json"}

        def __init__(self, raw, url=None):
            self.raw = io.BytesIO(raw)
            self.url = url

        def __enter__(self):
            return self

        def __exit__(self, *_):
            self.raw.close()

        def read(self, size):
            return self.raw.read(size)

    calls = []

    def geocoder(_request, timeout):
        calls.append("geocoder")
        raw = (ROOT / "tests/fixtures/address_search/victoria-provider.json").read_bytes()
        return SavedResponse(raw)

    def city(url, timeout):
        calls.append("city")
        parsed = urlsplit(url)
        params = parse_qs(parsed.query)
        layer = parsed.path.split("/")[-2]
        name = (
            "address_87"
            if layer == "0"
            else "buildings_87"
            if layer == "1"
            else "parcel_search_87"
            if params.get("returnGeometry") == ["false"]
            else "parcel_observe_87"
        )
        raw = (ROOT / f"tests/fixtures/municipal_sites/{name}.json").read_bytes()
        return SavedResponse(raw, url)

    # Geocoder captures the opener in its constructor; municipal imports urlopen directly.
    monkeypatch.setattr(provider.urllib.request, "urlopen", geocoder)
    monkeypatch.setattr(municipal, "urlopen", city)
    app = create_app()
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
        server = uvicorn.Server(uvicorn.Config(app, log_level="critical", access_log=False))
        thread = threading.Thread(target=server.run, kwargs={"sockets": [sock]}, daemon=True)
        thread.start()
        deadline = time.monotonic() + 10
        while not server.started and thread.is_alive() and time.monotonic() < deadline:
            time.sleep(0.01)
        assert server.started, "Isolated MCP test server failed to start"
        try:
            yield f"http://127.0.0.1:{port}", app, calls
        finally:
            server.should_exit = True
            thread.join(timeout=10)
            assert not thread.is_alive(), "Isolated MCP test server did not stop"


def ordinary():
    return json.loads((ROOT / "docs/mcp-demo/synthetic-screen.json").read_text())


def assert_supplied_values_preserved(actual, supplied):
    """Default expansion may add fields; every supplied value must survive exactly."""
    if isinstance(supplied, dict):
        for key, value in supplied.items():
            assert_supplied_values_preserved(actual[key], value)
    elif isinstance(supplied, list):
        assert len(actual) == len(supplied)
        for value, expected in zip(actual, supplied, strict=True):
            assert_supplied_values_preserved(value, expected)
    else:
        assert actual == supplied


async def connected(url, work):
    async with streamable_http_client(url + "/mcp") as (read, write, _):
        async with ClientSession(read, write) as client:
            await client.initialize()
            return await work(client)


async def call(client, name, body):
    result = await client.call_tool(name, body)
    assert not result.isError, result.content
    tools = await client.list_tools()
    schema = next(tool.outputSchema for tool in tools.tools if tool.name == name)
    jsonschema.validate(result.structuredContent, schema)
    return result.structuredContent


@pytest.mark.parametrize(
    "scenario",
    [
        "ordinary",
        "conflict",
        "missing_fact",
        "default_evidence",
        "confirmed_evidence",
    ],
)
def test_screening_scenarios_and_exact_three_api_parity(endpoint, scenario):
    url, _, calls = endpoint
    body = ordinary()
    if scenario == "conflict":
        body["scenario"]["geometry"]["placement"]["centre_xy"] = [1.624, 4.672]
    if scenario == "missing_fact":
        body["scenario"]["assumptions"]["existing_garden_suites"]["value"] = None
    if scenario in ("default_evidence", "confirmed_evidence"):
        fact = body["scenario"]["assumptions"]["existing_garden_suites"]
        fact["origin"] = "journey_default" if scenario == "default_evidence" else "user"
        fact["evidence_state"] = "assumed" if scenario == "default_evidence" else "user_confirmed"
        proposal = body["scenario"]["proposal"]
        body["scenario"]["proposal_evidence"] = {
            name: {
                "value": proposal.get(name),
                "origin": (
                    "unknown"
                    if proposal.get(name) is None
                    else "journey_default"
                    if scenario == "default_evidence"
                    and name in ("proposed_use", "foundation_attached")
                    else "user_confirmed"
                ),
            }
            for name in (
                "proposed_use",
                "foundation_attached",
                "confirmed_zone",
                "confirmed_instrument",
                "legal_lot_confirmed",
                "floor_area_definition_acknowledged",
                "no_relevant_projections",
            )
        }

    async def work(client):
        result = await call(client, "screen_selected_inputs", body)
        details = result["technical_details"]
        request = body["scenario"]
        with httpx.Client(base_url=url) as http:
            assert (
                details["geometry"]
                == http.post("/api/scouting-geometry/assess", json=request["geometry"]).json()
            )
            assert (
                details["scenarios"]
                == http.post(
                    "/api/conditional-screening/v1/placement-scenarios", json=request
                ).json()
            )
            scalar = {key: request[key] for key in ("assumptions", "model_revision", "proposal")}
            scalar["schema_version"] = "conditional-screening.api.v1"
            if "proposal_evidence" in request:
                scalar["proposal_evidence"] = request["proposal_evidence"]
            assert (
                details["conditional"]
                == http.post("/api/conditional-screening/v1/evaluate", json=scalar).json()
            )
        assert_supplied_values_preserved(details["screen_input"], body)
        assert result["evidence"] and result["next_actions"]
        assert result["handoff"]["mode"] == "manual_reentry"
        assert "synthetic" not in result["handoff"]["url"]
        if scenario == "conflict":
            assert result["status"] == "placement_conflict"
            assert details["scenarios"]["status"] == "apparent_conflict"
        else:
            assert result["status"] == "partial"
            assert details["scenarios"]["status"] == "bounded_pass"
        if scenario == "missing_fact":
            total = next(
                f
                for f in details["conditional"]["request"]["facts"]
                if f["id"] == "proposed_suite_total"
            )
            assert total["status"] == "unknown" and total["quantity"] is None
            assert any(
                "Existing garden suites: unknown" in s for s in result["material_assumptions"]
            )
            assert any("How many garden suites" in action for action in result["next_actions"])
        if scenario in ("default_evidence", "confirmed_evidence"):
            expected_origin = (
                "journey_default" if scenario == "default_evidence" else ("user_confirmed")
            )
            count = next(
                f
                for f in details["conditional"]["request"]["facts"]
                if f["id"] == "proposed_suite_total"
            )
            assert count["origin"] == expected_origin
            label = "journey default" if scenario == "default_evidence" else "user-confirmed"
            assert any(label in s for s in result["material_assumptions"])

    asyncio.run(connected(url, work))
    assert calls == []


def test_ambiguous_address_requires_selection_and_retains_lookup_evidence(endpoint):
    url, _, calls = endpoint

    async def work(client):
        lookup = {
            "municipality": "Victoria",
            "address_search": {
                "schemaVersion": "sr-address-search.v1",
                "query": "525 Superior St, Victoria, BC",
            },
        }
        result = await call(client, "property_candidates", lookup)
        assert result["status"] == "choose_candidate"
        found = result["technical_details"]["address_search"]
        assert len(found["candidates"]) > 1 and found["source"]["rawResponseText"]
        assert calls == ["geocoder"]  # no rank-based parcel lookup
        parcel = {
            "municipality": "Victoria",
            "parcel_search": {
                "schema_version": "municipal-sites.v1",
                "pid": "001-328-107",
            },
        }
        rejected = await client.call_tool("property_candidates", parcel)
        assert rejected.isError and calls == ["geocoder"]
        parcel["selection_confirmed"] = True
        result = await call(client, "property_candidates", parcel)
        found = result["technical_details"]["parcel_search"]
        with httpx.Client(base_url=url) as http:
            expected = http.post("/api/municipal-sites/search", json=parcel["parcel_search"]).json()
        assert found["candidates"] == expected["candidates"]
        assert found["evidence"][0]["raw_response"] == expected["evidence"][0]["raw_response"]
        observed = await call(
            client,
            "property_candidates",
            {
                "municipality": "Victoria",
                "selection_confirmed": True,
                "observe": {
                    "schema_version": "municipal-sites.v1",
                    "parcel_ref": found["candidates"][0]["parcel_ref"],
                    "expected_pid": "001-328-107",
                },
            },
        )
        assert observed["technical_details"]["observation"]["status"] == "available"
        assert "main-building identity is not inferred" in observed["summary"]

    asyncio.run(connected(url, work))


def test_unsupported_coverage_and_no_placement_never_run_fit_or_network(endpoint):
    url, _, calls = endpoint

    async def work(client):
        for changes in ({"municipality": "Saanich"}, {"pathway": "commercial"}):
            body = ordinary() | changes
            result = await call(client, "screen_selected_inputs", body)
            assert result["status"] == "unsupported"
            assert result["technical_details"]["geometry"] is None
        result = await call(client, "supported_models", {"model_id": "aux-240"})
        assert result["status"] == "unsupported"
        body = ordinary()
        body["scenario"] = None
        result = await call(client, "screen_selected_inputs", body)
        assert result["status"] == "needs_input"
        assert result["technical_details"]["geometry"] is None
        assert "No placement" in result["summary"]
        body["property_selection_confirmed"] = False
        result = await call(client, "screen_selected_inputs", body)
        assert "Confirm" in result["summary"]

    asyncio.run(connected(url, work))
    assert calls == []


def test_metadata_errors_identity_and_exposure_controls(endpoint, monkeypatch):
    url, app, calls = endpoint

    async def work(client):
        tools = (await client.list_tools()).tools
        assert len(tools) == 3
        assert all(t.annotations.readOnlyHint and not t.annotations.destructiveHint for t in tools)
        for mutation in (
            {"secret_private_input": "sensitive-marker"},
            {"scenario": {"wrong": "sensitive-marker"}},
            {"selected_property": {"parcel_id": "sensitive-marker"}},
        ):
            result = await client.call_tool("screen_selected_inputs", ordinary() | mutation)
            assert result.isError and "sensitive-marker" not in str(result.content)
        body = ordinary()
        body["scenario"]["geometry"]["placement"]["width_m"] = 2
        result = await client.call_tool("screen_selected_inputs", body)
        assert result.isError and "Dimensions differ" in str(result.content)
        body = ordinary()
        body["selected_model"]["catalogue_snapshot_id"] = "stale"
        assert (await client.call_tool("screen_selected_inputs", body)).isError
        body = ordinary()
        body["scenario"]["model_revision"] = "wrong-model-inputs"
        assert (await client.call_tool("screen_selected_inputs", body)).isError
        body = deepcopy(ordinary())
        body["selected_property"]["parcel_id"] = "other"
        assert (await client.call_tool("screen_selected_inputs", body)).isError

    asyncio.run(connected(url, work))

    async def non_loopback():
        transport = httpx.ASGITransport(app=app, client=("192.0.2.1", 1234))
        async with httpx.AsyncClient(transport=transport, base_url=url) as http:
            assert (await http.post("/mcp", json={})).status_code == 403

    asyncio.run(non_loopback())
    with httpx.Client(base_url=url) as http:
        for malformed in (
            {"sensitive-marker": "sensitive-marker"},
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {"name": "supported_models", "arguments": "sensitive-marker"},
            },
        ):
            rejected = http.post(
                "/mcp", json=malformed, headers={"Accept": "application/json, text/event-stream"}
            )
            assert rejected.status_code == 400 and "sensitive-marker" not in rejected.text
        assert http.post("/mcp", headers={"Host": "evil.example"}, json={}).status_code == 421
        assert (
            http.post("/mcp", headers={"Origin": "https://evil.example"}, json={}).status_code
            == 403
        )
        assert http.post("/mcp", content=b" " * 131_073).status_code == 413
        route = next(r for r in app.routes if r.path == "/mcp")
        route.app.requests.extend([time.monotonic()] * 30)
        assert http.post("/mcp", json={}).status_code == 429
    assert calls == []
    monkeypatch.delenv("SHOVELREADY_MCP_ENABLED")
    assert all(getattr(r, "path", None) != "/mcp" for r in create_app().routes)
