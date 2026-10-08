"""Bounded, approximate placement scenarios over the candidate Victoria setback subset."""

from itertools import product
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from shapely.geometry import LineString, shape
from shapely.ops import nearest_points

from app.scouting_geometry.core import assess
from app.scouting_geometry.payloads import Request as GeometryRequest

from .additional import AdditionalCheck, AdditionalInputs, additional_checks
from .api import Assumptions, Proposal, ProposalEvidence, _packet, _source


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class ScenarioRequest(Strict):
    schema_version: Literal["placement-scenarios.request.v1"]
    geometry: GeometryRequest
    assumptions: Assumptions
    model_revision: str = Field(min_length=1)
    proposal: Proposal = Proposal()
    proposal_evidence: ProposalEvidence | None = None
    street_edge_id: str | None = None
    rear_edge_id: str | None = None
    street_pattern: Literal["unknown", "single", "corner_or_multiple"] = "unknown"
    additional_inputs: AdditionalInputs = AdditionalInputs()

    @model_validator(mode="after")
    def matching_evidence(self):
        if self.proposal_evidence is not None:
            self.proposal_evidence.matches(self.proposal)
        return self


class EdgeCheck(Strict):
    edge_id: str
    role: Literal["rear", "side", "flanking_street"]
    distance_m: float
    basis: Literal["captured_nominal", "user_wall_to_lot_line"]
    minimum_m: float
    meets: bool
    rule_id: str
    planning_buffer_m: float = 0
    planning_distance_m: float = 0
    planning_meets: bool = False


class Scenario(Strict):
    front_edge_id: str
    checks: tuple[EdgeCheck, ...]
    outcome: Literal["pass", "fail"]


class ScenarioResult(Strict):
    schema_version: Literal["placement-scenarios.result.v1"] = "placement-scenarios.result.v1"
    status: Literal["bounded_pass", "clarify", "apparent_conflict", "unresolved"]
    reason: str
    property_revision: str
    placement_revision: str
    model_revision: str
    packet_id: str
    packet_revision: str
    scope: str
    scenarios: tuple[Scenario, ...] = ()
    edge_distances_m: dict[str, float] = {}
    edge_measurement_lines: dict[str, tuple[tuple[float, float], tuple[float, float]]] = {}
    thresholds_m: dict[str, float]
    sources: tuple[dict, ...] = ()
    limitations: tuple[str, ...]
    proposal_evidence: dict | None = None
    additional_checks: tuple[AdditionalCheck, ...] = ()
    additional_revision: str | None = None


def screen(body: ScenarioRequest) -> ScenarioResult:
    result = _boundary_screen(body)
    packet = _packet()
    lines = {}
    if result.edge_distances_m:
        footprint = shape(assess(body.geometry).placement_geometry)
        for edge in body.assumptions.edges:
            if edge.id in result.edge_distances_m:
                endpoints = nearest_points(footprint, LineString([edge.start, edge.end]))
                lines[edge.id] = tuple((p.x, p.y) for p in endpoints)
    return result.model_copy(update={
        "edge_measurement_lines": lines,
        "additional_checks": additional_checks(body, result, packet, _source),
        "additional_revision": packet["additional_scouting_revision"],
    })


