"""Synthetic decisions, not source-support or legal-accuracy tests."""

import json
from copy import deepcopy
from decimal import localcontext
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.evaluation import EvaluationReport, EvaluationRequest, evaluate
from tests.evaluation_fixtures import quantity, ref, request


def status(payload):
    return evaluate(payload).alternatives[0].checks[0].status


@pytest.mark.parametrize(
    ("op", "value", "expected"),
    [
        ("<", "10", "supported_failure"),
        ("<=", "10", "pass"),
        (">", "10", "supported_failure"),
        (">=", "10", "pass"),
        ("==", "10", "pass"),
        ("<", "9", "pass"),
        (">", "11", "pass"),
        ("==", "9", "supported_failure"),
    ],
)
def test_independent_threshold_oracles(op, value, expected):
    p = request()
    p["rules"][0]["content"]["semantics"]["operator"] = op
    p["facts"][0]["quantity"] = quantity(value)
    assert status(p) == expected


@pytest.mark.parametrize(
    ("original", "unit", "normalized", "canonical"),
    [
        ("10", "ft", "3.048", "m"),
        ("100", "ft2", "9.290304", "m2"),
        ("45", "%", "0.45", "fraction"),
        ("1.2", "fraction", "1.2", "fraction"),
    ],
)
def test_equivalent_units_and_explicit_ratio_bases(original, unit, normalized, canonical):
    p = request()
    basis = (
        {"numerator": "regulatory_floor_area", "denominator": "regulatory_lot_area"}
        if canonical == "fraction"
        else None
    )
    p["rules"][0]["content"]["semantics"]["threshold"] = quantity(original, unit, normalized, basis)
    p["facts"][0]["quantity"] = quantity(normalized, canonical, basis=basis)
    assert status(p) == "pass"
    p["rules"][0]["content"]["semantics"]["operator"] = "<"
    assert status(p) == "supported_failure"


@pytest.mark.parametrize("mutation", ["definition", "basis", "dimension", "unsupported"])
def test_wrong_definition_or_basis_never_runs(mutation):
    p = request()
    if mutation == "definition":
        p["facts"][0]["definition"] = "manufacturer nominal width"
    elif mutation == "basis":
        p["rules"][0]["content"]["semantics"]["threshold"] = quantity(
            "45", "%", "0.45", dict(numerator="footprint", denominator="lot")
        )
        p["facts"][0]["quantity"] = quantity(
            "0.4", "fraction", basis=dict(numerator="floor_area", denominator="rear_yard")
        )
    elif mutation == "dimension":
        p["facts"][0]["quantity"] = quantity("1", "m2")
    else:
        p["bindings"][0]["definition_support"] = "unsupported"
    assert status(p) == "unsupported_semantics"
    assert evaluate(p).outcome == "needs_investigation"


@pytest.mark.parametrize(
    "mutation",
    [
        "no_binding",
        "no_fact",
        "stale_fact",
        "missing",
        "uncertain",
        "unreviewed",
        "binding_review",
        "applicability",
        "scope",
        "source",
        "design",
        "site",
        "placement",
        "uncertainty",
    ],
)
def test_missing_and_unreviewed_never_pass(mutation):
    p = request()
    if mutation == "no_binding":
        p["bindings"] = []
    elif mutation == "no_fact":
        p["facts"] = []
    elif mutation == "stale_fact":
        p["bindings"][0]["fact"]["revision_id"] = "absent-r2"
    elif mutation in {"missing", "uncertain"}:
        p["facts"][0].update(status=mutation, quantity=None, reason="not supplied")
    elif mutation == "unreviewed":
        p["facts"][0]["provenance"]["review"]["status"] = "unreviewed"
    elif mutation == "binding_review":
        p["bindings"][0]["provenance"]["review"]["status"] = "unreviewed"
    elif mutation == "applicability":
        p["bindings"][0]["applicability"] = "unresolved"
    elif mutation == "source":
        p["sources"][0]["review"]["status"] = "unreviewed"
    elif mutation == "placement":
        p["placement"]["footprint"]["provenance"]["review"]["status"] = "unreviewed"
    elif mutation == "uncertainty":
        p["facts"][0]["provenance"]["uncertainty"] = ["measurement uncertain"]
    else:
        p[mutation]["provenance"]["review"]["status"] = "unreviewed"
    assert status(p) not in {"pass", "supported_failure"}
    assert evaluate(p).outcome == "needs_investigation"


@pytest.mark.parametrize("field", ["conditions", "exceptions"])
def test_accepted_free_text_is_not_executable(field):
    p = request()
    p["rules"][0]["content"]["applicability"][field] = ["Even if labelled reviewed"]
    assert status(p) == "unsupported_semantics"


