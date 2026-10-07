"""Stateless candidate packet adapter; clients cannot supply rules or source URLs."""

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi import Request as HttpRequest
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from .core import evaluate
from .payloads import Fact, Request, Result, Rule, Source

router = APIRouter(prefix="/api/conditional-screening/v1", tags=["conditional-screening"])
_PACKET = (
    Path(__file__).resolve().parents[2]
    / "docs/rule-packets/victoria-garden-suite-scouting/packet.json"
)
_MAX_BYTES = 131_072


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class UserFact(Strict):
    value: str | bool | int | None
    origin: Literal["user", "journey_default"]
    evidence_state: Literal["assumed", "user_confirmed", "unknown"] | None = None
    note: str | None = Field(default=None, max_length=1000)


    @model_validator(mode="after")
    def evidence(self):
        if self.evidence_state == "unknown" and self.value is not None:
            raise ValueError("unknown fact cannot have a value")
        if self.evidence_state == "user_confirmed" and (
            self.origin != "user" or self.value is None
        ):
            raise ValueError("confirmation needs a user value")
        if self.origin == "journey_default" and (
            self.evidence_state != "assumed" or self.value is None
        ):
            raise ValueError("journey default needs an explicit assumption")
        return self


class Edge(Strict):
    id: str = Field(min_length=1, max_length=240)
    ring: int = Field(ge=0)
    segment: int = Field(ge=0)
    start: tuple[float, float]
    end: tuple[float, float]
    role: UserFact

    @model_validator(mode="after")
    def finite_coordinates(self):
        if not all(math.isfinite(x) for point in (self.start, self.end) for x in point):
            raise ValueError("edge coordinates must be finite")
        if self.start == self.end:
            raise ValueError("edge has zero length")
        return self


class Measurement(Strict):
    value: float = Field(ge=0, allow_inf_nan=False)
    unit: Literal["m", "m2"]
    basis: Literal[
        "proposed_wall_to_lot_line",
        "principal_wall_to_proposed_wall",
        "regulatory_floor_area",
        "rough_floor_area_estimate",
    ]
    origin: Literal["user"]
    note: str | None = Field(default=None, max_length=1000)
    placement_revision: str = Field(min_length=1, max_length=240)


class Measurements(Strict):
    boundary: dict[str, Measurement] = Field(max_length=64)
    principal_separation: Measurement | None
    floor_area: Measurement | None


class Property(Strict):
    case_id: str = Field(min_length=1, max_length=240)
    parcel_id: str = Field(min_length=1, max_length=240)
    geometry_revision: str = Field(min_length=1, max_length=240)
    crs: str = Field(min_length=1, max_length=80)
    source: dict
    capture: dict


class ObservedBuilding(Strict):
    id: str = Field(min_length=1, max_length=240)
    basis: Literal["roofline", "wall", "unknown"]
    source: dict


class StreetAdjacency(Strict):
    edge_ids: tuple[str, ...] = Field(max_length=64)
    all_marked: bool
    completion_method: Literal["explicit_confirmation", "advance"] | None = None
    origin: Literal["user"]


class BoundaryRoleSuggestions(Strict):
    roles: dict[str, Literal["front", "rear", "side", "flanking_street"]] = Field(max_length=64)
    conflicts: tuple[str, ...] = Field(max_length=8)
    basis: Literal["user_marks"]


