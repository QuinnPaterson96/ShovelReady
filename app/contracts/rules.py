"""Scalar bounds plus explicit non-executable semantics, not a rule language."""

from typing import Annotated, Literal

from pydantic import Field, model_validator

from .common import Artifact, Contract, Evidence, Quantity, Review, RevisionRef, Text, Versioned


class ScalarBound(Contract):
    kind: Literal["scalar_bound"]
    subject: Text
    measurement_definition: Text
    operator: Literal["<", "<=", ">", ">=", "=="]
    threshold: Quantity


class UnresolvedSemantics(Contract):
    kind: Literal["unresolved"]
    text: Text
    reason: Text


Semantics = Annotated[ScalarBound | UnresolvedSemantics, Field(discriminator="kind")]


class RuleReference(Contract):
    instrument: Text
    locator: Text
    relationship: Literal["depends_on", "exception", "excludes", "overrides", "calculation"]
    status: Literal["unresolved", "resolved"]
    target: RevisionRef | None

    @model_validator(mode="after")
    def resolution(self):
        if (self.status == "resolved") != (self.target is not None):
            raise ValueError("resolved reference requires an exact rule revision")
        return self


class Applicability(Contract):
    jurisdiction: Text
    use: Text
    building_role: Text
    conditions: tuple[Text, ...]
    exceptions: tuple[Text, ...]
    status: Literal["reviewed_scope", "unresolved"]


class RuleContent(Contract):
    pathway_id: Text
    alternative_id: Text
    text: Text
    evidence: Annotated[tuple[Evidence, ...], Field(min_length=1)]
    applicability: Applicability
    approval: Literal["as_of_right", "conditional", "discretionary", "unknown"]
    semantics: Semantics
    runtime_support: Literal["supported", "unsupported", "unresolved"]
    references: tuple[RuleReference, ...]

    @model_validator(mode="after")
    def support(self):
        if self.runtime_support == "supported" and (
            self.semantics.kind != "scalar_bound"
            or self.applicability.status != "reviewed_scope"
            or any(r.status == "unresolved" for r in self.references)
        ):
            raise ValueError(
                "supported semantics cannot contain unresolved dependencies/applicability"
            )
        return self


class ExtractionTrace(Contract):
    run_id: Text
    raw_response: Artifact
    prompt: Artifact
    model: Text
    parser_version: Text


class RuleCandidate(Versioned):
    candidate_id: Text
    source_snapshot_ids: Annotated[tuple[Text, ...], Field(min_length=1)]
    searched_scope: Text
    extraction_status: Literal["extracted", "not_found_in_reviewed_scope", "ambiguous", "failed"]
    trace: ExtractionTrace
    content: RuleContent | None
    issues: tuple[Text, ...]
    review: Review

    @model_validator(mode="after")
    def extraction(self):
        if self.extraction_status == "extracted" and self.content is None:
            raise ValueError("extracted candidate requires content")
        if self.extraction_status in {"failed", "not_found_in_reviewed_scope"} and self.content:
            raise ValueError("failed/absent extraction cannot invent rule content")
        if self.extraction_status != "extracted" and not self.issues:
            raise ValueError("non-extracted state requires explanation")
        if self.content and any(
            e.snapshot_id not in self.source_snapshot_ids for e in self.content.evidence
        ):
            raise ValueError("candidate evidence must refer to declared snapshots")
        return self


class AcceptedRuleRevision(Versioned):
    identity: RevisionRef
    candidate_id: Text
    content: RuleContent
    review: Review
    supersedes: tuple[RevisionRef, ...]
    identity_decision: Text

    @model_validator(mode="after")
    def accepted(self):
        if self.review.status != "accepted":
            raise ValueError("accepted revision requires an attributed acceptance decision")
        if self.identity in self.supersedes:
            raise ValueError("a revision cannot supersede itself")
        return self
