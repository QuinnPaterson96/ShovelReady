# Wave two: extraction tooling and spatial import

Checkpoint: September 24, 2026, after PRs #24, #25 and #26. This supersedes the launch order in [the first-wave prompt pack](next-wave-prompts.md). GitHub issues remain the live status source.

Historical handoff: PRs #28/#29 completed these bounded implementation slices.
Use [wave three](wave-three-prompts.md) for current launch prompts and remaining gates.

## Integration result

- PR #26: immutable PostgreSQL persistence, explicit migrations, review history and draft release metadata. There is no active publication or evaluator.
- PR #24: typed intake for 15 licensed source records / 14 objects, nine raw spatial references, 25 provisional clause annotations and three site leads. Eleven private artifacts are blocked in a portable checkout; legal acceptance, controlled design and supplied placements are absent.
- PR #25: local synthetic investigation preview, six scenarios, separate task script/rubric and an author browser rehearsal. This is presentation preparation, not evidence of human understanding or actual site fit.
- Integration added intake and preview checks to backend CI, a saved-packet consistency check, explicit UTF-8 fixture reads and an intake-to-PostgreSQL roundtrip preserving unreviewed state. Local checks passed: 58 foundation/contract/persistence tests (plus 28 contract subtests), 10 intake tests, 2 acquisition tests and 3 preview tests. Required PR checks passed before merging.

SR-08 and SR-19 / issue #22 are complete in their bounded scopes. SR-01/SR-05/SR-06 remain partial. No live model run, data activation, source rights grant or new legal interpretation was established by integration.

## Run these two tasks in parallel

| Task | Ready scope | Completion still withheld | File ownership |
|---|---|---|---|
| SR-07 / issue #7 | Offline extraction/normalization and benchmark harness; explicit eligibility gates | Real extraction accuracy, live-run costs, human review/correction time | `app/ingestion/`, focused extraction tests, extraction documentation and labelled saved fixtures |
| SR-09 / issue #9 | Import verified licensed spatial facts through persistence and test bounded spatial operations | Reviewed legal site/placement facts and any fit conclusion | `app/spatial/`, justified spatial payload/persistence extensions, migrations, geometry tests, shared dependencies/CI |

Both start from the latest merged `main` in separate managed worktrees. SR-09 owns shared Python dependencies, lockfile and CI this wave. SR-07 should use the existing Python/Pydantic tooling; record a concrete need before proposing shared changes. Neither task changes frontend preview or published data. Preserve the existing intake/acquisition/preview tests and PostgreSQL guards. Do not alter the original dirty checkout or reuse an old first-wave branch.

Ordinary PR CI stays offline. No new cloud environment, purchases, outreach, model-call budget, universal rule language, agents, queue or automatic layout search is authorized by these prompts. If a prerequisite is missing, finish the useful bounded deliverable and report the exact outstanding criterion. Open PRs for integration review; do not merge automatically.

## Prompt D2: SR-07 offline extraction and benchmark harness

```text
Implement the bounded preparation portion of ShovelReady SR-07 / GitHub issue #7 in the managed worktree attached to this task, using branch codex/extraction-harness. Do not create a second worktree. Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md, the live issue and docs/backlog/wave-two-prompts.md.

The latest main contains merged PRs #24, #25 and #26. Read docs/data-contracts.md, docs/persistence.md, docs/pilot-inputs/intake.py, corpus.json and reviewer-actions.md, plus the original app/prompts/document_parsing. The corpus is currently 25 provisional entries: exact excerpts are null, reviewers are absent and every entry is benchmark-ineligible. Do not reinterpret those entries as ground truth. There is no authorized live-run budget in this handoff.

Build a small offline command accepting saved responses and explicit source/run metadata, separating parsing, normalization, validation and scoring eligibility. Retain raw response bytes/hash, original prompt identity, actual model/settings metadata when supplied, parser/schema identity, searched scope and run failures. Do not fabricate a real model run for synthetic fixtures. Preserve malformed, ambiguous, unsupported, not-found and unresolved-reference states distinctly; never execute generated expressions. Map only supported unambiguous values into current contracts, preserving units, ratio bases, evidence and rule identity. Record concrete contract gaps rather than replacing the ontology.

Add labelled synthetic saved responses to test malformed JSON, the historical prompt's multiple-object shape, ambiguous percentage scaling, missing citations/context, wrong unit basis and unsupported conditions. These tests establish parser/state behavior only. Build the corpus-eligibility/context-window checks and scorer interface so the actual current packet is reported as blocked/ineligible with reasons, not as 0% accuracy or an empty successful benchmark. Keep height/grade group H and related dependencies out of development input; do not send the combined packet or entire PDF to a tuning prompt. No live provider calls or tuning are required for this task.

Document how an authorized reviewed corpus, recorded human timing and explicit budget will later enable the original-prompt baseline and held-out comparison. Actual accuracy, costs and correction time must remain not measured. You may retain a versioned run manifest alongside current contracts where needed; do not weaken acceptance or hard-code provider assumptions.

Own app/ingestion, focused extraction tests, saved synthetic response fixtures and docs/extraction.md. SR-09 owns app/spatial, persistence extensions, migrations and shared Python dependencies/CI. Use existing dependencies and discovered test locations; do not duplicate storage or rewrite the pilot packet. If the repository interface is used, respect its atomic imports and immutable IDs. Keep live calls out of CI.

Run meaningful offline checks and record actual evidence. Verify QuinnPaterson96 author/committer and personal Git/GitHub authentication. Commit explicit paths, push and open a PR against main without merging. Keep #7 open unless its full measured-benchmark acceptance criteria are actually satisfied; a harness-only delivery does not satisfy them. Return the PR, implemented interface, test evidence and exact gates remaining.
```

