# SR-29 verification handoff

September 24, 2026 (America/Vancouver; retained receipts use September 25 UTC).
Implementation instructions are in [runner.md](runner.md). This records software
preparation/cleanup only, not participant results or completion of SR-31.

## Provenance and checks

- Preparation commit `b5b517a` was preserved; `origin/main` was merged normally at
  `4a43e86`, including SR-27 integration `303b40aeb9e69f476878959148ed299cad2a5e9b`.
- Runner implementation `dd9d4a2`, Windows cleanup correction `cc5cdde`. Subsequent
  changes add failure-stage diagnostics and offline process/deadline/input-drift tests;
  the actual launch evidence below covers `cc5cdde`, not those later diagnostic changes.
- Actual SR-28 pack: `d7983cd751fcbea23d59482b4e1475a098b670bd`, [PR #59](https://github.com/QuinnPaterson96/ShovelReady/pull/59).
  Read directly from its separate checkout; no fixture copies are added to this PR.
- Local commands from the runner checkout, Python 3.12.3 / uv 0.12.17:
  `python -m uv run --locked ruff check scripts/virtual_qa contract_tests/test_virtual_qa_runner.py`
  passed; `python -m uv run --locked pytest -q contract_tests/test_virtual_qa_runner.py contract_tests/test_virtual_qa_contracts.py`
  passed **63 checks, zero skips** after the diagnostic/test changes. Tests use synthetic
  local files/Git repositories and simulated process/session events, no live participant.
- `plan(..., seed=42, count=5, mode="task_completion", dry_run=True)` and the equivalent
  six-case `defect_detection` plan validated all 11 actual cases/recipes and selected pins
  without creating output. Other fault variants' browser review belongs to SR-28.

## Actual preparation/cleanup smoke checks

Both launches used `--source C:/Users/quinn/.codex/worktrees/ed20/ShovelReady`, the
fixture root `C:/Users/quinn/.codex/worktrees/4185/ShovelReady/tests/fixtures/virtual_qa`,
Node 22.14.0, separate explicit output/scratch roots, `--index 0`, and `--smoke`.
No dispatch command, participant/model call or final participant run was produced.

| Evidence | Synthetic fault | Licensed observation |
|---|---|---|
| Case | `affirmative-label-fault` | `vic080-evidence` |
| Output | `C:/Temp/sr29-smoke-v2-fault` | `C:/Temp/sr29-smoke-v3-observation` |
| Attempt | `04c947c43d0e4f7eb34282cdd12e962a` | `7a65a41be55345dbab48a60fe3da294b` |
| Scratch parent | `C:/Temp/sr29-scratch-v2` | `C:/Temp/sr29-scratch-v3` |
| HTTP port | 18092 | 18094 |
| Database | None | New owned cluster; explicit PostgreSQL 17 binaries; port 61244 |
| Baseline commit | `303b40aeb9e69f476878959148ed299cad2a5e9b` | Same |
| Served commit | `53faae86867aa279b42017d98ddf67ea09d3e3fe` | Baseline unchanged |
| Derived tree | `2603f292cf08d1bdb839512cd2d7a749cacf4a8e` | `c2bcf02db918fe4fd7eb07367da2f48cedeef867` |
| Changed tracked paths | Only `frontend/src/preview/InvestigationPreview.tsx` | None |
| Identity/frontend HTTP check | Passed | Passed |
| Real investigation HTTP check | N/A, database-free | Passed after start/migrate/seed and exact revision validation |
| Shutdown/removal | Owned HTTP exited; marked scratch removed | Owned HTTP exited; DB stop verified; marked scratch removed |
| Lifecycle | `smoke_only`, `cleanup_ok=true` | `smoke_only`, `cleanup_ok=true` |

Each output retains frozen selection/case/recipe, prepared record, nonsecret execution
receipt (tracked/build hashes), prompt and lifecycle. The observation revision is
`spatial:sha256:db45fb736cd0fe2455d65b64105b038539bc7695e62666be6b2840474af8aee7`;
this is unreviewed observation data, not an accepted release. No DB credentials were
copied to output, this note or Git.

Exact prepare commands after corresponding fixed-ID plans:

```powershell
python -m uv run --locked python -m scripts.virtual_qa.runner prepare --output C:/Temp/sr29-smoke-v2-fault --source C:/Users/quinn/.codex/worktrees/ed20/ShovelReady --scratch C:/Temp/sr29-scratch-v2 --index 0 --port 18092 --smoke
python -m uv run --locked python -m scripts.virtual_qa.runner prepare --output C:/Temp/sr29-smoke-v3-observation --source C:/Users/quinn/.codex/worktrees/ed20/ShovelReady --scratch C:/Temp/sr29-scratch-v3 --index 0 --port 18094 --postgres-bin 'C:/Program Files/PostgreSQL/17/bin' --database-port 61244 --smoke
```

Use new output/scratch locations and available explicit ports when reproducing;
these retained output directories intentionally cannot be overwritten.

## Failures retained and corrected

The first synthetic smoke on `dd9d4a2` served successfully but could not remove
Windows read-only Git object files. Its output is `C:/Temp/sr29-smoke-dd9d4a2-synthetic`,
attempt `4178261e22774b52b1b90e584f3f2aa8`. `cc5cdde` adds a permission-specific,
contained retry for deletion and a regression test. The next synthetic smoke passed.

The first observation preparation on `cc5cdde` failed binding explicitly selected
port 55483 with `PermissionError`, before database initialization. Output is
`C:/Temp/sr29-smoke-v2-observation`, attempt `f941433b3534498689d2d86919ff44f0`.
The helper's stop could not verify an uninitialized cluster, so the failed lease and
cleanup record were retained. A fresh experiment with probed port 61244 passed.

After read-only process inspection found **zero matching owned Python/PostgreSQL
processes**, both failed scratch roots were checked for exact owner marker and absence
of DB configuration/postmaster PID, then removed through the corrected contained helper.
Separate `recovery.json` receipts record this action; original failures/leases remain
unchanged. These were explicit environment smoke retries, not participant retries or
successful participant evidence. No default/shared database or Styx resource was used.

## Remaining limits

Manual action counts and participant termination require facilitator observation;
the runner stops its own serving process on the time ceiling, not a separate participant.
Killed owners require explicit recovery; cross-experiment pilot budget coordination is
manual. No automatic dispatch, scheduler, screenshot export or evidence fetch is claimed.
Only one actual fault variant plus the observation path needed runner launch smoke checks;
SR-28 separately reviewed all control variants. Final-head CI evidence belongs in the PR.
Independent source/legal review, accepted publication, live pilot and real-user validation
are separate gates and were not performed here.
