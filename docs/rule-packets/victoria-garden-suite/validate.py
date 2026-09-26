"""Offline structural and optional original-PDF replay for SR-39 candidates."""

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from app.contracts.common import SourceSnapshot
from app.contracts.rules import RuleContent

HERE = Path(__file__).resolve().parent


def normalized(value: str) -> str:
    return re.sub(r"\s+", " ", value).casefold().strip()


def validate_packet(packet: dict, pdf: Path | None = None) -> dict:
    issues: list[str] = []
    if not isinstance(packet, dict):
        return {"state": "invalid_packet", "issues": ["packet_must_be_object"]}
    if set(packet) != {"schema_version", "source", "scope", "candidates"}:
        issues.append("packet_shape_invalid")
    if packet.get("schema_version") != "sr-39.packet.v1":
        issues.append("packet_version_invalid")
    try:
        source = SourceSnapshot.model_validate(packet["source"])
    except (KeyError, ValidationError) as exc:
        return {"state": "invalid_packet", "issues": [*issues, f"source_invalid: {exc}"]}
    if source.review.status != "unreviewed" or source.effective_from is not None:
        issues.append("source_must_remain_unreviewed_with_unknown_effective_date")
    if source.snapshot_id != f"{source.source_id}:sha256:{source.artifact.sha256}":
        issues.append("source_snapshot_identity_mismatch")
    if not isinstance(packet.get("scope"), str) or not packet["scope"].strip():
        issues.append("scope_missing")
    if not isinstance(packet.get("candidates"), list):
        return {"state": "invalid_packet", "issues": [*issues, "candidates_must_be_array"]}
    seen: set[str] = set()
    for item in packet["candidates"]:
        expected = {
            "logical_rule_id", "proposed_revision_id", "locator", "excerpt", "content", "blockers"
        }
        if not isinstance(item, dict) or set(item) != expected:
            issues.append("candidate_shape_invalid")
            continue
        if any(not isinstance(item[key], str) or not item[key].strip() for key in (
            "logical_rule_id", "proposed_revision_id", "locator", "excerpt"
        )) or not isinstance(item["blockers"], list):
            issues.append("candidate_fields_invalid")
            continue
        identity = item["logical_rule_id"] + "@" + item["proposed_revision_id"]
        if identity in seen:
            issues.append(f"{identity}: duplicate_identity")
        seen.add(identity)
        try:
            content = RuleContent.model_validate(item["content"])
        except ValidationError as exc:
            issues.append(f"{identity}: content_invalid: {exc}")
            continue
        evidence = content.evidence
        if len(evidence) != 1 or evidence[0].snapshot_id != source.snapshot_id:
            issues.append(f"{identity}: source_evidence_mismatch")
        if evidence and (
            evidence[0].locator != item["locator"] or evidence[0].excerpt != item["excerpt"]
        ):
            issues.append(f"{identity}: locator_or_excerpt_mismatch")
        if content.runtime_support != "unresolved" or content.applicability.status != "unresolved":
            issues.append(f"{identity}: premature_runtime_or_scope_support")
        if content.approval != "unknown" or not item["blockers"]:
            issues.append(f"{identity}: missing_approval_or_blockers")
        if content.semantics.kind != "scalar_bound":
            issues.append(f"{identity}: expected_scalar_bound")
        elif normalized(content.semantics.threshold.original_text) not in normalized(
            item["excerpt"]
        ):
            issues.append(f"{identity}: threshold_absent_from_excerpt")
        if (
            item["logical_rule_id"].endswith("rear-yard-occupancy")
            and content.semantics.kind == "scalar_bound"
        ):
            basis = content.semantics.threshold.basis
            if basis is None or basis.denominator != "legally defined rear-yard area":
                issues.append(f"{identity}: rear_yard_basis_required")
    if issues:
        return {"state": "invalid_packet", "issues": issues}
    if pdf is None:
        return {
            "state": "source_unavailable",
            "issues": [
                "Pass --pdf with the privately retained official PDF for source-span replay."
            ],
            "candidate_count": len(seen),
        }
    try:
        raw = pdf.read_bytes()
    except OSError as exc:
        return {"state": "capture_failed", "issues": [f"pdf_read_failed: {exc}"]}
    if hashlib.sha256(raw).hexdigest() != source.artifact.sha256:
        return {"state": "capture_mismatch", "issues": ["pdf_sha256_differs_from_pinned_snapshot"]}
    for item in packet["candidates"]:
        page = item["content"]["evidence"][0]["page_index"] + 1
        try:
            result = subprocess.run(
                ["pdftotext", "-f", str(page), "-l", str(page), "-layout", str(pdf), "-"],
                check=True, capture_output=True, text=True, timeout=30,
            )
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            return {"state": "capture_failed", "issues": [f"pdf_text_failed: {exc}"]}
        if normalized(item["excerpt"]) not in normalized(result.stdout):
            issues.append(f"{item['logical_rule_id']}: excerpt_not_on_cited_page")
    return {
        "state": "source_span_verified" if not issues else "source_span_mismatch",
        "issues": issues,
        "candidate_count": len(seen),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packet", type=Path, default=HERE / "packet.json")
    parser.add_argument("--pdf", type=Path)
    args = parser.parse_args()
    try:
        result = validate_packet(json.loads(args.packet.read_text(encoding="utf-8")), args.pdf)
    except (OSError, ValueError) as exc:
        result = {"state": "invalid_packet", "issues": [str(exc)]}
    print(json.dumps(result, indent=2))
    return 0 if result["state"] == "source_span_verified" else 2


if __name__ == "__main__":
    sys.exit(main())
