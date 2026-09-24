# Native database lifecycle CI

SR-20 adds the stable check **`native-local-database-windows`** to `CI` on every
pull request and every push to main, without path filters. Propose this exact check
for branch protection only after integration review of successful hosted evidence;
this change does not alter repository settings. Existing Linux PostgreSQL service,
frontend and container jobs remain unchanged.

## Runner and command

The job selects `windows-2025` and explicitly uses
`C:\Program Files\PostgreSQL\17\bin`. The
[official runner image inventory](https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md#postgresql)
supplies PostgreSQL 17 binaries. No service setup action or installer is needed.
Before testing, each of `postgres`, `initdb`, `pg_ctl`, and `pg_controldata` must
exist and report major version 17; missing or changed binaries fail the job.
The runner image's patch version may advance; the actual versions appear in the log.
Checkout and setup-uv actions are commit-pinned. uv 0.12.17 installs Python 3.12 and
syncs the committed lockfile.

All inherited `PG*` variables are removed from this isolated job's test process
environment, logging names only. The refusal test injects a PG override and verifies
that the helper still rejects it; the helper's safeguards are unchanged.
The job neither starts nor stops the installed service and never uses its data directory.

```powershell
$env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN = 'C:/Program Files/PostgreSQL/17/bin'
$scratch = Join-Path ([IO.Path]::GetTempPath()) "native-lifecycle-$([guid]::NewGuid())"
uv run --locked python -m pytest --basetemp "$scratch" -v tests/test_local_database.py -p tests.native_lifecycle_guard --tb=no --show-capture=no -rN
```

The explicit plugin requires successful setup, call, and teardown reports for
`tests/test_local_database.py::test_native_lifecycle`. Skipping, deselecting, collecting
without running, or selecting no tests cannot return success. Ordinary pytest runs
without the plugin retain the native test's optional local opt-in.

CI uses the same fresh GUID basename under `RUNNER_TEMP`, outside the checkout.
On elevated Windows, the plugin grants only the current user SID inheritable full
access to the three fresh test directories (pytest base, test directory, scratch).
It adds no Users/Everyone access and does not recursively operate on another directory.
Python's restrictive temporary-directory ACL uses OWNER RIGHTS; elevated processes
can create files owned by Administrators, which
[PostgreSQL removes from its restricted token](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/common/restricted_token.c).
An explicit current-user ACE lets initdb read the password file while retaining restricted
execution. This is test setup for the elevated hosted runner, not a change to the
helper or evidence that manual elevated development has been fixed. Normal unelevated
local use needs no ACL adjustment.

## Isolation, behavior and diagnostics

The unchanged native test constructs its helper under pytest's fresh temporary path,
selects an available loopback port and ignores supplied development database URLs.
It exercises repeat start/migrate/seed/stop, seed failure before migration, exact
revision and all 15 source read-backs, single-history idempotency, restart retention,
and the real `/api/investigation` response with no screening claimed. It verifies
occupied-port and tampered-ownership refusal, restoring its own metadata before cleanup.
The four accompanying tests cover foreign directories/repository paths, occupied ports,
PG overrides, concurrent operators and redacted CLI errors.

The native test's `finally` stops only the helper-owned scratch cluster even on test
failure. Ownership verification still applies during cleanup; it never bypasses a
refusal to stop another server. A forcibly terminated job relies on destruction of
the disposable hosted runner. No persistent development database is involved.

Verbose test names, outcomes, exception types/stack locations and binary versions are
logged. Exception messages, full tracebacks, failure
summary details and captured test output are suppressed because exceptions can contain SQL data or
credentials. No artifacts upload `local.json`, server logs, database contents or
connection strings. Investigate failures with an isolated local reproduction; do not
enable unredacted CI output to diagnose driver errors.

## Verification evidence

Local Windows, September 24, 2026: the command above completed **5 passed, 0 skipped**
on Python 3.12.3 and 3.12.10 with PostgreSQL 17.2. One upstream FastAPI/Starlette TestClient
deprecation warning remains. Ruff passed for the new plugin.

Controlled invocations used the same plugin and file, without starting any cluster:

- Remove `SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN`: **4 passed, 1 skipped; exit 1**.
- Add `-k 'not native_lifecycle'`: **4 passed, 1 deselected; exit 1**.
- Add `-k 'no_such_test'`: **5 deselected; exit 1**.

All three emitted `Native lifecycle NOT verified` naming the required test. These
intentional failures are local checks, not failing committed workflow steps.

Hosted evidence: [successful CI run 36073246987](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36073246987),
commit `ae7707d`, September 24, 2026. The
[Windows job log](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36073246987/job/107878724938)
records image `windows-2025-vs2026` version `20260922.246.2`, Python 3.12.10,
PostgreSQL 17.11 for all four binaries, and the exact command above with a fresh
`RUNNER_TEMP` base. All five named tests passed, including `test_native_lifecycle`:
**5 passed, 0 skipped, 1 warning in 10.45s**. The Linux service job also passed
**210 tests and 28 subtests**, with the single expected native opt-in skip there;
frontend and container-startup passed.

Earlier hosted runs caught inherited PGUSER/PGPASSWORD settings and elevated scratch
ACL behavior. Credential-free, non-server initialization probes isolated the ACL issue;
those diagnostic probes were removed from the final workflow. The helper was unchanged.

This verifies native tooling and observation retrieval, not accepted zoning data,
legal interpretation, screening, publication or deployment.