@pytest.mark.parametrize(
    "relationship", ["depends_on", "exception", "excludes", "overrides", "calculation"]
)
@pytest.mark.parametrize("resolved", [False, True])
def test_references_never_silently_ignored(relationship, resolved):
    p = request()
    c = p["rules"][0]["content"]
    c["references"] = [
        dict(
            instrument="synthetic",
            locator="section X",
            relationship=relationship,
            status="resolved" if resolved else "unresolved",
            target=ref("width-rule") if resolved else None,
        )
    ]
    if not resolved:
        c["runtime_support"] = "unresolved"
    report = evaluate(p)
    assert report.outcome == "needs_investigation"
    assert any(relationship in d for d in report.traces[0].diagnostics)
    assert status(p) not in {"pass", "supported_failure"}


def two_alternatives():
    p = request()
    rule, fact, binding = deepcopy((p["rules"][0], p["facts"][0], p["bindings"][0]))
    p.update(rules=[], facts=[], bindings=[], alternatives=[])
    for alt, limits in (("A", ("5", "10")), ("B", ("10", "5"))):
        refs = []
        for dimension, limit in zip(("width", "depth"), limits, strict=True):
            r, f, b = deepcopy((rule, fact, binding))
            r["identity"] = ref(f"{alt}-{dimension}-rule")
            r["content"]["alternative_id"] = alt
            r["content"]["semantics"]["threshold"] = quantity(limit)
            definition = f"synthetic measured {dimension}"
            r["content"]["semantics"]["measurement_definition"] = definition
            f.update(
                identity=ref(f"{alt}-{dimension}-fact"),
                definition=definition,
                quantity=quantity("8"),
            )
            b.update(rule=r["identity"], fact=f["identity"], measurement_definition=definition)
            refs.append(r["identity"])
            p["rules"].append(r)
            p["facts"].append(f)
            p["bindings"].append(b)
        p["alternatives"].append(dict(pathway_id="synthetic", alternative_id=alt, rules=refs))
    return p


def test_coherent_alternatives_and_ordering():
    p = two_alternatives()
    result = evaluate(p)
    assert result.outcome == "no_match_under_evaluated_pathways"
    assert all(a.outcome == result.outcome for a in result.alternatives)
    for name in ("rules", "facts", "bindings", "alternatives"):
        p[name].reverse()
    for a in p["alternatives"]:
        a["rules"].reverse()
    shuffled = evaluate(p)
    assert shuffled.alternatives == result.alternatives
    assert shuffled.traces == result.traces
    p["facts"].pop()
    assert evaluate(p).outcome == "needs_investigation"


def test_passing_alternative_preserves_unresolved_other_alternative():
    p = two_alternatives()
    p["facts"][0]["quantity"] = quantity("4")
    p["facts"].pop()
    report = evaluate(p)
    assert report.outcome == "candidate"
    assert [a.outcome for a in report.alternatives] == ["candidate", "needs_investigation"]


@pytest.mark.parametrize("coverage", ["outside_coverage", "unresolved"])
def test_outside_coverage_never_excludes(coverage):
    p = two_alternatives()
    p["scope"]["coverage"] = coverage
    report = evaluate(p)
    assert report.outcome == "needs_investigation"
    assert all(a.outcome == report.outcome for a in report.alternatives)


@pytest.mark.parametrize(
    ("approval", "expected"),
    [
        ("unknown", "needs_investigation"),
        ("discretionary", "needs_investigation"),
        ("conditional", "candidate"),
        ("as_of_right", "candidate"),
    ],
)
def test_approval_separate_from_numeric_outcome(approval, expected):
    p = request()
    p["rules"][0]["content"]["approval"] = approval
    report = evaluate(p)
    assert report.outcome == expected
    assert report.alternatives[0].approval == approval
    assert status(p) == "pass"


def test_full_trace_and_failed_placement_are_scoped_and_draft_only():
    p = request()
    p["facts"][0]["quantity"] = quantity("11")
    report = evaluate(p)
    assert report.outcome == "no_match_under_evaluated_pathways"
    assert report.scope == "supplied_placement_only"
    assert report.data_state == "draft_only"
    assert report.request == EvaluationRequest.model_validate(p)
    assert report.traces[0].fact == report.request.facts[0]
    assert report.traces[0].binding == report.request.bindings[0]
    assert report.traces[0].result.evidence
    assert EvaluationReport.model_validate_json(report.model_dump_json()) == report
    assert "release_id" not in report.model_dump_json()
    assert any("universal" in e for e in report.scope_exclusions)


@pytest.mark.parametrize(
    "mutation",
    [
        "version",
        "engine",
        "nested_version",
        "extra",
        "duplicate",
        "stale_input",
        "stale_placement",
        "alternative",
        "evidence",
        "boolean",
        "nan",
    ],
)
def test_reject_malformed_boundaries(mutation):
    p = request()
    if mutation == "version":
        p["schema_version"] = "sr-10.v99"
    elif mutation == "engine":
        p["evaluator_version"] = "other"
    elif mutation == "nested_version":
        p["rules"][0]["schema_version"] = "sr-04.v99"
    elif mutation == "extra":
        p["published"] = True
    elif mutation == "duplicate":
        p["bindings"].append(deepcopy(p["bindings"][0]))
    elif mutation == "stale_input":
        p["facts"][0]["inputs"]["site"] = ref("other")
    elif mutation == "stale_placement":
        p["placement"]["design"] = ref("other")
    elif mutation == "alternative":
        p["rules"][0]["content"]["alternative_id"] = "other"
    elif mutation == "evidence":
        p["sources"] = []
    else:
        p["facts"][0]["quantity"]["value"] = True if mutation == "boolean" else "NaN"
    with pytest.raises(ValidationError):
        evaluate(p)


