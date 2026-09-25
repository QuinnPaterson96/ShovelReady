# SR-10 bounded evaluator core

This is technical core preparation for issue #10, not completion of the real
pilot checks. It evaluates direct scalar comparisons using supplied reviewed
measurements and exact bindings, then aggregates within declared alternatives.
It does not extract, calculate legal measurements, select placements, write to a
database, serve HTTP, or publish data. No real supported fit has been established.
The starting commit was `2d46a4d`, containing merged #28/#29 and the wave-three
handoff. The shared SR-04 contracts and their readers are unchanged.

## Callable interface

```python
from app.evaluation import EvaluationRequest, EvaluationReport, evaluate

# payload is an explicitly authored sr-10.v1 request, not a SpatialImport,
# intake packet, preview result, or persisted DatasetReference.
report = evaluate(payload)  # dict or EvaluationRequest -> EvaluationReport
saved_json = report.model_dump_json(indent=2)
```

A runnable **synthetic** example from the repository root:

```powershell
python -m uv run --locked python -c "from tests.evaluation_fixtures import request; from app.evaluation import evaluate; print(evaluate(request()).model_dump_json(indent=2))"
python -m uv run --locked pytest tests/test_evaluation.py -q
```

The request requires `schema_version=sr-10.v1`,
`evaluator_version=bounded-scalar.v1`, an evaluation ID, a logical/exact draft
revision and `data_state=draft_only`. There is deliberately **no release ID or
active-publication claim**. A future integration must separately prove accepted
release membership and compatibility before adapting this result for screening.
The [SR-32 bridge](draft-evaluations.md) now stores this complete report in a distinct
immutable diagnostic kind and exposes pinned synthetic cases through a separate API.
The observation API remains separate. There is no implicit release adapter or
latest-revision lookup; [SR-33](draft-evaluation-ui.md) preserves the draft scope.

The request pins full SR-04 design, site and supplied-placement revisions, source
snapshots, exact accepted rule revisions and every declared `Alternative`. Scope
identifies jurisdiction, use, building role, coverage, exclusions and reviewed
provenance. It must agree with input use/jurisdiction and rule applicability.
Scope review is the supplied attestation of applicability/coverage; the core
does not infer current law from capture dates or discover omitted rules.

Each `MeasuredFact` has its own exact identity, all three input references, an
explicit definition, known/missing/uncertain status, optional shared `Quantity`,
and provenance. It represents a supplied measurement record tied to those exact
inputs. It does not select a measurement from a design/site by its name or
dimension. If adapting an existing measurement, preserve its actual evidence,
definition, review and revision; do not invent a new accepted fact from raw GIS.
A missing fact can simply be absent, without manufacturing evidence for it.

Each `Binding` explicitly names an exact rule revision and exact fact revision,
the same input revisions, a matching measurement definition, applicability and
reviewed provenance. `definition_support=reviewed_direct_measurement` means the
supplied quantity is already measured under that definition; the evaluator
performs no definition/calculation execution. Unsupported definition mappings
remain `unsupported`. Binding review must verify subject correspondence and
the complete measurement basis, not merely matching text or dimensions.

Malformed data, unknown versions, extra fields, duplicate identities/bindings,
cross-alternative rule assignment, stale input links, incompatible CRS or evidence
pointing to absent sources raise `pydantic.ValidationError`. The entire request
is revalidated, including nested constructed/copied models inside dictionaries.
Quantity normalization uses sufficient Decimal precision independently of the
caller's context. Missing declared rule/fact revisions are retained as diagnostic
investigation states; no fallback to another revision occurs.

## Supported behavior and trace

The engine implements `<`, `<=`, `>`, `>=` and `==` on existing `ScalarBound`
semantics. Comparisons require identical measurement definitions, normalized
units/dimensions and exact ratio numerator/denominator. Existing `Quantity`
validates original values and unit normalization: 45% equals fraction 0.45;
FSR 1.2 remains 1.2 with its explicit distinct basis. There is no tolerance or
rounding at a threshold. Ratios are supplied reviewed quantities, not calculated
from incomplete numerator/denominator measurements by this engine.

Known reviewed facts, binding applicability, input provenance, placement geometry,
scope and relevant source review are required. Retained uncertainty blocks a
determinate comparison. A missing placement remains investigation. Other geometry
facts may remain missing when they are explicitly outside the declared direct
check's scope; this does not claim comprehensive site verification.

All free-text conditions/exceptions and site conditions are non-executable. All
references block execution, including resolved dependencies, overrides,
calculations, exclusions and exceptions. Resolved identity is not implemented
semantics. Unresolved rule support/applicability also blocks a comparison. No
expressions, source strings or definitions execute as code. This engine does not
produce `not_applicable` from a scope mismatch: it reports outside coverage.

Every rule of every alternative is checked, without short-circuiting a failure.
Alternatives and checks are sorted by identity, independently of input ordering.
No bound is moved between alternatives. The existing `CheckResult` and
`AlternativeResult` models are reused:

