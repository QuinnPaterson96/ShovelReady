"""Bounded scouting observations, kept separate from legal-basis evaluation."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from shapely.geometry import Polygon, shape


class AdditionalInputs(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)
    height_from_average_grade_m: float | None = Field(default=None, ge=0, allow_inf_nan=False)


class AdditionalCheck(BaseModel):
    id: str
    label: str
    status: Literal["checked", "conflict", "unknown", "unsupported"]
    detail: str
    action_target: str | None = None
    observed: float | None = None
    threshold: float | None = None
    unit: str | None = None
    basis: str
    source: dict


def additional_checks(body, boundary_result, packet, source_factory):
    """No overall fit verdict. Roofline geometry stays roofline geometry."""
    rules = packet["additional_scouting"]
    checks = []
    labels = {
        "separation": "Distance from the main building",
        "front": "Front boundary distance",
        "rear_location": "Located behind the main building",
        "rear_occupancy": "Share of the rear yard",
        "height": "Height",
    }
    targets = {
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
                action_target=targets[key] if status in ("unknown", "conflict") else None,
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

    height = body.additional_inputs.height_from_average_grade_m
    limit = rules["height"]["threshold"]
    add(
        "height",
        "unknown" if height is None else "checked" if height <= limit else "conflict",
        "Enter installed height using Victoria's grade/roof definition, not catalogue height."
        if height is None
        else (f"Entered height {'meets' if height <= limit else 'exceeds'} {limit:g} m. "
              "Candidate comparison; grade and roof basis are user-supplied."),
        observed=height,
        basis="user-entered Victoria height from average grade",
    )

    # Existing boundary validation establishes parcel/placement/edge correspondence.
    if not boundary_result.scenarios:
        for key in ("separation", "front", "rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "Review placement and boundary roles; a valid contained placement is needed.",
            )
        return tuple(checks)
    if assumptions.waterfront.value is not False:
        for key in ("separation", "front", "rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "Confirm waterfront status. Waterfront siting needs separate review.",
            )
            checks[-1].action_target = "waterfront-lot"
        return tuple(checks)

    front_distances = [
        boundary_result.edge_distances_m[s.front_edge_id] for s in boundary_result.scenarios
    ]
    limit = rules["front"]["threshold"]
    outcomes = [distance >= limit for distance in front_distances]
    outcome = "meets" if all(outcomes) else "falls below" if not any(outcomes) else "may meet"
    add(
        "front",
        "checked" if all(outcomes) else "conflict" if not any(outcomes) else "unknown",
        f"Approximate front distance {outcome} {limit:g} m across tested front-edge choices. "
        "Building faces and projections need review.",
        observed=min(front_distances),
        basis="captured parcel to nominal rectangle; coherent front-edge scenarios",
    )

    building_id = assumptions.principal_building_id.value
    building = next((b for b in body.geometry.buildings if b.id == building_id), None)
    if building is None or assumptions.building_type.value not in ("single_detached", "duplex"):
        for key in ("separation", "rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "Select the main building and its use: single detached home or duplex.",
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
    add(
        "separation",
        "checked" if gap >= limit else "conflict",
        f"The nominal model {'meets' if gap >= limit else 'falls below'} {limit:g} m "
        f"to the selected {building.basis}. Approximate only; legal endpoints need review.",
        observed=gap,
        basis=f"selected {building.basis} to nominal model; not legal wall separation",
    )

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
    if not parcel.covers(principal) or len(principal.interiors):
        for key in ("rear_location", "rear_occupancy"):
            add(
                key,
                "unknown",
                "The house outline crosses the parcel or has holes; "
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
        return (origin[0] + along * ux + inward * nx,
                origin[1] + along * uy + inward * ny)
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
    inside = yard.covers(footprint)
    add(
        "rear_location",
        "checked" if inside else "conflict",
        "The nominal footprint is "
        + ("inside" if inside else "not wholly inside")
        + " the approximate rear yard. Building faces and legal yard boundaries need review.",
        basis="parcel clipped at rear-most principal outline, parallel to chosen rear line",
    )
    ratio = footprint.area / yard.area
    limit = rules["rear_occupancy"]["threshold"]
    add(
        "rear_occupancy",
        "checked" if ratio <= limit else "conflict",
        "The nominal footprint "
        + ("meets" if ratio <= limit else "exceeds")
        + " the 25% candidate share of the approximate rear yard. "
        "Projections and legal occupied area remain unreviewed.",
        observed=ratio,
        basis=f"nominal footprint {footprint.area!r} m2 / approximate rear yard {yard.area!r} m2",
    )
    return tuple(checks)
