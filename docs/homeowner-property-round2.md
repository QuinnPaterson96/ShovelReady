# Property selection slice — homeowner UX round 2

Base: integration of main `0a8af322` and prefab generalization `3a0edd4`.
Scope: homeowner property selection and changes, items 1–4. The integration
owner owns BuilderDemo wiring, preference retention, downstream warning
consolidation and combined enquiries/exports.

Recipient: a homeowner deciding which mapped parcel to explore. Show meaningful
PID and approximate area, keep complete source records accessible, and make the
next choice concrete. Source selection does not establish legal identity.

## Live source inspection

Captured on October 7 local time (October 8, 2026 01:22 UTC) using the existing
BC Geocoder and municipal API adapters. Exact normalized responses, raw source
bytes, query URLs, capture timestamps and hashes are retained in
`frontend/src/site_discovery/suit-live.fixture.json`. No owner/contact data was
requested. Ordinary tests replay this fixture offline.

BC's civic suggestion is **601 Su'it St, Victoria, BC**. The municipal exact
address search must use that returned street address; a direct curly-apostrophe
municipal query returned no match. The current transport already uses the
geocoder's returned street address and needs no normalization change.

| Source attribute | Parcel 13343 | Parcel 13344 |
|---|---|---|
| PID | 008-094-764 | 008-094-772 |
| Victoria parcel identifier | V02191018 | V02191024 |
| GISLINK | 03219020 | 03219020 |
| Address record | 8675 | 8675 |
| Type / status | LA / ACTIVE | LA / ACTIVE |
| Mapped area, m² | 756.0439944180146 | 755.6244347261741 |
| Roof 63036 intersection, m² | 123.20551430936364 | 156.3987633529192 |
| Roof 70284 intersection, m² | absent | 29.267656670320036 |

The parcel polygons differ and are adjacent: Shapely geometric equality is false,
intersection area is 0 m², distance is 0 m, and symmetric difference area is
1511.6684291441886 m². **These are not duplicate candidates.** Their equal address
label and near-equal areas must not collapse two separate PIDs.

Roof 63036 has mapped area 282.49081836280817 m² and spans both polygons. Roof
70284 has area 29.406033498403986 m². The returned roofs are unreviewed aerial
outlines, not surveyed walls or ownership evidence. This inspection establishes
what these public responses contain; it does not establish ownership, whether
the two parcels form one legal development site, or applicable building rules.

## Implemented

- Candidate buttons distinguish PID, approximate area and active status.
- Potentially equivalent identities require observed geometry before grouping.
  Matching PID, GISLINK, Victoria parcel identifier, type and status plus exact
  geometry (independent of ring start/winding/order) can collapse repeat joins.
  Full grouped candidate records, source evidence and observation records stay
  recoverable. Unknown attributes/failed geometry and different geometry or
  meaningful attributes remain separate. No positional tolerance is introduced.
- Compact `SelectedProperty` displays Change property, one concrete same-address
  conflict when known, and accessible source/roof help. Any nonzero outside-roof
  amount stays visible in help, including `< 0.1 m²`; no arbitrary mismatch
  threshold is used. Distinct parcel identity/geometry, rather than a percentage
  cutoff, offers Inspect another parcel candidate. Missing identity attributes
  alone do not produce a conflict warning.
- `Parcel.identityConcern` survives into placement capture limitations for enquiry
  reconciliation. `Confirmed` variants and raw source contracts remain unchanged.
- Deliberate changes use neutral selection wording; `changeProperty()` clears
  discovery state and notifies the host with null. Existing `reject()` remains a
  compatible alias. Property/project preference distinction is a host concern.

## Integration wiring

Import `SelectedProperty` from `site_discovery/SelectedProperty`. Props:
`value: Confirmed`, `onChangeProperty`, optional `onInspectAlternatives` and
`onRetryObservation`. The latter should retry the source, clearing dependent
inputs/results before accepting the replacement. Do not remove the partial-roof
recovery path when replacing the old host summary.

Keep SiteDiscovery mounted when the placement view is active. Its additive
`inspectKey` reopens the existing candidate list without clearing current
selection; incrementing `resetKey` starts a neutral property change. Showing
choices alone preserves current evidence; actually choosing another parcel
invalidates it. If the host unmounts discovery, recover candidates with the
retained address search rather than presenting a dead alternate-selection action.

Host reset should clear property facts, geometry/placement, municipality-derived
facts, findings and acknowledgements, keeping compatible model/use, budget,
timing and contact/project preferences. Keep explanation consistent with that
actual reset. Root owns combined tests for these boundaries.

## Verification and remaining gaps

Focused discovery/parcel/map replay: **26 passed**, including actual Su'it source
conversion -> selection -> placement provenance, duplicate joins with preserved
evidence, missing/different geometry, tiny roof differences, and a mounted DOM
search -> parcel choice -> compact summary -> alternate choice -> change journey.
Command in frontend: set `TSX_TSCONFIG_PATH=tsconfig.app.json`, then
`node --import tsx --test src/site_discovery/site-discovery.test.tsx src/site_discovery/parcel-selection.test.tsx src/site_discovery/ObservationMap.test.tsx`.
`npm run typecheck --prefix frontend`, `npm run build --prefix frontend` and
`git diff --check` pass. Build retains the existing large-chunk advisory.

DOM/software replay does not establish visual layout, real keyboard/touch
comprehension, source correctness or legal site identity. Integration owner must
review narrow/wide views and keyboard behavior plus 419 Cecelia Road/saved
example, reconcile material conflict in actual enquiry/PDF, and verify host
preference retention. City/title/property-contact review is still needed if the
project spans both Su'it PIDs; current geometry evaluates one selected parcel,
and combined-lot eligibility/geometry is outside this slice. A homeowner needing
both lots must clarify the development site before relying on the screening.
Accepted publication and real recipient validation remain separate gates. No
database tests, cloud credentials, merge, deployment or provider submission were
used.
