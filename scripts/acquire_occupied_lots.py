"""Bounded, offline-verifiable City of Victoria occupied-lot research capture.

Run `capture` deliberately to refresh the research packet; `verify` uses only saved bytes.
No application runtime imports this script or its output.
"""

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
PACKET = ROOT / "docs/research/occupied-lots"
LAND = "https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer"
PLANNING = "https://maps.victoria.ca/server/rest/services/OpenData/OpenData_PlanningAndDevelopment/MapServer"
LAYERS = {
    "parcel": f"{LAND}/11",
    "building": f"{LAND}/1",
    "address": f"{LAND}/0",
    "zoning": f"{PLANNING}/12",
}
CATALOGUES = {
    "parcel": "https://www.arcgis.com/sharing/rest/content/items/901cb49452d14dd2855fa701311f0545?f=pjson",
    "building": "https://www.arcgis.com/sharing/rest/content/items/dc37de452a614b599dd9c9ff473739d3?f=pjson",
    "zoning": "https://www.arcgis.com/sharing/rest/content/items/84dde8f57dd7428f8a34d67f13c55051?f=pjson",
}
ATTRIBUTION = "Contains information licensed under the Open Government Licence - City of Victoria."
PARCEL_FIELDS = ",".join(
    ("OBJECTID", "VicPID", "PID", "ParcelStatus", "ParcelType", "PrimarySurveyParcel", "Shape_Area")
)


def request(url):
    with urlopen(url, timeout=30) as response:
        raw = response.read(20_000_001)
        if len(raw) > 20_000_000:
            raise ValueError("response exceeds 20 MB")
        headers = {
            key: response.headers.get(key)
            for key in ("Content-Type", "Last-Modified", "ETag", "Date")
        }
        resolved = response.url
    value = json.loads(raw)
    if not isinstance(value, dict) or value.get("error") or value.get("exceededTransferLimit"):
        raise ValueError("failed or truncated response")
    return raw, value, resolved, headers


def save(source_id, url, sources):
    raw, value, resolved, headers = request(url)
    digest = hashlib.sha256(raw).hexdigest()
    path = PACKET / "snapshots" / f"{digest}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() != raw:
        raise ValueError("snapshot hash collision")
    path.write_bytes(raw)
    sources[source_id] = {
        "requested_url": url,
        "resolved_url": resolved,
        "captured_at_utc": datetime.now(UTC).isoformat(),
        "sha256": digest,
        "byte_count": len(raw),
        "repository_path": str(path.relative_to(ROOT)).replace("\\", "/"),
        "http_metadata": headers,
        "attribution": ATTRIBUTION,
        "licence_url": "https://opendata.victoria.ca/pages/open-data-licence",
    }
    return value


def query(layer, params, source_id, sources):
    return save(source_id, f"{LAYERS[layer]}/query?{urlencode({'f': 'pjson', **params})}", sources)


def features(value, geometry_type):
    if (
        value.get("spatialReference", {}).get("wkid") != 3157
        or value.get("geometryType") != geometry_type
    ):
        raise ValueError("unexpected response CRS or geometry type")
    result = value.get("features")
    if not isinstance(result, list) or len(result) > 1000:
        raise ValueError("invalid feature response")
    return result


def polygon_query(layer, polygon, fields, source_id, sources):
    return features(
        query(
            layer,
            {
                "geometry": json.dumps(
                    {**polygon, "spatialReference": {"wkid": 3157}}, separators=(",", ":")
                ),
                "geometryType": "esriGeometryPolygon",
                "inSR": 3157,
                "outSR": 3157,
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": fields,
                "returnGeometry": "true",
                "returnZ": "true",
            },
            source_id,
            sources,
        ),
        "esriGeometryPoint" if layer == "address" else "esriGeometryPolygon",
    )


