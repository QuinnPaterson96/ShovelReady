"""Fixed inputs and supplied geometry. No siting or geometry inference."""

from typing import Annotated, Literal

from pydantic import Field, model_validator

from .common import Contract, Number, Provenance, Quantity, RevisionRef, Text, Versioned

MEASUREMENTS = {
    "manufacturer_interior_area": ("physical", "area"),
    "nominal_exterior_width": ("physical", "length"),
    "nominal_exterior_depth": ("physical", "length"),
    "ceiling_height": ("physical", "length"),
    "roof_height": ("physical", "length"),
    "occupancy_footprint": ("physical", "area"),
    "regulatory_floor_area": ("regulatory", "area"),
    "regulatory_height": ("regulatory", "length"),
    "lot_area": ("physical", "area"),
    "lot_width": ("physical", "length"),
    "lot_depth": ("physical", "length"),
    "storeys": ("regulatory", "count"),
    "dwelling_units": ("physical", "count"),
}


class Measurement(Contract):
    name: Literal[
        "manufacturer_interior_area",
        "nominal_exterior_width",
        "nominal_exterior_depth",
        "ceiling_height",
        "roof_height",
        "occupancy_footprint",
        "regulatory_floor_area",
        "regulatory_height",
        "lot_area",
        "lot_width",
        "lot_depth",
        "storeys",
        "dwelling_units",
    ]
    domain: Literal["physical", "regulatory"]
    definition: Text
    status: Literal["known", "missing", "uncertain"]
    quantity: Quantity | None
    reason: Text | None = None
    provenance: Provenance

    @model_validator(mode="after")
    def meaning(self):
        domain, dimension = MEASUREMENTS[self.name]
        if self.domain != domain or (self.quantity and self.quantity.dimension != dimension):
            raise ValueError("measurement domain/dimension mismatch")
        if self.status == "known" and self.quantity is None:
            raise ValueError("known measurement requires a quantity")
        if self.status == "missing" and self.quantity is not None:
            raise ValueError("missing measurement cannot become zero")
        if self.status != "known" and not self.reason:
            raise ValueError("missing/uncertain measurement requires a reason")
        return self


class DesignRevision(Versioned):
    identity: RevisionRef
    configuration: Text
    adaptability: Literal["fixed"]
    intended_use: Text
    construction_method: Text
    measurements: Annotated[tuple[Measurement, ...], Field(min_length=1)]
    provenance: Provenance

    @model_validator(mode="after")
    def unique_measurements(self):
        names = [m.name for m in self.measurements]
        if len(set(names)) != len(names):
            raise ValueError("duplicate design measurement; use a new definition/revision")
        return self


class CoordinateReference(Contract):
    identifier: Text
    axis_order: Literal["x_y"]
    unit: Literal["m", "ft", "degree"]
    definition: Text


Point = tuple[Number, Number]


class Geometry(Contract):
    kind: Literal["polygon", "line"]
    coordinates: tuple[Point, ...]
    crs: CoordinateReference

    @model_validator(mode="after")
    def shape(self):
        if self.kind == "line":
            if len(self.coordinates) < 2 or len(set(self.coordinates)) < 2:
                raise ValueError("line requires two distinct points")
        elif (
            len(self.coordinates) < 4
            or self.coordinates[0] != self.coordinates[-1]
            or len(set(self.coordinates)) < 3
        ):
            raise ValueError("polygon requires a closed ring with three distinct vertices")
        return self


class GeometryFact(Contract):
    fact_id: Text
    role: Literal["parcel", "principal_building", "lot_line", "rear_yard", "proposed_placement"]
    status: Literal["known", "missing", "uncertain"]
    geometry: Geometry | None
    lot_line_classification: (
        Literal["front", "rear", "interior_side", "exterior_side", "unknown"] | None
    ) = None
    reason: Text | None = None
    provenance: Provenance

    @model_validator(mode="after")
    def shape_and_role(self):
        if self.status == "known" and self.geometry is None:
            raise ValueError("known geometry requires coordinates")
        if self.status == "missing" and self.geometry is not None:
            raise ValueError("missing geometry cannot contain coordinates")
        if self.status != "known" and not self.reason:
            raise ValueError("uncertain/missing geometry requires a reason")
        if (self.role == "lot_line") != (self.lot_line_classification is not None):
            raise ValueError("lot lines require an explicit classification")
        expected = "line" if self.role == "lot_line" else "polygon"
        if self.geometry and self.geometry.kind != expected:
            raise ValueError("geometry kind disagrees with fact role")
        return self


class SiteRevision(Versioned):
    identity: RevisionRef
    jurisdiction: Text
    measurements: tuple[Measurement, ...]
    geometry_facts: Annotated[tuple[GeometryFact, ...], Field(min_length=1)]
    conditions: tuple[Text, ...]
    provenance: Provenance

    @model_validator(mode="after")
    def facts(self):
        roles = {f.role for f in self.geometry_facts}
        if not {"parcel", "principal_building", "lot_line", "rear_yard"} <= roles:
            raise ValueError("site must explicitly retain required geometry, even when missing")
        if "proposed_placement" in roles:
            raise ValueError("placements have their own revision boundary")
        ids = [f.fact_id for f in self.geometry_facts]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate geometry fact identity")
        return self


class PlacementRevision(Versioned):
    identity: RevisionRef
    site: RevisionRef
    design: RevisionRef
    footprint: GeometryFact
    scope: Literal["supplied_placement_only"]

    @model_validator(mode="after")
    def placement_role(self):
        if self.footprint.role != "proposed_placement":
            raise ValueError("placement requires proposed-placement geometry")
        return self
