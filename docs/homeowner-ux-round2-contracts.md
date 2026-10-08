# Homeowner UX round 2 integration contracts

Base: main `0a8af322` plus the reviewed prefab-generalization PR #295 head
`3a0edd4`, combined on the integration branch only. No main merge/deployment is
authorized for this round. Do not alter active source publication.

Decision: help a homeowner determine whether discussing a selected prefab with its
provider is worthwhile. Provider enquiries request advice; planning questions remain
distinct. Full evidence is accessible separately. Exact cases: 601 Su’it Street,
419 Cecelia Road and the saved example.

## Ownership

- Integration owner: BuilderDemo.tsx, ExampleProperty.tsx, shared app/coordinator
  wiring, builder-demo.css, journey integration tests and combined handoff.
- Property worker: site_discovery/*, focused candidate comparison modules/fixtures
  and tests. Additive selection metadata is allowed; existing raw provenance stays.
- Results worker: HomeownerSummary.tsx/css, victoriaSummaryAdapter.ts,
  projectSettings.ts, new intended-use and result-retention modules/components,
  BoundaryMapTools.tsx/boundary-map.css and focused tests. No SiteAssumptions.tsx
  or BuilderDemo.tsx edits; send integration instructions.
- Output worker: manufacturer.ts, enquiry.ts/EnquiryPreview.tsx if needed,
  placementExport.ts, new export option components/scoped styles and output tests.
  No BuilderDemo.tsx edits; send integration instructions.

## Minimal shared interfaces

Property remains `Confirmed` (selected.v1 or confirmed.v1). Address label is not
parcel identity. Any equivalence grouping must compare actual geometry and meaningful
source identity attributes and retain all underlying source records. Worker supplies
a compact component and any additive metadata; parent resets only property-dependent
state, retaining project/contact preferences that do not describe the old property.

Intended use remains the `EnquiryInput.intendedUse` string and
`ProjectSettings.proposal.proposed_use` with attributed evidence. Use one exported
mapping helper from the results slice for early input and scenario change. Explicit
Not sure maps to unknown; office/nonresidential maps outside garden-suite comparisons.
Blank input must not imply indecision. Model switching follows #295, preserving site
facts and appropriate homeowner context, clearing model-specific results/overrides.

Finding semantics remain `Summary`/`SummaryCheck` and existing scenario/screening
payloads. Display category consolidation must not change evidence statuses or
acknowledgements. Results worker supplies an optional `updating` presentation contract
and a small retention helper/hook keyed by property/model scope and evaluation input.
Parent retains a prior coherent display during same-scope recalculation, guards
responses by current request identity, and excludes stale results from exports and
readiness. Property/model switches may never retain the old scope's display.

Outputs consume current `EnquiryDocument`, current measured placement and selected
model; do not introduce a second findings evaluator. Output worker supplies a readable
enquiry PDF generator and primary-save component; parent owns readiness/export guards
and passes only coherent current inputs. PNG/Markdown/evidence/package stay available.
Accessible help works with details/button activation, touch and keyboard, with no
mandatory tutorial. No automatic street-context work (existing #289 research).

Workers commit explicit owned paths with personal identity, verify focused behavior,
return reviewed commits and draft PRs targeting the integration branch. They never
merge or deploy. Parent integrates property/results first, then reconciles outputs,
reviews combined diff, runs meaningful regression journeys and inspects actual PDFs.
Software replay, live source inspection, parent UI review and human validation are
separate evidence categories.