def _boundary_screen(body: ScenarioRequest) -> ScenarioResult:
    """Enumerate complete role assignments; uncertainty never becomes a vacuous pass."""
    packet = _packet()
    by_id = {rule["logical_rule_id"]: rule for rule in packet["rules"]}
    side_rule = by_id["victoria-zb2018-garden-suite-side-rear-setback"]
    flank_rule = by_id["victoria-zb2018-garden-suite-flanking-setback"]
    side_limit = float(side_rule["normalized"]["value"])
    flank_limit = float(flank_rule["normalized"]["value"])
    assumptions = body.assumptions
    property_revision = (
        f"{assumptions.property.case_id}:{assumptions.property.parcel_id}:"
        f"{assumptions.property.geometry_revision}"
    )
    common = dict(
        property_revision=property_revision,
        placement_revision=assumptions.placement_revision,
        model_revision=body.model_revision,
        packet_id=packet["packet_id"],
        packet_revision=packet["packet_revision"],
        thresholds_m={"side_rear": side_limit, "flanking_street": flank_limit},
        scope="Approximate nominal rectangle to captured parcel edges, with separately labelled "
        "user wall-to-line overrides where supplied; candidate City of Victoria ordinary "
        "GRD-1 garden-suite side/rear/flanking distances only",
        sources=(_source(packet, side_rule).model_dump(mode="json"),
                 _source(packet, flank_rule).model_dump(mode="json")),
        limitations=(
            "Captured parcel edges are not verified registered legal lot lines; the nominal "
            "rectangle is not a surveyed building face or installed envelope.",
            "User wall-to-line distances are unverified assumptions and do not alter the "
            "captured nominal geometry observations.",
            "Street-facing choice is a scenario assumption, not a legal front lot line "
            "classification.",
            "Front setback, rear-yard location/occupancy and height are outside this boundary "
            "scenario status; see the separately scoped additional checks. Site-specific "
            "provisions, projections and other applicable checks remain unreviewed.",
            "Current zoning, legal lot, pathway and waterfront applicability remain unknown. "
            "Candidate rules are unreviewed and unpublished.",
        ),
        proposal_evidence=(body.proposal_evidence.model_dump(mode="json")
                           if body.proposal_evidence else None),
    )

    def unresolved(reason: str) -> ScenarioResult:
        return ScenarioResult(status="unresolved", reason=reason, **common)

    geometry = body.geometry
    if (assumptions.waterfront.value is True
            or assumptions.building_type.value == "other"
            or body.proposal.proposed_use == "other"
            or body.proposal.confirmed_zone == "other"
            or body.proposal.confirmed_instrument == "other"
            or body.proposal.foundation_attached is False
            or body.proposal.legal_lot_confirmed is False):
        return unresolved(
            "A stated site or pathway fact is outside the ordinary candidate rule scope."
        )
    if (geometry.parcel.id != assumptions.property.parcel_id
            or geometry.parcel.shape.crs != assumptions.property.crs
            or geometry.projected_metre_crs != "EPSG:3157"
            or geometry.parcel.source.model_dump(mode="json") != assumptions.property.source
            or assumptions.placement_revision == "placement-unmeasured"):
        return unresolved("Property, projected metre basis or placement revision does not match.")
    observed = assess(geometry)
    containment = next(check for check in observed.checks if check.kind == "containment")
    if containment.status != "observed" or containment.relation != "contained":
        return unresolved("The rectangle is not wholly inside a valid captured parcel.")
    parcel = shape(geometry.parcel.shape.geometry)
    if (parcel.geom_type != "Polygon" or len(parcel.interiors) or not _quadrilateral(parcel)):
        return unresolved("Only a simple convex four-edge parcel is supported for role scenarios.")
    ring = list(parcel.exterior.coords)
    edges = sorted(assumptions.edges, key=lambda edge: edge.segment)
    if (len(edges) != 4 or any(edge.ring != 0 or edge.segment != index
                               or tuple(edge.start) != tuple(ring[index])
                               or tuple(edge.end) != tuple(ring[index + 1])
                               for index, edge in enumerate(edges))):
        return unresolved("The supplied edge identities do not match the captured parcel.")
    if any(edge_id is not None and edge_id not in {edge.id for edge in edges}
           for edge_id in (body.street_edge_id, body.rear_edge_id)):
        return unresolved("A selected boundary edge is not part of this parcel.")
    if any(item.unit != "m" or item.basis != "proposed_wall_to_lot_line"
           or item.origin != "user" for item in assumptions.measurements.boundary.values()):
        return unresolved("A user boundary measurement has an unsupported unit or basis.")
    footprint = shape(observed.placement_geometry)
    distances = {edge.id: footprint.distance(LineString([edge.start, edge.end]))
                 for edge in edges}
    scenarios: list[Scenario] = []
    # A street-facing edge alone does not establish the legal front on corner or
    # multiple-street lots. Narrow only when the user also states it is the sole street edge.
    fronts = [index for index, edge in enumerate(edges)
              if body.street_pattern != "single"
              or ((body.street_edge_id is None or edge.id == body.street_edge_id)
                  and (body.rear_edge_id is None
                       or edges[(index + 2) % 4].id == body.rear_edge_id))]
    for front in fronts:
        rear = (front + 2) % 4
        sides = [index for index in range(4) if index not in (front, rear)]
        # Unknown street pattern retains both ordinary side and flanking possibilities.
        streets = assumptions.street_adjacency
        if streets and streets.all_marked:
            if edges[front].id not in streets.edge_ids:
                continue
            variants = [tuple("flanking_street" if edges[index].id in streets.edge_ids else "side"
                              for index in sides)]
        else:
            variants = [("side", "side")] if body.street_pattern == "single" else product(
                ("side", "flanking_street"), repeat=2)
        for roles in variants:
            assignment = {front: "front", rear: "rear", **dict(zip(sides, roles, strict=True))}
            if any(edge.role.value not in (None, "unknown", assignment[index])
                   for index, edge in enumerate(edges)):
                continue
            checks = tuple(EdgeCheck(
                edge_id=edges[index].id,
                role=assignment[index],
                distance_m=(manual.value if (manual := assumptions.measurements.boundary.get(
                    edges[index].id)) is not None else distances[edges[index].id]),
                basis="user_wall_to_lot_line" if manual is not None else "captured_nominal",
                minimum_m=flank_limit if assignment[index] == "flanking_street" else side_limit,
                meets=(manual.value if manual is not None else distances[edges[index].id]) >= (
                    flank_limit if assignment[index] == "flanking_street" else side_limit),
                rule_id=(flank_rule if assignment[index] == "flanking_street" else side_rule)[
                    "logical_rule_id"],
            ) for index in range(4) if index != front)
            checks = tuple(check.model_copy(update={
                "planning_buffer_m": (buffer := assumptions.planning_buffers_m.get(check.edge_id, 0)
                                      if check.basis == "captured_nominal" else 0),
                "planning_distance_m": max(0, check.distance_m - buffer),
                "planning_meets": check.distance_m - buffer >= check.minimum_m,
            }) for check in checks)
            scenarios.append(Scenario(front_edge_id=edges[front].id, checks=checks,
                                      outcome="pass" if all(check.meets for check in checks)
                                      else "fail"))
    if not scenarios:
        return unresolved("No complete supported role assignment matches the supplied choices.")
    if all(scenario.outcome == "pass" for scenario in scenarios):
        status, reason = (
            "bounded_pass",
            "Every supported assignment passes the stated side/rear/flanking distance subset.",
        )
    elif all(scenario.outcome == "fail" for scenario in scenarios):
        status, reason = (
            "apparent_conflict",
            "Every supported assignment has a candidate distance shortfall at this placement.",
        )
    else:
        status, reason = (
            "clarify",
            "Plausible edge assignments change the candidate distance result; clarify "
            "street-facing and boundary roles.",
        )
    if assumptions.street_adjacency is not None and not assumptions.street_adjacency.all_marked:
        status, reason = (
            "unresolved",
            "Street selection is incomplete or unknown. Captured gaps remain available; "
            "boundary and yard applicability is unresolved until explicitly confirmed.",
        )
    return ScenarioResult(status=status, reason=reason, scenarios=tuple(scenarios),
                          edge_distances_m=distances, **common)


def _quadrilateral(parcel) -> bool:
    ring = list(parcel.exterior.coords)
    if len(ring) != 5:
        return False
    turns = []
    for index in range(4):
        a, b, c = ring[index], ring[(index + 1) % 4], ring[(index + 2) % 4]
        turns.append((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]))
    return all(turn > 0 for turn in turns) or all(turn < 0 for turn in turns)
