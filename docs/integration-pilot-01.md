# Review of the first virtual-user calibration

September 24, 2026 (America/Vancouver). [PR #63](https://github.com/QuinnPaterson96/ShovelReady/pull/63)
was reviewed at `acface86e05c6b9fb5158a72f11644122dafd69c` and merged at
`7d8cb4bc8f0bf7029127d7802bf46a4bec3ffbd4`. It changes only the pilot evidence packet
and preparation note. The original [report](usability/virtual-qa/pilot-01/findings.md),
[manifest](usability/virtual-qa/pilot-01/manifest.json), addendum, participant notes and
judgments remain intact. No blocking issue was found in the report review.

## What the evidence supports

| Measure | Reviewed result | Limit |
|---|---|---|
| Actual sessions | Six sequential detection sessions | No ordinary-task attempt; ten planned slots unused |
| Seeded faults | 3/3 detected and reproduced on their derived builds | Obvious authored stimuli; not general defect recall |
| Clean-control false alarms | 0/3 under recorded agent judgments | Accurate source-opening limitations were classified as hypotheses, not false bug allegations |
| Newly confirmed baseline defects / drafts | 0 / 0 | Does not establish a defect-free app |
| Browser operations | 65 participant-reported operations | Manual counts, not an enforced browser interceptor |
| Dispatch to owner stop | 697.06 seconds across six sessions | Includes facilitator overhead; not active task time |
| Review effort | 10.73 agent minutes | Includes record work; human time and total operating cost unknown |

All six runs completed within their declared limits. No retry, failure or timeout was
recorded. Critical policy was not established, so critical-omission metrics remain N/A.
The ten unused slots do not count as success or failure. Ordinary-task performance,
human usability, legal accuracy and accepted-data screening remain unmeasured.

H1 is a real observed interface limitation: the synthetic preview exposes the source
excerpt and a plain-text retained-file path, without a full-source open/download control.
All three clean participants reported it cautiously. The hypothesis is whether changing
that interface improves real human work; no broken source-opening requirement was
established for these controls. H2 is a possible wording ambiguity between missing site
facts and an unresolved regulatory reference, raised by one participant without claiming
a contradiction. Neither observation justifies a confirmed-bug ticket from this pilot.
The limitation-versus-bug classification still needs independent human calibration.

## Coordinator verification

Review ran from `C:/Users/quinn/src/ShovelReady-review-20260924` using locked Python
dependencies. It did not start another participant, database or browser environment.

- Verified all **146 indexed retained artifacts** against byte count and SHA-256.
- Parsed six cases, six final runs, seven findings, six assessments and matching frozen
  scoring records. Shared link validation passed; case pins match the merged case pack.
- Verified **34 local run references** against actual bytes. References to the author's
  pilot Markdown files also match the indexed `portable-text` copies. Some original
  references name that worktree rather than the output root; they were checked explicitly.
- Replayed `grade()` from those inputs and obtained exact equality with the saved combined
  grade JSON. Every metric copied into `results.json` agrees with the replay. Zero drafts.
- Checked sequential timestamps, receipt action counts, build identities, absent scratch
  children, six successful cleanup receipts, no active leases, zero ordinary-task
  reservations and no listeners on ports 18231–18236.
- Confirmed the manifest addendum changes no QA tooling or case/recipe bytes across its
  named commits; JSON parsing, local Markdown links and Git diff whitespace checks passed.

The local audit script/result are `C:/Temp/shovelready-pilot-integration-audit.py` and
`C:/Temp/shovelready-pilot-integration-audit.json`. Original evidence and exact grader CLI
arguments remain under `C:/Temp/sr31-pilot01-5b2047a68603`; the committed
[evidence index](usability/virtual-qa/pilot-01/evidence-index.json) identifies those files.
Preserve that retained output for human review. A fresh Git clone alone does not contain
the full replay bundle, and participant screenshots remain tool-history references.
The coordinator did not independently audit those images or repeat the facilitator's
browser reproductions. This is an additional agent review, not independent human review.

All four required CI checks plus GitGuardian passed on the reviewed head:
[run 36083366643](https://github.com/QuinnPaterson96/ShovelReady/actions/runs/36083366643).
The full app/database suite was not repeated locally for this documentation-only change;
the earlier 362-test integration result remains separately attributed in
[wave six](integration-wave-six.md). This integration's documentation reconciliation
has its own required CI before merge. Personal QuinnPaterson96 identity was used.

## Accepted disposition and MVP implications

Close **SR-31 / #55** as a completed bounded experiment with a **narrow** decision.
Retain on-demand controls for relevant UI changes; no scheduler, automatic ticketing,
QA database or further participant batch follows from this result. The original session
ceiling was not a quota, and this decision does not establish ordinary-task reliability.

Keep **SR-30 / #54** open specifically for independent human calibration of the authored
answer set and actual participant judgments, including H1. Preserve disagreements as
new attributed assessment/finding revisions rather than editing the original report.
H1/H2 are recorded in **SR-12 / #12** for evidence-workflow review, not duplicated as
confirmed bugs. SR-13's accepted source-to-result criteria remain open.

The next implementation priority remains a reviewed real design/site/rule subset and
the accepted ingestion-to-screening path. Test source access and missing-information
wording in that meaningful workflow before choosing UI changes. This pilot validates
the mechanics of an advisory QA workflow; it does not resolve the MVP's data, legal
interpretation or customer-value questions.
