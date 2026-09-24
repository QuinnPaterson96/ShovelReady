"""Result claims are scoped to the supplied placement and coherent alternatives."""

from typing import Annotated, Literal

from pydantic import Field, model_validator

from .common import Contract, Evidence, RevisionRef, Text, Versioned


class Alternative(Contract):
    pathway_id: Text
    alternative_id: Text
    rules: Annotated[tuple[RevisionRef, ...], Field(min_length=1)]


class DatasetReference(Versioned):
    dataset_id: Text
    release_id: Text
    source_snapshot_ids: Annotated[tuple[Text, ...], Field(min_length=1)]
    spatial_snapshot_ids: tuple[Text, ...]
    alternatives: Annotated[tuple[Alternative, ...], Field(min_length=1)]
    projection_version: Text
    evaluator_version: Text
    coverage: Text
    exclusions: tuple[Text, ...]

    @model_validator(mode="after")
    def unique_alternatives(self):
        keys = [(a.pathway_id, a.alternative_id) for a in self.alternatives]
        if len(keys) != len(set(keys)):
            raise ValueError("duplicate alternative")
        for a in self.alternatives:
            ids = [r.logical_id for r in a.rules]
            if len(ids) != len(set(ids)):
                raise ValueError("alternative contains multiple revisions of one logical rule")
        return self


CheckStatus = Literal[
    "pass",
    "supported_failure",
    "missing_fact",
    "extraction_failure",
    "outside_coverage",
    "unsupported_semantics",
    "unresolved_reference",
    "not_applicable",
]


class CheckResult(Contract):
    check_id: Text
    rule: RevisionRef | None
    status: CheckStatus
    explanation: Text
    evidence: tuple[Evidence, ...]
    missing_facts: tuple[Text, ...]

    @model_validator(mode="after")
    def justified(self):
        if self.status in {"pass", "supported_failure", "not_applicable"} and (
            not self.rule or not self.evidence or self.missing_facts
        ):
            raise ValueError("conclusive check requires rule/evidence and no missing facts")
        if self.status == "missing_fact" and not self.missing_facts:
            raise ValueError("missing fact check must identify missing inputs")
        if self.status != "missing_fact" and self.missing_facts:
            raise ValueError("missing facts must use their own check state")
        return self


class AlternativeResult(Contract):
    pathway_id: Text
    alternative_id: Text
    outcome: Literal["candidate", "needs_investigation", "no_match_under_evaluated_pathways"]
    approval: Literal["as_of_right", "conditional", "discretionary", "unknown"]
    conditions: tuple[Text, ...]
    checks: Annotated[tuple[CheckResult, ...], Field(min_length=1)]

    @model_validator(mode="after")
    def claim(self):
        states = {c.status for c in self.checks}
        if self.outcome == "candidate" and (
            not states <= {"pass", "not_applicable"}
            or "pass" not in states
            or self.approval in {"unknown", "discretionary"}
        ):
            raise ValueError("candidate cannot hide unresolved checks or approval")
        if self.outcome == "no_match_under_evaluated_pathways" and (
            "supported_failure" not in states
            or not states <= {"pass", "not_applicable", "supported_failure"}
        ):
            raise ValueError("exclusion requires supported checks and an evidenced failure")
        return self


class EvaluationResult(Versioned):
    evaluation_id: Text
    dataset: DatasetReference
    design: RevisionRef
    site: RevisionRef
    placement: RevisionRef
    scope: Literal["supplied_placement_only"]
    coverage: Literal["within_coverage", "outside_coverage"]
    outcome: Literal["candidate", "needs_investigation", "no_match_under_evaluated_pathways"]
    alternatives: Annotated[tuple[AlternativeResult, ...], Field(min_length=1)]
    scope_exclusions: tuple[Text, ...]

    @model_validator(mode="after")
    def coherent_claim(self):
        declared = {(a.pathway_id, a.alternative_id): a for a in self.dataset.alternatives}
        actual = [(a.pathway_id, a.alternative_id) for a in self.alternatives]
        if len(actual) != len(set(actual)) or set(actual) != set(declared):
            raise ValueError("results must account for every declared alternative exactly once")
        for a in self.alternatives:
            allowed = declared[(a.pathway_id, a.alternative_id)].rules
            if any(c.rule and c.rule not in allowed for c in a.checks):
                raise ValueError("check mixes rules from incompatible alternatives/releases")
            if a.outcome == "candidate" and any(
                r not in [c.rule for c in a.checks] for r in allowed
            ):
                raise ValueError("candidate omits a declared rule")
            if any(
                e.snapshot_id not in self.dataset.source_snapshot_ids
                for c in a.checks
                for e in c.evidence
            ):
                raise ValueError("result evidence is outside the declared release")
        outcomes = {a.outcome for a in self.alternatives}
        if self.coverage == "outside_coverage" and (
            self.outcome != "needs_investigation" or outcomes != {"needs_investigation"}
        ):
            raise ValueError("outside coverage is investigation, never a zoning prohibition")
        if self.outcome == "candidate" and "candidate" not in outcomes:
            raise ValueError("candidate requires one coherent passing alternative")
        if self.outcome == "no_match_under_evaluated_pathways" and outcomes != {self.outcome}:
            raise ValueError("unresolved alternatives prevent an all-pathways exclusion")
        return self
