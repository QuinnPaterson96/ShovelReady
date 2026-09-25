# Offline grading and local issue drafts

SR-30 implements file-based replay of saved, attributed reviews in
`scripts/virtual_qa/grading.py`. It imports the [SR-27 contracts](protocol.md);
it does not redefine cases, runs, findings or regulatory data. No model service,
database, browser session or GitHub issue publication occurs. The application is unchanged.

## Inputs and use

Run from the repository root with existing locked dependencies. This runnable example
preserves the retrospective SR-26 omission as unscored, with no invented app defect:

```powershell
$gradingOutput = Join-Path $env:TEMP ('sr30-grade-' + [guid]::NewGuid().ToString())
python -m uv run --locked python -m scripts.virtual_qa.grading --records docs/usability/virtual-qa/sr26-report-example.json --scoring docs/usability/virtual-qa/grading-sr26-scoring.json --output $gradingOutput
```

Expected: one report-derived case-attempt, zero scored checks, N/A checklist metrics,
the original unresolved agent-omission finding, and no issue draft. No new participant
or historical regrading is implied. `grades.json` retains input cases/runs, assessment
and finding histories, effective grades, grouped counts, limitations and local drafts.
Existing output directories are refused; corrected grades go to a new directory.

For actual saved files, use repeatable `--case`, `--run`, `--finding`, `--scoring` and
`--assessment` arguments. Each names one JSON record. Include all retry ancestors
and all earlier finding/assessment revisions. `--records` is only a convenience for
the existing `{cases,runs,findings}` example envelope. There is no discovery of files
outside explicit paths. Prepared runs are retained as `prepared_runs_not_graded`;
grade the runner's final `run.json`, not its `run.prepared.json` snapshot.

The runner's copied final note, evidence files and lifecycle receipts must be registered
as shared `Reference`s in the run. References can be absolute file URIs or opaque tool
history locators. The grader does not fetch them: a named reviewer must inspect actual
available artifacts and attest reference identity, locator and content. Missing artifacts
stay missing. Paths on another machine are not proof of available screenshots. These
attestations are auditable statements, not authenticated evidence or legal acceptance.

## Additional grading records

Import `FrozenScoring`, `Assessment` and `Reviewer` from `scripts.virtual_qa.grading`.
Use their `model_json_schema()`, `model_validate_json()` and `model_dump_json(indent=2)`;
unknown fields/versions fail. These are grading adjuncts, not alternate shared contracts.

`FrozenScoring` has version `virtual-qa-scoring/v1`, its own revision, the existing
`CasePin`, separately supplied shared `Rubric`, `critical_checks: Metadata[tuple[str,...]]`
and `frozen_at: Metadata[AwareDatetime]`. Case digest and rubric must exactly match the
run pin. For SR-31, save one such artifact per selected case before dispatch, alongside
the runner's frozen case. Name atomic critical check IDs, or record null with an unknown
reason. A known critical policy must freeze no later than the prospective run's rubric
freeze. Critical checks cannot be invented from discoveries or unscored historical facts.
This optional policy is not a runner/materialization dependency; unknown criticality
produces N/A. The full policy and its SHA-256 are retained in grades; changes produce
separate output, never silent edits to an original grade.

For example, create a policy using the already frozen case (supply the actual timestamp
and reviewed critical IDs for a prospective pilot, rather than inventing them):

```python
from scripts.virtual_qa.contracts import CaseDefinition, CasePin
from scripts.virtual_qa.grading import FrozenScoring

case = CaseDefinition.model_validate_json(case_text)
policy = FrozenScoring(
    schema_version="virtual-qa-scoring/v1", revision="1",
    pin=CasePin.from_case(case), rubric=case.facilitator,
    critical_checks={"value": None, "unknown_reason": "No critical policy reviewed."},
    frozen_at={"value": None, "unknown_reason": "No prospective critical policy."},
)
```

`Assessment` has version `virtual-qa-assessment/v1`, ID/revision/supersedes, run ID and
shared case pin. Supply actual reviewer identity, role (`agent` or `human`), involvement,
review date, rationale and disagreements. The body records:

- Environment `ready`, `blocked` or `unknown`, with registered environment evidence;
  evidence reviews (`verified`, `missing`, `invalid`, `disputed`) with reasons.
- Check decisions naming only scored frozen checks: supported, partial, unsupported,
  not attempted or unassessable, with registered evidence and rationale. Omission is
  an explicit reviewer decision based on the saved response; absent review is not failure.
- Distinct substantive claims, including unsolicited conclusions, with stable claim IDs,
  evidence, status and rationale. The reviewer collapses paraphrases before assigning IDs.
- Finding decisions naming exact shared finding IDs/revisions, whether each was an app
  defect allegation, stable cause or unknown reason, expected behavior, reproduction
  steps, acceptance criteria, regression layer and explicit seeded-fault match.
- Control observability (true/false/null) and evidence; measured review minutes or an
  unknown reason. Agent wall-clock execution is not human review effort.

Evidence must belong to the pinned case/run or that run/case's finding history. A
check is assessable only with reviewed environment, final note, expectation/basis and
decision evidence. Invalid/missing/disputed evidence forces unassessable, never a pass
or a legal failure. A correctly evidenced unknown can be supported. Identity, digest,
rubric equality and reference membership are deterministic; semantic source support,
units/values and interpretation require explicit reviewer decisions, not string guessing.

## Saved model suggestions and adjudication

