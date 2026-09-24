# Persistent local development database

This is an optional native PostgreSQL workflow for manual exploration and API/UI
development. It owns a separate cluster; it never uses an installed database service.
Automated suites continue to use `scripts/test_postgres.py` or the guarded CI service.
Never supply this database as `SHOVELREADY_TEST_DATABASE_URL` or give it disposable
test acknowledgement. Its fixed `shovelready_local` name deliberately fails the test guard.

## Operator commands (PowerShell, repository root)

Requires Python 3.12, the locked Python dependencies, and PostgreSQL 17 binaries.
The Windows default binary directory is `C:/Program Files/PostgreSQL/17/bin`.

```powershell
python -m uv sync --locked
python -m uv run --locked python scripts/local_database.py start
python -m uv run --locked python scripts/local_database.py status
python -m uv run --locked python scripts/local_database.py migrate
python -m uv run --locked python scripts/local_database.py seed
python -m uv run --locked python scripts/local_database.py stop
```

`start` initializes once, starts the owned cluster and creates its dedicated database
if absent. It does not migrate or import. Repeat start, migrate and seed preserve data;
seed uses the current idempotent `app.spatial.importer.import_pilot` implementation.
Migrate calls `app.persistence.migrate.upgrade`. Failed commands exit nonzero, with
redacted diagnostics. HTTP startup remains independent of these operations.

The default port is **55432**, bound only to **127.0.0.1**. On September 24, port
5432 had an unrelated listener and 55432 was free. Every start checks for an occupied
port and refuses to attach to another server; it does not pick an implicit new port.
To choose another free port/location, supply `--port 55433 --root 'C:/local/ShovelReady-db'`
on **every** command from initialization onward. `--postgres-bin` also must match the
initialized configuration. Do not edit the port in a running cluster's configuration.

## Files and API/UI handoff

Default files live at `%LOCALAPPDATA%/ShovelReady/local-database`, outside the checkout:

- `data/`: persistent PostgreSQL cluster.
- `server.log`: PostgreSQL diagnostics.
- `local.json`: ownership, binary path, port, system identifier and secret connection URL.
- `operator.lock`: exclusive command lock, removed when the command exits normally.

The generated random password uses SCRAM authentication. The directory inherits the
Windows user's local profile ACL; keep it private and do not share or commit its
contents. On POSIX, newly created root/config files request modes 0700/0600. The
temporary initialization password file is removed after initdb. There is no reset,
drop, automatic cleanup, service registration or password recovery operation.
Stop/restart and worktree replacement preserve all files. Start from the replacement
checkout using the same root, binary directory and port.

Supply configuration explicitly in the shell that will launch the API:

```powershell
$localDbConfig = Get-Content -Raw "$env:LOCALAPPDATA/ShovelReady/local-database/local.json" | ConvertFrom-Json
$env:SHOVELREADY_DATABASE_URL = $localDbConfig.SHOVELREADY_DATABASE_URL
$env:SHOVELREADY_SPATIAL_COLLECTION = 'victoria-pilot-three-leads'
$env:SHOVELREADY_SPATIAL_REVISION = '<paste the exact revision printed by seed>'
npm ci --prefix frontend
npm run build --prefix frontend
python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8012
```

This assignment does not print the password. No `.env` auto-loading is assumed.
The helper ignores `SHOVELREADY_DATABASE_URL` and legacy `DATABASE_URL` in its calling
shell and always loads its owned local configuration. Clear inherited `PG*` variables
before helper commands: these are refused to prevent libpq service/options overrides.
No Styx credentials or cloud configuration are used.

`seed` prints the **actual stored spatial revision ID after read-back**. Supply that
exact value through SR-12's reviewed revision-selection configuration; this helper
does not invent an API revision environment variable or select the latest revision.
The verified Windows scratch import returned:

```text
spatial:sha256:db45fb736cd0fe2455d65b64105b038539bc7695e62666be6b2840474af8aee7
```

Use your own seed output because runtime/processing versions participate in identity.
The bounded checked-in licensed Victoria packet contains 15 sources, nine responses,
ten source-scoped features and three parcel analyses. Source hashes, source/revision
identities and unreviewed status are preserved by the existing importer. No source
recapture, accepted zoning release, screening result or publication is created.

