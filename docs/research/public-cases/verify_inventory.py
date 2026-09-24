"""Offline structural checks for SR-23 metadata, never source/legal acceptance."""

import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
USES = {
    "document_extraction_fixture",
    "historical_decision_condition_reference",
    "potential_dimensional_check_requiring_review",
    "discovery_only",
}
HOSTS = {
    "tender.victoria.ca",
    "www.victoria.ca",
    "saanich.ca.granicus.com",
    "vancouver.ca",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError(f"Non-finite JSON value: {value}")


def check_date(value):
    if value is not None:
        require(isinstance(value, str), "Date must be string or null")
        require(date.fromisoformat(value).isoformat() == value, f"Invalid date: {value}")


def check_url(value):
    parsed = urlparse(value)
    require(parsed.scheme == "https" and parsed.hostname in HOSTS, f"Unexpected URL: {value}")
    require(not parsed.username and not parsed.password, "Credentials in URL")


def local_file(value):
    require(isinstance(value, str) and value, "Empty artifact path")
    path = ROOT / value
    require(not Path(value).is_absolute(), "Artifact must be inventory-relative")
    resolved = path.resolve()
    require(resolved.is_relative_to(ROOT), f"Artifact escapes directory: {value}")
    require(resolved.is_file(), f"Missing artifact: {value}")


def check_evidence(node, sources):
    if isinstance(node, dict):
        if "source_id" in node:
            require(node["source_id"] in sources, f"Unknown source: {node['source_id']}")
            require(
                isinstance(node.get("locator"), str) and node["locator"].strip(), "Missing locator"
            )
        for value in node.values():
            check_evidence(value, sources)
    elif isinstance(node, list):
        for value in node:
            check_evidence(value, sources)


def validate(data):
    require(data["schema_version"] == "public-cases.v1", "Unknown schema version")
    require(bool(data["inventory_revision"]), "Missing inventory revision")
    check_date(data["access_date"])
    for artifact in data["local_artifacts"]:
        local_file(artifact)
    sources = data["sources"]
    require(bool(sources), "No sources")
    source_fields = {
        "url",
        "title",
        "kind",
        "access_date",
        "access_method",
        "document_date",
        "date_basis",
        "sha256",
        "byte_length",
        "page_count",
        "local_artifact",
        "inspection",
        "rights_id",
    }
    for sid, source in sources.items():
        require(set(source) == source_fields, f"Source metadata fields: {sid}")
        check_url(source["url"])
        check_date(source["access_date"])
        check_date(source["document_date"])
        for field in ("title", "kind", "access_method", "inspection", "date_basis"):
            require(bool(source[field]), f"Missing {field}: {sid}")
        require(source["rights_id"] in data["rights"], f"Missing rights: {sid}")
        if source["sha256"] is not None:
            require(bool(re.fullmatch(r"[0-9a-f]{64}", source["sha256"])), f"Invalid hash: {sid}")
            require(
                isinstance(source["byte_length"], int) and source["byte_length"] > 0,
                f"Invalid size: {sid}",
            )
        else:
            require(source["byte_length"] is None, f"Unhashed byte size: {sid}")
        if source["page_count"] is not None:
            require(
                isinstance(source["page_count"], int) and source["page_count"] > 0,
                f"Invalid pages: {sid}",
            )
        if source["local_artifact"] is not None:
            local_file(source["local_artifact"])
    for rights in data["rights"].values():
        check_url(rights["evidence_url"])
        check_date(rights["access_date"])
        require(
            all(rights.get(k) for k in ("locator", "summary", "handling")),
            "Incomplete rights metadata",
        )

    ids, identities, groups, sites = set(), set(), set(), set()
    counts = {"total": 0, "pilot_jurisdiction": 0, "transfer_only": 0, "accepted": 0}
    required = {
        "case_id",
        "jurisdiction",
        "scope",
        "public_site_label",
        "official_identifiers",
        "dependency_group",
        "split",
        "review_status",
        "benchmark_eligible",
        "development",
        "prefab",
        "application_date",
        "application_date_evidence",
        "source_facts",
        "official_interpretations",
        "researcher_inferences",
        "plan_version",
        "governing_rules",
        "decision",
        "measurements",
        "test_uses",
        "unsupported",
        "missing_inputs",
        "local_artifacts",
    }
    for case in data["cases"]:
        require(set(case) == required, f"Case fields: {case.get('case_id')}")
        cid = case["case_id"]
        require(bool(re.fullmatch(r"(VIC|SAA|VAN)-PC-\d{3}", cid)), f"Invalid ID: {cid}")
        require(cid not in ids, f"Duplicate ID: {cid}")
        ids.add(cid)
        jurisdiction = case["jurisdiction"]["name"]
        require(
            case["jurisdiction"]["province"] == "BC" and case["jurisdiction"]["country"] == "CA",
            "Wrong geography",
        )
        site = (jurisdiction, case["public_site_label"].casefold())
        require(site not in sites, f"Duplicate site: {cid}")
        sites.add(site)
        require(case["official_identifiers"], f"Missing official identifier: {cid}")
        for identifier in case["official_identifiers"]:
            key = (jurisdiction, identifier)
            require(key not in identities, f"Application split across cases: {identifier}")
            identities.add(key)
        require(case["dependency_group"] == cid and cid not in groups, f"Invalid group: {cid}")
        groups.add(cid)
        require(case["split"] == "unassigned", f"Premature split: {cid}")
        require(
            case["review_status"] == "provisional" and case["benchmark_eligible"] is False,
            f"Acceptance changed: {cid}",
        )
        require(
            case["prefab"]["status"] in {"unknown", "confirmed", "explicitly_non_prefab"},
            "Invalid prefab status",
        )
        if case["prefab"]["status"] != "unknown":
            require(bool(case["prefab"]["evidence"]), "Unsourced prefab status")
        check_date(case["application_date"])
        if case["application_date"] is not None:
            require(bool(case["application_date_evidence"]), "Unsourced application date")
        check_date(case["decision"]["date"])
        require(case["decision"]["evidence"], f"Missing decision-status evidence: {cid}")
        for field in ("issued_development_permit", "issued_building_permit", "as_built_verified"):
            require(case["decision"][field] is None, f"Unsupported verified event: {cid}")
        require(
            case["governing_rules"]["current_applicability"] == "unverified",
            "Current applicability claim",
        )
        require(case["governing_rules"]["effective_date"] is None, "Unverified effective date")
        require(case["development"]["evidence"], f"Unsourced development: {cid}")
        require(case["test_uses"] and set(case["test_uses"]) <= USES, f"Invalid use: {cid}")
        require(
            case["missing_inputs"] and case["unsupported"] and case["researcher_inferences"],
            f"Missing limits/use rationale: {cid}",
        )
        for fact in case["source_facts"] + case["official_interpretations"]:
            require(fact["summary"] and fact["evidence"], f"Unsourced assertion: {cid}")
        for measurement in case["measurements"]:
            for field in (
                "name",
                "original_value",
                "original_unit",
                "measurement_definition",
                "evidence",
            ):
                require(bool(measurement[field]), f"Missing measurement {field}: {cid}")
            require(measurement["review_status"] == "provisional", "Accepted measurement")
            require(measurement["normalized_value"] is None, "Unexpected normalized assertion")
        for artifact in case["local_artifacts"]:
            local_file(artifact)
        require(case["scope"] in {"pilot_jurisdiction", "transfer_only"}, "Unknown scope")
        require(
            (jurisdiction == "City of Victoria") == (case["scope"] == "pilot_jurisdiction"),
            "Transfer/pilot mismatch",
        )
        counts["total"] += 1
        counts[case["scope"]] += 1
        check_evidence(case, sources)
    require(counts == data["counts"], "Counts mismatch")
    require(3 <= len(data["shortlist"]) <= 5, "Shortlist size")
    require(len(set(data["shortlist"])) == len(data["shortlist"]), "Duplicate shortlist entry")
    require(set(data["shortlist"]) <= ids, "Unknown shortlist entry")
    require(data["first_integration_candidate"] in data["shortlist"], "Candidate not shortlisted")
    require(bool(data["split_policy"]), "Missing split policy")
    return counts


if __name__ == "__main__":
    try:
        inventory = json.loads(
            (ROOT / "cases.json").read_text(encoding="utf-8"),
            object_pairs_hook=unique_object,
            parse_constant=reject_constant,
        )
        result = validate(inventory)
    except (ValueError, KeyError, TypeError, OSError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
    print(f"PASS: {result}; metadata integrity only, no legal/source acceptance")
