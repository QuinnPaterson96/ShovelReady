# Wave-eight integration and next UI work

September 25, 2026. SR-34 supplies executable historical preparation diagnostics;
SR-35 supplies a bounded acquisition plan and exact unsent requests. Neither supplies
accepted source/rule bindings, approved-plan acquisition or real zoning outcomes.

## Reviewed implementation and verification

PR #78 was reviewed at `6ec8363f9f71bece91f2fbcd47b1d1f9f08c4db5`; no merge-blocking
findings. The adapter retains uncertainty, temporal distinctions, unresolved conditions
and exact validation failures. It does not invoke the evaluator or fabricate source
capture, geometry or reviewer acceptance. It merged as
`8205d6e2e02171ea5f3fff3da510dc4639ae293c` after all four required jobs and GitGuardian
passed in [CI run 36166826922](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36166826922).

PR #77's four acquisition documents were reviewed; strict JSON, 11 unique HTTPS
source records, provisional/non-acquisition flags, local links and whitespace checks
passed. After updating against #78, all four required jobs and GitGuardian passed at
`6adb385816a870f932c630229fa04a8ea34251c0` in
[CI run 36171512577](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36171512577).
It merged as `d37773cb8f1ea9f93bcfd4585db3eadedc7a94c6`. The original-source research
was not independently repeated during this documentation review. No approved drawings
were acquired and neither draft request was submitted. SR-35's bounded acquisition
deliverable is complete; later acquisition/authority remain external inputs.

Close child tickets #74/#75, retain parent accepted-data objectives, and dispatch
#79/#80 in separate managed worktrees. The current turn's integration/handoff PR
contains documentation only; its own final-head CI is recorded in that PR.

The coordinator tested that exact PR head in its clean worktree before integration:

- Focused diagnostic/evaluation/contracts suite: 103 tests plus 28 subtests passed.
- Full isolated PostgreSQL runner with native lifecycle enabled: **393 tests plus
  28 subtests passed, zero skips**, one existing Starlette/httpx deprecation warning.
  These counts overlap; they are not additive independent test sets.
- Frontend production build passed. The disposable runner migrated and imported
  licensed observations and all three synthetic computed drafts.
- All three real HTTP reports exactly matched evaluator output for their packaged
  requests. Browser checks covered pass, missing fact, supplied-placement failure,
  source details, rapid case changes and the public Pilot evidence page. App/frontend
  identity matched the tested commit. Real Pilot draft alias correctly returned 404.
- The offline Pilot diagnostic retained eight observations, mapped five uncertain
  facts and returned evaluation_not_run with actual source/acceptance validation errors.

Reproduction uses the commands in [the diagnostic handoff](case-diagnostics/README.md)
and [disposable draft demo](draft-evaluations.md). The app run used
`scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin' --demo --http-port 18096`
after building the frontend and setting both app/frontend commit identities and
SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN. It created its own temporary database; no
existing database, original checkout or user's older demo was changed. The session
was left running for inspection; its continued availability is not a deployment claim.

This was a coordinator walkthrough, not blinded agent or human validation. No new
source PDF inspection, legal review or broad accessibility audit occurred. Local
runtime tests were not repeated for the subsequent acquisition-document merge.

## Findings shaping wave nine

The public Pilot UI still consumes the older curated inventory, not SR-34's new
diagnostic. Its area wording asserts two drawing labels while the later packet
distinguishes parsed text from visually confirmed observations. Reconcile this with
an explicit new inventory revision; do not quietly rewrite the historical evidence.

[SR-36](backlog/SR-36.md) owns Home -> editable inputs -> preparation summary,
optional example import and prominent accessible status. [SR-37](backlog/SR-37.md)
owns the read-only Pilot diagnostic/API and evidence correction. They can develop
independently, with final shell/status integration after both. See
[the complete prompts and ownership](backlog/wave-nine-prompts.md).

Completing a form establishes input readiness only. Real evaluation, independent
review, source retention, accepted publication and customer validation remain open.
The new UI must make these distinctions understandable without requiring users to
read developer-oriented contract errors.
