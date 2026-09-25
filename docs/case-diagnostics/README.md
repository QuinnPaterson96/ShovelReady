# Offline case preparation diagnostics

[SR-34](../backlog/SR-34.md) implements one bounded Pilot experiment against the
existing SR-04/SR-10 contracts. It produces **`evaluation_not_run`**, not an
EvaluationReport or a legal outcome. The [research packet](../research/case-readiness/plan-measurements/README.md)
remains provisional. No source, rule, fact, release or parent objective is accepted
or published by this tool.

From the repository root, with Python 3.12 and the locked dependencies installed:

```powershell
python -m uv sync --locked
python -m uv run --locked python scripts/diagnose_pilot_case.py
python -m uv run --locked python scripts/diagnose_pilot_case.py --format json
```

Both commands are offline and database-free. They write only stdout. Exit 0 means
the preparation diagnostic completed, including expected boundary rejection; it
does not mean evaluation succeeded. Malformed annotations or manifest drift exit 2.
`--annotations PATH` supports deliberate local experiments; it does not confer
acceptance. No source download, extraction/model call, artifact import or publication
occurs. SR-37 now exposes the same preparation through the fixed read-only API below.

## Inputs and actual mapping

[annotations.json](pilot/annotations.json) is a manually authored transcription of
the merged research summaries, not municipal source bytes or a reviewed oracle. It
pins the July 30, 2018 south-addition proposal received August 7, the historical
cutoff, research source identities, a research-manifest text hash and an annotation
revision. Its creation timestamp is **not** a municipal capture or effective date.
The output separately hashes the exact annotation text after CRLF-to-LF normalization
so Windows and Linux checkouts reproduce the same diagnostic. These two text hashes
must never substitute for an original-source hash. Logged original hashes/times are
carried through only where already present in the manifest, without claiming a new
byte verification. Later application dates remain distinct from completion dates.

The [shared core](../../app/case_preparations/core.py) uses existing `Quantity`,
`RevisionRef`, `MeasuredFact`, `DesignRevision`, `SiteRevision`, `PlacementRevision`,
`RuleReference` and `RuleContent` types. Its small local annotation models remain separate from accepted evaluation inputs. It maps five **uncertain** fact fragments, retains three
threshold claims separately, leaves every required geometry role missing and does
not select a regulatory floor area. The two corner observations keep separate IDs.
The selected design is fixed only as a historical proposal; construction method and
prefab identity remain unknown.

Fragment `Evidence` points explicitly to this manual annotation identity and its
summaries. It is not a municipal quotation or a materialized municipal snapshot.
The tool does not manufacture a SourceSnapshot for those notes to disguise absent
original evidence. These fragments are not a complete importable request: reviewed
original-source evidence and exact bindings are still required. All review objects
are unreviewed, with absent reviewer/time; no `model_construct` or validator bypass
is used. The area and parcel conflicts are calculated from the supplied observations,
and temporal checks withhold incompatible fact fragments without deleting their inputs.

## Observed diagnostic

The checked default input prints this opening (excerpt; the command continues with
source-linked next artifacts and boundary paths):

```text
VIC-PC-002: evaluation_not_run
Selected: 2018-07-30 proposal, received 2018-08-07
Retained 8 observations; mapped 5 uncertain fact fragments.
  separation: 2.6 m (uncertain fact)
  rear-southeast: 0.20 m (uncertain fact)
  rear-northeast: 0.22 m (uncertain fact)
  area-parsed: 22.25 m2 (uncertain fact)
  area-visible: 22.75 m2 (uncertain fact)
  separation-minimum: 2.4 m (claim/context)
  rear-unvaried: 0.6 m (claim/context)
  rear-varied: 0.2 m (claim/context)
```

The JSON contains retained observations/parcel claims, later permit observations,
typed fragments, attempted source payloads, actual Pydantic errors with exact field
paths and source URLs/locators, and next artifacts. It is deterministic for the same
inputs; the human view is a concise rendering of those derived diagnostics.

| Boundary/evidence | Actual result | Consequence |
|---|---|---|
| `EvaluationRequest.rules.0`, `.1`, `.2` | Each rejects an unreviewed rule: `accepted revision requires an attributed acceptance decision` | No valid request; evaluator is not invoked. The gate is preserved |
| Original `SourceSnapshot` attempts | All nine selected source records lack an authorized retained artifact URI; indexed/browser-only sources additionally lack original hash/capture time | Metadata alone cannot become original-source evidence. Error paths and existing metadata are retained |
| Later/current context | PM-PIP, PM-LISTING, PM-M and PM-A source probes are explicitly context-only and excluded from the historical request attempt | Acquiring later plans or listing bytes is not a prerequisite for the 2018 experiment; current law is not backdated |
| Area and legal identity | 22.25/22.75 m2 and Plan 5230/5130 remain distinct | No canonical area or resolved parcel identity |
| Later house | BP055452/BP055453 records remain contextual evidence of replacement | Cannot silently supply geometry or dimensions for the 2018 principal house |
| Rule semantics | 2.4 m historical basis uncertain; rear 0.6/0.2 relationship retains unresolved override/dependency references and conditions | No numeric comparison, favorable outcome or executable variance inferred |

Boundary errors do not exhaust the remaining semantic gaps: Pydantic does not run
every parent validator after child errors. Missing original evidence links, binding
review, geometry, historical applicability and non-executable dependencies are also
explicit preparation diagnostics. An unexpectedly accepted request fails loudly for
adapter review instead of silently beginning evaluation. This is a fixed provisional
experiment, not an alternate evaluator or a general ingestion path for accepted data.

