"""Planar XY operations, retaining raw XYZ elsewhere; never repair invalid input."""

import json
import math

from pyproj import CRS, Transformer, network
from shapely.geometry import MultiPolygon, Polygon, mapping
from shapely.ops import transform, unary_union
from shapely.validation import explain_validity

from .payloads import Intersection, ParcelAnalysis

SLIVER_M2 = 0.01  # Reporting flag only; no intersection is discarded.


def split_at_repeated_vertices(ring):
    """Decompose exact Esri self-touches without moving/adding any vertex or edge."""
    pending, loops = [ring], []
    while pending:
        current = pending.pop()
        seen = {}
        for i, vertex in enumerate(current[:-1]):
            key = tuple(vertex[:2])
            if key in seen:
                j = seen[key]
                pending.extend([current[j : i + 1], current[: j + 1] + current[i + 1 :]])
                break
            seen[key] = i
        else:
            loops.append(current)
    return loops


def xy_polygon(raw, *, has_z=False, has_m=False):
    """Esri even-odd ring nesting supports holes, disjoint shells and nested islands.

    Reject crossed/overlapping rings and invalid polygons, without buffer(0),
    make_valid, snapping or choosing a largest component. Return an investigation reason.
    """
    if raw is None:
        return None, "missing_geometry"
    if not isinstance(raw, dict) or set(raw) - {"rings", "spatialReference", "hasZ", "hasM"}:
        return None, "unsupported_geometry"
    if raw.get("hasZ", has_z) != has_z or raw.get("hasM", has_m) != has_m:
        return None, "coordinate_dimension_metadata_mismatch"
    crs = raw.get("spatialReference", {"wkid": 3157})
    if not isinstance(crs, dict) or crs.get("wkid") != 3157:
        return None, "geometry_crs_mismatch"
    rings = raw.get("rings")
    if not isinstance(rings, list) or not rings:
        return None, "empty_geometry"
    if has_m:
        return None, "unsupported_measure_coordinates"
    polygons = []
    decomposed = False
    for ring in rings:
        if not isinstance(ring, list) or len(ring) < 4:
            return None, "short_ring"
        for point in ring:
            if (
                not isinstance(point, list)
                or len(point) != (3 if has_z else 2)
                or any(
                    isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n)
                    for n in point
                )
            ):
                return None, "invalid_coordinate"
        if ring[0] != ring[-1]:
            return None, "unclosed_ring"
        loops = split_at_repeated_vertices(ring)
        decomposed |= len(loops) > 1
        for loop in loops:
            if len(loop) < 4:
                return None, "degenerate_self_touch"
            polygon = Polygon([p[:2] for p in loop])
            if not polygon.is_valid or polygon.area == 0:
                return None, "invalid_ring: " + explain_validity(polygon)
            polygons.append(polygon)
    parents = []
    for i, polygon in enumerate(polygons):
        containers = []
        for j, other in enumerate(polygons):
            if i == j:
                continue
            if polygon.equals(other):
                return None, "duplicate_ring"
            if other.contains(polygon):
                containers.append(j)
            elif polygon.intersection(other).area > 0 and not polygon.contains(other):
                return None, "crossed_rings"
        parents.append(min(containers, key=lambda j: polygons[j].area) if containers else None)

    def depth(i):
        return 0 if parents[i] is None else 1 + depth(parents[i])

    shells = [
        Polygon(
            p.exterior.coords,
            [polygons[j].exterior.coords for j in range(len(polygons)) if parents[j] == i],
        )
        for i, p in enumerate(polygons)
        if depth(i) % 2 == 0
    ]
    result = shells[0] if len(shells) == 1 else MultiPolygon(shells)
    if not result.is_valid:
        return None, "invalid_polygon: " + explain_validity(result)
    return result, "exact_self_touch_decomposed_requires_review" if decomposed else None


def geographic_transformer():
    # Inverse UTM within NAD83(CSRS), not a silent WGS84 datum approximation.
    network.set_network_enabled(False)
    return Transformer.from_crs(3157, 4617, always_xy=True, allow_ballpark=False, only_best=True)


def transform_metadata(transformer):
    return {
        "source_wkt": CRS(3157).to_wkt(),
        "target_wkt": CRS(4617).to_wkt(),
        "pipeline": transformer.definition,
        "description": transformer.description,
        "axis_order": "always_xy: easting/northing -> longitude/latitude",
        "vertical": "not transformed; retained verbatim in raw Esri response",
    }


def geographic_xy(polygon, transformer):
    return json.loads(
        json.dumps(
            mapping(transform(lambda x, y: transformer.transform(x, y, errcheck=True), polygon))
        )
    )


def intersect_parcel(
    parcel, zones, parcel_snapshot, parcel_index, zoning_snapshot, attributes=None
):
    """All query-scoped contacts. Invalid zoning makes coverage unknown, never zero."""
    issues = [
        "unreviewed_legal_site",
        "query_scoped_zoning_not_exhaustive_overlays",
        "principal_building_yards_grade_design_placement_unresolved",
    ]
    attributes = attributes or {}
    if attributes.get("ParcelType") != "LA" or attributes.get("ParcelStatus") != "ACTIVE":
        issues.append("parcel_type_status_or_strata_airspace_unresolved")
    intersections = []
    pieces = []
    incomplete = parcel is None or not zones or any(z is None for z in zones)
    if incomplete:
        issues.append("missing_or_unusable_parcel_or_zoning")
    if parcel is not None:
        if (
            parcel.geom_type != "Polygon"
            or len(parcel.interiors)
            or len(parcel.exterior.coords) != 5
        ):
            issues.append("irregular_or_multipart_parcel_requires_review")
        for i, zone in enumerate(zones):
            if zone is None:
                continue
            piece = parcel.intersection(zone)
            if piece.is_empty:
                continue
            area = piece.area
            classification = (
                "boundary_touch" if area == 0 else "sliver" if area <= SLIVER_M2 else "material"
            )
            intersections.append(
                Intersection(
                    zoning_snapshot_id=zoning_snapshot,
                    zoning_feature_index=i,
                    area_m2=area,
                    classification=classification,
                    geometry=json.loads(json.dumps(mapping(piece))),
                )
            )
            pieces.append(piece)
        if sum(p.area > 0 for p in pieces) > 1:
            issues.append("split_zoning_or_overlapping_zone_features")
        if any(i.classification == "sliver" for i in intersections):
            issues.append("sliver_requires_review_not_discarded")
    uncovered = overlap = None
    if not incomplete:
        union = unary_union(pieces)
        uncovered = parcel.difference(union).area
        overlap = max(0.0, sum(p.area for p in pieces) - union.area)
        if uncovered > 0:
            issues.append("uncovered_query_area")
        if overlap > 0:
            issues.append("overlapping_zoning")
    return ParcelAnalysis(
        parcel_snapshot_id=parcel_snapshot,
        parcel_feature_index=parcel_index,
        zoning_snapshot_id=zoning_snapshot,
        intersections=tuple(intersections),
        uncovered_area_m2=uncovered,
        overlapping_zone_area_m2=overlap,
        issues=tuple(issues),
    )
