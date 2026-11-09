"""Explicit offline/import command; never fetches during app startup or CI.

Usage: python tools/import_rental_benchmarks.py [--csv downloaded.csv]
Only quarterly apartment asking-rent observations are projected. Blank and
suppressed values remain null. Write only after the entire candidate validates.
"""

import argparse
import csv
import hashlib
import io
import json
from datetime import UTC, datetime
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend/src/rental_scenario/benchmarks.json"
TYPES = {
    "Apartment - No bedroom": 0,
    "Apartment - 1 bedroom": 1,
    "Apartment - 2 bedrooms": 2,
    "Apartment - 3 or more bedrooms": 3,
}


def project(raw: bytes) -> dict:
    rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
    period = max(row["REF_DATE"] for row in rows)
    selected = [
        r
        for r in rows
        if r["REF_DATE"] == period
        and r["Estimates"] == "Average asking rent"
        and r["Rental unit type"] in TYPES
        and r["GEO"].endswith(", Census metropolitan area (CMA)")
    ]
    records = []
    seen = set()
    for row in selected:
        key = (row["DGUID"], TYPES[row["Rental unit type"]])
        if key in seen or row["UOM"] != "Dollars" or row["SCALAR_FACTOR"] != "units":
            raise ValueError("Duplicate or incompatible rental observation")
        seen.add(key)
        # A missing/suppressed value cannot become a usable zero-rent default.
        value = (
            float(row["VALUE"])
            if row["VALUE"] and row["STATUS"] not in {"x", "..", "...", "F"}
            else None
        )
        if value is not None and not 0 < value < 100000:
            raise ValueError("Invalid asking rent")
        records.append(
            {
                "market_id": row["DGUID"],
                "market": row["GEO"],
                "bedrooms": key[1],
                "monthly_cad": value,
                "vector": row["VECTOR"],
                "status": row["STATUS"],
                "symbol": row["SYMBOL"],
            }
        )
    if not records:
        raise ValueError("No apartment asking-rent observations")
    return {
        "schema_version": "rental-benchmarks.v1",
        "provider": "Statistics Canada",
        "table": "46-10-0092-01",
        "period": period,
        "captured_at": datetime.now(UTC).isoformat(),
        "source_url": "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=4610009201",
        "licence_url": "https://www.statcan.gc.ca/en/terms-conditions/open-licence",
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "review_status": "unreviewed",
        "measure": "Average monthly asking rent",
        "currency": "CAD",
        "records": sorted(records, key=lambda r: (r["market"], r["bedrooms"])),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path)
    args = parser.parse_args()
    if args.csv:
        raw = args.csv.read_bytes()
    else:
        with urlopen(
            "https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/46100092/en",
            timeout=30,
        ) as response:
            url = json.load(response)["object"]
        if url != "https://www150.statcan.gc.ca/n1/tbl/csv/46100092-eng.zip":
            raise ValueError("Unexpected download location; review before importing")
        with urlopen(url, timeout=30) as response:
            raw = ZipFile(io.BytesIO(response.read())).read("46100092.csv")
    candidate = project(raw)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".tmp")
    temporary.write_text(json.dumps(candidate, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(f"Imported {len(candidate['records'])} observations for {candidate['period']}")


if __name__ == "__main__":
    main()
