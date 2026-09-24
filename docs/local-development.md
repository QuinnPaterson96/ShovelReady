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
