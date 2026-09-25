import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.reference_cases import INVENTORY_PATH, CaseInventory, load_inventory, safe_url


def write(tmp_path, mutate):
    data = json.loads(INVENTORY_PATH.read_bytes())
    mutate(data)
    path = tmp_path / "cases.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def test_inventory_and_safe_projection():
    data = load_inventory()
    assert len(data.cases) == 10
    assert sum(c.scope == "transfer_only" for c in data.cases) == 3
    assert data.first_case_id == "VIC-PC-001"
    stannard = data.cases[0]
    assert stannard.measurements[0].original_value == "28.50"
    assert "2.40 m" in stannard.measurements[0].measurement_definition
    assert "DDP01047" in stannard.official_identifiers
    assert all(c.review_status == "provisional" and not c.benchmark_eligible for c in data.cases)
    assert data.cases[-2].measurements[0].original_unit == "feet"
    assert data.cases[3].decision.date is None
    serialized = data.model_dump_json()
    assert "local_artifact" not in serialized
    assert "dataset_release" not in serialized
    assert "local HTTP returned 403" in serialized
    assert "curtains removed" in data.cases[-1].decision.conditions[0].summary


def test_nulls_and_empty_measurements(tmp_path):
    def mutate(d):
        d["cases"][0]["measurements"][0]["original_value"] = None
        d["cases"][0]["measurements"][0]["original_unit"] = None
        d["cases"][1]["measurements"] = []

    data = load_inventory(write(tmp_path, mutate))
    assert data.cases[0].measurements[0].original_value is None
    assert data.cases[0].measurements[0].original_unit is None
    assert data.cases[1].measurements == []
    assert data.cases[0].decision.issued_building_permit is None


@pytest.mark.parametrize(
    "mutate",
    [
        lambda d: d["cases"].append(d["cases"][0]),
        lambda d: d["cases"].__setitem__(1, d["cases"][0]),
        lambda d: d["sources"].__setitem__("duplicate", next(iter(d["sources"].values()))),
        lambda d: d["sources"].pop("REZ00787-9"),
        lambda d: d["rights"].pop("victoria"),
        lambda d: d["cases"][0]["source_facts"][0]["evidence"].append(
            d["cases"][0]["source_facts"][0]["evidence"][0]
        ),
        lambda d: d["cases"][0].__setitem__("review_status", "accepted"),
        lambda d: d["cases"][0]["measurements"][0].pop("original_value"),
        lambda d: d["cases"][0]["measurements"][0].__setitem__("original_value", 28.5),
        lambda d: d["cases"][0]["decision"].__setitem__("issued_building_permit", True),
        lambda d: d["cases"][0].__setitem__("scope", "transfer_only"),
        lambda d: d["cases"][0].__setitem__("application_date", "2024-02-30"),
        lambda d: d["cases"][0].__setitem__("arbitrary_file", "/etc/passwd"),
        lambda d: d.__setitem__("cases", [None]),
        lambda d: d.__setitem__("sources", None),
        lambda d: d.__setitem__("schema_version", "future"),
        lambda d: d["counts"].__setitem__("accepted", 1),
    ],
)
def test_rejects_malformed_inventory(tmp_path, mutate):
    with pytest.raises(ValueError):
        load_inventory(write(tmp_path, mutate))


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "file:///etc/passwd",
        "http://vancouver.ca/a",
        "https://vancouver.ca.evil.test/a",
        "https://user:pass@vancouver.ca/a",
        "https://vancouver.ca:8443/a",
        "https://vancouver.ca/\\evil",
        "https://vancouver.ca/\nsecret",
        "https://example.com/a",
    ],
)
def test_unsafe_links(tmp_path, url):
    with pytest.raises(ValueError):
        safe_url(url)
    path = write(tmp_path, lambda d: d["sources"]["REZ00787-9"].__setitem__("url", url))
    with pytest.raises(ValueError):
        load_inventory(path)


def test_duplicate_json_and_missing_inventory(tmp_path):
    path = tmp_path / "missing.json"
    with pytest.raises(OSError):
        load_inventory(path)
    path.write_text('{"schema_version":"a","schema_version":"b"}')
    with pytest.raises(ValueError, match="Duplicate"):
        load_inventory(path)


def test_read_only_api_without_database_and_errors(monkeypatch):
    monkeypatch.delenv("SHOVELREADY_DATABASE_URL", raising=False)
    client = TestClient(create_app())
    response = client.get("/api/reference-cases")
    assert response.status_code == 200
    assert response.json()["identity"]["kind"] == "provisional_public_case_inventory"
    assert client.post("/api/reference-cases", json={}).status_code == 405
    assert client.get("/api/reference-cases/arbitrary-file").status_code == 404
    assert client.get("/api/reference-cases?path=/etc/passwd").json() == response.json()

    def unavailable():
        raise ValueError("private-path-or-source-content")

    monkeypatch.setattr("app.reference_cases.load_inventory", unavailable)
    failure = client.get("/api/reference-cases")
    assert failure.status_code == 503
    assert failure.json() == {"detail": "Public-case inventory unavailable or invalid"}
    assert client.get("/health").status_code == 200


def test_browser_schema_matches_boundary():
    schema = Path("frontend/src/reference_cases/schema.json")
    assert json.loads(schema.read_text()) == CaseInventory.model_json_schema()


def test_untrusted_text_is_data_and_paths_are_omitted(tmp_path):
    text = "<img src=x onerror=alert(1)>"

    def mutate(d):
        d["cases"][0]["development"]["summary"] = text
        d["cases"][0]["local_artifacts"] = ["C:/private/secret.pdf"]
        d["sources"]["REZ00787-9"]["local_artifact"] = "/etc/passwd"

    result = load_inventory(write(tmp_path, mutate)).model_dump_json()
    assert text in result
    assert "/etc/passwd" not in result and "C:/private" not in result
