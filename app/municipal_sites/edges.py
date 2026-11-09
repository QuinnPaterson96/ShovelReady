"""Geometry and source checks shared by municipal parcel-edge observations."""

from typing import Literal

from pydantic import Field
from shapely.geometry import Polygon

from app.spatial.geometry import xy_polygon

from .api import Evidence, MunicipalParcelRef, StrictModel, _fetch, _rows

MAX_SEGMENTS = 64


class EdgeResult(StrictModel):
    parcel_ref: MunicipalParcelRef
    status: Literal["suggested", "partial", "no_match", "unavailable"]
    parcel_geometry: dict | None = None
    evidence: list[Evidence] = Field(default_factory=list)


def selected_parcel(request, layer, evidence):
    ref = request.parcel_ref
    data, record = _fetch(
        layer,
        {
            "objectIds": ref.object_id,
            "outSR": 3157,
            "outFields": "OBJECTID,PID",
            "returnGeometry": "true",
            "returnZ": "false",
        },
    )
    evidence.append(Evidence.model_validate(record))
    rows = _rows(data, ("OBJECTID", "PID"))
    if len(rows) != 1 or rows[0]["attributes"]["OBJECTID"] != ref.object_id:
        return None
    if request.expected_pid and rows[0]["attributes"]["PID"] != request.expected_pid:
        return None
    parcel, issue = xy_polygon(rows[0].get("geometry"))
    if issue or not isinstance(parcel, Polygon) or len(parcel.exterior.coords) > MAX_SEGMENTS + 1:
        return None
    return parcel


def nearby(layer, bounds, fields, reach=22.0, **params):
    left, bottom, right, top = bounds
    envelope = (left - reach, bottom - reach, right + reach, top + reach)
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
            **params,
        },
    )
