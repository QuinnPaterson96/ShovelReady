"""Offline, candidate-only Saanich RuleContent mapping; no publication or evaluator call."""

import argparse
import json
from pathlib import Path

from app.contracts.rules import RuleContent


def map_packet(packet: dict) -> list[dict]:
    if packet.get("schema_version") != "sr-43.saanich-candidates.v1":
        raise ValueError("unsupported packet version")
    snapshot = packet["source"]["snapshot_id"]
    seen = set()
    mapped = []
    for row in packet["checks"]:
        logical_id = row["identity"]["logical_id"]
        if logical_id in seen:
            raise ValueError(f"duplicate logical rule: {logical_id}")
        seen.add(logical_id)
        if row["review_status"] != "unreviewed":
            raise ValueError("this command only maps unreviewed candidates")
        evidence = {
            "snapshot_id": snapshot,
            "locator": row["locator"],
            "page_index": row["page_index"],
            "printed_page": row["printed_page"],
            "excerpt": row["excerpt"],
            "context": row["context"],
        }
        common = {
            "pathway_id": packet["pathway_id"],
            "alternative_id": "single-family-garden-suite",
            "text": row["interpretation"],
            "evidence": [evidence],
            "applicability": {
                "jurisdiction": "District of Saanich",
                "use": "Garden Suite",
                "building_role": "detached accessory dwelling on lot with single family dwelling",
                "conditions": packet["pathway_conditions"],
                "exceptions": row.get("exceptions", []),
                "status": "unresolved",
            },
            "approval": "unknown",
            "runtime_support": "unresolved",
            "references": [
                {
                    "instrument": ref["instrument"],
                    "locator": ref["locator"],
                    "relationship": ref["relationship"],
                    "status": "unresolved",
                    "target": None,
                }
                for ref in row.get("dependencies", [])
            ],
        }
        if row["mapping"] == "scalar_candidate":
            common["semantics"] = {
                "kind": "scalar_bound",
                "subject": row["subject"],
                "measurement_definition": row["measurement_definition"],
                "operator": row["operator"],
                "threshold": row["quantity"],
            }
        elif row["mapping"] == "unresolved":
            common["semantics"] = {
                "kind": "unresolved",
                "text": row["interpretation"],
                "reason": row["blocker"],
            }
        else:
            raise ValueError(f"unsupported mapping: {row['mapping']}")
        content = RuleContent.model_validate(common)
        mapped.append(
            {
                "identity": row["identity"],
                "mapping": row["mapping"],
                "review_status": row["review_status"],
                "field_origins": row["field_origins"],
                "source_url": packet["source"]["url"],
                "captured_on": packet["source"]["captured_on"],
                "content": content.model_dump(mode="json"),
            }
        )
    return mapped


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packet", type=Path)
    args = parser.parse_args()
    packet = json.loads(args.packet.read_text(encoding="utf-8"))
    print(
        json.dumps(
            {"schema_version": "sr-43.mapping.v1", "candidates": map_packet(packet)}, indent=2
        )
    )


if __name__ == "__main__":
    main()
