"""Versioned replay metadata alongside, without weakening, SR-04 contracts."""

from typing import Annotated, Literal

from pydantic import Field, JsonValue, model_validator

from app.contracts.common import (
    Artifact,
    Contract,
    Evidence,
    RatioBasis,
    RevisionRef,
    Text,
)
from app.contracts.rules import Applicability, RuleContent

VERSION = "sr-07.replay.v1"
PARSER = "historical-objects.v1"
SCHEMA = "sr-04.v1-provisional"


class FieldContext(Contract):
    candidate_id: Text
    rule_identity: RevisionRef | None = None
    pathway_id: Text
    alternative_id: Text
    measurement_definition: Text
    dimension: Literal["length", "area", "count", "ratio", "rate"]
    basis: RatioBasis | None = None
    operator: Literal["<", "<=", ">", ">=", "=="]
    # Explicitly resolves the historical prompt's percent/fraction ambiguity.
    ratio_encoding: Literal["percent_points", "fraction"] | None = None
    evidence: Annotated[tuple[Evidence, ...], Field(min_length=1)]
    applicability: Applicability


class RunInput(Contract):
    schema_version: Literal["sr-07.replay.v1"]
    run_id: Text
    origin: Literal["synthetic", "saved_provider_response"]
    source_snapshot_ids: Annotated[tuple[Text, ...], Field(min_length=1)]
    searched_scope: Text
    expected_parameters: Annotated[tuple[Text, ...], Field(min_length=1)]
    model: Text | None = None
    settings: dict[str, JsonValue] | None = None
    provider_metadata: dict[str, JsonValue] | None = None
    run_failures: tuple[Text, ...] = ()
    fields: dict[str, FieldContext] = {}

    @model_validator(mode="after")
    def identities(self):
        if self.origin == "synthetic" and any(
            x is not None for x in (self.model, self.settings, self.provider_metadata)
        ):
            raise ValueError("synthetic fixtures cannot claim provider execution metadata")
        if len(set(self.expected_parameters)) != len(self.expected_parameters):
            raise ValueError("duplicate expected parameter")
        if not set(self.fields) <= set(self.expected_parameters):
            raise ValueError("field context outside declared search parameters")
        ids = [f.candidate_id for f in self.fields.values()]
        if len(set(ids)) != len(ids):
            raise ValueError("duplicate candidate identity")
        for field in self.fields.values():
            if any(e.snapshot_id not in self.source_snapshot_ids for e in field.evidence):
                raise ValueError("evidence outside declared source snapshots")
        return self


class Outcome(Contract):
    parameter: Text
    state: Literal[
        "normalized",
        "malformed",
        "ambiguous",
        "unsupported",
        "not_found_reported",
        "unresolved_reference",
        "missing_evidence",
        "invalid",
        "omitted",
        "not_applicable_reported",
        "run_failed",
    ]
    issues: tuple[Text, ...]
    candidate_id: Text | None = None
    rule_identity: RevisionRef | None = None
    content: RuleContent | None = None


class ReplayReport(Contract):
    schema_version: Literal["sr-07.replay.v1"] = VERSION
    parser_version: Literal["historical-objects.v1"] = PARSER
    target_schema: Literal["sr-04.v1-provisional"] = SCHEMA
    metadata: RunInput
    raw_response: Artifact
    original_prompt: Artifact
    metadata_artifact: Artifact
    object_count: int
    parse_issues: tuple[Text, ...]
    outcomes: tuple[Outcome, ...]
    benchmark_status: Literal["not_measured"] = "not_measured"