class Assumptions(Strict):
    planning_buffers_m: dict[str, float] = Field(default_factory=dict, max_length=64)
    waterfront_edge_ids: tuple[str, ...] = Field(default=(), max_length=64)
    infer_principal_building: bool = True
    boundary_role_suggestions: BoundaryRoleSuggestions | None = None
    street_adjacency: StreetAdjacency | None = None
    schema_version: Literal["sr.zoning-site-assumptions.v1"]
    property: Property
    observed_buildings: tuple[ObservedBuilding, ...] = Field(max_length=64)
    edges: tuple[Edge, ...] = Field(max_length=64)
    building_type: UserFact
    existing_garden_suites: UserFact
    principal_building_id: UserFact
    waterfront: UserFact
    measurements: Measurements
    placement_revision: str = Field(min_length=1, max_length=240)
    limitations: tuple[str, ...] = Field(max_length=32)

    @model_validator(mode="after")
    def references(self):
        if self.building_type.value not in (None, "single_detached", "duplex", "other"):
            raise ValueError("invalid building type")
        other_facts = (self.building_type,
                       *(edge.role for edge in self.edges))
        if any(fact.origin == "journey_default" for fact in other_facts):
            raise ValueError("only suite count, main outline and non-waterfront support defaults")
        if self.waterfront.origin == "journey_default" and self.waterfront.value is not False:
            raise ValueError("only non-waterfront supports a labelled planning default")
        count = self.existing_garden_suites.value
        if not (count is None or type(count) is int and count in (0, 1)
                or count == "two_or_more"):
            raise ValueError("invalid existing suite count")
        if self.waterfront.value is not None and type(self.waterfront.value) is not bool:
            raise ValueError("waterfront must be yes, no, or unknown")
        if self.principal_building_id.value is not None and not isinstance(
            self.principal_building_id.value, str
        ):
            raise ValueError("principal building id must be text or unknown")
        if any(edge.role.value not in (None, "unknown", "front", "rear", "side",
                                       "flanking_street") for edge in self.edges):
            raise ValueError("invalid edge role")
        ids = [edge.id for edge in self.edges]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate edge")
        if any(
            not edge.id.startswith(self.property.geometry_revision + ":") for edge in self.edges
        ):
            raise ValueError("edge does not reference supplied geometry revision")
        if not self.measurements.boundary.keys() <= set(ids):
            raise ValueError("boundary measurement references absent edge")
        if not self.planning_buffers_m.keys() <= set(ids) or any(
            not math.isfinite(value) or value < 0 for value in self.planning_buffers_m.values()
        ):
            raise ValueError("planning buffers need existing edges and finite nonnegative metres")
        exterior_ids = {edge.id for edge in self.edges if edge.ring == 0}
        if (len(self.waterfront_edge_ids) != len(set(self.waterfront_edge_ids))
                or not set(self.waterfront_edge_ids) <= exterior_ids):
            raise ValueError("waterfront marks must reference distinct exterior edges")
        if self.waterfront.value is False and self.waterfront_edge_ids:
            raise ValueError("a non-waterfront lot cannot have water-adjoining edge marks")
        if self.street_adjacency:
            street_ids = self.street_adjacency.edge_ids
            exterior_ids = {edge.id for edge in self.edges if edge.ring == 0}
            if len(street_ids) != len(set(street_ids)) or not set(street_ids) <= exterior_ids:
                raise ValueError("street adjacency must reference distinct exterior edges")
        if self.boundary_role_suggestions:
            if not self.boundary_role_suggestions.roles.keys() <= set(ids):
                raise ValueError("boundary suggestion references absent edge")
        all_measurements = (
            *self.measurements.boundary.values(),
            self.measurements.principal_separation,
            self.measurements.floor_area,
        )
        if any(
            item is not None and item.placement_revision != self.placement_revision
            for item in all_measurements
        ):
            raise ValueError("measurement references stale placement")
        return self


class Proposal(Strict):
    proposed_use: Literal["garden_suite", "other"] | None = None
    foundation_attached: bool | None = None
    confirmed_zone: Literal["GRD-1", "GRD-1 (PGA)", "other"] | None = None
    confirmed_instrument: Literal["Zoning Bylaw 2018", "other"] | None = None
    legal_lot_confirmed: bool | None = None
    floor_area_definition_acknowledged: bool | None = None
    no_relevant_projections: bool | None = None


class SettingEvidence(Strict):
    value: str | bool | None
    origin: Literal[
        "journey_default", "user", "user_confirmed", "municipal_lookup", "derived", "unknown"
    ]
    source: Source | None = None
    note: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def provenance(self):
        if self.origin == "municipal_lookup" and self.source is None:
            raise ValueError("municipal lookup needs a source")
        if self.origin != "municipal_lookup" and self.source is not None:
            raise ValueError("only municipal lookup may carry municipal source")
        if self.origin == "unknown" and self.value is not None:
            raise ValueError("unknown setting cannot have a value")
        return self


class ProposalEvidence(Strict):
    proposed_use: SettingEvidence
    foundation_attached: SettingEvidence
    confirmed_zone: SettingEvidence
    confirmed_instrument: SettingEvidence
    legal_lot_confirmed: SettingEvidence
    floor_area_definition_acknowledged: SettingEvidence
    no_relevant_projections: SettingEvidence

    def matches(self, proposal: Proposal):
        for name in type(self).model_fields:
            item = getattr(self, name)
            if item.value != getattr(proposal, name):
                raise ValueError(f"{name} provenance does not match proposal")
            if item.origin == "journey_default" and name not in (
                "proposed_use", "foundation_attached"
            ):
                raise ValueError("this setting cannot acquire a favourable default")
            if item.origin == "municipal_lookup" and name not in (
                "confirmed_zone", "confirmed_instrument"
            ):
                raise ValueError("municipal lookup cannot assert this setting")


