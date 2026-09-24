# SR-08 persistence and adapter handoff

Implemented for the provisional SR-04 payloads. This is storage for preliminary
scouting inputs and investigation history, not accepted zoning data or publication.
One PostgreSQL database, SQLAlchemy Core, psycopg and explicit Alembic migrations
are used. HTTP startup does not import this layer, connect, or create tables.

## Import/read interface

```python
from app.persistence import Repository, connect
from app.contracts.common import SourceSnapshot

engine = connect(project_database_url)  # explicitly configured ShovelReady database
repository = Repository(engine)
source = SourceSnapshot.model_validate(source_payload)
repository.import_records([source])
retained = repository.get("source", source.snapshot_id)
engine.dispose()
```

`import_records(iterable)` accepts typed objects in any order. Every object is
revalidated, including unchecked `model_copy` or `model_construct` instances.
All records and references commit together or roll back. Supply referenced
records in the batch or import them first. Same kind/ID and identical validated
JSON is a no-op; changed content at that ID raises `ValueError`. Equality ignores
JSON key order but retains ordered arrays and serialized decimal strings; it is
not a semantic equivalence detector. Database failures raise SQLAlchemy exceptions.
Bound parameters are hidden, but callers should not log raw payloads or database
error details.

| Kind | Accepted payload | Record ID / logical ID |
|---|---|---|
| `source` | `SourceSnapshot` | snapshot / source |
| `design`, `site`, `placement` | corresponding SR-04 revision | revision / logical |
| `candidate` | `RuleCandidate` | candidate / candidate |
| `run` | `app.persistence.payloads.ExtractionRun` | trace run / run |
| `rule` | `AcceptedRuleRevision` | revision / logical |
| `draft` | `DatasetReference` | release / dataset |
| `evaluation` | `EvaluationResult` | evaluation / evaluation |
| `review` | `app.persistence.payloads.ReviewEvent` | event / event |

Candidates automatically retain their trace as an immutable run. Multiple
candidates from one run must agree on that trace. Standalone `ExtractionRun`
retains raw output references before a valid candidate exists; failed candidates
retain status, issues and searched scope. Artifact bytes stay at their URI,
identified by SHA-256. Storage neither fetches URIs nor verifies byte availability;
acquisition owns that. No shared SR-04 contract changes were needed.

`get(kind, record_id)` returns a validated payload or raises `ValueError` if absent.
`history(kind, logical_id)` returns revisions by insertion time then ID, without
inferring a current revision. `reviews(kind, record_id)` returns append-only
review events in the same order. `evaluation_inputs(evaluation_id)` returns a dict
with `evaluation`, `design`, `site`, `placement`, `draft`, `rules` and `sources`
pinned to the original result. Extra sources used solely by design/site provenance
can be read by snapshot ID using `get`; they need not be regulatory coverage.

Review events require an existing target and attributed SR-04 `Review` (reviewer,
timestamp, scope, rationale and decision). They never rewrite earlier embedded
reviews. Acceptance/correction creates a new revision with its own review.
Accepted rules require `identity_decision`; record exact predecessor revisions
in `supersedes` for corrections, splits or merges. Targets must exist and match
logical IDs. There is no identity-matching algorithm: the importer/reviewer must
identify ambiguity and record the decision, not infer IDs from section numbers.

All nested evidence, candidate sources, resolved dependencies, predecessors,
input references and draft memberships are checked. Placement CRS and evaluation
input consistency are checked without geometric inference. Unresolved references
stay unresolved. `spatial_snapshot_ids` currently identify spatial `SourceSnapshot`
IDs (or labelled test fixtures); separate spatial feature storage is SR-09 work.

## Storage and migrations

`records` has a `(kind, record_id)` primary key, indexed logical identity,
insertion time and JSONB. `record_references` has foreign-keyed edges to exact
records. This small relational envelope avoids duplicating evolving provisional
shapes. PostgreSQL triggers reject UPDATE, DELETE and TRUNCATE of both tables.
Validation and complete edge construction belong to the repository: raw SQL
inserts are not a supported import API. Triggers do not constrain a database owner
who deliberately disables them.

Only draft release metadata exists. There is no active pointer, promotion,
publication eligibility/closure check, or automatic use of saved results for
customers. SR-11 owns publication and eligibility policies. Storing a valid result
does not establish that an evaluator ran or that its conclusion is legally correct.

Apply migrations explicitly, supplying a project URL through local configuration:

```powershell
# Set SHOVELREADY_DATABASE_URL through your local secret/configuration mechanism.
uv run --locked python -m app.persistence.migrate
```

The image includes migration files for this explicit container command; default
startup still only runs HTTP. `DATABASE_URL` is ignored. Plain Alembic commands
without a supplied connection fail closed.

There is no prior production schema. `0001` is the initial fixture baseline
(records, edges, immutability); `0002` admits attributed review events without
rewriting payloads. Tests populate `0001`, upgrade to `0002`, and retrieve identical
old inputs. Empty-to-head and repeat-to-head are also covered. Migrations run
transactionally and must be serialized by their operator, never raced at startup.

Destructive downgrade is refused. Before shared persistence, take a backup and
establish restoration. Recovery is a forward fix or backup restoration to a
separate database. Backup restoration and production deployment have not been
exercised. Unsupported payload versions are rejected; future versions require
explicit reader compatibility and migration decisions.

## Verification

```powershell
uv sync --locked
uv run --locked ruff check app tests contract_tests migrations scripts
uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin'
uv run --locked python docs/pilot-inputs/test_acquire.py
```

The runner creates a temporary cluster, UUID database and available loopback port,
sets all three disposable-test guard variables, runs the suite and stops its
cluster in `finally`. It never attaches to an existing server. It uses local trust
authentication for this disposable cluster; diagnostic data/logs remain at the
printed path after shutdown. On Linux, pass the installed PostgreSQL binary
directory and run as an unprivileged user.

The existing guard is unchanged: test mode, disposable acknowledgement, loopback
literal, explicit port and `shovelready_test_<32 hex>` name are all required before
connection/DDL. A unique schema isolates each test, with no destructive database
cleanup. Without a URL, only PostgreSQL tests skip; invalid supplied configuration
fails. CI provides a fresh PostgreSQL 17 service on an ephemeral port, alongside
the preserved contracts, startup/safety and acquisition checks. Its fixed test
database name is scoped to that disposable service, not a shared server.

Local evidence on September 24, 2026: Python 3.12 / PostgreSQL 17.2, 57 tests and
28 contract subtests passed with no database skips; lint and both acquisition
checks passed. One existing Starlette/httpx deprecation warning remains. Synthetic
fixtures cover replay/conflict, concurrent replay, dangling/mismatched references,
rollback, uncertainty, corrected design/site/placement/rule revisions, old results,
failed extraction traces, review history and database mutation/FK rejection.
Docker was unavailable locally; container startup is checked by the preserved
CI job. No cloud resources or credentials were used.
