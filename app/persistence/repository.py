"""Small batch import/read interface. All writes are atomic and append-only."""

from collections.abc import Iterable

import sqlalchemy as sa
from pydantic import BaseModel
from sqlalchemy.dialects.postgresql import insert

from app.contracts.common import Evidence, SourceSnapshot
from app.contracts.inputs import DesignRevision, PlacementRevision, SiteRevision
from app.contracts.results import DatasetReference, EvaluationResult
from app.contracts.rules import AcceptedRuleRevision, RuleCandidate
from app.evaluation import EvaluationReport, evaluate
from app.spatial.payloads import SpatialImport

from .payloads import ExtractionRun, Kind, ReviewEvent
from .tables import records, references

MODELS = {
    "source": SourceSnapshot,
    "design": DesignRevision,
    "site": SiteRevision,
    "placement": PlacementRevision,
    "run": ExtractionRun,
    "candidate": RuleCandidate,
    "rule": AcceptedRuleRevision,
    "draft": DatasetReference,
    "evaluation": EvaluationResult,
    "review": ReviewEvent,
    "spatial": SpatialImport,
    "draft_evaluation": EvaluationReport,
}


def connect(url: str) -> sa.Engine:
    """Explicit project URL only; no environment or legacy DATABASE_URL fallback."""
    parsed = sa.engine.make_url(url)
    if parsed.drivername not in {"postgresql", "postgresql+psycopg"}:
        raise ValueError("PostgreSQL is required")
    return sa.create_engine(parsed.set(drivername="postgresql+psycopg"), hide_parameters=True)


def identify(value):
    kind = next((k for k, model in MODELS.items() if type(value) is model), None)
    if kind is None:
        raise TypeError("Unsupported persistence payload")
    if kind in {"design", "site", "placement", "rule", "spatial"}:
        return kind, value.identity.revision_id, value.identity.logical_id
    if kind == "source":
        return kind, value.snapshot_id, value.source_id
    if kind == "draft":
        return kind, value.release_id, value.dataset_id
    record_id = {
        "run": lambda: value.trace.run_id,
        "candidate": lambda: value.candidate_id,
        "evaluation": lambda: value.evaluation_id,
        "review": lambda: value.event_id,
        "draft_evaluation": lambda: value.request.evaluation_id,
    }[kind]()
    return kind, record_id, record_id


def evidence_in(value):
    if isinstance(value, Evidence):
        yield value
    elif isinstance(value, BaseModel):
        for name in type(value).model_fields:
            yield from evidence_in(getattr(value, name))
    elif isinstance(value, tuple):
        for item in value:
            yield from evidence_in(item)


