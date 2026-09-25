# Wave-seven integration: computed drafts in the app

Reviewed September 24, 2026 (Pacific; CI/merge timestamps fall on September 25 UTC).
This is software integration evidence, not a source-review or zoning-accuracy claim.

## Delivered and reviewed

- [PR #68](https://github.com/QuinnPaterson96/ShovelReady/pull/68), SR-32 / #65:
  explicit compute/import CLI, three invented requests, immutable complete diagnostic
  records, additive migration `0004`, and a pinned opt-in read-only API. Reviewed head
  `f2d242fa7ca331428178154da60c8216fd6be66b`; merged at
  `a90286ea314814a02171dd0c5f9a30e94202dcee`.
- [PR #69](https://github.com/QuinnPaterson96/ShovelReady/pull/69), SR-33 / #66:
  frontend report validation and inspection, generated schema/types/fixtures, safe
  evidence text, uncertainty and scoped outcomes. Reviewed implementation head
  `ef9d05999ef8fe1c5c681c4d047ca97a436b5e35`; updated normally with merged main to
  `31629027c874ba74c6cbd9563ffcefb5d5c16e21`, then merged at
  `88471166a101761225ddf6b5a4c90f135913ab3e`.

Both scopes are complete. The full report/request is stored without inventing a
release identity or creating rows for intentionally absent facts/rules. The importer
recomputes a report; the HTTP reader verifies exact pinned inputs and recomputation.
Private CLI requests have no public case alias. The UI's validation checks coherence,
while numeric evaluation remains in Python. No runtime defect was confirmed during
this review. No source text, review status or synthetic QA control was promoted.

One integration improvement was necessary: the frontend's Python schema/type/fixture
exporter had a local drift check but was absent from CI. The existing backend job now
runs its `--check` and Ruff validation. No new job, service or required-check name.

## Verification

The combined local implementation tree was `6f05376c88907c444945579525cf892476d89248`.
The later normal merge of upstream main changes no application bytes. Subsequent
integration edits are documentation plus the CI drift/lint commands described above.

From `C:/Users/quinn/src/ShovelReady-review-20260924`:

```powershell
python -m uv run --locked ruff check app tests contract_tests migrations scripts frontend/tools/export_draft_evaluations.py docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py docs/research/public-cases/verify_inventory.py docs/research/stannard-reference/verify_packet.py
python -m uv run --locked python frontend/tools/export_draft_evaluations.py --check
npm ci --prefix frontend
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
$env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN='C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin' --demo --http-port 18094
```

- Ruff, generated schema/types/ten-fixture drift check, typecheck and production
  frontend build passed. All **16 frontend tests** passed, including the existing seven.
- The disposable PostgreSQL runner passed **380 tests plus 28 contract subtests, zero
  skips**, including native Windows lifecycle. One existing Starlette/httpx deprecation
  warning remains. Tests cover old-record migration, immutable replay/conflict,
  rollback, private-request isolation, invalid pins/versions/traces, and 404/502/503.
- The runner then explicitly migrated/imported the licensed observations and all three
  computed drafts. Real HTTP JSON for each alias exactly equalled
  `evaluate(request_for(alias)).model_dump(mode='json')`. Stored IDs were
  `draft-demo:<alias>:v1`, rather than the shorter aliases in consumer-only fixtures.
- Browser verification used the built app served by this disposable backend. All
  three outcomes displayed correctly. Expanded pass/missing-fact traces retained exact
  input/rule/fact/draft identities, units, supplied review scope, excerpt/context and
  unknown effective dates. Missing facts did not become zero or a pass.
- Keyboard/rapid case selection, reload and leaving/re-entering the mode were checked;
  old details did not appear under the next case. Observation and public-case views
  remained available. A narrow viewport spot check was performed and restored; this
  was not a comprehensive accessibility or device audit.
- A separately launched local server on 18095, with the feature flag false and no
  database configuration, showed a safe unavailable message with no report. Stopping
  the test backend on 18094 and reloading a previously successful case cleared the
  report and showed a network error. Browser 404/502 injection was not repeated;
  those boundaries are covered by backend and controlled frontend tests.

All four required checks and GitGuardian passed on #68's exact final head in
[run 36086263357](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36086263357).
After updating #69 with main, the same checks passed on its new exact head in
[run 36086879388](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36086879388)
before merge. Local Docker was not run; hosted container startup passed. The final
integration PR separately runs these checks including the added drift step.

## Cleanup and reproduction limits

The runner created `C:/Temp/shovelready-postgres-njrne2an`; it never attached to the
user's database. Both HTTP listener PIDs were checked against their Uvicorn command
and owned test ports before stopping. The runner's `finally` stopped PostgreSQL;
the missing `postmaster.pid` and absent 18094/18095 listeners were verified. Forced
HTTP stop made the demo wrapper exit nonzero with `CalledProcessError` after the
successful test run; this is recorded teardown behavior, not a test-suite failure or
a verified Ctrl+C lifecycle. Diagnostic files remain. The temporary browser tab was
closed, and the user's original checkout/demo were not modified.

Use [the backend handoff](draft-evaluations.md) and
[the inspector handoff](draft-evaluation-ui.md) to reproduce the computed demo with
an owned local database or the guarded runner. A source URI is provenance text;
there is no general document-serving endpoint.

## Disposition

Close SR-32 / #65 and SR-33 / #66. Keep SR-10/12/13 partial: this verifies the
draft-request -> computation -> storage -> HTTP -> UI segment only. SR-05/06 still
need controlled real inputs and independent source/site review; SR-07 has no measured
live extraction benchmark; SR-11 has no accepted release/projection/activation.
SR-30 human calibration remains separate and does not block development.

Follow [the next-step plan](next-steps-after-wave-seven.md). No new implementation
tasks, outreach, paid runs, cloud deployment or virtual-user pilot were dispatched.
