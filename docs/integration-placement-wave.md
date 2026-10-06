# Placement wave integration

Integrates PRs #213–#216 from main bd1d345: email handoff deac6a3, orientation b784cf1, collision UI 1902682 and setback research 01ec63b.

The saved Model 300 example now starts aligned with the approximate parcel long axis and offers Align to lot without overwriting subsequent manual choices on navigation. The measurement status highlights captured boundary/roofline conflicts, unresolved observations and optional user clearance shortfalls. Enquiries include those comparisons as user assumptions, not legal setbacks. Rotation and shortfall displays are rounded; calculation and technical exports retain precision. Email launch feedback says a draft was requested and provides copy recovery, without claiming a client opened or a message was sent.

## Verification

On the combined implementation: 98 frontend tests passed (`npm --prefix frontend test -- --run`), TypeScript/Vite build passed (`npm --prefix frontend run build`), and `git diff --check` passed. Existing Vite chunk-size warning remains. PR #216 separately reported 22 geometry/API tests passed; combined backend verification is delegated to integration CI. No database or live model calls were used locally.

Browser verification against the stateless built application on localhost: initial angle displays -9.52 degrees while retaining full precision; focus/blur does not invalidate a measurement; a manual 35-degree rotation survives Home/Model 300 navigation; Align to lot invalidates the old measurement. At the unchanged example centre, aligned rotation produces approximately 0.7 square metres outside the captured parcel and 1.6 square metres of roofline overlap, prominently reported as conflict. Alignment does not find a clear position. At 90 degrees, the rectangle has no captured overlap and a 1.21 m boundary distance; a user target of 10 m produces an 8.79 m shortfall carried into the enquiry. No email was sent. This browser pass did not independently repeat mobile or configured external email-client validation.

## Remaining gaps

- The setback research identifies candidate rules but cannot establish current applicability, legal boundary roles, principal-building walls or controlled model projections. No accepted setback publication or legal pass is introduced. See research/example-setbacks/README.md and #104/#124.
- Orientation is mounted in the saved example only; live/manual placement remains manually controlled. Alignment is not an automatic fit search.
- Human email-client/popup-block recovery checks remain in #205. Provider photo permission (#199) and human user validation (#185) remain open.
- Source review and publication are distinct from passing software tests. Captured geometry and provider dimensions remain unreviewed.

This record supersedes the #209 handoff's temporary host-enquiry gap and always-visible exact-shortfall description: integration connects the comparisons and keeps exact values in technical evidence.
