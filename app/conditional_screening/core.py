"""Deterministic comparisons of supplied facts against explicit candidate rules."""

from decimal import Decimal

from pydantic import BaseModel

from .payloads import Check, Coverage, Fact, Quantity, Request, Result, Rule

_FACTORS = {
    "m": (Decimal("1"), "m"),
    "ft": (Decimal("0.3048"), "m"),
    "m2": (Decimal("1"), "m2"),
    "ft2": (Decimal("0.09290304"), "m2"),
    "count": (Decimal("1"), "count"),
}


def _plain(value):
    if isinstance(value, BaseModel):
        return _plain(value.model_dump(mode="python"))
    if isinstance(value, dict):
        return {key: _plain(item) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return [_plain(item) for item in value]
    return value


def _normalized(quantity: Quantity):
    factor, unit = _FACTORS[quantity.unit]
    return quantity.value * factor, unit


def _check(rule: Rule, facts: dict[str, Fact]) -> Check:
    fact = facts.get(rule.fact_id)
    reasons: list[str] = []

    if rule.applicability == "not_applicable":
        return Check(rule=rule, fact=fact, status="not_applicable", reasons=(
            rule.applicability_reason or "Stated facts establish that this check does not apply",
        ))
    if rule.applicability == "unsupported":
        return Check(rule=rule, fact=fact, status="unsupported", reasons=(
            rule.applicability_reason or "Applicability is outside supported scope",
        ))
    if rule.applicability == "unknown":
        reasons.append(rule.applicability_reason or "Rule applicability is unknown")

    for fact_id in rule.required_pathway_facts:
        prerequisite = facts.get(fact_id)
        if prerequisite is None or prerequisite.status != "known" or prerequisite.truth is None:
            reasons.append(f"Pathway fact {fact_id} is missing or unknown")
        elif not prerequisite.truth:
            reasons.append(f"Pathway fact {fact_id} contradicts this pathway")

    exception_triggered = False
    for fact_id in rule.unsupported_if_true:
        exception = facts.get(fact_id)
        if exception is None or exception.status != "known" or exception.truth is None:
            reasons.append(f"Exception fact {fact_id} is missing or unknown")
        elif exception.truth:
            exception_triggered = True
            reasons.append(f"Exception {fact_id} needs separate rules")
    if exception_triggered:
        return Check(rule=rule, fact=fact, status="unsupported", reasons=tuple(reasons))

    if fact is None or fact.status != "known":
        reasons.append(f"Measurement or fact {rule.fact_id} is missing or unknown")
        return Check(rule=rule, fact=fact, status="needs_information", reasons=tuple(reasons))
    if rule.kind == "prerequisite":
        if fact.truth is None:
            reasons.append("Expected a yes/no pathway fact")
            return Check(rule=rule, fact=fact, status="needs_information", reasons=tuple(reasons))
        if reasons:
            return Check(rule=rule, fact=fact, status="needs_information", reasons=tuple(reasons))
        return Check(
            rule=rule,
            fact=fact,
            status=(
                "meets_under_assumptions" if fact.truth == rule.expected
                else "apparent_conflict_under_assumptions"
            ),
            reasons=(),
        )

    if fact.quantity is None:
        reasons.append("Expected a measured quantity")
    if fact.measurement_definition != rule.measurement_definition:
        reasons.append("Measurement definition differs from the rule")
    if rule.kind == "boundary_min" and fact.boundary_role != rule.boundary_role:
        reasons.append("Boundary role is missing or differs from the rule")
    if rule.kind in ("boundary_min", "separation_min") and fact.geometry_basis != "wall":
        reasons.append("Distance needs wall geometry; roofline or nominal geometry is insufficient")
    if rule.kind == "area_max" and fact.geometry_basis in ("nominal", "roofline"):
        reasons.append("Nominal footprint or roofline is not regulatory floor area")
    if reasons:
        return Check(rule=rule, fact=fact, status="needs_information", reasons=tuple(reasons))

    observed, unit = _normalized(fact.quantity)
    threshold, threshold_unit = _normalized(rule.threshold)
    if unit != threshold_unit:
        return Check(rule=rule, fact=fact, status="needs_information", reasons=(
            "Quantity dimension differs from the rule",
        ))
    meets = observed >= threshold if rule.kind.endswith("min") else observed <= threshold
    return Check(
        rule=rule,
        fact=fact,
        status="meets_under_assumptions" if meets else "apparent_conflict_under_assumptions",
        reasons=(),
        normalized_observed=observed,
        normalized_threshold=threshold,
        normalized_unit=unit,
    )


def evaluate(payload: Request | dict) -> Result:
    """Revalidate at the boundary; never infer a rule, measurement or verdict."""
    request = Request.model_validate(_plain(payload))
    facts = {fact.id: fact for fact in request.facts}
    checks = tuple(_check(rule, facts) for rule in request.rules)
    counts = {name: sum(check.status == name for check in checks) for name in (
        "meets_under_assumptions", "apparent_conflict_under_assumptions",
        "needs_information", "not_applicable", "unsupported",
    )}
    outstanding = tuple(dict.fromkeys(
        reason for check in checks if check.status in ("needs_information", "unsupported")
        for reason in check.reasons
    ))
    limitations = tuple(dict.fromkeys((
        *request.scope_limitations,
        "Candidate comparisons cover only the supplied placement and declared checks.",
        *(limitation for rule in request.rules
          for limitation in rule.source.currentness_limitations),
    )))
    return Result(
        request=request,
        checks=checks,
        coverage=Coverage(**counts),
        outstanding_prerequisites=outstanding,
        limitations=limitations,
    )
