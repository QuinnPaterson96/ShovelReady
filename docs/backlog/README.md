# MVP backlog

Planning baseline: September 18, 2026; post-merge checkpoint: September 24, 2026. PRs #20, #21 and #19 merged the working scaffold/CI, provisional contracts and raw pilot evidence. There is still no source-to-result evaluator, accepted dataset or cloud deployment.

GitHub issues are the execution/status source of truth once published. These Markdown files preserve specifications and dated implementation handoffs; update both when scope changes. Dated checkpoints are not a second live status board. SR identifiers remain stable independently of GitHub issue numbers.

## Scope and milestones

- **M0 — Scope:** select one customer decision, actual fixed design, municipality and supported pathway. Provider research is non-blocking.
- **M1 — Technical proof:** one real fixed small design, about three reviewed site/placement fixtures, and approximately 5–8 supported checks, from saved source/extraction through reviewed publication to evidence display. Counts guide effort, not correctness claims.
- **M2 — User-tested MVP:** protected deployed demo, working CI/CD and recovery, roughly 20–30 real enquiries, measured net user effort and consequential errors.
- **M3 — Expansion experiment:** a second municipality only after the first workflow shows value.

City of Victoria garden suites are the leading technical candidate; Vancouver is the fallback. The Landing is an initial model candidate with missing measurements, not a verified fit. DNV is a useful reference, not a mandatory pilot. DASH file compatibility is useful but no six-storey design, BIM export, undocumented API, or provincial parcel integration is required. Early contracts remain provisional until checked against real clauses. Technical source/rule review is needed during the prototype; commercial interviews, recruitment, and willingness-to-pay testing follow it.

The September 18 synthesis of reports 10–14 requires actual GIS metadata/feature snapshots and current applicable bylaw provisions. Report 10's illustrative payloads and old-regime restrictions are not accepted facts; report 11's simplified measurement definitions need checking; report 13 does not establish a design fit; report 14 duplicates report 9 and is not corroboration. Provider adoption is deferred and non-blocking. See the revised acceptance criteria in SR-01, SR-04 through SR-13, SR-16, and SR-18.

The first evaluator checks a supplied reviewed placement. Preserve manual site facts and their revisions; do not infer slope from 2D polygons, legal rear yards from parcel-minus-building geometry, or universal no-fit from one failed placement. Outside coverage remains distinct from evidenced failure.

## Ticket index

