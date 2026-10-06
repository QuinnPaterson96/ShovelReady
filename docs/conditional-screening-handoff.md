# Conditional screening evaluator handoff

This isolated `conditional-screening.v1` mode compares explicit candidate rules with
supplied facts for one placement. It does not call, adapt, publish, or relax the
accepted-data evaluator in `app/evaluation/`. Its output has no overall legality or
positive-fit verdict. Every result carries the whole pinned request, rule revision,
source label, locator, capture date, currentness limitations, input origin, measurement
definition, and original quantity. Numeric checks also carry exact normalized values.

## Proposed integration boundary

```python
from app.conditional_screening import evaluate

# request is a dict or Request. See tests/test_conditional_screening.py for a
# runnable synthetic example. The packet and property adapter must author all
# rules, applicability states, facts, and input revisions explicitly.
result = evaluate(request)
serialized = result.model_dump(mode="json")
```

The request pins packet, property, placement and model revisions. The integrator must
discard a response if any revision changed while it was in flight. A boundary rule
identifies one specific measured edge through `fact_id`, plus its required side, rear,
or flanking-street role and definition. A consumer should create one explicit rule
instance per edge/measurement; this engine does not classify parcel geometry, infer
frontage, or measure wall distances. A principal-building separation fact must use a
wall basis. A floor-area fact must match the rule's exact regulatory definition;
nominal footprint and marketing interior area cannot substitute.

The adapter must supply pathway prerequisites and possible exceptions using
`required_pathway_facts` and `unsupported_if_true` on every affected rule. An unknown
pathway or exception blocks that comparison. A true unsupported exception reports
`unsupported`, while independent checks continue. A false prerequisite reports an
apparent conflict; dependent numeric checks require more information and retain the
contradiction in their reasons. `not_applicable` is accepted only as an explicit
rule applicability assertion with a reason, for example a confirmed interior lot
without a flanking line. The integrator owns evidence for that assertion.

The five result states are `meets_under_assumptions`,
`apparent_conflict_under_assumptions`, `needs_information`, `not_applicable`, and
`unsupported`. Coverage counts and outstanding reasons accompany them. A geometric
conflict concerns the supplied placement only. Do not turn a candidate rule's
`reviewed` source label into an accepted release claim. A citation and passing tests
cannot establish current law or correct legal interpretation.

## Verification and limits

`python -m uv run --locked pytest tests/test_conditional_screening.py -q` exercises
synthetic threshold arithmetic, equivalent units, mixed determinate and unresolved
checks, boundary roles, wall versus roof geometry, area definitions, contradictory
pathway facts, exceptions, and malformed input. Exact expected distances and area
conversion use the international foot definition; no evaluator output is used as
the oracle. This proves the bounded software behavior, not source review.

Still needed for a usable demo: a reviewed integration mapping from the candidate
Victoria packet and property-assumption payload, plus a UI/API path with stale result
invalidation. The integration owner should keep geometry-only observations visible
when a measurement is unresolved. For accepted real evaluation, independent legal
review, verified current applicability, controlled model and site measurements,
accepted publication, and human validation remain separate gates. The source reviewer
must resolve Victoria's conflicting consolidation labels and measurement conventions;
the data owner must publish any accepted revisions separately. No real-site comparison
or legal accuracy claim is made by this module.
