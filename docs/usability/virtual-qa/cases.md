# SR-28 case library and exact display controls

Implemented against [SR-27](protocol.md) for [SR-28 / #52](../../backlog/SR-28.md):
five bounded task cases and three paired detection controls. All case/rubric revisions
are `1`. The [preparation note](preparation/sr-28.md) remains historical reasoning;
the files and interfaces described here supersede its proposed handshake.

## Files and evidence

Each [case file](../../../tests/fixtures/virtual_qa/cases) is a single existing
`CaseDefinition`, parsed with `CaseDefinition.model_validate_json`. Use
`CasePin.from_case` to freeze the complete brief, fixture references and rubric;
never send the full record to participants. `participant_brief` is the only task text
to export. `facilitator` holds expectations, review scope and seeded-fault metadata.
There is no competing case/run/finding schema.

| Task case ID | Scored checks | Existing input and scope |
|---|---|---|
| `vic080-evidence` | `identity`, `observations`, `limits-next-inputs`, `source-currency` | Licensed `site-80` parcel/zoning/roofline feature 0, collection `victoria-pilot-three-leads`, exact observation revision in recipe. Observed UI facts, not reviewed land-use facts. |
| `synthetic-a-candidate` | `bounded-candidate`, `ratio-evidence` | `example-1`: one coherent saved alternative; 0.40 ≤ 0.45 fraction, original 45%, occupied-site-area / lot-area basis. No actual fit/permit. |
| `synthetic-c-negative` | `bounded-failure`, `setback-evidence` | `example-3`: 1 m versus 2 m minimum; failure of supplied placement, not universal site exclusion. |
| `synthetic-e-conditional` | `unresolved-condition`, `source-dates` | `example-5`: Schedule X absent, conditional approval unresolved; capture is not legal effective time. |
| `synthetic-f-correction` | `preserved-original`, `correction-scope` | `example-6`: archived release 1 / A-r1 / 45% versus corrected release 2 / A-r2 / 35%; same snapshot, design, site and placement. |

Synthetic checks describe authored software assertions, never independent legal
expectations. The existing source is `docs/usability/synthetic-source.txt`, snapshot
`synthetic-preview-snapshot-v1`; source SHA, fixture file SHA and JSON-pointer locators
are in each record. Legal effective dates remain unknown. Rule/release/result identities
stay visible and are specified by each expectation. Actual full design/site/placement
inputs and evaluator calculations are absent from this saved preview.

The observational case uses `observed.test.json` as an offline evidence reference,
not an application fallback. Its historical bytes contain a cp1252 degree sign;
offline checks explicitly decode that file as cp1252 and retain its raw byte hash.
The runtime case requires the real licensed import into a fresh owned database.
The existing SR-26 [report](../wave-five/findings.md) supports visible facts and warns
against scoring hidden existing-use/count/frontage requirements. No new VIC-080
browser/database run is claimed here. No public historical packet is substituted.

Retain the [licensed-data attribution and rights chain](../../pilot-inputs/acquisition-evidence.md):
Contains information licensed under the Open Government Licence - City of Victoria.
Only the previously retained licensed JSON and repository fiction are used. No bylaw
PDF, manufacturer drawing, private capture or additional municipal text is redistributed.
GIS observations and fictional structural review do not satisfy independent source review.

## Paired controls and review

Each pair has two case IDs, `<pair>-clean` and `<pair>-fault`, in `defect_detection`
mode. Both receive the identical neutral brief and the same selection instruction.
Each has one scored check, `control-observation`. A clean expectation means no
specified seeded defect observed; it does not mean the whole app is defect-free.

| Pair ID | Single seeded display difference | Browser-visible basis |
|---|---|---|
| `evidence-access` | Omit A's evidence disclosure only | Clean A opens section A, threshold, source hash/capture. Fault A cannot open that evidence at its result. The preview has no source hyperlink; this deliberately substitutes missing disclosure access for a nonexistent link. |
| `unit-display` | C threshold unit `m` → `ft` only | Fault shows `>= 2 ft (original: 2 m)` beside the unchanged section C and explanation. No legal knowledge or external retrieval needed. |
| `affirmative-label` | E top headline `Needs investigation` → `Candidate` only | Alternative still needs investigation; Schedule X absent, conditional approval and source remain unchanged. |

[Facilitator browser review](browser-review.md) records all six controls, exact build
identities and a comparison of all six displayed scenarios in each build. Only the
selected scenario differs, with the exact differences above. This is an author/facilitator
review, not independent source acceptance, participant detection evidence or human study.
No reviewer disagreement arose in that review; independent review is not claimed.

All A/F cases and evidence controls share group `occupancy-a-f`; C and its controls
share `setback-c`; E and its controls share `schedule-e`. These are `development` split.
VIC-080 is the fixed `baseline` group `vic080-observations`. A five-case fixed pilot
must explicitly include the five task IDs above, including development cases; the split
label alone does not select all five. Named reserved group `reserved-future` has no
authored members yet. B/D were already exposed in prior rubrics/rehearsals and are not
untouched holdouts. Do not split related task/control cases across tuning and holdout.

For grading, bind findings to the frozen case/check. `origin="rubric_check"` must name
`control-observation` for these control judgments; `origin="unsolicited"` uses null
`check_id` for additional discoveries and remains outside checklist denominators.
Never modify a frozen rubric to accommodate a discovery. Preserve clean false alarms,
missed faults, unsupported conclusions and tool failures separately. SR-30 owns actual
grading; this library contains no fabricated participant responses or success rates.

## Recipe boundary agreed with SR-29

[Recipes](../../../tests/fixtures/virtual_qa/recipes) are finite execution inputs,
one per case. SR-29 owns their loader, receipt, ownership checks and process execution.
SR-28 supplies data/assets and offline content checks; it adds no runtime hook.

```text
schema_version: "virtual-qa-materialization/v1"
baseline_commit: "303b40aeb9e69f476878959148ed299cad2a5e9b"
case_id / case_revision: exactly the corresponding case ID / "1"
data: existing SR-27 DataIdentity (Metadata wrappers for identity/revision)
entry_path: "/"
replacements: [{path, before_sha256, after_sha256, asset}]
```

`path` has one allowed value: `frontend/src/preview/InvestigationPreview.tsx`.
`asset` is relative to `tests/fixtures/virtual_qa`, e.g. `assets/unit-display.tsx`.
Every asset is a reviewed full replacement file; no arbitrary patch command or
expression is evaluated. Clean/task recipes have no replacements. Fault recipes have
exactly one. Before/after hashes are SHA-256 of Git blob bytes, with LF pinned for the
pack by its own `.gitattributes`. The earlier preparation checkout hashes differ where
Windows translated line endings. [Baseline pins](../../../tests/fixtures/virtual_qa/baseline-hashes.json)
record canonical bytes for original fixtures, source and renderer.

The runner must require explicit owned scratch/output paths, preserve the baseline,
verify preimage and asset hashes before writing, and apply only to a disposable clone
with `core.autocrlf=false`. Make the modified clone a local clean derived commit using
the required personal identity; retain baseline commit separately from derived commit,
tree, recipe and build digests. The local commit SHA can change with commit metadata;
the exact asset bytes and resulting tree are deterministic. Never bypass the demo
launcher's clean-tree check or present a changed build as the baseline.

Serve application assets only, with no facilitator files or fault selectors in the
normal application. The conditional display expressions exist only in replacement
assets and disposable derived builds. No checked-in production source changes.
Do not copy this fixture directory into the served build. Recipe/asset names and
metadata are facilitator-only; the intentional visible defect is the sole test stimulus.

Synthetic data identity is `synthetic-preview` / `synthetic-preview-v1`, no DB.
VIC-080 recipe pins the observation collection and exact spatial revision, not an
accepted release; use explicit fresh scratch configuration and existing start/migrate/
seed helpers. A seed mismatch is a preparation failure requiring reconciliation, never
permission to use a newer/shared/default database. The runner receipt must preserve
case/recipe pins, actual loopback URL, app/frontend and data identities, replacement
verification, owned handles and cleanup status. Receipt serialization is SR-29's scope.

## Verification and remaining gates

From the repository root:

```powershell
python -m uv run --locked python -m pytest -q contract_tests/test_virtual_qa_fixtures.py contract_tests/test_virtual_qa_contracts.py
python -m uv run --locked ruff check contract_tests/test_virtual_qa_fixtures.py
```

42 checks passed locally: contract validity, pinned local references/JSON locators,
case/recipe binding, paired briefs and groups, exactly intended source differences,
unchanged baseline bytes, and absence of fixture imports in app/frontend code.
These are offline and picked up by existing CI; no workflow edit is needed. New
fixture tests import no database/application fixtures. Four isolated frontend builds
and actual browser review are recorded separately; they do not prove legal truth.

Implemented and verified: library, reviewed exact assets, recipe handshake, offline
checks and facilitator control review. Combined SR-29 runner preparation/cleanup and
SR-30 grading calibration are separate integration evidence, not established by the
one-off browser review. SR-31 owns any participant pilot. Accepted source/site review,
publication and real-user validation remain open. No parent objective is closed here.
