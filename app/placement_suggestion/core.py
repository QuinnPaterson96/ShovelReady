"""Sample full footprints, preserving complete candidate boundary assignments."""

import math
from time import monotonic
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from shapely import affinity
from shapely.geometry import LineString, Polygon

from app.conditional_screening.additional import AdditionalCheck, AdditionalInputs
from app.conditional_screening.api import Assumptions, Proposal, ProposalEvidence
from app.conditional_screening.scenarios import Scenario, ScenarioRequest, screen
from app.scouting_geometry.core import _crs_reason, _geometry, _placement
from app.scouting_geometry.payloads import Placement
from app.scouting_geometry.payloads import Request as GeometryRequest


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Context(Strict):
    assumptions: Assumptions
    model_revision: str = Field(min_length=1, max_length=240)
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


class Request(Strict):
    schema_version: Literal["placement-suggestion.request.v1"]
    geometry: GeometryRequest
    scenario_context: Context | None = None


class Result(Strict):
    schema_version: Literal["placement-suggestion.result.v1"] = "placement-suggestion.result.v1"
    status: Literal["suggested", "no_suggestion", "unsupported"]
    basis: Literal["candidate_scenario", "mapped_geometry"]
    message: str
    placement: Placement | None = None
    selected_scenario: Scenario | None = None
    scenario_context_applied: bool = False
    evaluated_positions: int = 0
    time_budget_reached: bool = False
    capture: dict
    sources: tuple[dict, ...] = ()
    position_checks: tuple[AdditionalCheck, ...] = ()
    property_revision: str | None = None
    model_revision: str | None = None
    packet_id: str | None = None
    packet_revision: str | None = None
    limitations: tuple[str, ...]


def _scenario_request(body: Request, geometry: GeometryRequest) -> ScenarioRequest | None:
    context = body.scenario_context
    if context is None or context.proposal.proposed_use == "other":
        return None
    # These measurements described the old position. Retain independently entered
    # floor area, with an explicit new revision, but never move measured wall gaps.
    revision = "suggested-placement-search"
    floor = context.assumptions.measurements.floor_area
    measurements = context.assumptions.measurements.model_copy(
        update={
            "boundary": {},
            "principal_separation": None,
            "floor_area": floor.model_copy(update={"placement_revision": revision})
            if floor
            else None,
        }
    )
    assumptions = context.assumptions.model_copy(
        update={
            "measurements": measurements,
            "placement_revision": revision,
        }
    )
    return ScenarioRequest.model_validate(
        {
            **context.model_dump(),
            "schema_version": "placement-scenarios.request.v1",
            "geometry": geometry,
            "assumptions": assumptions,
        }
    )


