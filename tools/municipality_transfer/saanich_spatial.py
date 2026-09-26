"""Offline SR-42 Saanich catalogue excerpt replay; no network or publication."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from shapely.geometry import Point, shape

DEFAULT_ROOT = Path(__file__).resolve().parents[2] / "docs/municipality-transfer/saanich/spatial"


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
        if geometry.intersects(other):
            if not other.is_valid:
                zones.append(
                    {
                        "source_record_index": feature["source_record_index"],
                        "original_type": feature["attributes"].get("TYPE"),
                        "original_class": feature["attributes"].get("CLASS"),
                        "original_bylaw_url": feature["attributes"].get("BYLAW"),
                        "intersection_area_m2": None,
                        "classification": "geometry_unusable",
                    }
                )
                result["issues"].append("zoning_geometry_unusable; no coverage_inference")
                continue
            intersection = geometry.intersection(other)
            area = intersection.area
            zones.append(
                {
                    "source_record_index": feature["source_record_index"],
                    "original_type": feature["attributes"].get("TYPE"),
                    "original_class": feature["attributes"].get("CLASS"),
                    "original_bylaw_url": feature["attributes"].get("BYLAW"),
                    "intersection_area_m2": area,
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
    args = parser.parse_args()
    print(
        json.dumps(map_address(load_capture(args.root), args.address), indent=2, ensure_ascii=False)
    )


if __name__ == "__main__":
    main()
