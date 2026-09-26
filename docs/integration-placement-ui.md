# Placement UI integration — September 26, 2026

Base main ff8774f; worker heads #148 c3f93aa (validation plan), #149 ec46c4d
(runtime packet/API), #150 f3a5681 (UI). All five checks passed on each worker head.

## Result

Three retained Victoria parcels now connect through packaged source observations,
HTTP, the supplied-placement engine and a mounted sketch UI. Users can supply nominal
model dimensions, drag/edit/rotate a rectangle, measure it and copy partial results.
No legal thresholds are installed. The existing localhost18098 was not interrupted;
a separate owned database-free preview at localhost18133 was used for integration.

## Corrections

- Invalid requirement validation included a Python exception in its HTTP error context,
  causing a 500. Error output now omits that context and returns 422; regression extends
  the existing API recovery test. Nonfinite numbers and excessive JSON nesting are rejected.
- Windows checkout converted exact source bytes to CRLF and failed the hash test.
  Rebuilt from retained captures and added -text attributes for packaged source JSON.
- Reused CopyableRecord for success/fallback feedback, added a readable municipal source
  link, removed underscores from user-visible relations, distinguished assumption targets,
  and validated comparison/margin fields before rendering.

## Verification

35 focused backend tests pass. Full disposable PostgreSQL suite: 502 passed, 28 subtests,
one local native-lifecycle opt-in skip; dedicated Windows CI covers that lifecycle.
55 existing frontend tests pass; TypeScript/build pass. Existing Vite chunk advisory and
Starlette/httpx deprecation remain. Final CI on the integration PR is authoritative for
final-head changes; the full local run preceded the final nonfinite traversal guard.

Live browser inspection on the combined worktree (coordinator, not a blinded user):
- VIC-087, VIC-090 and VIC-093 each returned actual API measurements. The latter two
  retained three and two separate roofline observations respectively.
- VIC-087 synthetic 4 x 6 m rectangle at centre (473693.57, 5362187.76), angle 0:
  displayed contained with 24 m2 roofline overlap. These are observations, not approval.
- Pointer drag to (473689.18, 5362171.53), angle 0: contained, no captured roofline
  overlap, approximately 1.05 m to parcel boundary and 0.76 m to captured roofline.
  This demonstrates useful partial results without supplying legal/provider evidence.
- Editing rotation removed prior results. At angle 1, keyboard-triggered measurement
  returned approximately 1.03 m boundary / 0.73 m roofline distances; copy reported success.
- At viewport 390 x 844, document scroll width 375: no horizontal overflow. Viewport reset.
- Screenshot retained locally at C:/Temp/occupied-placement-mobile.png.

The numeric browser outputs are recorded observations, not independent surveyed truth.
Analytical backend tests provide independent synthetic calculation expectations. No new
E2E framework or per-helper tests were added. Delayed-response races, browser service
outage/retry, complete keyboard traversal, fresh virtual participant and human study are
not verified by this walkthrough. #147 remains open for these execution gaps.

## Next development round

1. Finish #147 on a frozen integrated preview: fresh browser-only participant, controlled
   delayed/out-of-order response and outage/retry exercises. Reproduce defects before
   tickets. Add a small automated browser regression only for consequential stable behavior.
2. Improve placement workflow: click-to-place and small directional moves, visible scale,
   preserve draft across navigation, clearer model-versus-user-edit indication. Raw projected
   coordinates can remain in advanced controls. This is manual exploration, not auto-search.
3. Improve result hierarchy: concise observed-conflict/observation summary, identify which
   roofline each row describes, explain each entered assumption and reduce repeated caveats
   while keeping coverage and next verification visible. Apply evidence-driven UX findings.
4. After the three-case journey is understandable, add a bounded address-to-retained-site
   path and neighborhood capture buffer. Verify linkage/coverage; do not imply citywide data.

Items 2/3 share the same UI and should have one owner or run sequentially. QA can prepare
independently but final execution depends on the frozen build. No new workers dispatched
as part of this integration request. Geographic expansion is lower priority.

## Explicit outstanding gaps

- #139: no user-drawn/manual parcel fallback when capture is unavailable, no site correction
  workflow; current demonstration only supports the three retained geometries. Keep parent open.
- #147: fresh user and controlled failure/race execution pending; current proof is a coordinator
  walkthrough and API regressions, not completion of the full validation plan.
- Placement and result UX: coordinate-heavy controls, repeated limitations and no persisted
  draft across page navigation; next UI task above owns these usability improvements.
- #104/source reviewer: current rules, lot-line/principal-building roles and surface conventions
  unreviewed. Approximate results remain useful, but cannot establish zoning compatibility.
- #124/#125: controlled manufacturer dimensions and installation/service commitments missing.
- #16: actual homeowner comprehension/time savings unmeasured. Agent evidence cannot replace it.
- Parcel-intersecting roofline capture omits off-parcel structures, walls and other obstructions;
  future bounded capture work must preserve this distinction.
