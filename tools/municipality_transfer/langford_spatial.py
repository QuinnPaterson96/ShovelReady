"""Offline, bounded replay of licensed BC geocoder and PMBC captures for SR-44.

No network access, database write, legal site construction, or publication.
"""

import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

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


def candidate_locator(feature, index):
    """Position plus content digest pins a candidate to the exact saved response."""
    digest = hashlib.sha256(
        json.dumps(feature, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    return f"{index}:{digest[:16]}"


def map_case(geocoder, parcels, selection=None, *, geocoder_source=None, parcel_source=None):
    """A unique containing polygon is a *candidate*, never an address/PID proof."""
    features = geocoder.get("features")
    if not isinstance(features, list):
        raise ValueError("invalid geocoder features")
    if geocoder.get("crs", {}).get("properties", {}).get("code") != 4326:
        raise ValueError("geocoder CRS mismatch")
    requested = geocoder.get("queryAddress")
    if not isinstance(requested, str) or not requested:
        raise ValueError("missing requested address")
    if geocoder_source is not None:
        query = parse_qs(urlparse(geocoder_source["url"]).query)
        if (
            query.get("addressString") != [requested]
            or query.get("outputSRS") != ["4326"]
            or query.get("maxResults") != [str(geocoder.get("maxResults"))]
        ):
            raise ValueError("geocoder request and response mismatch")
    choices = [
        {
            "locator": candidate_locator(feature, index),
            "returned_address": feature.get("properties", {}).get("fullAddress"),
            "match_precision": feature.get("properties", {}).get("matchPrecision"),
            "score": feature.get("properties", {}).get("score"),
            "point_lon_lat": feature.get("geometry", {}).get("coordinates"),
        }
        for index, feature in enumerate(features)
    ]
    geocoder_limit = geocoder.get("maxResults")
    if not isinstance(geocoder_limit, int) or geocoder_limit < len(features):
        raise ValueError("geocoder result limit inconsistent")
    if selection is None and len(features) > 1:
        return {
            "status": "ambiguous",
            "reason": "multiple geocoder candidates; confirmation required",
            "candidates": [],
            "geocoder_candidates": choices,
            "requested_address": requested,
            "geocoder_source": geocoder_source,
            "geocoder_pagination": {
                "returned": len(features),
                "max_results": geocoder_limit,
                "may_be_truncated": len(features) == geocoder_limit,
            },
            "parcel_match_verified": False,
            "publication_eligible": False,
            "review_status": "unreviewed",
        }
    if not features:
        if selection is not None:
            raise ValueError("selection has no candidate")
        return {"status": "no_match", "reason": "no geocoder candidate", "candidates": []}
    if selection is None:
        selected_index = 0
    else:
        locators = [choice["locator"] for choice in choices]
        if selection not in locators:
            raise ValueError("selection locator not in exact capture")
        selected_index = locators.index(selection)
    first = features[selected_index]
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
    context = {
        "requested_address": requested,
        "geocoder_address": props["fullAddress"],
        "address_text_equal": requested.casefold() == props["fullAddress"].casefold(),
        "match_precision": props.get("matchPrecision"),
        "geocoder_score": props.get("score"),
        "geocoder_point_lon_lat": coords,
        "point_crs": "EPSG:4326",
        "selection": {
            "locator": choices[selected_index]["locator"],
            "source": geocoder_source,
            "selection_revision": "sr47-replay.v1",
        },
        "geocoder_candidates": choices,
        "geocoder_pagination": {
            "returned": len(features),
            "max_results": geocoder_limit,
            "may_be_truncated": len(features) == geocoder_limit,
        },
        "parcel_match_verified": False,
        "review_status": "unreviewed",
        "publication_eligible": False,
    }
    if parcels is None:
        return {
            **context,
            "status": "unavailable",
            "reason": "parcel source unavailable",
            "candidates": [],
        }
    if parcel_source is not None:
        parcel_query = parse_qs(urlparse(parcel_source["url"]).query)
        bbox = parcel_query.get("bbox", [None])[0]
        if bbox is None:
            raise ValueError("parcel source bbox missing")
        limit = int(parcel_query.get("count", ["0"])[0])
        if limit < 1:
            raise ValueError("parcel source count missing")
        west, south, east, north, crs = bbox.split(",")
        if crs != "EPSG:4326":
            raise ValueError("parcel source bbox CRS mismatch")
        if not (
            float(west) <= coords[0] <= float(east) and float(south) <= coords[1] <= float(north)
        ):
            return {
                **context,
                "status": "unavailable",
                "reason": "saved parcel query does not cover selected geocoder point",
                "candidates": [],
                "parcel_source": parcel_source,
            }
    if (
        parcels.get("crs", {}).get("properties", {}).get("name") != "urn:ogc:def:crs:EPSG::3005"
        or not isinstance(parcels.get("features"), list)
        or parcels.get("numberReturned") != len(parcels["features"])
        or parcels.get("numberMatched") != len(parcels["features"])
        or (parcel_source is not None and parcels["numberReturned"] > limit)
    ):
        raise ValueError("parcel CRS or pagination mismatch")
    matched = []
    for feature in parcels["features"]:
        polygon = shape(feature["geometry"])
        if (
            not polygon.is_valid
            or polygon.is_empty
            or polygon.geom_type not in ("Polygon", "MultiPolygon")
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
        **context,
        "polygon_crs": "EPSG:3005",
        "parcel_source": parcel_source,
        "parcel_pagination": {
            "number_matched": parcels["numberMatched"],
            "number_returned": parcels["numberReturned"],
            "request_count": limit if parcel_source is not None else None,
            "complete_for_saved_bbox": True,
        },
        "candidates": matched,
    }


def replay(root=PACKET, selections=None):
    packet = read_packet(root)
    manifest = strict_json((root / "manifest.json").read_bytes())
    sources = {
        entry["file"]: {key: entry[key] for key in ("url", "captured_utc", "sha256")}
        for entry in manifest["artifacts"]
    }
    selections = selections or {}
    if set(selections) - set(CASES):
        raise ValueError("unknown case selection")
    return {
        "schema_version": "sr47-replay.v1",
        "cases": {
            case: map_case(
                packet[f"{case}-geocoder.json"],
                packet[f"{case}-pmbc.json"],
                selections.get(case),
                geocoder_source=sources[f"{case}-geocoder.json"],
                parcel_source=sources[f"{case}-pmbc.json"],
            )
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
    parser.add_argument("--select", action="append", default=[], metavar="CASE=LOCATOR")
    args = parser.parse_args()
    selections = {}
    for item in args.select:
        case, separator, locator = item.partition("=")
        if not separator or case in selections:
            parser.error("--select requires a unique CASE=LOCATOR")
        selections[case] = locator
    print(json.dumps(replay(args.packet, selections), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
