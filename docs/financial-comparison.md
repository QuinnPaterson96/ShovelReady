# Same-property suitability and cost comparison

Implemented for #333 after the [accepted financial scope decision](decisions/financial-comparison.md).
The recipient is the homeowner choosing which alternative to investigate next;
the next action is to open that model or prepare its provider enquiry. A rental
prediction, numerical return calculator, financial winner and professional
assessment checklist are outside this increment.

## November 6 integration

The optional financial question appears for each property project and supports project cost,
potential rental income, both, or skip. An explicit rental-use answer can supply an editable
interest. The choices stay with the project when switching models and can be changed later.
The active model now leads with its cost basis, missing scope, material suitability findings
and a direct action to prepare its unsent quote request. A compact overview of the explored
models precedes the complete records. Changing the active alternative restores its authored
inputs and position, with current checks recomputed. Fresh models can use main's editable
suggested placements. See the [four-model acceptance walkthrough](usability/financial-integrated-2026-11-06/).

## Worker-branch behaviour before integration

An optional **Compare models for this property** disclosure sits beside the model
selector. It shows the current and previously explored models from this property
in the open assessment. The state host owns retention, invalidation and switching;
the comparison consumes an explicit typed snapshot and defensively excludes other
properties. Reloading does not restore editable alternatives. Existing historical
enquiry-text recovery remains separate.

Each alternative retains its selected use, configuration, foundation allowance,
owner affordability preference, approximate placement and provisional findings.
Material conflicts and the detail behind favourable provisional assumptions stay
visible. Unknown and unsupported coverage stay explicit. Changed shared inputs
mark retained findings as needing a recheck; reopening a model uses the host's
ordinary recalculation. Different retained positions or rotations are identified
as different tests, and shared positions do not imply equal suitability.

Captured provider prices retain currency, date, record label and unreviewed status,
with configuration, inclusions, exclusions, tax and source wording in accessible
details. User-entered quotes and assumptions remain distinct from these source
claims. Missing price and unknown currency remain useful questions for a provider.
They do not become zero, a comparable subtotal or a better ranking.

The owner preference, captured starting price, priced-components subtotal and
whole-project estimate have separate labels. The component uses the existing
validated budget pipeline without changing its arithmetic or coverage policy.
Whole-project missing categories are shown even when the owner chose a narrower
draft scope. Costs retain their original context; incompatible, expired or otherwise
withheld amounts cannot silently enter the subtotal. No totals are combined across
models or currencies.

The closing handoff names the missing inputs for a later chosen rental-return
measure: a matching quote/site scope from the provider and installer; local rent,
occupancy and timing evidence from the homeowner; recurring expenses from the
homeowner or property manager; and financing terms from the homeowner/lender if
relevant. None is a prerequisite to an initial enquiry.

## Integration contract

`frontend/src/builder_demo/AlternativeComparison.tsx` exports
`ComparisonAlternative` and `AlternativeComparison`. The props are
`alternatives`, `activeModelId`, and `onSelectModel`. It reuses the catalogue,
existing homeowner `Summary`, `OccupiedMeasurement`, `BudgetDraft` and budget
`Context` types. It introduces no API, database schema, package dependency or
published data. Its dedicated CSS uses the shared Civic Atlas tokens, native
details/summary and the existing control focus/touch dimensions. At narrow widths
the alternative columns become one reading column.

This is an ordinary Operate-mode extension of the existing Civic Atlas workspace.
`docs/visual-identity.md` and `frontend/src/index.css` remain the visual authorities;
the increment introduces no replacement visual system or new token source.

The state worker exclusively mounts the component in `BuilderDemo.tsx` and supplies
same-site retained snapshots. Full exact records remain in the selected model's
technical evidence and ordinary exports; the comparison is a human-facing
projection, not a replacement source of truth.

## Verification and remaining gaps

The dedicated DOM behaviour check exercises three same-property alternatives with
a current attributed starting price plus a user-entered quote, missing captured
price, unknown currency, explicit placement conflict/default and missing coverage.
It also exercises opening an alternative, changed-input withholding and defensive
exclusion of another property. Expected amounts are captured catalogue claims;
the explicit conflict is authored test input, not a claimed evaluator result.

Before host integration, the full frontend suite passed 185/185, TypeScript/Vite
build passed, and the Impeccable mechanical detector returned no findings on the
new component/style. The state worker's combined suite passed 188/188. Independent
finish review requested visible priority-question names, following the existing
homeowner summary pattern; the extended behaviour check and final combined build
passed after that correction. The full browser journey passed at measured 390 ×
844, with a separate desktop comparison inspection at 1440 × 1000; actual screenshots, copy/reload recovery, downloaded
PDF and rendered pages are retained. The existing Vite large-chunk advisory and
static/dynamic `fflate` advisory remain. No database, cloud or live-model calls
were made. Combined browser evidence is recorded under
[the measured-viewport QA folder](usability/financial-comparison-2026-11-04/).

The independent finish reviewer marked the priority-question finding resolved on
the corrected build. This bounded verdict does not certify the whole surface or
human usefulness. November 6 reinspection of the original PDF's embedded image and an
independent render confirmed the complete “Site information” heading on page 2.
The earlier missing-letter finding is withdrawn.

Real configuration-specific quotes and site-cost scope remain missing: totals
cannot yet support a rental-return decision. Providers/property contacts own that
evidence under #124/#125. Controlled dimensions, applicable source/rule review,
site/legal measurements and accepted publication remain independent gates to
accepted real evaluation, owned by the existing source/site review work. Human
understanding and whether comparison improves the next conversation remain
unmeasured under #16/#147; agent/browser verification does not supply that evidence.
The integration owner must reconcile the combined state/export/comparison revision
and required CI before any separately authorized merge or deployment.