- All scalar passes within one alternative can produce a scoped candidate only
  with supplied as-of-right/conditional approval. Numeric passes never infer that
  approval. Unknown/discretionary approval remains investigation; checks still
  retain their numeric pass statuses.
- A failure produces no match only for that supplied placement and alternative,
  with every declared check in that alternative supported. Any unresolved check
  keeps that alternative in investigation, even alongside a scalar failure.
- One passing alternative can produce a candidate while preserving all unresolved
  alternatives. Overall no match requires every alternative to have a supported
  scoped failure. Outside/unresolved coverage prevents both candidates and exclusions.
- Approval is retained separately, conservatively combining rule approvals in
  order: unknown, discretionary, conditional, as-of-right. It is never derived
  from measurements or the numeric outcome.

`CheckTrace` retains the bound fact, binding, exact rule reference, computed check
and **all** diagnostic reasons, including when multiple blockers coexist. The
first blocking reason determines the shared check status; all others remain in
the explanation/diagnostics. The report retains the full validated request,
including sources, hashes, original/normalized quantities, reviews, definitions,
input/rule/draft versions, unresolved relationships and exclusions. Consumers must
retain `data_state`, placement-only scope, approval, alternatives and exclusions;
displaying a numeric pass alone would misrepresent this diagnostic output.

## Compatibility decision and remaining contract gaps

SR-04 `Measurement` has no individual revision identity or explicit rule binding,
and its enum cannot represent supplied regulatory ratios. `DatasetReference` and
`EvaluationResult` require a release-shaped identity even though storage currently
has draft manifests only. Their check shape also lacks a complete fact/diagnostic
trace. These concrete gaps are addressed by the local SR-10 supplement, reusing
`Quantity`, provenance, exact revision references, rules and alternative/check
results. No shared reader, payload or migration changes are required.

This is not a new rule language. Geometry measurement algorithms, conditional
execution, reference evaluation, time applicability, accepted-release adaptation
remain unimplemented. Diagnostic persistence is now supplied by SR-32. Existing
SR-04 input geometry limitations also remain. Revisit these gaps only with actual
reviewed cases and explicit version/compatibility decisions. A schema-valid review
or citation is not proof of source support, review authority or accurate law.

## Verification and real-data gates

`tests/fixtures/evaluation/README.md` records independently calculated synthetic
arithmetic expectations. Tests do not reuse preview results or the provisional
corpus as decision oracles. Input geometry structure is reused from the labelled
synthetic contract fixture, with explicit synthetic measurement/review records.
Tests cover exact thresholds, feet/metres and area units, percentages and FSR
bases, counts, wrong bases/definitions, missing and unreviewed inputs, all reference
relationships, conditions, incompatible alternatives, ordering, approval,
coverage, full trace roundtrips, boundary tampering and failed-placement scope.
The real `intake-packet.json` is passed unchanged to the evaluator and rejected:
it lacks actual design/site/placement revisions and bindings. No `Evidence`,
input revision or review is manufactured for that packet.

Validation commands:

```powershell
python -m uv run --locked ruff check app tests contract_tests migrations scripts docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin'
```

These verify software behavior and existing storage compatibility, not a full
accepted-source-to-screening path, legal accuracy or independent reviewer outcomes.
No frontend, deployment, live extraction or cloud claim is made.

Local verification on September 24, 2026: full backend lint passed; the guarded
PostgreSQL 17 runner passed 195 tests and 28 contract subtests with no skips,
then stopped its newly created cluster. The 76 focused evaluator tests passed
again after the final diagnostic-label refinement (absent rule revision is an
unresolved reference; unknown coverage is a missing fact). The existing
Starlette/httpx deprecation warning remains. No shared database was used.

The next real integration requires the [reviewer actions](pilot-inputs/reviewer-actions.md):

1. Authorized retained source bytes/excerpts/context, current governing instruments,
   complete applicable amendment/reference coverage, and independent attributed
   rule/definition/approval review. All 25 provisional clauses remain unaccepted.
2. A controlled fixed manufacturer configuration and actual exact input revisions;
   reviewed site/placement evidence and definition-specific measurements. Headline
   area, rooflines and geometric parcel area cannot substitute for legal facts.
3. Explicit reviewed bindings for a small supported clause/measurement subset,
   with unit/ratio bases, applicability and omissions justified per placement.
   Unsupported conditions/references need a future evidenced implementation or
   remain investigation. Relabelling them reviewed does not unlock execution.
4. Independently justified real expected outcomes, including failures and unknowns.
   There is no requirement to manufacture a positive fit or wait for all 25 clauses
   before reviewing a genuinely bounded subset.
5. Separate SR-11 publication and compatibility gates, then an explicit SR-12
   screening adapter and SR-13 accepted end-to-end evidence. A stored spatial
   observation or draft manifest is never an active release.

Issue #10 stays open for those gates and actual supported pilot checks.
