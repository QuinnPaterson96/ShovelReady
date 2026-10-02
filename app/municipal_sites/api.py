"""Live, bounded municipal parcel search and observation. No startup I/O."""

import hashlib
import json
import math
import time
from datetime import UTC, datetime
from typing import Any, Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from shapely.geometry import mapping

from app.spatial.geometry import xy_polygon

VERSION = "municipal-sites.v1"
ROOT = "https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer"
LAYERS = {"address": f"{ROOT}/0", "building": f"{ROOT}/1", "parcel": f"{ROOT}/11"}
LICENCE = "https://opendata.victoria.ca/pages/open-data-licence"
ATTRIBUTION = "Contains information licensed under the Open Government Licence - City of Victoria."
EXTENT = (470734.7, 5360122.9, 476191.5, 5366422.8)
MAX_FEATURES = 25
MAX_BYTES = 1_000_000
router = APIRouter(prefix="/api/municipal-sites", tags=["municipal-sites"])


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PointHint(StrictModel):
    crs: Literal["EPSG:3157"]
    x: float
    y: float

    @model_validator(mode="after")
    def in_city_extent(self):
        if not (math.isfinite(self.x) and math.isfinite(self.y)):
            raise ValueError("point must be finite")
        if not (EXTENT[0] <= self.x <= EXTENT[2] and EXTENT[1] <= self.y <= EXTENT[3]):
            raise ValueError("point is outside the City layer extent")
        return self


class SearchRequest(StrictModel):
    schema_version: Literal["municipal-sites.v1"]
    address: str | None = Field(default=None, max_length=120)
    pid: str | None = None
    point_hint: PointHint | None = None

    @model_validator(mode="after")
    def one_query(self):
        if (self.address is None) == (self.pid is None):
            raise ValueError("provide exactly one of address or pid")
        if self.address is not None and (not self.address.strip() or len(self.address.strip()) < 3):
            raise ValueError("address must contain 3–120 characters")
        if self.pid is not None and (
            len(self.pid) != 11
            or not all(p.isdigit() and len(p) == 3 for p in self.pid.split("-"))
            or len(self.pid.split("-")) != 3
        ):
            raise ValueError("PID must have NNN-NNN-NNN format")
        return self


class ParcelRef(StrictModel):
    source: Literal["city-of-victoria-pid-parcels"]
    object_id: int = Field(ge=1, le=10_000_000)


class ObserveRequest(StrictModel):
    schema_version: Literal["municipal-sites.v1"]
    parcel_ref: ParcelRef
    expected_pid: str | None = None


class Evidence(StrictModel):
    provider: str
    record_label: str
    source_url: str
    captured_at_utc: str
    review_status: Literal["unreviewed_live_observation"]
    licence_url: str
    attribution: str
    source_date_limit: str
    sha256: str
    raw_response: dict[str, Any]
    raw_response_text: str


class Candidate(StrictModel):
    parcel_ref: ParcelRef
    pid: str | None
    gislink: str | None
    address: str | None
    address_object_id: int | None
    relation: Literal["pid_exact", "gislink_join", "spatial_lead"]
    attributes: dict[str, Any]
    identity_status: Literal["spatial_lead_unverified", "source_join_unreviewed"]


class SearchResponse(StrictModel):
    schema_version: Literal["municipal-sites.v1"]
    status: Literal["candidates", "no_match_in_live_query"]
    candidates: list[Candidate]
    evidence: list[Evidence]
    note: str


class GeometryFeature(StrictModel):
    attributes: dict[str, Any]
    geometry: dict[str, Any]
    planar_geometry: dict[str, Any]
    horizontal_crs: Literal["EPSG:3157"]
    area_m2: float
    geometry_issue: str | None


class Roofline(GeometryFeature):
    intersection_area_m2: float
    relationship: Literal["spatial_intersection_not_ownership"]


class ObserveResponse(StrictModel):
    schema_version: Literal["municipal-sites.v1"]
    status: Literal["available", "partial", "missing", "invalid", "stale"]
    parcel_ref: ParcelRef
    parcel: GeometryFeature | None
    rooflines: list[Roofline]
    issues: list[str]
    evidence: list[Evidence]


