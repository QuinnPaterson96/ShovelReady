"""Validate the pinned, manually transcribed provider specification snapshot."""

import json
from pathlib import Path
from typing import Literal

from pydantic import model_validator

from app.contracts.common import Contract, Nonnegative, Quantity, Text


class ValueRange(Contract):
    minimum: Nonnegative
    maximum: Nonnegative | None = None

    @model_validator(mode="after")
    def ordered(self):
        if self.maximum is not None and self.maximum < self.minimum:
            raise ValueError("range maximum must be at least minimum")
        return self


class CommercialClaim(Contract):
    source_id: Text
    wording: Text
    scope: Literal["model", "provider"]
    configuration: Text | None = None
    region: Text | None = None
    qualifications: tuple[Text, ...] = ()


class Price(CommercialClaim):
    amount: ValueRange | None = None
    currency: Literal["CAD", "USD", "EUR", "GBP", "AUD", "NZD"] | None = None
    basis: Literal["starting", "fixed", "estimated"]
    inclusions: tuple[Text, ...] = ()
    exclusions: tuple[Text, ...] = ()
    tax_treatment: Text | None = None


class Timing(CommercialClaim):
    stage: Literal[
        "production_lead_time", "delivery", "on_site_installation", "contract_to_delivery"
    ]
    duration: ValueRange | None = None
    unit: Literal["hours", "days", "weeks", "months"] | None = None
    basis: Literal["estimated", "provider_claim"]
    clock_start: Text | None = None
    prerequisites: tuple[Text, ...] = ()

    @model_validator(mode="after")
    def duration_units(self):
        if (self.duration is None) != (self.unit is None):
            raise ValueError("duration and unit must be supplied together")
        return self


SNAPSHOT = Path(__file__).with_name("catalogue.json")


class Source(Contract):
    source_id: Text
    url: Text
    locator: Text
    captured_at: Text
    sha256: Text | None
    artifact_status: Literal["private_capture", "capture_gap"]
    upstream_revision: Text | None = None
    updated_at: Text | None = None


class Measure(Contract):
    name: Literal[
        "nominal_exterior_width",
        "nominal_exterior_depth",
        "manufacturer_interior_area",
        "manufacturer_footprint",
        "advertised_overall_height",
        "roof_height",
    ]
    status: Literal["known", "missing"]
    definition: Text
    quantity: Quantity | None
    source_id: Text | None
    reason: Text | None = None

    @model_validator(mode="after")
    def coherent(self):
        dimension = (
            "area"
            if self.name in {"manufacturer_interior_area", "manufacturer_footprint"}
            else "length"
        )
        if self.status == "known" and (not self.quantity or not self.source_id):
            raise ValueError("known measurement requires quantity and source")
        if self.status == "missing" and (self.quantity or not self.reason):
            raise ValueError("missing measurement requires reason and no quantity")
        if self.quantity and self.quantity.dimension != dimension:
            raise ValueError("incompatible measurement units")
        return self


class Model(Contract):
    model_id: Text
    provider: Text
    name: Text
    provider_url: Text
    source_revision: Text | None
    configuration: Text
    construction_method: Text
    intended_use_note: Text
    service_area_status: Literal["unknown", "provider_claim", "excluded_by_provider"]
    service_area_note: Text
    installation_note: Text
    footprint_note: Text
    height_note: Text
    missing_facts: tuple[Text, ...]
    sources: tuple[Source, ...]
    measurements: tuple[Measure, ...]
    review_status: Literal["unreviewed"]
    prices: tuple[Price, ...] = ()
    timings: tuple[Timing, ...] = ()

    @model_validator(mode="after")
    def identities(self):
        ids = {source.source_id for source in self.sources}
        if len(ids) != len(self.sources):
            raise ValueError("duplicate source ID")
        names = [measure.name for measure in self.measurements]
        if len(names) != len(set(names)):
            raise ValueError("duplicate measurement")
        if any(measure.source_id not in ids for measure in self.measurements if measure.source_id):
            raise ValueError("unknown measurement source")
        if "roof_height" not in names:
            raise ValueError("building height must be explicitly known or missing")
        if any(claim.source_id not in ids for claim in (*self.prices, *self.timings)):
            raise ValueError("unknown price/timing source")
        return self


class Catalogue(Contract):
    schema_version: Literal["sr-40.catalogue.v1"]
    snapshot_id: Text
    captured_at: Text
    provenance: Literal["manual_transcription_of_public_provider_specs"]
    review_status: Literal["unreviewed"]
    models: tuple[Model, ...]

    @model_validator(mode="after")
    def unique_models(self):
        ids = [model.model_id for model in self.models]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate model ID")
        return self


def load_catalogue(path: Path = SNAPSHOT) -> Catalogue:
    """Read one versioned local snapshot; no network or silent fallback."""
    return Catalogue.model_validate(json.loads(path.read_text(encoding="utf-8")))