The integrated API uses `SHOVELREADY_SPATIAL_REVISION` and the collection value above.
Open `http://127.0.0.1:8012` for the built real-observations UI. Use a free HTTP port
and launch from the merged checkout; an already-running preview in another worktree
does not pick up these changes. Ctrl+C stops HTTP; the database remains available
until its explicit `stop` command. See [the API handoff](investigation-api.md).

## Ownership and recovery limits

An existing nonempty directory without this helper's configuration is refused.
Operations compare the configured location and PostgreSQL system identifier with
disk; running operations additionally check the server's data directory, identifier,
port and listen address before migration, import or stop. A concurrent helper is
refused. This protects against accidental foreign-cluster use, not a malicious local
administrator who can rewrite cluster files and credentials.

After an interrupted initialization, keep the partial directory for diagnosis and
choose a new empty root; the helper does not erase or adopt it. After an interrupted
command leaves `operator.lock`, confirm that no helper command is still running before
manually removing that exact lock file. A failed migration/import is not reported as
success; inspect local server diagnostics and correct the cause before retrying.
There is no automated backup/restore workflow; persistent development data is not a
production deployment. Do not race external migration tools against this helper.

## Verification

Focused integration tests opt in to native binaries but always create a **new scratch
cluster under pytest's temporary directory**, on an available loopback port. They
never use the manual root or any supplied URL, and stop their own cluster in `finally`.
These checks use the same disposable-location/port convention as the existing runner,
but deliberately retain the manual database name to verify that suite guards reject it.
Ordinary CI skips this native lifecycle case unless explicitly configured; its existing
disposable PostgreSQL suite remains unchanged.

```powershell
$env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN = 'C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked pytest -q tests/test_local_database.py
Remove-Item Env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN
python -m uv run --locked ruff check scripts/local_database.py tests/test_local_database.py
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin'
```

On September 24, the focused run passed **5 tests** and lint passed. The existing
disposable runner separately passed **123 tests and 28 contract subtests**, with only
the opt-in native lifecycle case skipped (already run above). The existing
Starlette/httpx deprecation warning remains. Both verification clusters were stopped.

Verified on Windows with Python 3.12.3 and PostgreSQL 17.2: initialization, repeated
start/migrate/seed, all 15 source payloads and exact spatial revision read-back,
stop/restart retention, pre-migration seed failure, occupied-port refusal before init
and after stop, foreign directory/system-identifier refusal, operator locking,
connection-override rejection and automated test guard separation. CLI failures are
checked for nonzero exit and secret redaction. Linux/macOS paths are supported through
`--postgres-bin` and default to `~/.local/share/ShovelReady/local-database` when
`LOCALAPPDATA` is absent, but those platforms have not been exercised. Run PostgreSQL
as an unprivileged user. No API/UI servers were started or restarted by this task.

Integration review subsequently verified the helper -> restart -> real API path
without substituting the connection/repository, preserving the exact seeded spatial
payload and all 15 source records. The combined suite passed 211 cases and 28
contract subtests with the native lifecycle opt-in enabled, with no database skips.
The manual review used a separate fresh scratch database, not the persistent default.

## Reproducible observation demo (SR-21)

After explicitly running `start`, `migrate` and `seed` above, launch from a clean
committed checkout with Python 3.12 and Node 22.14+ (22.x):

```powershell
./scripts/demo.ps1 -Config "$env:LOCALAPPDATA/ShovelReady/local-database/local.json" -Revision '<exact spatial:sha256:... printed by seed>'
# Optional: -Port 8013 (default is 8012; loopback only)
```

The script can be invoked by absolute path from another working directory. Relative
configuration paths resolve against the caller's directory. It installs locked npm
dependencies and builds the frontend on each launch, then runs one foreground FastAPI
server. `uv run --locked` prepares Python dependencies if needed. No migration, seed,
publication or database start/stop happens during launch. Ctrl+C stops HTTP only;
stop the owned database separately when desired.

The launcher refuses dirty/untracked checkout files, unsupported Python/Node/environment,
missing or foreign configuration, a stopped/unavailable database, an invalid or missing
exact licensed revision, occupied HTTP ports and failed frontend builds. It reserves
the serving socket before building and rechecks checkout identity after building.
It never pulls, switches branches, resets, stashes or adopts/kills an existing process.
Do not edit the checkout while it is serving: the process and frontend retain their
launch/build identity and do not hot-reload later changes. Ignored local files and
installed toolchains are outside the Git cleanliness guarantee.

