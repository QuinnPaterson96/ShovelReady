# ShovelReady

ShovelReady explores a practical question: **given a prefabricated building design, where could it plausibly be built?**

The initial product is preliminary zoning scouting across municipalities, followed by source-backed investigation of selected zones or parcels. It does not determine legal compliance or guarantee permit approval.

## Status

The FastAPI and React/TypeScript/Vite foundation, immutable PostgreSQL persistence,
typed pilot intake, offline extraction replay, licensed spatial import, draft scalar
evaluator and read-only spatial investigation API/UI are implemented. A persistent
local development database can seed the licensed observation packet. The separate
synthetic preview contains hand-authored examples, not real evaluated sites.

PRs #31-#33 are merged. The evaluator has synthetic reference tests; the real spatial
viewer explicitly reports that no screening occurred. There is no accepted zoning
dataset, real-site screening result or active publication. The health endpoint checks
liveness only. See the [integration review](docs/integration-review-2026-09-24.md)
for combined verification, remaining gates and proposed process improvements.

City of Victoria garden suites remain the leading technical prototype candidate, subject
to verified design/site inputs and current rule applicability; Vancouver is the fallback.

## Local setup

Use Python 3.12, [uv](https://docs.astral.sh/uv/) 0.12.17, and Node 22.14.0.
In PowerShell from the repository root:

```powershell
python -m uv sync --locked
python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000
# In another terminal:
Invoke-RestMethod http://127.0.0.1:8000/health
cd frontend
npm ci
npm run dev
npm run typecheck
npm run build
```

The development frontend proxies `/health` and `/api` to the API on port 8000. Once built, FastAPI
also serves `frontend/dist` at `/`. Copy `.env.example` only if you need to set explicit
local environment values; the scaffold needs no database or model credentials. `SHOVELREADY_ENV`
accepts `development` or `test`; deployment configuration is a later ticket. `DATABASE_URL`
from historical code is ignored. The old `/zones/upload` endpoint was retired because its
parsing and projection can give unsupported zoning answers.

For the real spatial viewer, follow the [persistent database and API setup](docs/local-development.md).
It requires explicit database, collection and revision configuration; a running preview
in an older worktree does not pick up merged changes automatically.

Run focused checks from the repository root with:

```powershell
python -m uv run --locked ruff check app tests contract_tests migrations scripts docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py
python -m uv run --locked pytest -q
python -m uv run --locked python docs/pilot-inputs/test_acquire.py
python -m uv run --locked python docs/pilot-inputs/test_intake.py
python -m uv run --locked python docs/usability/check_fixtures.py
cd frontend
npm ci
npm test
npm run typecheck
npm run build
```

Without disposable PostgreSQL configuration, database tests skip. Use the temporary
cluster runner in the [persistence handoff](docs/persistence.md) for a full database run.
The native local-database lifecycle test has a separate opt-in; see the
[local development verification](docs/local-development.md#verification).

See [CI and verification notes](docs/foundation-verification.md) for exact results and
remaining work. Do not run the retired legacy tests from repository history: they contain
unrelated destructive database cleanup.

## Product and architecture

- Use LLMs primarily during document ingestion, with validation and review before publication.
- Preserve detailed rules, conditions, calculations, dependencies, and source evidence.
- Derive inexpensive scouting data from accepted rules, keeping compatible development alternatives together.
- Evaluate supported checks deterministically. Retain uncertainty through storage, APIs, and display.
- Keep the underlying regulatory data independent of the first frontend.

Results distinguish **candidate**, **needs investigation**, and **no match under evaluated pathways**. A candidate is a preliminary result within a stated scope; it is not a permit entitlement. Approval status and unsupported checks remain visible.

## Documentation

| Document | Purpose |
|---|---|
| [Architecture](docs/architecture.md) | Minimal system boundaries, deployment direction, and implementation sequence |
| [Quality agreement](docs/quality.md) | Data contracts, testing, publication, and definition of done |
| [Synthetic preview and walkthrough](docs/usability/README.md) | Local scenarios, fixture checks and usability rehearsal limits |
| [Persistence interface](docs/persistence.md) | Immutable imports, draft metadata, migrations and disposable PostgreSQL checks |
| [Spatial import](docs/spatial.md) | Licensed raw observations, explicit XY operations, migration and unresolved site facts |
| [Extraction replay](docs/extraction.md) | Saved responses, conservative normalization and blocked real-benchmark gates |
| [Bounded evaluator](docs/evaluation.md) | Draft-only scalar evaluation, coherent alternatives and synthetic reference tests |
| [Investigation API and UI](docs/investigation-api.md) | Pinned licensed observations, source inspection and no-screening boundary |
| [Local development database](docs/local-development.md) | Persistent owned PostgreSQL, explicit migrations, seeding and launch commands |
| [Latest integration review](docs/integration-review-2026-09-24.md) | PRs #31-#33, combined verification, remaining gates and process proposals |
| [MVP ticket backlog](docs/backlog/README.md) | Sequenced technical proof, CI/CD, customer pilot, and expansion experiments |
| [Prototype input evidence](docs/pilot-inputs/README.md) | Captured Victoria sources, licensed GIS samples, provisional design/site specifications, and unresolved review inputs |
| [Research plan](docs/research.md) | Commercial hypotheses and experiments before expansion |
| [Restart assessment](docs/restart-assessment.md) | Detailed source/schema/code review and rationale |
| [Original technical handoff](docs/prior-work/design-decisions.md) | Historical hypotheses; retained for context, not binding requirements |
| [Agent instructions](AGENTS.md) | Repository-specific working and Git identity rules |

## First demonstration

Start with one actual fixed small design and about three reviewed site fixtures with supplied placements. The Landing is an initial design candidate, not a verified dimensional fit. A failed placement does not establish that no placement works, and outside coverage is not a zoning exclusion. Expand to approximately 20–30 real enquiries for the user-tested MVP; customer recruitment and willingness-to-pay validation follow the prototype. Demonstrate:

`pinned sources → extraction → validation/review → published dataset → screening → cited rule inspection`

Show missing inputs and unsupported cases. Reproduce an earlier result against its original release and demonstrate a correction as a new release. Broader use types, citywide search, and comprehensive feasibility are outside this first scope.

## Development direction

The stack is FastAPI, Pydantic, SQLAlchemy, PostgreSQL, and React/TypeScript/Vite. The bounded spatial import uses Shapely/pyproj; introduce PostGIS when database spatial queries justify it. Ingestion runs as an explicit local batch command.

Startup, focused offline tests, immutable PostgreSQL persistence, the draft evaluator and licensed observation viewer are implemented. See the [persistence handoff](docs/persistence.md) for draft-only storage, explicit migrations and isolated database checks. Independent source/site review, accepted screening and active publication remain future work. Do not run the retired database tests from repository history.

The scaffold setup above is verified locally. Never use historical embedded credentials or remote test defaults.

## Git identity

Repository: `https://github.com/QuinnPaterson96/ShovelReady.git`.

All commits and pushes must use the personal GitHub account **QuinnPaterson96**, not a work account. Configure this checkout locally:

```powershell
git config --local user.name quinnpaterson96
git config --local user.email 60762693+QuinnPaterson96@users.noreply.github.com
git config --local credential.https://github.com.username QuinnPaterson96
git config --local credential.https://github.com.useHttpPath true
```

Commit identity and authentication are separate. Confirm the account backing push credentials before pushing. `gh` may use a different account from Git Credential Manager; verify it before GitHub CLI operations. Never fall back to work credentials or change global identity to fix this repository.
