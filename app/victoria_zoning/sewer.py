"""Preliminary sanitary sewer map observations for a selected Victoria parcel."""

import math
import re
from datetime import UTC, datetime
from typing import Literal

from pydantic import Field
from shapely.errors import GEOSException
from shapely.geometry import MultiLineString, Point
from shapely.geometry.base import BaseGeometry

from .api import PARCEL, SourceFailure, SourceRecord, StrictModel, _query

ROOT = "https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Sewer/MapServer"
LATERALS = f"{ROOT}/12"
GRAVITY_MAINS = f"{ROOT}/4"
CITY_SANITARY = "WaterType='SEW' AND LifecycleStatus='ACT' AND OwnedBy='VC' AND Jurisdiction='VC'"
PIPE_FIELDS = "OBJECTID,InfrastructureID,WaterType,LifecycleStatus,OwnedBy,Jurisdiction"
# A geometry corroboration tolerance for mapped endpoints, never a site measurement.
ENDPOINT_TOLERANCE_M = 1
MAIN_SEARCH_RADIUS_M = 20


class EngineeringContact(StrictModel):
    name: Literal["City of Victoria Engineering"] = "City of Victoria Engineering"
    email: Literal["eng@victoria.ca"] = "eng@victoria.ca"
    url: str = (
        "https://www.victoria.ca/building-business/permits-development-construction/"
        "building-renovating/apply-permit/plumbing"
    )


class SewerResult(StrictModel):
    status: Literal[
        "mapped_connection", "ambiguous", "nearby_main_only", "no_mapped_connection", "unavailable"
    ]
    detail: str
    source: SourceRecord | None = None
    records: list[dict] = Field(default_factory=list)
    checked_at_utc: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    association_source: SourceRecord | None = None
    association_parcel_count: int | None = None
    association_parcel_ids: list[int] = Field(default_factory=list)
    main_source: SourceRecord | None = None
    main_search_status: Literal["not_needed", "nearby", "none", "unavailable"] = "not_needed"
    main_records: list[dict] = Field(default_factory=list)
    main_search_radius_m: Literal[20] = MAIN_SEARCH_RADIUS_M
    authority: EngineeringContact = Field(default_factory=EngineeringContact)
    capacity_status: Literal["requires_confirmation"] = "requires_confirmation"
    question: str = (
        "Can the existing sanitary sewer service be reused for the proposed dwelling, "
        "or would a new or upgraded connection be required? What information do you "
        "need to confirm capacity for the proposed additional wastewater demand?"
    )


def _pipe_geometry(row: dict) -> MultiLineString:
    attributes = row["attributes"]
    if (
        type(attributes.get("OBJECTID")) is not int
        or attributes.get("WaterType") != "SEW"
        or attributes.get("LifecycleStatus") != "ACT"
        or attributes.get("OwnedBy") != "VC"
        or attributes.get("Jurisdiction") != "VC"
    ):
        raise SourceFailure("unexpected pipe identity or classification")
    paths = row["geometry"]["paths"]
    if not isinstance(paths, list) or not paths or any(
        not isinstance(path, list)
        or len(path) < 2
        or any(
            not isinstance(point, list)
            or len(point) != 2
            or any(type(value) not in (float, int) or not math.isfinite(value) for value in point)
            for point in path
        )
        for path in paths
    ):
        raise SourceFailure("invalid mapped pipe coordinates")
    line = MultiLineString(paths)
    if not line.is_valid or not math.isfinite(line.length) or line.length <= 0:
        raise SourceFailure("invalid mapped pipe geometry")
    return line


