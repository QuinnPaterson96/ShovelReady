# Virtual-user QA record protocol — v1

Implemented for SR-27: ordinary Pydantic file contracts, cross-record validation and
one retrospective SR-26 example. No participant dispatch, selection runner, grader,
issue creation or application runtime behavior is implemented here. The coordinator
owns central status and workflow changes; SR-28/29/30 own cases, execution and grading.

## Shared interface

Import from `scripts.virtual_qa.contracts`:

- `CaseDefinition`: `schema_version="virtual-qa/v1"`, `record_type="case"`; stable
  `case_id`, immutable `revision`, category, evidence status, fixture/source references,
  unknowns, supported modes, group/split, `participant_brief` and `facilitator: Rubric`.
- `RunRecord`: same version, `record_type="run"`; unique `run_id`, attempt/retry link,
  application/frontend commits, selected `cases: tuple[CasePin, ...]`, data identity,
  fixed/seeded selection, mode, prompt reference, settings, isolation, timing, budget,
  completion status, note and evidence. Selected case IDs are the ordered pin list;
  fixture identities are in the content-pinned case, not a second mutable list.
- `Finding`: same version, `record_type="finding"`; immutable ID/revision, optional
  superseded revision, affected run/case/check, category, claim, both evidence directions,
  severity, reproduction evidence, adjudication and optional issue link.
- `Metadata[T]`: **both** `value` and `unknown_reason` required. Unknown is
  `{"value": null, "unknown_reason": "Not recorded in the source report."}`.
  Known values have a null reason. Never use zero, an empty string or guessed defaults
  for missing metadata. Dates include timezone; commit values are full lowercase SHAs.
- `Reference(uri, revision: Metadata[str], locator)`: retained file/URL and precise
  section/fragment. References are opaque text; validation neither opens links nor
  evaluates expressions. Restrict paths/URLs separately in any future reader.
- `CasePin.from_case(case)` and `case_digest(case)` cover all case content using
  SHA-256 of sorted, compact UTF-8 JSON from `model_dump(mode="json")`.
- `validate_links(cases, runs, findings) -> None`: closed-set checks for pins, modes,
  unique identities, referenced checks and consecutive retry ancestry. Supply every
  retry ancestor. Validation raises `ValueError`; model parsing raises Pydantic
  `ValidationError`. Neither function performs I/O or scoring.

Use `Model.model_validate_json(text)`, `record.model_dump_json(indent=2)` and
`Model.model_json_schema()`. Required fields, unknown versions and extra fields fail
closed. JSON arrays become immutable tuples; model attributes are frozen. Do not use
`model_construct` or unchecked `model_copy(update=...)` for untrusted records.
Reparse any modified wire payload. Immutability in memory is not filesystem access
control, evidence authentication or proof of independent review.

Store one typed record per JSON file; the compact example groups `cases`, `runs` and
`findings` arrays only for convenient demonstration. That envelope is not an additional
wire contract. Put large run artifacts in an explicitly chosen local output directory;
commit only compact sanitized reports and redistributable references, never secrets,
restricted source PDFs or local database configuration.

## Expectations and evidence boundaries

`Expectation.kind` distinguishes `observed_ui_fact`, `authored_software_expectation`
and `legal_expectation`. A UI fact can describe displayed unreviewed attributes without
making them land-use truth. Authored expectations express intended software behavior.
Legal expectations require independently reviewed sources/site facts before scoring;
neither an observational nor a reviewed case label supplies that review automatically.

Every scored check needs `ObservableBasis` of `browser_observation` or
`task_instruction`, with a description and evidence references. Review status,
reviewer/date/rationale and disagreements stay attached. Scored disputed expectations
are rejected. Unreviewed legal expectations can be retained **unscored**, with explicit
unknowns. Structural acceptance cannot verify a citation, reviewer independence or
legal correctness; a second model's agreement supplies none of those guarantees.

Keep participant brief and prompt separate from the facilitator rubric and
`SeededFault(pair_id, variant, description)`. Deliver only the brief, permitted URL,
browser instructions and budget. Do not send the full case JSON or a filename that
exposes hidden fault metadata. Withhold expected answers, fixture sources, source code
and facilitator history. Fresh participants use browser-visible evidence only, no
coaching; record any actual isolation limits. Conversation separation is not an OS
filesystem sandbox. A hidden checklist is not a basis to penalize a participant for
failing to know case-specific facts absent visible evidence or explicit instructions.

## Freeze and retain

