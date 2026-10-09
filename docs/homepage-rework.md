# Homepage rework — October 9, 2026

Implemented on `origin/main` d7fe466 (guided walkthrough #316 and canonical navigation #313 included). Homeowners are the primary recipient: decide whether to explore their own property or learn the workflow. Builders get a separate pilot concept and a working preview, without an invented contact destination.

## Implemented

- Direct homeowner promise, primary Check my property action, secondary Watch the demo, and a lower-emphasis Try an example beneath the real map.
- Existing App actions own navigation and explicit example replacement. The new presentation component does not initialize assessment state, change screening semantics, or add services, forms, analytics or persistence.
- Placement → findings → enquiry explanation; explicit distinction between Victoria map exploration, selected unreviewed planning comparisons, and manual geometry elsewhere.
- Scoped Civic Atlas styles, local system typography, native buttons, focus rings, descriptive alternative text, stable image dimensions and no homepage animation or autoplay.
- Independent builder/manufacturer pitch. Website integration is a proposed pilot, not an available product or provider relationship. With no verified project contact route in the repository/site, Preview the customer journey opens the existing walkthrough and the page states that pilot enquiries are not open.

## Asset provenance and usage

`frontend/src/brand/home-placement.svg` is a vector capture serialized from the actual deployed app's full-size placement preview on October 9, 2026. DOM geometry, text and computed appearance are retained; styles are resolved for standalone rendering. It is a static product capture, not generated imagery, a surveyed plan or a result for the visitor's property. The initial saved position visibly crosses the captured parcel and overlaps the assumed main roof; adjacent copy describes that conflict rather than claiming a fit. The live tool can explore other positions.

- City of Victoria Parcel 87 and roofline outlines, retained September 26, 2026, approximate/unreviewed. Source: [OpenData Land, parcel layer](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/11); see the existing example packet and `docs/spatial.md`.
- The City's [Open Government Licence](https://opendata.victoria.ca/pages/open-data-licence), inspected in the public browser October 9, permits copying/adapting/publishing information with attribution. The required attribution and licence link appear beneath the image. No City logo, endorsement or private customer identifier is reproduced.
- Model 300 is the existing app's nominal rectangle from attributed published dimensions, not a copied manufacturer floor plan/photo. No manufacturer image is reproduced or hotlinked. Existing Model 300 imagery remains uncleared; manufacturer photos are a follow-up requiring permission.
- Local asset: 6.64 kB uncompressed, 1.34 kB gzip in Vite output. Explicit width/height reserves its layout; it requires no image host or font request.

## Verification

- `npm ci --prefix frontend`; `npm run typecheck --prefix frontend`; `npm run build --prefix frontend`: passed. Existing large-main-chunk advisory remains.
- `npm test` in frontend: all 177 tests passed, including an extension of the existing mounted App navigation test. It checks the homepage primary action resumes the changed model and the secondary action starts the existing labelled walkthrough. Expected behavior comes from the existing entry contract, not fixed marketing prose. Existing legacy/history/replacement coverage remains.
- `git diff --check`: passed.
- Actual browser inspection at 1280 × 900 and 390 × 844; no horizontal overflow at 390 (document width and scroll width both 390); image loaded. Narrow layout enlarges the map above its legend to preserve readability. Keyboard Tab showed a 3 px focus outline and Enter activated the builder preview. Existing shared reduced-motion CSS disables smooth scrolling/transforms; this homepage adds no motion.
- Fresh primary entry opened address search without an example map. Changed Model 240 and an unfinished address string survived Home → Check my property. Watch the demo prompted before replacing that work and then opened the labelled Model 300 walkthrough. Builder preview uses that same protected entry. No enquiry, external form or email was sent.
- Source licence was read separately; software/visual checks do not accept source interpretations or establish user comprehension.
- Full real-API walkthrough replay was not repeated: its state/calculation implementation is unchanged; only its homepage button locator is updated. Local homepage inspection had no API on port 8000, so this verifies entry/rendering/state preservation, not fresh API-backed measurements. The product capture came from the deployed real tool.

## Before and after evidence

[Before](homepage-verification/before.png), [desktop after](homepage-verification/desktop.png), [mobile after](homepage-verification/mobile.png). Before is the public homepage; after is this local branch. This change has not been deployed.

## Integration and remaining gaps

| Gap | Practical impact | Next action / owner |
|---|---|---|
| No verified ShovelReady pilot contact route | Interested builders can preview but cannot submit a pilot enquiry | Project owner supplies and verifies the intended contact destination; then replace the honest preview fallback with Discuss a pilot. |
| Manufacturer photo/floor-plan rights unavailable | The homepage uses actual app-owned UI geometry only | Project owner obtains usage permission before adding manufacturer imagery; do not copy public imagery merely because it is accessible. |
| Real homeowner/provider comprehension untested | Visual/software checks do not demonstrate usefulness or conversion | Owner arranges homeowner/provider walkthroughs after reviewing this PR. |
| Assessment session persistence remains limited | Reload may lose work; the homepage promises resume only in the open session | Existing journey owner decides persistence requirements separately. |
| Controlled site/model inputs, source applicability review and accepted publication remain outstanding | This demonstration cannot supply an accepted real feasibility/permit finding | Source/review owners complete existing acceptance gates; no homepage claim closes them. |
| Concurrent walkthrough #317 | Its new controls are separate; both PRs touch the browser script | Integrator retains the four Watch the demo locator updates when combining #317; rerun the combined entry check. No BuilderDemo/navigation/CSS changes from #317 are duplicated here. |

The other open homeowner property/results/export PRs do not overlap homepage code. Root checkout's unrelated edits were preserved. No merge, deployment, source publication, outreach or production write was performed.
