"""Build the bounded runtime packet from retained, licensed Victoria captures.

This command reads checkout research files; the application never does.
"""

import hashlib
import json
from pathlib import Path

from shapely.geometry import mapping

from app.scouting_geometry.payloads import Building, Capture, Feature
from app.spatial.geometry import xy_polygon

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "docs/research/occupied-lots/manifest.json"
OUTPUT = ROOT / "app/scouting_sites/data"
CASE_IDS = ("VIC-087", "VIC-090", "VIC-093")


def build():
    manifest = json.loads(RESEARCH.read_bytes())
    cases = {case["case_id"]: case for case in manifest["cases"]}
    packet_sources = {}
    results = []
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "sources").mkdir(exist_ok=True)
    for case_id in CASE_IDS:
        case = cases[case_id]
        issues = []

        def convert(source_id, *, roofline=False, issues=issues):
            source = manifest["sources"][source_id]
            raw = (ROOT / source["repository_path"]).read_bytes()
            digest = hashlib.sha256(raw).hexdigest()
            if digest != source["sha256"] or len(raw) != source["byte_count"]:
                raise ValueError(f"source integrity failed: {source_id}")
            (OUTPUT / "sources" / f"{digest}.json").write_bytes(raw)
            packet_sources[source_id] = {
                "sha256": digest,
                "byte_count": len(raw),
                "captured_at_utc": source["captured_at_utc"],
                "reference": source["resolved_url"],
                "attribution": source["attribution"],
                "licence_url": source["licence_url"],
            }
            response = json.loads(raw)
            if response.get("spatialReference", {}).get("wkid") != 3157:
                raise ValueError(f"unexpected CRS: {source_id}")
            features = []
            for row in response["features"]:
                object_id = row["attributes"]["OBJECTID"]
                geom, issue = xy_polygon(row["geometry"], has_z=response.get("hasZ", False))
                if issue:
                    issues.append(f"{source_id} feature {object_id}: {issue}")
                if geom is None or geom.geom_type != "Polygon":
                    continue
                feature = {
                    "id": f"{source_id}:{object_id}",
                    "shape": {"crs": "EPSG:3157", "geometry": mapping(geom)},
                    "source": {
                        "provider": "City of Victoria",
                        "record_label": (
                            f"Mapped roofline {object_id}" if roofline else f"Parcel {object_id}"
                        ),
                        "capture_date": source["captured_at_utc"],
                        "review_status": "unreviewed",
                        "reference": source["resolved_url"],
                    },
                }
                if roofline:
                    feature["basis"] = "roofline"
                    Building.model_validate(feature)
                else:
                    Feature.model_validate(feature)
                features.append(feature)
            return features

        parcel = convert(f"new-{case['parcel_object_id']}-parcel")
        if len(parcel) != 1:
            raise ValueError(f"{case_id}: exactly one usable parcel required")
        buildings = convert(f"new-{case['parcel_object_id']}-buildings", roofline=True)
        expected = set(case["intersecting_building_object_ids"])
        actual = {int(b["id"].rsplit(":", 1)[1]) for b in buildings}
        if expected != actual:
            issues.append("One or more captured rooflines could not be converted")
        scope = "Parcel-intersecting City of Victoria mapped rooflines only"
        limitations = [
            "Mapped rooflines are not surveyed walls or all site obstructions.",
            "Building roles, legal lot lines, occupancy and zoning applicability are unreviewed.",
            "Address points and zoning intersections are research context, "
            "not verified site identity or rules.",
            *issues,
        ]
        results.append(
            {
                "case_id": case_id,
                "label": f"Victoria parcel {case['parcel_object_id']}",
                "site": {
                    "projected_metre_crs": "EPSG:3157",
                    "parcel": parcel[0],
                    "buildings": buildings,
                    "named_boundaries": [],
                    "capture": Capture(
                        completeness="partial", scope=scope, limitations=tuple(limitations)
                    ).model_dump(mode="json"),
                },
            }
        )
    packet = {"schema_version": "scouting-sites.v1", "cases": results}
    (OUTPUT / "sites.json").write_text(json.dumps(packet, indent=2) + "\n", encoding="utf-8")
    (OUTPUT / "sources.json").write_text(
        json.dumps(packet_sources, indent=2) + "\n", encoding="utf-8"
    )
    return packet


if __name__ == "__main__":
    build()
