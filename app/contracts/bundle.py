"""Optional cross-payload validation before SR-05 capture or SR-08 persistence."""

from typing import Annotated

from pydantic import Field, model_validator

from .common import SourceSnapshot, Versioned
from .inputs import DesignRevision, PlacementRevision, SiteRevision
from .results import DatasetReference, EvaluationResult
from .rules import AcceptedRuleRevision, RuleCandidate


class BoundaryBundle(Versioned):
    sources: Annotated[tuple[SourceSnapshot, ...], Field(min_length=1)]
    designs: Annotated[tuple[DesignRevision, ...], Field(min_length=1)]
    sites: Annotated[tuple[SiteRevision, ...], Field(min_length=1)]
    placements: Annotated[tuple[PlacementRevision, ...], Field(min_length=1)]
    candidates: tuple[RuleCandidate, ...]
    rules: tuple[AcceptedRuleRevision, ...]
    dataset: DatasetReference
    evaluations: tuple[EvaluationResult, ...]

    @model_validator(mode="after")
    def references(self):
        source_ids = [s.snapshot_id for s in self.sources]
        designs = [d.identity for d in self.designs]
        sites = [s.identity for s in self.sites]
        placements = [p.identity for p in self.placements]
        candidates = [c.candidate_id for c in self.candidates]
        rules = [r.identity for r in self.rules]
        for name, ids in (
            ("source", source_ids),
            ("design", designs),
            ("site", sites),
            ("placement", placements),
            ("candidate", candidates),
            ("rule", rules),
        ):
            if len(ids) != len(set(ids)):
                raise ValueError(f"duplicate {name} revision/identity")
        if not set(self.dataset.source_snapshot_ids) <= set(source_ids):
            raise ValueError("dataset source snapshot is absent")
        for alternative in self.dataset.alternatives:
            if not set(alternative.rules) <= set(rules):
                raise ValueError("released rule revision is absent")
            for rule_ref in alternative.rules:
                rule = self.rules[rules.index(rule_ref)]
                if (rule.content.pathway_id, rule.content.alternative_id) != (
                    alternative.pathway_id,
                    alternative.alternative_id,
                ):
                    raise ValueError("rule assigned to incompatible alternative")
                if any(e.snapshot_id not in source_ids for e in rule.content.evidence):
                    raise ValueError("accepted rule evidence snapshot is absent")
        for candidate in self.candidates:
            if not set(candidate.source_snapshot_ids) <= set(source_ids):
                raise ValueError("candidate source snapshot is absent")
        for rule in self.rules:
            if rule.candidate_id not in candidates:
                raise ValueError("accepted revision has no candidate")
        for placement in self.placements:
            if placement.site not in sites or placement.design not in designs:
                raise ValueError("placement points to missing input revision")
            site = self.sites[sites.index(placement.site)]
            parcel = next(f for f in site.geometry_facts if f.role == "parcel")
            if (
                parcel.geometry
                and placement.footprint.geometry
                and (parcel.geometry.crs != placement.footprint.geometry.crs)
            ):
                raise ValueError("site and placement coordinate references disagree")
        for evaluation in self.evaluations:
            if (
                evaluation.dataset != self.dataset
                or evaluation.design not in designs
                or (evaluation.site not in sites or evaluation.placement not in placements)
            ):
                raise ValueError("evaluation points outside exact released/input revisions")
            placement = self.placements[placements.index(evaluation.placement)]
            if (placement.design, placement.site) != (evaluation.design, evaluation.site):
                raise ValueError("evaluation input differs from supplied placement revision")
        return self