| Ticket | Outcome | Milestone | Completion dependencies |
|---|---|---|---|
| [SR-01](SR-01.md) | Select pilot workflow, real design, and municipality | M0: Scope | None |
| [SR-02](SR-02.md) | Repair application scaffold and isolate development/test configuration | M1: Technical proof | None |
| [SR-03](SR-03.md) | Establish GitHub Actions CI and required validation checks | M1: Technical proof | SR-02 |
| [SR-04](SR-04.md) | Define typed boundaries for sources, designs, rules, and results | M1: Technical proof | None |
| [SR-05](SR-05.md) | Capture immutable source and design snapshots | M1: Technical proof | SR-01, SR-04 |
| [SR-06](SR-06.md) | Build reviewed clause and parcel reference corpus | M1: Technical proof | SR-05 |
| [SR-07](SR-07.md) | Benchmark and implement bounded LLM-assisted extraction | M1: Technical proof | SR-04, SR-06 |
| [SR-08](SR-08.md) | Persist rule revisions, review history, and dataset metadata | M1: Technical proof | SR-02, SR-04 |
| [SR-09](SR-09.md) | Import pilot parcels and preserve zoning intersections | M1: Technical proof | SR-05, SR-08 |
| [SR-10](SR-10.md) | Evaluate a bounded set of coherent development checks | M1: Technical proof | SR-06, SR-08, SR-09 |
| [SR-11](SR-11.md) | Publish reviewed data atomically and derive scouting projection | M1: Technical proof | SR-07, SR-08, SR-10 |
| [SR-12](SR-12.md) | Expose screening and evidence in API and thin investigation UI | M1: Technical proof | SR-10, SR-11 |
| [SR-13](SR-13.md) | Verify source-to-result behavior and package one deployable image | M1: Technical proof | SR-03, SR-12 |
| [SR-14](SR-14.md) | Provision a minimal protected demo environment | M2: User-tested MVP | SR-13 |
| [SR-15](SR-15.md) | Deploy immutable builds with migration and rollback controls | M2: User-tested MVP | SR-14 |
| [SR-16](SR-16.md) | Run and measure a real customer qualification pilot | M2: User-tested MVP | SR-01, SR-06, SR-12, SR-15 |
| [SR-17](SR-17.md) | Measure transfer cost in a second municipality | M3: Expansion experiment | SR-16 |
| [SR-18](SR-18.md) | Resolve provider buy-versus-build questions with actual samples | M0: Scope | None |
| [SR-19](SR-19.md) / [issue #22](https://github.com/QuinnPaterson96/ShovelReady/issues/22) | Fixture-driven investigation preview and simulated task rehearsal | M1 preparation | SR-02, provisional SR-04 |

## Next parallel work

[Copy-ready task prompts and file ownership](next-wave-prompts.md) define the next two waves.

- SR-02/SR-03 are complete for the foundation; SR-04 is complete for provisional boundaries. The merged main CI passed. Corpus validation, database integrity and runtime semantics remain downstream responsibilities.
- Start the SR-01/SR-05/SR-06 intake and reviewer-ready packet alongside SR-08 persistence. The packet already contains real captured inputs but still lacks a controlled design revision, independent reviewer and supplied reviewed placements. Keep these tickets open until their actual acceptance criteria are met.
- Optionally start SR-19 / issue #22: a small synthetic results preview and simulated browser walkthrough. This can reveal presentation problems without asserting real site fit or customer validation. SR-12 still owns real API/UI integration; SR-16 still owns actual customer validation.
- Next, run SR-07 extraction against a usable reviewed clause subset alongside SR-09 spatial import once typed licensed spatial inputs and SR-08 are merged. Offline preparation can precede those gates; do not label it a completed benchmark/import. Manufacturer input gaps do not prevent importing spatial facts with unknowns retained.
- Then integrate SR-10 evaluation, SR-11 publication and SR-12 API/UI, followed by SR-13 end-to-end verification, SR-14 hosting and SR-15 deployment. The working startup container is not the completed source-to-result image.

Dependencies indicate completion gates, not a prohibition on early technical preparation. SR-08 owns shared Python dependency/CI changes in the first parallel wave. Keep schema revisions evidence-driven and coordinate them across consumers. Customer interviews, recruitment and measured use in SR-16 remain post-prototype; professional rule review and technical-input acquisition can happen earlier. SR-17/SR-18 remain deferred.

## Shared completion rules

Every ticket requires a reviewable artifact, recorded checks, explicit remaining limitations, and relevant documentation updates. Mark unavailable verification as blocked or unverified, not passed. Follow docs/quality.md; passing schemas never establishes legal accuracy. Do not run legacy database tests blindly. Preserve unrelated working-tree changes. Use the personal QuinnPaterson96 identity for repository operations.

No agents, vector stores, universal rule language, queues, or microservices without evidence of a concrete need. Paid resources need a selected project/account and spending limit. No outreach or provider contracts are authorized by a research ticket alone.

## Research inputs

The September 18 conversation reviewed the DASH interoperability report (4), BC data-source report (5), and their decision memo. These are hypotheses and evidence leads, not implementation requirements. Their local copies are not portable repository dependencies; acquisition tickets must record primary URLs and actual sample artifacts. Four commissioned studies cover municipality selection, customer workflow, extraction economics, and provider access. Use their findings in SR-01, SR-16, SR-07, and SR-18 respectively.

Primary acquisition entry points (verify selected records and rights during SR-05):

- [Vancouver zoning polygons](https://opendata.vancouver.ca/explore/dataset/zoning-districts-and-labels/)
- [Victoria zoning service](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_PlanningAndDevelopment/MapServer/12)
- [Victoria governing bylaws](https://www.victoria.ca/building-business/permits-development-construction/zoning)
- [DNV open data](https://geoweb.dnv.org/data/)
- [DASH resources](https://www.acceleratedhousing.ca/)

## Deferred scope

Citywide arbitrary address resolution, automated design placement, full BIM exchange, parcel assembly, additional building types, commercial third-party API, and broader geography need observed customer requirements. Investigation states remain useful first-class outcomes; they must not disguise a product that saves no net work.
