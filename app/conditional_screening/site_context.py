"""Shared property/placement facts. Definitions of legal measurements remain local."""

import math
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .payloads import Source


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


class MappedWaterfront(Strict):
    value: Literal[True] | None
    origin: Literal["municipal_map"]
    evidence_state: Literal["assumed", "unknown"]
    note: str = Field(max_length=1000)
    source: Source

    @model_validator(mode="after")
    def provisional(self):
        if ((self.value is None) != (self.evidence_state == "unknown")
                or self.source.review_status != "unreviewed_live_observation"):
            raise ValueError("mapped waterfront must remain unreviewed or unresolved")
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


class StreetMapSource(Strict):
    provider: str
    record_label: str
    captured_at_utc: str
    source_url: str


class StreetSelection(Strict):
    edge_ids: tuple[str, ...] = Field(max_length=64)
    all_marked: bool


class StreetAdjacency(StreetSelection):
    completion_method: Literal["marking", "explicit_confirmation", "advance"] | None = None
    origin: Literal["user"]


class MappedStreetAdjacency(StreetSelection):
    completion_method: Literal["marking", "map_prefill"]
    origin: Literal["municipal_map", "edited_map"]
    mapped_names: dict[str, str] = Field(min_length=1, max_length=64)
    map_source: StreetMapSource

    @model_validator(mode="after")
    def mapped_edges_belong_to_selection(self):
        selected = set(self.edge_ids)
        if self.mapped_names.keys() - selected:
            raise ValueError("mapped names must refer to selected street edges")
        if self.origin == "municipal_map" and self.mapped_names.keys() != selected:
            raise ValueError("each suggested street edge needs its map name")
        return self


class BoundaryRoleSuggestions(Strict):
    roles: dict[str, Literal["front", "rear", "side", "flanking_street"]] = Field(max_length=64)
    conflicts: tuple[str, ...] = Field(max_length=8)
    basis: Literal["user_marks", "map_and_marks"]


class Assumptions(Strict):
    planning_buffers_m: dict[str, float] = Field(default_factory=dict, max_length=64)
    waterfront_edge_ids: tuple[str, ...] = Field(default=(), max_length=64)
    infer_principal_building: bool = True
    boundary_role_suggestions: BoundaryRoleSuggestions | None = None
    street_adjacency: StreetAdjacency | MappedStreetAdjacency | None = None
    schema_version: Literal["sr.zoning-site-assumptions.v1"]
    property: Property
    observed_buildings: tuple[ObservedBuilding, ...] = Field(max_length=64)
    edges: tuple[Edge, ...] = Field(max_length=64)
    building_type: UserFact
    existing_garden_suites: UserFact
    principal_building_id: UserFact
    waterfront: UserFact | MappedWaterfront
    waterfront_map: dict[str, Source] = Field(default_factory=dict, max_length=64)
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
        if (not self.waterfront_map.keys() <= set(self.waterfront_edge_ids)
                or any(s.review_status != "unreviewed_live_observation"
                       for s in self.waterfront_map.values())):
            raise ValueError("shoreline sources must refer to currently marked exterior edges")
        if isinstance(self.waterfront, MappedWaterfront) and self.waterfront.value and (
            not self.waterfront_map or self.waterfront.source not in self.waterfront_map.values()
        ):
            raise ValueError("positive map suggestion needs a sourced shoreline edge")
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
