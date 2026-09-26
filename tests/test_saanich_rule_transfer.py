"""Offline source-candidate mapping guards; these are not legal accuracy tests."""

import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from tools.municipality_transfer.saanich_rules import map_packet

PACKET = Path("docs/municipality-transfer/saanich/rules/candidates.json")


def packet():
    return json.loads(PACKET.read_text(encoding="utf-8"))


def test_candidates_validate_without_promotion():
    mapped = map_packet(packet())
    assert len(mapped) == 5
    assert [x["content"]["semantics"]["kind"] for x in mapped] == [
        "scalar_bound",
        "scalar_bound",
        "scalar_bound",
        "scalar_bound",
        "unresolved",
    ]
    assert all(x["review_status"] == "unreviewed" for x in mapped)
    assert all(x["content"]["runtime_support"] == "unresolved" for x in mapped)
    assert all(x["content"]["approval"] == "unknown" for x in mapped)
    assert (
        mapped[3]["content"]["semantics"]["threshold"]["basis"]["denominator"] == "area of the lot"
    )
    assert mapped[4]["content"]["semantics"]["reason"].startswith("ScalarBound alone")


def test_incompatible_ratio_basis_is_rejected():
    changed = copy.deepcopy(packet())
    changed["checks"][3]["quantity"]["basis"] = None
    with pytest.raises(ValidationError):
        map_packet(changed)


def test_review_promotion_and_duplicate_identity_are_rejected():
    changed = copy.deepcopy(packet())
    changed["checks"][0]["review_status"] = "accepted"
    with pytest.raises(ValueError, match="unreviewed"):
        map_packet(changed)
    changed = copy.deepcopy(packet())
    changed["checks"][1]["identity"] = changed["checks"][0]["identity"]
    with pytest.raises(ValueError, match="duplicate"):
        map_packet(changed)
