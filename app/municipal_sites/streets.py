"""Provisional street-facing segments on a selected municipal parcel, in EPSG:3157."""

import json
import math
from collections import defaultdict
from itertools import pairwise
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from shapely.errors import GEOSException
from shapely.geometry import LineString, Polygon, mapping

from app.spatial.geometry import xy_polygon

from .api import Evidence, MunicipalParcelRef, ObserveRequest, StrictModel, _fetch, _rows
from .sources import STREET_SOURCES, StreetSource

router = APIRouter(prefix="/api/municipal-sites", tags=["municipal-sites"])

REACH_M = 22.0
MIN_EDGE_M = 2.0
MAX_SEGMENTS = 64


class StreetEdge(BaseModel):
    segment: int
    name: str
    road_class: str
    feature_ids: list[int]


class StreetResult(StrictModel):
    schema_version: Literal["parcel-streets.v1"] = "parcel-streets.v1"
    parcel_ref: MunicipalParcelRef
    status: Literal["suggested", "partial", "no_match", "unavailable"]
    parcel_geometry: dict | None = None
    suggestions: list[StreetEdge] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)


def _nearby(layer, bounds, fields):
    left, bottom, right, top = bounds
    envelope = (left - REACH_M, bottom - REACH_M, right + REACH_M, top + REACH_M)
    return _fetch(
        layer,
        {
            "geometry": ",".join(map(str, envelope)),
            "geometryType": "esriGeometryEnvelope",
            "inSR": 3157,
            "outSR": 3157,
            "returnGeometry": "true",
            "returnZ": "false",
            "outFields": fields,
            "spatialRel": "esriSpatialRelIntersects",
            "resultRecordCount": 100,
        },
    )


def _street_segments(value, source):
    segments = []
    for row in _rows(value, ("OBJECTID", source.name_field, source.class_field)):
        attrs = row["attributes"]
        paths = row.get("geometry", {}).get("paths")
        if not paths:
            raise ValueError("missing street geometry")
        for path in paths:
            line = LineString(path)
            if line.is_empty or not line.is_valid:
                raise ValueError("invalid street path")
            for a, b in pairwise(line.coords):
                if a != b:
                    segments.append((LineString([a, b]), attrs))
    return segments


def _crossing(p, normal, segments, barriers, source):
    """Nearest crossing along the outward normal. A parcel between the two blocks the mark."""
    ray = LineString([p, (p.x + normal[0] * REACH_M, p.y + normal[1] * REACH_M)])
    hits = []
    for line, attrs in segments:
        point = ray.intersection(line)
        if point.geom_type != "Point" or point.is_empty:
            continue
        a, b = line.coords
        # A street must run roughly along the parcel side (within 35 degrees).
        oblique = abs((b[0] - a[0]) * normal[0] + (b[1] - a[1]) * normal[1]) / line.length
        hits.append((point.distance(p), oblique, attrs))
    if not hits:
        return None
    distance, angle, nearest = min(hits, key=lambda hit: hit[0])
    if distance < 0.25 or angle > math.sin(math.radians(35)):
        return None
    corridor = LineString([p, ray.interpolate(distance)])
    if any(corridor.intersection(other).length > 0.1 for other in barriers):
        return None
    label = (nearest[source.name_field], nearest[source.class_field])
    if (
        not label[0]
        or label[1] not in source.classes
        or any(
            (attrs[source.name_field], attrs[source.class_field]) != label
            for dist, _, attrs in hits
            if dist <= distance + 0.5
        )
    ):
        return ("", "", 0)  # A nearby mapped feature needs classification.
    return (*label, nearest["OBJECTID"])


def match_edges(parcel: Polygon, streets, barriers, source: StreetSource, block_boundary=None):
    ring = parcel.exterior
    sign = 1 if ring.is_ccw else -1
    result = []
    partial = False
    for index, (a, b) in enumerate(pairwise(ring.coords)):
        line = LineString([a, b])
        if line.length == 0:
            continue
        if (
            block_boundary is not None
            and line.intersection(block_boundary).length < line.length * 0.8
        ):
            continue
        normal = (sign * (b[1] - a[1]) / line.length, -sign * (b[0] - a[0]) / line.length)
        votes = defaultdict(set)
        hits = 0
        for fraction in (0.25, 0.5, 0.75):
            p = line.interpolate(fraction, normalized=True)
            match = _crossing(p, normal, streets, barriers, source)
            if match:
                hits += 1
                votes[match[:2]].add(match[2])
        if hits == 3 and len(votes) == 1 and line.length >= MIN_EDGE_M:
            (name, road_class), ids = next(iter(votes.items()))
            if name:
                result.append(
                    StreetEdge(
                        segment=index, name=name, road_class=road_class, feature_ids=sorted(ids)
                    )
                )
                continue
        partial |= bool(hits)
    return result, partial


