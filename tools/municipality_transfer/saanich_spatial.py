"""Offline SR-42 Saanich catalogue excerpt replay; no network or publication."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
import zipfile
from pathlib import Path

from shapely.geometry import Point, Polygon, shape
from shapely.validation import explain_validity

DEFAULT_ROOT = Path(__file__).resolve().parents[2] / "docs/municipality-transfer/saanich/spatial"
TOPOLOGY_REVISION = "zoning-topology-v2.json"


def load_capture(root: Path = DEFAULT_ROOT) -> dict:
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("schema_version") != "sr42.saanich.spatial.manifest.v1":
        raise ValueError("unexpected manifest version")
    if manifest.get("capture_file") != "capture.json":
        raise ValueError("unexpected capture path")
    raw = (root / "capture.json").read_bytes()
    if (
        len(raw) != manifest["capture_bytes"]
        or hashlib.sha256(raw).hexdigest() != manifest["capture_sha256"]
    ):
        raise ValueError("capture integrity failure")
    capture = json.loads(raw)
    if (
        capture.get("schema_version") != "sr42.saanich.spatial.capture.v1"
        or capture.get("crs") != "EPSG:3157"
    ):
        raise ValueError("unexpected capture version or CRS")
    if capture.get("review_status") != "unreviewed":
        raise ValueError("source review status changed")
    return capture


def _feature_geometry(feature: dict, *, allow_invalid: bool = False):
    geometry = shape(feature["geometry"])
    if geometry.is_empty or (not allow_invalid and not geometry.is_valid):
        raise ValueError("unusable source geometry")
    return geometry


def _source_polygon_rings(
    shp: bytes, selected_indexes: set[int]
) -> dict[int, list[list[list[float]]]]:
    """Read original polygon parts from an SHP member, without normalizing topology."""
    if len(shp) < 100 or struct.unpack_from(">I", shp)[0] != 9994:
        raise ValueError("invalid SHP header")
    records = {}
    offset = 100
    index = 0
    while offset + 8 <= len(shp):
        _, words = struct.unpack_from(">II", shp, offset)
        end = offset + 8 + words * 2
        if end > len(shp):
            raise ValueError("truncated SHP record")
        if index in selected_indexes:
            content = memoryview(shp)[offset + 8 : end]
            if len(content) < 44 or struct.unpack_from("<I", content)[0] != 5:
                raise ValueError("selected record is not a 2D polygon")
            part_count, point_count = struct.unpack_from("<II", content, 36)
            point_offset = 44 + part_count * 4
            if len(content) < point_offset + point_count * 16:
                raise ValueError("truncated polygon points")
            starts = list(struct.unpack_from(f"<{part_count}I", content, 44))
            if not starts or starts[0] != 0 or starts != sorted(set(starts)):
                raise ValueError("invalid polygon part offsets")
            points = [
                list(struct.unpack_from("<dd", content, point_offset + n * 16))
                for n in range(point_count)
            ]
            records[index] = [
                points[a:b] for a, b in zip(starts, starts[1:] + [point_count], strict=True)
            ]
        index += 1
        offset = end
    if offset != len(shp) or set(records) != selected_indexes:
        raise ValueError("SHP record count or selected indexes mismatch")
    return records


def _captured_rings(feature: dict) -> list:
    geometry = feature["geometry"]
    if geometry["type"] == "Polygon":
        return geometry["coordinates"]
    if geometry["type"] == "MultiPolygon":
        return [ring for polygon in geometry["coordinates"] for ring in polygon]
    raise ValueError("unexpected zoning geometry type")


def audit_zoning_archive(root: Path, archive: Path) -> dict:
    """Compare retained geometry with the hash-pinned original SHP polygon parts."""
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    expected = manifest["archives"]["ZoningSHP.zip"]
    raw = archive.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected["sha256"]:
        raise ValueError("zoning archive integrity failure")
    with zipfile.ZipFile(archive) as source:
        shp = source.read("Zoning.shp")
    if hashlib.sha256(shp).hexdigest() != expected["members"]["Zoning.shp"]:
        raise ValueError("zoning SHP member integrity failure")
    capture = load_capture(root)
    features = capture["layers"]["zoning"]
    rings_by_index = _source_polygon_rings(shp, {f["source_record_index"] for f in features})
    records = []
    for feature in features:
        index = feature["source_record_index"]
        source_rings = rings_by_index[index]
        exact = source_rings == _captured_rings(feature)
        ring_findings = []
        for ring_index, ring in enumerate(source_rings):
            signed_area = (
                sum(
                    x[0] * ring[(i + 1) % len(ring)][1] - ring[(i + 1) % len(ring)][0] * x[1]
                    for i, x in enumerate(ring)
                )
                / 2
            )
            polygon = Polygon(ring)
            ring_findings.append(
                {
                    "part_index": ring_index,
                    "orientation": "counterclockwise"
                    if signed_area > 0
                    else "clockwise"
                    if signed_area < 0
                    else "degenerate",
                    "valid": polygon.is_valid,
                    "reason": None if polygon.is_valid else explain_validity(polygon),
                }
            )
        converted = shape(feature["geometry"])
        records.append(
            {
                "source_record_index": index,
                "source_parts_match_capture_exactly": exact,
                "part_count": len(source_rings),
                "source_ring_findings": ring_findings,
                "captured_geometry_valid": converted.is_valid,
                "captured_geometry_reason": None
                if converted.is_valid
                else explain_validity(converted),
            }
        )
    return {
        "schema_version": "sr46.saanich.zoning_topology.v2",
        "input_capture_sha256": manifest["capture_sha256"],
        "input_archive_sha256": expected["sha256"],
        "input_shp_sha256": expected["members"]["Zoning.shp"],
        "method": (
            "SHP polygon part offsets and XY doubles compared exactly, in order, with "
            "flattened retained GeoJSON rings; signed ring area and Shapely 2.1.2 "
            "validity diagnostics; no repair"
        ),
        "records": records,
    }


def map_address(capture: dict, address: str) -> dict:
    """Resolve by exact civic address, parcel address and point coverage.

    The bounded capture is deliberately not a citywide search index. An absent
    address is no-match only within this retained packet.
    """
    result = {
        "schema_version": "sr42.saanich.spatial.result.v1",
        "query": address,
        "scope": "retained_three_address_excerpt_only",
        "crs": "EPSG:3157",
        "review_status": "unreviewed",
        "publication_eligible": False,
        "status": None,
        "candidates": [],
        "observations": None,
        "issues": [],
    }
    if capture.get("availability") == "unavailable":
        result["status"] = "unavailable"
        result["issues"].append("source_unavailable; no negative inference")
        return result
    if (
        capture.get("schema_version") != "sr42.saanich.spatial.capture.v1"
        or capture.get("crs") != "EPSG:3157"
    ):
        raise ValueError("unsupported capture")
    layers = capture["layers"]
    if not all(key in layers for key in ("parcels", "zoning", "buildings", "watercourse")):
        result["status"] = "unavailable"
        result["issues"].append("required_layer_unavailable; no negative inference")
        return result
    addresses = [a for a in capture["address"] if a["FULLADDRESS"].casefold() == address.casefold()]
    if not addresses:
        result["status"] = "no_match"
        result["issues"].append("no_exact_civic_address_in_retained_excerpt")
        return result
    candidates = {}
    for civic in addresses:
        point = Point(float(civic["EASTING"]), float(civic["NORTHING"]))
        for parcel in layers["parcels"]:
            attributes = parcel["attributes"]
            if attributes.get("ADDRESS", "").casefold() != address.casefold():
                continue
            if not _feature_geometry(parcel).covers(point):
                continue
            index = parcel["source_record_index"]
            candidates[index] = parcel
            result["candidates"].append(
                {
                    "civic_facility_id": civic["FACILITYID"],
                    "parcel_source_record_index": index,
                    "pid": attributes.get("PID"),
                    "subtype": attributes.get("SUBTYPE"),
                }
            )
    if not result["candidates"]:
        result["status"] = "no_match"
        result["issues"].append("no_parcel_with_matching_address_and_point_coverage")
        return result
    if len(result["candidates"]) != 1 or len(addresses) != 1:
        result["status"] = "ambiguous"
        result["issues"].append("multiple_address_or_parcel_candidates; manual_review_required")
        return result
    parcel = next(iter(candidates.values()))
    attrs = parcel["attributes"]
    if attrs.get("SUBTYPE") != "Parcel" or not attrs.get("PID"):
        result["status"] = "ambiguous"
        result["issues"].append("non_ordinary_parcel_or_missing_pid; manual_review_required")
        return result
    geometry = _feature_geometry(parcel)
    zones = []
    for feature in layers["zoning"]:
        other = _feature_geometry(feature, allow_invalid=True)
        if not other.is_valid:
            # Only a possible contact: never run a topology operation on an invalid zone.
            if geometry.intersects(other.envelope):
                zones.append(
                    {
                        "source_record_index": feature["source_record_index"],
                        "original_type": feature["attributes"].get("TYPE"),
                        "original_class": feature["attributes"].get("CLASS"),
                        "original_bylaw_url": feature["attributes"].get("BYLAW"),
                        "intersection_area_m2": None,
                        "classification": "geometry_unusable",
                        "contact_basis": "envelope_overlap_only",
                    }
                )
                result["issues"].append("zoning_geometry_unusable; no coverage_inference")
            continue
        if geometry.intersects(other):
            intersection = geometry.intersection(other)
            area = intersection.area
            zones.append(
                {
                    "source_record_index": feature["source_record_index"],
                    "original_type": feature["attributes"].get("TYPE"),
                    "original_class": feature["attributes"].get("CLASS"),
                    "original_bylaw_url": feature["attributes"].get("BYLAW"),
                    "intersection_area_m2": area,
                    "contact_basis": "polygon_intersection",
                    "classification": "boundary_touch"
                    if area == 0
                    else "sliver"
                    if area <= 0.01
                    else "material",
                }
            )
    buildings = []
    for feature in layers["buildings"]:
        other = _feature_geometry(feature)
        if geometry.intersects(other):
            buildings.append(
                {
                    "source_record_index": feature["source_record_index"],
                    "roofline_intersection_area_m2": geometry.intersection(other).area,
                    "source_building_id": feature["attributes"].get("Buildin_ID"),
                }
            )
    watercourses = []
    for feature in layers["watercourse"]:
        other = _feature_geometry(feature)
        if other.distance(geometry) < 50:
            watercourses.append(
                {
                    "source_record_index": feature["source_record_index"],
                    "original_name": feature["attributes"].get("NAME"),
                    "original_class": feature["attributes"].get("CLASS"),
                    "distance_to_parcel_m": other.distance(geometry),
                }
            )
    result["status"] = "unique_observed_candidate"
    result["observations"] = {
        "parcel_source_record_index": parcel["source_record_index"],
        "pid": attrs["PID"],
        "parcel_subtype": attrs["SUBTYPE"],
        "original_area_m2_ground_scale": attrs.get("AREASQM"),
        "approximate_xy_area_m2": geometry.area,
        "boundary_geometry_xy": parcel["geometry"],
        "zoning_contacts": zones,
        "roofline_contacts": buildings,
        "watercourses_within_50m_in_excerpt": watercourses,
    }
    result["issues"].extend(
        [
            "parcel_candidate_unreviewed_not_title_or_survey_verification",
            "rooflines_not_surveyed_wall_footprints_or_building_roles",
            "constraint_excerpt_not_exhaustive; no legal setback_or_slope_inference",
        ]
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("address", nargs="?", default="3325 KINGSLEY ST")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--audit-zoning-archive", type=Path)
    args = parser.parse_args()
    if args.audit_zoning_archive:
        print(json.dumps(audit_zoning_archive(args.root, args.audit_zoning_archive), indent=2))
        return
    print(
        json.dumps(map_address(load_capture(args.root), args.address), indent=2, ensure_ascii=False)
    )


if __name__ == "__main__":
    main()
