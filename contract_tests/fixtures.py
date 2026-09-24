"""Synthetic contract cases grounded in the preserved prompt; not pilot/legal facts."""

from copy import deepcopy
from hashlib import sha256
from pathlib import Path

VERSION = "sr-04.v1-provisional"
ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = {
    "snapshot_id": "prompt-snapshot-1",
    "locator": "Part 1 / single numeric value",
    "excerpt": "45 or 0.10 for 10%",
    "context": "Prompt examples, not a municipal rule. Synthetic reviewer and site below.",
}
REVIEW = {
    "status": "accepted",
    "reviewer": "synthetic-fixture-reviewer",
    "reviewed_at": "2026-09-18T12:00:00Z",
    "scope": "contract structure only",
    "rationale": "Not a legal interpretation or verified pilot input.",
}
PROVENANCE = {
    "method": "manual",
    "evidence": [EVIDENCE],
    "review": REVIEW,
    "uncertainty": ["Synthetic geometry; actual pilot inputs awaited from SR-01/SR-05."],
}
SOURCE = {
    "schema_version": VERSION,
    "source_id": "extraction-prompt",
    "snapshot_id": "prompt-snapshot-1",
    "category": "test_fixture",
    "jurisdiction": "none: repository example",
    "instrument": "Existing extraction prompt",
    "source_url": "app/prompts/document_parsing",
    "artifact": {
        "uri": "app/prompts/document_parsing",
        "sha256": sha256((ROOT / "app/prompts/document_parsing").read_bytes()).hexdigest(),
    },
    "captured_at": "2026-09-18T12:00:00Z",
    "printed_revision": None,
    "effective_from": None,
    "effective_to": None,
    "effective_date_evidence": [],
    "original_crs": None,
    "original_units": ["%"],
    "reuse_constraints": "Repository test reference only; no municipal material redistributed.",
    "review": REVIEW,
}
QUANTITY = {
    "original_text": "45%",
    "original_value": "45",
    "original_unit": "%",
    "dimension": "ratio",
    "value": "0.45",
    "unit": "fraction",
    "basis": {"numerator": "occupied_site_area", "denominator": "lot_area"},
}


def quantity(value="10", unit="m", normalized=None):
    return {
        "original_text": f"{value} {unit}",
        "original_value": value,
        "original_unit": unit,
        "dimension": "area" if unit in {"m2", "ft2"} else "length",
        "value": normalized or value,
        "unit": "m2" if unit in {"m2", "ft2"} else "m",
    }


def measurement(name, domain, q):
    return {
        "name": name,
        "domain": domain,
        "definition": "Synthetic explicit measurement basis",
        "status": "known",
        "quantity": q,
        "provenance": PROVENANCE,
    }


DESIGN = {
    "schema_version": VERSION,
    "identity": {"logical_id": "design-demo", "revision_id": "design-r1"},
    "configuration": "Synthetic fixed rectangle, not The Landing",
    "adaptability": "fixed",
    "intended_use": "garden suite",
    "construction_method": "prefabricated",
    "measurements": [
        measurement("manufacturer_interior_area", "physical", quantity("40", "m2")),
        measurement("nominal_exterior_width", "physical", quantity("5")),
        measurement("nominal_exterior_depth", "physical", quantity("9")),
        measurement("occupancy_footprint", "physical", quantity("45", "m2")),
        measurement("ceiling_height", "physical", quantity("2.4")),
        {
            "name": "regulatory_floor_area",
            "domain": "regulatory",
            "definition": "Await applicable area accounting",
            "status": "missing",
            "quantity": None,
            "reason": "No reviewed regulatory definition",
            "provenance": PROVENANCE,
        },
        {
            "name": "roof_height",
            "domain": "physical",
            "definition": "Roof peak from foundation datum",
            "status": "missing",
            "quantity": None,
            "reason": "Ceiling height is insufficient",
            "provenance": PROVENANCE,
        },
    ],
    "provenance": PROVENANCE,
}


def geometry_fact(role):
    line = role == "lot_line"
    return {
        "fact_id": role,
        "role": role,
        "status": "known",
        "provenance": PROVENANCE,
        "lot_line_classification": "rear" if line else None,
        "geometry": {
            "kind": "line" if line else "polygon",
            "coordinates": [["0", "0"], ["10", "0"]]
            if line
            else [["0", "0"], ["10", "0"], ["10", "10"], ["0", "0"]],
            "crs": {
                "identifier": "local:synthetic-site",
                "axis_order": "x_y",
                "unit": "m",
                "definition": "Synthetic local origin; no geographic position claimed",
            },
        },
    }


