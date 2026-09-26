"""Versioned, strict local boundary for exploratory geometry."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Name = Annotated[str, Field(strict=True, min_length=1)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, validate_default=True)


class Source(StrictModel):
    provider: Name
    record_label: Name
    capture_date: str | None = None
    review_status: Literal["unreviewed", "reviewed", "unknown"]
    reference: str | None = None


class Geometry(StrictModel):
    """GeoJSON geometry retained exactly; topology is diagnosed by the engine."""

    crs: Name
    geometry: dict


class Feature(StrictModel):
    id: Name
    shape: Geometry
    source: Source


class Building(Feature):
    basis: Literal["roofline", "wall", "unknown"]


class Boundary(Feature):
    """Explicitly named lot-line segment, never inferred from direction."""


class Placement(StrictModel):
    id: Name
    centre_xy: tuple[float, float]
    width_m: float
    depth_m: float
    angle_degrees: float = 0


class Requirement(StrictModel):
    id: Name
    target: Literal["parcel_boundary", "nearest_building", "building", "named_boundary"]
    target_id: Name | None = None
    minimum_m: float
    status: Literal["user_assumption", "source_unreviewed", "source_reviewed"]
    source: Source | None = None

    @model_validator(mode="after")
    def target_reference(self):
        if (self.target in ("building", "named_boundary")) != (self.target_id is not None):
            raise ValueError("building/named_boundary requires target_id; other targets forbid it")
        if self.status != "user_assumption" and self.source is None:
            raise ValueError("source-backed requirement needs source")
        if self.status == "source_reviewed" and self.source.review_status != "reviewed":
            raise ValueError("reviewed requirement needs reviewed source status")
        return self


class Capture(StrictModel):
    completeness: Literal["complete_for_declared_scope", "partial", "unknown"]
    scope: Name
    limitations: tuple[str, ...] = ()


class Request(StrictModel):
    schema_version: Literal["scouting-geometry.v1"]
    projected_metre_crs: Name
    parcel: Feature
    buildings: tuple[Building, ...]
    named_boundaries: tuple[Boundary, ...] = ()
    capture: Capture
    placement: Placement
    requirements: tuple[Requirement, ...] = ()

    @model_validator(mode="after")
    def unique_ids(self):
        for name, items in (
            ("building", self.buildings),
            ("boundary", self.named_boundaries),
            ("requirement", self.requirements),
        ):
            ids = [item.id for item in items]
            if len(ids) != len(set(ids)):
                raise ValueError(f"duplicate {name} id")
        return self


class Check(StrictModel):
    id: str
    kind: Literal[
        "containment",
        "building_overlap",
        "parcel_boundary_distance",
        "building_distance",
        "nearest_building_distance",
        "named_boundary_distance",
        "requirement",
    ]
    status: Literal["observed", "compared", "missing", "invalid", "unsupported"]
    relation: (
        Literal["separate", "touches", "positive_area_overlap", "contained", "outside"] | None
    ) = None
    area_m2: float | None = None
    distance_m: float | None = None
    margin_m: float | None = None
    comparison: Literal["meets", "shortfall"] | None = None
    requirement_id: str | None = None
    requirement_status: (
        Literal["user_assumption", "source_unreviewed", "source_reviewed"] | None
    ) = None
    source_feature_ids: tuple[str, ...] = ()
    reason: str | None = None


class Assessment(StrictModel):
    schema_version: Literal["scouting-geometry.v1"] = "scouting-geometry.v1"
    engine_version: Literal["supplied-rectangle.v1"] = "supplied-rectangle.v1"
    input: Request
    placement_geometry: dict | None
    checks: tuple[Check, ...]
    conclusion: Literal["tested_placement_observations_only"] = "tested_placement_observations_only"
    limitations: tuple[str, ...]
