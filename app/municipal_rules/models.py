"""Shared presentation and dispatch boundaries. Local input semantics stay in each package."""

from typing import Literal

from pydantic import Field

from app.conditional_screening.payloads import Boundary, Result, Source, Status


class Definition(Boundary):
    id: str
    revision: str
    label: str
    unit: Literal["m", "m2", "fraction"]
    basis: str
    description: str
    source: Source


class InputField(Boundary):
    id: str
    label: str
    kind: Literal["measurement", "boolean"]
    definition: Definition | None = None
    help: str


class Profile(Boundary):
    jurisdiction_id: str
    name: str
    locality: str
    aliases: tuple[str, ...]
    parcel_source: str
    capabilities: tuple[str, ...]
    pathway_id: str
    label: str
    revision: str
    scope: str
    inputs: tuple[InputField, ...] = ()


class EvaluationRequest(Boundary):
    schema_version: Literal["municipal-screening.request.v1"]
    jurisdiction_id: str = Field(min_length=1, max_length=100)
    pathway_id: str = Field(min_length=1, max_length=150)
    payload: dict


class Finding(Boundary):
    id: str
    label: str
    status: Status
    detail: str
    next_action: str | None = None
    input_id: str | None = None
    source: Source | None = None


class EvaluationResult(Boundary):
    schema_version: Literal["municipal-screening.result.v1"] = "municipal-screening.result.v1"
    jurisdiction_id: str
    pathway_id: str
    package_revision: str
    screening: Result
    findings: tuple[Finding, ...] = ()
    scope: str
