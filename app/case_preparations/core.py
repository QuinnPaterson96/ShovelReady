"""Offline, case-specific preparation experiment; never an acceptance/evaluation engine."""

import hashlib
import json
from datetime import date
from pathlib import Path
from typing import Literal

from pydantic import AwareDatetime, ValidationError, model_validator

from app.contracts.common import (
    Contract,
    Digest,
    Evidence,
    Provenance,
    Quantity,
    Review,
    RevisionRef,
    SourceSnapshot,
    Text,
)
from app.contracts.inputs import (
    DesignRevision,
    GeometryFact,
    PlacementRevision,
    SiteRevision,
)
from app.contracts.rules import RuleContent, RuleReference
from app.evaluation.payloads import EvaluationRequest, InputRefs, MeasuredFact

DATA = Path(__file__).resolve().parent / "data"
ANNOTATIONS = DATA / "annotations.json"
MANIFEST = DATA / "sources.json"
VERSION = "sr-04.v1-provisional"


class Link(Contract):
    source_id: Text
    locator: Text


class Observation(Contract):
    observation_id: Text
    kind: Literal["separation", "rear_corner", "area", "threshold"]
    period: Text
    quantity: Quantity
    summary: Text
    links: tuple[Link, ...]


class ParcelClaim(Contract):
    value: Text
    link: Link


class RuleClaim(Contract):
    observation_id: Text
    conditions: tuple[Text, ...]
    references: tuple[RuleReference, ...]


class Annotations(Contract):
    schema_version: Literal["pilot-preparation.v1"]
    case_id: Literal["VIC-PC-002"]
    annotation_revision: Text
    authored_at: AwareDatetime
    source_manifest_sha256: Digest
    selected_period: Literal["2018-proposal"]
    design_date: date
    received_date: date
    historical_cutoff: date
    source_periods: dict[str, Literal["2018-proposal", "later-property", "current-context"]]
    observations: tuple[Observation, ...]
    parcel_claims: tuple[ParcelClaim, ...]
    rule_claims: tuple[RuleClaim, ...]

    @model_validator(mode="after")
    def identities(self):
        ids = [o.observation_id for o in self.observations]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate observation identity")
        rules = [r.observation_id for r in self.rule_claims]
        if len(rules) != len(set(rules)) or not set(rules) <= set(ids):
            raise ValueError("rule claims need unique existing observation identities")
        for o in self.observations:
            if not o.links or any(link.source_id not in self.source_periods for link in o.links):
                raise ValueError("observations require classified source links")
            if o.quantity.dimension != ("area" if o.kind == "area" else "length"):
                raise ValueError("observation dimension disagrees with its role")
        if any(p.link.source_id not in self.source_periods for p in self.parcel_claims):
            raise ValueError("parcel claims require classified source links")
        if any(o.kind != "threshold" for o in self.observations if o.observation_id in rules):
            raise ValueError("rule claims must refer to thresholds")
        return self


def digest(data: bytes) -> str:
    """Pin repository text portably across Git CRLF checkouts, not municipal bytes."""
    return hashlib.sha256(data.replace(b"\r\n", b"\n")).hexdigest()


def read_json(data: bytes):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError(f"duplicate JSON key: {key}")
            result[key] = value
        return result

    def nonfinite(value):
        raise ValueError(f"nonfinite JSON number: {value}")

    return json.loads(data, object_pairs_hook=pairs, parse_constant=nonfinite)


