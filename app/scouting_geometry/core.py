"""Deterministic planar measurements; no buffering, repair or placement search."""

import math

from pyproj import CRS
from pyproj.exceptions import CRSError
from shapely import affinity
from shapely.geometry import Polygon, mapping, shape
from shapely.validation import explain_validity

from .payloads import Assessment, Check, Request


def _finite_numbers(value):
    if isinstance(value, dict):
        return all(_finite_numbers(v) for v in value.values())
    if isinstance(value, (list, tuple)):
        return all(_finite_numbers(v) for v in value)
    return not isinstance(value, (float, int)) or (
        not isinstance(value, bool) and math.isfinite(value)
    )


def _geometry(feature, expected_crs, kind):
    if feature.shape.crs != expected_crs:
        return None, "geometry_crs_mismatch"
    raw = feature.shape.geometry
    if not _finite_numbers(raw):
        return None, "nonfinite_coordinate"
    try:
        geom = shape(raw)
    except (TypeError, ValueError, KeyError, IndexError) as exc:
        return None, f"malformed_geometry: {type(exc).__name__}"
    if geom.geom_type != kind or geom.is_empty:
        return None, f"expected_nonempty_{kind}"
    if not geom.is_valid:
        return None, "invalid_geometry: " + explain_validity(geom)
    if kind == "Polygon" and geom.area <= 0:
        return None, "zero_area_polygon"
    return geom, None


def _placement(placement):
    nums = (*placement.centre_xy, placement.width_m, placement.depth_m, placement.angle_degrees)
    if any(isinstance(n, bool) or not math.isfinite(n) for n in nums):
        return None, "nonfinite_placement"
    if placement.width_m <= 0 or placement.depth_m <= 0:
        return None, "nonpositive_placement_dimension"
    x, y = placement.centre_xy
    w, d = placement.width_m / 2, placement.depth_m / 2
    rectangle = Polygon([(-w, -d), (w, -d), (w, d), (-w, d)])
    rectangle = affinity.rotate(rectangle, placement.angle_degrees, origin=(0, 0))
    return affinity.translate(rectangle, xoff=x, yoff=y), None


def _crs_reason(crs_text):
    # A measured user sketch has metre axes but no geographic location. Keep
    # this one engineering frame distinct from all projected map coordinates.
    if crs_text == "LOCAL:METRE":
        return None
    try:
        crs = CRS.from_user_input(crs_text)
    except (TypeError, ValueError, CRSError):
        return "invalid_crs"
    if (
        not crs.is_projected
        or len(crs.axis_info) < 2
        or any(not math.isclose(axis.unit_conversion_factor, 1.0) for axis in crs.axis_info[:2])
    ):
        return "crs_must_be_projected_metres"
    return None