Before dispatch, save the case/rubric, prompt, actual app/frontend commits and data
identity (`observation`, `synthetic_fixture` or `accepted_release`), then generate the
case pin and record `rubric_frozen_at`. For a new completed/timed-out participant run,
freeze/start/end timestamps are required and ordered. A prepared run can lack start/end;
a blocked run can lack start when dispatch never happened. Preserve unknown reasons.
The run's explicit isolation statement records observed boundaries, not aspirations.

Use new files for final execution records and retain the prepared snapshot. A frozen
case edited under the same revision will fail pin comparison. Corrections require a
new case/rubric revision and a new pin. Keep original grades and finding revisions;
never silently replace a prior result. `Finding.supersedes` names the previous revision
of the same finding ID; file retention and that revision chain are the future grader's
responsibility (the link validator does not audit adjudication history).

Each retry has a fresh `run_id`, `retry_of` and consecutive attempt number. Retain
failure, timeout and blocked attempts. Retry links preserve exact case pins, mode and
data identity; changed cases/data form a new experiment. Record changed app/model/tool
settings explicitly; a repeatable draw does not make model behavior deterministic.
Report-derived examples require a source report and may preserve unavailable historical
timestamps. They must never be counted as newly dispatched participants or frozen
prospective evaluations merely because they parse.

## Modes, samples and adjudication

Ordinary `task_completion` asks for a useful task result; `defect_detection` explicitly
asks for faults. Report them separately. Maintain a fixed baseline and seeded selection
across named categories; record the exact selected pins and seed. Assign related cases
and clean/fault pairs to a group, keep groups in one split and reserve holdout groups
from tuning. The schema records assignments; SR-28/29 must enforce selection and split
policy. Deliberate faults run only in local synthetic variants, never accepted sources,
shared databases or the user's preview. The protocol cannot enforce environment ownership.

Findings separate app defects, agent omissions/errors, false alarms, source/data gaps,
environment/tool failures and usability hypotheses. Missing checks or disputed evidence
remain unresolved/disputed rather than counted as confirmed bugs. Store supporting and
contradicting references, reproduction outcome and adjudicator/date/rationale. Confirmed
app defects require reproduction evidence; all confirmed/rejected adjudications require
an identified reviewer and date. Those fields are auditable assertions, not proof that
the review happened. The linked issue field is traceability, not permission to create one.

Before escalating an app defect: independently reproduce at pinned app/data identity,
check expected behavior against its visible/instruction basis, retain contrary evidence,
resolve agent/tool/source explanations, and record a review rationale. Draft a ticket
only for the demonstrated behavior, with a suitable deterministic regression. Human
usability hypotheses need human study; legal gaps need independent source/site review.
Preserve originals when correcting a grader, and measure grading errors separately.

Initial SR-31 ceiling remains five scenarios with two task attempts each and three
clean/fault detection pairs (16 sessions total), sequential, at most ten minutes or
60 browser actions each. These are ceilings, not automatic retries or quotas. Stop on
ownership failures or missing evidence. Report raw counts/denominators by mode, case
and severity and review effort. Unknown-defect recall and population accuracy are not
measurable from this designed sample. No new paid service is required or authorized.

## SR-26 example and verification

[The report-derived JSON](sr26-report-example.json) pins PR #48 at
`eb9ba0212e170dd15ad85fa58176ca3010b03c05`, read without changing that branch. It records
the actual reported omission of explicit existing principal-building use/count and
frontage requests. It establishes no app defect. The one-item rubric subset was authored
retrospectively, is unscored and cannot replace the original seven-item rubric or grade.
The original exact brief and note are retained as pinned references; the sample brief
is explicitly a summary that was never dispatched. Model, costs and precise historical
event times remain null with reasons; no independent legal review is asserted.

Run from the repository root, using existing locked dependencies:

```powershell
python -m uv run --locked ruff check scripts/virtual_qa contract_tests/test_virtual_qa_contracts.py
python -m uv run --locked python -m pytest -q contract_tests/test_virtual_qa_contracts.py
```

These checks exercise wire roundtrips, real unknown-state handling, unreviewed/disputed
scoring rejection, case/rubric/fixture drift, retry and finding links, timing and
adjudication guards, and inert embedded text. They import no application or database
fixtures and make no network/model/browser calls. Existing backend CI already discovers
`contract_tests` and lints `scripts`; no workflow edit is required. Runner, grader,
prospective participant evidence, accepted publication and real-user validation remain
separate future work.
