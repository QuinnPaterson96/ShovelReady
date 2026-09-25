# Virtual-user QA tooling integration

September 24, 2026 (America/Vancouver; GitHub and retained receipts use September 25 UTC).
This integrates the small supporting QA tasks, not accepted zoning screening or a
participant study. No application runtime, regulatory schema, dependencies, migrations,
cloud resources or required CI jobs changed.

## Review and merged work

| PR | Result | Final reviewed head | Required CI |
|---|---|---|---|
| [#59](https://github.com/QuinnPaterson96/ShovelReady/pull/59), SR-28 | Five task cases and three clean/fault pairs; exact finite recipes and author browser review | `d7983cd751fcbea23d59482b4e1475a098b670bd` | [36079380225](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36079380225) |
| [#61](https://github.com/QuinnPaterson96/ShovelReady/pull/61), SR-29 | Owned local preparation, manual dispatch/stop, immutable final records and cleanup | `5046ddc20ab4ef741af3f906cfaabb9ccf36d649` | [36080644010](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36080644010) |
| [#60](https://github.com/QuinnPaterson96/ShovelReady/pull/60), SR-30 | Offline review replay, conservative metrics and local adjudicated drafts | `92fa4f2b649f555fffcf715f25f588b6cffa74b3` | [36080816228](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36080816228) |

All four required checks (backend, frontend, container-startup and native-local-database-windows)
and GitGuardian passed on each listed head before merging. Branches were updated with
normal merges, without force pushes or bypassing protection. Personal author/committer
and authenticated `QuinnPaterson96` were verified. Review used a separate checkout;
the user's original working directory, running preview and default DB were not changed.
The already merged [#57](https://github.com/QuinnPaterson96/ShovelReady/pull/57) supplies
the shared case/run/finding records, including unsolicited findings outside denominators.

### Correction found during review

Removing all check decisions from an otherwise readable/observable clean-control review
left its checklist unassessable but yielded false alarms **0/1**, incorrectly treating
missing outcome review as clean success. The corresponding fault path could count an
unreviewed outcome as a miss. This was reproduced against the grading test inputs.

Correction `169b81138e830dd2e5a68a3d2e216e88b28f3e29`, included in #60, requires a
nonempty, fully assessable set of control-case decisions before either control denominator
is eligible. Reviewed silence and reviewed omissions remain eligible; independently
reviewed allegations retain their own metrics/draft gates. Twelve regressions cover
absent decisions, unassessable decisions, missing evidence, empty scored rubrics and
preserved reviewed outcomes. No unresolved blocking review finding remains.

## Combined verification

Commands ran in `C:/Users/quinn/src/ShovelReady-review-20260924`, Python 3.12.3 with
locked dependencies, Node 22.14.0 and PostgreSQL 17. Initial combined tree `bc9bd500`
passed 350 tests plus 28 subtests. After the correction, review commit
`2fb3ff93cfe003dee2ac72af734b7c64ea272d5d` passed **362 tests plus 28 subtests, zero skips**:

```powershell
$env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN='C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin'
```

The runner created isolated cluster `C:/Temp/shovelready-postgres-wbcc7f3j`, exercised
the native lifecycle test and shut the server down successfully. One existing
Starlette/httpx deprecation warning remains. The final #60 head has identical code,
tests and fixtures to the corrected combined review tree; its only additional file
difference is a grading-documentation verification count.

Also passed:

- Full configured Ruff scope; focused QA Ruff repeated after the correction.
- `npm test --prefix frontend` (7 tests), `npm run typecheck --prefix frontend`,
  `npm run build --prefix frontend`. No frontend changes followed these checks.
- Public-case and Stannard metadata validators, acquisition checks (2), intake checks
  (10) and original synthetic fixture checks (3). Metadata validity is not source acceptance.

Local Docker was not rerun; the required hosted container-startup checks passed on the
listed final heads. No live model, participant, shared database or Styx resource was used
in this integration verification.

### Actual runner-to-grader replay

At combined tooling commit `bc9bd500f1a6014c56d4b7639f014974a2eba4be`, the coordinator
planned and prepared the actual SR-28 `unit-display-fault` with `--smoke`. A fresh owned
clone built/served the app on loopback port 18121; identity/frontend checks passed.

```powershell
python -m uv run --locked python -m scripts.virtual_qa.runner plan --fixtures tests/fixtures/virtual_qa --output C:/Temp/sr-six-integration-20260924-fault --mode defect_detection --ids unit-display-fault
python -m uv run --locked python -m scripts.virtual_qa.runner prepare --output C:/Temp/sr-six-integration-20260924-fault --source C:/Users/quinn/src/ShovelReady-review-20260924 --scratch C:/Temp/sr-six-integration-20260924-scratch --index 0 --port 18121 --smoke
```

Retained output is `C:/Temp/sr-six-integration-20260924-fault`, attempt
`28ff200ec6f94635a1b5d78eef1e9c08`. These existing output paths cannot be reused.
Receipt baseline is `303b40aeb9e69f476878959148ed299cad2a5e9b`; actual derived commit is
`95495f904e7b02e9307b9e8db9da6fad1b4e89d5`, tree
`74299c1893e607dcbbb98523b75e7705b20cf70a`, matching the SR-28 reviewed unit variant.
Owned HTTP shutdown and marked scratch deletion passed: `smoke_only`,
`cleanup_ok=true`, no cleanup errors, `scratch_removed=true`.

No dispatch occurred. An explicit receipt with `outcome=blocked`, null note and unknown
participant/action metadata was passed to `runner.finalize`. The resulting final
`run.json`, frozen `case.json` and matching separately supplied rubric were passed through
the grading CLI. Result: **blocked, no recorded start, one unassessable check, zero drafts**.
Retained inputs are `integration-result.json` and `integration-scoring.json`; output is
`grades/grades.json`. This tests the real file handoff, not participant reliability.
It precedes the grading correction; that correction does not change blocked-run handling.
The runner's separate actual synthetic and owned-observation DB smokes, including earlier
failures and recovery, remain in [its verification report](usability/virtual-qa/runner-verification.md).

## Ticket reconciliation and next step

- SR-27 / #51 remains complete. SR-28 / #52 and SR-29 / #53 close in their bounded
  fixture/manual-tooling scopes.
- SR-30 / #54 remains open for empirical calibration on actual paired-control reports,
  including reviewed disagreements and effort. Its six authored agent-reviewed examples
  and deterministic software guards do not establish independent human calibration.
- SR-31 / #55's existing task can now receive the pilot handoff. First merge integrated
  main, freeze its manifest and any atomic critical policy, and start with a small
  calibration subset. Preserve the recipes' reviewed application baseline separately
  from current tooling main and derived builds. Missing critical policy yields N/A.
- The pilot ceiling stays 16 fresh participants total, sequential, each at most ten
  minutes or 60 browser actions. Failures count; no silent retries, paid-service expansion,
  source inspection by participants or automatic issue publication. Record actual
  action/time and evidence availability; fresh context is not OS access control.
- Seeded defects measure detection and must not become ordinary baseline-app bug tickets.
  Stop early for unusable evidence, uncertain ownership or unreliable grading. No bugs
  found is valid. Human timing, human calibration and customer understanding remain unknown
  unless actually measured by people; agent time is not human review effort.

The useful process improvement from this review is to require explicit review before
counting a control outcome, and to replay one actual runner artifact across the grading
boundary during integration. Existing offline CI covers the new checks. No further QA
platform expansion is justified before SR-31 reports usefulness and review cost.
SR-06, SR-12/13, accepted publication and real customer validation retain their existing gates.
