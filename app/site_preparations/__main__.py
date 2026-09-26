"""Explicitly validate or import a bounded City address capture; no network or DB writes."""

import argparse
import json
import os
import shutil
import tempfile
from pathlib import Path

from app.spatial.importer import prepare, strict_json

from .address_packet import LICENCE, ROOT, read_packet, revision_id

ATTRIBUTION = "Contains information licensed under the Open Government Licence - City of Victoria."


def import_capture(capture: Path, target: Path = ROOT) -> None:
    """Promote a complete capture atomically after checks against the spatial packet."""
    lines = (capture / "receipts.jsonl").read_bytes().splitlines()
    if len(lines) != 5:
        raise ValueError("expected exactly five address capture receipts")
    receipts = [strict_json(line) for line in lines]
    revision = prepare()[1].identity.revision_id
    target.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=target) as temporary:
        staged = Path(temporary)
        for receipt in receipts:
            sha = receipt.get("sha256")
            if not isinstance(sha, str) or len(sha) != 64:
                raise ValueError("invalid capture digest")
            object_name = sha + ".json"
            if receipt.get("object") != "objects/" + object_name:
                raise ValueError("unexpected capture object")
            shutil.copyfile(capture / "objects" / object_name, staged / object_name)
            receipt["object"] = object_name
        manifest = {
            "schema_version": "sr-38.address-packet.v1",
            "spatial_revision": revision,
            "licence_url": LICENCE,
            "attribution": ATTRIBUTION,
            "sources": receipts,
        }
        manifest["revision_id"] = revision_id(manifest)
        (staged / "address-manifest.json").write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
        )
        read_packet(staged)
        for receipt in receipts:
            name = receipt["object"]
            destination = target / name
            if destination.exists() and destination.read_bytes() != (staged / name).read_bytes():
                raise ValueError("immutable address object conflict")
        for receipt in receipts:
            destination = target / receipt["object"]
            if not destination.exists():
                shutil.copyfile(staged / receipt["object"], destination)
        os.replace(staged / "address-manifest.json", target / "address-manifest.json")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--import-capture", type=Path)
    args = parser.parse_args()
    if args.check == bool(args.import_capture):
        parser.error("choose exactly one of --check or --import-capture")
    if args.import_capture:
        import_capture(args.import_capture)
    revision, address_revision, rows = read_packet()
    if revision != prepare()[1].identity.revision_id:
        raise SystemExit("address capture does not match current spatial packet")
    print(f"{revision}; {address_revision}: {len(rows)} retained address rows; unreviewed")


if __name__ == "__main__":
    main()