class ApiRequest(Strict):
    schema_version: Literal["conditional-screening.api.v1"]
    assumptions: Assumptions
    model_revision: str = Field(min_length=1, max_length=240)
    proposal: Proposal
    proposal_evidence: ProposalEvidence | None = None

    @model_validator(mode="after")
    def matching_evidence(self):
        if self.proposal_evidence is not None:
            self.proposal_evidence.matches(self.proposal)
        return self


@lru_cache(maxsize=1)
def _packet() -> dict:
    packet = json.loads(_PACKET.read_text(encoding="utf-8"))
    if (
        packet.get("schema_version") != "victoria-garden-suite-scouting.candidate.v1"
        or packet.get("status") != "agent_mapped_unreviewed_unpublished"
        or packet.get("source", {}).get("accepted_release_id") is not None
    ):
        raise RuntimeError("unsupported candidate packet state")
    return packet


def _source(packet: dict, rule: dict) -> Source:
    raw = packet["source"]
    return Source(
        provider=raw["provider"],
        record_label=raw["instrument"],
        url=raw["url"],
        locator="; ".join(rule["source_locators"]),
        capture_date=raw["captured_at_utc"],
        source_revision="; ".join(raw["revision_evidence"]),
        currentness_limitations=(
            "Conflicting PDF consolidation labels; exact effective interval is unresolved.",
            "Independent legal interpretation and parcel applicability review are pending.",
        ),
        review_status="candidate",
    )


def _fact(name: str, value: bool | None, note: str | None = None,
          evidence: SettingEvidence | None = None) -> Fact:
    origins = {"journey_default": "journey_default", "user": "user_assumption",
               "user_confirmed": "user_confirmed", "municipal_lookup": "municipal_observation",
               "derived": "derived_assumption",
               "unknown": "user_assumption"}
    return Fact(
        id=name,
        status="known" if value is not None else "unknown",
        truth=value,
        origin=origins[evidence.origin] if evidence else "user_assumption",
        source=evidence.source if evidence else None,
        note=evidence.note if evidence else note,
    )


def _complete_exterior(edges: tuple[Edge, ...]) -> bool:
    exterior = sorted((edge for edge in edges if edge.ring == 0), key=lambda edge: edge.segment)
    if len(exterior) < 3 or any(edge.ring != 0 for edge in edges):
        return False
    if [edge.segment for edge in exterior] != list(range(len(exterior))):
        return False
    return all(
        edge.end == exterior[(index + 1) % len(exterior)].start
        for index, edge in enumerate(exterior)
    )


def _rule(
    packet: dict,
    packet_rule: dict,
    *,
    kind: str,
    fact_id: str,
    role: str | None = None,
    applicability: str = "applicable",
    applicability_reason: str | None = None,
    required: tuple[str, ...] = (),
    exceptions: tuple[str, ...] = (),
) -> Rule:
    normalized = packet_rule.get("normalized", {})
    numeric = kind != "prerequisite"
    return Rule(
        logical_id=f"{packet_rule['logical_rule_id']}:{fact_id}",
        revision_id=packet_rule["proposed_revision_id"],
        kind=kind,
        fact_id=fact_id,
        expected=True if not numeric else None,
        threshold=({"value": normalized["value"], "unit": normalized["unit"]} if numeric else None),
        measurement_definition=packet_rule["measurement_basis"] if numeric else None,
        boundary_role=role,
        source=_source(packet, packet_rule),
        applicability=applicability,
        applicability_reason=applicability_reason,
        required_pathway_facts=required,
        unsupported_if_true=exceptions,
    )


