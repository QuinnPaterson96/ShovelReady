# Next parallel work, after PRs #19-#21

Checkpoint: September 24, 2026. GitHub issues remain the live status source. Start each task in its own worktree from the latest merged `main`, with a `codex/` branch. The original working checkout contains unrelated uncommitted changes: do not reuse, reset or sweep those changes into a task.

## Launch order and ownership

| Wave | Track | Start gate | Primary ownership |
|---|---|---|---|
| Now | A: Pilot intake and review packet, SR-01/05/06 | Merged foundation/contracts/input packet | `docs/pilot-inputs/`, new corpus/intake files; no database or shared tooling edits |
| Now | B: Persistence, SR-08 | SR-02 and provisional SR-04 merged | `app/persistence/`, migrations, persistence tests, Python dependencies/lockfile and existing CI |
| Now, optional | C: Investigation preview and rehearsal, SR-19 / issue #22 | SR-02 and provisional SR-04 merged | Frontend preview, isolated synthetic fixtures/checks, `docs/usability/` |
| Next | D: Extraction benchmark, SR-07 | Reviewed/authorized clause subset from A; explicit budget before live calls | Extraction, normalization, benchmark and saved-response tests |
| Next | E: Spatial import, SR-09 | Typed licensed spatial subset from A and persistence interface from B merged | Spatial reader/import, geometry tests and justified spatial dependencies |

D and E can run in parallel once their own gates are met. D's offline harness can start sooner, but its accuracy benchmark cannot be completed from synthetic annotations. E does not need manufacturer roof dimensions to preserve spatial facts; actual site evaluation does. Merge B before E adds database/spatial dependencies. D and E coordinate any shared manifest/CI changes rather than overwriting them.

Do not wait for every possible data question to be resolved before making bounded technical progress. Equally, do not close an acceptance gate with synthetic data. A may end with a review-ready packet and precise external input blockers; that is not completion of the real-site corpus.

After these tracks, implement SR-10 on the accepted corpus and usable input/storage interfaces, then SR-11 publication, then SR-12 API/UI integration reusing C's presentation where appropriate. SR-13 integrates the complete local path. Shared hosting and CD remain SR-14/SR-15 after that demonstration; these are not unlocked merely by successful container startup. SR-16 remains actual customer validation after the prototype. SR-17/SR-18 remain deferred.

## A - Pilot intake and review packet

```text
Work on ShovelReady SR-01, SR-05 and SR-06 (GitHub issues #1, #5, #6) in an isolated worktree from current main, branch codex/pilot-intake. Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md, the live issues, docs/data-contracts.md and docs/pilot-inputs/.

Continue from PR #19's captured evidence. Build the smallest file-based typed intake and reviewer-ready corpus packet. Preserve all raw snapshots. Map manifest source IDs/artifact locations into existing contracts; verify hashes, capture versus effective dates, CRS/units, evidence and explicit missing/restricted artifacts. Keep proprietary/local-only bytes outside Git. Do not invent design revisions, placements, legal measurements, reviewer acceptance or positive site results.

Produce per-source and per-site status, a grouped development/held-out clause manifest, provisional annotations with provenance and a concise owner/reviewer action list. Reuse the existing manufacturer questions. Complete the licensed spatial intake subset independently if possible. A machine-local capture path must not become a hidden dependency; missing private artifacts should produce an actionable diagnostic. Use synthetic cases only for explicitly labelled technical tests.

Own acquisition/intake, docs/pilot-inputs and new corpus files. Do not implement database writes, change shared Python dependencies/CI or replace app/contracts unilaterally; persistence owns shared tooling this wave. Report concrete contract gaps with examples. No outreach, purchases or fabricated professional review. If external inputs remain missing, deliver the useful packet and identify exact outstanding acceptance criteria without closing those tickets.

Run focused offline tests and record actual evidence. Use QuinnPaterson96 for verified author/committer and push authentication. Commit explicit paths, push and open a PR against main; do not merge it or close partially satisfied tickets. Return the PR, completed criteria, unresolved inputs and the handoff to SR-07/SR-09.
```

## B - Persistence and isolated PostgreSQL checks

```text
Implement ShovelReady SR-08 (GitHub issue #8) in an isolated worktree from current main, branch codex/persistence. Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md, the live issue, docs/data-contracts.md and existing database-safety tests.

Use one PostgreSQL database, SQLAlchemy, explicit migrations and current provisional Pydantic payloads. Preserve immutable sources, design/site/placement/rule revisions, extraction/raw artifact references, candidates, review history and draft release metadata. Keep models independent of HTTP/UI. Document a small import/read interface for subsequent ingestion/spatial work. Do not implement active data publication; that belongs to SR-11.

Test same-ID/same-content idempotency, rejection of same-ID/different-content writes, dangling references, transaction failure, corrected revisions and retrieval of the old result inputs. Exercise empty-database migration and the supported upgrade path; acknowledge that there is no prior production schema. No automatic table creation at app startup. All tests must use explicitly disposable isolated PostgreSQL and preserve the foundation's guards against shared databases. Use labelled synthetic fixtures; no claim of accepted zoning data.

You own app/persistence, migrations, persistence tests, Python dependencies/lockfile and extension of the existing CI job. Preserve contract and acquisition checks. No Styx credentials, cloud provisioning, queues or extra services beyond the required test database. Other concurrent tracks own acquisition files and frontend/usability. Avoid shared-contract changes without a concrete failing example and documented compatibility decision.

Record migration/repository test evidence and commands. Use QuinnPaterson96 for verified author/committer and push authentication. Commit explicit paths, push and open a PR against main; do not merge. Return the PR, interface handoff, verified behavior and remaining limitations.
```

