# SR-31 pilot: narrow to reviewed, on-demand calibration

Six fresh sequential browser participants completed the three clean/fault pairs.
Each authored fault was detected and reproduced after the blind attempt; no new
baseline-application defect was established and no issue draft was produced.
The recommendation is **narrow**, not scheduled or expanded execution: retain the
manual calibration workflow, review the recurring usability hypotheses, and do not
spend the remaining ten slots merely to repeat known synthetic assertions.

This is agent-reviewed software QA evidence. It establishes neither independent
human calibration, legal accuracy, accepted publication nor real customer value.
SR-30 #54 remains open; this report does not close broader SR-13/SR-16 criteria.

## Frozen scope and actual execution

[Manifest](manifest.json) and separately held [scoring inputs](scoring) were committed
at `f3aa21e` before dispatch. Critical policy is unknown: critical-omission metrics
are N/A, not zero. Case/rubric revisions remain 1; no case, recipe or answer was
retuned. Reserved group `reserved-future` has no authored members and was not selected.
These development controls and related task cases are not untouched holdouts.

Tooling initially came from merge `7325852` containing implementation main `787ab79`.
Documentation PR #62 became available after the first dispatch; normal merge `8f1c1fd`
included main `c928e89` without rewriting preparation history. The immutable
[addendum](manifest-addendum-01.json) records this timing. Tooling code and reviewed
case/recipe bytes did not change. [Results](results.json) retain each actual source
checkout, application commit, derived tree and build hashes. Every recipe retains
application baseline `303b40aeb9e69f476878959148ed299cad2a5e9b`; derived fault builds
are separately identified, never presented as that baseline.

Only the detection experiment executed: **6/16 slots used**, all six completed, no
failures, cancellations, timeouts or retries. The planned ordinary-task experiment
has **zero attempts**; its five scenarios and repeats, including VIC-080, were not
measured. Their metrics are N/A, not failures or implied successes. Expansion after
the first unit pair was limited to the remaining two control pairs because browser
evidence, cleanup and explicit grading were usable. All experiments share this budget.

| Attempt / original note | Case | Browser operations | Dispatch to owner stop (seconds) | Agent review minutes |
|---|---|---:|---:|---:|
| [01](participant-01.md) | unit-display-clean | 12 | 124.79 | 2.37 |
| [02](participant-02.md) | unit-display-fault | 9 | 103.83 | 1.88 |
| [03](participant-03.md) | evidence-access-clean | 10 | 114.13 | 1.73 |
| [04](participant-04.md) | evidence-access-fault | 13 | 136.71 | 1.50 |
| [05](participant-05.md) | affirmative-label-clean | 12 | 115.81 | 1.72 |
| [06](participant-06.md) | affirmative-label-fault | 9 | 101.79 | 1.55 |

The 65 operations include opens, reads, screenshots where used, scrolling and closure;
counts come from retained participant ledgers. Manual dispatch does not intercept
operations. Server-side dispatch-to-stop timestamps total 697.06 seconds and include
facilitator corroboration/stop overhead; they are upper bounds on active participant
time, not precise task-time measurements. All were below 600 seconds / 60 operations.
Recorded agent review intervals total **10.73 minutes**, including evidence inspection
and record/grade preparation. They exclude general setup/reporting and are not human
review effort. Human minutes, model/backend settings and cost telemetry remain unknown.

Participants received only neutral briefs, URLs and [browser constraints](browser-constraints.md),
using `fork_turns="none"` and new background IAB tabs. No rubric, control labels,
source code or facilitator history was supplied; no coaching or feedback rerun occurred.
Tools and filesystem remained broadly available: instruction/context separation is
not OS isolation. No new paid service, database, remote resource or user preview was used.

## Outcomes and adjudication

| Detection pair | Supported checks: clean / fault | Seeded detection | Clean false alarms | Unsupported factual claims: clean / fault |
|---|---|---|---|---|
| Unit display | 1/1 · 1/1 | 1/1 | 0/1 | 0/3 · 0/3 |
| Evidence access | 1/1 · 1/1 | 1/1 | 0/1 | 0/3 · 0/3 |
| Affirmative label | 1/1 · 1/1 | 1/1 | 0/1 | 0/4 · 0/3 |

Each denominator requires an explicitly reviewed, assessable control outcome; no
missing assessment was treated as clean success or seeded miss. There are 0/6
blocked/unassessable attempts, 0/6 environment/tool failures, and no unassessable
factual claims. Counts summarize this designed sample only. Unknown-defect recall,
population accuracy, ordinary task completion and human satisfaction are unmeasured.
Check severity is unknown because no critical policy was reviewed; critical omissions
are N/A for every case. All retained finding records have informational severity,
reflecting stimuli/hypotheses rather than established production impact.

