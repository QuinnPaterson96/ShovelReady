"""Offline consistency audit of this research packet, not legal/source review."""
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from pyproj import Transformer
from shapely.geometry import Point, shape

ROOT = Path(__file__).parent
for path in ROOT.glob("*.json"):
    json.loads(path.read_text(encoding="utf-8"))
for path in ROOT.glob("*.xml"):
    ET.parse(path)

for case in json.loads((ROOT / "address-experiments.json").read_text(encoding="utf-8")):
    key = case["case"]
    geocoder = json.loads((ROOT / f"{key}-geocoder.json").read_text(encoding="utf-8"))
    parcels = json.loads((ROOT / f"{key}-pmbc.json").read_text(encoding="utf-8"))
    transform = Transformer.from_crs(4326, parcels["crs"]["properties"]["name"], always_xy=True)
    point = Point(*transform.transform(*geocoder["features"][0]["geometry"]["coordinates"]))
    assert parcels["numberMatched"] == parcels["numberReturned"] < 20
    actual = [shape(feature["geometry"]).covers(point) for feature in parcels["features"]]
    assert actual == [feature["covers_first_point"] for feature in case["parcel_candidates"]]
    print(key, "retained containment agrees", actual)

saanich = json.loads((ROOT / "saanich-downloads.json").read_text(encoding="utf-8"))
for row in saanich["AddressCSV.zip"]["selected"]:
    parcels = [item for item in saanich["ParcelsSHP.zip"]["selected"]
               if item["attributes"]["ADDRESS"] == row["FULLADDRESS"]]
    assert len(parcels) == 1
    assert shape(parcels[0]["geometry"]).covers(Point(float(row["EASTING"]), float(row["NORTHING"])))
for contacts in saanich["ZoningSHP.zip"]["current_contacts"].values():
    for row in contacts:
        if not row["valid"]:
            assert row["xy_overlap_m2"] is None and row["contact_basis"] == "envelope_only"
for path in ROOT.glob("*.md"):
    for link in re.findall(r"\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
        if not link.startswith(("https:", "#")):
            assert (path.parent / link.split("#")[0]).exists(), (path, link)

print("PASS: JSON/XML, six containments, two municipal joins, unresolved zoning and local links")