def assess(request: Request) -> Assessment:
    """Measure only this rectangle in the declared XY CRS; preserve the exact request."""
    crs_error = _crs_reason(request.projected_metre_crs)
    footprint, placement_error = _placement(request.placement)
    parcel, parcel_error = _geometry(request.parcel, request.projected_metre_crs, "Polygon")
    buildings = {
        b.id: _geometry(b, request.projected_metre_crs, "Polygon") for b in request.buildings
    }
    boundaries = {
        b.id: _geometry(b, request.projected_metre_crs, "LineString")
        for b in request.named_boundaries
    }
    if crs_error:
        placement_error = crs_error
        parcel_error = crs_error
        buildings = {key: (None, crs_error) for key in buildings}
        boundaries = {key: (None, crs_error) for key in boundaries}
        footprint = None
    checks = []

    if placement_error or parcel_error:
        checks.append(
            Check(
                id="containment",
                kind="containment",
                status="invalid",
                reason=placement_error or parcel_error,
                source_feature_ids=(request.parcel.id,),
            )
        )
        checks.append(
            Check(
                id="parcel_boundary",
                kind="parcel_boundary_distance",
                status="invalid",
                reason=placement_error or parcel_error,
                source_feature_ids=(request.parcel.id,),
            )
        )
    else:
        outside = footprint.difference(parcel).area
        touches = footprint.intersects(parcel.boundary)
        relation = "outside" if outside > 0 else "touches" if touches else "contained"
        checks.append(
            Check(
                id="containment",
                kind="containment",
                status="observed",
                relation=relation,
                area_m2=outside,
                source_feature_ids=(request.parcel.id,),
            )
        )
        checks.append(
            Check(
                id="parcel_boundary",
                kind="parcel_boundary_distance",
                status="observed",
                distance_m=footprint.distance(parcel.boundary),
                source_feature_ids=(request.parcel.id,),
            )
        )

    usable_buildings = []
    for building in request.buildings:
        geom, error = buildings[building.id]
        ids = (building.id,)
        if placement_error or error:
            for kind, suffix in (
                ("building_overlap", "overlap"),
                ("building_distance", "distance"),
            ):
                checks.append(
                    Check(
                        id=f"building:{building.id}:{suffix}",
                        kind=kind,
                        status="invalid",
                        reason=placement_error or error,
                        source_feature_ids=ids,
                    )
                )
            continue
        area = footprint.intersection(geom).area
        relation = (
            "positive_area_overlap"
            if area > 0
            else "touches"
            if footprint.touches(geom)
            else "separate"
        )
        checks.append(
            Check(
                id=f"building:{building.id}:overlap",
                kind="building_overlap",
                status="observed",
                relation=relation,
                area_m2=area,
                source_feature_ids=ids,
            )
        )
        distance = footprint.distance(geom)
        checks.append(
            Check(
                id=f"building:{building.id}:distance",
                kind="building_distance",
                status="observed",
                distance_m=distance,
                source_feature_ids=ids,
            )
        )
        usable_buildings.append((building.id, distance))

    if placement_error or any(error for _, error in buildings.values()):
        checks.append(
            Check(
                id="nearest_building",
                kind="nearest_building_distance",
                status="invalid",
                reason=placement_error or "some_building_geometry_invalid",
            )
        )
    elif not usable_buildings:
        checks.append(
            Check(
                id="nearest_building",
                kind="nearest_building_distance",
                status="missing",
                reason="no_mapped_buildings_supplied",
            )
        )
    else:
        minimum = min(distance for _, distance in usable_buildings)
        nearest = tuple(id for id, distance in usable_buildings if distance == minimum)
        checks.append(
            Check(
                id="nearest_building",
                kind="nearest_building_distance",
                status="observed",
                distance_m=minimum,
                source_feature_ids=nearest,
            )
        )

    for boundary in request.named_boundaries:
        geom, error = boundaries[boundary.id]
        if placement_error or error:
            checks.append(
                Check(
                    id=f"boundary:{boundary.id}",
                    kind="named_boundary_distance",
                    status="invalid",
                    reason=placement_error or error,
                    source_feature_ids=(boundary.id,),
                )
            )
        else:
            checks.append(
                Check(
                    id=f"boundary:{boundary.id}",
                    kind="named_boundary_distance",
                    status="observed",
                    distance_m=footprint.distance(geom),
                    source_feature_ids=(boundary.id,),
                )
            )

    by_id = {check.id: check for check in checks}
    for requirement in request.requirements:
        target = {
            "parcel_boundary": "parcel_boundary",
            "nearest_building": "nearest_building",
            "building": f"building:{requirement.target_id}:distance",
            "named_boundary": f"boundary:{requirement.target_id}",
        }[requirement.target]
        observed = by_id.get(target)
        common = {"requirement_id": requirement.id, "requirement_status": requirement.status}
        if observed is None:
            checks.append(
                Check(
                    id=f"requirement:{requirement.id}",
                    kind="requirement",
                    status="missing",
                    reason="target_not_supplied",
                    **common,
                )
            )
        elif observed.status != "observed":
            checks.append(
                Check(
                    id=f"requirement:{requirement.id}",
                    kind="requirement",
                    status=observed.status,
                    reason=observed.reason,
                    **common,
                    source_feature_ids=observed.source_feature_ids,
                )
            )
        elif requirement.target == "parcel_boundary" and by_id["containment"].relation == "outside":
            checks.append(
                Check(
                    id=f"requirement:{requirement.id}",
                    kind="requirement",
                    status="unsupported",
                    reason="placement_not_contained_by_parcel",
                    **common,
                    source_feature_ids=observed.source_feature_ids,
                )
            )
        elif not math.isfinite(requirement.minimum_m) or requirement.minimum_m < 0:
            checks.append(
                Check(
                    id=f"requirement:{requirement.id}",
                    kind="requirement",
                    status="invalid",
                    reason="invalid_minimum",
                    **common,
                )
            )
        else:
            margin = observed.distance_m - requirement.minimum_m
            checks.append(
                Check(
                    id=f"requirement:{requirement.id}",
                    kind="requirement",
                    status="compared",
                    distance_m=observed.distance_m,
                    margin_m=margin,
                    comparison="meets" if margin >= 0 else "shortfall",
                    **common,
                    source_feature_ids=observed.source_feature_ids,
                )
            )

    limitations = [
        "Observations concern this supplied placement only; no legal or site fit conclusion.",
        "Building distances use each supplied polygon basis; a roofline is not a wall.",
        "Unmapped obstructions and positional error are not measured.",
    ]
    if request.projected_metre_crs == "LOCAL:METRE":
        limitations.append(
            "Local metre sketch has no geolocation, surveyed orientation or verified "
            "parcel boundary."
        )
    if request.capture.completeness != "complete_for_declared_scope":
        limitations.append(
            "Building capture is incomplete or unknown; no-overlap is not verified clear space."
        )
    limitations.extend(request.capture.limitations)
    return Assessment(
        input=request,
        placement_geometry=mapping(footprint) if footprint else None,
        checks=tuple(checks),
        limitations=tuple(limitations),
    )
