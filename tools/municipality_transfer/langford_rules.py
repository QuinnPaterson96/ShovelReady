"""Offline, manual Langford candidate mapping; never accepts or publishes rules."""

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

from app.contracts.common import Evidence, Quantity
from app.contracts.rules import Applicability, RuleContent, RuleReference, ScalarBound

PACKET = Path("docs/municipality-transfer/langford/rules/packet.json")
VERSION = "sr-45.langford.manual.v1"


def validate_packet(packet: dict) -> dict:
    if packet["packet_schema"] != VERSION or packet["status"] != "unreviewed_manual_candidate_only":
        raise ValueError("unexpected packet version or review status")
    if packet["source_bytes_retained"] or packet["source_sha256"] is not None:
        raise ValueError("this packet must not imply a retained official source snapshot")
    sources = {source["id"]: source for source in packet["sources"]}
    if len(sources) != len(packet["sources"]):
        raise ValueError("duplicate source ID")
    if any(source["effective_from"] is not None for source in sources.values()):
        raise ValueError("effective dates need independently checked evidence")
    mapped = []
    for row in packet["candidates"]:
        if row["source_id"] not in sources:
            raise ValueError(f"unknown source for {row['logical_id']}")
        if row["mapping"] not in {"scalar_shape_only", "unresolved_measurement"}:
            raise ValueError("unsupported mapping classification")
        if not row["dependency"] or not row["short_quote"] or not row["locator"]:
            raise ValueError("missing evidence or dependency")
        quantity = Quantity.model_validate(
            {
                "original_text": f"{row['value']} {row['unit']}",
                "original_value": row["value"],
                "original_unit": row["unit"],
                "dimension": row["dimension"],
                "value": row["value"],
                "unit": row["unit"],
            }
        )
        content = RuleContent(
            pathway_id=packet["pathway_id"],
            alternative_id=packet["alternative_id"],
            text=f"{row['subject']} {row['operator']} {row['value']} {row['unit']}",
            evidence=(
                Evidence(
                    snapshot_id=row["source_id"],
                    locator=row["locator"],
                    excerpt=row["short_quote"],
                    context=row["context"],
                ),
            ),
            applicability=Applicability(
                jurisdiction="City of Langford, BC",
                use="garden suite",
                building_role="detached accessory dwelling, ground floor",
                conditions=(packet["scope"], row["dependency"]),
                exceptions=("Part 6 may alter general rules",),
                status="unresolved",
            ),
            approval="unknown",
            semantics=ScalarBound(
                kind="scalar_bound",
                subject=row["subject"],
                measurement_definition=row["measurement_definition"],
                operator=row["operator"],
                threshold=quantity,
            ),
            runtime_support="unresolved",
            references=(
                RuleReference(
                    instrument="Langford Zoning Bylaw No. 300",
                    locator=row["dependency"],
                    relationship="depends_on",
                    status="unresolved",
                    target=None,
                ),
            ),
        )
        mapped.append(
            {
                "logical_id": row["logical_id"],
                "candidate_revision_id": row["candidate_revision_id"],
                "mapping": row["mapping"],
                "content": content.model_dump(mode="json"),
            }
        )
    if len({item["logical_id"] for item in mapped}) != len(mapped):
        raise ValueError("duplicate logical ID")
    return {
        "packet_schema": VERSION,
        "status": "validated_candidate_shapes_only",
        "accepted_rule_revisions": 0,
        "published_releases": 0,
        "runtime_evaluable": 0,
        "mapped": mapped,
    }


def verify_part3_pdf(packet: dict, pdf: Path) -> dict:
    """Check cited snippets against supplied official bytes, without retaining them."""
    data = pdf.read_bytes()
    if not data.startswith(b"%PDF-"):
        raise ValueError("supplied source is not a PDF")
    checked = []
    for row in packet["candidates"]:
        if row["source_id"] != "langford-300-part-3-2026-07-20":
            continue
        match = re.search(r"PDF page index (\d+)", row["locator"])
        if match is None:
            raise ValueError("citation lacks PDF page index")
        page = int(match.group(1)) + 1
        result = subprocess.run(
            ["pdftotext", "-f", str(page), "-l", str(page), "-layout", str(pdf), "-"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=True,
        )
        def normalize(value):
            return " ".join(value.casefold().split())

        if normalize(row["short_quote"]) not in normalize(result.stdout):
            raise ValueError(f"source excerpt mismatch: {row['logical_id']}")
        checked.append(row["logical_id"])
    return {
        "source_span_status": "excerpt_match_only",
        "sha256_of_supplied_pdf": hashlib.sha256(data).hexdigest(),
        "checked": checked,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packet", type=Path, default=PACKET)
    parser.add_argument("--part3-pdf", type=Path, help="optional unaltered official Part 3 PDF")
    args = parser.parse_args()
    packet = json.loads(args.packet.read_text(encoding="utf-8"))
    report = validate_packet(packet)
    if args.part3_pdf:
        report["source_check"] = verify_part3_pdf(packet, args.part3_pdf)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