def suggest(body: Request) -> Result:
    geometry = body.geometry
    deadline = monotonic() + 3
    common = {
        "capture": geometry.capture.model_dump(mode="json"),
        "limitations": (
            "A bounded search of a nominal rectangle, not every possible placement or rotation.",
            "Uses captured parcel and building outlines; unmapped obstructions, access "
            "and services remain open.",
            "Candidate setbacks and planning margins keep their stated assumptions "
            "and source review status.",
            *geometry.capture.limitations,
        ),
    }

    def finish(status, message, **kwargs):
        return Result(status=status, message=message, basis="mapped_geometry", **common, **kwargs)

    parcel, error = _geometry(geometry.parcel, geometry.projected_metre_crs, "Polygon")
    _, placement_error = _placement(geometry.placement)
    if error or placement_error or _crs_reason(geometry.projected_metre_crs):
        return finish(
            "unsupported",
            "The outline or dimensions cannot support a suggestion. Continue manually.",
        )
    context = body.scenario_context
    if context is not None and (
        context.assumptions.property.parcel_id != geometry.parcel.id
        or context.assumptions.property.crs != geometry.projected_metre_crs
        or context.assumptions.property.source != geometry.parcel.source.model_dump(mode="json")
        or {(item.id, item.basis) for item in context.assumptions.observed_buildings}
        != {(item.id, item.basis) for item in geometry.buildings}
    ):
        return finish("unsupported", "Boundary context belongs to a different property. Retry.")
    buildings = []
    for feature in geometry.buildings:
        building, error = _geometry(feature, geometry.projected_metre_crs, "Polygon")
        if error:
            return finish(
                "unsupported",
                "A mapped building outline is unresolved. Correct it or continue manually.",
            )
        buildings.append(building)
    boundaries = {}
    for feature in geometry.named_boundaries:
        boundary, error = _geometry(feature, geometry.projected_metre_crs, "LineString")
        if error:
            return finish(
                "unsupported", "A named boundary is unresolved. Continue with a manual placement."
            )
        boundaries[feature.id] = boundary
    building_by_id = dict(zip((b.id for b in geometry.buildings), buildings, strict=True))
    if any(
        r.minimum_m < 0
        or r.target == "nearest_building"
        and not buildings
        or r.target == "building"
        and r.target_id not in building_by_id
        or r.target == "named_boundary"
        and r.target_id not in boundaries
        for r in geometry.requirements
    ):
        return finish(
            "unsupported",
            "A clearance target has no matching outline. Review it or place the unit manually.",
        )

    # Use the same rectangle convention as the supplied-placement engine.
    width, depth = geometry.placement.width_m, geometry.placement.depth_m
    base = Polygon(
        [
            (-width / 2, -depth / 2),
            (width / 2, -depth / 2),
            (width / 2, depth / 2),
            (-width / 2, depth / 2),
        ]
    )
    rectangle = list(parcel.minimum_rotated_rectangle.exterior.coords)
    longest = max(zip(rectangle, rectangle[1:], strict=False), key=lambda edge: math.dist(*edge))
    lot_angle = math.degrees(
        math.atan2(longest[1][1] - longest[0][1], longest[1][0] - longest[0][0])
    )
    angles = list(
        dict.fromkeys(
            round(a % 180, 8)
            for a in (
                geometry.placement.angle_degrees,
                geometry.placement.angle_degrees + 90,
                lot_angle,
                lot_angle + 90,
            )
        )
    )
    min_x, min_y, max_x, max_y = parcel.bounds
    step_x, step_y = (max_x - min_x) / 24, (max_y - min_y) / 24
    centres = [(min_x + step_x * x, min_y + step_y * y) for x in range(25) for y in range(25)]
    free = parcel
    for building in buildings:
        free = free.difference(building)
    parts = list(free.geoms) if hasattr(free, "geoms") else [free]
    for part in parts:
        if not part.is_empty:
            centres.extend(
                [
                    (part.representative_point().x, part.representative_point().y),
                    (part.centroid.x, part.centroid.y),
                ]
            )

    template = None
    front_minimum = None
    candidates = []
    evaluated = 0
    edge_lines = (
        {e.id: LineString([e.start, e.end]) for e in context.assumptions.edges} if context else {}
    )
    for angle in angles:
        rotated = affinity.rotate(base, angle, origin=(0, 0))
        for x, y in centres:
            if monotonic() >= deadline:
                break
            footprint = affinity.translate(rotated, xoff=x, yoff=y)
            evaluated += 1
            if not parcel.contains_properly(footprint) or any(
                footprint.intersects(b) for b in buildings
            ):
                continue
            candidate = geometry.placement.model_copy(
                update={
                    "id": "suggested-starting-placement",
                    "centre_xy": (x, y),
                    "angle_degrees": angle,
                }
            )
            if template is None and context and context.proposal.proposed_use != "other":
                context_request = _scenario_request(
                    body, geometry.model_copy(update={"placement": candidate})
                )
                template = screen(context_request)
                front_minimum = next((check.threshold for check in template.additional_checks
                                      if check.id == "front" and check.unit == "m"
                                      and check.observed is not None), None)
            distances = [
                footprint.distance(parcel.boundary),
                *(footprint.distance(b) for b in buildings),
            ]
            for target in geometry.requirements:
                if target.target == "parcel_boundary":
                    distance = footprint.distance(parcel.boundary)
                elif target.target == "nearest_building":
                    distance = min(footprint.distance(b) for b in buildings)
                elif target.target == "building":
                    distance = footprint.distance(building_by_id[target.target_id])
                else:
                    distance = footprint.distance(boundaries[target.target_id])
                distances.append(distance - target.minimum_m)
            if min(distances) < 0:
                continue
            scores = []
            # A complete assignment is considered as a unit. Missing or inapplicable
            # context stays geometry-only; no invented or mixed optimistic setbacks.
            scenarios = template.scenarios if template and template.scenarios else ()
            edge_distances = {id: footprint.distance(line) for id, line in edge_lines.items()}
            for index, scenario in enumerate(scenarios):
                margins = [
                    edge_distances[c.edge_id]
                    - c.minimum_m
                    - context.assumptions.planning_buffers_m.get(c.edge_id, 0)
                    for c in scenario.checks
                ]
                if front_minimum is not None:
                    front = scenario.front_edge_id
                    margins.append(edge_distances[front] - front_minimum
                                   - context.assumptions.planning_buffers_m.get(front, 0))
                if min(margins) >= 0:
                    scores.append((min(*distances, *margins), index))
            if scenarios and not scores:
                continue
            margin, scenario_index = (
                max(scores, key=lambda item: (item[0], -item[1]))
                if scores
                else (min(distances), None)
            )
            all_scenarios = not scenarios or len(scores) == len(scenarios)
            candidates.append(((all_scenarios, margin), candidate, scenario_index))
    candidates.sort(key=lambda item: item[0], reverse=True)
    # Check the best bounded candidates through the existing complete scenario
    # service, including supported position-dependent additional checks. Fixed
    # model facts (e.g. height) do not make every possible position disappear.
    for _, candidate, index in candidates[:80]:
        if monotonic() >= deadline:
            break
        context_request = _scenario_request(
            body, geometry.model_copy(update={"placement": candidate})
        )
        result = screen(context_request) if context_request is not None else None
        if (
            result
            and result.scenarios
            and any(
                c.status == "conflict"
                and c.id in ("separation", "front", "rear_location", "rear_occupancy")
                for c in result.additional_checks
            )
        ):
            continue
        scoped = result is not None and index is not None
        selected = result.scenarios[index] if scoped else None
        message = (
            "Suggested starting position using one complete boundary scenario and your "
            "planning margins. Adjust it to explore."
            if scoped
            else "Suggested starting position using the mapped outlines. City setbacks were "
            "not applied; adjust it to explore."
        )
        if geometry.capture.completeness != "complete_for_declared_scope":
            message += " Building coverage is incomplete; check for missing structures."
        if scoped and context.proposal.proposed_use is None:
            message = "Illustrative garden-suite scenario; intended use is unanswered. " + message
        return Result(
            status="suggested",
            basis="candidate_scenario" if scoped else "mapped_geometry",
            message=message,
            placement=candidate,
            selected_scenario=selected,
            scenario_context_applied=scoped,
            evaluated_positions=evaluated,
            sources=result.sources if scoped else (),
            position_checks=tuple(c for c in result.additional_checks if c.id in (
                "front", "separation", "rear_location", "rear_occupancy")) if scoped else (),
            property_revision=result.property_revision if scoped else None,
            model_revision=result.model_revision if scoped else None,
            packet_id=result.packet_id if scoped else None,
            packet_revision=result.packet_revision if scoped else None,
            **common,
        )
    return finish(
        "no_suggestion",
        "No suggested placement found in this bounded search. Try adjusting the position, "
        "rotation or planning margins.",
        evaluated_positions=evaluated,
        time_budget_reached=monotonic() >= deadline,
    )
