"""Offline SR-28 content checks; no app, database, browser or model execution."""

import hashlib
import json
from pathlib import Path

import pytest

from scripts.virtual_qa.contracts import CaseDefinition, DataIdentity, validate_links

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "tests/fixtures/virtual_qa"
RENDERER = "frontend/src/preview/InvestigationPreview.tsx"
BASE = "303b40aeb9e69f476878959148ed299cad2a5e9b"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git_text_bytes(path):
    # These tracked inputs have no binary CR/LF data. Compare canonical LF bytes,
    # including the historical cp1252 observational envelope, without rewriting them.
    return path.read_bytes().replace(b"\r\n", b"\n")


def read_json(path):
    raw = path.read_bytes()
    encoding = "cp1252" if path.name == "observed.test.json" else "utf-8"
    return json.loads(raw.decode(encoding))


def cases():
    return tuple(
        CaseDefinition.model_validate_json(path.read_bytes())
        for path in sorted((PACK / "cases").glob("*.json"))
    )


def references(value):
    if isinstance(value, dict):
        if set(value) == {"uri", "revision", "locator"}:
            yield value
        else:
            for child in value.values():
                yield from references(child)
    elif isinstance(value, list):
        for child in value:
            yield from references(child)


def verify_reference(reference):
    path = (ROOT / reference["uri"]).resolve()
    assert path.is_relative_to(ROOT)
    assert path.is_file(), reference["uri"]
    assert reference["revision"]["value"] == "sha256:" + digest(git_text_bytes(path))
    locator = reference["locator"]
    if path.suffix == ".json":
        assert locator.startswith("/")
        node = read_json(path)
        for key in locator[1:].split("/"):
            key = key.replace("~1", "/").replace("~0", "~")
            node = node[int(key)] if isinstance(node, list) else node[key]
        assert node is not None
    elif path.suffix == ".txt":
        assert locator in path.read_text(encoding="utf-8")


def test_records_references_modes_and_groups():
    library = cases()
    assert len(library) == 11
    validate_links(library, (), ())
    assert len({case.case_id for case in library}) == 11
    assert sum(case.supported_modes == ("task_completion",) for case in library) == 5
    groups = {}
    for case in library:
        groups.setdefault(case.group, set()).add(case.split)
        for reference in references(case.model_dump(mode="json")):
            verify_reference(reference)
        assert all(item.kind != "legal_expectation" for item in case.facilitator.expectations)
        assert case.unknowns
    assert all(len(splits) == 1 for splits in groups.values())
    assert not any(case.split == "holdout" for case in library)  # No fake fresh holdout.
    lookup = {case.case_id: case for case in library}
    assert lookup["synthetic-a-candidate"].group == lookup["synthetic-f-correction"].group


def test_references_reject_changed_bytes_and_missing_locator():
    reference = cases()[0].fixtures[0].model_dump(mode="json")
    reference["revision"]["value"] = "sha256:" + "0" * 64
    with pytest.raises(AssertionError):
        verify_reference(reference)
    reference = cases()[0].fixtures[0].model_dump(mode="json")
    reference["locator"] = "/scenarios/9999"
    with pytest.raises(IndexError):
        verify_reference(reference)


def test_original_bytes_and_single_control_differences():
    pins = read_json(PACK / "baseline-hashes.json")
    for name, expected in pins.items():
        assert digest(git_text_bytes(ROOT / name)) == expected, name
    baseline = git_text_bytes(ROOT / RENDERER).decode()
    # Reverse just the reviewed display change. Any second mutation fails equality.
    reversals = {
        "evidence-access": [
            (
                "{result.evaluation_id !== 'synthetic-evaluation-1' && <details>",
                "<details>",
            ),
            ("        </details>}", "        </details>"),
        ],
        "unit-display": [
            (
                "{check.check_id === 'synthetic-check-3' ? 'ft' : "
                "rule.content.semantics.threshold.unit}",
                "{rule.content.semantics.threshold.unit}",
            ),
        ],
        "affirmative-label": [
            (
                "{result.evaluation_id === 'synthetic-evaluation-5' ? 'Candidate' : "
                "readable(result.outcome)}",
                "{readable(result.outcome)}",
            ),
        ],
    }
    for pair, edits in reversals.items():
        asset = (PACK / "assets" / f"{pair}.tsx").read_text(encoding="utf-8")
        assert asset != baseline
        for before, after in edits:
            assert asset.count(before) == 1
            asset = asset.replace(before, after)
        assert asset == baseline


def test_recipes_bind_cases_and_exact_assets():
    library = {case.case_id: case for case in cases()}
    paths = sorted((PACK / "recipes").glob("*.json"))
    assert {path.stem for path in paths} == set(library)
    pairs = {}
    for path in paths:
        recipe = read_json(path)
        assert set(recipe) == {
            "schema_version", "baseline_commit", "case_id", "case_revision",
            "data", "entry_path", "replacements",
        }
        assert recipe["schema_version"] == "virtual-qa-materialization/v1"
        assert recipe["baseline_commit"] == BASE
        assert recipe["case_id"] == path.stem
        case = library[recipe["case_id"]]
        assert recipe["case_revision"] == case.revision
        assert recipe["entry_path"] == "/"
        data = DataIdentity.model_validate(recipe["data"])
        assert data.kind == (
            "observation" if case.evidence_status == "observational" else "synthetic_fixture"
        )
        if data.kind == "observation":
            identity = read_json(ROOT / "frontend/src/investigation/observed.test.json")
            assert data.identity.value == identity["spatial"]["identity"]["logical_id"]
            assert data.revision.value == identity["spatial"]["identity"]["revision_id"]
        else:
            assert data.identity.value == "synthetic-preview"
            assert data.revision.value == "synthetic-preview-v1"
        fault = case.facilitator.seeded_fault
        assert len(recipe["replacements"]) == int(fault is not None and fault.variant == "fault")
        for replacement in recipe["replacements"]:
            assert set(replacement) == {"path", "asset", "before_sha256", "after_sha256"}
            assert replacement["path"] == RENDERER
            asset = (PACK / replacement["asset"]).resolve()
            assert asset.is_relative_to(PACK / "assets")
            assert replacement["before_sha256"] == digest(git_text_bytes(ROOT / RENDERER))
            assert replacement["after_sha256"] == digest(asset.read_bytes())
            assert replacement["after_sha256"] != replacement["before_sha256"]
        if fault:
            pairs.setdefault(fault.pair_id, {})[fault.variant] = case
    assert set(pairs) == {"evidence-access", "unit-display", "affirmative-label"}
    for members in pairs.values():
        assert set(members) == {"clean", "fault"}
        clean, faulty = members["clean"], members["fault"]
        assert clean.participant_brief == faulty.participant_brief
        for field in ("fixtures", "sources", "group", "split", "unknowns", "supported_modes"):
            assert getattr(clean, field) == getattr(faulty, field)
        for case in members.values():
            assert case.supported_modes == ("defect_detection",)
            assert len(case.facilitator.expectations) == 1
            expectation = case.facilitator.expectations[0]
            assert expectation.check_id == "control-observation" and expectation.scored


def test_facilitator_pack_is_not_imported_or_served_by_app():
    for parent in (ROOT / "frontend/src", ROOT / "app"):
        for path in parent.rglob("*"):
            if path.suffix in {".py", ".ts", ".tsx"}:
                data = path.read_text(encoding="utf-8")
                assert "fixtures/virtual_qa" not in data
                assert "evidence-access-fault" not in data
    assert not (ROOT / "frontend/public/tests").exists()