def _assemble(body: ApiRequest) -> Request:
    packet = _packet()
    rules_by_suffix = {r["logical_rule_id"].rsplit("-", 1)[-1]: r for r in packet["rules"]}
    by_id = {r["logical_rule_id"]: r for r in packet["rules"]}
    pathway = by_id["victoria-zb2018-garden-suite-use-pathway"]
    count = by_id["victoria-zb2018-garden-suite-count"]
    setback = by_id["victoria-zb2018-garden-suite-side-rear-setback"]
    flanking = by_id["victoria-zb2018-garden-suite-flanking-setback"]
    separation = by_id["victoria-zb2018-garden-suite-principal-separation"]
    floor = by_id["victoria-zb2018-garden-suite-floor-area"]
    del rules_by_suffix

    assumptions, proposal = body.assumptions, body.proposal
    facts: list[Fact] = []
    rules: list[Rule] = []

    assertions = {
        "legal_lot": proposal.legal_lot_confirmed,
        "zone": (None if proposal.confirmed_zone is None
                 else proposal.confirmed_zone in ("GRD-1", "GRD-1 (PGA)")),
        "instrument": (
            None
            if proposal.confirmed_instrument is None
            else proposal.confirmed_instrument == "Zoning Bylaw 2018"
        ),
        "proposed_use": None
        if proposal.proposed_use is None
        else proposal.proposed_use == "garden_suite",
        "foundation": proposal.foundation_attached,
        "building_type": None
        if assumptions.building_type.value is None
        else assumptions.building_type.value in ("single_detached", "duplex"),
        "principal_building": None
        if (assumptions.principal_building_id.value is None
            or assumptions.principal_building_id.origin == "journey_default")
        else assumptions.principal_building_id.value
        in {building.id for building in assumptions.observed_buildings},
        "floor_area_definition": proposal.floor_area_definition_acknowledged,
        "no_relevant_projections": proposal.no_relevant_projections,
        "waterfront": None if assumptions.waterfront.origin == "journey_default"
        else assumptions.waterfront.value,
    }
    notes = {
        "building_type": assumptions.building_type.note,
        "principal_building": assumptions.principal_building_id.note,
        "waterfront": assumptions.waterfront.note,
    }
    proposal_names = {"legal_lot": "legal_lot_confirmed", "zone": "confirmed_zone",
                      "instrument": "confirmed_instrument", "proposed_use": "proposed_use",
                      "foundation": "foundation_attached",
                      "floor_area_definition": "floor_area_definition_acknowledged",
                      "no_relevant_projections": "no_relevant_projections"}
    for name, value in assertions.items():
        evidence = (getattr(body.proposal_evidence, proposal_names[name])
                    if body.proposal_evidence and name in proposal_names else None)
        if name in ("building_type", "principal_building", "waterfront"):
            user_fact = getattr(assumptions, "principal_building_id"
                                if name == "principal_building" else name)
            evidence = SettingEvidence(
                value=user_fact.value,
                origin="journey_default" if user_fact.origin == "journey_default"
                else "user_confirmed" if user_fact.evidence_state == "user_confirmed"
                else "user",
                note=user_fact.note,
            )
        facts.append(_fact(name, value, notes.get(name), evidence))
    for name in (
        "legal_lot",
        "zone",
        "instrument",
        "proposed_use",
        "foundation",
        "building_type",
        "principal_building",
    ):
        rules.append(_rule(packet, pathway, kind="prerequisite", fact_id=name))

    existing = assumptions.existing_garden_suites.value
    total = {0: 1, 1: 2, "two_or_more": 3}.get(existing)
    facts.append(
        Fact(
            id="proposed_suite_total",
            status="known" if total is not None else "unknown",
            quantity={"value": total, "unit": "count"} if total is not None else None,
            measurement_definition=count["measurement_basis"],
            origin=(
                "journey_default"
                if assumptions.existing_garden_suites.origin == "journey_default"
                else "user_confirmed"
                if assumptions.existing_garden_suites.evidence_state == "user_confirmed"
                else "user_assumption"
            ),
            note=(
                "Existing suite count plus one proposed suite; "
                "two_or_more uses a lower bound of three. "
                f"User note: {assumptions.existing_garden_suites.note or 'none'}"
            ),
        )
    )
    rules.append(
        _rule(
            packet, count, kind="count_max", fact_id="proposed_suite_total", required=("legal_lot",)
        )
    )

    for edge in assumptions.edges:
        role = edge.role.value
        if role == "unknown" or role is None:
            fact_id = f"edge_role:{edge.id}"
            facts.append(_fact(fact_id, None))
            rules.append(_rule(packet, setback, kind="prerequisite", fact_id=fact_id))
            continue
        if role not in ("side", "rear", "flanking_street"):
            continue
        selected = flanking if role == "flanking_street" else setback
        fact_id = f"boundary:{edge.id}"
        measured = assumptions.measurements.boundary.get(edge.id)
        valid = measured and measured.basis == "proposed_wall_to_lot_line" and measured.unit == "m"
        facts.append(
            Fact(
                id=fact_id,
                status="known" if valid else "unknown",
                quantity={"value": str(measured.value), "unit": "m"} if valid else None,
                measurement_definition=selected["measurement_basis"],
                boundary_role=role,
                geometry_basis="wall",
                origin="user_measurement",
                note=(
                    f"Edge role note: {edge.role.note or 'none'}; "
                    f"measurement note: {measured.note if measured else 'none'}"
                ),
            )
        )
        rules.append(
            _rule(
                packet,
                selected,
                kind="boundary_min",
                fact_id=fact_id,
                role=role,
                required=("no_relevant_projections",),
                exceptions=("waterfront",),
            )
        )

    if not any(e.role.value == "flanking_street" for e in assumptions.edges):
        unknown = (
            not _complete_exterior(assumptions.edges)
            or any(e.role.value in (None, "unknown") for e in assumptions.edges)
        )
        rules.append(
            _rule(
                packet,
                flanking,
                kind="boundary_min",
                fact_id="flanking_presence",
                role="flanking_street",
                applicability="unknown" if unknown else "not_applicable",
                applicability_reason=(
                "Missing or unsupported edge arrangement may include a flanking street line"
                    if unknown
                    else "All supplied edges are classified and none is a flanking street line"
                ),
            )
        )

    measured = assumptions.measurements.principal_separation
    valid = (
        measured and measured.basis == "principal_wall_to_proposed_wall" and measured.unit == "m"
    )
    facts.append(
        Fact(
            id="principal_separation",
            status="known" if valid else "unknown",
            quantity={"value": str(measured.value), "unit": "m"} if valid else None,
            measurement_definition=separation["measurement_basis"],
            geometry_basis="wall",
            origin="user_measurement",
            note=measured.note if measured else None,
        )
    )
    rules.append(
        _rule(
            packet,
            separation,
            kind="separation_min",
            fact_id="principal_separation",
            applicability="unknown",
            applicability_reason=(
                "Source review has not established separation measurement endpoints"
            ),
        )
    )

    measured = assumptions.measurements.floor_area
    valid = measured and measured.basis == "regulatory_floor_area" and measured.unit == "m2"
    facts.append(
        Fact(
            id="floor_area",
            status="known" if valid else "unknown",
            quantity={"value": str(measured.value), "unit": "m2"} if valid else None,
            measurement_definition=floor["measurement_basis"],
            origin="user_measurement",
            note=measured.note if measured else None,
        )
    )
    rules.append(
        _rule(
            packet,
            floor,
            kind="area_max",
            fact_id="floor_area",
            required=("floor_area_definition",),
        )
    )

    return Request(
        schema_version="conditional-screening.v1",
        packet_id=packet["packet_id"],
        packet_revision=packet["packet_revision"],
        property_revision=(
            f"{assumptions.property.case_id}:{assumptions.property.parcel_id}:"
            f"{assumptions.property.geometry_revision}"
        ),
        placement_revision=assumptions.placement_revision,
        model_revision=body.model_revision,
        rules=tuple(rules),
        facts=tuple(facts),
        scope_limitations=(
            *assumptions.limitations,
            "City rule packet is agent mapped, unreviewed, unpublished, "
            "and not complete bylaw coverage.",
            "Lot-line roles and distances are user assumptions, not surveyed legal measurements.",
            "Floor area comparison assumes the user's Part 2.1 inclusion/exclusion "
            "basis; no controlled schedule was supplied.",
            "Principal-building separation endpoints remain unresolved; "
            "supplied distance is observational.",
            *(
                f"Outstanding: {item['id']} — {item['reason']}"
                for item in packet["outstanding_checks"]
            ),
        ),
        site_assumptions=assumptions.model_dump(mode="json"),
        proposal_evidence=(body.proposal_evidence.model_dump(mode="json")
                           if body.proposal_evidence else None),
    )


