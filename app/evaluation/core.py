"""Deterministic direct comparisons and conservative coherent aggregation."""

import operator
from decimal import Context, Decimal, InvalidOperation, localcontext

from pydantic import BaseModel

from app.contracts.results import AlternativeResult, CheckResult

from .payloads import ENGINE, VERSION, CheckTrace, EvaluationReport, EvaluationRequest

OPERATORS = {
    "<": operator.lt,
    "<=": operator.le,
    ">": operator.gt,
    ">=": operator.ge,
    "==": operator.eq,
}


def _reviewed(provenance):
    return provenance.review.status == "accepted" and not provenance.uncertainty


def _key(ref):
    return ref.logical_id, ref.revision_id


def _plain(value):
    # Dict callers may embed model_construct/model_copy instances too. Do not let
    # Pydantic's instance fast path bypass validators at any nesting depth.
    if isinstance(value, BaseModel):
        value = value.model_dump(mode="python", warnings=False)
    if isinstance(value, dict):
        return {key: _plain(item) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return tuple(_plain(item) for item in value)
    return value


def _precision(value):
    """Enough coefficient digits for exact multiplication by SR-04 unit factors."""
    if isinstance(value, dict):
        precision = 28
        if "original_value" in value:
            try:
                number = Decimal(str(value["original_value"]))
                if number.is_finite():
                    precision = max(precision, len(number.as_tuple().digits) + 10)
            except InvalidOperation:
                pass  # The typed boundary supplies the validation error.
        return max((precision, *(_precision(item) for item in value.values())))
    if isinstance(value, tuple):
        return max((28, *(_precision(item) for item in value)))
    return 28


def evaluate(payload: EvaluationRequest | dict) -> EvaluationReport:
    """Revalidate the entire boundary, then evaluate every declared revision.

    Malformed/foreign-version input raises ValidationError. Valid but incomplete
    requests return investigation diagnostics. No input is mutated or published.
    """
    plain = _plain(payload)
    # Quantity normalization multiplies Decimals. Ambient caller precision must
    # neither round away a threshold difference nor reject an exact conversion.
    with localcontext(Context(prec=_precision(plain))):
        request = EvaluationRequest.model_validate(plain)
    rules = {r.identity: r for r in request.rules}
    facts = {f.identity: f for f in request.facts}
    bindings = {b.rule: b for b in request.bindings}
    sources = {s.snapshot_id: s for s in request.sources}
    traces, alternatives = [], []
    global_issues = []
    scope = request.scope
    if scope.coverage != "within_coverage":
        coverage_status = (
            "outside_coverage" if scope.coverage == "outside_coverage" else "missing_fact"
        )
        global_issues.append((coverage_status, f"coverage is {scope.coverage}"))
    for label, provenance in (
        ("scope", scope.provenance),
        ("design", request.design.provenance),
        ("site", request.site.provenance),
        ("placement", request.placement.footprint.provenance),
    ):
        if not _reviewed(provenance):
            global_issues.append(("missing_fact", f"{label} is unreviewed or uncertain"))
        if any(sources[e.snapshot_id].review.status != "accepted" for e in provenance.evidence):
            global_issues.append(("missing_fact", f"{label} source is unreviewed"))
    if request.placement.footprint.status != "known":
        global_issues.append(("missing_fact", "supplied placement geometry is not known"))
    if request.site.conditions:
        global_issues.append(("unsupported_semantics", "site conditions are non-executable"))
    if scope.jurisdiction != request.site.jurisdiction or scope.use != request.design.intended_use:
        global_issues.append(("outside_coverage", "scope does not match supplied inputs"))

    for alternative in sorted(request.alternatives, key=lambda a: (a.pathway_id, a.alternative_id)):
        checks, approvals, conditions = [], [], []
        for ref in sorted(alternative.rules, key=_key):
            rule, binding = rules.get(ref), bindings.get(ref)
            fact = facts.get(binding.fact) if binding else None
            issues = list(global_issues)
            evidence = []
            if rule is None:
                issues.append(("unresolved_reference", "declared exact rule revision is absent"))
                approvals.append("unknown")
            else:
                content = rule.content
                approvals.append(content.approval)
                conditions.extend(
                    (*content.applicability.conditions, *content.applicability.exceptions)
                )
                evidence.extend(content.evidence)
                if any(
                    sources[e.snapshot_id].review.status != "accepted" for e in content.evidence
                ):
                    issues.append(("unsupported_semantics", "rule source is unreviewed"))
                if (
                    content.runtime_support != "supported"
                    or content.semantics.kind != "scalar_bound"
                ):
                    issues.append(("unsupported_semantics", "rule semantics are not supported"))
                applicability = content.applicability
                if applicability.status != "reviewed_scope":
                    issues.append(("unsupported_semantics", "rule applicability is unresolved"))
                if (applicability.jurisdiction, applicability.use, applicability.building_role) != (
                    scope.jurisdiction,
                    scope.use,
                    scope.building_role,
                ):
                    issues.append(("outside_coverage", "rule applicability differs from scope"))
                if applicability.conditions or applicability.exceptions:
                    issues.append(
                        ("unsupported_semantics", "conditions/exceptions are non-executable")
                    )
                for reference in content.references:
                    status = (
                        "unresolved_reference"
                        if reference.status == "unresolved"
                        else "unsupported_semantics"
                    )
                    issues.append(
                        (
                            status,
                            f"{reference.status} {reference.relationship} reference "
                            f"is non-executable: {reference.instrument} / {reference.locator}",
                        )
                    )
            if binding is None:
                issues.append(("missing_fact", "exact rule-to-fact binding is absent"))
            else:
                evidence.extend(binding.provenance.evidence)
                if not _reviewed(binding.provenance) or binding.applicability != "applicable":
                    issues.append(
                        ("missing_fact", "binding/applicability is unreviewed or unresolved")
                    )
                if binding.definition_support != "reviewed_direct_measurement":
                    issues.append(
                        ("unsupported_semantics", "measurement definition is unsupported")
                    )
                if fact is None:
                    issues.append(("missing_fact", "bound exact fact revision is absent"))
                else:
                    evidence.extend(fact.provenance.evidence)
                    if fact.status != "known" or not _reviewed(fact.provenance):
                        issues.append(
                            ("missing_fact", "bound fact is missing, uncertain or unreviewed")
                        )
                    if rule and rule.content.semantics.kind == "scalar_bound":
                        scalar = rule.content.semantics
                        if not (
                            fact.definition
                            == binding.measurement_definition
                            == scalar.measurement_definition
                        ):
                            issues.append(
                                ("unsupported_semantics", "measurement definitions differ")
                            )
                        if fact.quantity and (
                            fact.quantity.dimension,
                            fact.quantity.unit,
                            fact.quantity.basis,
                        ) != (
                            scalar.threshold.dimension,
                            scalar.threshold.unit,
                            scalar.threshold.basis,
                        ):
                            issues.append(
                                ("unsupported_semantics", "measurement units or ratio bases differ")
                            )
            if any(sources[e.snapshot_id].review.status != "accepted" for e in evidence):
                issues.append(("unsupported_semantics", "check evidence source is unreviewed"))
            # Every reason survives even when a single CheckStatus takes precedence.
            if issues:
                status = issues[0][0]
                explanation = "; ".join(message for _, message in issues)
            else:
                scalar = rule.content.semantics
                passed = OPERATORS[scalar.operator](fact.quantity.value, scalar.threshold.value)
                status = "pass" if passed else "supported_failure"
                explanation = (
                    f"{fact.quantity.value} {scalar.operator} {scalar.threshold.value} "
                    f"({scalar.threshold.unit}); supplied placement only"
                )
            result = CheckResult(
                check_id=ref.revision_id,
                rule=ref,
                status=status,
                explanation=explanation,
                evidence=tuple(dict.fromkeys(evidence)),
                missing_facts=tuple(m for s, m in issues if s == "missing_fact")
                if status == "missing_fact"
                else (),
            )
            checks.append(result)
            traces.append(
                CheckTrace(
                    rule=ref,
                    binding=binding,
                    fact=fact,
                    diagnostics=tuple(f"{s}: {m}" for s, m in issues),
                    result=result,
                )
            )
        approval = next(
            a for a in ("unknown", "discretionary", "conditional", "as_of_right") if a in approvals
        )
        states = {c.status for c in checks}
        outcome = "needs_investigation"
        if states <= {"pass", "supported_failure"}:
            if "supported_failure" in states:
                outcome = "no_match_under_evaluated_pathways"
            elif approval in {"as_of_right", "conditional"}:
                outcome = "candidate"
        alternatives.append(
            AlternativeResult(
                pathway_id=alternative.pathway_id,
                alternative_id=alternative.alternative_id,
                outcome=outcome,
                approval=approval,
                conditions=tuple(sorted(set(conditions))),
                checks=tuple(checks),
            )
        )
    outcomes = {a.outcome for a in alternatives}
    outcome = (
        "candidate"
        if "candidate" in outcomes
        else "no_match_under_evaluated_pathways"
        if outcomes == {"no_match_under_evaluated_pathways"}
        else "needs_investigation"
    )
    return EvaluationReport(
        schema_version=VERSION,
        evaluator_version=ENGINE,
        data_state="draft_only",
        scope="supplied_placement_only",
        request=request,
        outcome=outcome,
        alternatives=tuple(alternatives),
        traces=tuple(traces),
        scope_exclusions=tuple(
            sorted(
                set(
                    (
                        *scope.exclusions,
                        "Draft-only computation; no active dataset or publication is established.",
                        "No placement search or universal site/design incompatibility conclusion.",
                        "Only declared direct scalar checks; "
                        "no legal compliance or permit entitlement.",
                    )
                )
            )
        ),
    )
