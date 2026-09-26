"""Offline SR-38 checks using the retained licensed packet and synthetic mutations."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.investigation import Investigation, SourceMetadata
from app.main import create_app
from app.site_preparations.service import candidates, lookup
from app.spatial.importer import prepare


@pytest.fixture(scope="module")
def retained():
    sources, spatial = prepare()
    metadata = tuple(
        SourceMetadata(
            source_id=s.source_id,
            snapshot_id=s.snapshot_id,
            source_url=s.source_url,
            sha256=s.artifact.sha256,
            captured_at=s.captured_at,
            printed_revision=s.printed_revision,
            original_crs=s.original_crs,
            original_units=s.original_units,
            attribution=s.reuse_constraints,
        )
        for s in sources
    )
    return Investigation(spatial=spatial, sources=metadata)


def test_real_retained_pid_and_unresolved_lookup(retained):
    result = lookup(retained, "pid", "028-279-638")
    assert result.status == "one_match"
    assert len(result.candidates) == 1
    parcel = result.candidates[0]
    assert parcel.pid.value == "028-279-638"
    assert parcel.approximate_area_m2.value == pytest.approx(563.7657953943635)
    assert parcel.approximate_area_m2.unit == "m2"
    assert parcel.approximate_area_m2.evidence.origin == "derived"
    assert parcel.pid.evidence.origin == "source"
    assert parcel.boundary_crs == "EPSG:3157"
    assert parcel.boundary and parcel.boundary["rings"]
    assert parcel.address.value is None
    assert parcel.constraints_status == "not_queried"
    assert parcel.zones[0].zone.value == "GRD-1"
    assert result.spatial_revision == retained.spatial.identity.revision_id
    assert lookup(retained, "pid", "000-000-001").status == "no_match"
    assert lookup(retained, "address", "123 Example St").status == "unavailable"


def test_ambiguous_pid_retains_all_candidates(retained):
    spatial = retained.spatial.model_copy(deep=True)
    observations = list(spatial.observations)
    second = observations[3]  # site-80 parcel response
    raw = second.response.copy()
    features = [f.copy() for f in raw["features"]]
    features[0] = {**features[0], "attributes": {**features[0]["attributes"], "PID": "028-279-638"}}
    observations[3] = second.model_copy(update={"response": {**raw, "features": features}})
    mutated = retained.model_copy(
        update={"spatial": spatial.model_copy(update={"observations": tuple(observations)})}
    )
    result = lookup(mutated, "pid", "028279638")
    assert result.status == "ambiguous"
    assert len(result.candidates) == 2
    assert result.candidates[0].candidate_id != result.candidates[1].candidate_id
    assert all(not c.selected for c in result.candidates)


def test_invalid_query_and_missing_source_field(retained):
    with pytest.raises(ValueError, match="nine digits"):
        lookup(retained, "pid", "59")
    spatial = retained.spatial.model_copy(deep=True)
    observation = spatial.observations[0]
    features = list(observation.response["features"])
    features[0]["attributes"].pop("PID")
    mutated = retained.model_copy(update={"spatial": spatial})
    result = candidates(mutated)[0]
    assert result.pid.value is None
    assert result.pid.unresolved_reason == "source field missing"


def test_router_configuration_and_methods(monkeypatch):
    monkeypatch.delenv("SHOVELREADY_DATABASE_URL", raising=False)
    client = TestClient(create_app())
    assert client.get("/api/site-preparations/lookup?kind=pid&q=028-279-638").status_code == 503
    assert client.post("/api/site-preparations/lookup", json={}).status_code == 405
    assert client.get("/api/site-preparations/lookup?kind=pid&q=").status_code == 422


def test_router_retained_response_and_failed_source(monkeypatch, retained):
    import app.site_preparations.api as api

    monkeypatch.setattr(api, "investigation", lambda: retained)
    client = TestClient(create_app())
    response = client.get("/api/site-preparations/lookup?kind=pid&q=028-279-638")
    assert response.status_code == 200
    payload = response.json()
    assert payload["schema_version"] == "sr-38.site-lookup.v1"
    assert payload["status"] == "one_match"
    assert payload["candidates"][0]["selected"] is False
    assert payload["candidates"][0]["boundary_crs"] == "EPSG:3157"
    assert client.get("/api/site-preparations/lookup?kind=address&q=Example").json()[
        "status"
    ] == "unavailable"

    def failed():
        raise HTTPException(502, "Stored investigation payload is invalid")

    monkeypatch.setattr(api, "investigation", failed)
    failed_response = client.get("/api/site-preparations/lookup?kind=pid&q=028-279-638")
    assert failed_response.status_code == 502
    assert "candidates" not in failed_response.json()


def test_consumer_schema_matches_producer():
    import json
    from pathlib import Path

    from app.site_preparations.service import Lookup
    path = Path(__file__).resolve().parents[1] / "frontend/src/site_preparations/schema.json"
    assert json.loads(path.read_text()) == Lookup.model_json_schema()
