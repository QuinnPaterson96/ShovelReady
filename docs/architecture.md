# Architecture direction

Status: agreed direction for experimentation, September 17, 2026. The existing code does not yet implement this architecture. See the [restart assessment](restart-assessment.md) for evidence and the [original handoff](prior-work/design-decisions.md) for earlier reasoning.

## Boundaries

```text
Pinned source documents and manifest
                |
Explicit ingestion command
parse -> extract -> validate -> review
                |
Versioned detailed rules and evidence
                |
Publish dataset release + scouting projection
                |
Deterministic screening and evidence API
                |
React inputs, results, map, and investigation view
```

The LLM proposes structured data during ingestion. Code validates and normalizes it; reviewed revisions become eligible for publication. Preserve raw responses and failed attempts for diagnosis. Runtime checks execute only supported, reviewed semantics.

Detailed rules retain applicability, exceptions, calculations, dependencies, source evidence, and explicit unsupported states. The scouting projection can be denormalized, but must preserve coherent pathways and identify its source rule revisions. Avoid a general-purpose legal solver until evidence requires one.

Results are candidate, needs investigation, or no match under evaluated pathways. Conditions, approval status, scope exclusions, and missing inputs are separate fields. An unresolved alternative prevents claiming that every possible pathway fails.

## Minimal persistence

Use one PostgreSQL database with relational metadata and validated JSONB for evolving rule shapes. Conceptually track:

- Source snapshots: URL, retained bytes/hash, capture date, instrument and version, verified effective dates where available.
- Extraction runs: raw output, prompt/model/parser/schema identifiers, errors and review history.
- Logical rules and immutable revisions: evidence anchors, normalized semantics, applicability, dependencies, and review status.
- Dataset releases: source/rule/spatial versions and compatible projection/evaluator versions.
- Derived scouting records, sample parcel facts, and reproducible evaluation results as needed.

Logical identity is separate from content hash and revision identity. Section numbers alone are not permanent identities. Explicitly review ambiguous matches, splits, and merges. Unknown effective dates remain unknown.

Canonical units include metres, square metres, counts, and dimensionally explicit rates/ratios. Preserve original units and values. Percentages normalize to fractions with a named basis; floor-space ratios and parking rates keep their distinct meanings. Manufacturer floor area must not silently substitute for regulatory floor area.

## First scope

September 18 research refinement: one actual fixed small design, one reviewed pathway, and about three real site fixtures with supplied placements for the technical proof; approximately 20–30 real enquiries for the subsequent customer pilot. City of Victoria garden suites are the leading candidate, The Landing is an unverified initial design candidate, and Vancouver is the fallback. Obtain actual inputs and review current rule applicability before confirming fit. See the [MVP backlog](backlog/README.md) for dependencies and acceptance criteria. Do not silently expand to several use types.

Persist versioned principal-building geometry, lot-line classifications, rear-yard boundaries, and proposed placements with source/manual-review provenance. Keep physical and regulatory measurements distinct. A failed supplied placement is not proof of universal site incompatibility; outside supported coverage is not a zoning exclusion. No automatic placement search is required.

Support a small set of dimensional/use checks. Irregular geometry, split zoning, missing facts, and unmodeled overlays remain visible investigation cases. The bounded SR-09 import now uses Shapely/GEOS for XY intersections and pyproj for explicit CRS conversion, retaining immutable observations in PostgreSQL JSONB. PostGIS is deferred until larger-scale database spatial queries justify it; see the [implemented tradeoff and evidence](spatial.md). A small GeoJSON response is sufficient for this sample.

## Cloud direction

- One container serves FastAPI and built React assets.
- Managed PostgreSQL stores application data; object storage retains source files and raw outputs outside ephemeral application disks.
- Ingestion initially runs as an explicitly invoked batch command. No queue or worker service is required yet.
- Use HTTPS, protected administrative ingestion, managed secrets, backups, and useful error logging.
- Start with local development and one shared demo deployment. Add an independently isolated production environment when customers rely on the service.
- Use a ShovelReady-owned cloud account/project and credentials. No hosting provider or cloud resources have been selected or provisioned.

## CI/CD direction

If using GitHub Actions, use PR checks for Python lint/focused tests, frontend type-check/build, migrations against disposable PostgreSQL, a fixture-based ingestion-to-result integration test, and a container startup smoke test.

On merge, deploy the tested immutable image to the demo environment and smoke-test it. Identify images by commit. Serialize deployments to a given environment and avoid obsolete runs overwriting newer deployments. Preserve a known-good image for rollback.

Apply database migrations as an explicit release step, not concurrent application startup table creation. Prefer backward-compatible changes; application rollback does not automatically roll back the database. Test backup restoration before customer reliance.

Data publication is separate: validated draft -> reviewed immutable release -> atomic active-release change. Prompt/model changes require extraction evaluation before their output is promoted. Changing code must not implicitly publish newly extracted rules.

## Implementation sequence

The [ticket backlog](backlog/README.md) refines this sequence: pilot acquisition, scaffold repair, and provisional contracts can start together; CI starts after safe startup, and deployment follows the local end-to-end image. Cloud and accepted-data publication remain separate work items. Research is not a blanket prerequisite for implementation.

1. Select a provisional screening workflow and create the reviewed source/site/placement corpus; customer recruitment and willingness-to-pay validation follow the prototype and do not gate the technical build.
2. Benchmark the existing prompt and record empirical failures.
3. Repair minimal backend/frontend scaffolding and establish typed contracts and focused regression fixtures.
4. Add CI, then the single demo deployment once startup/build checks pass.
5. Persist provenance, raw runs, reviewed rules, and controlled dataset releases.
6. Implement bounded deterministic screening and a thin investigation interface.
7. Measure customer time savings and update costs before expanding coverage.

Defer multi-agent ingestion, vector databases, knowledge graphs, microservices, elaborate cloud infrastructure, custom model training, and a commercial third-party API. Record any later adoption in a decision note with the observed need, simpler alternatives, and revisit criteria.
