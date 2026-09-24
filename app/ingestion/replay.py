"""Strict parsing, conservative normalization and separate contract validation."""

import json
from decimal import Decimal, DecimalException

from pydantic import ValidationError

from app.contracts.common import UNITS, Quantity
from app.contracts.rules import RuleContent, ScalarBound, UnresolvedSemantics

from .models import FieldContext, Outcome, RunInput


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError("nonfinite JSON number")


def parse_response(raw: bytes) -> list[dict]:
    """Read one to three concatenated objects exactly as the old prompt requests.

    No fence stripping, JSON repair, expression execution or partial-success salvage.
    """
    text = raw.decode("utf-8")
    decoder = json.JSONDecoder(
        object_pairs_hook=unique_pairs, parse_float=Decimal, parse_constant=reject_constant
    )
    objects = []
    offset = 0
    while offset < len(text):
        if text[offset].isspace():
            offset += 1
            continue
        value, offset = decoder.raw_decode(text, offset)
        if not isinstance(value, dict) or len(objects) == 3:
            raise ValueError("expected one to three top-level objects")
        objects.append(value)
    if not objects:
        raise ValueError("empty response")
    return objects


def normalize_scalar(value: dict, context: FieldContext) -> Quantity:
    """Only unit conversion; never infer legal definitions or ratio denominators."""
    unit = value["units"]
    original = value["value"]
    if isinstance(original, bool) or not isinstance(original, (int, Decimal)):
        raise ValueError("numeric value required; expressions and numeric strings unsupported")
    if unit not in UNITS:
        raise ValueError("unsupported unit spelling")
    dimension, normalized_unit, factor = UNITS[unit]
    if dimension != context.dimension:
        raise ValueError("unit dimension disagrees with measurement context")
    if dimension in {"ratio", "rate"}:
        if context.basis is None or value["isRatioOf"] != context.basis.denominator:
            raise ValueError("ratio denominator disagrees with explicit context")
    elif value["isRatioOf"] != "N/A" or context.basis is not None:
        raise ValueError("non-ratio has a ratio basis")
    if dimension == "ratio":
        required = "percent_points" if unit == "%" else "fraction"
        if context.ratio_encoding != required:
            raise ValueError("ratio encoding disagrees with units")
    elif context.ratio_encoding is not None:
        raise ValueError("ratio encoding supplied for non-ratio")
    return Quantity(
        original_text=json.dumps(value, default=str, ensure_ascii=False),
        original_value=original,
        original_unit=unit,
        dimension=dimension,
        value=Decimal(original) * factor,
        unit=normalized_unit,
        basis=context.basis,
    )


def validate_content(content: RuleContent, run: RunInput) -> RuleContent:
    """Schema/reference validity only; this cannot establish source support."""
    checked = RuleContent.model_validate_json(content.model_dump_json())
    if any(e.snapshot_id not in run.source_snapshot_ids for e in checked.evidence):
        raise ValueError("evidence outside run sources")
    return checked


def classify(parameter: str, value, run: RunInput) -> Outcome:
    context = run.fields.get(parameter)

    def result(state, *issues, content=None):
        return Outcome(
            parameter=parameter,
            state=state,
            issues=issues,
            content=content,
            candidate_id=context.candidate_id if context else None,
            rule_identity=context.rule_identity if context else None,
        )

    def unresolved(state, reason):
        content = None
        if context:
            content = make_content(
                context,
                UnresolvedSemantics(
                    kind="unresolved", text=json.dumps(value, default=str), reason=reason
                ),
                "unsupported" if state == "unsupported" else "unresolved",
            )
            content = validate_content(content, run)
        return result(state, reason, content=content)

    if value == "uncertain":
        return result("ambiguous", "model reports insufficient information")
    if value == "N/A":
        return result("not_applicable_reported", "unreviewed applicability claim")
    if value == {"status": "not_found"}:
        return result("not_found_reported", "absence claim limited to unreviewed searched scope")
    if isinstance(value, str) and value.startswith("conditional_rule:"):
        return unresolved("unresolved_reference", "referenced rule is not a reviewed revision")
    if isinstance(value, list) or (
        isinstance(value, dict)
        and any(key in value for key in ("threshold", "conditions", "whichever_is", "rule_name"))
    ):
        return unresolved(
            "unsupported", "conditional/comparison/calculation semantics not executable"
        )
    scalar_keys = {"units", "isRatioOf", "value", "is_minimum", "is_maximum"}
    if not isinstance(value, dict) or set(value) != scalar_keys:
        return result("unsupported", "shape outside bounded historical scalar adapter")
    if value["units"] in ("%", "fraction") and (context is None or context.ratio_encoding is None):
        return result("ambiguous", "historical prompt does not establish percentage scaling")
    if context is None:
        return result(
            "missing_evidence", "explicit citation/context and measurement metadata required"
        )
    minimum, maximum = value["is_minimum"], value["is_maximum"]
    if type(minimum) is not bool or type(maximum) is not bool or minimum == maximum:
        return result("ambiguous", "contradictory or missing bound direction")
    if context.operator not in ((">", ">=") if minimum else ("<", "<=")):
        return result("invalid", "bound direction disagrees with explicit operator")
    if context.applicability.conditions or context.applicability.exceptions:
        return unresolved(
            "unsupported", "applicability conditions/exceptions require interpretation"
        )
    try:
        quantity = normalize_scalar(value, context)
        semantics = ScalarBound(
            kind="scalar_bound",
            subject=parameter,
            measurement_definition=context.measurement_definition,
            operator=context.operator,
            threshold=quantity,
        )
        content = validate_content(make_content(context, semantics, "unresolved"), run)
    except (ValueError, ValidationError, TypeError, DecimalException):
        return result("invalid", "quantity/unit/basis or contract validation failed")
    return result(
        "normalized", "unreviewed proposal; source support not established", content=content
    )


def make_content(context, semantics, support):
    return RuleContent(
        pathway_id=context.pathway_id,
        alternative_id=context.alternative_id,
        text="\n".join(e.excerpt for e in context.evidence),
        evidence=context.evidence,
        applicability=context.applicability,
        approval="unknown",
        semantics=semantics,
        runtime_support=support,
        references=(),
    )


def replay(raw: bytes, run: RunInput):
    try:
        objects = parse_response(raw)
    except (UnicodeError, ValueError, RecursionError):
        return (
            0,
            ("malformed_response: no partial recovery",),
            tuple(
                Outcome(parameter=p, state="malformed", issues=("response cannot be parsed",))
                for p in run.expected_parameters
            ),
        )
    if run.run_failures:
        return (
            len(objects),
            (),
            tuple(
                Outcome(parameter=p, state="run_failed", issues=run.run_failures)
                for p in run.expected_parameters
            ),
        )
    outcomes = []
    for parameter in run.expected_parameters:
        if parameter not in objects[0]:
            outcomes.append(
                Outcome(
                    parameter=parameter, state="omitted", issues=("missing output is not absence",)
                )
            )
        else:
            outcomes.append(classify(parameter, objects[0][parameter], run))
    for parameter in sorted(objects[0].keys() - set(run.expected_parameters)):
        outcomes.append(
            Outcome(
                parameter=parameter,
                state="unsupported",
                issues=("outside declared search parameters",),
            )
        )
    # Parts 2/3 are retained exactly in raw bytes, never joined into executable rules.
    issues = ("auxiliary_objects_retained_unresolved",) if len(objects) > 1 else ()
    return len(objects), issues, tuple(outcomes)