## C - Optional preview and simulated walkthrough

```text
Implement ShovelReady SR-19 (GitHub issue #22) in an isolated worktree from current main, branch codex/investigation-preview. Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md, docs/data-contracts.md and the live issue. Keep this to one small PR.

Create a local React investigation preview using explicitly synthetic, saved contract-valid results and a small replaceable fixture adapter. Keep the existing health check usable. Cover six scenarios: candidate with exclusions; missing roof/grade; failed supplied placement; outside coverage; unresolved reference/approval condition; and an older result pinned to its original release after a correction. Show checked scope, missing facts, evidence, dates and design/site/placement/rule/release identities. No real property or manufacturer should appear to have a verified fit. Do not build an evaluator or API.

Write goal-based task instructions for the hypothesized manufacturer qualification coordinator and technical reviewer, with a separate expected-answer rubric. Then rehearse through the rendered UI using available browser tools. During first-pass exploration use user-visible information, not hidden fixture answers; disclose any author/tester overlap. Record actual navigation and visible evidence. Separate reproducible UI defects from model-generated usability hypotheses and unverified behaviors. Do not report simulated human satisfaction, hesitation, time savings, demand or legal accuracy.

Own frontend preview components, isolated synthetic fixtures/checks and docs/usability. Persistence owns shared Python tooling/CI. Validate saved payloads with existing contracts, preserve inert rendering and keyboard access, run typecheck/build and add only meaningful deterministic regression checks. No model calls in ordinary CI, new simulation platform, cloud, outreach or accepted data changes. Mark any unavailable browser verification honestly.

Use QuinnPaterson96 for verified author/committer and push authentication. Commit explicit paths, push and open a PR against main; do not merge. Return the preview instructions, PR, walkthrough findings and handoff to SR-12/SR-16. This is preparation for human testing, not completion of either ticket.
```

## D - Extraction and empirical benchmark, after the corpus gate

```text
Work on ShovelReady SR-07 (GitHub issue #7) in an isolated worktree from the latest merged main, branch codex/extraction-benchmark. Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md, docs/data-contracts.md, the live issue and the merged corpus/intake handoff.

Verify which source clauses are authorized, independently reviewed and available as exact retained bytes. Keep related definitions/provisions together in development/held-out groups. Build the bounded extraction/normalization and offline scoring command around the original prompt before proposing changes. Preserve raw input/output, prompt/model/settings/parser/schema identities, evidence references and failed runs. Malformed data is quarantined; unsupported or ambiguous meaning remains explicit. Never execute generated expressions.

Measure omissions, applicability, values, units/ratio bases, references, source support and consequential errors separately. Record actual review and correction effort separately from model cost. Change the prompt only in response to observed failures, then test held-out cases. Ordinary CI uses saved responses only. Do not overwrite acquisition artifacts or duplicate persistence/spatial modules.

If reviewed source examples, model credentials or an explicit live-run budget are missing, complete the useful offline harness and report the exact benchmark gate. Do not fabricate a live run, legal oracle, reviewer time or accuracy result. Coordinate shared dependency/CI edits with the spatial-import task; propose concrete schema gaps instead of a universal ontology.

Use QuinnPaterson96 for verified author/committer and push authentication. Run focused checks, commit explicit paths, push and open a PR against main; do not merge or close #7 until its benchmark acceptance criteria are actually met. Return evidence, costs if measured, failure analysis and evaluator/publication handoff.
```

## E - Spatial import, after persistence and spatial intake merge

```text
Implement ShovelReady SR-09 (GitHub issue #9) in an isolated worktree from latest main after SR-08 and the SR-05 typed licensed spatial subset have merged, branch codex/pilot-spatial-import. Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md, the live issue, docs/data-contracts.md and the intake/persistence handoffs.

Import the captured Victoria parcel/zoning/roofline samples through the existing storage interface. Preserve raw attributes, source snapshots, feature identities, CRS and uncertainty. Add PostGIS/spatial dependencies only for concrete implemented operations. Keep all material zone intersections; test CRS conversion, area tolerances, invalid/missing geometry, split-zone/sliver handling and repeat-import behavior with independent expected cases.

The captured WKID is 3157 and rooflines include XYZ; vertical units/datum and legal-height meaning remain unresolved. Never infer regulatory grade/height, principal-building identity, wall footprint, legal lot lines, rear yard or placement from those shapes. Accept versioned manual facts with provenance when supplied; retain missing facts otherwise. Clearly distinguish real spatial samples from synthetic adversarial cases. Do not wait for manufacturer roof dimensions to retain spatial facts, but do not claim a reviewed site fit.

Own spatial reader/import modules and focused geometry/persistence tests; coordinate any shared manifest/CI changes with extraction. Use explicitly isolated disposable PostgreSQL and extend existing CI. No citywide crawling, address-search product, layout optimization, cloud or source-rights shortcuts.

Use QuinnPaterson96 for verified author/committer and push authentication. Record import/test evidence, commit explicit paths, push and open a PR against main; do not merge. Return the PR, imported sample coverage, unresolved facts and handoff to SR-10.
```