@router.post("/evaluate", response_model=Result)
async def conditional_evaluate(request: HttpRequest) -> Result:
    try:
        declared_length = int(request.headers.get("content-length", "0"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="invalid content length") from exc
    if declared_length > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="request too large")
    raw = await request.body()
    if len(raw) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="request too large")
    try:
        body = ApiRequest.model_validate_json(raw)
        return evaluate(_assemble(body))
    except ValidationError as exc:
        detail = [
            {"field": ".".join(str(part) for part in error["loc"]),
             "message": error["msg"]}
            for error in exc.errors(include_input=False)
        ]
        raise HTTPException(status_code=422, detail=detail) from exc
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=422, detail="invalid candidate request") from exc


# Imported after the packet adapter is defined: the scenario module reuses its
# validated assumption boundary and candidate source projection.
from .scenarios import ScenarioRequest, ScenarioResult, screen  # noqa: E402


@router.post("/placement-scenarios", response_model=ScenarioResult)
async def placement_scenarios(request: HttpRequest) -> ScenarioResult:
    raw = await request.body()
    if len(raw) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="request too large")
    try:
        return screen(ScenarioRequest.model_validate_json(raw))
    except ValidationError as exc:
        detail = [{"field": ".".join(str(part) for part in error["loc"]),
                   "message": error["msg"]} for error in exc.errors(include_input=False)]
        raise HTTPException(status_code=422, detail=detail) from exc
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=422, detail="invalid placement scenario request") from exc
