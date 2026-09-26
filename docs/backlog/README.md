# MVP backlog

Planning baseline: September 18, 2026; post-merge checkpoint: September 24, 2026. PRs #20, #21 and #19 merged the scaffold/CI, provisional contracts and raw pilot evidence; PRs #24-#26 added typed intake, persistence and the synthetic investigation preview; PRs #28/#29 added offline extraction replay and licensed spatial import. PRs #31-#33 added the draft scalar evaluator, persistent local database and real-observation API/UI. There is still no accepted real-site source-to-screening path, accepted dataset or cloud deployment.

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
| [SR-20](SR-20.md) / [issue #35](https://github.com/QuinnPaterson96/ShovelReady/issues/35) | Native database lifecycle in Windows CI | M1 support | Merged PRs #32/#33 |
| [SR-21](SR-21.md) / [issue #36](https://github.com/QuinnPaterson96/ShovelReady/issues/36) | Reproducible local demo and visible app/data identity | M1 support | Merged PRs #32/#33 |
| [SR-22](SR-22.md) / [issue #37](https://github.com/QuinnPaterson96/ShovelReady/issues/37) | Short PR handoff template and integration checklist | M1 support | None |
| [SR-23](SR-23.md) / [issue #38](https://github.com/QuinnPaterson96/ShovelReady/issues/38) | Research 10-20 public development cases for test references | M1 preparation | None for research; independent acceptance remains SR-06 |
| [SR-24](SR-24.md) / [issue #44](https://github.com/QuinnPaterson96/ShovelReady/issues/44) | Read-only investigation of provisional public case evidence | M1 preparation | Merged SR-23 inventory |
| [SR-25](SR-25.md) / [issue #45](https://github.com/QuinnPaterson96/ShovelReady/issues/45) | Bounded historical Stannard reference packet | M1 preparation | Merged SR-23 inventory; acceptance remains SR-06 |
| [SR-26](SR-26.md) / [issue #46](https://github.com/QuinnPaterson96/ShovelReady/issues/46) | Blinded virtual-user walkthrough of existing VIC-080 | M1 preparation | Merged demo/viewer; independent of SR-24/SR-25 |
| [SR-27](SR-27.md) / [issue #51](https://github.com/QuinnPaterson96/ShovelReady/issues/51) | Versioned virtual-user case, run and finding records | M1 support | Review SR-26 evidence |
| [SR-28](SR-28.md) / [issue #52](https://github.com/QuinnPaterson96/ShovelReady/issues/52) | Five scenarios and paired clean/defect controls | M1 support | SR-27 |
| [SR-29](SR-29.md) / [issue #53](https://github.com/QuinnPaterson96/ShovelReady/issues/53) | Reproducible selection and isolated local run preparation | M1 support | SR-27; integrate with SR-28 |
| [SR-30](SR-30.md) / [issue #54](https://github.com/QuinnPaterson96/ShovelReady/issues/54) | Report grading, adjudication and draft issues | M1 support | SR-27; calibrate with SR-28 |
| [SR-31](SR-31.md) / [issue #55](https://github.com/QuinnPaterson96/ShovelReady/issues/55) | Bounded virtual-user pilot and value assessment | M1 support | SR-26 review; SR-28/SR-29/SR-30 integrated |
| [SR-32](SR-32.md) / [issue #65](https://github.com/QuinnPaterson96/ShovelReady/issues/65) | Persist and serve reproducible draft evaluator runs | M1 preparation | Existing SR-08/SR-10 interfaces |
| [SR-33](SR-33.md) / [issue #66](https://github.com/QuinnPaterson96/ShovelReady/issues/66) | Inspect computed draft evaluations in the app | M1 preparation | Existing report; SR-32 for live integration |
| [SR-34](SR-34.md) / [issue #74](https://github.com/QuinnPaterson96/ShovelReady/issues/74) | Reproducible historical Pilot intake diagnostic | M1 preparation | Merged Pilot packet; existing contracts/core |
| [SR-35](SR-35.md) / [issue #75](https://github.com/QuinnPaterson96/ShovelReady/issues/75) | Specific approved plans or exact unsent record requests | M1 preparation | Merged case research/review; independent of SR-34 |
| [SR-36](SR-36.md) / [issue #79](https://github.com/QuinnPaterson96/ShovelReady/issues/79) | Home, optional example import, parameter entry and status | M1 preparation | Existing main; SR-37 for final Pilot route wiring |
| [SR-37](SR-37.md) / [issue #80](https://github.com/QuinnPaterson96/ShovelReady/issues/80) | Read-only real Pilot preparation view | M1 preparation | SR-34 / PR #78; SR-36 for final shell/banner wiring |

## Wave-ten checkpoint and next work

[Integration evidence](../integration-wave-ten.md) covers PRs #94-#100 and integration
corrections. [Next-step plan](../next-steps-after-wave-ten.md) prioritizes SR-41/#89
assessment wiring. SR-38/#86 remains partial because address acquisition/join is
unimplemented. SR-39/#87 and SR-40/#88 deliver bounded provisional rule/catalogue
components. SR-42-45/#90-#93 deliver bounded municipal experiments; SR-17 remains open.
None delivers accepted legal/site data, publication or launched municipal coverage.

## Earlier parallel work

[Wave nine](../integration-wave-nine.md) completes SR-36 and SR-37 in their bounded
scopes: home/input/status flow, read-only Pilot diagnostic/API, evidence wording,
and shared navigation/banner wiring. Reviewed real-case inputs and accepted rules
remain the next substantive gate. See [wave-eight results](../integration-wave-eight.md) for merged
work, actual app checks and the still-unaccepted real-data boundary.

[Wave-seven assignments](wave-seven-prompts.md) are complete in their bounded scopes:
PRs #68/#69 and [combined verification](../integration-wave-seven.md) connect computed
synthetic reports to storage/API/UI. SR-32 / #65 and SR-33 / #66 are complete. Parent
SR-10/12/13 remain partial, and SR-11 has no accepted release or activation pointer.

Research PRs #71-#73 supply provisional Pilot/Avalon packets and the Warren Gardens
acquisition gap. [Wave eight](wave-eight-prompts.md) assigns SR-34's offline historical
Pilot mapping experiment and SR-35's specific approved-plan acquisition in parallel.
The [review note](../research/case-readiness/review-2026-09-25.md) adds the independently
observed Avalon BP059152 trail. Neither task waits for the other's deliverable.
Acceptance, supported evaluation and publication remain gates in the
[next-step plan](../next-steps-after-wave-seven.md); no parent objective is closed by
research or preparation diagnostics. Existing owner/reviewer actions remain distinct.

[Wave-five scope and ownership](wave-five-prompts.md), [wave four](wave-four-prompts.md), [wave three](wave-three-prompts.md), [wave two](wave-two-prompts.md) and [wave one](next-wave-prompts.md) remain historical handoff context.

The [virtual-user evaluation plan](virtual-qa-plan.md) adds SR-27 through SR-31.
SR-27 through SR-30 tooling is implemented and reviewed; [wave-six integration](../integration-wave-six.md)
records combined verification and a corrected control-grading gap. SR-27/28/29 are
complete in their bounded scopes. [SR-31 results](../integration-pilot-01.md) are now
reviewed: six detection sessions, no new baseline defect, and an accepted narrowing
decision. SR-31 is complete as a bounded experiment; SR-30 remains open for independent
human calibration of the retained judgments. Ordinary-task performance is unmeasured.
The workflow keeps a
fixed baseline plus seeded sampling, separate participant/grader assessment and
adjudication before issue creation. No recurring automation or live-model CI is added.
This supporting QA work does not replace the accepted-data or real-customer gates.

Next development priority remains the reviewed design/site/rule subset and accepted
source-to-result path (SR-05/06 and SR-10 through SR-13). Carry the source-opening and
missing-facts wording hypotheses into SR-12's evidence workflow review; do not create
baseline bug tickets or expand the QA infrastructure from these synthetic controls.

SR-24/SR-25/SR-26 are complete in their bounded scopes through PRs #49/#50/#48.
The evidence viewer, provisional historical review packet and single-agent rehearsal
do not complete accepted screening, independent legal review or customer validation.
See [wave-five integration](../integration-wave-five.md) for exact verification,
selected research reconciliation and task gates.

- SR-02/SR-03/SR-04 are complete in their scaffold/provisional scopes. SR-08 persistence and SR-19 / issue #22 synthetic preview/rehearsal are now complete.
- SR-01/SR-05/SR-06 remain partial: typed licensed inputs and a provisional corpus exist, but controlled design, reviewed site/placement facts, authorized durable private sources and independent acceptance are missing.
- SR-07's offline replay and eligibility gates are implemented; all 25 real entries remain blocked with no accuracy/cost/timing measurement. SR-09's licensed import and bounded XY/CRS/intersection checks are implemented. Both tickets remain open for their outstanding criteria; address joins are deferred for the sample-selection workflow and reviewed legal site facts remain absent.
- PR #31's bounded deterministic core is verified with labelled synthetic rules/facts. PR #33's read-only investigation API/UI consumes the pinned licensed observations; PR #32's local database helper supports a persistent development workflow. Combined integration passed 211 tests and 28 contract subtests with native lifecycle enabled, plus frontend checks and a seeded-database browser walkthrough. See the [integration review](../integration-review-2026-09-24.md).
- SR-20/SR-21/SR-22 are implemented, and SR-23 delivered ten provisional case packets (seven Victoria plus three transfer examples), with no accepted outcomes. See [wave-four evidence](../integration-wave-four.md). The native Windows lifecycle check is now required. Launch SR-24 public-case evidence view, SR-25 focused historical review packet and SR-26 virtual-user walkthrough independently; the virtual run uses the current licensed viewer, not unmerged SR-24 work.
- A real licensed intake-to-spatial-storage roundtrip passes without changing unreviewed status. Reading a pinned observation revision is not accepted data publication. SR-10 real checks, SR-11 accepted publication and SR-12 screening integration retain their evidence gates. No live model run, real fit or cloud deployment is claimed.
- SR-13 completes full end-to-end verification before SR-14 hosting and SR-15 CD. SR-16 remains actual customer validation after a usable prototype; SR-17/SR-18 remain deferred.

Dependencies are completion gates, not a prohibition on useful offline preparation. Do not block technical work on customer commitments, and do not disguise missing evidence as completed review. The precise owner inputs are listed in [reviewer actions](../pilot-inputs/reviewer-actions.md).

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
