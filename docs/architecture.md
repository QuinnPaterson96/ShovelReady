# Architecture direction

Status: agreed direction for experimentation, updated September 24, 2026. Foundation, contracts, draft persistence, licensed spatial import, offline extraction replay, draft scalar evaluator, observation API/UI and persistent local database tooling are implemented; accepted real-site evaluation/publication and deployment remain future work. See the [latest integration review](integration-review-2026-09-24.md), [restart assessment](restart-assessment.md) and [original handoff](prior-work/design-decisions.md) for evidence and earlier reasoning.

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

Support a small set of dimensional/use checks. Irregular geometry, split zoning, missing facts, and unmodeled overlays remain visible investigation cases. The bounded SR-09 import now uses Shapely/GEOS for XY intersections and pyproj for explicit CRS conversion, retaining immutable observations in PostgreSQL JSONB. PostGIS is deferred until larger-scale database spatial queries justify it; see the [implemented tradeoff and evidence](spatial.md). A small explicitly tagged geometry response is sufficient. Original XY is EPSG:3157; derived longitude/latitude is EPSG:4617 and must not be silently relabelled WGS84/RFC 7946 GeoJSON.

The observational investigation API exposes an explicitly selected licensed spatial-import revision before regulatory publication; its UI clearly says no screening occurred. This is distinct from a future screening API consuming an accepted dataset. The implemented draft evaluator remains independent of this viewer and is tested with synthetic reviewed inputs. Unknown source acceptance, site facts and placements remain gates for real conclusions. See the [evaluator](evaluation.md), [investigation API](investigation-api.md) and [local database workflow](local-development.md).

## Cloud direction

- One container serves FastAPI and built React assets.
- Managed PostgreSQL stores application data; object storage retains source files and raw outputs outside ephemeral application disks.
- Ingestion initially runs as an explicitly invoked batch command. No queue or worker service is required yet.
- Use HTTPS, protected administrative ingestion, managed secrets, backups, and useful error logging.
- Start with local development and one shared demo deployment. Add an independently isolated production environment when customers rely on the service.
- Use a ShovelReady-owned cloud account/project and credentials. No hosting provider or cloud resources have been selected or provisioned.

## CI/CD direction

GitHub Actions requires backend lint/offline tests with disposable PostgreSQL migrations, frontend type-check/build and container startup checks. The full accepted ingestion-to-result integration fixture remains SR-13 work; existing checks do not establish that path.

Once SR-14 configures a protected demo environment, SR-15 will deploy the tested immutable image and smoke-test it. Identify images by commit. Serialize deployments to a given environment and avoid obsolete runs overwriting newer deployments. Preserve a known-good image for rollback. No deployment currently runs on merge.

Apply database migrations as an explicit release step, not concurrent application startup table creation. Prefer backward-compatible changes; application rollback does not automatically roll back the database. Test backup restoration before customer reliance.

Data publication is separate: validated draft -> reviewed immutable release -> atomic active-release change. Prompt/model changes require extraction evaluation before their output is promoted. Changing code must not implicitly publish newly extracted rules.

## Implementation sequence

The [ticket backlog](backlog/README.md) refines this sequence: pilot acquisition, scaffold repair, and provisional contracts can start together; CI starts after safe startup, and deployment follows the local end-to-end image. Cloud and accepted-data publication remain separate work items. Research is not a blanket prerequisite for implementation.

1. Preserve the merged scaffold, typed boundaries, CI, immutable draft persistence, licensed spatial import, offline extraction tooling, draft evaluator and real spatial evidence viewer.
2. Obtain the controlled design and reviewed source/site/placement subset needed to connect supported real rules to the evaluator. Use the existing observation viewer for a bounded workflow rehearsal; it does not yet screen designs. Customer recruitment does not gate this technical work.
3. With authorized reviewed references, recorded human timing and an explicit budget, benchmark the original extraction prompt and diagnose actual failures before tuning.
4. Integrate supported reviewed semantics and inputs with explicit dataset publication, coherent scouting projection and the screening API/UI. Do not turn a selected observation revision into an accepted release.
5. Verify the complete source-to-result path and deployable image in SR-13, then configure the protected demo and CD with recovery evidence in SR-14/15.
6. Measure customer time savings and update costs before expanding coverage.

Defer multi-agent ingestion, vector databases, knowledge graphs, microservices, elaborate cloud infrastructure, custom model training, and a commercial third-party API. Record any later adoption in a decision note with the observed need, simpler alternatives, and revisit criteria.
