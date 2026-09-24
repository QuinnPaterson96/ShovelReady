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

The runner's known `PGBIN`, `PGDATA`, and `PGROOT` metadata is removed from the test
process environment. Other unexpected PG overrides still trigger the helper's refusal.
The job neither starts nor stops the installed service and never uses its data directory.

```powershell
$env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN = 'C:/Program Files/PostgreSQL/17/bin'
uv run --locked python -m pytest -v tests/test_local_database.py -p tests.native_lifecycle_guard --tb=no --show-capture=no
```

The explicit plugin requires successful setup, call, and teardown reports for
`tests/test_local_database.py::test_native_lifecycle`. Skipping, deselecting, collecting
without running, or selecting no tests cannot return success. Ordinary pytest runs
without the plugin retain the native test's optional local opt-in.

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

Verbose test names, phase outcomes and binary versions are logged. Tracebacks and
captured test output are suppressed because driver exceptions can contain SQL data or
credentials. No artifacts upload `local.json`, server logs, database contents or
connection strings. Investigate failures with an isolated local reproduction; do not
enable unredacted CI output to diagnose driver errors.

## Verification evidence

Local Windows, September 24, 2026: the command above completed **5 passed, 0 skipped**
on Python 3.12.3 and PostgreSQL 17.2. One upstream FastAPI/Starlette TestClient
deprecation warning remains. Ruff passed for the new plugin.

Controlled invocations used the same plugin and file, without starting any cluster:

- Remove `SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN`: **4 passed, 1 skipped; exit 1**.
- Add `-k 'not native_lifecycle'`: **4 passed, 1 deselected; exit 1**.
- Add `-k 'no_such_test'`: **5 deselected; exit 1**.

All three emitted `Native lifecycle NOT verified` naming the required test. These
intentional failures are local checks, not failing committed workflow steps.

Hosted Windows CI evidence will be recorded here after the PR run completes.
This verifies native tooling and observation retrieval, not accepted zoning data,
legal interpretation, screening, publication or deployment.

