# Bounded virtual-user evaluation plan

Status: September 24, 2026 integration checkpoint. SR-27 records and SR-28/29/30
offline tooling are implemented and reviewed. SR-31 completed six detection sessions
and ended with a reviewed decision to narrow to on-demand use; ten ordinary-task slots
were unused. SR-30 now has actual paired-control records, but independent human
calibration remains open. No recurring automation is configured. See
[tooling integration](../integration-wave-six.md) and [pilot review](../integration-pilot-01.md).

## Purpose and limits

Grow a reusable case library and run history by observing agents complete realistic
tasks through the application. Assess application behavior, participant behavior and
grader behavior separately. Confirm findings before making bug tickets; turn confirmed
defects into deterministic regressions at the appropriate layer.

The [SR-26 rehearsal](SR-26.md) is the first pilot, not a duplicate implementation target.
Its report in [PR #48](https://github.com/QuinnPaterson96/ShovelReady/pull/48), pending
integration when this plan was written and now reviewed/merged, establishes no consequential app defect and
records participant omissions separately from UI hypotheses. Review that evidence
before finalizing rubrics. Do not silently promote its proposals to confirmed bugs.

Virtual-user runs establish neither human usability/customer value nor legal accuracy.
The public-case inventory remains provisional. Real zoning expectations require the
independent source/site review in SR-06; software fixtures can test uncertainty handling
without inventing accepted legal outcomes. This work supports SR-13 and does not replace
its accepted source-to-result criteria or SR-16's real customer pilot.

## Delivery sequence

| Ticket | Deliverable | Completion gate |
|---|---|---|
| [SR-27](SR-27.md) | Versioned case/run/finding records and evaluation protocol | Read/reconcile SR-26 evidence; no new source acceptance required |
| [SR-28](SR-28.md) | Five bounded scenarios and three paired defect controls | SR-27 contract merged |
| [SR-29](SR-29.md) | Local run preparation, seeded selection and isolated execution records | SR-27 contract merged; exercise with SR-28 fixtures at integration |
| [SR-30](SR-30.md) | Evidence-based grading, adjudication and draft issue output | SR-27 contract merged; calibrate with SR-28 controls at integration |
| [SR-31](SR-31.md) | Small browser pilot and evidence-based continue/change/stop decision | SR-26 report reviewed and SR-28/SR-29/SR-30 integrated |

SR-27 goes first. SR-28, SR-29 and SR-30 can then proceed in separate worktrees against
the agreed contract. Their coding can overlap, but completion requires combined checks
with actual fixtures. SR-31 follows integration. Do not launch all five as independent
implementation tasks. This is supporting QA work; keep the real-input and accepted-data
critical path visible rather than spending an integration wave on a large QA platform.

## Smallest implementation

- Versioned JSON records, Markdown guidance and ordinary Python modules; no database
  migration or production QA endpoint. Case definitions live in Git. Large run artifacts
  live in an explicitly selected local output directory; commit compact sanitized
  reports and only redistributable fixtures. Never commit secrets or restricted PDFs.
- Keep a fixed baseline plus seeded selection across named scenario categories. Record
  the chosen IDs; a repeatable draw does not make the model deterministic. Freeze
  app/data/fixture/rubric identities for a run and reserve a group for later fresh cases.
- Use fresh browser participants with no case rubric, source code, expected answer or
  inherited facilitator history. Browser-visible evidence is their evidence boundary.
  Disclose actual isolation limits; a hidden prompt is not an OS security boundary.
- Separate ordinary task completion from explicit bug detection. Clean controls and
  deliberate faults measure tester reliability. Faults are local synthetic variants,
  never changes to accepted sources, releases, the user's preview or shared database.
- File-based/manual participant dispatch is sufficient initially. Provide an explicit
  handoff and result-ingest path when no supported local dispatch interface is available;
  report that limit honestly. No scheduler, cloud service, paid API prerequisite or
  runtime agent feature is required.
- Run on demand around integration checkpoints. Add only offline contract/fixture/
  runner/scoring checks to ordinary CI. Agent-derived findings require reproduction;
  deterministic regressions can later become CI gates. Live runs are initially advisory.

## Pilot budget and decision

Start with five scenarios, two fresh task-completion attempts each. Add three paired
clean/fault examples in explicit detection mode: at most 16 participant sessions in
total, run sequentially. Cap each at ten minutes or 60 browser actions, whichever comes
first, and retain failures/timeouts. These are ceilings, not quotas. Stop for environment
ownership failures, missing evidence or unreliable grading; do not silently retry until
success. Use existing authorized execution facilities; record unavailable cost/model
metadata as unknown. New paid services require an explicit project and spending limit.

Report raw counts/denominators by mode, severity and case, plus review effort. Known-fault
detection uses only deliberately seeded, observable defects; unknown-defect recall is
not measurable. Report unsupported conclusions and critical omissions separately.
Repeated samples from a small designed corpus are not population accuracy estimates.

The decision after SR-31 is whether the runs yield reproducible, useful findings at an
acceptable review cost. Continue, narrow or stop based on that evidence. Scheduling,
automatic issue creation, model comparisons, dashboards and a dedicated results
database remain deferred until this pilot justifies them.

## Shared ownership

The initial experiment is complete after three clean/fault pairs. Its six attempts
detected three intentional stimuli; no new baseline defect was established. Keep
ordinary-task performance, critical omissions and human effort N/A where unmeasured.
The remaining ten slots do not authorize an automatic new experiment. Future runs
should answer a concrete changed-UI or workflow question with a fresh manifest and
appropriate review; no scheduling or automatic issue creation follows from this result.

The integrator owns central README, architecture, quality/backlog indexes and workflow
configuration. SR-27 owns common QA records. SR-28 owns fixtures and case notes; SR-29
owns run tooling; SR-30 owns grading; SR-31 owns its pilot report. Owners may read each
other's files, but shared edits need explicit coordination. Existing application/data
contracts and production behavior remain unchanged unless a separately justified fix
is reviewed. Follow AGENTS.md, personal Git identity and the PR handoff template.
