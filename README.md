# ShovelReady

ShovelReady explores a practical question: **given a prefabricated building design, where could it plausibly be built?**

The initial product is preliminary zoning scouting across municipalities, followed by source-backed investigation of selected zones or parcels. It does not determine legal compliance or guarantee permit approval.

## Status

This repository contains exploratory code and a restart assessment. The application is not yet a working end-to-end demonstration. Known issues include startup imports, extraction validation, persistence mismatches, and disconnected frontend scaffolding. Cloud hosting, CI/CD, and the architecture below are proposed, not implemented.

The first technical target is Vancouver. Regional coverage is a business hypothesis to test after a narrow source-to-result demonstration.

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
| [Research plan](docs/research.md) | Commercial hypotheses and experiments before expansion |
| [Restart assessment](docs/restart-assessment.md) | Detailed source/schema/code review and rationale |
| [Original technical handoff](docs/prior-work/design-decisions.md) | Historical hypotheses; retained for context, not binding requirements |
| [Agent instructions](AGENTS.md) | Repository-specific working and Git identity rules |

## First demonstration

Use two fixed designs, one reviewed R1-1 development pathway, and approximately 20–30 sample parcels. Demonstrate:

`pinned sources → extraction → validation/review → published dataset → screening → cited rule inspection`

Show missing inputs and unsupported cases. Reproduce an earlier result against its original release and demonstrate a correction as a new release. Broader use types, citywide search, and comprehensive feasibility are outside this first scope.

## Development direction

The intended stack is FastAPI, Pydantic, SQLAlchemy, PostgreSQL, and React/TypeScript/Vite. Introduce PostGIS when spatial operations require it. Initially run ingestion as an explicit local batch command.

Before adding features, repair the startup and frontend structure and establish focused regression fixtures. Do not assume the existing test suite is safe or relevant: it contains unrelated application scaffolding and database cleanup operations. Use a disposable local test database with explicit configuration.

Reproducible setup commands will be documented when the scaffold is repaired and verified. Do not use historical embedded credentials or remote test defaults.

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
