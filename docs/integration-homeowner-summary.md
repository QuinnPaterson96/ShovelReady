# Model 300 homeowner summary (#242)

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
