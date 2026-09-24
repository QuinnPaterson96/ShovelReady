"""Pilot-only raw HTTP capture; no application imports or SR-04 contracts.

Run with an output directory outside the checkout. Nothing is published to Git.
The request list is an acquisition notebook, not an ingestion boundary payload.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import urllib.request


def capture(source, destination, fetch=None):
    """Validate a response before retaining immutable bytes and a capture receipt."""
    if fetch is None:
        def fetch(url):
            with urllib.request.urlopen(url, timeout=60) as response:
                return response.read(), response.geturl(), dict(response.headers)
    data, resolved_url, headers = fetch(source["url"])
    if source["format"] == "json":
        parsed = json.loads(data)
        if isinstance(parsed, dict) and "error" in parsed:
            raise ValueError("Service returned an error payload")
    elif source["format"] == "pdf" and not data.startswith(b"%PDF-"):
        raise ValueError("Expected PDF bytes")
    elif source["format"] == "png" and not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Expected PNG bytes")
    if not data:
        raise ValueError("Empty response")
    digest = hashlib.sha256(data).hexdigest()
    relative = f"objects/{digest}.{source['format']}"
    target = destination / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if target.read_bytes() != data:
            raise ValueError("Existing object does not match its hash")
    else:
        with target.open("xb") as stream:
            stream.write(data)
    lower = {k.lower(): v for k, v in headers.items()}
    receipt = {
        "source_id": source["id"], "requested_url": source["url"],
        "resolved_url": resolved_url,
        "captured_at_utc": datetime.now(timezone.utc).isoformat(),
        "sha256": digest, "byte_count": len(data), "object": relative,
        "http_metadata": {k: lower.get(k) for k in
                          ("content-type", "last-modified", "etag", "date")},
    }
    with (destination / "receipts.jsonl").open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(receipt) + "\n")
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("requests", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    destination = args.destination.resolve()
    if destination == root or root in destination.parents:
        parser.error("Capture destination must be outside the checkout")
    destination.mkdir(parents=True, exist_ok=True)
    failed = False
    for source in json.loads(args.requests.read_text(encoding="utf-8")):
        try:
            receipt = capture(source, destination)
            print(f"{source['id']}: {receipt['sha256']}")
        except Exception as exc:
            # No response bodies, credentials, or query values in diagnostics.
            print(f"{source['id']}: capture failed ({type(exc).__name__})")
            failed = True
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
