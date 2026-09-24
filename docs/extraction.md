# SR-07 offline extraction preparation

This implements saved-response replay, conservative scalar normalization, contract
validation and benchmark/context eligibility checks. There are no provider calls,
prompt changes, tuning, database writes or publication. SR-07 / issue #7 remains
open: accuracy, live-run cost, review time and correction time are **not measured**.

## Commands and interface

Run from the repository root using the existing locked Python environment:

```powershell
python -m uv run --locked python -m app.ingestion replay `
  --response tests/fixtures/extraction/valid.response `
  --metadata tests/fixtures/extraction/metadata.json `
  --prompt app/prompts/document_parsing `
  --output "$env:TEMP/shovelready-synthetic-replay-1"

python -m uv run --locked python -m app.ingestion eligibility `
  --corpus docs/pilot-inputs/corpus.json

python -m uv run --locked python -m app.ingestion check-context `
  --corpus docs/pilot-inputs/corpus.json --window <window.json> --text <window.txt>
```

Replay requires a new output directory; existing output is never overwritten. Its
`response.bin`, `prompt.bin` and `metadata.json` preserve exact input bytes. The
versioned `report.json` records SHA-256 for each, relative artifact URIs, run ID,
source snapshot IDs, searched scope, expected parameters, supplied model/settings
and provider metadata, run failures, parser version and target schema. Resolve
artifact URIs relative to that export directory. An interrupted filesystem write
can leave a partial diagnostic directory; only a complete, hash-verified report is
a usable export. This is a local diagnostic bundle, not a persistence alternative.
Store private runs in authorized restricted locations and keep credentials out of
metadata. Console output contains states rather than private response content.

Exit codes: `0` means all replay fields normalized (still unreviewed) with no
unresolved auxiliary objects, or context checks passed; `2` means
unresolved/quarantined fields, auxiliary objects or blocked eligibility;
`1` means invalid command input/metadata or a filesystem failure. Malformed response
bytes are retained with a report and exit `2`. Malformed metadata is rejected with
exit `1`; it cannot establish run/source identity. Missing output is `omitted`,
never an absence claim. Run failures block normalization even with parseable bytes.
When parsing also fails, both the malformed state and metadata run failures survive.

Python boundaries are `RunInput`, `parse_response`, `normalize_scalar`,
`validate_content`, `replay`, `ReplayReport`, `ContextWindow`, `context_issues` and
`assess` in `app.ingestion`. The fixture metadata is a complete runnable example of
`sr-07.replay.v1`. Unknown fields and versions are rejected. `origin=synthetic`
rejects model/settings/provider metadata rather than inventing a model execution.
For `saved_provider_response`, actual supplied metadata is retained; unknown model
or settings stay null. Seeds, where recorded in settings, do not promise reproducibility.
The supplied prompt bytes identify the prompt associated with the saved response;
using the historical prompt for a synthetic fixture identifies its format reference
only. A future baseline must verify it matches the unchanged historical prompt.

## Supported mapping and explicit limits

The historical prompt requests up to three top-level objects. The parser reads
that sequence without JSON repair, fence stripping, duplicate-key overwrites or
partial recovery. Auxiliary rule/calculation objects remain in raw bytes and are
explicitly flagged unresolved; no expressions execute and no external references
are automatically resolved from a paraphrase in Part 2.
Empty or whitespace-padded parameter names quarantine the response as malformed,
retaining exact bytes instead of dropping the diagnostic bundle or stripping names
into another field's identity.

Only the historical five-key scalar shape is normalized. Callers must supply
field context with candidate ID, pathway/alternative, measurement definition,
dimension, explicit operator, evidence (excerpt **and** surrounding context) and
applicability. Supplied logical/revision identities are retained as proposals;
the adapter does not infer identity from a section or hash. Unknown identity stays
null. Evidence must reference the declared source snapshots. Evidence supplied by
an adapter/reviewer remains distinguishable from the untouched model response.

Conversions use existing `Quantity` units and Decimal arithmetic. Ratio/rate
numerator and denominator must be explicit and the returned denominator must
agree. Percent versus fraction encoding must be supplied explicitly, never guessed
from magnitude: the historical prompt allows `0.10` for 10%. Operator direction
must agree with the flags; inclusivity comes from supplied context, not a guess.
Wrong basis/dimension, contradictory flags, nonnumeric expressions and malformed
quantities cannot produce a normalized rule. Conditions and exceptions are not
flattened into a scalar permission. Noncanonical unit spellings remain unsupported
by this bounded adapter instead of silently changing meanings.

Normalized output uses current `RuleContent`, `ScalarBound`, `Quantity` and
`Evidence`, with `runtime_support=unresolved` and `approval=unknown`. Unsupported
conditions and unresolved references can retain `UnresolvedSemantics` plus supplied
evidence. No accepted revision or verified applicability is created. An apparently
valid citation still needs a human source-support check. Unknown or missing values
never become zero, unlimited permission or prohibition.

Distinct states include `malformed`, `ambiguous`, `unsupported`,
`unresolved_reference`, `missing_evidence`, `invalid`, `omitted`, `run_failed`,
`not_found_reported`, `not_applicable_reported` and `normalized`. The extended
`{"status":"not_found"}` sentinel is a replay input convention, not wording from
the original prompt and not a reviewed absence finding. `N/A` likewise stays an
unreviewed applicability claim.

Concrete shared-contract gaps, deliberately not resolved by changing the ontology:

- `ExtractionTrace.model` is mandatory and has no synthetic/unknown-model state or
  settings. The versioned replay envelope preserves these honestly; no synthetic
  trace is smuggled into a persistence run.
