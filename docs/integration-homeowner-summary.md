# Model 300 homeowner summary (#242)

Historical baseline. See the [current #253 workflow and verification](#homeowner-property-selection-and-placement-summary-253) below.

The placement step now shows one preliminary conclusion and five concise checks: captured space, candidate boundary distances, the stated existing garden suite count, height coverage, and mapped zoning coverage. Apparent conflicts lead; clear captured geometry and a passing distance subset never become an overall approval or “Looks promising.” Height and other omitted rules stay visibly outside the implemented checks. A mapped zone outside the supported Victoria GRD-1 packet is labelled outside tool coverage, without implying prohibition.

Action buttons reveal nested sections and focus their input or the placement map. Lookup and comparison failures have retry actions. “How we checked” retains scenario assignments, exact measurements, source dates and review status, rule reasoning and citations. The complete technical export remains in the enquiry section. The underlying requests and evaluation semantics are unchanged.

## Verification and limits

- `npm run typecheck`, `npm test`, and `npm run build` were run in `frontend/` after `npm ci`.
- Focused cases exercise geometry conflict, clear geometry with missing rules, zoning outage, out-of-scope zoning, and nested flag navigation with input retention.
- The local in-app browser blocked `127.0.0.1`, so desktop/390px visual and keyboard walkthroughs remain unverified. A UI reviewer should run both before treating the summary as user validated.
- This is presentation of an unreviewed candidate packet. Reviewed legal rules, installed height, front setback, rear-yard conditions, source currentness, and accepted publication remain outside this integration. The rule and data owners must resolve these before real evaluation claims.


## Combined integration review — October 6, 2026

Combines PRs #245 (baseline QA), #249 (agent/architecture guidance), #250 (quiet
geometry), and #251 (homeowner summary) from main 9d0f378. Integration separates
Victoria result mapping into victoriaSummaryAdapter.ts so the renderer consumes
structured neutral findings. Added actionable area/separation rows so a conflict
cannot change only the headline, explicit missing front/rear-yard coverage, direct
zoning retry, and unsupported boundary-rule coverage for outside-packet zoning.

Verification: production build passed; combined frontend suite 118 passed before the
final added regression; final focused summary/navigation suite 5 passed. Targeted
conditional/scenario/zoning API suites: 20 passed, no database. Normal exact-head CI
must also pass. Existing build-size and Starlette/httpx advisories remain.

Browser on local production build port18152: saved initial placement showed a
position-specific conflict. Clicking mapped empty space moved the rectangle; the
successful result removed the geometry warning and retained a needs-closer-look
summary with missing coverage. Floor-area action opened/focused the input; entering
25 then keyboard activating suite-count navigation retained25 and focused
existing-suites. At390px the client/scroll widths were both375px. Old findings
cleared during recalculation. These are agent/browser observations, not homeowner
comprehension or physical-device touch testing.

Remaining gaps: #233/#231 retain live-property combined presentation, physical touch,
full manual-distance override and source-outage browser recovery. #147 owns real-user
comprehension. #104 owns accepted rule/source coverage, installed height and legal
boundary/wall evidence. #246/#247/#248 remain unimplemented architecture follow-ups;
this release does not add other-municipality coverage or accepted data publication.
The #245 report is a historical baseline, not final-candidate certification.


## Homeowner property selection and placement summary (#253)

