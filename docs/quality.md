# Quality engineering agreement

Status: initial working agreement, September 17, 2026. These are acceptance criteria for future work, not claims about current test coverage.

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

## Explain and recover

A user should be able to identify why a case was included/excluded, what was checked, what remains unknown, and the source date. Test this understanding on real users. A disclaimer does not repair an affirmative label unsupported by the data.

Record errors by stage and retain run/release identifiers. Monitor ingestion failures and unresolved-case rates, not just HTTP uptime. Unexpected decision changes are investigated before promotion. Maintain a known-good application image and dataset release; test recovery with backward-compatible schemas and backups.

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

## Definition of done

A consequential change is done when:

- Supported scope and assumptions are explicit.
- Relevant normal, boundary, and failure cases have been verified.
- Evidence and uncertainty remain traceable through the user-visible result.
- Expected decision changes are documented; unexpected changes are resolved or explicitly withheld from publication.
- Persistence changes have a tested migration and recovery approach proportionate to the risk.
- The interface describes what was established without overstating confidence.
- Documentation states what was actually tested and any remaining limitations.

Keep short decision notes for consequential choices: context, decision, alternatives considered, evidence, consequences, and reconsideration trigger. Update this agreement when real failures teach us something new.
