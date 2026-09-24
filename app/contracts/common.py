"""Shared wire types. Decimal quantities serialize as strings without precision loss."""

from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StrictInt,
    StringConstraints,
    model_validator,
)

Text = Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1)]
Digest = Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{64}$")]


def decimal_input(value):
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        raise ValueError("quantity must be a decimal string or number, never a boolean")
    return value


Number = Annotated[Decimal, BeforeValidator(decimal_input), Field(allow_inf_nan=False)]
Nonnegative = Annotated[Number, Field(ge=0)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, validate_default=True)


class Versioned(Contract):
    schema_version: Literal["sr-04.v1-provisional"]


class RevisionRef(Contract):
    logical_id: Text
    revision_id: Text


class Artifact(Contract):
    uri: Text
    sha256: Digest


class Evidence(Contract):
    snapshot_id: Text
    locator: Text
    page_index: Annotated[StrictInt, Field(ge=0)] | None = None
    printed_page: Text | None = None
    excerpt: Text
    context: Text


class Review(Contract):
    status: Literal["unreviewed", "accepted", "rejected", "needs_review"]
    reviewer: Text | None = None
    reviewed_at: AwareDatetime | None = None
    scope: Text
    rationale: Text

    @model_validator(mode="after")
    def attributed(self):
        if self.status != "unreviewed" and (not self.reviewer or not self.reviewed_at):
            raise ValueError("review decisions require reviewer and timestamp")
        return self


class Provenance(Contract):
    method: Literal["source", "supplied", "manual", "derived"]
    evidence: Annotated[tuple[Evidence, ...], Field(min_length=1)]
    review: Review
    uncertainty: tuple[Text, ...]


class SourceSnapshot(Versioned):
    source_id: Text
    snapshot_id: Text
    category: Literal["bylaw", "guidance", "design", "spatial", "manual_record", "test_fixture"]
    jurisdiction: Text
    instrument: Text
    source_url: Text
    artifact: Artifact
    captured_at: AwareDatetime
    printed_revision: Text | None
    effective_from: date | None
    effective_to: date | None
    effective_date_evidence: tuple[Evidence, ...]
    original_crs: Text | None
    original_units: tuple[Text, ...]
    reuse_constraints: Text
    review: Review

    @model_validator(mode="after")
    def dates(self):
        if (self.effective_from or self.effective_to) and not self.effective_date_evidence:
            raise ValueError("effective dates require evidence, not capture time")
        if self.effective_from and self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective date interval is reversed")
        return self


class RatioBasis(Contract):
    numerator: Text
    denominator: Text


# Conversions change units only, never legal measurement definitions.
UNITS = {
    "m": ("length", "m", Decimal("1")),
    "ft": ("length", "m", Decimal("0.3048")),
    "m2": ("area", "m2", Decimal("1")),
    "ft2": ("area", "m2", Decimal("0.09290304")),
    "count": ("count", "count", Decimal("1")),
    "%": ("ratio", "fraction", Decimal("0.01")),
    "fraction": ("ratio", "fraction", Decimal("1")),
    "spaces/unit": ("rate", "spaces/unit", Decimal("1")),
}


class Quantity(Contract):
    original_text: Text
    original_value: Nonnegative
    original_unit: Literal["m", "ft", "m2", "ft2", "count", "%", "fraction", "spaces/unit"]
    dimension: Literal["length", "area", "count", "ratio", "rate"]
    value: Nonnegative
    unit: Literal["m", "m2", "count", "fraction", "spaces/unit"]
    basis: RatioBasis | None = None

    @model_validator(mode="after")
    def normalized(self):
        dimension, unit, factor = UNITS[self.original_unit]
        if (self.dimension, self.unit) != (dimension, unit):
            raise ValueError("incompatible unit dimension")
        if self.value != self.original_value * factor:
            raise ValueError("normalized value disagrees with original units")
        if (self.dimension in {"ratio", "rate"}) != (self.basis is not None):
            raise ValueError("ratios/rates require explicit numerator and denominator only")
        if self.dimension == "count" and self.value != self.value.to_integral_value():
            raise ValueError("counts must be integral")
        return self