def _evidence(layer: str, url: str, raw: bytes, value: dict) -> dict:
    return {
        "provider": "City of Victoria Open Data",
        "record_label": f"{layer.title()} MapServer response",
        "source_url": url,
        "captured_at_utc": datetime.now(UTC).isoformat(),
        "review_status": "unreviewed_live_observation",
        "licence_url": LICENCE,
        "attribution": ATTRIBUTION,
        "source_date_limit": (
            "Feature update date and positional accuracy not supplied; "
            "rooflines derive from aerial imagery, not surveyed walls."
        ),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "raw_response": value,
        "raw_response_text": raw.decode("utf-8"),
    }


def _fetch(layer: str, params: dict) -> tuple[dict, dict]:
    # Only fixed layer URLs and internally constructed query keys are permitted.
    url = f"{LAYERS[layer]}/query?{urlencode({'f': 'json', **params})}"
    for attempt in range(2):
        try:
            with urlopen(url, timeout=5) as response:
                if response.url.split("?")[0] != f"{LAYERS[layer]}/query":
                    raise ValueError("unexpected provider redirect")
                raw = response.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError("provider response too large")
            value = json.loads(raw)
            if not isinstance(value, dict):
                raise ValueError("invalid JSON object")
            if isinstance(value.get("error"), dict):
                code = value["error"].get("code")
                message = value["error"].get("message")
                # This exact ArcGIS 400 was observed alternating with valid replies
                # for the same bounded request. Other 400s may be query mistakes.
                pagination_fault = code == 400 and message == "Pagination is not supported."
                retryable = pagination_fault or code == 429 or (
                    isinstance(code, int) and 500 <= code <= 599
                )
                if attempt == 0 and retryable:
                    time.sleep(0.25)
                    continue
                status = 503 if retryable else 502
                error_code = code if isinstance(code, int) else "unknown"
                reason = (
                    "pagination unsupported"
                    if pagination_fault
                    else f"ArcGIS error {error_code}"
                )
                raise HTTPException(status, f"City {layer} source {reason}")
            if value.get("exceededTransferLimit"):
                raise ValueError("provider transfer limit exceeded")
            rows = value.get("features")
            if not isinstance(rows, list) or len(rows) >= MAX_FEATURES:
                raise ValueError("invalid or excessive feature rows")
            if params.get("returnGeometry") == "true":
                if value.get("spatialReference", {}).get("wkid") != 3157:
                    raise ValueError("unexpected response CRS")
                expected_type = "esriGeometryPoint" if layer == "address" else "esriGeometryPolygon"
                if value.get("geometryType") != expected_type:
                    raise ValueError("unexpected geometry type")
            return value, _evidence(layer, url, raw, value)
        except HTTPError as exc:
            if attempt == 0 and (exc.code == 429 or 500 <= exc.code <= 599):
                time.sleep(0.25)
                continue
            status = 503 if exc.code == 429 or 500 <= exc.code <= 599 else 502
            raise HTTPException(status, f"City {layer} source HTTP {exc.code}") from exc
        except (TimeoutError, URLError, OSError) as exc:
            if attempt == 0:
                time.sleep(0.25)
                continue
            raise HTTPException(503, f"City {layer} source network unavailable") from exc
        except (ValueError, TypeError, AttributeError) as exc:
            raise HTTPException(502, f"City {layer} source invalid response: {exc}") from exc
    raise AssertionError("unreachable provider retry state")


def _rows(value: dict, required: tuple[str, ...]) -> list[dict]:
    rows = value["features"]
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("attributes"), dict):
            raise HTTPException(502, "City feature attributes missing")
        if any(field not in row["attributes"] for field in required):
            raise HTTPException(502, "City response missing required fields")
    return rows


def _literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _parcel_query(where: str) -> tuple[list[dict], dict]:
    value, evidence = _fetch(
        "parcel",
        {
            "where": where,
            "outFields": "OBJECTID,PID,VicPID,GISLINK,ParcelType,ParcelStatus,Shape_Area",
            "returnGeometry": "false",
            "outSR": 3157,
        },
    )
    return _rows(value, ("OBJECTID", "PID", "GISLINK")), evidence


