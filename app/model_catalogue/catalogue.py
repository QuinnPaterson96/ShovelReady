"""Validate the pinned, manually transcribed provider specification snapshot."""

import json
from pathlib import Path
from typing import Literal

from pydantic import model_validator

from app.contracts.common import Contract, Quantity, Text

SNAPSHOT = Path(__file__).with_name("catalogue.json")


class Source(Contract):
    source_id: Text
    url: Text
    locator: Text
    captured_at: Text
    sha256: Text | None
    artifact_status: Literal["private_capture", "capture_gap"]
    upstream_revision: Text | None = None


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