An optional model reviewer receives frozen case/rubric, run, saved note/evidence and
the Assessment JSON schema as data. Save its response as `kind="model_suggestion"`,
attribute the actual agent and retain unavailable metadata honestly. The grader neither
calls a model nor promotes that suggestion into grades/drafts. A separate
`kind="manual_review"` record must document actual evidence review and disagreements;
the reviewer can be an agent, but cannot be misrepresented as an independent human.
Unsupported suggestions do not become truth by agreement or relabelling.

Assessment and Finding histories require a retained root and a complete, unbranched
supersedes chain. Revisions cannot change run/case/check origin identity. Manual review
revisions retain earlier decisions; model suggestions use a separate assessment ID.
Finding adjudicator/date must match the attributed manual assessment for final decisions.
Only the latest finding revision is effective; a stale review cannot approve a newer one.
Rubric corrections require new shared case/rubric pins and a separate experiment/output.

Unsolicited findings have `origin="unsolicited"`, `check_id=null`. They retain all
run/case/evidence/adjudication checks and can yield a reproduced actionable draft.
They never create checklist items or enlarge checklist denominators. The SR-26
next-information observation remains unscored because its retrospective hidden-fact
expectation has no valid prospective observable/instruction basis.

## Counts and N/A

Every ratio reports numerator, denominator, value and N/A reason. Zero/unknown
denominators produce null, not 100%. Groups are separate by mode, full case/rubric digest,
scoring-policy digest and provenance; no overall blended score is emitted. Counts are
case-attempt units (one run containing two cases supplies two rows). Retries remain rows.
Categories, severity and pending counts remain visible. Check severity is critical only
when frozen in the policy; otherwise unknown, not an inferred minor/major value.

| Metric | Denominator and numerator |
|---|---|
| Checklist distribution | Each status count / all scored frozen check-attempts, including unassessable. Findings are never the denominator. All scored checks are required; inapplicability belongs in the pre-dispatch rubric. |
| Supported checks | Supported / assessable scored check-attempts. Partial, unsupported and not attempted remain in the denominator; unassessable does not. No fractional credit. |
| Critical omissions | Not-attempted atomic critical checks / assessable frozen critical checks. Partial is reported separately, not automatically an omission. Unknown critical policy yields N/A. This narrows the preparation proposal's compound-check rule: split atomic checks before dispatch. |
| Unsupported conclusions | Unsupported distinct claim-attempts / assessable distinct claim-attempts. Missing/disputed evidence is unassessable and separately counted; no claims yields N/A. |
| Finding precision | Confirmed reproduced app-defect allegations / resolved app-defect allegations (confirmed plus rejected). Confirmed false alarms count as rejected allegations. Deduplicate one cause/check per pinned scope per attempt; pending/conflicting allegations remain outside with counts. Severity-stratified precision is retained per attempt; category/severity distributions show raw counts and denominators. |
| Seeded detection | Evidence-supported matches / valid observable fault case-attempts in detection mode. One fault per shared seeded-fault case. Overlooked available faults remain misses; failed environment/materialization/evidence excludes with an unassessable-control count. Explicit reviewer mapping to the pinned fault is required, not any reported bug. |
| Clean false alarms | Completed eligible clean-control attempts with a rejected allegation / completed eligible clean-control attempts with resolved allegations or explicitly reviewed silence. Pending findings, unavailable note, unknown observability or failed environment cannot count as clean success. |
| Blocked/unassessable | Started case-attempts blocked or with unassessable checks / recorded-started case-attempts. Unknown/not-started attempts are listed separately; historical missing start time is not asserted to mean no dispatch. |
| Review effort | Recorded minutes / timed case-attempt reviews; list untimed/unreviewed counts and actual role in each review. No per-finding time allocation is invented. |

Unknown-defect recall is always N/A. A small authored corpus is not a population
accuracy estimate. Independent legal accuracy, human usability and publication are
separate evidence categories.

## Draft gates and deduplication

Only confirmed, reproduced app defects with verified supporting, contradicting (when
present) and reproduction evidence can produce a local draft. Require known app/frontend/
data identity, non-unknown severity, explicit cause, expected behavior, steps, acceptance
criteria and regression layer. Pending/disputed/unreproduced findings are withheld;
agent errors, source gaps, environment failures and usability hypotheses remain in the
ledger, not disguised as app bugs. Environment failure cannot establish an app success.

Deduplicate by reviewer-established cause, check (or null for unsolicited), exact case/
variant pin, app/frontend commits and data identity. Unknown causes stay separate and
cannot draft. All occurrences survive; conflicting/pending dispositions for that scope
withhold the draft. Distinct variants never merge into a baseline defect. A unique
linked issue makes an update draft; conflicting links require review. No remote issue
search or publication occurs. Draft Markdown contains escaped JSON with identities,
evidence, reviewers and proposed acceptance/regression detail for deliberate integration.

## Verification and remaining calibration

```powershell
python -m uv run --locked ruff check scripts/virtual_qa contract_tests/test_virtual_qa_grading.py
python -m uv run --locked pytest -q contract_tests/test_virtual_qa_contracts.py contract_tests/test_virtual_qa_grading.py
```

67 focused tests passed; the combined `pytest -q contract_tests` run passed 81 tests
and 28 subtests. Lint passed for `scripts/virtual_qa contract_tests`. Neither run made
database/network/browser/model calls. The CLI SR-26 example
also produced the expected unscored ledger and zero drafts in a new temporary directory.
See [calibration evidence and limitations](grading-calibration.md). Required final-head
CI is reported in the PR handoff; these local results do not establish CI success.
Central documentation/workflow status remains under integrator ownership.
