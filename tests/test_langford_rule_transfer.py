"""Conservative offline checks for the official-clause manual candidate packet."""

import copy
import json
from pathlib import Path

import pytest

from tools.municipality_transfer.langford_rules import validate_packet

PACKET = Path("docs/municipality-transfer/langford/rules/packet.json")


def packet():
    return json.loads(PACKET.read_text(encoding="utf-8"))


def test_actual_cited_candidates_map_without_claiming_review_or_publication():
    report = validate_packet(packet())
    assert len(report["mapped"]) == 5
    assert report["runtime_evaluable"] == 0
    assert report["accepted_rule_revisions"] == 0
    assert report["published_releases"] == 0
    for item in report["mapped"]:
        content = item["content"]
        assert content["runtime_support"] == "unresolved"
        assert content["applicability"]["status"] == "unresolved"
        assert content["references"][0]["status"] == "unresolved"
    area = report["mapped"][0]["content"]["semantics"]
    assert (area["operator"], area["threshold"]["value"]) == (">", "400")
    assert report["mapped"][3]["mapping"] == "unresolved_measurement"


def test_unknown_source_is_rejected():
    bad = copy.deepcopy(packet())
    bad["candidates"][0]["source_id"] = "missing"
    with pytest.raises(ValueError, match="unknown source"):
        validate_packet(bad)


def test_cannot_add_unsupported_effective_date_or_source_hash():
    bad = copy.deepcopy(packet())
    bad["sources"][0]["effective_from"] = "2026-07-20"
    with pytest.raises(ValueError, match="effective dates"):
        validate_packet(bad)
    bad = copy.deepcopy(packet())
    bad["source_sha256"] = "0" * 64
    with pytest.raises(ValueError, match="retained official source"):
        validate_packet(bad)