def capture():
    sources = {}
    metadata = {}
    for layer, url in LAYERS.items():
        metadata[layer] = save(f"{layer}-metadata", f"{url}?f=pjson", sources)
        if metadata[layer].get("extent", {}).get("spatialReference", {}).get("wkid") != 3157:
            raise ValueError(f"{layer}: unexpected metadata CRS")
    for layer, url in CATALOGUES.items():
        save(f"{layer}-catalogue", url, sources)
    discovery_where = (
        "ParcelType='LA' AND ParcelStatus='ACTIVE' AND "
        "Shape_Area > 500 AND Shape_Area < 900 AND "
        "OBJECTID > 86 AND OBJECTID <= 150"
    )
    discovered = query(
        "parcel", {"where": discovery_where, "returnIdsOnly": "true"}, "bounded-discovery", sources
    )
    ids = sorted(discovered.get("objectIds", []))
    if ids != sorted(set(ids)) or any(not 86 < oid <= 150 for oid in ids):
        raise ValueError("invalid bounded discovery IDs")
    cases, audit = [], []
    for oid in ids:
        if len(cases) >= 13:
            break
        prefix = f"new-{oid}"
        parcel_rows = features(
            query(
                "parcel",
                {
                    "objectIds": oid,
                    "outFields": PARCEL_FIELDS,
                    "returnGeometry": "true",
                    "outSR": 3157,
                },
                f"{prefix}-parcel",
                sources,
            ),
            "esriGeometryPolygon",
        )
        if (
            len(parcel_rows) != 1
            or parcel_rows[0]["attributes"].get("OBJECTID") != oid
            or not parcel_rows[0].get("geometry", {}).get("rings")
        ):
            audit.append(
                {
                    "object_id": oid,
                    "selection": "excluded",
                    "reason": "parcel response ambiguous or missing geometry",
                }
            )
            continue
        polygon = parcel_rows[0]["geometry"]
        buildings = polygon_query(
            "building", polygon, "OBJECTID,LAYER,SHAPE_Area", f"{prefix}-buildings", sources
        )
        zones = polygon_query(
            "zoning", polygon, "OBJECTID,ZoningBylaw,Zoning,Title", f"{prefix}-zoning", sources
        )
        addresses = polygon_query(
            "address", polygon, "OBJECTID,FullAddress,GISLINK", f"{prefix}-addresses", sources
        )
        building_ids = [f["attributes"]["OBJECTID"] for f in buildings]
        zone_labels = [f["attributes"].get("Zoning") for f in zones]
        reasons = []
        if not buildings:
            reasons.append("no intersecting building polygon")
        if not any(
            str(f["attributes"].get("LAYER", "")).startswith("Residential") for f in buildings
        ):
            reasons.append("no Residential-labelled building polygon")
        if not any(str(z or "").startswith("GRD-1") for z in zone_labels):
            reasons.append("no GRD-1 zoning intersection")
        if reasons:
            audit.append({"object_id": oid, "selection": "excluded", "reason": "; ".join(reasons)})
            continue
        case = {
            "case_id": f"VIC-{oid:03d}",
            "origin": "new-capture",
            "parcel_object_id": oid,
            "source_ids": [
                f"{prefix}-{suffix}" for suffix in ("parcel", "buildings", "zoning", "addresses")
            ],
            "parcel_attributes": parcel_rows[0]["attributes"],
            "intersecting_building_object_ids": building_ids,
            "zoning_labels": zone_labels,
            "address_points": [
                {
                    "object_id": f["attributes"]["OBJECTID"],
                    "full_address": f["attributes"].get("FullAddress"),
                    "gislink": f["attributes"].get("GISLINK"),
                }
                for f in addresses
            ],
            "status": "apparently_occupied_geometry_only",
            "unresolved": [
                "actual occupancy",
                "dwelling count",
                "principal building role",
                "roofline versus wall footprint",
                "legal lot lines",
                "current zoning applicability",
                "address-to-parcel identity",
            ],
        }
        cases.append(case)
        audit.append(
            {
                "object_id": oid,
                "selection": "included",
                "building_count": len(buildings),
                "zoning_count": len(zones),
                "address_point_count": len(addresses),
            }
        )
    # Retain the existing pilot responses by reference, without inventing a second parcel store.
    pilot_manifest = json.loads((ROOT / "docs/pilot-inputs/source-manifest.json").read_text())
    pilot_sources = {entry["source_id"]: entry for entry in pilot_manifest}
    for oid in (59, 80, 86):
        cases.insert(
            0,
            {
                "case_id": f"VIC-{oid:03d}",
                "origin": "pilot-packet-reference",
                "parcel_object_id": oid,
                "source_ids": [
                    f"site-{oid}-{suffix}" for suffix in ("parcel", "zones", "rooflines")
                ],
                "status": "apparently_occupied_geometry_only",
                "unresolved": [
                    "actual occupancy",
                    "dwelling count",
                    "principal building role",
                    "roofline versus wall footprint",
                    "legal lot lines",
                    "current zoning applicability",
                    "address-to-parcel identity",
                ],
            },
        )
    manifest = {
        "schema_version": "occupied-lots.v1",
        "capture_status": "complete" if len(cases) >= 10 else "partial",
        "horizontal_crs": "EPSG:3157",
        "horizontal_unit": "metre",
        "vertical_unit": None,
        "selection": {
            "where": discovery_where,
            "candidate_window": [87, 150],
            "target_new_cases": 13,
            "discovered_ids": ids,
            "rule": (
                "ascending OBJECTID; retain first 13 with intersecting Residential-labelled "
                "building polygon and GRD-1 zoning intersection; 3 prior leads added by reference"
            ),
        },
        "sources": sources,
        "pilot_source_references": {
            sid: pilot_sources[sid]
            for case in cases
            if case["origin"] == "pilot-packet-reference"
            for sid in case["source_ids"]
        },
        "cases": cases,
        "candidate_audit": audit,
        "licence": {
            "url": "https://opendata.victoria.ca/pages/open-data-licence",
            "attribution": ATTRIBUTION,
        },
    }
    (PACKET / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Captured {len(cases)} cases ({len(cases) - 3} new), {len(sources)} source responses")


def verify():
    manifest = json.loads((PACKET / "manifest.json").read_text(encoding="utf-8"))
    for source_id, source in [
        *manifest["sources"].items(),
        *manifest["pilot_source_references"].items(),
    ]:
        base = ROOT if source_id in manifest["sources"] else ROOT / "docs/pilot-inputs"
        path = (base / source["repository_path"]).resolve()
        if base.resolve() not in path.parents:
            raise ValueError("snapshot path escapes packet root")
        raw = path.read_bytes()
        if len(raw) != source["byte_count"] or hashlib.sha256(raw).hexdigest() != source["sha256"]:
            raise ValueError(f"integrity mismatch: {path}")
        value = json.loads(raw)
        if value.get("error") or value.get("exceededTransferLimit"):
            raise ValueError(f"failed or truncated response: {path}")
    if len(manifest["cases"]) < 10:
        raise ValueError("fewer than 10 cases")
    discovered = json.loads(
        (ROOT / manifest["sources"]["bounded-discovery"]["repository_path"]).read_text()
    )["objectIds"]
    if sorted(discovered) != manifest["selection"]["discovered_ids"]:
        raise ValueError("discovery replay mismatch")
    included = [
        row["object_id"] for row in manifest["candidate_audit"] if row["selection"] == "included"
    ]
    new_ids = [
        case["parcel_object_id"] for case in manifest["cases"] if case["origin"] == "new-capture"
    ]
    if included != new_ids or len(new_ids) != len(set(new_ids)):
        raise ValueError("case selection replay mismatch")
    for case in manifest["cases"]:
        if case["origin"] == "pilot-packet-reference":
            if any(sid not in manifest["pilot_source_references"] for sid in case["source_ids"]):
                raise ValueError("missing pilot source reference")
            continue
        oid = case["parcel_object_id"]
        source_ids = [
            f"new-{oid}-{suffix}" for suffix in ("parcel", "buildings", "zoning", "addresses")
        ]
        if case["source_ids"] != source_ids:
            raise ValueError("case lineage mismatch")
        responses = [
            json.loads((ROOT / manifest["sources"][sid]["repository_path"]).read_bytes())
            for sid in source_ids
        ]
        rows = [
            features(value, "esriGeometryPoint" if i == 3 else "esriGeometryPolygon")
            for i, value in enumerate(responses)
        ]
        if len(rows[0]) != 1 or rows[0][0]["attributes"].get("OBJECTID") != oid:
            raise ValueError("parcel identity mismatch")
        if case["intersecting_building_object_ids"] != [
            f["attributes"]["OBJECTID"] for f in rows[1]
        ]:
            raise ValueError("building observation mismatch")
        if case["zoning_labels"] != [f["attributes"].get("Zoning") for f in rows[2]]:
            raise ValueError("zoning observation mismatch")
        if len(case["address_points"]) != len(rows[3]):
            raise ValueError("address observation mismatch")
    print(
        f"Verified {len(manifest['cases'])} cases, {len(manifest['sources'])} new responses, "
        f"{len(manifest['pilot_source_references'])} pilot references"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("capture", "verify"))
    args = parser.parse_args()
    globals()[args.action]()
