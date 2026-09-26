"""Offline, bounded replay of licensed BC geocoder and PMBC captures for SR-44.

No network access, database write, legal site construction, or publication.
"""

import argparse
import hashlib
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import Point, shape

CASES = ("lone-oak", "jenkins", "glen-lake")
PACKET = Path(__file__).resolve().parents[2] / "docs/municipality-transfer/langford/spatial"
LICENCE = "Open Government Licence - British Columbia"


def strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate JSON key")
            result[key] = value
        return result

    def nonfinite(_):
        raise ValueError("nonfinite JSON value")

    return json.loads(raw, object_pairs_hook=pairs, parse_constant=nonfinite)


def read_packet(root=PACKET):
    manifest = strict_json((root / "manifest.json").read_bytes())
    if manifest.get("schema_version") != "sr44-capture.v1":
        raise ValueError("unsupported manifest")
    expected = {f"{case}-{kind}.json" for case in CASES for kind in ("geocoder", "pmbc")}
    entries = manifest.get("artifacts")
    if not isinstance(entries, list) or {e.get("file") for e in entries} != expected:
        raise ValueError("unexpected artifact set")
    result = {}
    for entry in entries:
        name = entry["file"]
        if not isinstance(name, str) or Path(name).name != name:
            raise ValueError("artifact path escapes packet")
        if LICENCE not in entry.get("licence", ""):
            raise ValueError("artifact has no verified licence")
        path = root / name
        raw = path.read_bytes()
        if len(raw) != entry["bytes"] or hashlib.sha256(raw).hexdigest() != entry["sha256"]:
            raise ValueError(f"artifact integrity mismatch: {name}")
        if len(raw) > 100_000:
            raise ValueError("unbounded response")
        result[name] = strict_json(raw)
    return result


def map_case(geocoder, parcels):
    """A unique containing polygon is a *candidate*, never an address/PID proof."""
    features = geocoder.get("features")
    if not isinstance(features, list) or not features:
        return {"status": "no_match", "reason": "no geocoder candidate", "candidates": []}
    first = features[0]
    coords = first.get("geometry", {}).get("coordinates")
    props = first.get("properties", {})
    if (
        not isinstance(coords, list)
        or len(coords) != 2
        or not all(isinstance(n, (int, float)) and not isinstance(n, bool) for n in coords)
        or not (-180 <= coords[0] <= 180 and -90 <= coords[1] <= 90)
        or not isinstance(props.get("fullAddress"), str)
    ):
        raise ValueError("invalid EPSG:4326 geocoder candidate")
    point = Point(*Transformer.from_crs(4326, 3005, always_xy=True).transform(*coords))
    if parcels is None:
        return {"status": "unavailable", "reason": "parcel source unavailable", "candidates": []}
    if (
        parcels.get("crs", {}).get("properties", {}).get("name")
        != "urn:ogc:def:crs:EPSG::3005"
        or not isinstance(parcels.get("features"), list)
        or parcels.get("numberReturned") != len(parcels["features"])
        or parcels.get("numberMatched") != len(parcels["features"])
    ):
        raise ValueError("parcel CRS or pagination mismatch")
    matched = []
    for feature in parcels["features"]:
        polygon = shape(feature["geometry"])
        if not polygon.is_valid or polygon.is_empty or polygon.geom_type not in (
            "Polygon", "MultiPolygon"
        ):
            raise ValueError("unusable parcel geometry")
        if polygon.covers(point):
            attr = feature["properties"]
            pid = attr.get("PID")
            matched.append(
                {
                    "feature_id": feature.get("id"),
                    "pid": pid,
                    "parcel_class": attr.get("PARCEL_CLASS"),
                    "parcel_status": attr.get("PARCEL_STATUS"),
                    "geometric_area_m2_epsg3005": round(polygon.area, 3),
                    "provider_feature_area_sqm": attr.get("FEATURE_AREA_SQM"),
                    "provider_updated": attr.get("WHEN_UPDATED"),
                    "review_status": "unreviewed",
                }
            )
    matched.sort(key=lambda item: (str(item["pid"]), str(item["feature_id"])))
    if len(matched) == 1 and matched[0]["pid"]:
        status, reason = "unique_spatial_candidate", "point covered by one PID polygon"
    elif matched:
        status, reason = "ambiguous", "multiple or PID-less containing polygons"
    else:
        status, reason = "no_match", "geocoder point covered by no returned polygon"
    return {
        "status": status,
        "reason": reason,
        "geocoder_address": props["fullAddress"],
        "geocoder_score": props.get("score"),
        "geocoder_point_lon_lat": coords,
        "point_crs": "EPSG:4326",
        "polygon_crs": "EPSG:3005",
        "candidates": matched,
        "parcel_match_verified": False,
        "review_status": "unreviewed",
        "publication_eligible": False,
    }


def replay(root=PACKET):
    packet = read_packet(root)
    return {
        "schema_version": "sr44-replay.v1",
        "cases": {
            case: map_case(packet[f"{case}-geocoder.json"], packet[f"{case}-pmbc.json"])
            for case in CASES
        },
        "zoning": "unavailable_for_retention_licence_unverified",
        "buildings": "unavailable_for_retention_licence_unverified",
        "constraints": "unavailable_for_retention_licence_unverified",
        "review_status": "unreviewed",
        "publication_eligible": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packet", type=Path, default=PACKET)
    args = parser.parse_args()
    print(json.dumps(replay(args.packet), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
