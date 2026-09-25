"""Offline SR-30 review replay. Shared cases/runs/findings remain SR-27 records.

No model, browser, network, database or issue publication. Evidence verification is
an attributed reviewer assertion, not an automatic claim of source correctness.
"""

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Annotated, Literal

from pydantic import AwareDatetime, Field, model_validator

from scripts.virtual_qa.contracts import (
    CaseDefinition,
    CasePin,
    Finding,
    Metadata,
    Record,
    Reference,
    Rubric,
    RunRecord,
    Text,
    validate_links,
)

Status = Literal["supported", "partial", "unsupported", "not_attempted", "unassessable"]
STATUSES = ("supported", "partial", "unsupported", "not_attempted", "unassessable")


class FrozenScoring(Record):
    """Separately supplied rubric plus optional pre-dispatch critical-check policy."""

    schema_version: Literal["virtual-qa-scoring/v1"]
    revision: Text
    pin: CasePin
    rubric: Rubric
    critical_checks: Metadata[tuple[Text, ...]]
    frozen_at: Metadata[AwareDatetime]


class Reviewer(Record):
    identity: Text
    role: Literal["agent", "human"]
    involvement: Text


class EvidenceReview(Record):
    reference: Reference
    status: Literal["verified", "missing", "invalid", "disputed"]
    rationale: Text


class CheckDecision(Record):
    check_id: Text
    status: Status
    evidence: tuple[Reference, ...]
    rationale: Text


class ClaimDecision(Record):
    """One distinct substantive conclusion; reviewer merges paraphrases explicitly."""

    claim_id: Text
    claim: Text
    status: Literal["supported", "partial", "unsupported", "unassessable"]
    evidence: tuple[Reference, ...]
    rationale: Text


class FindingDecision(Record):
    finding_id: Text
    revision: Text
    app_defect_allegation: bool = Field(strict=True)
    cause: Metadata[Text]
    expected: Metadata[Text]
    steps: tuple[Text, ...]
    acceptance: tuple[Text, ...]
    regression_layer: Metadata[Text]
    matched_seed: bool = Field(strict=True)


class Assessment(Record):
    schema_version: Literal["virtual-qa-assessment/v1"]
    assessment_id: Text
    revision: Text
    supersedes: Text | None
    run_id: Text
    pin: CasePin
    kind: Literal["manual_review", "model_suggestion"]
    reviewer: Reviewer
    reviewed_at: AwareDatetime
    rationale: Text
    disagreements: tuple[Text, ...]
    environment: Literal["ready", "blocked", "unknown"]
    environment_evidence: tuple[Reference, ...]
    evidence_reviews: tuple[EvidenceReview, ...]
    checks: tuple[CheckDecision, ...]
    claims: tuple[ClaimDecision, ...]
    findings: tuple[FindingDecision, ...]
    control_observable: bool | None
    control_evidence: tuple[Reference, ...]
    review_minutes: Metadata[Annotated[float, Field(ge=0, allow_inf_nan=False, strict=True)]]

    @model_validator(mode="after")
    def unique_items(self):
        if self.kind == "model_suggestion" and self.reviewer.role != "agent":
            raise ValueError("model suggestions must attribute an agent")
        for values in (
            [d.check_id for d in self.checks],
            [d.claim_id for d in self.claims],
            [d.finding_id for d in self.findings],
            [ref_key(d.reference) for d in self.evidence_reviews],
        ):
            if len(values) != len(set(values)):
                raise ValueError("duplicate assessment items")
        return self


def ref_key(ref: Reference) -> str:
    return ref.model_dump_json()


def ratio(numerator, denominator, reason="No eligible observations"):
    return {
        "numerator": numerator,
        "denominator": denominator,
        "value": numerator / denominator if denominator else None,
        "na_reason": None if denominator else reason,
    }