def diagnose(annotation_bytes: bytes, manifest_bytes: bytes) -> dict:
    annotation = Annotations.model_validate(read_json(annotation_bytes))
    manifest = read_json(manifest_bytes)
    if digest(manifest_bytes) != annotation.source_manifest_sha256:
        raise ValueError("research manifest changed: review annotations and repin explicitly")
    sources = {s["source_id"]: s for s in manifest["sources"]}
    if (
        len(sources) != len(manifest["sources"])
        or not annotation.source_periods.keys() <= sources.keys()
    ):
        raise ValueError("missing or duplicate manifest source identities")
    if manifest["case_id"] != annotation.case_id or manifest["review_status"] != "provisional":
        raise ValueError("this adapter requires the provisional Pilot research packet")
    for source_id, period in annotation.source_periods.items():
        source = sources[source_id]
        dates = [p["application_date"] for p in source.get("permit_observations", [])]
        if source.get("reported_sale_date"):
            dates.append(source["reported_sale_date"])
        if dates and min(dates) > annotation.historical_cutoff.isoformat():
            if period != "later-property":
                raise ValueError(
                    f"{source_id}: later dated evidence cannot be relabelled historical"
                )
        if source["type"] == "office_consolidation" and period != "current-context":
            raise ValueError(f"{source_id}: current bylaw copy cannot be relabelled historical")
    if (annotation.design_date.isoformat(), annotation.received_date.isoformat()) != (
        sources["PM-PLAN"]["printed_or_revision_date"],
        sources["PM-PLAN"]["received_date"],
    ) or annotation.historical_cutoff.isoformat() != manifest["historical_cutoff"]:
        raise ValueError("selected proposal dates disagree with the pinned research manifest")
    observations = {o.observation_id: o for o in annotation.observations}
    annotation_hash = digest(annotation_bytes)
    annotation_id = f"pilot-annotation:{annotation_hash}"
    review = Review(
        status="unreviewed",
        scope="manual research annotation",
        rationale="No independent source, measurement or rule acceptance supplied.",
    )
    diagnostics, attempts = [], []

    def citations(links):
        return [
            {**link.model_dump(), "url": sources[link.source_id]["primary_url"]} for link in links
        ]

    def gap(code, detail, links, next_artifact, scope="historical_preparation"):
        diagnostics.append(
            dict(
                code=code,
                detail=detail,
                sources=citations(links),
                next_artifact=next_artifact,
                scope=scope,
            )
        )

    def provenance(locator, excerpt, reason):
        # This evidence cites our annotation, never masquerades as an original-source excerpt.
        return Provenance(
            method="manual",
            evidence=(
                Evidence(
                    snapshot_id=annotation_id,
                    locator=locator,
                    excerpt=excerpt,
                    context="Manual research annotation; municipal links are in diagnostics.",
                ),
            ),
            review=review,
            uncertainty=(reason,),
        )

    plan_links = [Link(source_id="PM-PLAN", locator="p1/A-1 selected July/August proposal")]
    common_provenance = provenance(
        "selected_period",
        annotation.selected_period,
        "Historical proposal only; source and endpoint review absent.",
    )
    refs = InputRefs(
        **{
            name: RevisionRef(
                logical_id=f"pilot-2018-{name}", revision_id=annotation.annotation_revision
            )
            for name in ("design", "site", "placement")
        }
    )
    facts, retained = [], []
    for obs in annotation.observations:
        compatible = obs.period == annotation.selected_period and all(
            annotation.source_periods[link.source_id] == annotation.selected_period
            for link in obs.links
        )
        retained.append(
            {
                **obs.model_dump(mode="json"),
                "sources": citations(obs.links),
                "eligible_for_historical_fact_fragment": compatible and obs.kind != "threshold",
            }
        )
        if obs.kind == "threshold":
            if obs.period != annotation.selected_period or any(
                annotation.source_periods[link.source_id] == "later-property" for link in obs.links
            ):
                gap(
                    "incompatible_period",
                    f"{obs.observation_id} cannot supply historical law.",
                    obs.links,
                    "Historically applicable instrument and measurement definition.",
                )
            continue  # A threshold claim is never a measured site fact.
        if not compatible:
            gap(
                "incompatible_period",
                f"{obs.observation_id} cannot describe selected placement.",
                obs.links,
                "Evidence tied to the July 30/August 7, 2018 configuration.",
            )
            continue
        facts.append(
            MeasuredFact(
                identity=RevisionRef(
                    logical_id=obs.observation_id, revision_id=annotation.annotation_revision
                ),
                inputs=refs,
                definition=obs.summary,
                status="uncertain",
                quantity=obs.quantity,
                reason="Research observation only; legal measurement basis and review unresolved.",
                provenance=provenance(
                    f"observations/{obs.observation_id}",
                    obs.summary,
                    "Not an accepted measurement or source interpretation.",
                ),
            )
        )

    areas = [o for o in annotation.observations if o.kind == "area"]
    if len({(o.quantity.value, o.quantity.unit) for o in areas}) > 1:
        gap(
            "conflicting_area",
            "Distinct area observations retained; no canonical area selected.",
            [link for o in areas for link in o.links],
            "Reviewed operative area label/revision and historical regulatory measurement basis.",
        )
    if len({p.value for p in annotation.parcel_claims}) > 1:
        gap(
            "parcel_identity_conflict",
            "Legal plan claims disagree: " + ", ".join(p.value for p in annotation.parcel_claims),
            [p.link for p in annotation.parcel_claims],
            "Authoritative parcel/survey reconciliation of the plan-number discrepancy.",
        )

    later = sources["PM-PIP"].get("permit_observations", [])
    replacement = [p for p in later if p["permit_id"] in {"BP055452", "BP055453"}]
    if replacement:
        gap(
            "later_house_configuration",
            "Later new-house/demolition records cannot provide "
            "2018 placement dimensions; application dates are not completion dates.",
            [Link(source_id="PM-PIP", locator=p["permit_id"]) for p in replacement],
            "For any later placement: controlled BP055452/BP055393 site plans and exact revisions.",
        )

    def missing_geometry(role):
        return GeometryFact(
            fact_id=f"pilot-2018-{role}",
            role=role,
            status="missing",
            geometry=None,
            reason="No retained coordinate geometry supplied.",
            lot_line_classification="unknown" if role == "lot_line" else None,
            provenance=common_provenance,
        )

    design = DesignRevision(
        schema_version=VERSION,
        identity=refs.design,
        configuration="Frozen July 30 drawing received August 7, 2018; south addition",
        adaptability="fixed",
        intended_use="garden suite",
        construction_method="unknown",
        measurements=(
            {
                "name": "regulatory_floor_area",
                "domain": "regulatory",
                "definition": "Historical regulatory floor area: unresolved",
                "status": "uncertain",
                "quantity": None,
                "reason": "No reviewed canonical area or measurement basis.",
                "provenance": common_provenance,
            },
        ),
        provenance=common_provenance,
    )
    site = SiteRevision(
        schema_version=VERSION,
        identity=refs.site,
        jurisdiction="Victoria, BC",
        measurements=(),
        geometry_facts=tuple(
            missing_geometry(role)
            for role in ("parcel", "principal_building", "lot_line", "rear_yard")
        ),
        conditions=("Historical use, secondary suite and conversion scope unknown.",),
        provenance=common_provenance,
    )
    placement = PlacementRevision(
        schema_version=VERSION,
        identity=refs.placement,
        site=refs.site,
        design=refs.design,
        footprint=missing_geometry("proposed_placement"),
        scope="supplied_placement_only",
    )
    gap(
        "missing_geometry_and_review",
        "All required geometry roles remain explicitly missing; "
        "fact definitions and scope remain unreviewed.",
        plan_links,
        "Source-backed coordinate geometry, endpoints/exclusions and attributed input review.",
    )
    gap(
        "annotation_only_provenance",
        "Fragment Evidence refers to this manual annotation identity, "
        "not to a captured municipal snapshot. No complete source-backed bindings are supplied.",
        plan_links,
        "Reviewed original-source Evidence and exact rule/fact/input bindings. "
        "An annotation hash identifies our notes only.",
    )

    rule_payloads = []
    for claim in annotation.rule_claims:
        obs = observations[claim.observation_id]
        content = RuleContent(
            pathway_id="historical-proposal",
            alternative_id="south-addition",
            text=obs.summary,
            evidence=provenance(
                f"observations/{obs.observation_id}", obs.summary, "Unaccepted claim."
            ).evidence,
            applicability=dict(
                jurisdiction="Victoria, BC",
                use="garden suite",
                building_role="garden_suite",
                conditions=claim.conditions,
                exceptions=(),
                status="unresolved",
            ),
            approval="unknown",
            semantics=dict(
                kind="unresolved",
                text=obs.summary,
                reason="Historical law, scope and endpoint definition are not reviewed.",
            ),
            runtime_support="unresolved",
            references=claim.references,
        )
        rule_payloads.append(
            dict(
                schema_version=VERSION,
                identity=RevisionRef(
                    logical_id=obs.observation_id, revision_id=annotation.annotation_revision
                ).model_dump(),
                candidate_id=f"manual-claim:{obs.observation_id}",
                content=content.model_dump(),
                review=review.model_dump(),
                supersedes=(),
                identity_decision="Research annotation identity only; no accepted rule identity.",
            )
        )
        gap(
            "unaccepted_rule",
            f"{obs.observation_id}: {obs.quantity.value} {obs.quantity.unit}; "
            "provisional claim cannot be an AcceptedRuleRevision.",
            obs.links,
            "Historical source/definition review and attributed acceptance of an exact revision.",
        )
        if claim.references or claim.conditions:
            gap(
                "unresolved_rule_dependencies",
                f"{obs.observation_id}: conditions/references retained; "
                "current scalar evaluator cannot execute them even if references become resolved.",
                obs.links,
                "Historical scope/final instrument review; separately scoped semantics "
                "work only after evidence establishes what must execute.",
            )

    source_payloads = []
    for source_id in sorted(annotation.source_periods):
        source = sources[source_id]
        payload = dict(
            schema_version=VERSION,
            source_id=source_id,
            snapshot_id=source_id,
            category=(
                "design"
                if source_id == "PM-PLAN"
                else "bylaw"
                if source["type"] == "office_consolidation"
                else "guidance"
            ),
            jurisdiction="Victoria, BC",
            instrument=source["title"],
            source_url=source["primary_url"],
            artifact={},
            printed_revision=source["printed_or_revision_date"],
            effective_from=None,
            effective_to=None,
            effective_date_evidence=(),
            original_crs=None,
            original_units=(),
            reuse_constraints=source["rights_retention_disposition"],
            review=review.model_dump(),
        )
        # Historical logged metadata retained, never reverified original bytes in this run.
        if source["sha256"]:
            payload["artifact"]["sha256"] = source["sha256"]
        if source["retrieved_at"]:
            payload["captured_at"] = source["retrieved_at"]
        if annotation.source_periods[source_id] == annotation.selected_period:
            source_payloads.append(payload)
        links = [Link(source_id=source_id, locator="; ".join(source["locators"]))]
        try:
            SourceSnapshot.model_validate(payload)
        except ValidationError as exc:
            errors = exc.errors(include_input=False, include_context=False, include_url=False)
            attempts.append(
                dict(
                    boundary="SourceSnapshot",
                    item=source_id,
                    errors=errors,
                    sources=citations(links),
                    attempted_payload=payload,
                    period=annotation.source_periods[source_id],
                )
            )
            gap(
                "missing_original_source",
                f"{source_id}: " + ", ".join(".".join(map(str, e["loc"])) for e in errors),
                links,
                "Authorized retained source artifact and verified capture/hash metadata; "
                "do not substitute the annotation hash.",
                scope=(
                    "historical_preparation"
                    if annotation.source_periods[source_id] == annotation.selected_period
                    else "context_only_not_required_for_historical_request"
                ),
            )

    request = dict(
        schema_version="sr-10.v1",
        evaluator_version="bounded-scalar.v1",
        evaluation_id="pilot-historical-preparation",
        draft=refs.design.model_dump(),
        data_state="draft_only",
        sources=source_payloads,
        design=design.model_dump(),
        site=site.model_dump(),
        placement=placement.model_dump(),
        scope=dict(
            jurisdiction="Victoria, BC",
            use="garden suite",
            building_role="garden_suite",
            coverage="unresolved",
            description="Historical proposal only",
            exclusions=("Current permission", "Prefab fit", "Automatic placement"),
            provenance=common_provenance.model_dump(),
        ),
        alternatives=[
            dict(
                pathway_id="historical-proposal",
                alternative_id="south-addition",
                rules=[r["identity"] for r in rule_payloads],
            )
        ],
        rules=rule_payloads,
        facts=[f.model_dump() for f in facts],
        bindings=[],
    )
    try:
        EvaluationRequest.model_validate(request)
    except ValidationError as exc:
        errors = exc.errors(include_input=False, include_context=False, include_url=False)
        for error in errors:
            path = error["loc"]
            if len(path) > 1 and path[0] == "rules":
                links = observations[annotation.rule_claims[path[1]].observation_id].links
            elif len(path) > 1 and path[0] == "sources":
                source = sources[source_payloads[path[1]]["source_id"]]
                links = [Link(source_id=source["source_id"], locator="; ".join(source["locators"]))]
            else:
                links = plan_links
            error["sources"] = citations(links)
        attempts.append(
            dict(
                boundary="EvaluationRequest",
                item=annotation.case_id,
                errors=errors,
                sources=citations([link for o in annotation.observations for link in o.links]),
            )
        )
    else:
        # This case has no retained municipal artifacts or accepted rules. Unexpected success
        # signals changed contracts, not permission to silently turn this tool into an evaluator.
        raise RuntimeError("boundary unexpectedly accepted provisional preparation; review adapter")

    return dict(
        schema_version="pilot-preparation.v1",
        case_id=annotation.case_id,
        status="evaluation_not_run",
        annotation_revision=annotation.annotation_revision,
        annotation_text_sha256=annotation_hash,
        source_manifest_text_sha256=digest(manifest_bytes),
        hash_basis="UTF-8 repository text with CRLF normalized to LF; not municipal-source hashes",
        selected_period=annotation.selected_period,
        design_date=annotation.design_date.isoformat(),
        received_date=annotation.received_date.isoformat(),
        historical_cutoff=annotation.historical_cutoff.isoformat(),
        retained_observations=retained,
        parcel_claims=[p.model_dump() for p in annotation.parcel_claims],
        later_permit_observations=later,
        mapped_fragments=dict(
            inputs=refs.model_dump(mode="json"),
            facts=[f.model_dump(mode="json") for f in facts],
            design=design.model_dump(mode="json"),
            site=site.model_dump(mode="json"),
            placement=placement.model_dump(mode="json"),
            rule_contents=[
                RuleContent.model_validate(r["content"]).model_dump(mode="json")
                for r in rule_payloads
            ],
        ),
        boundary_attempts=attempts,
        diagnostics=diagnostics,
    )


