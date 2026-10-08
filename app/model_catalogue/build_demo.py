"""Explicitly export structurally valid, unreviewed demo observations; no publication."""

import argparse
import json
from pathlib import Path

from app.model_catalogue.research_intake import validate_candidate

ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "docs/demo-data/prefab/candidate-input.json"
OUTPUT = ROOT / "frontend/src/model_catalogue/demo-catalogue.json"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    candidate, _ = validate_candidate(json.loads(INPUT.read_text(encoding="utf-8")))
    content = json.dumps(candidate.model_dump(mode="json"), indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if OUTPUT.read_text(encoding="utf-8") != content:
            parser.exit(1, "unreviewed demo export differs; run build_demo explicitly\n")
    else:
        OUTPUT.write_text(content, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
