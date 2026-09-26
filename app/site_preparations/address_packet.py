"""Validate the bounded, licensed address capture before joining retained parcels."""

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from app.spatial.importer import strict_json

ROOT = Path(__file__).with_name("data")
REQUESTS = Path(__file__).resolve().parents[2] / "docs/site-preparations/address-requests.json"
LAYER = "https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/0"
CATALOGUE = "https://www.arcgis.com/sharing/rest/content/items/d638de50c2bb46e3a4c15fefe3756e78?f=pjson"
LICENCE = "https://opendata.victoria.ca/pages/open-data-licence"


class AddressPacketError(ValueError):
    """The retained address evidence cannot be trusted for lookup."""


def revision_id(manifest: dict) -> str:
    body = {key: value for key, value in manifest.items() if key != "revision_id"}
    encoded = json.dumps(body, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return "address:sha256:" + hashlib.sha256(encoded.encode()).hexdigest()


def read_packet(root: Path = ROOT):
    """Return captured address rows with receipt provenance, or reject the whole packet."""
    manifest = strict_json((root / "address-manifest.json").read_bytes())
    requests = strict_json(REQUESTS.read_bytes())
    if (
        manifest.get("schema_version") != "sr-38.address-packet.v1"
        or manifest.get("licence_url") != LICENCE
        or manifest.get("attribution")
        != "Contains information licensed under the Open Government Licence - City of Victoria."
        or not isinstance(manifest.get("parcel_snapshots"), dict)
        or set(manifest["parcel_snapshots"]) != {"address-59", "address-80", "address-86"}
        or any(
            not re.fullmatch(r"site-(59|80|86)-parcel:sha256:[0-9a-f]{64}", value)
            for value in manifest["parcel_snapshots"].values()
        )
        or manifest.get("revision_id") != revision_id(manifest)
        or not isinstance(manifest.get("sources"), list)
        or len(manifest["sources"]) != len(requests)
    ):
        raise ValueError("invalid address packet manifest")
    expected = {request["id"]: request["url"] for request in requests}
    if len(expected) != 5:
        raise ValueError("invalid bounded address requests")
    decoded = {}
    receipts = {}
    for receipt in manifest["sources"]:
        source_id = receipt.get("source_id")
        url = expected.get(source_id)
        sha = receipt.get("sha256")
        if (
            source_id in receipts
            or not url
            or receipt.get("requested_url") != url
            or receipt.get("resolved_url") != url
            or not isinstance(sha, str)
            or len(sha) != 64
            or receipt.get("object") != sha + ".json"
            or not isinstance(receipt.get("captured_at_utc"), str)
        ):
            raise ValueError("invalid address capture receipt")
        path = root / receipt["object"]
        if path.stat().st_size > 2_000_000:
            raise ValueError("address capture exceeds bound")
        raw = path.read_bytes()
        if len(raw) != receipt.get("byte_count") or hashlib.sha256(raw).hexdigest() != sha:
            raise ValueError("address capture integrity mismatch")
        decoded[source_id] = strict_json(raw)
        receipts[source_id] = receipt
    catalogue = decoded["address-catalogue"]
    metadata = decoded["address-metadata"]
    if (
        catalogue.get("id") != "d638de50c2bb46e3a4c15fefe3756e78"
        or catalogue.get("url") != LAYER
        or "opendata.victoria.ca/pages/open-data-licence" not in catalogue.get("licenseInfo", "")
        or metadata.get("id") != 0
        or metadata.get("geometryType") != "esriGeometryPoint"
        or metadata.get("sourceSpatialReference", {}).get("wkid") != 3157
        or "Query" not in metadata.get("capabilities", "")
    ):
        raise ValueError("address source metadata or licence mismatch")
    names = {f.get("name") for f in metadata.get("fields", [])}
    required = {"OBJECTID", "FullAddress", "GISLINK", "Legal_Type"}
    if not required <= names:
        raise ValueError("address source fields missing")
    rows = []
    for source_id in ("address-59", "address-80", "address-86"):
        receipt = receipts[source_id]
        parameters = parse_qs(urlsplit(receipt["requested_url"]).query)
        key = parameters.get("where", [""])[0]
        if not (key.startswith("GISLINK='") and key.endswith("'")):
            raise ValueError("address query join field changed")
        key = key[len("GISLINK='") : -1]
        response = decoded[source_id]
        if (
            response.get("error")
            or response.get("exceededTransferLimit")
            or response.get("geometryType") != "esriGeometryPoint"
            or response.get("spatialReference", {}).get("wkid") != 3157
            or not isinstance(response.get("features"), list)
            or len(response["features"]) > 100
            or not required <= {f.get("name") for f in response.get("fields", [])}
        ):
            raise ValueError("invalid address feature response")
        seen_ids = set()
        for index, feature in enumerate(response["features"]):
            attrs = feature.get("attributes")
            point = feature.get("geometry")
            if (
                not isinstance(attrs, dict)
                or set(attrs) != names - {"SHAPE"}
                or not isinstance(attrs.get("OBJECTID"), int)
                or attrs["OBJECTID"] in seen_ids
                or not isinstance(attrs.get("FullAddress"), str)
                or not attrs["FullAddress"].strip()
                or not isinstance(attrs.get("Legal_Type"), str)
                or not attrs["Legal_Type"].strip()
                or attrs.get("GISLINK") != key
                or not isinstance(point, dict)
                or not isinstance(point.get("x"), (int, float))
                or not isinstance(point.get("y"), (int, float))
            ):
                raise ValueError("invalid address feature or join key")
            seen_ids.add(attrs["OBJECTID"])
            rows.append(
                (source_id, index, key, attrs["FullAddress"], attrs["Legal_Type"], receipt)
            )
    return manifest["parcel_snapshots"], manifest["revision_id"], tuple(rows)