@router.post("/search", response_model=SearchResponse)
def search(request: SearchRequest) -> dict:
    evidence = []
    joined = []
    if request.pid is not None:
        parcels, receipt = _parcel_query(f"PID={_literal(request.pid)}")
        evidence.append(receipt)
        if any(row["attributes"]["PID"] != request.pid for row in parcels):
            raise HTTPException(502, "City PID query returned a different identity")
        joined = [(row, "pid_exact", None) for row in parcels]
    else:
        address = " ".join(request.address.upper().split())
        points_value, receipt = _fetch(
            "address",
            {
                "where": f"FullAddress={_literal(address)}",
                "outFields": "OBJECTID,FullAddress,GISLINK,Legal_Type",
                "returnGeometry": "true",
                "outSR": 3157,
            },
        )
        evidence.append(receipt)
        points = _rows(points_value, ("OBJECTID", "FullAddress", "GISLINK"))
        if len(points) > 8:
            raise HTTPException(502, "too many address joins for bounded search")
        for point in points:
            if " ".join(str(point["attributes"]["FullAddress"]).upper().split()) != address:
                raise HTTPException(502, "City address query returned a different address")
            link = point["attributes"]["GISLINK"]
            if not isinstance(link, str) or not link or len(link) > 255:
                raise HTTPException(502, "City address GISLINK missing or invalid")
            parcels, receipt = _parcel_query(f"GISLINK={_literal(link)}")
            evidence.append(receipt)
            if any(row["attributes"]["GISLINK"] != link for row in parcels):
                raise HTTPException(502, "City GISLINK query returned a different identity")
            joined.extend((row, "gislink_join", point["attributes"]) for row in parcels)
            if len(joined) >= MAX_FEATURES:
                raise HTTPException(502, "too many parcel candidates for bounded search")
    if not joined and request.point_hint is not None:
        point = request.point_hint
        # Bounded 25 metre square is only a spatial lead, including for unmatched text.
        envelope = f"{point.x - 12.5},{point.y - 12.5},{point.x + 12.5},{point.y + 12.5}"
        value, receipt = _fetch(
            "parcel",
            {
                "geometry": envelope,
                "geometryType": "esriGeometryEnvelope",
                "inSR": 3157,
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": "OBJECTID,PID,GISLINK,ParcelType,ParcelStatus,Shape_Area",
                "returnGeometry": "false",
                "outSR": 3157,
            },
        )
        evidence.append(receipt)
        joined = [
            (row, "spatial_lead", None) for row in _rows(value, ("OBJECTID", "PID", "GISLINK"))
        ]
    candidates = []
    seen = set()
    for row, relation, point in joined:
        attrs = row["attributes"]
        oid = attrs["OBJECTID"]
        if not isinstance(oid, int) or oid <= 0:
            raise HTTPException(502, "City parcel OBJECTID invalid")
        key = (oid, point["OBJECTID"] if point else None)
        if key in seen:
            continue
        seen.add(key)
        candidates.append(
            {
                "parcel_ref": {"source": "city-of-victoria-pid-parcels", "object_id": oid},
                "pid": attrs["PID"],
                "gislink": attrs["GISLINK"],
                "address": point.get("FullAddress") if point else None,
                "address_object_id": point.get("OBJECTID") if point else None,
                "relation": relation,
                "attributes": attrs,
                "identity_status": "spatial_lead_unverified"
                if relation == "spatial_lead"
                else "source_join_unreviewed",
            }
        )
    return {
        "schema_version": VERSION,
        "status": "candidates" if candidates else "no_match_in_live_query",
        "candidates": candidates,
        "evidence": evidence,
        "note": (
            "Select a parcel explicitly; a source join or point lead "
            "is not verified legal identity."
        ),
    }


