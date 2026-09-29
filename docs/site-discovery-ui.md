# Address-to-property UI handoff

September 29 integration update: see [combined behavior and verification](integration-live-parcel-discovery.md).
The Model 300 route now owns live discovery and manual placement; the standalone
worker limitations below describe the earlier handoff. Municipal responses also
expose validated `planar_geometry`; geocoder evidence now includes `rawResponseText`.


Status: bounded Assessment demonstration for #168 under #165. The frontend transport is bound to the published #166 and #167 branch contracts, but those backend routes are not on this branch or main. The retained lookup and manual inputs below remain usable. This is not an end-to-end connected live search, accepted site selection, placement, or fit result.

## Implemented

- `frontend/src/site_discovery` owns a controlled `onConfirm` callback carrying the complete unreviewed address, parcel and observed geometry. The Assessment host displays the selected label but does not map it into `sr-38.site-selection.v1`, retained spatial revisions or the prepared summary. #169 owns that reconciliation.
- Search starts only on an explicit submit. Address selection, parcel selection, observation fetch and property confirmation are separate actions. An edit to the query or a new choice aborts work, advances a generation counter, clears confirmation and suppresses responses from old requests even if abort is ignored.
- Visible ambiguity, source capture and source-date limits, review status, partial building state and manual fallback remain explicit. Exact records are in expandable details. The drawing uses EPSG:3157 projected metres, north-up with Y inverted for SVG, the existing parcel and roofline colour tokens, and no basemap or inferred legal yards.
- The address transport sends `POST /api/address-search` with `sr-address-search.v1` and validates the returned status, candidates, point CRS and capture metadata. Its boundary follows [#166's published contract](https://github.com/QuinnPaterson96/ShovelReady/blob/codex/bc-address-search/docs/address-search.md) and an unchanged copy of its saved Saanich response (`address-api.fixture.json`).
- The municipal transport follows [#167's published contract](https://github.com/QuinnPaterson96/ShovelReady/blob/codex/victoria-municipal-sites/docs/victoria-live-sites.md): it sends the chosen civic street address to `POST /api/municipal-sites/search`, keeps multiple GISLINK or spatial leads, then sends only the explicitly chosen City parcel reference and expected PID to `POST /observe`. The UI drawing converts returned ArcGIS EPSG:3157 rings to XY polygons and preserves raw attributes, evidence and source response text in technical details. Exact City provider example bytes are copied into the component test fixtures; the normalized municipal response envelope in the test is assembled from #167's code because that branch publishes provider bytes rather than a normalized response file. This is contract testing, not a live combined request.

## Verified at this head

`npm ci`, `npm run typecheck`, `npm test` (65 passing) and `npm run build` in `frontend` passed locally at this UI head. The focused behavior checks cover distinct confirmation steps, edit invalidation, late address, parcel and observation responses, service failure, the mounted manual continuation, actual request paths/bodies, the saved BC address API response and the saved City provider geometries in source-shaped municipal envelopes. They do not test FastAPI serialization or live combined network responses. Browser layout and keyboard use are not yet verified with the real adapters mounted. The Vite build reports the existing main-chunk size advisory.

## Remaining work

| Missing | Practical impact | Next action and owner |
|---|---|---|
| #166 backend route is not on this UI branch or main | Address request shape is connected in frontend code, but running this branch alone returns HTTP 404. | #169 mounts/integrates #166; run combined API/UI checks. #168 should check any producer contract revisions before handoff. |
| #167 backend router is not on this UI branch or main | Municipal requests and parsing are implemented against its branch contract, but running this branch alone returns HTTP 404. | #169 mounts/integrates #167 and runs combined API/UI checks; #168 checks any producer revisions. |
| Shared assessment, builder and placement integration | A confirmed observation is visible only in this demonstration. It cannot drive placement or the existing summary. | #169 reconciles shared state and current PRs #162–#164, with an explicit change/invalidation path. |
| Browser rehearsal with mounted real adapters | Narrow layout and keyboard operation remain unverified in a connected journey. | #168 if both contracts arrive before PR handoff; otherwise #169 in combined QA. |
| Independent source review, accepted publication and human validation | A source lead and a working UI do not prove legal lines, complete buildings, fit or user comprehension. | Separate source/review and validation work under #165; no software check can close these gates. |

No database, schema, publication or backend files change here. Corrected and outside-scope addresses depend on the explicit producer status/metadata; they must not be silently coerced to Victoria. The UI does not collect owner contact data.
