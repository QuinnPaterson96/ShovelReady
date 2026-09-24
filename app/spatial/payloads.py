"""SR-09 reader v1. Raw Esri responses remain separate from SR-04 legal Geometry."""

from typing import Literal

from pydantic import Field, JsonValue, model_validator

from app.contracts.common import Contract, RevisionRef, Text


class LayerObservation(Contract):
    source_id: Text
    snapshot_id: Text
    metadata_snapshot_id: Text
    catalogue_snapshot_id: Text
    layer_url: Text
    request_url: Text
    attribution: Text
    # Full response retains attributes/nulls, original IDs, rings, XYZ and response metadata.
    response: dict[str, JsonValue]


class FeatureAssessment(Contract):
    snapshot_id: Text
    feature_index: int = Field(ge=0)
    status: Literal["usable_xy", "needs_investigation"]
    issues: tuple[Text, ...]
    geometric_area_m2: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    # Derived XY only, EPSG:4617 longitude/latitude; raw Z is never transformed.
    geographic_xy: dict[str, JsonValue] | None = None

    @model_validator(mode="after")
    def usable_measurement(self):
        if (self.geometric_area_m2 is None) != (self.geographic_xy is None):
            raise ValueError("derived area and geometry must be available together")
        if self.status == "usable_xy" and self.geometric_area_m2 is None:
            raise ValueError("usable XY requires geometry")
        return self


class Intersection(Contract):
    zoning_snapshot_id: Text
    zoning_feature_index: int = Field(ge=0)
    area_m2: float = Field(ge=0, allow_inf_nan=False)
    classification: Literal["material", "sliver", "boundary_touch"]
    # XY geometry in EPSG:3157, including zero-area line/point contacts.
    geometry: dict[str, JsonValue]


class ParcelAnalysis(Contract):
    parcel_snapshot_id: Text
    parcel_feature_index: int | None = Field(ge=0)
    zoning_snapshot_id: Text
    intersections: tuple[Intersection, ...]
    uncovered_area_m2: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    overlapping_zone_area_m2: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    status: Literal["needs_investigation"] = "needs_investigation"
    issues: tuple[Text, ...]


class SpatialImport(Contract):
    schema_version: Literal["sr-09.v1"] = "sr-09.v1"
    identity: RevisionRef
    identity_scope: Literal["bounded_capture_collection_not_permanent_features"] = (
        "bounded_capture_collection_not_permanent_features"
    )
    source_snapshot_ids: tuple[Text, ...]
    source_crs: Literal["EPSG:3157"] = "EPSG:3157"
    geographic_crs: Literal["EPSG:4617"] = "EPSG:4617"
    vertical_unit: None = None
    vertical_datum: None = None
    algorithm: Literal["sr-09.xy.v1"] = "sr-09.xy.v1"
    runtime: dict[str, str]
    transform: dict[str, str]
    sliver_area_m2: Literal[0.01] = 0.01
    observations: tuple[LayerObservation, ...]
    features: tuple[FeatureAssessment, ...]
    parcels: tuple[ParcelAnalysis, ...]
    review_status: Literal["unreviewed"] = "unreviewed"
    publication_eligible: Literal[False] = False

    @model_validator(mode="after")
    def references_exist(self):
        snapshots = set(self.source_snapshot_ids)
        index = {o.snapshot_id: o for o in self.observations}
        if len(index) != len(self.observations) or len(snapshots) != len(self.source_snapshot_ids):
            raise ValueError("duplicate spatial source identity")
        expected = set()
        for observation in self.observations:
            if (
                not {
                    observation.snapshot_id,
                    observation.metadata_snapshot_id,
                    observation.catalogue_snapshot_id,
                }
                <= snapshots
            ):
                raise ValueError("spatial observation outside pinned sources")
            features = observation.response.get("features")
            if not isinstance(features, list):
                raise ValueError("missing raw feature array")
            expected.update((observation.snapshot_id, n) for n in range(len(features)))
        actual = [(f.snapshot_id, f.feature_index) for f in self.features]
        if len(actual) != len(set(actual)) or set(actual) != expected:
            raise ValueError("every raw feature requires exactly one assessment")
        for parcel in self.parcels:
            if parcel.parcel_snapshot_id not in index:
                raise ValueError("unknown parcel response")
            if parcel.parcel_feature_index is None:
                if index[parcel.parcel_snapshot_id].response["features"]:
                    raise ValueError("missing parcel marker conflicts with raw features")
                if parcel.intersections or parcel.uncovered_area_m2 is not None:
                    raise ValueError("absent parcel cannot have measured intersections")
            elif (parcel.parcel_snapshot_id, parcel.parcel_feature_index) not in expected:
                raise ValueError("unknown parcel feature")
            if parcel.zoning_snapshot_id not in index:
                raise ValueError("unknown zoning response")
            for item in parcel.intersections:
                if (
                    item.zoning_snapshot_id != parcel.zoning_snapshot_id
                    or (item.zoning_snapshot_id, item.zoning_feature_index) not in expected
                ):
                    raise ValueError("unknown intersection feature")
        return self