Implemented October 6, 2026 for #253, based on origin/main
`18a7302b07189bea319598c3a6d604f28574d43b` (PR #252).

Model 300 now selects a sole parcel automatically after an explicit address
choice and a usable polygon observation. Multiple parcels still need a choice;
missing, invalid or multipart parcel geometry keeps manual continuation available.
The prominent selected-property strip provides **Wrong property? Change**.
Changing property clears its placement, assumptions, findings and enquiry readiness;
late observations and measurements cannot restore the old result.

Automatic source selection uses `site-discovery.selected.v1`, with selection basis
and `identity_attestation: not_confirmed`. Generic discovery retains explicit
confirmation and `site-discovery.confirmed.v1`. Placement source limitations,
unsent enquiry text and complete technical export preserve the distinction.

Compact editable Property, Placement, Quick checks and Enquiry buttons sit above
placement. Immediately below the map, the summary presents a bounded headline,
counts of named checks, scope and a priority action (conflict first, then missing
information). Counts are not approval probabilities. Individual checks use SVG
icons, colour and bold text labels. Unsupported zoning rules are coverage gaps,
with no request to fill in facts as if that would supply the missing rules.

Actions open disclosures and focus actual inputs. Adjust placement restores move
mode before focusing the map. Boundary map tools, fine adjustments and exact
evidence remain secondary disclosures. Source-reported zoning issue codes are
available in technical notes and the complete export; long source text wraps.
The adapter also treats unresolved source separation applicability/measurement
basis as a coverage gap, without changing the raw evaluator status. Stored
measurements, rule calculations, source records and evaluation APIs are unchanged. A promising geometry position means only a bounded starting point.

### Verification

- `npm ci --prefix frontend`: installed the locked dependencies; npm reported one
  existing high-severity advisory. No dependency versions changed.
- `npm test --prefix frontend`: 125 tests passed, no skips. New mounted React
  journey connects saved map, summary, action focus, unsent enquiry readiness,
  immediate invalidation, deliberately late HTTP measurement, and property change.
  It uses a retained HTTP geometry fixture and does not verify geometry arithmetic.
- Discovery boundary integration tests cover sole vs multiple parcels, selected
  provenance in enquiry, changed addresses, late observations, failed geometry,
  retry and multipart manual continuation. Existing source-parser replays remain.
- Adapter/renderer checks cover mixed statuses, separate named counts, conflict
  action priority, unsupported coverage without user questions and incomplete
  geometry. Existing nested-disclosure focus tests remain.
- `npm run build --prefix frontend`: TypeScript and Vite passed. Existing bundle
  size advisory remains. `git diff --check`: passed.
- Actual built app served in stateless demo mode on owned port 18153 using
  `C:/Users/quinn/.codex/worktrees/builder-demo-qa/ShovelReady/.venv/Scripts/python.exe
  -m uvicorn app.main:app --host 127.0.0.1 --port 18153`. No database configured or
  database tests run; no backend evaluation change requires a database.
- In-app browser at default desktop (1265 px screenshot) and 390 × 844: saved
  example auto-check, initial conflict, map action focus, keyboard ArrowUp
  invalidation, click to another position, bounded promising result, individual
  rows, suite-count focus, floor-area action and Enter-operated information help,
  enquiry preparation and Mark ready, then Wrong property? Change with address
  focus and no prior map/result. No email draft or enquiry was sent.
- Live BC geocoder/City source returned the public retained research address
  1144 May St: choosing its address automatically selected a sole parcel and
  opened placement. Mapped **GRD-1 (PGA)** remained unsupported by the exact GRD-1
  packet. Live municipal latency remains variable; multiple-candidate, failure
  and late-response cases are deterministic boundary tests, not live-provider
  availability guarantees.
- Mobile source-issue overflow was reproduced and corrected with wrapping and
  secondary technical notes. Final live mobile client/scroll widths were both 375 px at a 390 px viewport.
  Temporary viewport overrides were reset after validation.

Screenshots: [desktop conflict](qa/issue-253/desktop-conflict.jpg),
[390px conflict](qa/issue-253/mobile-conflict.jpg),
[desktop bounded result and checks](qa/issue-253/desktop-summary.jpg),
[390px bounded result](qa/issue-253/mobile-summary.jpg),
and [390px live source selection](qa/issue-253/mobile-live.jpg).
Saved-example captures show the final compiled summary. The live-selection
capture precedes the final separation applicability mapping, which does not
change that outside-packet result.

### Remaining work and owners

- Demo usability: #231/#233 still own fuller consolidation of scenario-derived
  roles with the detailed manual checklist and override provenance. This PR
  improves the result hierarchy but keeps those evidence views; it does not close
  either broader issue. Frontend/geometry integration owns that follow-up.
- Live-provider coverage: multipart parcels cannot be measured; sources can be
  missing, partial or slow. Homeowners can use manual sketches, but these do not
  supply verified legal boundaries. Municipal adapter work owns coverage/recovery
  expansion; #246–#248 remain independent follow-ups, not prerequisites here.
- Accepted real evaluation: candidate currentness, applicability, installed model
  dimensions, legal boundaries, omitted front/rear-yard/height/site requirements
  still need source review/publication under #104. Geometry or software checks
  cannot establish permission; source-review owners must accept the real subset.
- Human validation: #147 should test whether homeowners understand the headline,
  named counts and next action. This agent browser inspection is software/UI
  evidence, not measured homeowner comprehension or a full accessibility audit.