def latest_chain(records, id_field, stable_fields):
    """Require complete, linear immutable history; input order is irrelevant."""
    grouped = defaultdict(list)
    for record in records:
        grouped[getattr(record, id_field)].append(record)
    latest = []
    for group in grouped.values():
        by_revision = {r.revision: r for r in group}
        if len(group) != len(by_revision):
            raise ValueError("duplicate revision")
        roots = [r for r in group if r.supersedes is None]
        if len(roots) != 1:
            raise ValueError("history requires one retained root")
        visited = set()
        current = roots[0]
        while True:
            visited.add(current.revision)
            children = [r for r in group if r.supersedes == current.revision]
            if len(children) > 1:
                raise ValueError("branched revision history")
            if not children:
                break
            child = children[0]
            if any(getattr(child, f) != getattr(current, f) for f in stable_fields):
                raise ValueError("revision changed immutable assessment/finding identity")
            if hasattr(child, "reviewed_at") and child.reviewed_at < current.reviewed_at:
                raise ValueError("review revision predates its ancestor")
            current = child
        if len(visited) != len(group):
            raise ValueError("missing ancestor or cyclic history")
        latest.append(current)
    return latest


def _references(case, run, findings):
    refs = [*case.fixtures, *case.sources, run.participant_prompt, *run.evidence]
    if run.final_note.value is not None:
        refs.append(run.final_note.value)
    for check in case.facilitator.expectations:
        refs.extend(check.evidence)
        if check.basis:
            refs.extend(check.basis.evidence)
    for finding in findings:
        refs.extend(finding.supporting_evidence)
        refs.extend(finding.contradicting_evidence)
        refs.extend(finding.reproduction_evidence)
    return {ref_key(ref) for ref in refs}


def _verified(assessment, refs):
    if not assessment or not refs:
        return False
    reviews = {ref_key(r.reference): r.status for r in assessment.evidence_reviews}
    return all(reviews.get(ref_key(ref)) == "verified" for ref in refs)


def _finding_key(finding, decision, run, pin):
    # Unknown causes cannot collapse separate discoveries. Variant and data are pinned.
    cause = decision.cause.value or f"unknown:{finding.finding_id}"
    return json.dumps(
        [
            cause,
            finding.check_id,
            pin.model_dump(mode="json"),
            run.application_commit.model_dump(mode="json"),
            run.frontend_commit.model_dump(mode="json"),
            run.data.model_dump(mode="json"),
        ],
        sort_keys=True,
    )


