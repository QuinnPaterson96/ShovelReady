"""Bounded municipal map flags; absence is scoped, never permit clearance."""

import json
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Literal

from fastapi import APIRouter
from pydantic import Field

from app.municipal_sites.api import ParcelRef
from app.spatial.geometry import xy_polygon

from .api import PARCEL, SourceFailure, SourceRecord, StrictModel, _query

ROOT = "https://maps.victoria.ca/server/rest/services/OpenData/OpenData_PlanningAndDevelopment/MapServer"
LAYERS = (
    (10, "Heritage properties", "OBJECTID,Heritage"),
    (14, "Heritage conservation areas", "OBJECTID,Name,DPA_Number"),
    (11, "Development permit areas", "OBJECTID,Name,DPA_Number"),
    (1, "Mapped special restrictions", "OBJECTID"),
    (3, "Mapped development applications", "OBJECTID,AppType,FOLDER_NUMBER,SUBJECT,STATUS"),
    (18, "Development application history", "OBJECTID,AppType,FOLDER_NUMBER,SUBJECT,STATUS"),
)
router = APIRouter(prefix="/api/victoria-zoning", tags=["victoria-zoning"])


class ScanRequest(StrictModel):
    schema_version: Literal["victoria-property-scan.v1"]
    parcel_ref: ParcelRef
    expected_pid: str | None = Field(default=None, max_length=40)


class ScanFinding(StrictModel):
    label: str
    status: Literal["probably_clear", "review", "unknown"]
    records: list[dict] = Field(max_length=24)
    source: SourceRecord | None
    detail: str


class ScanResult(StrictModel):
    schema_version: Literal["victoria-property-scan.v1"] = "victoria-property-scan.v1"
    parcel_ref: ParcelRef
    findings: list[ScanFinding]
    parcel_source: SourceRecord | None
    limitations: tuple[str, ...] = (
        "Only the listed City map layers and linked application-history table were searched.",
        "No mapped records is not proof that no conditions or variances apply.",
        "Issued permit documents, title covenants, projections, service capacity "
        "and design-specific provisions were not checked. "
        "Review the Property Information Portal and Development Tracker.",
    )


@router.post("/property-scan", response_model=ScanResult)
def scan(request: ScanRequest):
    try:
        value, parcel_source = _query(
            PARCEL,
            {
                "objectIds": request.parcel_ref.object_id,
                "outFields": "OBJECTID,PID,GISLINK",
                "returnGeometry": "true",
                "outSR": 3157,
            },
            "Selected parcel for planning flag scan",
        )
        rows = value["features"]
        if len(rows) != 1 or rows[0]["attributes"]["OBJECTID"] != request.parcel_ref.object_id:
            raise SourceFailure("selected parcel missing or changed")
        attributes, raw = rows[0]["attributes"], rows[0]["geometry"]
        if request.expected_pid is not None and request.expected_pid != attributes.get("PID"):
            raise SourceFailure("selected parcel PID changed")
        parcel, issue = xy_polygon({"spatialReference": {"wkid": 3157}, **raw})
        if parcel is None or issue or parcel.is_empty or not parcel.is_valid:
            raise SourceFailure("selected parcel geometry unavailable")
    except (SourceFailure, KeyError, TypeError, ValueError) as exc:
        return ScanResult(
            parcel_ref=request.parcel_ref,
            parcel_source=None,
            findings=[
                ScanFinding(
                    label=label,
                    status="unknown",
                    records=[],
                    source=None,
                    detail=f"Scan unavailable: {exc}",
                )
                for _, label, _ in LAYERS
            ],
        )

    def query_layer(item):
        layer, label, fields = item
        params = {"outFields": fields, "returnGeometry": "false"}
        if layer == 18:
            link = str(attributes.get("GISLINK", ""))
            if not re.fullmatch(r"[A-Za-z0-9-]{1,40}", link):
                return ScanFinding(
                    label=label,
                    status="unknown",
                    records=[],
                    source=None,
                    detail="No usable parcel-to-history link was supplied.",
                )
            params["where"] = f"gislink='{link}'"
        else:
            params.update(
                geometry=json.dumps({"spatialReference": {"wkid": 3157}, **raw}),
                geometryType="esriGeometryPolygon",
                inSR=3157,
                spatialRel="esriSpatialRelIntersects",
            )
        try:
            value, source = _query(f"{ROOT}/{layer}", params, label)
            records = [row["attributes"] for row in value["features"]]
            if not all(
                isinstance(row, dict) and type(row.get("OBJECTID")) is int for row in records
            ):
                raise SourceFailure("source record identity missing")
            return ScanFinding(
                label=label,
                status="review" if records else "probably_clear",
                records=records,
                source=source,
                detail="Mapped records found; review their relevance and conditions."
                if records
                else "No records found in this searched City layer; "
                "probably clear within this scope only.",
            )
        except (SourceFailure, KeyError, TypeError) as exc:
            return ScanFinding(
                label=label,
                status="unknown",
                records=[],
                source=None,
                detail=f"Source unavailable or incomplete: {exc}",
            )

    with ThreadPoolExecutor(max_workers=3) as pool:
        findings = list(pool.map(query_layer, LAYERS))
    return ScanResult(parcel_ref=request.parcel_ref, parcel_source=parcel_source, findings=findings)
