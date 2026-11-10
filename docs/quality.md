# Quality engineering agreement

## Project timeline verification — November 9, 2026

The [timeline integration record](project-timeline.md) describes independent
Victoria/Saanich timing profiles, disclosed planning allowances and context
invalidation. `frontend/src/project_timeline/timeline.test.tsx` protects source to
schedule to report behavior, with independently calculable critical paths,
missing-data propagation and calendar-year rent arithmetic. The dedicated
`frontend/tools/timeline_browser.mjs` exercises the shared economics journey on
phone/desktop, including rental skipped, editable bounds, scope/pathway/model/city/
property changes and inactive evidence. Use the local stateless demo only; no
database/live model calls are needed. Source timing is unreviewed; issuance and
occupancy remain project-specific confirmations. Final-head CI and merged-revision
Sol checks are separate evidence in the PR.

The local 205-test frontend suite and production build passed. The
[independent Impeccable review and correction confirmation](usability/project-timeline-2026-11-09/README.md)
records a clean detector, 31/40 corrected assessment and phone/desktop integration
with rental include/skip. The review distinguishes actual browser behavior from
physical-device, screen-reader and homeowner validation. The existing full
financial/export walkthrough is recorded separately in the PR.

## Shared municipal screening — November 9, 2026

[The multi-city handoff](multi-city-screening.md) records the implemented shared
registry, retained Victoria behavior, bounded Saanich comparisons and expansion
limits. HTTP integration tests protect legacy/new Victoria equivalence, exact
Saanich thresholds, three-valued location eligibility, incompatible definitions,
invalid geometry and catalogue drift. The connected placement browser check now
also covers Saanich inputs, near-threshold precision, invalid overrides, city and
property invalidation, delayed responses, source help and an unsent provider enquiry.
External maps are captured fixtures; calculations use the real local APIs.

Source currentness/interpretation, accepted publication, excluded Saanich rules,
human comprehension and further-city onboarding remain separate gaps with owners
in that handoff. Local database tests skip without explicitly isolated disposable
PostgreSQL; CI supplies it. Final-head CI and a Sol check of the merged revision
are distinct from local software/browser evidence and belong in the PR handoff.

## Regional rental scenarios — November 8, 2026

The [rental scenario handoff](rental-scenarios.md) records the source cohort,
editable allowances, calculation definitions and remaining gaps. The frontend
suite passed 200 cases, TypeScript/Vite passed, and two filesystem-only ingestion
checks verified unavailable rents and preservation of the active bundle on a
rejected import. A local production-build replay passed all four routes (phone
and desktop, financial interests selected and skipped), retained all four models'
authored rental assumptions and preserved a negative cash-flow scenario. Those
first-pass browser checks preceded the final source-link/copy refinement and ZIP
assertions; exact merged-revision verification follows the workspace procedure.
Software checks do not establish achievable suite rents or useful default
expense rates. Rental data/product owners need relevant small-suite comparables;
homeowner/provider/lender inputs remain under #124/#125, and research under
#340/#16/#147. No source acceptance or regulatory publication is implied.

## Integrated financial comparison — November 6, 2026

The [four-model walkthrough](usability/financial-integrated-2026-11-06/README.md)
passed in four fresh Chrome sessions: 390 × 844 with touch and 1440 × 1000,
each with both financial interests selected and with the question skipped.
In every session the homeowner could revisit each model's own position, budget
and authored enquiry, prepare a quote request, and download the current Quadra
enquiry. The initial quote action began 396 px from the top of the open
comparison on phone and 276 px on desktop. No horizontal overflow, browser
errors or external requests were observed in the recorded checks.