## Verification and handoff

Started from `285b923e8f9eb064e47062c5e6686e89a617c5d9`, after verifying PR #71 merged
and the managed worktree clean. Only the adapter, focused tests and this diagnostic
directory are changed. Existing pytest discovery covers `tests/`, and CI already
lints `scripts/`; no discovery or workflow change was needed.

```powershell
python -m uv run --locked ruff check scripts/diagnose_pilot_case.py tests/test_pilot_diagnostic.py
python -m uv run --locked pytest -q tests/test_pilot_diagnostic.py tests/test_evaluation.py contract_tests/test_contracts.py
git diff --check
```

Focused tests cover actual acceptance rejection and no evaluator invocation, lossless
corner/area retention, changed-value conflict detection, unresolved parcel identity,
later/current source substitution and relabelling, missing original hash/capture data,
retained conditions/override references, explicit missing geometry, forbidden acceptance
fields, manifest drift, duplicate/nonfinite JSON, cross-platform newline reproducibility
and invocation outside the repository directory. The existing offline evaluator and
contract suites run alongside them. The original SR-34 run did not include database, HTTP/UI, source reinspection or live
model checks; SR-37 evidence is recorded below. Final-head CI and exact test counts are in the
PR handoff; software checks do not establish source accuracy or independent acceptance.

The smallest next step is to acquire and review the retained historical source and
measurement-definition subset for C1, then supply exact source evidence/bindings.
`AcceptedRuleRevision` is an intentional gate, not a reason to add acceptance flags
or widen shared contracts. A later implementation may need a dedicated manual-candidate
intake path (`RuleCandidate` currently expects extraction trace artifacts), but this
experiment uses truthful `RuleContent` fragments without inventing a model run. That
is a proposal, not an implemented schema change. Conditional override execution remains
separate work justified only after source review; later approved-plan acquisition is
independent SR-35 work. SR-05/06/10/13, accepted publication and user validation remain open.


## SR-37 read-only investigation and runtime boundary

`GET /api/case-preparations/pilot` returns the typed `pilot-preparation.v1`
diagnostic with `Cache-Control: no-store`. It is the actual shared-core result,
JSON-equivalent to the offline CLI, not an EvaluationReport. Unknown cases return
404, writes return 405, and query parameters (including input paths) return 400.
Invalid/missing packaged inputs or unexpected acceptance produce a generic 503;
private paths and raw exceptions are not returned. No database configuration is needed.

The reusable code now lives in `app/case_preparations/core.py`; the CLI is a thin
wrapper with the existing offline arguments and behavior. Research annotations and
manifest remain canonical in their documentation directories. Runtime copies in
`app/case_preparations/data/` are an explicit packaging boundary: the focused test
compares normalized text hashes against both canonical files and fails on drift.
Update reviewed canonical inputs first, then copy them verbatim and regenerate the
consumer schema/fixture. There is only one maintained diagnostic implementation.
The existing Dockerfile recursively copies `app/`, so this API does not depend on
`docs/` or `scripts/` in a container. An isolated subprocess smoke test copies only
`app/` and exercises the registered HTTP endpoint without repository PYTHONPATH.

`frontend/src/case_preparations/PilotPreparation.tsx` exports a standalone default
component with no props. It fetches the bounded endpoint, validates the producer's
serialization schema, and owns loading/error/empty/reload handling. Reload immediately
clears prior evidence and cancels/suppresses stale success and failure responses.
Summary and next artifacts precede expandable observations, source links, dates,
revision hashes, missing fields, conditions and raw diagnostic JSON. Only explicitly
allowed HTTPS evidence hosts become links; arbitrary artifact URIs are inert text.
Scoped inline styles avoid changes to global styles or the shared banner.

Integration now wires this component into the main navigation and input flow,
adopts the shared amber status banner, and includes its tests in recursive frontend
test discovery. See [wave-nine integration](../integration-wave-nine.md) for the
combined API/database/browser verification. Original branch checks follow.

Focused verification commands (repository root; Python 3.12, locked dependencies):

```powershell
python -m uv run --locked pytest -q tests/test_pilot_diagnostic.py tests/test_case_preparations.py tests/test_evaluation.py contract_tests/test_contracts.py tests/test_reference_cases.py
python -m uv run --locked ruff check app/case_preparations app/main.py scripts/diagnose_pilot_case.py tests/test_case_preparations.py docs/research/public-cases/verify_inventory.py
python -m uv run --locked python docs/research/public-cases/verify_inventory.py
npx --prefix frontend tsx --tsconfig frontend/tsconfig.app.json --test frontend/src/case_preparations/pilot.test.tsx
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

The API test also detects generated JSON schema/real producer fixture drift. Regenerate
those files with `PilotPreparation.model_json_schema(mode="serialization")` and
`prepare_pilot().model_dump_json(indent=2, exclude_unset=True)` from
`app.case_preparations.api`. The copies are verification artifacts, never runtime
summaries. SR-34's behavioral tests remain unchanged and continue testing altered
inputs, temporal incompatibility, conflicts and acceptance refusal through the CLI's
shared-core imports. No shared database, source fetch, live model, acceptance or
publication is part of these checks. Source review and legal interpretation remain
unverified; exact run results and container availability are in the PR handoff.
