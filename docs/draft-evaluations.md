# SR-32 draft evaluation bridge

The local CLI computes the existing `bounded-scalar.v1` evaluator against an
`sr-10.v1` request. PostgreSQL retains its complete `EvaluationReport`, including
the embedded request, provenance, review attestations, alternatives, quantities,
exact revisions and diagnostics. This is draft-only software execution, not source
acceptance, legal verification, an SR-04 release-shaped result or publication.

## Storage and compatibility

Migration `0004` adds only the `draft_evaluation` kind to the existing records check
constraint. Its immutable record/logical ID is `report.request.evaluation_id`.
The repository revalidates and recomputes reports on import; supplying an authored
outcome cannot bypass computation. Identical JSON replay is a no-op; changed content
under the same ID fails, and the entire batch rolls back. Changed inputs require a
new evaluation ID. There is no active pointer or implicit migration.

The report is a self-contained diagnostic snapshot. Its nested request validates
embedded evidence and input references under the unchanged SR-10 contract. It does
not manufacture source/rule/fact rows or add relational edges: missing declared
rule/fact revisions deliberately remain investigation diagnostics. Supplied review
metadata is retained, not independently certified. Existing storage kinds, payloads,
readers and append-only triggers are unchanged; older readers can still read their
own kinds but cannot interpret the new kind.

Apply migrations explicitly and serially. Application rollback can leave `0004`
installed and existing records intact; turn off the demo when reverting the reader.
Destructive downgrade is refused. Recovery is a forward fix or restoration of a
backup into a separate database. Production backup restoration remains untested.

## Runnable local imports and API

From this checkout, use only an explicitly owned ShovelReady database. The
[owned local database helper](local-development.md) supports a separate `--root`
outside Git and an unused `--port`; do not reuse another task's database or port.
Load that helper's `local.json` via your local configuration mechanism into
`SHOVELREADY_DATABASE_URL`. The legacy `DATABASE_URL` is ignored.

```powershell
python -m uv sync --locked
# Set SHOVELREADY_DATABASE_URL to the explicitly owned project's database.
python -m uv run --locked python -m app.persistence.migrate
python -m uv run --locked python -m app.draft_evaluations --demo
# Identical replay is safe:
python -m uv run --locked python -m app.draft_evaluations --demo
# For a private local request (not exposed through HTTP):
python -m uv run --locked python -m app.draft_evaluations --request C:/private/request.json
$env:SHOVELREADY_DRAFT_EVALUATIONS_ENABLED='true'
python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 18092
# In another terminal:
Invoke-RestMethod http://127.0.0.1:18092/api/draft-evaluations/synthetic-direct-pass
Invoke-RestMethod http://127.0.0.1:18092/api/draft-evaluations/synthetic-missing-fact
Invoke-RestMethod http://127.0.0.1:18092/api/draft-evaluations/synthetic-placement-failure
```

The CLI accepts request JSON only, never a supplied report, and never fetches source
URLs. `--demo` computes and imports all three requests in one transaction. Inputs and
their [invented arithmetic artifact](../app/draft_evaluations/inputs/arithmetic.md)
ship inside `app/`, including the container. Runtime code does not import tests.

For an entirely disposable integrated demo, the guarded runner creates its own
cluster and available database port, runs the suite, explicitly migrates/imports
observations and all three drafts, then serves HTTP on the selected unused port:

```powershell
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin' --demo --http-port 18092
```

Ctrl+C stops that demo and its owned database; diagnostic files remain in the
printed temporary directory. Build `frontend` separately when a UI is wanted.
SR-33 supplies the draft inspector; combined live browser verification belongs to
integration after both changes merge. Direct HTTP inspection works independently.

Success is the existing unwrapped report JSON. Only the three named aliases above
are recognized; each selects the exact repository-packaged request and its
`draft-demo:<alias>:v1` identity. The API compares the entire retained request and
recomputes the entire expected report before returning it. Query parameters cannot
select private records or source files. There is no list, upload or write route.

| Condition | HTTP status |
|---|---|
| Flag absent or anything other than literal `true` | 503 |
| Enabled, unknown alias or known case not imported | 404 |
| Invalid/version-incompatible stored report, wrong identity, pin or computation | 502 |
| Missing/invalid database configuration or unavailable database/schema | 503 |

Error details are fixed safe strings. Startup performs no connections, imports or
migrations. Pin changes need a deliberate new diagnostic identity to avoid immutable
conflicts; never overwrite an imported record to update the demo.

## Verification and remaining gates

The backend tests compute all reports using the real evaluator. Independent
arithmetic expects 10 m <= 10 m to pass, absent width to remain investigation, and
11 m <= 10 m to fail only for the supplied placement. Database tests cover migration
from populated `0003`, replay/conflict and rollback, immutable updates/deletes,
old-record readback, full JSON roundtrip, absent rule/stale fact diagnostics,
CLI-to-HTTP retrieval, private-request isolation and corrupt raw-storage rejection.

```powershell
python -m uv run --locked ruff check app tests contract_tests migrations scripts
$env:SHOVELREADY_LOCAL_LIFECYCLE_POSTGRES_BIN='C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin'
```

Required backend, frontend, container and native Windows lifecycle CI remain intact.
Actual check results and exact base/head are recorded in the PR handoff. No live
model calls or cloud resources are involved. Independent source applicability and
rights review, controlled design/site/placement inputs, attributed real expected
outcomes, accepted publication and real-user validation remain separate gates.
This does not complete parent SR-10, SR-12 or SR-13 accepted-data criteria.
