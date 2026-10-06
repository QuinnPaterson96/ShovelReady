"""Strict v1 boundary for a bounded candidate-rule comparison."""

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Boundary(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Quantity(Boundary):
    value: Decimal
    unit: Literal["m", "ft", "m2", "ft2", "count"]

    @model_validator(mode="after")
    def finite(self):
        if not self.value.is_finite() or self.value < 0:
            raise ValueError("quantity must be finite and nonnegative")
        return self


class Source(Boundary):
    provider: str = Field(min_length=1)
    record_label: str = Field(min_length=1)
    url: str = Field(min_length=1)
    locator: str = Field(min_length=1)
    capture_date: str | None = None
    source_revision: str | None = None
    currentness_limitations: tuple[str, ...] = ()
    review_status: Literal["candidate", "reviewed"] = "candidate"


class Rule(Boundary):
    logical_id: str = Field(min_length=1)
    revision_id: str = Field(min_length=1)
    kind: Literal["prerequisite", "boundary_min", "separation_min", "area_max"]
    fact_id: str = Field(min_length=1)
    expected: bool | None = None
    threshold: Quantity | None = None
    measurement_definition: str | None = None
    boundary_role: Literal["side", "rear", "flanking_street"] | None = None
    source: Source
    applicability: Literal["applicable", "unknown", "not_applicable", "unsupported"] = "applicable"
    applicability_reason: str | None = None
    required_pathway_facts: tuple[str, ...] = ()
    unsupported_if_true: tuple[str, ...] = ()

    @model_validator(mode="after")
    def shape(self):
        if (
            self.applicability in ("not_applicable", "unsupported")
            and not self.applicability_reason
        ):
            raise ValueError("explicit inapplicability or unsupported scope needs a reason")
        if self.kind == "prerequisite":
            if self.expected is None or self.threshold is not None:
                raise ValueError("prerequisite needs expected bool and no threshold")
        elif self.expected is not None or self.threshold is None or not self.measurement_definition:
            raise ValueError("numeric rule needs threshold and measurement definition")
        if (self.kind == "boundary_min") != (self.boundary_role is not None):
            raise ValueError("boundary role required only for boundary rule")
        if self.kind in ("boundary_min", "separation_min") and self.threshold.unit not in (
            "m", "ft"
        ):
            raise ValueError("distance rule needs length threshold")
        if self.kind == "area_max" and self.threshold.unit not in ("m2", "ft2"):
            raise ValueError("area rule needs area threshold")
        return self


class Fact(Boundary):
    id: str = Field(min_length=1)
    status: Literal["known", "unknown", "unsupported"]
    truth: bool | None = None
    quantity: Quantity | None = None
    measurement_definition: str | None = None
    boundary_role: Literal["front", "rear", "side", "flanking_street", "unknown"] | None = None
    geometry_basis: Literal["wall", "roofline", "nominal", "unknown"] | None = None
    origin: Literal["source", "user_assumption", "user_measurement", "model"]
    source: Source | None = None
    note: str | None = None

    @model_validator(mode="after")
    def state(self):
        if self.status != "known" and (self.truth is not None or self.quantity is not None):
            raise ValueError("unknown or unsupported fact cannot contain a value")
        if self.truth is not None and self.quantity is not None:
            raise ValueError("fact cannot contain both truth and quantity")
        if self.status == "known" and self.truth is None and self.quantity is None:
            raise ValueError("known fact needs a value")
        return self


class Request(Boundary):
    schema_version: Literal["conditional-screening.v1"]
    packet_id: str = Field(min_length=1)
    packet_revision: str = Field(min_length=1)
    property_revision: str = Field(min_length=1)
    placement_revision: str = Field(min_length=1)
    model_revision: str = Field(min_length=1)
    rules: tuple[Rule, ...]
    facts: tuple[Fact, ...]
    scope_limitations: tuple[str, ...] = ()

    @model_validator(mode="after")
    def unique(self):
        if len({r.logical_id for r in self.rules}) != len(self.rules):
            raise ValueError("duplicate logical rule")
        if len({f.id for f in self.facts}) != len(self.facts):
            raise ValueError("duplicate fact")
        return self


Status = Literal[
    "meets_under_assumptions",
    "apparent_conflict_under_assumptions",
    "needs_information",
    "not_applicable",
    "unsupported",
]


class Check(Boundary):
    rule: Rule
    fact: Fact | None
    status: Status
    reasons: tuple[str, ...]
    normalized_observed: Decimal | None = None
    normalized_threshold: Decimal | None = None
    normalized_unit: Literal["m", "m2"] | None = None


class Coverage(Boundary):
    meets_under_assumptions: int
    apparent_conflict_under_assumptions: int
    needs_information: int
    not_applicable: int
    unsupported: int


class Result(Boundary):
    schema_version: Literal["conditional-screening.v1"] = "conditional-screening.v1"
    mode: Literal["candidate_assumption_comparison"] = "candidate_assumption_comparison"
    scope: Literal["supplied_placement_only"] = "supplied_placement_only"
    request: Request
    checks: tuple[Check, ...]
    coverage: Coverage
    outstanding_prerequisites: tuple[str, ...]
    limitations: tuple[str, ...]
