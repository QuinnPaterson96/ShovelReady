"""Eligibility and context checks, not a source-accuracy benchmark implementation."""

import hashlib
import importlib.util
from pathlib import Path
from typing import Literal, Protocol

from app.contracts.common import Artifact, Contract, Review, Text

ROOT = Path(__file__).resolve().parents[2]
DIMENSIONS = (
    "omissions",
    "applicability",
    "values",
    "unit_ratio_bases",
    "evidence",
    "dependencies",
    "consequential_outcome_changes",
)


class ContextWindow(Contract):
    schema_version: Literal["sr-07.context.v1"]
    kind: Literal["clause_window"]
    split: Literal["development", "held_out"]
    clause_ids: tuple[Text, ...]
    source_snapshot_id: Text
    artifact: Artifact
    review: Review


def read_corpus(path: Path):
    # Reuse the strict current intake boundary. It deliberately cannot accept
    # invented approvals. A future reviewed corpus needs a new version/adapter.
    spec = importlib.util.spec_from_file_location(
        "pilot_intake", ROOT / "docs/pilot-inputs/intake.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.Corpus.model_validate_json(path.read_text(encoding="utf-8"))


def context_issues(corpus, window: ContextWindow, raw: bytes) -> list[str]:
    issues = []
    clauses = {c.clause_id: c for c in corpus.clauses}
    selected = [clauses[c] for c in window.clause_ids if c in clauses]
    if not selected or len(selected) != len(window.clause_ids):
        issues.append("missing_or_unknown_clause")
    if len(set(window.clause_ids)) != len(window.clause_ids):
        issues.append("duplicate_clause")
    if hashlib.sha256(raw).hexdigest() != window.artifact.sha256:
        issues.append("context_hash_mismatch")
    if window.review.status != "accepted":
        issues.append("context_requires_attributed_boundary_and_leakage_review")
    groups = {c.group for c in selected}
    for clause in selected:
        if clause.split != window.split or (window.split == "development" and clause.group == "H"):
            issues.append("held_out_or_cross_split_content")
        if clause.snapshot_id != window.source_snapshot_id:
            issues.append("context_source_mismatch")
        if not set(clause.dependency_groups) <= groups:
            issues.append("missing_dependency_context")
        # Check dependency closure transitively because every selected clause is checked.
        if window.split == "development" and "H" in clause.dependency_groups:
            issues.append("held_out_dependency")
        if not clause.exact_excerpt:
            issues.append("authorized_excerpt_missing")
        elif clause.exact_excerpt.encode("utf-8") not in raw:
            issues.append("excerpt_missing_from_window")
    # A human must audit diagrams, co-located clauses and undeclared dependencies.
    # Metadata/group checks alone cannot detect undeclared text leakage.
    return sorted(set(issues))


class Scorer(Protocol):
    """Future scorer must compare reviewed expected/observed cases per dimension.

    The current pilot-corpus.v1 is never passed here. A future reviewed corpus
    adapter must validate evidence, review, context, split and complete case IDs.
    """

    def compare(self, expected, observed) -> dict[str, object]: ...


def assess(corpus) -> dict:
    entries = []
    for clause in corpus.clauses:
        reasons = list(clause.blockers)
        if not clause.benchmark_eligible:
            reasons.append("not_approved_for_benchmark")
        if clause.exact_excerpt is None:
            reasons.append("authorized_excerpt_and_context_missing")
        if clause.review_status != "accepted" or not clause.reviewer:
            reasons.append("independent_review_missing")
        if clause.disagreement_status != "resolved":
            reasons.append("disagreement_review_incomplete")
        entries.append({"clause_id": clause.clause_id, "split": clause.split, "reasons": reasons})
    return {
        "schema_version": "sr-07.eligibility.v1",
        "status": "blocked",
        "corpus_version": corpus.schema_version,
        "total": len(entries),
        "eligible": 0,
        "entries": entries,
        "gates": [
            "reviewed_corpus_version_and_authorized_context_windows_required",
            "original_prompt_baseline_and_explicit_live_budget_required",
            "recorded_manual_baseline_review_and_correction_timing_required",
            "held_out_split_dependency_review_required",
        ],
        "accuracy": None,
        "cost": None,
        "review_seconds": None,
        "correction_seconds": None,
        "measurement_status": "not_measured",
        "scoring_dimensions": list(DIMENSIONS),
    }