@router.post("/observe", response_model=ObserveResponse)
def observe(request: ObserveRequest) -> dict:
    oid = request.parcel_ref.object_id
    value, parcel_evidence = _fetch(
        "parcel",
        {
            "objectIds": oid,
            "outFields": "OBJECTID,PID,VicPID,GISLINK,ParcelType,ParcelStatus,Shape_Area",
            "returnGeometry": "true",
            "outSR": 3157,
        },
    )
    rows = _rows(value, ("OBJECTID", "PID", "GISLINK"))
    if len(rows) != 1 or rows[0]["attributes"]["OBJECTID"] != oid:
        return {
            "schema_version": VERSION,
            "status": "missing",
            "parcel_ref": request.parcel_ref.model_dump(),
            "parcel": None,
            "rooflines": [],
            "issues": ["selected_parcel_missing_or_changed"],
            "evidence": [parcel_evidence],
        }
    row = rows[0]
    if request.expected_pid is not None and row["attributes"]["PID"] != request.expected_pid:
        return {
            "schema_version": VERSION,
            "status": "stale",
            "parcel_ref": request.parcel_ref.model_dump(),
            "parcel": None,
            "rooflines": [],
            "issues": ["selected_parcel_pid_changed"],
            "evidence": [parcel_evidence],
        }
    raw_geometry = row.get("geometry")
    if raw_geometry is None:
        return {
            "schema_version": VERSION,
            "status": "missing",
            "parcel_ref": request.parcel_ref.model_dump(),
            "parcel": None,
            "rooflines": [],
            "issues": ["parcel_geometry_missing"],
            "evidence": [parcel_evidence],
        }
    polygon, issue = xy_polygon(
        {"spatialReference": {"wkid": 3157}, **raw_geometry}
        if isinstance(raw_geometry, dict)
        else raw_geometry,
        has_z=bool(value.get("hasZ")),
        has_m=bool(value.get("hasM")),
    )
    if polygon is None:
        return {
            "schema_version": VERSION,
            "status": "invalid",
            "parcel_ref": request.parcel_ref.model_dump(),
            "parcel": None,
            "rooflines": [],
            "issues": [f"parcel_{issue}"],
            "evidence": [parcel_evidence],
        }
    parcel = {
        "attributes": row["attributes"],
        "geometry": raw_geometry,
        "planar_geometry": mapping(polygon),
        "horizontal_crs": "EPSG:3157",
        "area_m2": polygon.area,
        "geometry_issue": issue,
    }
    try:
        buildings_value, building_evidence = _fetch(
            "building",
            {
                "geometry": json.dumps(
                    {"spatialReference": {"wkid": 3157}, **raw_geometry}, separators=(",", ":")
                ),
                "geometryType": "esriGeometryPolygon",
                "inSR": 3157,
                "outSR": 3157,
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": "OBJECTID,LAYER,SHAPE_Area",
                "returnGeometry": "true",
                "returnZ": "true",
            },
        )
        buildings = _rows(buildings_value, ("OBJECTID", "LAYER"))
    except HTTPException as exc:
        return {
            "schema_version": VERSION,
            "status": "partial",
            "parcel_ref": request.parcel_ref.model_dump(),
            "parcel": parcel,
            "rooflines": [],
            "issues": ["roofline_fetch_failed", str(exc.detail)],
            "evidence": [parcel_evidence],
        }
    rooflines = []
    issues = [issue] if issue else []
    for feature in buildings:
        raw = feature.get("geometry")
        if raw is None:
            issues.append("roofline_geometry_missing")
            continue
        roof, roof_issue = xy_polygon(
            {"spatialReference": {"wkid": 3157}, **raw} if isinstance(raw, dict) else raw,
            has_z=bool(buildings_value.get("hasZ")),
            has_m=bool(buildings_value.get("hasM")),
        )
        if roof is None:
            issues.append(f"roofline_{roof_issue}")
            continue
        overlap = polygon.intersection(roof)
        if overlap.is_empty:
            issues.append("provider_roofline_no_geometric_intersection")
            continue
        rooflines.append(
            {
                "attributes": feature["attributes"],
                "geometry": raw,
                "planar_geometry": mapping(roof),
                "horizontal_crs": "EPSG:3157",
                "area_m2": roof.area,
                "intersection_area_m2": overlap.area,
                "geometry_issue": roof_issue,
                "relationship": "spatial_intersection_not_ownership",
            }
        )
        if roof_issue:
            issues.append(roof_issue)
    if not rooflines:
        issues.append("no_usable_intersecting_rooflines_does_not_establish_empty_space")
    return {
        "schema_version": VERSION,
        "status": "partial" if issues else "available",
        "parcel_ref": request.parcel_ref.model_dump(),
        "parcel": parcel,
        "rooflines": rooflines,
        "issues": issues,
        "evidence": [parcel_evidence, building_evidence],
    }
