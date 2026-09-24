# ShovelReady

ShovelReady explores a practical question: **given a prefabricated building design, where could it plausibly be built?**

The initial product is preliminary zoning scouting across municipalities, followed by source-backed investigation of selected zones or parcels. It does not determine legal compliance or guarantee permit approval.

## Status

The FastAPI and React/TypeScript/Vite foundation runs locally. It is still an exploratory
checkpoint: no zoning data is ingested or published, and no site evaluation is available.
The health endpoint checks process liveness only. SR-04 owns provisional typed contracts;
the application does not yet expose those contracts through an API. PRs #19-#21 are merged;
the required backend, frontend and container-startup checks passed on combined main.
See the [next parallel tasks](docs/backlog/next-wave-prompts.md) for the current handoff.

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

The development frontend proxies `/health` to the API on port 8000. Once built, FastAPI
also serves `frontend/dist` at `/`. Copy `.env.example` only if you need to set explicit
local environment values; the scaffold needs no database or model credentials. `SHOVELREADY_ENV`
accepts `development` or `test`; deployment configuration is a later ticket. `DATABASE_URL`
from historical code is ignored. The old `/zones/upload` endpoint was retired because its
parsing and projection can give unsupported zoning answers.

Run focused checks from the repository root with:

```powershell
python -m uv run --locked ruff check app tests contract_tests
python -m uv run --locked pytest -q
python -m uv run --locked python docs/pilot-inputs/test_acquire.py
cd frontend
npm ci
npm run typecheck
npm run build
```

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

The intended stack is FastAPI, Pydantic, SQLAlchemy, PostgreSQL, and React/TypeScript/Vite. Introduce PostGIS when spatial operations require it. Initially run ingestion as an explicit local batch command.

Startup and frontend repair and focused offline tests are implemented. Next, add the pilot intake/review packet and persistence; a synthetic investigation preview can proceed independently. All new persistence tests must use an explicitly isolated disposable database. Do not run the retired database tests from repository history.

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