## Prompt E2: SR-09 licensed spatial import and geometry checks

```text
Implement ShovelReady SR-09 / GitHub issue #9 in the managed worktree attached to this task, using branch codex/pilot-spatial-import. Do not create a second worktree. Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md, the live issue and docs/backlog/wave-two-prompts.md.

The latest main contains merged PRs #24, #25 and #26. Read docs/persistence.md and app/persistence, docs/data-contracts.md, docs/pilot-inputs/intake.py, intake-packet.json, acquisition-evidence.md and reviewer-actions.md. The licensed subset is available now: 15 SourceSnapshot records, 14 retained JSON objects and nine raw parcel/zoning/roofline references in WKID 3157. The integration test already proves those source records roundtrip through PostgreSQL while remaining unreviewed. Manufacturer/design and legal-placement gaps do not prevent retaining spatial facts.

Implement a repeatable bounded import using the existing repository/migration conventions. Verify source bytes before reading them. Preserve source/layer/request identities, original feature IDs, all raw attributes/nulls, full Esri rings and XYZ coordinates, attribution and immutable revision history. The current site Geometry contract is a single XY ring with legal site roles; do not silently coerce these raw features into it. Add only the smallest justified versioned spatial payload/storage extension needed for real samples, with explicit reader compatibility. Do not overwrite existing migrations or infer permanent feature identity from OBJECTID alone.

Perform the actual spatial operations needed by #9, retaining all material zoning intersections. Introduce PostGIS or a simpler suitable geometry dependency only with the implemented operation and tradeoff documented. Verify CRS conversions, independently expected areas/tolerances, rings/holes/multipolygons, missing/invalid geometry, slivers/split zones and repeat/changed/failed import behavior. Clearly label synthetic adversarial geometries separately from observed Victoria features. Record how null/unusable inputs become investigation states; no centroid-only legal assignment.

Preserve Z without interpreting it as regulatory height. Vertical units/datum, principal-building identity, wall footprint, legal lot-line classifications, rear yard, survey grade, fixed design and supplied placement remain unresolved unless actual reviewed inputs are supplied. Never invent them, assume the largest roof is the dwelling, infer grade from 2D geometry or manufacture a positive fit. Geometric area is not automatically regulatory lot area. This task does not implement an evaluator, address-search product or layout optimizer.

Own app/spatial, focused spatial tests and documentation, justified persistence/payload extensions and new migrations. You own shared Python dependencies/lockfile and existing CI wiring for this parallel wave; preserve all current acquisition/intake/preview checks and isolated PostgreSQL tests. SR-07 independently owns extraction tooling and will use existing dependencies. Use only disposable local/CI databases; no shared or Styx resources. Keep HTTP startup free of automatic DDL and data publication.

Run the actual import and meaningful geometric/migration checks, documenting what is verified and what remains unknown. Verify QuinnPaterson96 author/committer and personal Git/GitHub authentication. Commit explicit paths, push and open a PR against main without merging. Return the PR, imported feature/source coverage, interface/migration handoff, evidence and unresolved acceptance criteria. Do not close #9 merely because raw shapes were stored if its spatial checks remain incomplete.
```

## Owner inputs and subsequent integration

The actionable external gates are already listed in [reviewer actions](../pilot-inputs/reviewer-actions.md): name a technical reviewer, resolve authorized durable source retention, obtain a controlled manufacturer configuration/drawing set, and supply reviewed site facts/placements. No further broad research or customer recruitment is required to build these two technical slices.

After both PRs, review them together, validate their interfaces and update the evidence gates. SR-10 accepted evaluation still needs supported reviewed semantics and usable site facts; SR-11 publication and SR-12 real API integration follow. Do not start cloud/CD merely because the synthetic preview is visible. SR-16 remains real-user validation after a usable prototype, using the existing task script where helpful.
