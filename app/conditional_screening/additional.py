"""Bounded scouting observations, kept separate from legal-basis evaluation."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from shapely.geometry import Polygon, mapping, shape
from shapely.ops import nearest_points


class AdditionalInputs(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)
    height_from_average_grade_m: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    nominal_footprint_area_m2: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    advertised_height_m: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    area_buffer_percent: float = Field(default=10, ge=0, le=100, allow_inf_nan=False)
    height_buffer_percent: float = Field(default=10, ge=0, le=100, allow_inf_nan=False)
    foundation_allowance_m: float | None = Field(default=0.30, ge=0, allow_inf_nan=False)


class VisualEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal["scouting-comparison-geometry.v1"] = "scouting-comparison-geometry.v1"
    crs: str
    principal_building_id: str
    principal_outline_area_m2: float = Field(ge=0, allow_inf_nan=False)
    principal_crosses_parcel: bool
    measurement_line: tuple[tuple[float, float], tuple[float, float]]
    rear_yard: dict | None = None
    outside_rear_yard: dict | None = None
    rear_yard_area_m2: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    outside_rear_yard_area_m2: float | None = Field(default=None, ge=0, allow_inf_nan=False)


class AdditionalCheck(BaseModel):
    id: str
    label: str
    status: Literal["checked", "probable", "review", "conflict", "unknown", "unsupported"]
    detail: str
    action_target: str | None = None
    observed: float | None = None
    threshold: float | None = None
    unit: str | None = None
    basis: str
    source: dict
    visual_evidence: VisualEvidence | None = None


def additional_checks(body, boundary_result, packet, source_factory):
    """No overall fit verdict. Roofline geometry stays roofline geometry."""
    rules = dict(packet["additional_scouting"])
    area_rule = next(
        rule
        for rule in packet["rules"]
        if rule["logical_rule_id"] == "victoria-zb2018-garden-suite-floor-area"
    )
    estimates = body.additional_inputs
    supplied_area = body.assumptions.measurements.floor_area
    measured_area = supplied_area is not None and (
        supplied_area.unit == "m2" and supplied_area.basis == "regulatory_floor_area"
    )
    if estimates.nominal_footprint_area_m2 is not None or measured_area:
        rules["area"] = {
            **area_rule,
            "threshold": float(area_rule["normalized"]["value"]),
            "unit": "m2",
        }
    checks = []
    labels = {
        "separation": "Distance from the main building",
        "front": "Front boundary distance",
        "rear_location": "Located behind the main building",
        "rear_occupancy": "Share of the rear yard",
        "height": "Height",
    }
    if "area" in rules:
        labels["area"] = "Floor area"
    targets = {
        "area": "zsa-floor-area" if measured_area else "scouting-area-buffer",
        "separation": "principal-building",
        "front": "boundary-roles",
        "rear_location": "principal-building",
        "rear_occupancy": "principal-building",
        "height": "scouting-height",
    }

    def add(key, status, detail, *, observed=None, basis="missing input"):
        rule = rules[key]
        checks.append(
            AdditionalCheck(
                id=key,
                label=labels[key],
                status=status,
                detail=detail,
                action_target=targets[key]
                if status in ("unknown", "conflict", "probable", "review")
                else None,
                observed=observed,
                threshold=rule.get("threshold"),
                unit=rule.get("unit"),
                basis=basis,
                source=source_factory(packet, rule).model_dump(mode="json"),
            )
        )

    proposal, assumptions = body.proposal, body.assumptions
    supported = (
        proposal.confirmed_zone in ("GRD-1", "GRD-1 (PGA)")
        and proposal.confirmed_instrument == "Zoning Bylaw 2018"
    )
    outside = (
        proposal.confirmed_zone == "other"
        or proposal.confirmed_instrument == "other"
        or proposal.proposed_use == "other"
        or proposal.foundation_attached is False
        or assumptions.building_type.value == "other"
        or proposal.legal_lot_confirmed is False
    )
    if not supported or outside:
        for key in labels:
            add(
                key,
                "unsupported" if outside else "unknown",
                "This pathway is outside the supported comparison."
                if outside
                else "Establish the mapped zone and bylaw before this comparison.",
            )
        return tuple(checks)

    if "area" in rules:
        area = (
            supplied_area.value
            if measured_area
            else estimates.nominal_footprint_area_m2 * (1 + estimates.area_buffer_percent / 100)
        )
        limit = rules["area"]["threshold"]
        add(
            "area",
            "probable" if area <= limit else "conflict" if measured_area else "unknown",
            (
                f"Entered regulatory floor area {'meets' if area <= limit else 'exceeds'} "
                f"the {limit:g} m² candidate limit. User-supplied basis; "
                "other applicability prerequisites remain unresolved."
                if measured_area
                else f"Nominal footprint plus {estimates.area_buffer_percent:g}% = {area:.1f} m², "
                f"{'below' if area <= limit else 'above'} the {limit:g} m² candidate limit. "
                "Planning estimate, not measured regulatory floor area; "
                "confirm levels, inclusions and model configuration."
            ),
            observed=area,
            basis="user-entered regulatory floor area; unverified measurement and applicability"
            if measured_area
            else "nominal footprint plus explicit planning buffer; unverified floor-area proxy",
        )
    height = estimates.height_from_average_grade_m
    limit = rules["height"]["threshold"]
    if height is not None:
        add(
            "height",
            "checked" if height <= limit else "conflict",
            f"Entered height {'meets' if height <= limit else 'exceeds'} {limit:g} m. "
            "Candidate comparison; grade and roof basis are user-supplied.",
            observed=height,
            basis="user-entered Victoria height from average grade",
        )
    elif estimates.advertised_height_m is not None and estimates.foundation_allowance_m is not None:
        height = (
            estimates.advertised_height_m * (1 + estimates.height_buffer_percent / 100)
            + estimates.foundation_allowance_m
        )
        add(
            "height",
            "probable" if height <= limit else "unknown",
            f"Advertised height plus {estimates.height_buffer_percent:g}% and "
            f"{estimates.foundation_allowance_m:g} m foundation allowance = {height:.2f} m, "
            f"{'below' if height <= limit else 'above'} the {limit:g} m candidate limit. "
            "Grade, slope, foundation design and roof datum remain unverified; "
            "the estimate is not measured installed height.",
            observed=height,
            basis="advertised height plus planning buffer and foundation allowance; "
            "not installed height",
        )
    else:
        add(
            "height",
            "unknown",
            "Enter installed height using Victoria's grade/roof definition, "
            "or supply the planning estimate inputs.",
        )

    if assumptions.waterfront.value is True:
        for key in ("separation", "front", "rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                f"{len(assumptions.waterfront_edge_ids)} waterfront edges recorded. "
                "Waterfront front-line classification and siting need a reviewed property plan.",
            )
            checks[-1].action_target = "waterfront-lot"
        return tuple(checks)

    waterfront_assumed = assumptions.waterfront.origin == "journey_default"

    # Front and yard comparisons need street/boundary context. A contained
    # footprint and main-home gap remain separate observations when that is unknown.
    streets = assumptions.street_adjacency
    street_context_missing = streets is not None and not streets.all_marked
    if (not boundary_result.scenarios or street_context_missing
            or assumptions.waterfront.value is None):
        add("front", "unknown",
            "The placement can be measured, but front-line context is unresolved. "
            "Mark known street edges to save your answer, or keep Not sure; "
            "also supply waterfront status if known.")
        checks[-1].action_target = "street-side" if street_context_missing else "boundary-roles"
    else:
        front_distances = [
            assumptions.measurements.boundary[s.front_edge_id].value
            if s.front_edge_id in assumptions.measurements.boundary
            else boundary_result.edge_distances_m[s.front_edge_id]
            for s in boundary_result.scenarios
        ]
        limit = rules["front"]["threshold"]
        outcomes = [distance >= limit for distance in front_distances]
        planning_fronts = [distance - (assumptions.planning_buffers_m.get(s.front_edge_id, 0)
                                      if s.front_edge_id not in assumptions.measurements.boundary
                                      else 0)
                          for distance, s in zip(
                              front_distances, boundary_result.scenarios, strict=True)]
        buffered = any(distance < raw for distance, raw in zip(
            planning_fronts, front_distances, strict=True))
        outcome = "meets" if all(outcomes) else "falls below" if not any(outcomes) else "may meet"
        buffer_review = all(outcomes) and not all(distance >= limit for distance in planning_fronts)
        if buffer_review:
            targets["front"] = "boundary-offsets"
        add(
            "front",
            "review" if buffer_review
            else "probable" if all(outcomes) and (buffered or waterfront_assumed)
            else "checked"
            if all(outcomes) and assumptions.waterfront.value is False
            else "probable"
            if all(outcomes)
            else "conflict"
            if not any(outcomes)
            else "unknown",
            f"Approximate front distance {outcome} {limit:g} m across tested front-edge choices. "
            "Building faces and projections need review. "
            + (f"Planning clearance after the edge buffers: {max(0, min(planning_fronts)):.2f} m. "
               + ("Buffer shortfall only: needs review, not an observed distance conflict. "
                  if buffer_review else "Planning allowance; see the raw comparison above. ")
               if buffered else "")
            + (
                "Assuming this is not a waterfront lot."
                if assumptions.waterfront.value is None or waterfront_assumed else ""
            ),
            observed=min(front_distances),
            basis="captured parcel to nominal rectangle with user wall-to-line overrides; "
            "coherent front-edge scenarios",
        )

    building_id = assumptions.principal_building_id.value
    building = next((b for b in body.geometry.buildings if b.id == building_id), None)
    inferred = assumptions.principal_building_id.origin == "journey_default"
    if inferred:
        building = None
    if (building_id is None and assumptions.infer_principal_building) or inferred:
        parcel = shape(body.geometry.parcel.shape.geometry)
        candidates = []
        for item in body.geometry.buildings:
            outline = shape(item.shape.geometry)
            if (
                item.shape.crs == body.geometry.projected_metre_crs
                and item.basis != "unknown"
                and outline.geom_type == "Polygon"
                and outline.is_valid
                and not outline.is_empty
            ):
                candidates.append((outline.area, item))
        candidates.sort(key=lambda item: item[0], reverse=True)
        if candidates and (len(candidates) == 1 or candidates[0][0] > candidates[1][0]):
            if (building_id is None or candidates[0][1].id == building_id) and parcel.covers(
                shape(candidates[0][1].shape.geometry).centroid
            ):
                building = candidates[0][1]
                inferred = True
    if building is None:
        for key in ("separation", "rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "Select the main building; no unique usable largest outline was found.",
            )
        return tuple(checks)
    principal = shape(building.shape.geometry)
    if (
        building.shape.crs != body.geometry.projected_metre_crs
        or building.basis == "unknown"
        or principal.geom_type != "Polygon"
        or not principal.is_valid
        or principal.is_empty
    ):
        for key in ("separation", "rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "The selected main-building geometry cannot support this comparison.",
            )
        return tuple(checks)
    from app.scouting_geometry.core import assess

    geometry = assess(body.geometry)
    footprint = shape(geometry.placement_geometry)
    gap = footprint.distance(principal)
    limit = rules["separation"]["threshold"]
    building_label = (
        "largest mapped outline, assumed main building" if inferred else "selected building"
    )
    add(
        "separation",
        "probable" if gap >= limit and inferred else "checked" if gap >= limit else "conflict",
        f"The nominal model {'meets' if gap >= limit else 'falls below'} {limit:g} m "
        f"to the {building_label} "
        f"({building.basis}). Approximate only; legal endpoints need review.",
        observed=gap,
        basis=f"{'largest-outline assumption' if inferred else 'user-selected building'} "
        f"{building.id}: {building.basis} to nominal model; not legal wall separation",
    )

    endpoints = nearest_points(footprint, principal)
    visual = VisualEvidence(
        crs=body.geometry.projected_metre_crs, principal_building_id=building.id,
        principal_outline_area_m2=principal.area,
        principal_crosses_parcel=not shape(body.geometry.parcel.shape.geometry).covers(principal),
        measurement_line=tuple((p.x, p.y) for p in endpoints),
    )
    checks[-1].visual_evidence = visual
    if visual.principal_crosses_parcel:
        checks[-1].detail += (
            " The mapped main roofline crosses the parcel boundary; confirm both outlines."
        )

    if not boundary_result.scenarios or street_context_missing:
        for key in ("rear_location", "rear_occupancy"):
            add(key, "unknown",
                "Street completeness and a coherent front/rear classification are unresolved. "
                "Mark known street edges and explicitly confirm the selection, "
                "or continue with Not sure.")
            checks[-1].action_target = "street-side" if street_context_missing else "boundary-roles"
        return tuple(checks)

    if (
        assumptions.building_type.value not in ("single_detached", "duplex")
        or assumptions.waterfront.value is not False
    ):
        for key in ("rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "Confirm main building use and waterfront status "
                "to explore legal rear-yard assumptions.",
            )
        return tuple(checks)

    # A single coherent rear line and a simple principal outline are prerequisites.
    rears = {c.edge_id for s in boundary_result.scenarios for c in s.checks if c.role == "rear"}
    if len(rears) != 1 or body.street_pattern != "single":
        for key in ("rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "Mark the street side and confirm a single-street lot to explore the rear yard.",
            )
            checks[-1].action_target = "boundary-roles"
        return tuple(checks)
    parcel = shape(body.geometry.parcel.shape.geometry)
    if len(principal.interiors):
        for key in ("rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "The house outline has holes; "
                "rear-yard geometry needs review.",
            )
        return tuple(checks)
    rear = next(e for e in assumptions.edges if e.id in rears)
    dx, dy = rear.end[0] - rear.start[0], rear.end[1] - rear.start[1]
    length = (dx * dx + dy * dy) ** 0.5
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux
    origin = rear.start

    def dot(point):
        return (point[0] - origin[0]) * nx + (point[1] - origin[1]) * ny

    if dot((parcel.centroid.x, parcel.centroid.y)) < 0:
        nx, ny = -nx, -ny
    cut = min(dot(point) for point in principal.exterior.coords)
    span = max(parcel.bounds[2] - parcel.bounds[0], parcel.bounds[3] - parcel.bounds[1]) * 4

    def point(along, inward):
        return (origin[0] + along * ux + inward * nx, origin[1] + along * uy + inward * ny)

    yard = parcel.intersection(
        Polygon([point(-span, -span), point(span, -span), point(span, cut), point(-span, cut)])
    )
    if yard.is_empty or yard.area <= 0:
        for key in ("rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "A positive rear-yard area could not be derived from these outlines.",
            )
        return tuple(checks)
    outside = footprint.difference(yard)
    visual = visual.model_copy(update={
        "rear_yard": mapping(yard),
        "outside_rear_yard": None if outside.is_empty else mapping(outside),
        "rear_yard_area_m2": yard.area, "outside_rear_yard_area_m2": outside.area,
    })
    inside = yard.covers(footprint)
    add(
        "rear_location",
        "probable" if inside and (waterfront_assumed or inferred)
        else "checked" if inside else "conflict",
        "The nominal footprint is "
        + ("inside" if inside else "not wholly inside")
        + " the approximate rear yard. Building faces and legal yard boundaries need review."
        + (" Assuming not waterfront." if waterfront_assumed else "")
        + (" Using the assumed main outline." if inferred else ""),
        basis="parcel clipped at rear-most principal outline, parallel to chosen rear line",
    )
    checks[-1].visual_evidence = visual
    ratio = footprint.area / yard.area
    limit = rules["rear_occupancy"]["threshold"]
    add(
        "rear_occupancy",
        "probable" if ratio <= limit and (waterfront_assumed or inferred)
        else "checked" if ratio <= limit else "conflict",
        "The nominal footprint "
        + ("meets" if ratio <= limit else "exceeds")
        + " the 25% candidate share of the approximate rear yard. "
        "Projections and legal occupied area remain unreviewed."
        + (" Assuming not waterfront." if waterfront_assumed else "")
        + (" Using the assumed main outline." if inferred else ""),
        observed=ratio,
        basis=f"nominal footprint {footprint.area!r} m2 / approximate rear yard {yard.area!r} m2",
    )
    checks[-1].visual_evidence = visual
    return tuple(checks)
