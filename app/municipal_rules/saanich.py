"""Source-backed Saanich scalar comparisons, with unresolved siting kept explicit."""

import json
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from shapely.geometry import shape

from app.conditional_screening.core import evaluate as compare
from app.conditional_screening.payloads import Boundary, Fact, Quantity, Request, Rule, Source
from app.conditional_screening.site_context import Assumptions
from app.scouting_geometry.core import assess
from app.scouting_geometry.payloads import Request as GeometryRequest

from .models import Definition, Finding, InputField, Profile

REVISION = "saanich-garden-suite-scalar.2026-11-09"
PATHWAY = "saanich-garden-suite-existing-single-family-v1"
_FIELDS = (
    ("lot_area", "Lot area", "area_min", "m2", "saanich-gs-min-lot-area"),
    ("lot_width", "Lot width", "length_min", "m", "saanich-gs-min-lot-width"),
    ("floor_area", "Garden-suite floor area", "area_max", "m2", "saanich-gs-max-gfa-r"),
    (
        "open_space",
        "Landscaped share of lot",
        "ratio_min",
        "fraction",
        "saanich-gs-min-open-site-space",
    ),
)


@lru_cache(maxsize=1)
def packet():
    path = (
        Path(__file__).resolve().parents[2]
        / "docs/municipality-transfer/saanich/rules/candidates.json"
    )
    return json.loads(path.read_text(encoding="utf-8"))


def source(check: dict) -> Source:
    captured = packet()["source"]
    return Source(
        provider="District of Saanich",
        record_label="Zoning Bylaw 8200 garden-suite provisions",
        url=captured["url"],
        locator=check["locator"],
        capture_date=captured["captured_on"],
        source_revision=None,
        review_status="unreviewed",
        currentness_limitations=(
            "Manually captured September 25, 2026; effective amendment chain remains unresolved.",
            "Provisional comparisons use the retained source excerpts and stated assumptions.",
        ),
    )


def definitions() -> dict[str, Definition]:
    checks = {check["identity"]["logical_id"]: check for check in packet()["checks"]}
    return {
        field: Definition(
            id=check["identity"]["logical_id"],
            revision=check["identity"]["revision_id"],
            label=label,
            unit=unit,
            basis=check["measurement_definition"],
            description=check["context"],
            source=source(check),
        )
        for field, label, _kind, unit, logical_id in _FIELDS
        for check in (checks[logical_id],)
    }


def profile() -> Profile:
    fields = definitions()
    return Profile(
        jurisdiction_id="ca-bc-saanich",
        name="Saanich",
        locality="saanich",
        aliases=("district of saanich",),
        parcel_source="district-of-saanich-parcels",
        capabilities=("parcels", "buildings", "street_edges", "waterfront_edges", "screening"),
        pathway_id=PATHWAY,
        label="Saanich garden-suite comparisons",
        revision=REVISION,
        scope="Preliminary lot area, defined width, floor area and landscaped-share comparisons "
        "for a new Saanich garden suite with an existing single-family dwelling.",
        inputs=(
            *(
                InputField(
                    id=key,
                    label=value.label,
                    kind="measurement",
                    definition=value,
                    help=value.description,
                )
                for key, value in fields.items()
            ),
            InputField(
                id="zone_permits",
                label="Does the property's zone permit a garden suite?",
                kind="boolean",
                help="Check the applicable zone schedule in Bylaw 8200. "
                "Automatic Saanich zoning lookup is not available in this assessment.",
            ),
            InputField(
                id="sewer_service_area",
                label="Inside the Sewer Service Area?",
                kind="boolean",
                help="Use the District's service-area boundary.",
            ),
            InputField(
                id="urban_containment",
                label="Inside the Urban Containment Boundary?",
                kind="boolean",
                help="Either this boundary or the Sewer Service Area "
                "can meet the location condition in §5.35(b)(ii).",
            ),
        ),
    )


class Measurement(Boundary):
    quantity: Quantity
    definition_id: str
    definition_revision: str
    origin: Literal["user_measurement", "user_assumption"]


