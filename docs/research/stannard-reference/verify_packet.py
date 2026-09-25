"""Offline provenance/guard checks; does not verify source truth or call the evaluator."""

import copy
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(data, inventory):
    require(data["schema_version"] == "stannard-reference.v1", "schema version")
    require(data["case_id"] == data["dependency_group"] == "VIC-PC-001", "case identity")
    case = next(c for c in inventory["cases"] if c["case_id"] == data["case_id"])
    require(data["official_identifiers"] == case["official_identifiers"], "permit identity")
    require(data["historical_cutoff"] == "2023-10-12", "historical cutoff")
    date.fromisoformat(data["access_date"])
    require(data["review_status"] == "provisional", "review status")
    require(data["benchmark_eligible"] is False, "benchmark promotion")
    require(data["accepted_revisions"] == [], "accepted revisions")
    require(data["rights"]["durable_source_retention_authorized"] is False, "rights")
    require("height/grade holdout" in data["scope_exclusions"], "holdout exclusion")
    sources = data["sources"]
    require(data["rights"]["source_id"] in sources, "rights provenance")
    original = inventory["sources"]["REZ00787-9"]
    for key in ("url", "sha256", "byte_length", "page_count"):
        require(sources["plan"][key] == original[key], "historical plan " + key)
    require(sources["later"]["sha256"] != sources["plan"]["sha256"], "revision conflation")
    for source in sources.values():
        parsed = urlparse(source["url"])
        require(parsed.scheme == "https", "source scheme")
        require(parsed.hostname in {
            "www.victoria.ca", "tender.victoria.ca", "pub-victoria.escribemeetings.com"
        }, "primary-source host")
        for key in ("title", "version", "inspection", "kind", "access"):
            require(isinstance(source[key], str) and source[key].strip(), "source " + key)
        date.fromisoformat(source["access_date"])
        require(source["retained_in_git"] is False, "source retention")
        if source["sha256"] is not None:
            require(re.fullmatch(r"[a-f0-9]{64}", source["sha256"]), "hash format")
            require(type(source["byte_length"]) is int and source["byte_length"] > 0,
                    "byte length")
            require(type(source["page_count"]) is int and source["page_count"] > 0,
                    "page count")
        else:
            require(source["byte_length"] is None and source["page_count"] is None,
                    "unverified byte metadata")
    ids = set()
    for item in data["claims"] + data["checks"]:
        require(item["id"] not in ids, "duplicate assertion")
        ids.add(item["id"])
        require(item["review_status"] == "provisional", "assertion review")
        require(item["evidence"], "missing evidence")
        for evidence in item["evidence"]:
            require(evidence["source_id"] in sources, "dangling source")
            require(isinstance(evidence["locator"], str) and evidence["locator"].strip(),
                    "missing locator")
            page = evidence["page"]
            if page is not None:
                count = sources[evidence["source_id"]]["page_count"]
                require(type(page) is int and count is not None and 1 <= page <= count,
                        "page outside inspected source")
    for claim in data["claims"]:
        require(claim["kind"] in {
            "transcription", "official_record_summary", "researcher_interpretation"
        }, "assertion type")
        require(isinstance(claim["summary"], str) and claim["summary"].strip(), "summary")
    require({c["id"] for c in data["checks"]} == {"separation", "floor-area"}, "check scope")
    for check in data["checks"]:
        require(check["plan_source_id"] == "plan", "historical check revision")
        require(check["assertion_type"] == "proposed_transcription_assertion", "check type")
        require(check["evaluator_ready"] is False, "evaluator promotion")
        require(check["governing_bound_accepted"] is False, "rule promotion")
        require(check["expected_evaluation"] is None, "manufactured outcome")
        require(check["normalized_value"] is None, "premature normalization")
        require(len(check["blockers"]) > 0, "missing blockers")
        require(check["building_roles"] == ["historical_accessory_dwelling", "existing_duplex"],
                "building-role binding")
        require(check["original_unit"] in {"m", "m2"}, "unit")
        for value in check["original_values"].values():
            require(isinstance(value, str) and re.fullmatch(r"\d+\.\d+", value),
                    "preserve original decimal strings")
    for artifact in data["artifacts"]:
        require(Path(artifact).name == artifact and (ROOT / artifact).is_file(), "artifact")
    return True


def main():
    data = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    inventory = json.loads((ROOT.parent / "public-cases/cases.json").read_text(encoding="utf-8"))
    validate(data, inventory)
    # Mutation checks exercise the main risks, not a second source-truth oracle.
    mutations = [
        lambda d: d["claims"][0]["evidence"][0].update(source_id="absent"),
        lambda d: d["claims"][0]["evidence"][0].update(page=7),
        lambda d: d.update(benchmark_eligible=True),
        lambda d: d["checks"][0].update(evaluator_ready=True),
        lambda d: d["checks"][0].update(plan_source_id="later"),
        lambda d: d["sources"]["plan"].update(sha256="0" * 64),
        lambda d: d["official_identifiers"].append("unrelated"),
        lambda d: d["checks"][0]["original_values"].update(proposed=28.5),
    ]
    for mutate in mutations:
        changed = copy.deepcopy(data)
        mutate(changed)
        try:
            validate(changed, inventory)
        except ValueError:
            continue
        raise AssertionError("unsafe mutation accepted")
    # Reject accidental source-byte additions without examining other owned work.
    require(all(p.suffix in {".md", ".json", ".py"} for p in ROOT.iterdir() if p.is_file()),
            "unexpected retained artifact")
    for document in ROOT.glob("*.md"):
        for target in re.findall(r"\]\(([^)]+)\)", document.read_text(encoding="utf-8")):
            if "://" not in target:
                require((ROOT / target.split("#")[0]).exists(), "broken local link: " + target)
    print(f"PASS: {len(data['sources'])} sources, {len(data['claims'])} claims, "
          f"2 provisional checks; {len(mutations)} unsafe mutations rejected; local links valid")
    print("Offline metadata validation only; no legal/source acceptance or evaluation.")


if __name__ == "__main__":
    main()
