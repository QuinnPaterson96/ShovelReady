"""Offline CLI for the shared Pilot preparation diagnostic."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.case_preparations.core import (  # noqa: E402, F401
    ANNOTATIONS,
    MANIFEST,
    diagnose,
    digest,
    read_json,
    render_human,
)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--annotations", type=Path, default=ANNOTATIONS)
    parser.add_argument("--format", choices=("json", "human"), default="human")
    args = parser.parse_args(argv)
    try:
        result = diagnose(args.annotations.read_bytes(), MANIFEST.read_bytes())
    except (ValueError, OSError) as exc:
        print(json.dumps({"status": "input_error", "detail": str(exc)}), file=sys.stderr)
        return 2
    print(
        json.dumps(result, indent=2, sort_keys=True)
        if args.format == "json"
        else render_human(result)
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
