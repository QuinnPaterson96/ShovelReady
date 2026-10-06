"""Bounded parcel-polygon to City zoning-map lookup; no accepted rule publication."""

import hashlib
import json
import math
from datetime import UTC, datetime
from typing import Any, Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import urlopen

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from shapely.errors import GEOSException
from shapely.geometry import mapping
from shapely.ops import unary_union

from app.municipal_sites.api import ATTRIBUTION, EXTENT, LICENCE, ParcelRef
from app.spatial.geometry import xy_polygon

VERSION = "victoria-zoning.v1"
PARCEL = "https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/11"
ZONING = (
    "https://maps.victoria.ca/server/rest/services/OpenData/"
    "OpenData_PlanningAndDevelopment/MapServer/12"
)
MAX_BYTES = 1_000_000
MAX_FEATURES = 24
MAX_QUERY_CHARS = 40_000
# Only arithmetic noise is forgiven. A 1 mm x 1 mm gap is still reported.
COVERAGE_EPSILON_M2 = 0.000001
BYLAWS = {
    "ZB1980": (
        "Zoning Regulation Bylaw (No. 80-159)",
        "https://www.victoria.ca/building-business/permits-development-construction/"
        "zoning/zoning-regulation-bylaw",
    ),
    "ZB2018": (
        "Zoning Bylaw 2018 (No. 18-072)",
        "https://www.victoria.ca/building-business/permits-development-construction/"
        "zoning/zoning-regulation-bylaw-2018",
    ),
}
router = APIRouter(prefix="/api/victoria-zoning", tags=["victoria-zoning"])


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LookupRequest(StrictModel):
    schema_version: Literal["victoria-zoning.v1"]
    parcel_ref: ParcelRef
    expected_pid: str | None = Field(default=None, max_length=40)


class SourceRecord(StrictModel):
    provider: Literal["City of Victoria Open Data"]
    record_label: str
    source_url: str
    captured_at_utc: str
    review_status: Literal["unreviewed_live_observation"]
    licence_url: str
    attribution: str
    sha256: str
    source_date_limit: str


class ZoneHit(StrictModel):
    object_id: int
    source_fields: dict[str, Any]
    source_geometry: dict[str, Any]
    intersection_geometry: dict[str, Any]
    intersection_area_m2: float
    parcel_coverage_fraction: float
    bylaw_name: str | None
    bylaw_url: str | None
    mapping_status: Literal["mapped", "unmapped"]


class LookupResponse(StrictModel):
    schema_version: Literal["victoria-zoning.v1"]
    status: Literal[
        "single_covered_mapping",
        "split_zones",
        "partial_coverage",
        "no_match",
        "unsupported_geometry",
        "unavailable",
        "unmapped_bylaw",
    ]
    parcel_ref: ParcelRef
    parcel_source_fields: dict[str, Any] | None
    parcel_source_geometry: dict[str, Any] | None
    parcel_area_m2: float | None
    covered_area_m2: float | None
    uncovered_area_m2: float | None
    coverage_tolerance_m2: float
    horizontal_crs: Literal["EPSG:3157"]
    zones: list[ZoneHit]
    source_records: list[SourceRecord]
    issues: list[str]
    note: str


class SourceFailure(Exception):
    pass


def _query(layer: str, params: dict[str, Any], label: str) -> tuple[dict, SourceRecord]:
    url = f"{layer}/query?{urlencode({'f': 'json', **params})}"
    if len(url) > MAX_QUERY_CHARS:
        raise SourceFailure("selected geometry exceeds bounded query size")
    try:
        with urlopen(url, timeout=5) as response:
            if urlsplit(response.url)._replace(query="", fragment="").geturl() != f"{layer}/query":
                raise SourceFailure("unexpected provider redirect")
            raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise SourceFailure("provider response too large")
        value = json.loads(raw)
        if not isinstance(value, dict) or value.get("error") or value.get("exceededTransferLimit"):
            raise SourceFailure("provider query failed or exceeded transfer limit")
        rows = value.get("features")
        if not isinstance(rows, list) or len(rows) >= MAX_FEATURES:
            raise SourceFailure("provider feature count unavailable or excessive")
        if value.get("spatialReference", {}).get("wkid") != 3157:
            raise SourceFailure("unexpected provider CRS")
        if value.get("geometryType") != "esriGeometryPolygon":
            raise SourceFailure("unexpected provider geometry type")
        record = SourceRecord(
            provider="City of Victoria Open Data",
            record_label=label,
            source_url=url,
            captured_at_utc=datetime.now(UTC).isoformat(),
            review_status="unreviewed_live_observation",
            licence_url=LICENCE,
            attribution=ATTRIBUTION,
            sha256=hashlib.sha256(raw).hexdigest(),
            source_date_limit=(
                "Feature update date, legal revision and positional accuracy are not supplied."
            ),
        )
        return value, record
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, TypeError) as exc:
        raise SourceFailure("City zoning source unavailable or invalid") from exc


def _base(
    request: LookupRequest,
    status: str,
    records: list[SourceRecord],
    issues: list[str],
    area: float | None = None,
) -> dict:
    return {
        "schema_version": VERSION,
        "status": status,
        "parcel_ref": request.parcel_ref,
        "parcel_source_fields": None,
        "parcel_source_geometry": None,
        "parcel_area_m2": area,
        "covered_area_m2": None,
        "uncovered_area_m2": None,
        "coverage_tolerance_m2": COVERAGE_EPSILON_M2,
        "horizontal_crs": "EPSG:3157",
        "zones": [],
        "source_records": records,
        "issues": issues,
        "note": (
            "Unreviewed map observation for investigation; check current bylaws, "
            "amendments, overlays and parcel identity. No accepted rules were published."
        ),
    }


