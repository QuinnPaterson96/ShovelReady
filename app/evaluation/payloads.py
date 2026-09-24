"""SR-10 boundary supplement; existing SR-04 readers are unchanged."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

from app.contracts.common import Contract, Provenance, Quantity, RevisionRef, SourceSnapshot, Text
from app.contracts.inputs import DesignRevision, PlacementRevision, SiteRevision
from app.contracts.results import Alternative, AlternativeResult, CheckResult
from app.contracts.rules import AcceptedRuleRevision

VERSION = "sr-10.v1"
ENGINE = "bounded-scalar.v1"
Outcome = Literal["candidate", "needs_investigation", "no_match_under_evaluated_pathways"]


class InputRefs(Contract):
    design: RevisionRef
    site: RevisionRef
    placement: RevisionRef


class MeasuredFact(Contract):
    """A supplied measurement revision, never inferred from a name or GIS field."""

    identity: RevisionRef
    inputs: InputRefs
    definition: Text
    status: Literal["known", "missing", "uncertain"]
    quantity: Quantity | None
    reason: Text | None = None
    provenance: Provenance

    @model_validator(mode="after")
    def quantity_state(self):
        if self.status == "known" and self.quantity is None:
            raise ValueError("known fact requires quantity")
        if self.status == "missing" and self.quantity is not None:
            raise ValueError("missing fact cannot contain a quantity")
        if self.status != "known" and not self.reason:
            raise ValueError("missing/uncertain fact requires reason")
        return self


class Binding(Contract):
    rule: RevisionRef
    fact: RevisionRef
    inputs: InputRefs
    # This attests the exact mapping, not execution of free-text definitions.
    measurement_definition: Text
    definition_support: Literal["reviewed_direct_measurement", "unsupported"]
    applicability: Literal["applicable", "unresolved"]
    provenance: Provenance


class EvaluationScope(Contract):
    jurisdiction: Text
    use: Text
    building_role: Text
    coverage: Literal["within_coverage", "outside_coverage", "unresolved"]
    description: Text
    exclusions: tuple[Text, ...]
    provenance: Provenance


class EvaluationRequest(Contract):
    schema_version: Literal["sr-10.v1"]
    evaluator_version: Literal["bounded-scalar.v1"]
    evaluation_id: Text
    # Distinct from DatasetReference.release_id: this is NOT a published dataset.
    draft: RevisionRef
    data_state: Literal["draft_only"]
    sources: tuple[SourceSnapshot, ...]
    design: DesignRevision
    site: SiteRevision
    placement: PlacementRevision
    scope: EvaluationScope
    alternatives: Annotated[tuple[Alternative, ...], Field(min_length=1)]
    rules: tuple[AcceptedRuleRevision, ...]
    facts: tuple[MeasuredFact, ...]
    bindings: tuple[Binding, ...]

    @model_validator(mode="after")
    def references(self):
        def unique(items, label):
            if len(items) != len(set(items)):
                raise ValueError(f"duplicate {label}")

        unique([s.snapshot_id for s in self.sources], "source")
        unique([r.identity for r in self.rules], "rule revision")
        unique([f.identity for f in self.facts], "fact revision")
        unique([b.rule for b in self.bindings], "rule binding")
        unique([(a.pathway_id, a.alternative_id) for a in self.alternatives], "alternative")
        refs = InputRefs(
            design=self.design.identity, site=self.site.identity, placement=self.placement.identity
        )
        if (self.placement.design, self.placement.site) != (refs.design, refs.site):
            raise ValueError("placement references different input revisions")
        if any(x.inputs != refs for x in (*self.facts, *self.bindings)):
            raise ValueError("fact/binding references different input revisions")
        parcel = [f for f in self.site.geometry_facts if f.role == "parcel"]
        footprint = self.placement.footprint.geometry
        if footprint and any(f.geometry and f.geometry.crs != footprint.crs for f in parcel):
            raise ValueError("placement/site CRS mismatch")
        declared = {}
        for a in self.alternatives:
            unique([r.logical_id for r in a.rules], "logical rule in alternative")
            for ref in a.rules:
                if ref in declared:
                    raise ValueError("rule revision belongs to multiple alternatives")
                declared[ref] = (a.pathway_id, a.alternative_id)
        for rule in self.rules:
            if declared.get(rule.identity) != (
                rule.content.pathway_id,
                rule.content.alternative_id,
            ):
                raise ValueError("rule outside declared alternative")
        if any(b.rule not in declared for b in self.bindings):
            raise ValueError("binding rule outside declared alternatives")
        # Missing rule/fact revisions are diagnostic states; invented evidence is not.
        source_ids = {s.snapshot_id for s in self.sources}
        for evidence in evidence_in(self):
            if evidence.snapshot_id not in source_ids:
                raise ValueError("evidence snapshot absent")
        return self


def evidence_in(value):
    """Walk typed evidence without importing persistence."""
    from app.contracts.common import Evidence

    if isinstance(value, Evidence):
        yield value
    elif isinstance(value, BaseModel):
        for name in type(value).model_fields:
            yield from evidence_in(getattr(value, name))
    elif isinstance(value, tuple):
        for item in value:
            yield from evidence_in(item)


class CheckTrace(Contract):
    rule: RevisionRef
    binding: Binding | None
    fact: MeasuredFact | None
    diagnostics: tuple[Text, ...]
    result: CheckResult


class EvaluationReport(Contract):
    schema_version: Literal["sr-10.v1"]
    evaluator_version: Literal["bounded-scalar.v1"]
    data_state: Literal["draft_only"]
    scope: Literal["supplied_placement_only"]
    request: EvaluationRequest
    outcome: Outcome
    alternatives: tuple[AlternativeResult, ...]
    traces: tuple[CheckTrace, ...]
    scope_exclusions: tuple[Text, ...]