SITE = {
    "schema_version": VERSION,
    "identity": {"logical_id": "site-demo", "revision_id": "site-r1"},
    "jurisdiction": "synthetic",
    "measurements": [],
    "conditions": [],
    "provenance": PROVENANCE,
    "geometry_facts": [
        geometry_fact(r) for r in ("parcel", "principal_building", "lot_line", "rear_yard")
    ],
}
PLACEMENT = {
    "schema_version": VERSION,
    "identity": {"logical_id": "placement-demo", "revision_id": "placement-r1"},
    "site": deepcopy(SITE["identity"]),
    "design": deepcopy(DESIGN["identity"]),
    "scope": "supplied_placement_only",
    "footprint": geometry_fact("proposed_placement"),
}
CONTENT = {
    "pathway_id": "synthetic-garden-suite",
    "alternative_id": "ordinary",
    "text": "Synthetic maximum 45% lot coverage",
    "evidence": [EVIDENCE],
    "applicability": {
        "jurisdiction": "synthetic",
        "use": "garden suite",
        "building_role": "accessory",
        "conditions": [],
        "exceptions": [],
        "status": "reviewed_scope",
    },
    "approval": "as_of_right",
    "runtime_support": "supported",
    "references": [],
    "semantics": {
        "kind": "scalar_bound",
        "subject": "lot_coverage",
        "measurement_definition": "Synthetic occupancy / lot area",
        "operator": "<=",
        "threshold": QUANTITY,
    },
}
CANDIDATE = {
    "schema_version": VERSION,
    "candidate_id": "candidate-1",
    "source_snapshot_ids": [SOURCE["snapshot_id"]],
    "searched_scope": "prompt example only",
    "extraction_status": "extracted",
    "content": CONTENT,
    "trace": {
        "run_id": "synthetic-run",
        "raw_response": SOURCE["artifact"],
        "prompt": SOURCE["artifact"],
        "model": "none: hand-authored fixture",
        "parser_version": "fixture-1",
    },
    "issues": [],
    "review": REVIEW,
}
RULE = {
    "schema_version": VERSION,
    "identity": {"logical_id": "coverage", "revision_id": "coverage-r1"},
    "candidate_id": CANDIDATE["candidate_id"],
    "content": CONTENT,
    "review": REVIEW,
    "supersedes": [],
    "identity_decision": "Initial synthetic identity",
}
DATASET = {
    "schema_version": VERSION,
    "dataset_id": "fixture",
    "release_id": "fixture-release-1",
    "source_snapshot_ids": [SOURCE["snapshot_id"]],
    "spatial_snapshot_ids": [],
    "alternatives": [
        {
            "pathway_id": CONTENT["pathway_id"],
            "alternative_id": "ordinary",
            "rules": [deepcopy(RULE["identity"])],
        }
    ],
    "projection_version": "fixture-1",
    "evaluator_version": "fixture-1",
    "coverage": "Synthetic contract fixture only",
    "exclusions": ["All real-world/legal use"],
}
RESULT = {
    "schema_version": VERSION,
    "evaluation_id": "evaluation-1",
    "dataset": deepcopy(DATASET),
    "design": deepcopy(DESIGN["identity"]),
    "site": deepcopy(SITE["identity"]),
    "placement": deepcopy(PLACEMENT["identity"]),
    "scope": "supplied_placement_only",
    "coverage": "within_coverage",
    "outcome": "candidate",
    "scope_exclusions": ["No placement search; no universal parcel/design conclusion"],
    "alternatives": [
        {
            "pathway_id": CONTENT["pathway_id"],
            "alternative_id": "ordinary",
            "outcome": "candidate",
            "approval": "as_of_right",
            "conditions": [],
            "checks": [
                {
                    "check_id": "coverage",
                    "rule": deepcopy(RULE["identity"]),
                    "status": "pass",
                    "explanation": "Synthetic assertion; SR-04 does not implement evaluation",
                    "evidence": [EVIDENCE],
                    "missing_facts": [],
                }
            ],
        }
    ],
}


def copy_fixture(value):
    return deepcopy(value)