Expand **Application and observation identity** near the top of the page to inspect
the API application commit, frontend build commit and selected spatial revision.
`GET /api/identity` returns `sr-21.identity.v1`, a nonsecret snapshot captured at app
creation. The frontend also embeds its own commit at build time and warns when that
differs from the API's declared frontend build. Identity is diagnostic, not signed
attestation. Generic/container starts without identity variables report unavailable;
`/health` remains liveness-only and no-database startup remains supported.

Only commit hashes, revision identifiers and explicit no-screening status are returned;
configuration paths, URLs, passwords and environment dumps are excluded. A selected
observation revision is not an accepted dataset. The fictional preview stays separate.
The integrator selects the stable demo checkout after merge.

Focused checks: `python -m uv run --locked pytest -q tests/test_demo_identity.py tests/test_startup.py`,
`python -m uv run --locked ruff check app/identity.py app/main.py scripts/demo.py tests/test_demo_identity.py`,
and frontend `npm test`, `npm run typecheck`, `npm run build`. Initial implementation
checks passed 10 backend cases and 4 frontend cases; the existing Starlette/httpx warning
remains. Clean-commit scratch-launch evidence is recorded below after verification.

### Clean-commit launch evidence, September 24, 2026

Implementation commit `3bc010aafadd0a96a20c92ea2c41ff30f5b09d32` was committed
before launch and remained clean throughout the real launch. Windows PowerShell,
Python 3.12.3, Node 22.14.0 and PostgreSQL 17.2 were used. A new scratch root outside
Git was allocated under the system temporary directory; no existing preview or default
persistent database was changed. The exact commands were (with `$scratchRoot` the
new GUID-named temporary root, and `$repo` this managed task checkout):

```powershell
python -m uv run --locked python scripts/local_database.py start --root $scratchRoot --port 55581
python -m uv run --locked python scripts/local_database.py migrate --root $scratchRoot --port 55581
python -m uv run --locked python scripts/local_database.py seed --root $scratchRoot --port 55581
$revision = 'spatial:sha256:db45fb736cd0fe2455d65b64105b038539bc7695e62666be6b2840474af8aee7'
# From C:/Temp, not the repository directory:
& "$repo/scripts/demo.ps1" -Config "$scratchRoot/local.json" -Revision $revision -Port 58121
Invoke-RestMethod http://127.0.0.1:58121/health
Invoke-RestMethod http://127.0.0.1:58121/api/identity
```

The actual PowerShell launch rebuilt the frontend, served the real three-lead viewer,
and returned health 200. Browser inspection expanded the identity panel and found both
full commit hashes matching the launch commit, the exact seeded revision, and the
explicit no-screening/non-accepted-release notice. The real observation view also
showed that same selected revision. No database URL or local path appeared in identity.

While it ran, repeat Python launcher invocations with the same port, missing config
(on port 58122), and an all-zero spatial digest (on port 58122) each exited 1 with
specific redacted diagnostics. Ctrl+C completed Uvicorn shutdown; the captured HTTP
PID no longer existed and port 58121 had no listener. `local_database.py status`
still reported running. Explicit `stop --root $scratchRoot --port 55581` followed by
`status` reported stopped. Launch with that stopped database then exited 1; neither
scratch port retained a listener. Scratch files remain outside Git for diagnosis.

Focused backend checks now include 12 passing cases: immutable identity snapshots,
invalid-value redaction, no-database health, dirty-checkout refusal, missing/invalid
configuration and revision, frontend build failure, checkout changes during build,
and unsupported environment. Actual CLI dirty-checkout refusal was also exercised
after adding this evidence. Lint passes; frontend results remain 4 tests, typecheck
and build passing. No live model calls or accepted screening were exercised.
Linux/macOS, alternate Node versions, browser stale-build warning, and cancellation
mid-npm-install were not manually exercised. Unit tests simulate failed builds and
checkout changes; the actual build succeeded. The later evidence/test-only commit
does not replace the launch commit recorded above.
