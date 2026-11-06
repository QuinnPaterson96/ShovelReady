"""Suggest physical shore contact on exterior parcel segments, in EPSG:3157."""

from dataclasses import dataclass
from itertools import pairwise
from math import cos, radians
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import Field
from shapely.errors import GEOSException
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box, mapping
from shapely.ops import nearest_points

from app.spatial.geometry import xy_polygon

from .api import Evidence, ObserveRequest, StrictModel, _rows
from .edges import EdgeResult, nearby, selected_parcel
from .sources import WATER_SOURCES, WaterArea

router = APIRouter(prefix="/api/municipal-sites", tags=["municipal-sites"])
# Metres in the projected map frame. These tolerances are scouting heuristics.
LOOKUP_ERRORS = (
    HTTPException,
    GEOSException,
    ValueError,
    KeyError,
    TypeError,
    IndexError,
    AttributeError,
)
CONTACT = 3.0
MARINE_CONTEXT = 12.0


class WaterEdge(StrictModel):
    segment: int
    label: str
    evidence_index: int
    feature_id: int


class WaterResult(EdgeResult):
    schema_version: Literal["parcel-waterfront.v1"] = "parcel-waterfront.v1"
    nearby_source: int | None = None
    suggestions: list[WaterEdge] = Field(default_factory=list)


@dataclass
class Shore:
    line: LineString
    label: str
    evidence_index: int
    feature_id: int
    water: Polygon | MultiPolygon | None = None
    marine_context: list[LineString] | None = None


def _lines(geometry):
    if geometry.geom_type in ("MultiLineString", "GeometryCollection"):
        for part in geometry.geoms:
            yield from _lines(part)
    elif geometry.geom_type == "LineString" and not geometry.is_empty:
        yield geometry


def _blocked(p, q, others):
    if p.equals(q):
        return False
    corridor = LineString([p, q])
    # Millimetre grid avoids skipping a barrier when a projection onto a long
    # shoreline lands a floating-point epsilon beyond its corner.
    return any(corridor.intersection(other, grid_size=0.001).length > 0.1 for other in others)


def _matching_edge(line, normal, shore, parcel, others):
    # Three locations along the edge must face the same shore. A single corner,
    # a river crossing, or a short point contact is insufficient to mark a whole side.
    a, b = line.coords
    for fraction in (0.2, 0.5, 0.8):
        p = line.interpolate(fraction, normalized=True)
        loc = shore.line.project(p)
        q = shore.line.interpolate(loc)
        if p.distance(q) > CONTACT:
            return False
        u = shore.line.interpolate(max(0, loc - 1))
        v = shore.line.interpolate(min(shore.line.length, loc + 1))
        along = abs((b[0] - a[0]) * (v.x - u.x) + (b[1] - a[1]) * (v.y - u.y))
        if u.equals(v) or along < line.length * u.distance(v) * cos(radians(40)):
            return False
        outside = Point(p.x + CONTACT * normal[0], p.y + CONTACT * normal[1])
        inside = Point(p.x - CONTACT * normal[0], p.y - CONTACT * normal[1])
        if not parcel.contains(inside) or parcel.covers(outside):
            return False
        if shore.water is not None and (
            not shore.water.covers(outside) or shore.water.covers(inside)
        ):
            return False
        if shore.marine_context is not None and not any(
            coast.distance(q) <= MARINE_CONTEXT for coast in shore.marine_context
        ):
            return False
        if _blocked(p, outside, others):
            return False
    return True


def _local_polygon(row, window):
    # The Victoria marine polygon has many remote islands. Rings whose envelopes
    # miss this window cannot affect its local even/odd topology. Keep enclosing rings.
    rings = row["geometry"]["rings"]
    if not isinstance(rings, list) or not rings:
        raise ValueError("missing water polygon")
    rings = [ring for ring in rings if box(*LineString(ring).bounds).intersects(window)]
    if not rings:
        return None
    poly, issue = xy_polygon({**row["geometry"], "rings": rings})
    if issue or poly is None:
        raise ValueError("invalid water polygon")
    return poly


def _coasts(query, layer, window):
    ci, rows = query(layer, "OBJECTID")
    coasts = []
    for row in rows:
        paths = row["geometry"]["paths"]
        if not paths:
            raise ValueError("missing coast geometry")
        for path in paths:
            line = LineString(path)
            if not line.is_valid or line.is_empty:
                raise ValueError("invalid coast geometry")
            coasts.extend(
                Shore(part, "Marine shoreline", ci, row["attributes"]["OBJECTID"])
                for part in _lines(line.intersection(window))
            )
    return coasts


