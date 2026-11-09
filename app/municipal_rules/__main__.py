"""Export the server's presentation catalogue for the bundled frontend."""

import argparse
import json
from pathlib import Path

from .registry import catalogue


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    path = Path(__file__).resolve().parents[2] / "frontend/src/municipal_rules/catalogue.json"
    content = json.dumps(catalogue(), indent=2, ensure_ascii=False) + "\n"
    if args.check:
        if path.read_text(encoding="utf-8") != content:
            raise SystemExit("Municipal catalogue drift; run python -m app.municipal_rules")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