@router.post("/lookup", response_model=LookupResponse)
def lookup(request: LookupRequest) -> dict:
    records: list[SourceRecord] = []
    oid = request.parcel_ref.object_id
    try:
        parcel_value, record = _query(
            PARCEL,
            {
                "objectIds": oid,
                "outFields": "OBJECTID,PID,ParcelType,ParcelStatus",
                "returnGeometry": "true",
                "outSR": 3157,
            },
            "Selected City parcel polygon",
        )
        records.append(record)
        rows = parcel_value["features"]
        if len(rows) != 1 or not isinstance(rows[0], dict):
            return _base(
                request, "unsupported_geometry", records, ["selected_parcel_missing_or_changed"]
            )
        if not isinstance(rows[0].get("attributes"), dict):
            raise SourceFailure("parcel feature fields missing")
        if rows[0]["attributes"].get("OBJECTID") != oid:
            return _base(
                request, "unsupported_geometry", records, ["selected_parcel_missing_or_changed"]
            )
        row = rows[0]
        if (
            request.expected_pid is not None
            and row["attributes"].get("PID") != request.expected_pid
        ):
            return _base(request, "unsupported_geometry", records, ["selected_parcel_pid_changed"])
        raw = row.get("geometry")
        parcel, issue = xy_polygon(
            {"spatialReference": {"wkid": 3157}, **raw} if isinstance(raw, dict) else raw,
            has_z=bool(parcel_value.get("hasZ")),
            has_m=bool(parcel_value.get("hasM")),
        )
        if parcel is None or issue or not math.isfinite(parcel.area) or parcel.area <= 0:
            return _base(
                request, "unsupported_geometry", records, [f"parcel_{issue or 'invalid_area'}"]
            )
        if not (
            EXTENT[0] <= parcel.bounds[0] <= parcel.bounds[2] <= EXTENT[2]
            and EXTENT[1] <= parcel.bounds[1] <= parcel.bounds[3] <= EXTENT[3]
        ):
            return _base(request, "unsupported_geometry", records, ["parcel_outside_layer_extent"])
        zones_value, record = _query(
            ZONING,
            {
                "geometry": json.dumps(
                    {"spatialReference": {"wkid": 3157}, **raw}, separators=(",", ":")
                ),
                "geometryType": "esriGeometryPolygon",
                "inSR": 3157,
                "outSR": 3157,
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": "OBJECTID,ZoningBylaw,Zoning,Title,URL",
                "returnGeometry": "true",
            },
            "City zoning polygons intersecting selected parcel",
        )
        records.append(record)
        hits = []
        pieces = []
        seen = set()
        issues = []
        for feature in zones_value["features"]:
            if not isinstance(feature, dict):
                raise SourceFailure("zoning feature invalid")
            fields = feature.get("attributes")
            if not isinstance(fields, dict) or any(
                k not in fields for k in ("OBJECTID", "ZoningBylaw", "Zoning", "Title", "URL")
            ):
                raise SourceFailure("zoning feature fields missing")
            if not all(
                isinstance(fields[k], str) or fields[k] is None
                for k in ("ZoningBylaw", "Zoning", "Title", "URL")
            ):
                raise SourceFailure("zoning feature fields invalid")
            zone_id = fields["OBJECTID"]
            if not isinstance(zone_id, int) or zone_id <= 0 or zone_id in seen:
                raise SourceFailure("zoning feature identity invalid or repeated")
            seen.add(zone_id)
            raw_zone = feature.get("geometry")
            zone, issue = xy_polygon(
                {"spatialReference": {"wkid": 3157}, **raw_zone}
                if isinstance(raw_zone, dict)
                else raw_zone,
                has_z=bool(zones_value.get("hasZ")),
                has_m=bool(zones_value.get("hasM")),
            )
            if zone is None or (issue and issue != "exact_self_touch_decomposed_requires_review"):
                raise SourceFailure("zoning geometry unsupported")
            if issue:
                issues.append(f"zoning_geometry_{issue}")
            piece = parcel.intersection(zone)
            if piece.area <= 0:  # A shared boundary is not a zone covering the lot.
                continue
            pieces.append(piece)
            bylaw = BYLAWS.get(fields["ZoningBylaw"])
            hits.append(
                {
                    "object_id": zone_id,
                    "source_fields": fields,
                    "source_geometry": raw_zone,
                    "intersection_geometry": mapping(piece),
                    "intersection_area_m2": piece.area,
                    "parcel_coverage_fraction": piece.area / parcel.area,
                    "bylaw_name": bylaw[0] if bylaw else None,
                    "bylaw_url": bylaw[1] if bylaw else None,
                    "mapping_status": "mapped" if bylaw else "unmapped",
                }
            )
        covered = unary_union(pieces).area if pieces else 0.0
        uncovered = max(0.0, parcel.area - covered)
        status = (
            "no_match"
            if not hits
            else "partial_coverage"
            if uncovered > COVERAGE_EPSILON_M2
            else "unmapped_bylaw"
            if any(h["mapping_status"] == "unmapped" for h in hits)
            else "split_zones"
            if len(hits) > 1
            else "single_covered_mapping"
        )
        result = _base(request, status, records, issues, parcel.area)
        result.update(covered_area_m2=covered, uncovered_area_m2=uncovered, zones=hits)
        result["parcel_source_fields"] = row["attributes"]
        result["parcel_source_geometry"] = raw
        if sum(p.area for p in pieces) - covered > COVERAGE_EPSILON_M2:
            result["issues"].append("overlapping_zoning_features")
        return result
    except GEOSException:
        return _base(request, "unavailable", records, ["geometry_calculation_failed"])
    except SourceFailure as exc:
        return _base(request, "unavailable", records, [str(exc)])
