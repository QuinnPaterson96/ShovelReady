"""Bounded metadata boundary; never fetches a source or opens inventory-provided paths."""

import hashlib
import json
from datetime import date
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Text = Annotated[str, StringConstraints(min_length=1, max_length=8000)]
Identifier = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$")]
HOSTS = {"tender.victoria.ca", "www.victoria.ca", "saanich.ca.granicus.com", "vancouver.ca"}
INVENTORY_PATH = Path(__file__).resolve().parents[2] / "docs/research/public-cases/cases.json"


class Boundary(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Evidence(Boundary):
    source_id: Identifier
    locator: Text


class Statement(Boundary):
    summary: Text
    evidence: list[Evidence]


class Rights(Boundary):
    evidence_url: Text
    locator: Text
    access_date: date
    summary: Text
    handling: Text

    @field_validator("evidence_url")
    @classmethod
    def official_url(cls, value):
        return safe_url(value)


class Source(Boundary):
    url: Text
    title: Text
    kind: Text
    access_date: date
    access_method: Text
    document_date: date | None
    date_basis: Text
    sha256: Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")] | None
    byte_length: Annotated[int, Field(gt=0)] | None
    page_count: Annotated[int, Field(gt=0)] | None
    inspection: Text
    rights_id: Identifier

    @field_validator("url")
    @classmethod
    def official_url(cls, value):
        return safe_url(value)


class Jurisdiction(Boundary):
    name: Literal["City of Victoria", "District of Saanich", "City of Vancouver"]
    province: Literal["BC"]
    country: Literal["CA"]


class Prefab(Boundary):
    status: Literal["unknown"]
    evidence: list[Evidence]
    note: Text


class Rules(Statement):
    effective_date: None
    current_applicability: Literal["unverified"]


class Decision(Boundary):
    status: Literal[
        "council_approval_reported_by_tracker",
        "approval_reported_date_conflict",
        "unknown",
        "application_record_only",
        "staff_recommendation_only",
        "board_relaxation_approved",
        "refusal_overturned_with_conditions",
    ]
    date: date | None
    evidence: Annotated[list[Evidence], Field(min_length=1)]
    conditions: list[Statement]
    issued_development_permit: None
    issued_building_permit: None
    as_built_verified: None


class Measurement(Boundary):
    name: Text
    original_value: Text | Annotated[list[Text], Field(min_length=1)] | None
    original_unit: Text | None
    measurement_definition: Text
    normalized_value: None
    normalization_status: Literal["not_performed"]
    review_status: Literal["provisional"]
    evidence: Annotated[list[Evidence], Field(min_length=1)]


class PublicCase(Boundary):
    case_id: Identifier
    jurisdiction: Jurisdiction
    scope: Literal["pilot_jurisdiction", "transfer_only"]
    public_site_label: Text
    official_identifiers: Annotated[list[Identifier], Field(min_length=1)]
    dependency_group: Identifier
    split: Literal["unassigned"]
    review_status: Literal["provisional"]
    benchmark_eligible: Literal[False]
    development: Statement
    prefab: Prefab
    application_date: date | None
    application_date_evidence: list[Evidence]
    source_facts: list[Statement]
    official_interpretations: list[Statement]
    researcher_inferences: list[Text]
    plan_version: Statement
    governing_rules: Rules
    decision: Decision
    measurements: list[Measurement]
    test_uses: list[Text]
    unsupported: Annotated[list[Text], Field(min_length=1)]
    missing_inputs: Annotated[list[Text], Field(min_length=1)]

    @model_validator(mode="after")
    def check_case(self):
        if (self.jurisdiction.name == "City of Victoria") != (self.scope == "pilot_jurisdiction"):
            raise ValueError("Jurisdiction/scope mismatch")
        if self.dependency_group != self.case_id:
            raise ValueError("Invalid dependency group")
        if self.application_date is not None and not self.application_date_evidence:
            raise ValueError("Missing application date evidence")
        if not self.development.evidence:
            raise ValueError("Missing development evidence")
        for statement in (
            self.source_facts + self.official_interpretations + self.decision.conditions
        ):
            if not statement.evidence:
                raise ValueError("Missing statement evidence")
        return self


class Identity(Boundary):
    kind: Literal["provisional_public_case_inventory"]
    inventory_revision: Text
    content_sha256: Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]
    source_schema_version: Literal["public-cases.v1"]
    access_date: date