The original and newly downloaded PDFs show the complete “Site information”
heading. The separate [pagination follow-up (#342)](https://github.com/QuinnPaterson96/ShovelReady/issues/342)
tracks a sparse page before the map. The local run used the bundled example
and real stateless calculation endpoints. It does not verify a hosted update
across an open session (#329), physical-device behavior, homeowner understanding
of rental returns (#340), or accepted quotes, site inputs or regulatory evidence.

[Municipal street prefill verification](municipal-street-prefill.md#verification-and-remaining-work) records the live Victoria and Saanich browser checks, the offline correction and source-failure cases, and the remaining independent accuracy and homeowner validation work. On November 6 the stateless verification covered 97 focused backend cases, 194 frontend tests, the TypeScript/Vite build, the placement-demo browser journey and the saved-example walkthrough. The live browser selection/edit check used Kingsley St and May St. No municipal rule release was published.

## Placement and city routing — November 2026

The [combined browser journey and reproduction steps](integration-placement-guidance.md#verification) exercise captured Victoria and Saanich addresses against the local production build and real calculation APIs. On desktop and mobile-width Edge, the placement remained editable, a late suggestion did not undo a keyboard move, the setback guides remained visible outside the lot, and a city correction cleared the old jurisdiction from findings and report wording. A fresh Saanich address offered a city-only request and an independent manual sketch. No issue was submitted. Container CI runs this same journey against the packaged app.

Local verification: 194 frontend tests passed, TypeScript and production build completed, and Python reported 561 passed, 28 subtests passed and 37 skipped with no database or native lifecycle setup. CI separately covers disposable PostgreSQL, the Windows native lifecycle and container startup. The saved-example walkthrough exercised keyboard takeover, failure recovery, mobile navigation and an explicit PDF download. Developer review of the [generated enquiry](samples/placement-guidance/enquiry.txt) checked the provider’s next questions, product measurements, preliminary jurisdiction basis and separation of demo-supplied answers from property facts. Software and developer review do not establish authority acceptance or homeowner understanding. Remaining product and data owners are listed in the [handoff](integration-placement-guidance.md#still-open).

## Backend CI registry correction — October 23, 2026

PR #328's backend job repeatedly failed before tests while pulling PostgreSQL 17
from ECR Public (`toomanyrequests: Data limit exceeded`), including the requested
retry in run 40016377478. Only the disposable backend service image source now
uses Docker Hub's official `docker.io/library/postgres:17`. PostgreSQL major,
isolation, health checks and test gates remain unchanged. The next run (40019031402)
also hit ECR's 429 limit fetching Node, so the application Node/Python base images
now use their official Docker Hub locations with unchanged version tags as well.
This requires no credentials or new infrastructure;
neither public registry is guaranteed free of rate limits. Final-head CI is the
verification gate before merge, and supersedes the historical registry choice below.

Status: initial working agreement, September 17, 2026. These are acceptance criteria for future work, not claims about current test coverage.

## Same-property comparison verification — November 4, 2026

The [comparison handoff](financial-comparison.md) and
[measured browser record](usability/financial-comparison-2026-11-04/README.md)
record the optional retained-model comparison, its typed host interface and
same-site cost/suitability coverage. The preintegration frontend suite passed
185/185; the state worker reports 188/188 combined checks. The extended comparison
behaviour check and combined TypeScript/Vite build passed after the independent
review's priority-question correction. At actual 390 × 844, the production-build
browser journey verified model switching/return, authored question, placement,
budget scope/price retention, missing price/unknown currency, keyboard/touch
controls, copy fallback, real PDF download and navigation/refresh recovery. Page
width remained 390 with no overflow or browser errors. A separate 1440 × 1000
comparison capture was inspected. This is agent/software evidence, not human
validation, accepted legal/source review or publication.

November 6 correction: the original page 2 embedded image and an enlarged independent
render both show the complete “Site information” heading. The earlier visual
inspection misread the first letter. See [the enlargement](usability/financial-integrated-2026-11-06/original-site-heading.png).
Hosted rollout, actual phone/assistive-technology coverage and final
combined CI remain release/QA-owner follow-ups. Current matching quotes/site costs
remain with providers/property contacts under #124/#125; source/site review and
accepted publication remain separate real-evaluation gates. Homeowner usefulness
and comprehension remain unmeasured under #16/#147. No enquiry was sent, and no
merge or deployment was performed.

## Budget-journey review checkpoint — October 23, 2026

The existing integration coverage now includes optional-budget navigation, the
captured Cecelia demo, a shorter recipient cost paragraph and preservation of
installation questions even with building-only pricing. [Retained verification](budget-journey-verification/README.md)
separates software checks, official-source recheck, agent comprehension inspection
and the still-missing actual recipient study. The audit identified unnamed allowance
contributions; the generator now retains their category/amount in recipient prose.
Unknown Victoria fee eligibility remains unresolved, with no zero or factory-price
valuation inferred. [Implementation and exact gaps](project-budget-journey.md) list
practical impacts and next owners. No deployment or accepted publication occurred.

## Budget-scope prototype checkpoint — October 19, 2026

The optional financial draft has behavior-focused coverage for catalogue/manual
intake through exact calculation, enquiry and full evidence, with independent decimal
examples protecting package double-counting, zero, range bounds, mixed/unknown
currencies and failed-import preservation. Context changes withhold old costs.
[Verification and recipient output](budget-verification/README.md) retains the checks,
browser/download evidence, comparison and remaining gaps. Agent visual/editorial review
does not establish source accuracy, accepted publication or builder/homeowner usefulness;
Quinn owns the separately authorized human comparison under #16/#147.

## Decision-level quality

Define the supported customer decision, geography, use type, and source coverage before measuring correctness. Track false exclusions, misleading candidates, investigation/unknown share, and net user verification time. Retaining every parcel is not a useful success merely because recall is high.

Coverage breadth may come from assessing fewer constraints. It must not come from silently weakening the accuracy of the facts assessed. Display evidence coverage so a poorly documented municipality does not appear more permissive than a well-reviewed one.

## Boundary validation

Use typed, versioned models at extraction, ingestion, normalization, persistence, and API boundaries. Validate:

| Layer | Checks |
|---|---|
| Structure | Required fields, tagged rule types, supported versions, malformed JSON, unexpected fields |
| Meaning | Numeric types, unit dimensions, ratio denominator, percentage scaling, constraint direction, threshold inclusivity and overlap |
| Evidence | Existing source snapshot, valid locator, support for the interpretation, explicit unresolved references |
| Behavior | Pathway coherence, uncertainty propagation, appropriate result labels, decisive evidence for exclusions |
| Persistence | Repeat-import idempotency, transaction boundaries, immutable releases, compatibility and failed-publication behavior |

Schema validation cannot prove source support. A valid citation locator can still point to the wrong clause; that requires reference examples and review. Keep raw failed input and issue classifications in restricted diagnostic storage, without leaking secrets into logs.

For Victoria property-history research, check both the Development Tracker and public Property
Information Portal before declaring permit records unavailable. Preserve application,
issue, reported status, completion and occupancy as distinct events. Current portal
zoning labels on historical rows are not evidence of historical law; a completed
permit record does not itself discharge each condition or fix a plan revision.
Listings and provider offers may identify later changes but remain attributed claims.

Separate not found in reviewed scope, not applicable under stated facts, extraction failure, unsupported semantics, and missing parcel facts. Model confidence is not a substitute for review or measured accuracy. Quarantine malformed data; preserve useful unresolved rules with explicit status.

## Reference corpus and tests

Maintain a small reviewed set of source clauses and building/site cases with expected interpretation, evidence, and rationale. Include ordinary cases, exceptions, tables, boundary values, and failure cases. Record reviewer disagreement and source ambiguity. Hold out some cases from prompt tuning.

Every consequential defect should add an appropriate regression example. Useful invariants include:

- Equivalent unit representations produce equivalent decisions.
- Rule ordering does not change results.
- Missing required facts cannot produce a verified pass.
- Incompatible alternatives are not combined into an invented pathway.
- Every result identifies its dataset release and supporting rule revisions.
- Repeated imports do not duplicate published rules.
- Failed imports/publications leave the active release intact.

Apply monotonicity assumptions only where justified within a particular pathway; larger sites or fewer units are not universally easier to approve.

## Three validation cadences

1. **Every code change:** deterministic tests using saved reviewed fixtures; no live LLM calls. Include one full path through ingestion, persistence, evaluation, and evidence retrieval. Exercise API/UI serialization of uncertainty.
2. **Prompt/model/parser changes:** rerun an annotated corpus, including held-out cases and repeated runs as warranted. Measure omissions, applicability, exceptions, units, values, dependencies, citations, and correction effort separately. Retain run metadata and compare changed decisions.
3. **Dataset publication:** verify declared coverage, source currency limitations, unresolved issues, review status, release compatibility, and expected result changes. Review material differences before activating the release.

Keep tests relevant to observed risks. Do not add tests that merely restate implementation details, or run paid/live extraction for every PR. The existing unrelated test suite must be repaired or isolated before reuse; never allow test cleanup to reach shared or production databases.

Check generated boundary artifacts against their source in CI. Wave seven adds the
Python-to-frontend report schema/type/fixture drift check to the existing backend job.
Mocked consumer fixtures alone do not establish live producer/consumer compatibility;
record a combined API/UI check when connecting those layers for the first time.

## Explain and recover

### Readable provenance

Default product views and human-facing copy/export text lead with a meaningful
source or provider label, capture date, source link and explicit review status.
Raw hashes, internal snapshot/release IDs, schema versions and diagnostic payloads
belong in labelled expandable technical details or a separate technical evidence
export. Preserve complete identifiers in underlying data and make exact values
recoverable and copyable; merely truncating a hash is not a readable source label.
Meaningful public identifiers such as a PID, address or bylaw section may remain
visible when they help the user identify the record.

Do not invent a source name/date when missing, hide uncertainty, or represent a
snapshot hash as a manufacturer design revision or a legally effective revision.
For example, show "Manufacturer revision not supplied" separately from technical
capture identity. These are presentation rules, not weakened provenance contracts.

For affected UI changes, check default and expanded views, human-facing copied
text, and the full technical record. Verify readable labels without raw hash noise,
preserved source association/full IDs, honest missing metadata, keyboard access and
long-value wrapping at narrow width. Test meaningful output behavior rather than
adding blanket string bans that would break technical exports.

A user should be able to identify why a case was included/excluded, what was checked, what remains unknown, and the source date. Test this understanding on real users. A disclaimer does not repair an affirmative label unsupported by the data.

Keep known source facts visible even when they cannot yet populate an evaluation
field. For example, show a provider's published exterior height beside the separate
foundation-to-roof input; an unresolved measurement reference must not make the
published height appear absent. Check both visibility of useful facts and correct
uncertainty propagation, including the human-facing summary/export.

Follow the [plain-language label and help rules](visual-identity.md#plain-language-labels-and-help).
For changed measurement controls, check the default label and units, expanded
definition, keyboard/touch access and narrow-screen wrapping. Verify that simplified
labels preserve measurement identity and uncertainty through summary/export. A
jurisdiction-specific definition must carry its jurisdiction and source/revision;
when unavailable, retain the gap instead of asserting a universal legal meaning.

Record errors by stage and retain run/release identifiers. Monitor ingestion failures and unresolved-case rates, not just HTTP uptime. Unexpected decision changes are investigated before promotion. Maintain a known-good application image and dataset release; test recovery with backward-compatible schemas and backups.

## Virtual-user evaluation

[SR-27 through SR-31](backlog/virtual-qa-plan.md) specify a bounded follow-up to the
SR-26 rehearsal. Records, cases, isolated manual execution and offline grading are
implemented; SR-31 completed six detection-control sessions and an explicit narrowing
decision. Ordinary-task coverage and independent human calibration remain unmeasured;
see [reviewed results and limitations](integration-pilot-01.md). See
[combined verification](integration-wave-six.md). A control's observability does not
establish that the participant's response was reviewed: missing or unassessable outcome
review cannot count as clean success or a seeded miss.
Freeze case/rubric/app/data identity, use fresh browser-only participants and assess
app behavior, agent behavior and grader behavior separately. Keep ordinary task
completion distinct from explicit bug detection, with paired clean/fault controls.
Unknown source facts cannot become authoritative expected outcomes through model
agreement. Reproduce and adjudicate findings before creating bug tickets; preserve
omissions, data gaps, tool failures and usability hypotheses as distinct categories.
Initially run on demand and keep live-model calls out of ordinary CI. Promote confirmed
defects into suitable deterministic regressions. This supports software QA; it does
not substitute for independent source review, accepted publication or real-user study.

Keep seeded detection separate from newly discovered baseline defects. Accurate reports
of a missing optional capability are observations; whether they constitute a defect or
useful improvement needs an explicit requirement and evidence. The pilot's clean-control
false-alarm count depends on that classification and is not general tester accuracy.
Retain original judgments and add attributed revisions when a human reviewer disagrees.
Preserve locally retained artifacts before cleaning temporary directories; a file hash
or a tool-history locator alone does not make evidence portable or permanently available.

## Integration handoff

Use the [PR template](../.github/pull_request_template.md) to leave a short, reproducible
handoff. Small documentation changes can use one-line fields and explicit N/A reasons;
link existing evidence rather than repeat it. See the [recorded rehearsals](pr-handoffs.md)
for examples and historical evidence gaps. This checklist uses existing checks and
ownership; it adds no reviewer, approval, bot or branch-protection requirement.

- [ ] Review the actual diff and changed interfaces/configuration/migrations against the
  linked criteria, including compatibility and recovery implications where relevant.
- [ ] Identify the starting base and PR head, and which revision each check covers.
  GitHub's PR head is sufficient for the handoff; record older evidence explicitly.
- [ ] Run appropriate combined checks for the integrated changes, recording exact commands,
  setup, outcomes and skips. Documentation/link review suffices for documentation-only
  changes. Database checks must use isolated disposable resources; no live model calls.
- [ ] Confirm existing required CI succeeds for the final PR head before integration;
  earlier-head success and local checks do not establish final-head CI success.
- [ ] Reconcile central README, architecture and backlog status under integration ownership.
  Record satisfied and remaining criteria; a partial implementation does not close its
  parent objective. Coordinate shared-file changes with their declared owners.
- [ ] Check the demo command/setup and expected result where applicable, and retain
  limitations and dependencies. Keep software verification, independent source review,
  accepted data publication and real-user validation distinct; code merge is not publication.

## Explicit integration gaps

At every integration, include the actual remaining gaps in the user-facing summary,
not only in a linked report. For each material gap record what is missing, observed
evidence, practical impact, next action and owner/ticket. Distinguish blockers to
usable demonstrations from source review, controlled inputs, accepted publication,
real evaluation and user-validation gates. If a gap cannot be resolved by software,
say which external artifact or decision is needed. Passing tests or merging a partial
slice must not erase its remaining acceptance criteria.

## Definition of done

For measurement presentation changes, check the display policy in
[Civic Atlas](visual-identity.md#measurement-display-precision): rounded summaries
must retain exact values in calculation payloads and technical evidence. Focusing
and leaving a field must not alter its stored value or source attribution. Include
a near-threshold case where the displayed numbers coincide but the reported
shortfall remains visible; tiny nonzero overlaps must not display as zero. These
checks protect numerical meaning, not a particular component implementation.

A consequential change is done when:

- Supported scope and assumptions are explicit.
- Relevant normal, boundary, and failure cases have been verified.
- Evidence and uncertainty remain traceable through the user-visible result.
- Expected decision changes are documented; unexpected changes are resolved or explicitly withheld from publication.
- Persistence changes have a tested migration and recovery approach proportionate to the risk.
- The interface describes what was established without overstating confidence.
- Documentation states what was actually tested and any remaining limitations.

Keep short decision notes for consequential choices: context, decision, alternatives considered, evidence, consequences, and reconsideration trigger. Update this agreement when real failures teach us something new.


## Behavior-focused test selection

Prefer integration coverage for consequential workflows; do not impose a unit-test
quota or a coverage percentage target. Choose the smallest test boundary that can
reproduce a meaningful failure independently of the implementation.

- Keep focused calculation tests for geometry, unit/ratio normalization, threshold
  boundaries and uncertainty propagation. Expected numbers must come from an
  independently explained example, reviewed source, or mathematical property;
  never copy the current function output into a golden fixture as proof of correctness.
- Prioritize real module connections: retained source bytes -> conversion -> typed
  request -> measurements -> serialization; use disposable PostgreSQL and real HTTP
  when persistence/API behavior is affected. Mock external network/model services at
  their boundary, not the internal pipeline under test.
- Keep a small repeatable browser suite for the core user journey: enter/select a
  site and model, supply placement, inspect partial results and citations, edit inputs
  and observe stale-result invalidation, recover from unavailable data, and inspect
  readable/copyable evidence on narrow screens and with a keyboard. These are
  acceptance targets; existing browser walkthroughs are not yet this automated suite.
- Avoid tests of private helper calls, component implementation structure, broad UI
  snapshots and duplicate assertions at every layer. A refactor preserving public
  behavior should normally preserve tests. Add regressions for reproduced defects.
- Distinguish software behavior, source/interpretation accuracy and user usefulness.
  A replay proves reproducibility, not correctness of its source. A browser journey
  cannot prove distance arithmetic or legal applicability. Agent walkthroughs remain
  exploratory supplements; human validation measures comprehension and time saved.

For each consequential PR, name the behavior protected, where the expected answer
comes from, and what the test does not establish. Do not delete useful existing tests
merely to change the test mix. Move effort toward uncovered failure modes. For small
reversible documentation/presentation edits, proportionate inspection can suffice.

## Prefab generalization verification — October 7, 2026

[Implementation evidence and remaining gaps](prefab-generalization.md#implemented-and-verified)
records 153 passing frontend behavioral tests, 34 passing catalogue/intake tests,
type/build/lint and reproducible snapshot checks. The switch test reproduces site
answer loss on placement remount and verifies its correction. The actual Studio
enquiry package and rendered PNG were reviewed from the recipient perspective.
The initial handoff left keyboard/manual/live journeys and independent PDF rendering
open; the follow-up below closes core journey/output checks. Provider source review,
accepted publication and real recipient validation remain separate gaps;
see the linked owner/action table. No database tests or cloud resources were used.


### Prefab follow-up usability evidence

The [follow-up record](prefab-generalization.md#follow-up-usability-verification--october-7-2026)
adds manual and real live-source switching, core keyboard workflow and independent
PDFium rendering of both Studio and Quadra downloaded PDFs. It reproduced a Quadra
model/edge label collision, corrected by using a separate map legend slot, and
checked a fresh download. Full frontend behavioral checks are rerun for this change;
real recipient validation and exhaustive accessibility/device testing remain open.

The same follow-up reproduced a stale discovery callback restoring Model 300 use
and foundation when another model was selected before property search. The existing
host regression now covers that action order; SiteDiscovery calls the current host
callback and fresh live-source selection retains explicit unknowns.

## Canonical navigation verification - October 8, 2026

See [integration evidence](integration-canonical-navigation.md) for the composed
navigation/history/model/property journey checks and the retained changed-provider
[local enquiry](navigation-simplification-enquiry.txt). These are developer/agent
software and recipient-perspective inspections, not manufacturer validation or
accepted source/legal review. Existing model-switch/export coverage protects stale
provider details; navigation coverage now exercises the mounted App and assessment
through explicit demo replacement, history, fresh and model-prefilled entry, legacy
links and example-to-real invalidation. No enquiry was sent.

## Guided walkthrough verification — October 9, 2026

[The walkthrough record](guided-walkthrough.md) separates mounted behavioral coverage,
real local API/browser reproduction, source readiness and human validation. It includes
390 × 844 keyboard/reduced-motion checks, delayed/failed responses and obsolete-response
takeover. Explicit Next/Back checks restore the before-placement geometry, hold a
normal-motion step past its former dwell, gate Next on current measurements and
stop Skip at findings. Recipient inspection of an explicitly saved PDF verifies demo attribution but
records crowded lower plan sources/footers as an export follow-up; the exact JSON remains complete.
Municipal success paths, source acceptance, broad accessibility and participant validation
remain separate gaps. No deployment, source publication or external enquiry was performed.

## Homepage verification — October 9, 2026

[Homepage rework evidence](homepage-rework.md) records the homeowner-first copy,
actual saved-example map asset and its licence/attribution, 177 passing frontend tests,
build/type checks, desktop/mobile browser inspection, keyboard focus and protected
resume/demo entry. Software and developer visual checks are separate from source
acceptance and participant validation. Pilot contact, manufacturer image permission,
session persistence and accepted real-evaluation gaps remain explicitly assigned there.
### CI image-pull registry

Docker Hub first returned unauthenticated pull-limit errors in walkthrough PR #317.
Authenticated PostgreSQL pulls and backend checks subsequently passed, but container
pulls repeatedly received token-endpoint timeouts/HTTP 504, even with bounded login
retries. The owner requested switching to Docker's official images on ECR Public.
The Dockerfile now pulls Node/Python and CI pulls PostgreSQL from
`public.ecr.aws/docker/library/`, without login or AWS credentials. Docker Hub login,
logout and service credentials were removed; the repository secrets and Docker tokens
remain provisioned but unused by this workflow. No credentials are committed or
included in builds. Forks use the same anonymous public registry.

On October 9, anonymous registry API reads independently fetched manifest bytes from
Docker Hub and ECR Public. SHA-256 index digests and Linux AMD64 child digests matched
for all three exact tags. Index digests at that verification:

| Image tag | Matching index digest |
|---|---|
| `node:22.14.0-bookworm-slim` | `sha256:1c18d9ab3af4585870b92e4dbc5cac5a0dc77dd13df1a5905cea89fc720eb05b` |
| `python:3.12-slim-bookworm` | `sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258` |
| `postgres:17` | `sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3` |

Tags retain their existing update behavior and are not digest-pinned. Matching
manifests establish image equivalence at this check; full final-head CI must separately
verify pulls, disposable database checks, build and container application behavior.
Railway build/startup verification remains pending until deployment.


The [waterfront prefill verification](municipal-waterfront-prefill.md) distinguishes the live coastal and lake address checks, constructed geometry controls, editable mark and report checks from independent source review and user validation.

## Project economics verification — November 9, 2026

The [labels and accessible-updates follow-up](usability/economics-followup/README.md)
removes repeated cost headings and adds a shared, debounced result status at both
screen sizes. Its verification record distinguishes Chrome accessibility-tree
properties and result-text changes from unverified platform screen-reader speech.
The product owner volunteered for the included comprehension task; unanswered
tasks remain pending and are not counted as homeowner validation.

The [independent visual review and correction confirmation](usability/project-economics-2026-11-09/README.md)
records desktop and phone inspection, the initial 27/40 and corrected 31/40
heuristic assessments, the clean seven-file Impeccable scan and remaining
physical-device, screen-reader and homeowner-validation gaps. Valid grouped
amounts, malformed edits, rental inclusion focus, mobile result proximity and
return-to-project focus/scroll passed the bounded confirmation. Source acceptance
and complete site costs remain separate from software usability.

Implementation revision `796d2b38b0f936e61461047e3a502a020c7feb7d` passed the
200-case frontend suite, TypeScript/Vite production build, placement-demo, guided
walkthrough, advanced budget and comparison browser checks. The
[measured financial walkthrough](usability/project-economics-2026-11-09/financial-walkthrough.json)
completed phone/desktop × rental-included/skipped, each across four models, with
no page errors or external requests. This is pre-merge evidence; CI and the
separate Sol test of the merged commit remain distinct verification steps.

The [project economics decision](decisions/project-economics.md) records the
starting amounts, source boundaries and remaining work. From `frontend/`, run
`npm run build` and `npm test`. For local browser verification, set
`COMPARISON_URL`, `COMPARISON_API`, `WALKTHROUGH_URL`, `WALKTHROUGH_API` and
`PLACEMENT_DEMO_URL` to the same loopback stateless app serving the built frontend.
Use `RENTAL_ACCEPTANCE=1 node tools/verify_financial_integration.mjs` for the
1440px desktop and 390px phone include/skip journeys across four models. That
check exercises current placement, retained questions and model-specific amounts,
cost scope, valid and malformed amount edits, positive-income payback, focus and
scroll recovery, enquiry and the downloadable report/evidence package. It uses
the real local placement and screening APIs and blocks external data requests.

`node tools/budget_browser.mjs` exercises keyboard takeover, advanced cost scope,
ambiguous overlapping entries, draft JSON validation and import, and cost evidence
in the PDF/ZIP handoff. `node tools/verify_financial_comparison.mjs` checks touch
model switching, desktop and narrow comparison, copy failure and enquiry recovery.
`npm run test:walkthrough` and `npm run test:placement-demo` cover adjacent demo
and discovery behavior. These are software checks on a stateless local app.
Provider quote scope, municipal applicability, achievable rent and user
understanding remain separate evidence gaps.

## Navigation reliability — November 9, 2026

[The navigation handoff](navigation-reliability.md) records the stationary Next
feedback-loop reproduction, phone continuation reachability, demo waiting/focus,
property-entry behavior and the combined scroll-interference correction. The
real-browser continuation check samples button bounds and document height with
normal and reduced motion, hit-tests before scrolling to the action, and checks
keyboard visibility. Existing integration fixtures cover the same shared journey;
they do not substitute for layout verification. Exact merged-revision Sol checks
on `8140ac6` superseded the earlier mixed-build financial run: all 16 model visits
passed on a stable build. Fresh independent review found additional destination
focus and heading-shift defects; the navigation handoff records their reproduction
and follow-up corrections. The strengthened browser checks cover held responses,
settled takeover, visible outcome headings, phone map hit testing and explicit
estimate return focus. Final combined and exact-merge results belong in the PR
handoff. Physical-device keyboards, actual screen-reader speech and homeowner
comprehension remain separate engineering/research follow-ups. No source review,
accepted-data publication, database change or provider contact is implied.