def grade(cases, runs, findings, scoring, assessments):
    """Replay saved attributed judgments; return histories, per-attempt metrics/drafts."""
    validate_links(tuple(cases), tuple(runs), tuple(findings))
    current_findings = latest_chain(
        findings, "finding_id", ("run_id", "case_id", "origin", "check_id")
    )
    current_assessments = latest_chain(assessments, "assessment_id", ("run_id", "pin", "kind"))
    case_map = {(c.case_id, c.revision): c for c in cases}
    run_map = {r.run_id: r for r in runs}
    finding_map = {(f.finding_id, f.revision): f for f in findings}
    scoring_map = {}
    for policy in scoring:
        key = policy.pin.case_sha256
        if key in scoring_map:
            raise ValueError("duplicate scoring policy")
        case = case_map.get((policy.pin.case_id, policy.pin.revision))
        if not case or policy.pin != CasePin.from_case(case) or policy.rubric != case.facilitator:
            raise ValueError("separately supplied rubric differs from frozen case")
        scored_ids = {c.check_id for c in case.facilitator.expectations if c.scored}
        critical = policy.critical_checks.value
        if critical is not None and (
            len(critical) != len(set(critical)) or not set(critical) <= scored_ids
        ):
            raise ValueError("critical policy must name distinct scored checks")
        scoring_map[key] = policy
    for run in runs:
        for pin in run.cases:
            if pin.case_sha256 not in scoring_map:
                raise ValueError("missing separately supplied frozen rubric")
            policy = scoring_map[pin.case_sha256]
            if policy.critical_checks.value is not None and run.provenance == "participant_run":
                if (
                    policy.frozen_at.value is None
                    or run.rubric_frozen_at.value is None
                    or policy.frozen_at.value > run.rubric_frozen_at.value
                ):
                    raise ValueError("critical policy must freeze before rubric dispatch freeze")
    # Validate original as well as superseding reviews; never let old dangling evidence disappear.
    for a in assessments:
        run = run_map.get(a.run_id)
        if not run or a.pin not in run.cases:
            raise ValueError("assessment run/case pin mismatch")
        case = case_map[(a.pin.case_id, a.pin.revision)]
        checks = {c.check_id: c for c in case.facilitator.expectations}
        if any(d.check_id not in checks or not checks[d.check_id].scored for d in a.checks):
            raise ValueError("assessment cannot score unknown or unscored retrospective checks")
        related = [f for f in findings if (f.run_id, f.case_id) == (run.run_id, case.case_id)]
        allowed = _references(case, run, related)
        used = [r.reference for r in a.evidence_reviews]
        used.extend(a.environment_evidence)
        used.extend(a.control_evidence)
        for d in (*a.checks, *a.claims):
            used.extend(d.evidence)
        if any(ref_key(ref) not in allowed for ref in used):
            raise ValueError("review references evidence outside pinned case/run/finding")
        for d in a.findings:
            f = finding_map.get((d.finding_id, d.revision))
            if not f or (f.run_id, f.case_id) != (run.run_id, case.case_id):
                raise ValueError("finding review run/case/revision mismatch")
            if f.category in {"app_defect", "false_alarm"} and not d.app_defect_allegation:
                raise ValueError("app defects and false alarms must count as allegations")
            if f.adjudication.status in {"confirmed", "rejected"} and (
                f.adjudication.reviewer.value != a.reviewer.identity
                or f.adjudication.reviewed_at.value != a.reviewed_at
            ):
                raise ValueError("finding adjudicator/date must match attributed assessment")
            if d.matched_seed and not (
                case.facilitator.seeded_fault and case.facilitator.seeded_fault.variant == "fault"
            ):
                raise ValueError("seed match requires a pinned fault variant")
    review_map = {}
    for a in current_assessments:
        if a.kind == "model_suggestion":
            continue
        key = (a.run_id, a.pin.case_id)
        if key in review_map:
            raise ValueError("multiple current manual reviews; retain a single revision chain")
        review_map[key] = a

    rows, drafts = [], {}
    draft_outcomes = defaultdict(set)
    for run in runs:
        if run.status == "prepared":
            continue
        for pin in run.cases:
            case = case_map[(pin.case_id, pin.revision)]
            policy = scoring_map[pin.case_sha256]
            a = review_map.get((run.run_id, case.case_id))
            ready = bool(
                a
                and a.environment == "ready"
                and _verified(a, a.environment_evidence)
                and run.status in {"completed", "timeout"}
            )
            note_ok = run.final_note.value is not None and _verified(a, [run.final_note.value])
            decisions = {d.check_id: d for d in a.checks} if a else {}
            critical = policy.critical_checks.value
            check_results = []
            for check in case.facilitator.expectations:
                if not check.scored:
                    continue
                d = decisions.get(check.check_id)
                basis = [*check.evidence, *check.basis.evidence]
                eligible = ready and note_ok and _verified(a, basis)
                status = "unassessable"
                reason = "Missing reviewed evidence, decision, or usable environment"
                if eligible and d and _verified(a, d.evidence):
                    status, reason = d.status, d.rationale
                check_results.append(
                    {
                        "check_id": check.check_id,
                        "status": status,
                        "rationale": reason,
                        "severity": "critical"
                        if critical and check.check_id in critical
                        else "unknown",
                    }
                )
            counts = Counter(c["status"] for c in check_results)
            assessable = len(check_results) - counts["unassessable"]
            critical = policy.critical_checks.value
            critical_results = [
                c
                for c in check_results
                if critical is not None
                and c["check_id"] in critical
                and c["status"] != "unassessable"
            ]
            claims = []
            for claim in a.claims if a else ():
                status = (
                    claim.status
                    if ready and note_ok and _verified(a, claim.evidence)
                    else ("unassessable")
                )
                claims.append({**claim.model_dump(mode="json"), "effective_status": status})
            claim_counts = Counter(c["effective_status"] for c in claims)
            ledger, allegation_groups = [], {}
            allegation_severities = defaultdict(set)
            seed_keys = set()
            relevant = [
                f for f in current_findings if (f.run_id, f.case_id) == (run.run_id, case.case_id)
            ]
            fd = {d.finding_id: d for d in a.findings} if a else {}
            for f in relevant:
                d = fd.get(f.finding_id)
                if d and d.revision != f.revision:
                    d = None  # New finding revision must receive a new review.
                evidence_ok = bool(
                    d
                    and _verified(a, f.supporting_evidence)
                    and (not f.contradicting_evidence or _verified(a, f.contradicting_evidence))
                )
                resolved = evidence_ok and f.adjudication.status in {"confirmed", "rejected"}
                confirmed = bool(
                    resolved
                    and f.category == "app_defect"
                    and f.adjudication.status == "confirmed"
                    and ready
                    and _verified(a, f.reproduction_evidence)
                )
                false_alarm = bool(
                    resolved
                    and (
                        (f.category == "app_defect" and f.adjudication.status == "rejected")
                        or (f.category == "false_alarm" and f.adjudication.status == "confirmed")
                    )
                )
                outcome = "confirmed" if confirmed else "rejected" if false_alarm else "pending"
                allegation = (
                    d.app_defect_allegation if d else f.category in {"app_defect", "false_alarm"}
                )
                key = _finding_key(f, d, run, pin) if d else f"unreviewed:{f.finding_id}"
                if allegation:
                    allegation_groups.setdefault(key, []).append(outcome)
                    allegation_severities[key].add(f.severity)
                    draft_outcomes[key].add(outcome)
                if confirmed and d and d.matched_seed:
                    seed_keys.add(key)
                ledger.append(
                    {
                        "finding": f.model_dump(mode="json"),
                        "effective_allegation_status": outcome if allegation else None,
                        "evidence_verified": evidence_ok,
                        "matched_seed": bool(confirmed and d and d.matched_seed),
                    }
                )
                # A local bug draft requires explicit actionable content and known identities.
                if not (
                    confirmed
                    and d
                    and d.cause.value
                    and d.expected.value
                    and d.steps
                    and d.acceptance
                    and d.regression_layer.value
                    and run.application_commit.value
                    and run.frontend_commit.value
                    and run.data.identity.value
                    and run.data.revision.value
                    and f.severity != "unknown"
                ):
                    continue
                draft = drafts.setdefault(key, {"cause": d.cause.value, "occurrences": []})
                draft["occurrences"].append(
                    {
                        "run_id": run.run_id,
                        "case_pin": pin.model_dump(mode="json"),
                        "application_commit": run.application_commit.value,
                        "frontend_commit": run.frontend_commit.value,
                        "data": run.data.model_dump(mode="json"),
                        "finding": f.model_dump(mode="json"),
                        "reviewer": a.reviewer.model_dump(mode="json"),
                        "observed": f.claim,
                        "expected": d.expected.value,
                        "steps": d.steps,
                        "acceptance": d.acceptance,
                        "regression_layer": d.regression_layer.value,
                    }
                )
            # Conflicting or pending occurrences of one allegation never become a free success.
            outcomes = [
                items[0] if len(set(items)) == 1 else "pending"
                for items in allegation_groups.values()
            ]
            finding_counts = Counter(outcomes)
            precision_by_severity = {}
            for key, items in allegation_groups.items():
                severity_name = (
                    next(iter(allegation_severities[key]))
                    if len(allegation_severities[key]) == 1
                    else "unknown"
                )
                severity_counts = precision_by_severity.setdefault(severity_name, Counter())
                severity_counts[items[0] if len(set(items)) == 1 else "pending"] += 1
            control = case.facilitator.seeded_fault
            # Observability is not a review of the participant's outcome. Require
            # explicit assessable decisions for every scored control-case check;
            # reviewed not_attempted/unsupported outcomes remain eligible misses.
            control_outcome_reviewed = bool(check_results) and all(
                c["status"] != "unassessable" for c in check_results
            )
            observable = bool(
                ready
                and note_ok
                and a
                and a.control_observable is True
                and _verified(a, a.control_evidence)
                and all(
                    c.review.status in {"reviewed", "independently_reviewed"}
                    for c in case.facilitator.expectations
                    if c.scored
                )
            )
            fault_den = int(
                bool(
                    control
                    and control.variant == "fault"
                    and observable
                    and control_outcome_reviewed
                    and run.mode == "defect_detection"
                )
            )
            clean_den = int(
                bool(
                    control
                    and control.variant == "clean"
                    and observable
                    and control_outcome_reviewed
                    and run.mode == "defect_detection"
                    and not finding_counts["pending"]
                    and run.status == "completed"
                )
            )
            row = {
                "run_id": run.run_id,
                "application_commit": run.application_commit.model_dump(mode="json"),
                "frontend_commit": run.frontend_commit.model_dump(mode="json"),
                "data": run.data.model_dump(mode="json"),
                "case_pin": pin.model_dump(mode="json"),
                "mode": run.mode,
                "category": case.category,
                "provenance": run.provenance,
                "run_status": run.status,
                "started": run.started_at.value is not None,
                "scoring_sha256": hashlib.sha256(
                    json.dumps(
                        policy.model_dump(mode="json"), sort_keys=True, separators=(",", ":")
                    ).encode()
                ).hexdigest(),
                "review": a.model_dump(mode="json") if a else None,
                "checks": check_results,
                "unscored_checks": [
                    c.check_id for c in case.facilitator.expectations if not c.scored
                ],
                "checklist_outcomes": {s: ratio(counts[s], len(check_results)) for s in STATUSES},
                "supported_checks": ratio(counts["supported"], assessable),
                "critical_omissions": ratio(
                    sum(c["status"] == "not_attempted" for c in critical_results),
                    len(critical_results) if critical is not None else None,
                    "Critical policy unknown or no assessable critical checks",
                ),
                "claims": claims,
                "unsupported_conclusions": ratio(
                    claim_counts["unsupported"], len(claims) - claim_counts["unassessable"]
                ),
                "unassessable_claims": claim_counts["unassessable"],
                "findings": ledger,
                "confirmed_finding_precision": ratio(
                    finding_counts["confirmed"],
                    finding_counts["confirmed"] + finding_counts["rejected"],
                ),
                "pending_allegations": finding_counts["pending"],
                "precision_by_severity": {
                    s: {
                        "precision": ratio(c["confirmed"], c["confirmed"] + c["rejected"]),
                        "pending": c["pending"],
                    }
                    for s, c in precision_by_severity.items()
                },
                "seeded_fault_detection": ratio(
                    int(
                        bool(
                            fault_den
                            and any(
                                key in seed_keys and set(items) == {"confirmed"}
                                for key, items in allegation_groups.items()
                            )
                        )
                    ),
                    fault_den,
                ),
                "clean_control_false_alarms": ratio(
                    int(bool(clean_den and finding_counts["rejected"])), clean_den
                ),
                "control_unassessable": bool(control and not (fault_den or clean_den)),
                "control_outcome_reviewed": control_outcome_reviewed if control else None,
                "blocked_or_unassessable": run.status == "blocked"
                or not ready
                or bool(counts["unassessable"]),
                "unknown_defect_recall": ratio(0, None, "Unknown defects have no measurable total"),
            }
            rows.append(row)
    # Aggregate only within mode AND case/rubric identity AND provenance, never a grand score.
    groups = defaultdict(list)
    for row in rows:
        groups[
            (row["mode"], row["case_pin"]["case_sha256"], row["scoring_sha256"], row["provenance"])
        ].append(row)
    summary = []
    for (mode, digest, scoring_digest, provenance), group in groups.items():
        counts = Counter(c["status"] for row in group for c in row["checks"])
        checklist_by_severity = {}
        for severity_name in ("critical", "unknown"):
            subset = Counter(
                c["status"]
                for row in group
                for c in row["checks"]
                if c["severity"] == severity_name
            )
            checklist_by_severity[severity_name] = {
                s: ratio(subset[s], sum(subset.values())) for s in STATUSES
            }
        metrics = {}
        for metric in (
            "supported_checks",
            "critical_omissions",
            "unsupported_conclusions",
            "confirmed_finding_precision",
            "seeded_fault_detection",
            "clean_control_false_alarms",
        ):
            values = [row[metric] for row in group]
            den = (
                None
                if any(v["denominator"] is None for v in values)
                else sum(v["denominator"] for v in values)
            )
            metrics[metric] = ratio(sum(v["numerator"] for v in values), den)
        minutes = [row["review"]["review_minutes"]["value"] for row in group if row["review"]]
        known = [m for m in minutes if m is not None]
        severity = Counter(
            (f["finding"]["category"], f["finding"]["severity"], f["effective_allegation_status"])
            for row in group
            for f in row["findings"]
        )
        summary.append(
            {
                "mode": mode,
                "case_sha256": digest,
                "provenance": provenance,
                "scoring_sha256": scoring_digest,
                "category": group[0]["category"],
                "attempts": len(group),
                "statuses": dict(Counter(row["run_status"] for row in group)),
                "checklist_outcomes": {s: ratio(counts[s], sum(counts.values())) for s in STATUSES},
                "checklist_by_severity": checklist_by_severity,
                "metrics": metrics,
                "pending_allegations": sum(r["pending_allegations"] for r in group),
                "control_unassessable": sum(r["control_unassessable"] for r in group),
                "blocked_or_unassessable": ratio(
                    sum(r["blocked_or_unassessable"] for r in group if r["started"]),
                    sum(r["started"] for r in group),
                ),
                "not_recorded_started": sum(not r["started"] for r in group),
                "review_effort": ratio(sum(known), len(known), "No recorded review timing"),
                "untimed_or_unreviewed": len(group) - len(known),
                "finding_breakdown": [
                    {
                        "category": k[0],
                        "severity": k[1],
                        "outcome": k[2],
                        "count": n,
                        "denominator": sum(severity.values()),
                    }
                    for k, n in sorted(severity.items(), key=lambda item: str(item[0]))
                ],
            }
        )
    issue_drafts = []
    for key, draft in sorted(drafts.items()):
        if draft_outcomes[key] != {"confirmed"}:
            continue  # Conflicting/pending allegations of this pinned cause need resolution.
        links = {
            o["finding"]["linked_issue"]
            for o in draft["occurrences"]
            if o["finding"]["linked_issue"]
        }
        draft.update(
            draft_id=hashlib.sha256(key.encode()).hexdigest()[:16],
            action="update_existing"
            if len(links) == 1
            else "review_link_conflict"
            if len(links) > 1
            else "new_local_draft",
            linked_issues=sorted(links),
        )
        issue_drafts.append(draft)
    return {
        "schema_version": "virtual-qa-grades/v1",
        "attempts": rows,
        "summary": summary,
        "prepared_runs_not_graded": [r.run_id for r in runs if r.status == "prepared"],
        "issue_drafts": issue_drafts,
        "assessment_history": [a.model_dump(mode="json") for a in assessments],
        "finding_history": [f.model_dump(mode="json") for f in findings],
        "scoring": [s.model_dump(mode="json") for s in scoring],
        "cases": [c.model_dump(mode="json") for c in cases],
        "runs": [r.model_dump(mode="json") for r in runs],
        "limits": [
            "Reviewer evidence attestations are not independently authenticated.",
            "Agent review is not human calibration or legal acceptance.",
            "No unknown-defect recall or population accuracy estimate.",
        ],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", action="append", default=[], type=Path)
    parser.add_argument("--run", action="append", default=[], type=Path)
    parser.add_argument("--records", type=Path, help="Shared example envelope: cases/runs/findings")
    parser.add_argument("--finding", action="append", default=[], type=Path)
    parser.add_argument("--scoring", action="append", required=True, type=Path)
    parser.add_argument("--assessment", action="append", default=[], type=Path)
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="New local directory; existing output is never overwritten",
    )
    args = parser.parse_args(argv)
    values = []
    for paths, model in (
        (args.case, CaseDefinition),
        (args.run, RunRecord),
        (args.finding, Finding),
        (args.scoring, FrozenScoring),
        (args.assessment, Assessment),
    ):
        values.append([model.model_validate_json(p.read_text(encoding="utf-8")) for p in paths])
    if args.records:
        envelope = json.loads(args.records.read_text(encoding="utf-8"))
        if set(envelope) != {"cases", "runs", "findings"}:
            raise ValueError("record envelope must contain only cases, runs, findings")
        for index, (key, model) in enumerate(
            (("cases", CaseDefinition), ("runs", RunRecord), ("findings", Finding))
        ):
            values[index].extend(model.model_validate(record) for record in envelope[key])
    if not values[0] or not values[1]:
        raise ValueError("at least one case and run required")
    result = grade(*values)
    args.output.mkdir(parents=True, exist_ok=False)
    (args.output / "grades.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    for draft in result["issue_drafts"]:
        # JSON is intentionally fenced: untrusted evidence is never executable markup/code.
        body = "# Local adjudicated issue draft\n\nReview before publication.\n\n"
        body += "```json\n" + json.dumps(draft, indent=2).replace("`", "\\u0060") + "\n```\n"
        (args.output / f"issue-{draft['draft_id']}.md").write_text(body, encoding="utf-8")
    print(f"Wrote {len(result['attempts'])} case-attempt grades to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
