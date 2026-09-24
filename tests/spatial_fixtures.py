"""Synthetic mutations of observed bytes, repinned explicitly; never original Victoria facts."""

import hashlib
import json
import runpy
import shutil

from app.spatial.importer import ROOT


def changed_packet(tmp_path, change, source_id="site-59-parcel"):
    root = tmp_path / "synthetic-packet"
    shutil.copytree(ROOT, root)
    packet_path = root / "intake-packet.json"
    packet = json.loads(packet_path.read_bytes())
    source = next(s for s in packet["sources"] if s["capture"]["source_id"] == source_id)
    raw = json.loads((root / source["capture"]["repository_path"]).read_bytes())
    change(raw)
    data = (json.dumps(raw) + "\n").encode()
    sha = hashlib.sha256(data).hexdigest()
    capture = source["capture"]
    capture.update(
        sha256=sha,
        byte_count=len(data),
        repository_path=f"snapshots/{sha}.json",
        object=f"objects/{sha}.json",
    )
    (root / capture["repository_path"]).write_bytes(data)
    intake = runpy.run_path(str(ROOT / "intake.py"))
    mapped = intake["map_source"](intake["Capture"].model_validate(capture), root, None)
    source.update(mapped.model_dump(mode="json"))
    sample = next(s for s in packet["spatial_samples"] if s["source_id"] == source_id)
    sample.update(
        snapshot_id=mapped.snapshot_id,
        artifact=mapped.snapshot.artifact.model_dump(),
        feature_ids=[f["attributes"]["OBJECTID"] for f in raw["features"]],
    )
    packet_path.write_text(json.dumps(packet), encoding="utf-8")
    return root
