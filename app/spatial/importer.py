"""Verify the portable licensed packet before parsing source JSON; prepare one atomic import."""

import hashlib
import json
import runpy
from pathlib import Path
from urllib.parse import urlsplit

import pyproj
import shapely

from app.contracts.common import RevisionRef

from .geometry import (
    geographic_transformer,
    geographic_xy,
    intersect_parcel,
    transform_metadata,
    xy_polygon,
)
from .payloads import FeatureAssessment, LayerObservation, SpatialImport

ROOT = Path(__file__).resolve().parents[2] / "docs/pilot-inputs"


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    ).hexdigest()


def strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate JSON key")
            result[key] = value
        return result

    def nonfinite(_):
        raise ValueError("nonfinite JSON number")

    return json.loads(raw, object_pairs_hook=pairs, parse_constant=nonfinite)


def prepare(root: Path = ROOT):
    # Only repository-owned code is executed, never code from the supplied input directory.
    intake = runpy.run_path(str(ROOT / "intake.py"))
    packet = intake["IntakePacket"].model_validate(
        strict_json((root / "intake-packet.json").read_bytes())
    )
    licensed = [s for s in packet.sources if s.capture.redistribution == intake["LICENSED"]]
    if len(licensed) != 15 or len(packet.spatial_samples) != 9:
        raise ValueError("expected bounded pilot: 15 sources and nine feature responses")
    sources = {}
    raw_bytes = {}
    # Verify every byte buffer before any source JSON is decoded. Parse that same buffer,
    # avoiding a second file read between integrity verification and geometry processing.
    for source in licensed:
        capture = source.capture
        if not capture.repository_path or source.status != "verified_repository":
            raise ValueError("licensed source unavailable")
        path = intake["contained"](root, capture.repository_path)
        if path.stat().st_size > 20_000_000:
            raise ValueError("pilot object exceeds bounded size")
        raw = path.read_bytes()
        if len(raw) != capture.byte_count or hashlib.sha256(raw).hexdigest() != capture.sha256:
            raise ValueError("source integrity mismatch")
        mapped = intake["map_source"](capture, root, None)
        if mapped != source:
            raise ValueError("packet source/capture mismatch")
        if capture.source_id in sources:
            raise ValueError("duplicate source ID")
        sources[capture.source_id] = source.snapshot
        raw_bytes[capture.source_id] = raw
    decoded = {sid: strict_json(raw) for sid, raw in raw_bytes.items()}
    observations, assessments, geometries = [], [], {}
    transformer = geographic_transformer()
    for sample in packet.spatial_samples:
        source = sources[sample.source_id]
        metadata_source = sources[sample.layer_metadata_source_id]
        catalogue_source = sources[sample.catalogue_source_id]
        metadata = decoded[sample.layer_metadata_source_id]
        catalogue = decoded[sample.catalogue_source_id]
        response = decoded[sample.source_id]
        layer_url = metadata_source.source_url.split("?")[0]
        request = urlsplit(source.source_url)
        if (
            sample.snapshot_id != source.snapshot_id
            or sample.artifact != source.artifact
            or source.source_url.split("?")[0] != layer_url + "/query"
            or catalogue.get("url", "").rstrip("/").lower() != layer_url.lower()
            or str(metadata.get("id")) != layer_url.rsplit("/", 1)[1]
            or metadata.get("geometryType") != "esriGeometryPolygon"
            or response.get("geometryType") != "esriGeometryPolygon"
            or response.get("hasZ", False) != metadata.get("hasZ", False)
            or response.get("hasM", False) != metadata.get("hasM", False)
            or response.get("spatialReference", {}).get("wkid") != 3157
            or metadata.get("extent", {}).get("spatialReference", {}).get("wkid") != 3157
            or request.scheme != "https"
        ):
            raise ValueError("source/layer/schema/CRS mismatch")
        if response.get("error") or response.get("exceededTransferLimit"):
            raise ValueError("failed or truncated response")
        fields = metadata["fields"]
        oid_fields = [f["name"] for f in fields if f["type"] == "esriFieldTypeOID"]
        if len(oid_fields) != 1:
            raise ValueError("ambiguous feature locator")
        attribute_names = {f["name"] for f in fields if f["type"] != "esriFieldTypeGeometry"}
        features = response.get("features")
        if not isinstance(features, list) or len(features) > 1000:
            raise ValueError("invalid or unbounded feature response")
        ids = [f.get("attributes", {}).get(oid_fields[0]) for f in features]
        if tuple(ids) != sample.feature_ids or len(ids) != len(set(ids)):
            raise ValueError("feature locators differ from intake")
        layer_geometries = []
        for i, feature in enumerate(features):
            if set(feature.get("attributes", {})) != attribute_names:
                raise ValueError("attributes differ from captured layer schema")
            polygon, problem = xy_polygon(
                feature.get("geometry"),
                has_z=response.get("hasZ", False),
                has_m=response.get("hasM", False),
            )
            layer_geometries.append(polygon)
            assessments.append(
                FeatureAssessment(
                    snapshot_id=source.snapshot_id,
                    feature_index=i,
                    status="needs_investigation" if problem else "usable_xy",
                    issues=(problem,)
                    if problem
                    else ("accuracy_currency_and_legal_meaning_unreviewed",),
                    geometric_area_m2=None if polygon is None else polygon.area,
                    geographic_xy=None if polygon is None else geographic_xy(polygon, transformer),
                )
            )
        geometries[sample.source_id] = layer_geometries
        observations.append(
            LayerObservation(
                source_id=source.source_id,
                snapshot_id=source.snapshot_id,
                metadata_snapshot_id=metadata_source.snapshot_id,
                catalogue_snapshot_id=catalogue_source.snapshot_id,
                layer_url=layer_url,
                request_url=source.source_url,
                attribution=source.reuse_constraints,
                response=response,
            )
        )
    parcels = []
    # Explicit acquisition request grouping, not an address match or permanent feature identity.
    for lead in ("59", "80", "86"):
        parcel_id, zone_id = f"site-{lead}-parcel", f"site-{lead}-zones"
        if not geometries[parcel_id]:
            parcels.append(
                intersect_parcel(
                    None,
                    geometries[zone_id],
                    sources[parcel_id].snapshot_id,
                    None,
                    sources[zone_id].snapshot_id,
                )
            )
        for i, parcel in enumerate(geometries[parcel_id]):
            parcels.append(
                intersect_parcel(
                    parcel,
                    geometries[zone_id],
                    sources[parcel_id].snapshot_id,
                    i,
                    sources[zone_id].snapshot_id,
                    decoded[parcel_id]["features"][i]["attributes"],
                )
            )
    body = dict(
        source_snapshot_ids=tuple(s.snapshot_id for s in sources.values()),
        runtime={
            "shapely": shapely.__version__,
            "geos": shapely.geos_version_string,
            "pyproj": pyproj.__version__,
            "proj": pyproj.proj_version_str,
        },
        transform=transform_metadata(transformer),
        observations=tuple(observations),
        features=tuple(assessments),
        parcels=tuple(parcels),
    )
    candidate = SpatialImport(
        identity=RevisionRef(logical_id="victoria-pilot-three-leads", revision_id="pending"), **body
    )
    hashed = candidate.model_dump(mode="json", exclude={"identity"})
    result = candidate.model_copy(
        update={
            "identity": RevisionRef(
                logical_id=candidate.identity.logical_id,
                revision_id="spatial:sha256:" + digest(hashed),
            )
        }
    )
    return tuple(sources.values()), result


def import_pilot(repository, root: Path = ROOT):
    sources, result = prepare(root)
    repository.import_records([*sources, result])
    return result