class Repository:
    def __init__(self, engine: sa.Engine):
        self.engine = engine

    @staticmethod
    def _get(connection, kind, record_id):
        payload = connection.execute(
            sa.select(records.c.payload).where(
                records.c.kind == kind,
                records.c.record_id == record_id,
            )
        ).scalar_one_or_none()
        if payload is None:
            raise ValueError(f"Missing {kind} record: {record_id}")
        return MODELS[kind].model_validate(payload)

    def get(self, kind: Kind, record_id: str):
        with self.engine.connect() as connection:
            return self._get(connection, kind, record_id)

    def history(self, kind: Kind, logical_id: str):
        """All revisions, ordered by insertion time then ID; no inferred 'current' revision."""
        with self.engine.connect() as connection:
            return [
                MODELS[kind].model_validate(p)
                for p in connection.execute(
                    sa.select(records.c.payload)
                    .where(
                        records.c.kind == kind,
                        records.c.logical_id == logical_id,
                    )
                    .order_by(records.c.created_at, records.c.record_id)
                ).scalars()
            ]

    def reviews(self, kind: Kind, record_id: str):
        with self.engine.connect() as connection:
            return [
                ReviewEvent.model_validate(p)
                for p in connection.execute(
                    sa.select(records.c.payload)
                    .join(
                        references,
                        sa.and_(
                            references.c.owner_kind == records.c.kind,
                            references.c.owner_id == records.c.record_id,
                        ),
                    )
                    .where(
                        records.c.kind == "review",
                        references.c.target_kind == kind,
                        references.c.target_id == record_id,
                    )
                    .order_by(records.c.created_at, records.c.record_id)
                ).scalars()
            ]

    def import_records(self, values: Iterable[BaseModel]) -> None:
        """Accept current typed payloads in any order, or roll the whole batch back.

        Revalidate even model_construct/model_copy inputs. Candidate traces are
        also retained as immutable run records. Matching IDs require equal JSON.
        """
        validated = []
        for value in values:
            kind, _, _ = identify(value)
            value = MODELS[kind].model_validate(value.model_dump(mode="json"))
            if kind == "draft_evaluation" and value.model_dump(mode="json") != evaluate(
                value.request
            ).model_dump(mode="json"):
                raise ValueError("Draft report differs from deterministic evaluation")
            validated.append(value)
            if isinstance(value, RuleCandidate):
                validated.append(ExtractionRun(trace=value.trace))
        with self.engine.begin() as connection:
            for value in validated:
                kind, record_id, logical_id = identify(value)
                payload = value.model_dump(mode="json")
                connection.execute(
                    insert(records)
                    .values(
                        kind=kind,
                        record_id=record_id,
                        logical_id=logical_id,
                        payload=payload,
                    )
                    .on_conflict_do_nothing()
                )
                if self._get(connection, kind, record_id).model_dump(mode="json") != payload:
                    raise ValueError(f"Immutable identity conflict: {kind}/{record_id}")
            for value in validated:
                self._link(connection, value)

    def _link(self, connection, value):
        if isinstance(value, EvaluationReport):
            # Self-contained diagnostic snapshot, not accepted relational membership.
            # SR-10 validates embedded evidence but permits absent rule/fact revisions.
            return
        owner_kind, owner_id, _ = identify(value)

        def ref(kind, record_id, logical_id=None):
            target = self._get(connection, kind, record_id)
            if logical_id is not None and identify(target)[2] != logical_id:
                raise ValueError("Reference logical identity mismatch")
            connection.execute(
                insert(references)
                .values(
                    owner_kind=owner_kind,
                    owner_id=owner_id,
                    target_kind=kind,
                    target_id=record_id,
                )
                .on_conflict_do_nothing()
            )
            return target

        def revision(kind, identity):
            return ref(kind, identity.revision_id, identity.logical_id)

        for evidence in evidence_in(value):
            ref("source", evidence.snapshot_id)
        if isinstance(value, SpatialImport):
            for snapshot in value.source_snapshot_ids:
                source = ref("source", snapshot)
                if source.category not in {"spatial", "test_fixture"}:
                    raise ValueError("Spatial import requires spatial source bytes")
            for observation in value.observations:
                source = ref("source", observation.snapshot_id)
                if (
                    source.source_id != observation.source_id
                    or source.source_url != observation.request_url
                    or source.reuse_constraints != observation.attribution
                ):
                    raise ValueError("Spatial observation source mismatch")
        if isinstance(value, RuleCandidate):
            for snapshot in value.source_snapshot_ids:
                ref("source", snapshot)
            ref("run", value.trace.run_id)
        content = getattr(value, "content", None)
        if content:
            for dependency in content.references:
                if dependency.target:
                    revision("rule", dependency.target)
        if isinstance(value, AcceptedRuleRevision):
            ref("candidate", value.candidate_id)
            for previous in value.supersedes:
                revision("rule", previous)
        if isinstance(value, PlacementRevision):
            site = revision("site", value.site)
            revision("design", value.design)
            parcel = next(f for f in site.geometry_facts if f.role == "parcel")
            if (
                parcel.geometry
                and value.footprint.geometry
                and parcel.geometry.crs != value.footprint.geometry.crs
            ):
                raise ValueError("Site and placement coordinate references disagree")
        if isinstance(value, DatasetReference):
            for snapshot in value.source_snapshot_ids:
                ref("source", snapshot)
            for snapshot in value.spatial_snapshot_ids:
                spatial = ref("source", snapshot)
                if spatial.category not in {"spatial", "test_fixture"}:
                    raise ValueError("Spatial snapshot must identify spatial source bytes")
            for alternative in value.alternatives:
                for identity in alternative.rules:
                    rule = revision("rule", identity)
                    if (rule.content.pathway_id, rule.content.alternative_id) != (
                        alternative.pathway_id,
                        alternative.alternative_id,
                    ):
                        raise ValueError("Rule assigned to incompatible alternative")
                    if any(
                        e.snapshot_id not in value.source_snapshot_ids for e in evidence_in(rule)
                    ):
                        raise ValueError("Rule evidence outside draft sources")
        if isinstance(value, EvaluationResult):
            draft = ref("draft", value.dataset.release_id, value.dataset.dataset_id)
            if draft != value.dataset:
                raise ValueError("Evaluation dataset differs from stored draft")
            revision("design", value.design)
            revision("site", value.site)
            placement = revision("placement", value.placement)
            if (placement.design, placement.site) != (value.design, value.site):
                raise ValueError("Evaluation inputs differ from supplied placement")
        if isinstance(value, ReviewEvent):
            ref(value.target.kind, value.target.record_id)

    def evaluation_inputs(self, evaluation_id: str):
        """Return exact stored inputs and rules, including superseded revisions."""
        with self.engine.connect() as connection:
            result = self._get(connection, "evaluation", evaluation_id)
            return {
                "evaluation": result,
                "design": self._get(connection, "design", result.design.revision_id),
                "site": self._get(connection, "site", result.site.revision_id),
                "placement": self._get(connection, "placement", result.placement.revision_id),
                "draft": self._get(connection, "draft", result.dataset.release_id),
                "rules": tuple(
                    self._get(connection, "rule", r.revision_id)
                    for a in result.dataset.alternatives
                    for r in a.rules
                ),
                "sources": tuple(
                    self._get(connection, "source", s) for s in result.dataset.source_snapshot_ids
                ),
            }
