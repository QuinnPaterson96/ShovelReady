# Wave-nine integration — September 25, 2026

PR #82 (SR-37) at `48ca4ae0f371f5255064f1d0c519485464345fe5` and PR #83
(SR-36) at `9bcd272a1f0a351d05e58970516e5fe4e095bcca` were combined from
main `e77398ceff041299e68525e01ed1d6bb5e50b9a5`. Integration code commit
`b0ff5ee7f8e67552b6011251ff8c19ffc7597613` connects Pilot navigation and
shares the prominent status banner. Hosted final-head checks are recorded on
the integration PR; the results below are local checks of this composed code.

## Behavior and review

Home is the default. Blank editable inputs and optional confirmed synthetic import
lead to a preparation summary, without evaluating user-entered values. Examples
and evidence remain accessible. Pilot investigation serves the actual typed
preparation diagnostic with source links, historical dates, conflicting observations,
and explicit missing review/geometry. It produces no EvaluationReport.

The moved diagnostic core has identical common function/class ASTs to its prior
CLI implementation. The CLI remains a wrapper; runtime inputs have tested drift
checks against their research originals. No acceptance or publication is added.

## Verification

- Ruff and public-case inventory verification passed (10 cases, zero accepted).
- Frontend: 29 tests passed; TypeScript/Vite production build passed; npm audit
  reported zero vulnerabilities. The approximately 528 kB main chunk has a size
  advisory, not a build failure.
- Native disposable PostgreSQL 17 runner: 400 tests passed plus 28 contract
  subtests, including native lifecycle checks. No tests skipped. One existing
  Starlette/httpx deprecation warning remains.
- Fresh disposable demo at `http://127.0.0.1:18097/`; application/frontend identity
  both report the integration code commit above. Database directory is
  `C:/Temp/shovelready-postgres-eir4r1yr`, owned by the runner; the database is
  stopped when that demo runner exits. This is a temporary local deployment.
- Browser: Home starts without an example; blank inputs show Not assessed.
  Negative width blocks submission with a focused error. Valid partial inputs
  produce amber Needs investigation, retaining missing dimensions as unknown.
  Navigation retains the draft. Dirty example replacement requires confirmation;
  imported depth is 9 m, manufacturer area 40 square metres, roof height unknown.
  Editing the imported width clears prior status to Not assessed and marks it
  user supplied, while retaining synthetic provenance.
- Both main navigation and the form action open the live Pilot API view. The amber
  banner precedes the selected 2018 proposal. Eight observations, five uncertain
  fragments, distinct 0.20/0.22 m corners, conflicting 22.25/22.75 area observations,
  parcel-plan discrepancy and later house replacement remain explicit. The parsed
  area detail identifies stale/hidden-text uncertainty and links its source.

SR-36 and SR-37 are complete in their bounded UI/preparation scopes. Parent
SR-12/SR-13 remain partial: no accepted zoning release or real-site fit exists.
The next gate remains reviewed source/design/site evidence and supported rule
bindings, followed by one bounded real evaluation and independent user validation.
