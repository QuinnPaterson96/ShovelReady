# ShovelReady

Latest journey integration: [uncertainty, map review and coherent enquiry outputs](docs/integration-homeowner-journey-round.md).

Latest correction: [main-building selection and visual enquiry evidence](docs/integration-main-building-evidence.md).

Latest enquiry improvement: [context questions, separate preparation checklist and approximate placement exports](docs/integration-enquiry-placement-export.md).

Latest demo integration: [unified placement checklist and map workspace](docs/integration-homeowner-summary.md#unified-placement-checklist-and-map-workspace-231--233), building on [Project details and mapped zoning](docs/integration-project-details.md).

ShovelReady explores a practical question: **given a prefabricated building design, where could it plausibly be built?**

The current commercial POC is a screening journey for a prefab builder's website:
help a visitor explore a model on their property and prepare a useful enquiry. The
reference company is **aux box**, starting with **Model 300** and a bounded City of
Victoria demonstration. See the [builder screening brief](docs/builder-screening-demo.md)
for the choice, sourced constraints, acceptance cases and implementation sequence.
This is an independent demonstration, not a commissioned aux box product.

The underlying data system supports preliminary scouting and source-backed investigation.
It does not determine legal compliance or guarantee permit approval. The company-specific
journey is implemented as a local demonstration; the history below records its scope.

## Status

The [boundary planning update](docs/integration-boundary-planning.md) adds an attributed
main-outline default, separate waterfront marks, dismissible edge details and explicit
1 m planning buffers with Likely fine / Needs review findings. The shared workspace
now places Next directly below the map, gives property details their own step,
offers acceptance of boundary suggestions before editing, expands the review checklist, makes status
counts navigable, and adds explicit buffer saving and accessible scan-card help.

The header now separates primary journeys from research tools and provides
contextual assessment navigation. Model 300 inputs survive switching pages within
the open app. See the [navigation and identity review](docs/navigation-refresh-qa.md)
for combined verification and limits; this is not saved state across reloads.

Railway hosting configuration now supports a stateless public observational demo;
see [deployment and domain runbook](docs/hosting.md). This is separate from accepted
zoning publication and the future persistent customer pilot.

The [live parcel integration](docs/integration-live-parcel-discovery.md) connects the
Model 300 demo to BC Address Geocoder and on-demand City of Victoria parcel/roofline
observations. Select an address; a sole usable parcel opens placement automatically, while multiple
parcel candidates require a choice. Source selection does not confirm identity, ownership
or legal boundaries. Measure an approximate placement and
copy an unsent enquiry with source evidence. Manual facts and scaled local sketches
work when lookup is unavailable or outside Victoria. No database is needed for this
journey; source observations and provider dimensions remain unreviewed. Wider address
coverage/strata validation, human testing and accepted zoning checks are still pending.


The [builder-demo foundation integration](docs/integration-builder-demo-foundation.md)
connects the map workspace to local scenario export and an unsent provider enquiry.
A supplied nominal Model 300 placement on one retained Victoria parcel has been
measured without captured overlap; this is approximate geometry, not accepted zoning
compatibility. The [next wave](docs/backlog/builder-demo-wave.md) builds the company
entry flow, manual site fallback and fresh-user validation. Older checkpoints below
retain their dated implementation history.

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

PRs #40-#43 add required native Windows lifecycle CI, a reproducible demo launcher,
concise PR handoffs and ten provisional public case packets. See the
[wave-four integration evidence](docs/integration-wave-four.md). The historical
[wave-five assignments](docs/backlog/wave-five-prompts.md) cover a public-case evidence
view, focused historical Stannard research and a blinded virtual-user walkthrough.

PRs #48-#50 deliver that bounded work: a database-free public-case mode, a historical
Stannard reference packet and one virtual-user report. Selected corroborated research
is reflected in provisional inventory revision `2026-09-24.integration-2`; no accepted
zoning result is produced. See [wave-five integration](docs/integration-wave-five.md).
SR-27 through SR-30 now provide offline QA records, five task cases, three paired
clean/fault controls, an isolated manual runner and evidence-gated grading. See
[wave-six integration](docs/integration-wave-six.md) for verification and the scoring
correction found during review. The [reviewed SR-31 pilot](docs/integration-pilot-01.md)
completed six detection sessions: three authored faults detected, no confirmed new
baseline defect, and two usability hypotheses retained. Keep this QA workflow on demand;
ordinary-task reliability, independent human calibration and real-user validation remain
unmeasured. The pilot ended without using the remaining ten session slots.

[PRs #68/#69](docs/integration-wave-seven.md) connect the evaluator to immutable draft
reports, a restricted read-only API and an app inspector. Three synthetic cases now
run through PostgreSQL, HTTP and the browser with full diagnostic traces. Reviewed
real inputs and accepted publication remain outstanding. The [next-step plan](docs/next-steps-after-wave-seven.md)
starts with one real source/design/site case and a small reviewed check subset.

Research PRs #71-#73 add provisional Pilot, Avalon and Warren Gardens packets.
The [September 25 review](docs/research/case-readiness/review-2026-09-25.md)
corroborates Pilot's later house replacement and adds Avalon's reported completed
garden-suite building permit. Neither establishes reviewed dimensions or a prefab fit.
[Wave eight](docs/backlog/wave-eight-prompts.md) moves to an offline historical Pilot
intake diagnostic and targeted approved-plan acquisition; accepted screening remains open.

[Wave-eight results](docs/integration-wave-eight.md) now include the runnable Pilot
diagnostic and specific unsent plan-acquisition requests. [Wave nine](docs/backlog/wave-nine-prompts.md)
implements a home/input/status flow and a read-only Pilot preparation view. Those UI
changes are implemented and connected; real-site screening remains unaccepted.
See [wave-nine integration](docs/integration-wave-nine.md) for combined verification.

[Wave-ten integration](docs/integration-wave-ten.md) adds a bounded parcel-lookup API,
standalone site/model input components, three sourced prefab candidates, and provisional
Victoria/Saanich/Langford rule packets and municipal replay experiments. The subsequent [wave-eleven integration](docs/integration-wave-eleven.md)
mounts site/model inputs and adds five captured address rows across those three
parcel leads. Lookup remains bounded, exact-match and unreviewed; it is not citywide.
See the integration record for composed verification and remaining evidence gates. No municipal expansion or accepted release is implied.

[Wave-twelve integration](docs/integration-wave-twelve.md) adds explicit scope choices,
progressive source disclosure, a mounted evidence checklist and a human walkthrough
kit with an attributed agent baseline. These prepare evidence requests; no fit checks
or accepted publication are added.

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
accepts `development`, `test` or stateless `demo`; see the hosting runbook. `DATABASE_URL`
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

The prototype's [Civic Atlas visual rules](docs/visual-identity.md) define shared
colour, border, status and map styling for current and future UI work.

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
| [Virtual-user evaluation plan](docs/backlog/virtual-qa-plan.md) | Implemented offline tooling and limits for the bounded participant pilot |
| [Persistence interface](docs/persistence.md) | Immutable imports, draft metadata, migrations and disposable PostgreSQL checks |
| [Spatial import](docs/spatial.md) | Licensed raw observations, explicit XY operations, migration and unresolved site facts |
| [Extraction replay](docs/extraction.md) | Saved responses, conservative normalization and blocked real-benchmark gates |
| [Bounded evaluator](docs/evaluation.md) | Draft-only scalar evaluation, coherent alternatives and synthetic reference tests |
| [Draft evaluation bridge](docs/draft-evaluations.md) | Explicit compute/import, immutable diagnostics and pinned synthetic API |
| [Computed draft inspector](docs/draft-evaluation-ui.md) | App display of evaluator reports, scope and evidence |
| [Investigation API and UI](docs/investigation-api.md) | Pinned licensed observations, source inspection and no-screening boundary |
| [Local development database](docs/local-development.md) | Persistent owned PostgreSQL, explicit migrations, seeding and launch commands |
| [Evaluator/spatial integration](docs/integration-review-2026-09-24.md) | PRs #31-#33, combined verification, remaining gates and process proposals |
| [Wave-four integration](docs/integration-wave-four.md) | PRs #40-#43, launcher correction, required lifecycle CI and research limits |
| [Wave-five integration](docs/integration-wave-five.md) | PRs #48-#50, provisional research reconciliation and bounded QA dispatch |
| [Wave-six integration](docs/integration-wave-six.md) | PRs #59-#61, combined QA verification, review correction and pilot gates |
| [Pilot results integration](docs/integration-pilot-01.md) | Reviewed six-session calibration, remaining human review and MVP implications |
| [Wave-seven integration](docs/integration-wave-seven.md) | PRs #68/#69, combined database/API/browser verification and CI drift check |
| [Next steps after wave seven](docs/next-steps-after-wave-seven.md) | Real-input gate, publication sequence and bounded next assignments |
| [Public case inventory](docs/research/public-cases/README.md) | Ten provisional historical cases and review shortlist; no accepted outcomes |
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

## Prefab research review

[Reports 15-17 review](docs/research/prefab-report-review/README.md) corrects manufacturer
claims and prioritizes Model 300 and ORCA Jay for bounded evidence acquisition.
The live catalogue and accepted-data status are unchanged.

[Wave-thirteen integration](docs/integration-wave-thirteen.md) combines bounded address
normalization, offline candidate intake and Model 300/Jay research. Both candidate
files stage successfully as unreviewed; active catalogue and accepted publication
remain unchanged. Readable-provenance UI work (#131) remains separate.


## Occupied-lot scouting checkpoint

PRs #140-#142 supply 16 retained Victoria parcel cases (13 new, 3 prior), a pure
supplied-placement geometry engine, and a proposed three-check rule subset.
[Integration evidence](docs/integration-occupied-lots.md) records compatibility checks,
review corrections and gaps. #139 now owns the runtime adapter and placement UI.
Approximate observations do not require a complete accepted regulatory release;
legal comparisons remain separately gated and labelled. No new site-fit result or
active dataset publication is implied by these merges.


## Interactive occupied-lot checkpoint

Three retained Victoria parcels now connect to a placement sketch and stateless geometry
API. Users can drag/rotate a supplied rectangle and inspect approximate partial results.
See [integration evidence and next round](docs/integration-placement-ui.md). This is geometric exploration,
not accepted zoning evaluation. #139 and #147 retain their outstanding criteria.


The Model 300 journey now includes labelled probable area/height estimates,
editable boundary offsets, provisional largest-outline separation, automatic
street-mark completion on advancing, and a bounded City heritage/planning map scan.
Empty searched layers are scoped probable findings; permit documents, title and
servicing remain review gaps. See [architecture](docs/architecture.md) for defaults,
provenance and uncertainty handling. These features do not publish accepted data.

The prefab demonstration now also offers Model 240, C.H. Studio Pod and Quadra 4.
These are unreviewed observations, not accepted product/site evaluations.
See [the model mapping, local demo and remaining evidence gaps](docs/prefab-generalization.md).