class CaseInventory(Boundary):
    schema_version: Literal["public-case-view.v1"]
    identity: Identity
    purpose: Text
    first_case_id: Identifier
    cases: Annotated[list[PublicCase], Field(min_length=10, max_length=10)]
    sources: dict[Identifier, Source]
    rights: dict[Identifier, Rights]

    @model_validator(mode="after")
    def check_references(self):
        ids = [case.case_id for case in self.cases]
        if len(set(ids)) != len(ids) or self.first_case_id not in ids:
            raise ValueError("Duplicate case or missing first case")
        if len({s.url for s in self.sources.values()}) != len(self.sources):
            raise ValueError("Duplicate source URL")
        for source in self.sources.values():
            if source.rights_id not in self.rights:
                raise ValueError("Broken rights reference")

        def walk(value):
            if isinstance(value, dict):
                if "source_id" in value and value["source_id"] not in self.sources:
                    raise ValueError("Broken source reference")
                if "evidence" in value:
                    refs = [(e["source_id"], e["locator"]) for e in value["evidence"]]
                    if len(set(refs)) != len(refs):
                        raise ValueError("Duplicate evidence reference")
                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)

        for case in self.cases:
            walk(case.model_dump())
        return self


def safe_url(value: str) -> str:
    url = urlsplit(value)
    if (
        url.scheme != "https"
        or url.hostname not in HOSTS
        or url.username
        or url.password
        or url.port not in {None, 443}
        or "\\" in value
        or any(ord(c) <= 32 for c in value)
    ):
        raise ValueError("Source link must use an observed official HTTPS host")
    return value


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def load_inventory(path: Path = INVENTORY_PATH) -> CaseInventory:
    # A fixed application-owned path, never selected by a query, case ID or source metadata.
    raw = path.read_bytes()
    if len(raw) > 1_000_000:
        raise ValueError("Inventory too large")
    data = json.loads(raw, object_pairs_hook=unique_object)
    expected = {
        "schema_version",
        "inventory_revision",
        "access_date",
        "purpose",
        "counts",
        "local_artifacts",
        "rights",
        "sources",
        "cases",
        "shortlist",
        "first_integration_candidate",
        "split_policy",
    }
    if set(data) != expected or data["schema_version"] != "public-cases.v1":
        raise ValueError("Unsupported inventory structure/version")
    # Local artifact metadata is deliberately removed, never opened or serialized to the API.
    if (
        not isinstance(data["cases"], list)
        or not all(isinstance(c, dict) for c in data["cases"])
        or not isinstance(data["sources"], dict)
        or not all(isinstance(s, dict) for s in data["sources"].values())
    ):
        raise ValueError("Invalid cases or sources")
    cases = [{k: v for k, v in case.items() if k != "local_artifacts"} for case in data["cases"]]
    sources = {
        key: {k: v for k, v in source.items() if k != "local_artifact"}
        for key, source in data["sources"].items()
    }
    payload = {
        "schema_version": "public-case-view.v1",
        "identity": {
            "kind": "provisional_public_case_inventory",
            "source_schema_version": "public-cases.v1",
            "inventory_revision": data["inventory_revision"],
            "content_sha256": hashlib.sha256(raw).hexdigest(),
            "access_date": data["access_date"],
        },
        "purpose": data["purpose"],
        "first_case_id": data["first_integration_candidate"],
        "cases": cases,
        "sources": sources,
        "rights": data["rights"],
    }
    # JSON-mode strict validation accepts ISO dates without coercing other field types.
    result = CaseInventory.model_validate_json(json.dumps(payload))
    counts = {
        "total": len(result.cases),
        "pilot_jurisdiction": 0,
        "transfer_only": 0,
        "accepted": 0,
    }
    for case in result.cases:
        counts[case.scope] += 1
    if data["counts"] != counts:
        raise ValueError("Inventory counts mismatch")
    return result


router = APIRouter(prefix="/api/reference-cases", tags=["public-case metadata"])


@router.get("", response_model=CaseInventory)
def reference_cases() -> CaseInventory:
    try:
        return load_inventory()
    except (OSError, ValueError, TypeError, KeyError):
        # Avoid returning validation payloads, local paths or untrusted source text in errors.
        raise HTTPException(503, "Public-case inventory unavailable or invalid") from None