def render_human(result):
    lines = [
        f"{result['case_id']}: {result['status']}",
        f"Selected: {result['design_date']} proposal, received {result['received_date']}",
        f"Retained {len(result['retained_observations'])} observations; mapped "
        f"{len(result['mapped_fragments']['facts'])} uncertain fact fragments.",
    ]
    for obs in result["retained_observations"]:
        quantity = obs["quantity"]
        state = (
            "uncertain fact" if obs["eligible_for_historical_fact_fragment"] else "claim/context"
        )
        lines.append(f"  {obs['observation_id']}: {quantity['value']} {quantity['unit']} ({state})")
    shown_actions = set()
    for issue in result["diagnostics"]:
        if issue["code"] == "missing_original_source":
            continue  # Exact missing paths listed once in boundary attempts below.
        refs = ", ".join(dict.fromkeys(s["source_id"] for s in issue["sources"]))
        lines.append(f"- {issue['code']}: {issue['detail']} [{refs}]")
        if issue["next_artifact"] not in shown_actions:
            lines.append(f"  Next: {issue['next_artifact']}")
            shown_actions.add(issue["next_artifact"])
    for attempt in result["boundary_attempts"]:
        paths = ", ".join(".".join(map(str, e["loc"])) or "<root>" for e in attempt["errors"])
        period = f" ({attempt['period']})" if "period" in attempt else ""
        lines.append(f"Validation {attempt['boundary']} {attempt['item']}{period}: {paths}")
    lines.append(
        "Source next step: authorized retained artifacts and verified capture metadata. "
        "Later/current context snapshots are not required for the historical request."
    )
    lines.append(
        "JSON includes exact source URLs/locators, validation messages and mapped fragments."
    )
    lines.append("No EvaluationReport, acceptance, publication or legal outcome produced.")
    return "\n".join(lines)