Three intentional stimuli were reproduced on their exact derived builds: C displays
2 ft against unchanged 2 m evidence; A lacks its evidence disclosure; E says Candidate
above an unresolved alternative. The existing grader represents these as confirmed
`app_defect` records **only within fault-variant scope** to count seed matches. Its
variant allegation precision is 1/1 for each seed, not baseline bug-finding precision.
Baseline confirmed defects: **0**; baseline resolved bug allegations: **0**, so baseline
precision is N/A. Acceptance/regression fields are deliberately unavailable/empty for
stimuli; they generate **zero drafts**, not tickets to fix intentionally broken builds.

The other four finding occurrences are two deduplicated usability hypotheses:

- **H1, source opening:** all three clean participants accurately reported that the
  retained source path is plain text without an open/download control, while reading
  the inline disclosure. This is acknowledged in SR-28's control design. The reports
  did not claim the file was missing or that a required feature was broken; therefore
  these are not rejected bug allegations or clean false alarms. Review notes
  [01](review-01.md), [03](review-03.md) and [05](review-05.md) preserve this semantic
  judgment and its limitation: whether full-source access improves human work is untested.
- **H2, missing-facts wording:** participant 05 suggested possible confusion between
  “Missing facts: None recorded” and absent Schedule X, but explicitly declined to call
  them contradictory. Source-reference and site-fact categories differ. No human
  confusion or UI causation was observed; retain the hypothesis without a patch.

The facilitator, an agent, reviewed original notes and independently reopened each
rendered variant after the blind attempt. [02](review-02.md), [04](review-04.md) and
[06](review-06.md) record seed reproduction. “Independently reopened” does not mean
independent human review. There was no disagreement on the seed mappings. The
limitation-versus-bug classification in H1 needs human calibration; model agreement
cannot certify it. Original assessments/findings remain revision 1, with no rewrites.

## Evidence, cleanup and verification

Detailed immutable cases, prepared/final runs, prompts, exact notes, assessments,
findings, policies, execution/build receipts and individual/combined grades remain at
`C:/Temp/sr31-pilot01-5b2047a68603`; [evidence index](evidence-index.json) records file
hashes. Original participant ledgers name precise tool-call evidence references.
Screenshots from attempts 01–05 remain in participant tool history and were not
independently audited or portably exported. Attempt 06 used AX evidence only.
Facilitator rendered-UI corroboration is separate evidence, not a substitute claim
that those participant images were inspected. Portable text notes/reviews are here.

All six owner processes reported `cleanup_ok=true`, no errors and `scratch_removed=true`.
The six exact marked scratch children are absent; output evidence was preserved.
No listener remained on ports 18231–18236. All participant and facilitator tabs were
closed. The unused task plan has no lease/attempt and no environment. No shared/default
database or existing process was adopted or stopped.

Verified from this worktree with locked Python 3.12 dependencies:

- Parsed six cases, six runs, seven findings and six attributed assessments; validated
  shared links and checked all **34 local run-reference hashes** against actual files.
- Replayed all six through the existing grading CLI with their pre-dispatch policies;
  combined output has six grades and zero drafts. Exact arguments are retained in
  `replay-arguments.json` beneath the output root. No live grading model was used.
- Reviewed document links and `git diff --check`. No application interface,
  configuration, dependency or migration changed. Full app/database tests were not
  rerun for this documentation-only report; earlier integration evidence is separately
  recorded in [wave six](../../../integration-wave-six.md). Final-head CI is reported
  in the PR handoff, separately from these local checks.

## Recommendation and remaining work

**Narrow:** this sample shows the workflow can detect three obvious authored faults
and preserve useful cautious observations, at measurable agent review cost. It does
not show incremental baseline-defect discovery or justify scheduled agents, dashboards,
automatic tickets or using all 16 slots. Ordinary task repeats would not resolve the
present semantic/human evidence gap, so this pilot ends after the three pairs.

The next two proposed actions are limited to evidence this run actually supplied:
have a person adjudicate H1's limitation-versus-bug distinction on the retained notes;
then test H1/H2's usefulness with real users before choosing UI changes. Neither action
was performed here. Retain on-demand controls for relevant UI changes; ordinary task
coverage and the remaining ten slots are unused, not silently carried into another
experiment. Any continuation must account for the same pilot budget.

Implemented: frozen manifest, actual participant evidence, attributed calibration and
this report. Verified: browser-observable stimuli, record replay and owned cleanup.
Proposed: narrow on-demand use and human hypothesis review. Still unestablished:
independent human calibration, ordinary-task reliability, real zoning/source review,
accepted publication and real customer validation. No parent objective is closed.