def _water_bodies(query, area: WaterArea, window, coasts):
    # Half-metre generalization bounds the Victoria ocean response; the
    # feature itself extends well beyond the requested neighbourhood.
    name_field = area.name_field
    marine = area.marine_record is not None
    wi, waters = query(
        area.layer,
        f"OBJECTID,{name_field}",
        maxAllowableOffset=0.5,
        geometryPrecision=2,
        where="1=1" if marine else f"{name_field} IS NOT NULL",
    )
    shores = []
    for row in waters:
        attrs = row["attributes"]
        water = _local_polygon(row, window)
        if water is None:
            continue
        # Victoria's generic Water polygon needs independent marine context;
        # its named ponds and reservoir do not indicate tidal waterfront.
        if marine and attrs[name_field] != area.marine_record:
            continue
        label = "Marine shoreline" if marine else attrs[name_field]
        if not isinstance(label, str) or not label.strip():
            continue
        shores.extend(
            Shore(
                part,
                label,
                wi,
                attrs["OBJECTID"],
                water,
                [c.line for c in coasts] if marine else None,
            )
            for part in _lines(water.boundary.intersection(window))
        )
    return shores


@router.post("/waterfront-edges", response_model=WaterResult)
def waterfront_edges(request: ObserveRequest) -> WaterResult:
    ref = request.parcel_ref
    profile = WATER_SOURCES.get(ref.source)
    result = WaterResult(parcel_ref=ref, status="unavailable")
    if profile is None:
        return result
    try:
        parcel = selected_parcel(request, profile.parcel, result.evidence)
        if parcel is None:
            return result
        result.parcel_geometry = mapping(parcel)
        window = box(*parcel.bounds).buffer(MARINE_CONTEXT + 1).envelope

        def query(layer, fields, **kwargs):
            data, record = nearby(layer, parcel.bounds, fields, reach=MARINE_CONTEXT, **kwargs)
            index = len(result.evidence)
            result.evidence.append(Evidence.model_validate(record))
            return index, _rows(data, tuple(fields.split(",")))

        incomplete = False
        try:
            coasts = _coasts(query, profile.coast, window)
        except LOOKUP_ERRORS:
            coasts = []
            incomplete = True
        shores = list(coasts) if profile.direct_coast else []
        for area in profile.areas:
            if area.marine_record is not None and not coasts:
                continue
            try:
                shores.extend(_water_bodies(query, area, window, coasts))
            except LOOKUP_ERRORS:
                incomplete = True
        close = [shore for shore in shores if shore.line.distance(parcel.exterior) <= CONTACT]
        if not close:
            result.status = "unavailable" if incomplete else "no_match"
            return result
        result.nearby_source = close[0].evidence_index
        _, neighbours = query(profile.parcel, "OBJECTID")
        others = []
        seen = False
        for row in neighbours:
            poly, issue = xy_polygon(row.get("geometry"))
            if issue or poly is None:
                return result
            if row["attributes"]["OBJECTID"] == ref.object_id:
                seen = poly.equals(parcel)
            else:
                others.append(poly)
        if not seen:
            return result
        ambiguous = False
        possible_contact = False
        ring = parcel.exterior
        sign = 1 if ring.is_ccw else -1
        for i, (a, b) in enumerate(pairwise(ring.coords)):
            edge = LineString([a, b])
            if not edge.length:
                continue
            normal = (sign * (b[1] - a[1]) / edge.length, -sign * (b[0] - a[0]) / edge.length)
            hits = [
                s
                for s in close
                if edge.length >= 1 and _matching_edge(edge, normal, s, parcel, others)
            ]
            if len(hits) == 1:
                s = hits[0]
                result.suggestions.append(
                    WaterEdge(
                        segment=i,
                        label=s.label,
                        feature_id=s.feature_id,
                        evidence_index=s.evidence_index,
                    )
                )
            else:
                # Contact away from just the endpoints is a lead, not an inland finding.
                middle = LineString([edge.interpolate(t, normalized=True) for t in (0.2, 0.8)])
                for shore in close:
                    p, q = nearest_points(edge, shore.line)
                    if p.distance(q) > CONTACT or _blocked(p, q, others):
                        continue
                    result.nearby_source = shore.evidence_index
                    possible_contact = True
                    ambiguous |= middle.distance(shore.line) <= CONTACT
        if result.suggestions:
            result.status = "partial" if incomplete or ambiguous else "suggested"
        elif possible_contact:
            result.status = "partial"
        else:
            result.status = "unavailable" if incomplete else "no_match"

    except LOOKUP_ERRORS:
        result.status = "unavailable"
        result.suggestions = []
    return result
