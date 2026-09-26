"""Offline SR-39 packet controls; no source download or database use in CI."""

import copy
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "docs" / "rule-packets" / "victoria-garden-suite"
SPEC = importlib.util.spec_from_file_location("sr39_validate", DIR / "validate.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def packet():
    return json.loads((DIR / "packet.json").read_text(encoding="utf-8"))


def test_packet_requires_original_for_source_span_claim():
    result = MODULE.validate_packet(packet())
    assert result["state"] == "source_unavailable"
    assert result["candidate_count"] == 4


def test_wrong_pinned_capture_is_distinct_from_source_ambiguity(tmp_path):
    fake = tmp_path / "wrong.pdf"
    fake.write_bytes(b"%PDF-1.7\nnot the pinned City PDF")
    result = MODULE.validate_packet(packet(), fake)
    assert result == {
        "state": "capture_mismatch",
        "issues": ["pdf_sha256_differs_from_pinned_snapshot"],
    }


def test_rear_yard_ratio_cannot_use_parcel_area():
    changed = copy.deepcopy(packet())
    ratio = changed["candidates"][-1]["content"]["semantics"]["threshold"]["basis"]
    ratio["denominator"] = "whole parcel area"
    result = MODULE.validate_packet(changed)
    assert result["state"] == "invalid_packet"
    assert any("rear_yard_basis_required" in issue for issue in result["issues"])


def test_reviewer_state_cannot_be_promoted_by_packet_edit():
    changed = copy.deepcopy(packet())
    changed["source"]["review"]["status"] = "accepted"
    result = MODULE.validate_packet(changed)
    assert result["state"] == "invalid_packet"
