"""Offline SR-38 checks using retained licensed packets and synthetic mutations."""

import hashlib
import json
import shutil

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.investigation import Investigation, SourceMetadata
from app.main import create_app
from app.site_preparations.__main__ import import_capture
from app.site_preparations.address_packet import ROOT, read_packet, revision_id
from app.site_preparations.service import candidates, lookup
from app.spatial.importer import prepare


@pytest.fixture(autouse=True)
def selected_address_revision(monkeypatch):
    monkeypatch.setenv("SHOVELREADY_ADDRESS_REVISION", read_packet()[1])


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
    assert lookup(retained, "address", "123 Example St").status == "no_match"


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


def test_captured_address_join_and_alias(retained):
    for address, pid, legal_type in (
        ("1253 QUEENS AVE", "028-279-638", "LAND"),
        ("1255 QUEENS AVE", "028-279-638", "ALIAS"),
        ("1170 MAY ST", "008-140-723", "LAND"),
        ("1156 MAY ST", "001-327-470", "LAND"),
        ("B-1156 MAY ST", "001-327-470", "ALIAS"),
    ):
        result = lookup(retained, "address", "  " + address.lower() + "  ")
        assert result.status == "one_match"
        candidate = result.candidates[0]
        assert candidate.pid.value == pid
        assert candidate.address.value == address
        assert f"Legal_Type={legal_type}" in candidate.address.basis
        assert candidate.address.evidence.origin == "source"
        assert candidate.address.evidence.snapshot_id.startswith("address-")
        assert candidate.address.evidence.source_url.endswith("outSR=3157")
        assert candidate.selected is False
        assert result.screening_status == "not_performed"
    assert lookup(retained, "address", "1253 QUEENS AVE UNIT B").status == "no_match"


def test_address_requires_explicit_revision(retained, monkeypatch):
    monkeypatch.delenv("SHOVELREADY_ADDRESS_REVISION")
    result = lookup(retained, "address", "1253 QUEENS AVE")
    assert result.status == "unavailable"
    assert not result.candidates


def test_address_capture_revision_and_ambiguous_join(retained, monkeypatch):
    import app.site_preparations.service as service

    revision, address_revision, rows = read_packet()
    monkeypatch.setattr(
        service,
        "read_packet",
        lambda: ("spatial:sha256:" + "0" * 64, address_revision, rows),
    )
    assert lookup(retained, "address", "1253 QUEENS AVE").status == "unavailable"

    monkeypatch.setattr(
        service,
        "read_packet",
        lambda: (
            revision,
            address_revision,
            rows + (("address-80", 0, "03229026", "1253 QUEENS AVE", "LAND", rows[2][5]),),
        ),
    )
    result = lookup(retained, "address", "1253 QUEENS AVE")
    assert result.status == "ambiguous"
    assert {item.pid.value for item in result.candidates} == {"028-279-638", "008-140-723"}


def test_invalid_address_packet_and_failed_api(retained, monkeypatch, tmp_path):
    import app.site_preparations.api as api
    import app.site_preparations.service as service

    copy = tmp_path / "packet"
    shutil.copytree(ROOT, copy)
    manifest = json.loads((copy / "address-manifest.json").read_text())
    first = copy / manifest["sources"][2]["object"]
    first.write_text('{"error":"failed"}')
    with pytest.raises(ValueError, match="integrity mismatch"):
        read_packet(copy)
    monkeypatch.setattr(service, "read_packet", lambda: read_packet(copy))
    monkeypatch.setattr(api, "investigation", lambda: retained)
    response = TestClient(create_app()).get(
        "/api/site-preparations/lookup?kind=address&q=1253%20QUEENS%20AVE"
    )
    assert response.status_code == 502
    assert "candidates" not in response.json()


@pytest.mark.parametrize("damage", ["service_error", "missing_address", "wrong_crs"])
def test_validly_hashed_malformed_address_response_is_rejected(tmp_path, damage):
    copy = tmp_path / "packet"
    shutil.copytree(ROOT, copy)
    manifest_path = copy / "address-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    receipt = manifest["sources"][2]
    response = json.loads((copy / receipt["object"]).read_text())
    if damage == "service_error":
        response = {"error": {"code": 500, "message": "upstream failure"}}
    elif damage == "missing_address":
        response["features"][0]["attributes"]["FullAddress"] = None
    else:
        response["spatialReference"]["wkid"] = 4326
    raw = json.dumps(response).encode()
    sha = hashlib.sha256(raw).hexdigest()
    (copy / (sha + ".json")).write_bytes(raw)
    receipt["sha256"] = sha
    receipt["object"] = sha + ".json"
    receipt["byte_count"] = len(raw)
    manifest["revision_id"] = revision_id(manifest)
    manifest_path.write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="invalid address"):
        read_packet(copy)


def test_explicit_capture_import_is_atomic(tmp_path):
    copy = tmp_path / "packet"
    shutil.copytree(ROOT, copy)
    capture = tmp_path / "capture"
    (capture / "objects").mkdir(parents=True)
    manifest = json.loads((copy / "address-manifest.json").read_text())
    receipts = []
    for source in manifest["sources"]:
        shutil.copyfile(copy / source["object"], capture / "objects" / source["object"])
        receipts.append({**source, "object": "objects/" + source["object"]})
    (capture / "receipts.jsonl").write_text(
        "\n".join(json.dumps(receipt) for receipt in receipts) + "\n"
    )
    target = tmp_path / "target"
    import_capture(capture, target)
    assert read_packet(target)[0] == manifest["spatial_revision"]
    original = (target / "address-manifest.json").read_bytes()
    (capture / "objects" / receipts[2]["object"].split("/")[1]).write_text("{}")
    with pytest.raises(ValueError, match="integrity mismatch"):
        import_capture(capture, target)
    assert (target / "address-manifest.json").read_bytes() == original


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
    address_response = client.get(
        "/api/site-preparations/lookup?kind=address&q=1255%20QUEENS%20AVE"
    )
    assert address_response.status_code == 200
    address_payload = address_response.json()
    assert address_payload["status"] == "one_match"
    assert address_payload["candidates"][0]["pid"]["value"] == "028-279-638"
    assert "Legal_Type=ALIAS" in address_payload["candidates"][0]["address"]["basis"]
    assert client.get("/api/site-preparations/lookup?kind=address&q=Example").json()[
        "status"
    ] == "no_match"

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
