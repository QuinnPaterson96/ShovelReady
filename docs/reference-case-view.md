# Public-case investigation view (SR-24)

Implemented on `codex/public-case-view`, from merged planning checkpoint
`24b6cc0d503d1b53a242e23339eb0fbc447a4195` (PRs #40-#43 and #47).
The PR head identifies the delivered revision. No inventory edits or accepted data publication.

## API and scope

`GET /api/reference-cases` serves one bounded ten-case envelope. It requires no database.
The UI mode **Public cases · provisional historical evidence** starts at VIC-PC-001,
419/421 Stannard Avenue, and offers the ten committed records in a selector. The existing
spatial mode remains the default; fictional saved examples remain a separate mode.

`app/reference_cases/` validates and projects the application-owned
`docs/research/public-cases/cases.json`. No request parameter selects a file or URL.
`public-case-view.v1` is the explicit DTO version. Identity contains the source schema,
inventory revision, access date and SHA-256 of the exact inventory bytes read. This is
an inventory identity, not an accepted dataset release or spatial observation revision.
Line-ending changes alter this byte identity; the recorded inventory revision remains
available alongside it. The current inventory revision is `2026-09-24.integration-1`.

The boundary rejects unsupported versions/fields, malformed structures, duplicate JSON
keys/cases/source URLs/evidence entries, dangling source/rights references, inconsistent
counts or jurisdiction scope, invalid dates and unsupported acceptance/permit assertions.
Missing measurement fields are malformed; explicitly null values/units remain unknown.
An empty measurement list is valid and explicitly says no measurements were recorded.
Missing/invalid inventory returns a generic 503 without paths or validation payloads;
health and other modes stay available. POST returns 405; arbitrary subpaths return 404.
The fixed path is not exposed as a static directory.

Only explicit typed fields are returned. Local-artifact metadata is omitted and never
opened. React renders annotations as inert text. Source and rights links must use HTTPS
on the observed hosts `tender.victoria.ca`, `www.victoria.ca`,
`saanich.ca.granicus.com`, or `vancouver.ca`; credentials, nonstandard ports, backslashes
and whitespace are rejected. Browser validation repeats the shape/version/link/reference
checks. The checked-in JSON Schema is generated from Pydantic and a regression test
checks for schema drift. TypeScript types are explicit and maintained with that boundary.

Original values, units, table roles and conflicts remain annotations, without automatic
normalization or comparison. Source facts, official interpretations, researcher
inferences, historical conditions, later plan revisions and missing inputs have distinct
sections. Unknown permits, as-built verification and current applicability stay unknown.
Saanich and Vancouver display **Transfer example**. Source access method, inspection
limits, dates, hashes and rights notes remain available, including Vancouver's recorded
403/no-local-bytes limitation. External availability is not checked at runtime.

There is no screening, current-law assertion, legal measurement, prefab fit, source
scraping, PDF republication or inferred site/map linkage. No source review or customer
validation is claimed by software checks. SR-25's separate historical packet is not read.

## Packaging and recovery

Docker adds exactly one metadata file: `cases.json`, at the same relative application
path. No research directory, PDF, render or temporary inspection file is copied into the
runtime image. The frontend test reads repository metadata only when tests execute;
it is not bundled into browser JavaScript. No dependency, CI, migration or shared
configuration changes. Revert the additive route/mode and Docker COPY to roll back;
there is no database mutation or active release to recover.

## Reproduce and verify

From this managed worktree in PowerShell, Python 3.12.3 / Node 22.14.0:

```powershell
python -m uv sync --locked
npm ci --prefix frontend
python -m uv run --locked ruff check app tests contract_tests migrations scripts docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py
python -m uv run --locked pytest tests/test_reference_cases.py -q
$env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN='C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin' --demo --http-port 18744
python -m uv run --locked python docs/pilot-inputs/test_acquire.py
python -m uv run --locked python docs/pilot-inputs/test_intake.py
python -m uv run --locked python docs/usability/check_fixtures.py
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
git diff --check
```

The full disposable run passed **252 tests + 28 contract subtests, no skips**, including
native lifecycle tests. The runner created only its own scratch cluster under
`C:/Temp/shovelready-postgres-kll4ryg3`, then imported the licensed observation packet for
browser verification. The initial run preceded required-version schema
hardening; a final run at implementation commit `b9fe7f1`, using the same command
without `--demo --http-port 18744`, passed **252 tests + 28 subtests, zero skips** in
16.04 seconds and exited 0. It used `C:/Temp/shovelready-postgres-6imkta9p` and stopped
the cluster. The focused **32 backend tests** and **7 frontend tests**, typecheck/build
and lint also passed for the delivered implementation. Acquisition 2, intake 10 and fictional fixture 3 checks passed.
The existing Starlette/httpx deprecation warning remains. No live models, paid resources,
Styx access, shared databases or default persistent previews were used.

Actual built browser checks used port 18744 with the owned disposable DB and port 18745
with database/spatial configuration unset. Checked all ten selector options, initial
Stannard, original 28.50/2.40 m roles, DDP01047/later revision, the inventory identity,
Pilot's conflicting 22.25/22.75, Prior's empty measurements, Saanich recommendation-only
status, Vancouver conditional appeal and source-access limitation, the real spatial
viewer and fictional preview. Checked the rendered layout by screenshot. A new mode-label
encoding defect was found and fixed; the rebuilt label was rechecked. This is developer
verification, not a blinded participant or human usability study. Reload success returned to Stannard;
after stopping the owned API, reload displayed a clear error and removed all stale
case evidence. Both test API processes and the browser tab were closed. Stopping the
owned demo API caused the enclosing demo command to exit nonzero after the tests had
passed; its finally block confirmed the disposable database stopped. The separate
final non-demo test command above exited 0.

A database-free demo needs only the built frontend and the normal API:

```powershell
# In a new shell with no SHOVELREADY_DATABASE_URL or spatial selection configured:
python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 18745
```

Open the local URL and choose Public cases. Stannard loads even when the spatial mode
reports that its database/configuration is unavailable. Reload retrieves and validates
the inventory again; failures clear evidence rather than retaining stale case results.

Local `docker info --format '{{.ServerVersion}}'` failed: initially no Linux-engine
pipe, then the existing desktop-linux context metadata was unavailable after starting
the installed Docker Desktop. No Docker configuration was changed to work around it.
Local container execution is therefore blocked; hosted container build/startup and
final-head CI evidence are recorded in the PR handoff. All four required jobs passed
for implementation commit `b9fe7f1`: [hosted run](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36075960045).
The container job verifies image build and health/frontend startup; it does not
separately probe the public-case endpoint inside the image. Independent source
review, current rule applicability, authorized source retention, accepted publication,
real design/site/placement inputs and user validation remain open; this does not complete
parent SR-12 or the accepted source-to-screening path.