- `RuleCandidate` lacks separate unsupported, unresolved-reference, omitted and
  unreviewed-not-found extraction tags. Replay outcomes preserve these; mapping to
  that boundary needs a deliberate adapter, not relabelling as reviewed absence.
- A historical `conditional_rule:` identifier alone lacks the instrument, locator,
  relationship and reviewed target required for `RuleReference`. The original
  identifier survives in unresolved text and raw bytes; no target is invented.
- Thresholds, comparisons, calculations, use categories and conditional logic are
  outside the executable scalar contract. Supporting any requires actual reviewed
  failure evidence and a scoped versioned change, not a universal rule language.

There is no repository import in this slice. A later persistence adapter must
preserve these distinctions, use immutable IDs and the existing atomic
`Repository.import_records` interface. Replaying to an export never accepts data.

## Corpus and context gates

`eligibility` reuses the current strict `pilot-corpus.v1` intake model. It reports
all 25 actual entries as blocked/ineligible with per-clause reasons: null authorized
excerpts/context, absent independent review, unaddressed disagreement review and
the supplied rights/applicability/dependency blockers. It returns null accuracy,
cost, review seconds and correction seconds, never 0% or a successful empty run.
Flipping a benchmark flag is rejected by the current intake schema. A reviewed
corpus requires a separately agreed versioned boundary; this task does not weaken
the provisional one or rewrite the packet.

`ContextWindow` requires `sr-07.context.v1`, `kind=clause_window`, split, clause IDs,
source snapshot ID, hashed artifact and a shared `Review`. The check rejects unknown
or duplicate clauses, hash/source mismatch, missing authorized excerpts, absent
attributed acceptance, cross-split content and incomplete declared dependency
context. It checks every selected clause, including dependencies, so dependency
closure must be included within the same split. H is explicitly forbidden in
development windows. The current packet cannot pass these checks.

These are necessary checks, not automatic text leakage detection. An attributed
human boundary review must verify every included text span/diagram against pinned
bytes and exclude undeclared held-out content. Do not feed the combined corpus,
intake packet, queue, full PDF or all of page 27 to a development prompt. Reserve
H (height/grade, clauses 13–15), its diagrams, examples and related dependencies.
If independent review discovers cross-split dependencies, regroup and record the
split revision **before** any tuning. The holdout cannot claim independent
end-to-end site evaluation while sharing development applicability definitions.

`Scorer.compare(expected, observed)` is the future comparison protocol, with the
dimensions listed in the eligibility report: omissions, applicability, values,
unit/ratio bases, evidence, dependencies and consequential outcome changes. There
is deliberately no numerical scorer invoked for `pilot-corpus.v1`; implementing
the reviewed-case adapter and dimension judgments requires the accepted reference
schema. Synthetic state assertions are not passed off as accuracy comparisons.

## Remaining measured-benchmark gates

1. Resolve authorized durable source/excerpt retention; obtain independent named,
   dated reviews of exact clauses, full context, applicability, dependencies,
   expected interpretation and disagreements, as listed in
   [reviewer actions](pilot-inputs/reviewer-actions.md).
2. Version the reviewed reference corpus and context windows; freeze development
   and H holdout membership with leakage/dependency review. Implement the reviewed
   adapter and scorer judgments without promoting provisional annotations.
3. Record manual-baseline production time and attributed review **and** correction
   time per case, including failures. Obtain an explicit bounded live-run budget
   and model/settings choice. None is authorized or measured here.
4. Run the unchanged original prompt baseline first; retain request context,
   prompt bytes, actual model/settings, every response/failure, usage and actual
   billed cost. Review dimension-specific omissions/errors and consequential
   changes with counts and examples, including unsupported/investigation share.
5. Only then make evidence-driven prompt changes using development windows and
   compare on the frozen held-out windows. Record changed decisions and human
   effort; report actual repeated-run variability where warranted. Keep live
   calls out of ordinary CI. Accepted data/publication is a separate gate.

## Verification

The focused offline tests use labelled synthetic responses, not legal rules:

```powershell
python -m uv run --locked ruff check app tests contract_tests migrations scripts docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py
python -m uv run --locked pytest -q
python -m uv run --locked python docs/pilot-inputs/test_acquire.py
python -m uv run --locked python docs/pilot-inputs/test_intake.py
python -m uv run --locked python docs/usability/check_fixtures.py
```

Actual local results on September 24, 2026 (Python 3.12.3, locked dependencies):

- All 33 focused extraction tests passed. Checks include retained bytes/hashes and
  report roundtrip, immutable export path, failure metadata, source/citation guards,
  exact foot/percent conversion, state preservation, strict malformed JSON handling,
  current-corpus rejection of invented eligibility, H exclusion and context CLI gates.
- Full offline pytest: 70 passed, 28 contract subtests passed; 21 PostgreSQL tests
  skipped because no explicit disposable database was configured. There are no
  persistence changes in this slice. The existing Starlette/httpx warning remains.
- Full backend lint passed; 2 acquisition, 10 intake and 3 preview fixture checks
  passed. Shared dependencies, CI, pilot data and the original prompt are unchanged.
- Actual corpus inspection reports 25 blocked entries and no accuracy/cost/timing
  measurement. No source review, live model, cloud, database or frontend change was
  performed. Required remote checks are reported on the PR separately.

Integration review on September 24 reproduced and fixed invalid parameter names
losing their diagnostic bundle and unresolved auxiliary objects returning CLI
success. Four added regression cases pass (37 focused extraction cases total).
The branch passes full lint and 95 pytest cases plus 28 contract subtests using a
new isolated disposable PostgreSQL 17 cluster, including all persistence checks.