def test_constructed_and_copied_models_revalidated_recursively():
    p = EvaluationRequest.model_validate(request())
    bad_fact = p.facts[0].model_copy(
        update={"quantity": p.facts[0].quantity.model_copy(update={"value": True})}
    )
    for invalid in (
        p.model_copy(update={"facts": (bad_fact,)}),
        EvaluationRequest.model_construct(**{**p.model_dump(), "schema_version": "bad"}),
    ):
        with pytest.raises(ValidationError):
            evaluate(invalid)


def test_current_real_packet_refused_without_fabricated_inputs():
    path = Path(__file__).resolve().parents[1] / "docs/pilot-inputs/intake-packet.json"
    packet = json.loads(path.read_text(encoding="utf-8"))
    with pytest.raises(ValidationError) as error:
        evaluate(packet)
    missing = {e["loc"] for e in error.value.errors() if e["type"] == "missing"}
    assert {("design",), ("site",), ("placement",), ("bindings",)} <= missing
    # Deliberately no conversion of provisional excerpts/reviews into Evidence.


def test_dict_with_nested_constructed_models_is_revalidated():
    p = request()
    valid = EvaluationRequest.model_validate(p)
    p["rules"] = [valid.rules[0].model_copy(update={"schema_version": "future"})]
    with pytest.raises(ValidationError):
        evaluate(p)


def test_absent_exact_rule_revision_stays_unresolved():
    p = request()
    p["rules"] = []
    report = evaluate(p)
    assert report.outcome == "needs_investigation"
    assert status(p) == "unresolved_reference"
    assert report.traces[0].rule.revision_id == "width-rule-r1"


@pytest.mark.parametrize(
    "mismatch",
    ["rule_scope", "input_scope", "site_conditions", "placement_missing", "unresolved_definition"],
)
def test_scope_and_unsupported_inputs(mismatch):
    p = request()
    if mismatch == "rule_scope":
        p["rules"][0]["content"]["applicability"]["building_role"] = "principal"
    elif mismatch == "input_scope":
        p["scope"]["jurisdiction"] = "elsewhere"
    elif mismatch == "site_conditions":
        p["site"]["conditions"] = ["check a separate regulation"]
    elif mismatch == "placement_missing":
        p["placement"]["footprint"].update(status="missing", geometry=None, reason="not supplied")
    else:
        p["rules"][0]["content"].update(
            runtime_support="unresolved",
            semantics=dict(
                kind="unresolved", text="some measurement", reason="definition not supported"
            ),
        )
    assert evaluate(p).outcome == "needs_investigation"
    assert status(p) not in {"pass", "supported_failure"}


def test_all_blocking_reasons_survive_and_input_not_mutated():
    p = request()
    p["scope"]["coverage"] = "outside_coverage"
    p["facts"] = []
    p["rules"][0]["content"]["applicability"]["exceptions"] = ["unsupported exception"]
    before = deepcopy(p)
    report = evaluate(p)
    reasons = " ".join(report.traces[0].diagnostics)
    assert all(reason in reasons for reason in ("coverage", "exceptions", "fact revision"))
    assert p == before


def test_fraction_wrong_scaling_and_count_comparisons():
    p = request()
    basis = dict(numerator="floor_area", denominator="lot_area")
    p["rules"][0]["content"]["semantics"].update(
        operator=">=", threshold=quantity("1.2", "fraction", basis=basis)
    )
    p["facts"][0]["quantity"] = quantity("0.012", "fraction", basis=basis)
    assert status(p) == "supported_failure"
    p["rules"][0]["content"]["semantics"].update(operator="==", threshold=quantity("2", "count"))
    p["facts"][0]["quantity"] = quantity("2", "count")
    assert status(p) == "pass"


def test_decimal_context_cannot_change_conversion_or_decision():
    p = request()
    p["rules"][0]["content"]["semantics"]["threshold"] = quantity("1", "ft", "0.3048")
    p["facts"][0]["quantity"] = quantity("0.3049")
    with localcontext() as context:
        context.prec = 2
        assert status(p) == "supported_failure"
        p["rules"][0]["content"]["semantics"]["threshold"]["value"] = "0.30"
        with pytest.raises(ValidationError):
            evaluate(p)


def test_long_decimal_conversion_remains_exact():
    p = request()
    p["rules"][0]["content"]["semantics"]["threshold"] = quantity(
        "10000000000000000000000000000.01", "ft", "3048000000000000000000000000.003048"
    )
    p["facts"][0]["quantity"] = quantity("3048000000000000000000000000.003049")
    assert status(p) == "supported_failure"


def test_empty_boundary_has_validation_errors():
    with pytest.raises(ValidationError):
        evaluate({})
