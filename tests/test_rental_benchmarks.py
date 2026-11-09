"""Import boundary: bad/missing external rent observations must not replace good data."""

import csv
import io
import json
import sys

import pytest

from tools import import_rental_benchmarks as importer


def source_csv(status="", amount="1670", unit="Dollars"):
    out = io.StringIO()
    keys = [
        "REF_DATE",
        "GEO",
        "Estimates",
        "Rental unit type",
        "DGUID",
        "UOM",
        "SCALAR_FACTOR",
        "VALUE",
        "STATUS",
        "VECTOR",
        "SYMBOL",
    ]
    writer = csv.DictWriter(out, keys)
    writer.writeheader()
    writer.writerow(
        dict(
            zip(
                keys,
                [
                    "2026-04",
                    "Victoria, Census metropolitan area (CMA)",
                    "Average asking rent",
                    "Apartment - No bedroom",
                    "victoria",
                    unit,
                    "units",
                    amount,
                    status,
                    "v-example",
                    "",
                ],
                strict=True,
            )
        )
    )
    return out.getvalue()


def test_explicit_csv_import_preserves_unavailable_and_original_source(tmp_path, monkeypatch):
    source = tmp_path / "source.csv"
    target = tmp_path / "active.json"
    source.write_text(source_csv("x", ""), encoding="utf-8")
    monkeypatch.setattr(importer, "OUTPUT", target)
    monkeypatch.setattr(sys, "argv", ["import", "--csv", str(source)])
    importer.main()
    result = json.loads(target.read_text(encoding="utf-8"))
    assert result["records"][0]["monthly_cad"] is None
    assert result["records"][0]["status"] == "x"
    assert result["period"] == "2026-04"
    assert result["records"][0]["vector"] == "v-example"
    assert len(result["source_sha256"]) == 64


def test_rejected_import_keeps_active_bundle_intact(tmp_path, monkeypatch):
    source = tmp_path / "source.csv"
    target = tmp_path / "active.json"
    target.write_text('{"previous": "retained"}', encoding="utf-8")
    source.write_text(source_csv(unit="Percent"), encoding="utf-8")
    monkeypatch.setattr(importer, "OUTPUT", target)
    monkeypatch.setattr(sys, "argv", ["import", "--csv", str(source)])
    with pytest.raises(ValueError, match="incompatible"):
        importer.main()
    assert json.loads(target.read_text(encoding="utf-8")) == {"previous": "retained"}