class Inputs(Boundary):
    lot_area: Measurement | None = None
    lot_width: Measurement | None = None
    floor_area: Measurement | None = None
    open_space: Measurement | None = None
    zone_permits: bool | None = Field(default=None, strict=True)
    sewer_service_area: bool | None = Field(default=None, strict=True)
    urban_containment: bool | None = Field(default=None, strict=True)


class SaanichRequest(Boundary):
    assumptions: Assumptions
    geometry: GeometryRequest
    model_revision: str = Field(min_length=1, max_length=240)
    proposed_use: Literal["garden_suite", "other"] | None
    inputs: Inputs

    @model_validator(mode="after")
    def matching_property(self):
        prop = self.assumptions.property
        if (
            prop.parcel_id != self.geometry.parcel.id
            or prop.crs != self.geometry.projected_metre_crs
            or prop.source != self.geometry.parcel.source.model_dump(mode="json")
        ):
            raise ValueError("geometry must belong to the supplied property context")
        return self


def evaluate(payload: dict):
    body = SaanichRequest.model_validate_json(json.dumps(payload))
    fields = definitions()
    facts = []
    rules = []
    findings = []
    # Preserve three-valued OR. A known true branch is sufficient; two false
    # branches establish a conflict; false plus unknown remains unknown.
    location = (body.inputs.sewer_service_area, body.inputs.urban_containment)
    location_value = True if True in location else False if location == (False, False) else None
    dwelling = body.assumptions.building_type
    single_family = (
        None if dwelling.value in (None, "unknown") else dwelling.value == "single_detached"
    )
    existing_suites = body.assumptions.existing_garden_suites
    prerequisites = (
        (
            "zone_permits",
            "Garden-suite zone",
            body.inputs.zone_permits,
            "user_assumption",
            "Confirm garden-suite permission in the property's zone schedule.",
            "§5.35(b)(i)",
        ),
        (
            "location",
            "Servicing or urban boundary",
            location_value,
            "derived_assumption",
            "Check the Sewer Service Area or Urban Containment Boundary.",
            "§5.35(b)(ii)",
        ),
        (
            "single_family",
            "Existing single-family dwelling",
            single_family,
            "journey_default" if dwelling.origin == "journey_default" else "user_assumption",
            "Confirm the main building is a single-family dwelling.",
            "§5.35(b)(v)",
        ),
        (
            "no_existing_suite",
            "Existing garden suites",
            None if existing_suites.value is None else existing_suites.value == 0,
            "journey_default" if existing_suites.origin == "journey_default" else "user_assumption",
            "Confirm the existing suite count. An existing garden suite needs a separate "
            "replacement or retention scenario before exploring another new suite.",
            "§5.35(c)",
        ),
    )
    outside_use = body.proposed_use != "garden_suite"
    contradicted = any(value is False for _id, _label, value, _origin, _next, _loc in prerequisites)
    for key, _label, value, origin, _next_action, locator in prerequisites:
        rule_source = source({"locator": f"Zoning Bylaw 8200 {locator}"})
        facts.append(
            Fact(id=key, status="unknown" if value is None else "known", truth=value, origin=origin)
        )
        rules.append(
            Rule(
                logical_id=f"saanich-gs-{key}",
                revision_id=REVISION,
                kind="prerequisite",
                fact_id=key,
                expected=True,
                source=rule_source,
                applicability="unsupported" if outside_use else "applicable",
                applicability_reason="Choose a garden-suite scenario." if outside_use else None,
            )
        )

    measured = assess(body.geometry)
    valid_parcel = measured.checks[0].status == "observed"
    captured_checks = {check["identity"]["logical_id"]: check for check in packet()["checks"]}
    for key, _label, kind, _unit, logical_id in _FIELDS:
        check = captured_checks[logical_id]
        definition = fields[key]
        supplied = getattr(body.inputs, key)
        quantity = supplied.quantity if supplied else None
        basis = definition.basis
        origin = supplied.origin if supplied else "user_measurement"
        note = None
        if supplied and (
            supplied.definition_id != definition.id
            or supplied.definition_revision != definition.revision
        ):
            basis = "Unmatched supplied measurement definition"
        if key == "open_space" and quantity and quantity.value > 1:
            raise ValueError("landscaped share must be a fraction between zero and one")
        if key == "lot_area" and supplied is None and valid_parcel:
            quantity = Quantity(
                value=Decimal(str(shape(body.geometry.parcel.shape.geometry).area)), unit="m2"
            )
            origin = "derived_assumption"
            note = "Captured polygon area used as an approximate lot-area assumption; "
            note += "parcel/strata identity and legal boundaries remain unverified."
        facts.append(
            Fact(
                id=key,
                status="known" if quantity else "unknown",
                quantity=quantity,
                measurement_definition=basis,
                origin=origin,
                note=note,
            )
        )
        rules.append(
            Rule(
                logical_id=definition.id,
                revision_id=definition.revision,
                kind=kind,
                fact_id=key,
                threshold=Quantity(
                    value=check["quantity"]["value"], unit=check["quantity"]["unit"]
                ),
                measurement_definition=definition.basis,
                source=definition.source,
                applicability="unsupported" if outside_use or contradicted else "applicable",
                applicability_reason="A supplied use or eligibility fact is outside "
                "this garden-suite pathway."
                if outside_use or contradicted
                else None,
            )
        )
    prop = body.assumptions.property
    result = compare(
        Request(
            schema_version="conditional-screening.v1",
            packet_id=PATHWAY,
            packet_revision=REVISION,
            property_revision=f"{prop.case_id}:{prop.parcel_id}:{prop.geometry_revision}",
            placement_revision=body.assumptions.placement_revision,
            model_revision=body.model_revision,
            rules=tuple(rules),
            facts=tuple(facts),
            scope_limitations=(
                profile().scope,
                "Scalar matches can support preliminary investigation while zoning and location "
                "remain open questions; they do not establish the full pathway.",
                "Siting, roof/height branches, parcel/strata relationship, overlays, "
                "servicing design and permits remain outside this comparison.",
            ),
            site_assumptions=body.assumptions.model_dump(mode="json"),
            proposal_evidence={
                "proposed_use": body.proposed_use,
                "source_packet": packet(),
                "municipal_inputs": body.inputs.model_dump(mode="json"),
                "parcel_geometry": body.geometry.parcel.model_dump(mode="json"),
            },
        )
    )
    labels = {key: (label, next_action) for key, label, _v, _o, next_action, _loc in prerequisites}
    for check in result.checks:
        key = check.rule.fact_id
        label = fields[key].label if key in fields else labels[key][0]
        supplied = check.normalized_observed
        if supplied is not None:
            detail = (
                "Meets this candidate threshold under the stated measurement assumptions."
                if check.status == "meets_under_assumptions"
                else "The supplied measurement conflicts with the candidate threshold."
            )
            if check.fact and check.fact.note:
                detail += f" {check.fact.note}"
        elif check.status == "meets_under_assumptions":
            detail = "Meets this condition under the stated property assumption."
        elif check.status == "apparent_conflict_under_assumptions":
            detail = "The supplied answer conflicts with this garden-suite condition."
        elif check.status == "needs_information":
            detail = (
                "A measurement using the Saanich definition is still needed."
                if key in fields
                else labels[key][1]
            )
        else:
            detail = " ".join(check.reasons)
        next_action = (
            f"Supply {label.lower()} using the Saanich measurement definition."
            if key in fields
            else labels[key][1]
        )
        findings.append(
            Finding(
                id=check.rule.logical_id,
                label=label,
                status=check.status,
                detail=detail,
                input_id="sewer_service_area"
                if key == "location"
                else None
                if key in ("single_family", "no_existing_suite")
                else key,
                next_action=next_action,
                source=check.rule.source,
            )
        )
    findings.append(
        Finding(
            id="saanich-unmapped-checks",
            label="Siting and other requirements",
            status="unsupported",
            detail="Height, roof-dependent setbacks, parcel/strata relationship and "
            "other applicable provisions are outside the implemented subset.",
            next_action="Ask the provider or District which siting and servicing questions "
            "need investigation for this proposal.",
            source=source(captured_checks["saanich-gs-height-roof-branch"]),
        )
    )
    return result, tuple(findings)