def _search_mains(parcel: BaseGeometry, source: SourceRecord) -> SewerResult:
    no_lateral = "No active City sanitary sewer lateral was linked to this parcel in the City map."
    x_min, y_min, x_max, y_max = parcel.bounds
    radius = MAIN_SEARCH_RADIUS_M
    try:
        value, main_source = _query(
            GRAVITY_MAINS,
            {
                "where": CITY_SANITARY,
                "geometry": f"{x_min - radius},{y_min - radius},{x_max + radius},{y_max + radius}",
                "geometryType": "esriGeometryEnvelope",
                "inSR": 3157,
                "spatialRel": "esriSpatialRelIntersects",
                "outSR": 3157,
                "outFields": PIPE_FIELDS,
                "returnGeometry": "true",
            },
            "Active City sanitary sewer gravity mains near the selected parcel",
            geometry_type="esriGeometryPolyline",
        )
        close = []
        for row in value["features"]:
            distance = parcel.distance(_pipe_geometry(row))
            if distance <= radius:
                close.append({**row, "distance_to_parcel_m": distance})
    except (
        SourceFailure, GEOSException, AttributeError, KeyError, OverflowError, TypeError, ValueError
    ):
        return SewerResult(
            status="no_mapped_connection",
            detail=f"{no_lateral} The nearby gravity main map check was unavailable.",
            source=source,
            main_search_status="unavailable",
        )
    return SewerResult(
        status="nearby_main_only" if close else "no_mapped_connection",
        detail=f"{no_lateral} "
        + (
            f"The map shows an active City sanitary gravity main within {radius} m of the parcel. "
            "City Engineering can confirm whether it can serve the property."
            if close
            else f"No active City sanitary gravity main was mapped within {radius} m of the parcel."
        ),
        source=source,
        main_source=main_source,
        main_search_status="nearby" if close else "none",
        main_records=close,
    )


def scan_sewer(attributes: dict, parcel: BaseGeometry) -> SewerResult:
    link = attributes.get("GISLINK")
    if not isinstance(link, str) or not re.fullmatch(r"[A-Za-z0-9-]{1,20}", link):
        return SewerResult(
            status="unavailable",
            detail="The selected parcel has no usable City map reference for a sewer lookup.",
        )
    source = None
    records = []
    association_source = None
    parcel_ids = None
    try:
        value, source = _query(
            LATERALS,
            {
                "where": f"TaxParcel='{link}' AND {CITY_SANITARY}",
                "outFields": f"{PIPE_FIELDS},TaxParcel,MainLineID",
                "outSR": 3157,
                "returnGeometry": "true",
            },
            "Active City sanitary sewer lateral records for the selected parcel",
            geometry_type="esriGeometryPolyline",
        )
        records = value["features"]
        if not records:
            return _search_mains(parcel, source)
        associations, association_source = _query(
            PARCEL,
            {"where": f"GISLINK='{link}'", "returnIdsOnly": "true"},
            "City parcel map references matching the sewer lateral reference",
        )
        parcel_ids = associations["objectIds"]
        lines = [_pipe_geometry(row) for row in records]
        if any(row["attributes"].get("TaxParcel") != link for row in records):
            detail = "The sewer record and selected parcel have different City map references."
        elif len(parcel_ids) > 1:
            detail = "More than one mapped parcel shares the sewer record’s City map reference."
        elif parcel_ids != [attributes["OBJECTID"]]:
            detail = "The sewer record’s City map reference could not be confirmed for the parcel."
        elif len(lines) != 1 or len(lines[0].geoms) != 1:
            detail = "The City map shows more than one possible sewer line for this parcel."
        else:
            path = lines[0].geoms[0].coords
            gap = min(parcel.boundary.distance(Point(endpoint)) for endpoint in (path[0], path[-1]))
            if gap <= ENDPOINT_TOLERANCE_M:
                return SewerResult(
                    status="mapped_connection",
                    detail="The City map shows an active sanitary sewer lateral linked to this "
                    "parcel. Ask City Engineering about reuse and capacity for your proposal.",
                    source=source,
                    records=records,
                    association_source=association_source,
                    association_parcel_count=1,
                    association_parcel_ids=parcel_ids,
                )
            detail = "The linked sewer line’s mapped endpoints do not align with the parcel edge."
        return SewerResult(
            status="ambiguous",
            detail=f"{detail} Ask City Engineering to identify the service for this property.",
            source=source,
            records=records,
            association_source=association_source,
            association_parcel_count=len(parcel_ids),
            association_parcel_ids=parcel_ids,
        )
    except (
        SourceFailure, GEOSException, AttributeError, KeyError, OverflowError, TypeError, ValueError
    ):
        return SewerResult(
            status="unavailable",
            detail="The City sanitary sewer map check was unavailable or incomplete.",
            source=source,
            association_source=association_source,
            association_parcel_count=len(parcel_ids) if parcel_ids is not None else None,
            association_parcel_ids=parcel_ids or [],
        )