def _road_area_support(layer, parcel, suggestions, evidence):
    # Use points just outside candidate sides. A windowed geometry query otherwise
    # returns the whole multipart road polygon (>1 MB). Bound both URL size and calls.
    ring = parcel.exterior
    outward = 1 if ring.is_ccw else -1
    supported = []
    for start in range(0, min(24, len(suggestions)), 6):
        batch = suggestions[start : start + 6]
        points = []
        for suggestion in batch:
            a, b = ring.coords[suggestion.segment : suggestion.segment + 2]
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dy)
            for t in (0.25, 0.5, 0.75):
                points.append(
                    [
                        round(a[0] + t * dx + outward * dy / length, 4),
                        round(a[1] + t * dy - outward * dx / length, 4),
                    ]
                )
        value, record = _fetch(
            layer,
            {
                "geometry": json.dumps({"points": points}, separators=(",", ":")),
                "inSR": 3157,
                "geometryType": "esriGeometryMultipoint",
                "spatialRel": "esriSpatialRelWithin",
                "outFields": "OBJECTID",
                "returnGeometry": "false",
            },
        )
        evidence.append(Evidence.model_validate(record))
        if _rows(value, ("OBJECTID",)):
            supported.extend(batch)
    return supported


@router.post("/street-edges", response_model=StreetResult)
def street_edges(request: ObserveRequest) -> StreetResult:
    ref = request.parcel_ref
    source = STREET_SOURCES[ref.source]
    result = StreetResult(parcel_ref=ref, status="unavailable")
    try:
        data, record = _fetch(
            source.parcel,
            {
                "objectIds": ref.object_id,
                "outSR": 3157,
                "outFields": "OBJECTID,PID",
                "returnGeometry": "true",
                "returnZ": "false",
            },
        )
        result.evidence.append(Evidence.model_validate(record))
        rows = _rows(data, ("OBJECTID", "PID"))
        if len(rows) != 1 or rows[0]["attributes"]["OBJECTID"] != ref.object_id:
            return result
        if request.expected_pid and rows[0]["attributes"]["PID"] != request.expected_pid:
            return result
        parcel, issue = xy_polygon(rows[0].get("geometry"))
        if (
            issue
            or not isinstance(parcel, Polygon)
            or len(parcel.exterior.coords) > MAX_SEGMENTS + 1
        ):
            return result
        result.parcel_geometry = mapping(parcel)
        street_data, record = _nearby(
            source.streets, parcel.bounds, f"OBJECTID,{source.name_field},{source.class_field}"
        )
        result.evidence.append(Evidence.model_validate(record))
        streets = _street_segments(street_data, source)
        nearby, record = _nearby(source.blocks or source.parcel, parcel.bounds, "OBJECTID")
        result.evidence.append(Evidence.model_validate(record))
        barriers = []
        containing = []
        selected_seen = False
        for feature in _rows(nearby, ("OBJECTID",)):
            polygon, issue = xy_polygon(feature.get("geometry"))
            if polygon is None or issue:
                return result
            if source.blocks and polygon.intersection(parcel).area > parcel.area * 0.95:
                containing.append(polygon)
            elif source.blocks or feature["attributes"]["OBJECTID"] != ref.object_id:
                barriers.append(polygon)
            elif polygon.equals(parcel):
                selected_seen = True
        if not source.blocks and not selected_seen:
            return result
        boundary = None
        if source.blocks:
            if len(containing) != 1:
                return result
            boundary = containing[0].boundary.buffer(0.75)
        # The parcel itself also blocks sight across a concave outline.
        candidates, partial = match_edges(parcel, streets, [parcel, *barriers], source, boundary)
        supported = (
            _road_area_support(source.road_area, parcel, candidates, result.evidence)
            if source.road_area
            else candidates
        )
        partial |= len(supported) < len(candidates)
        result.suggestions = supported
        result.status = "partial" if partial else "suggested" if result.suggestions else "no_match"
    except (HTTPException, GEOSException, ValueError, KeyError, TypeError, AttributeError):
        pass  # Preserve the chosen parcel and the manual editor on source failure.
    return result
