"""Explicit offline preparation or database import; never migrates or publishes."""

import argparse
import os
from pathlib import Path

from app.persistence import Repository, connect

from .importer import ROOT, prepare


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, help="write the unreviewed spatial payload")
    parser.add_argument("--import-records", action="store_true")
    args = parser.parse_args()
    sources, result = prepare(args.root)
    if args.import_records:
        url = os.environ.get("SHOVELREADY_DATABASE_URL")
        if not url:
            parser.error("set SHOVELREADY_DATABASE_URL explicitly; no legacy fallback")
        engine = connect(url)
        try:
            Repository(engine).import_records([*sources, result])
        finally:
            engine.dispose()
    if args.output:
        args.output.write_text(result.model_dump_json(indent=2) + "\n", encoding="utf-8")
    print(
        f"{result.identity.revision_id}: {len(sources)} sources, "
        f"{len(result.observations)} responses, {len(result.features)} feature observations; "
        f"{'imported' if args.import_records else 'prepared only'}; unreviewed"
    )
    for parcel in result.parcels:
        print(
            f"{parcel.parcel_snapshot_id.split(':')[0]}: "
            f"{len(parcel.intersections)} contacts; "
            f"uncovered m2={parcel.uncovered_area_m2}; needs investigation"
        )


if __name__ == "__main__":
    main()
