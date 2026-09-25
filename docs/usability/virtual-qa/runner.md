# Local manual virtual-user runner — SR-29

This is on-demand QA tooling, separate from the application. It uses the merged
[SR-27 records](protocol.md) and SR-28 finite materialization recipes. It never
dispatches a participant, calls a model, schedules work or creates issues. Software
checks do not establish legal accuracy, accepted publication or human usability.

## Plan and prepare

Use Python 3.12, the locked repository dependencies, Node 22.14+ (22.x), Git and npm.
Start from a clean committed source checkout containing the recipe's baseline commit.
All example paths below are explicit **new** local locations; do not reuse a preview,
shared/default database or another experiment. The output and scratch roots must be
disjoint and outside Git checkouts. Output contains private facilitator information;
give the participant only the contents of `participant.md`.

From the repository root:

```powershell
python -m uv run --locked python -m scripts.virtual_qa.runner plan --fixtures '<SR-28 fixture root>' --output 'C:/Temp/sr29-output-unique' --mode task_completion --ids synthetic-a-candidate --dry-run
# Repeat without --dry-run to freeze selection, complete case/rubric, recipe and assets.
python -m uv run --locked python -m scripts.virtual_qa.runner plan --fixtures '<SR-28 fixture root>' --output 'C:/Temp/sr29-output-unique' --mode task_completion --ids synthetic-a-candidate
python -m uv run --locked python -m scripts.virtual_qa.runner prepare --output 'C:/Temp/sr29-output-unique' --source '<clean ShovelReady checkout>' --scratch 'C:/Temp/sr29-scratch-unique' --index 0 --port 18081
```

Preparation stays in the foreground, prints an opaque attempt ID and a ready URL,
and owns the child HTTP process. Use `--smoke` for preparation, identity/frontend HTTP
checks and immediate cleanup **without dispatch**. An observation recipe additionally
requires `--postgres-bin 'C:/Program Files/PostgreSQL/17/bin' --database-port 55483`.
It creates a fresh owned cluster, migrates/seeds using the pinned checkout's helper,
verifies the exact observation revision, and stops that cluster during cleanup.
Synthetic recipes need no DB and do not inherit app/database configuration.

For sampling, replace `--ids ...` with `--seed 123 --count 3`; optional `--categories`
and `--splits baseline development` restrict the eligible pool. Fixed IDs are also
filtered. Related groups and clean/fault pairs must not cross splits. Holdout selection
is refused in this initial pilot. Stable case-ID sorting precedes a local Python RNG
draw; the plan records exact selected pins, filters, seed, algorithm and Python version.
An insufficient pool fails rather than expanding scope. Reproduce from the frozen
selection, not a claim that future model output or Python algorithms are deterministic.

## Manual participant handoff and stop

In a second terminal, after the environment reports ready:

```powershell
python -m uv run --locked python -m scripts.virtual_qa.runner dispatch --output 'C:/Temp/sr29-output-unique' --run-id '<opaque ID>'
# Manually start a fresh participant context with participant.md only.
# When the session ends, request cleanup in the owning preparation process:
python -m uv run --locked python -m scripts.virtual_qa.runner stop --output 'C:/Temp/sr29-output-unique' --run-id '<opaque ID>' --reason completed
```

`dispatch` records actual facilitator handoff time; it does not launch anything.
Reasons are `completed`, `timeout`, `cancelled` or `blocked`. The owner process watches
for stop requests and enforces a 600-second serving deadline after dispatch. It cannot
stop the participant's separate context or intercept browser actions. The facilitator
must stop the participant at 600 seconds or 60 actions, whichever comes first, and
record counts/evidence. Count individual browser operations, including reads and
screenshots, even when batched. Unknown action counts prevent a completed classification.
Hitting/exceeding either ceiling records timeout. Missing counts remain null, never zero.

One active attempt per output experiment is enforced with an exclusive lease; at most
16 attempts can be reserved, including failures/cancellations. Do not run concurrent
experiments to evade the pilot-wide ceiling: cross-directory coordination remains a
facilitator responsibility. There is no automatic retry. `prepare --retry-of <ID>`
requires a finalized parent with identical case/mode/data, increments the attempt and
consumes another slot. Case/data changes require a separate experiment and pilot budget
review. Two ordinary repeats may instead be separately reserved first attempts.

Fresh context and browser-only instructions are not an OS access-control boundary.
Record actual tool access and any context leakage. Do not copy this task's history,
case files, recipes, rubric or control labels to participants. The server exposes only
the built app routes/assets; it does not serve the output or source directories.

## Result ingest and evidence interface

Wait for the owning terminal to report cleanup. Save a manual receipt JSON with these
fields (this is a runner adapter receipt, not a replacement RunRecord):

```json
{
  "outcome": "completed",
  "note_path": "C:/Temp/actual-participant-note.txt",
  "browser_actions": {"value": 12, "unknown_reason": null},
  "model": {"value": null, "unknown_reason": "Unavailable in participant tool history"},
  "model_settings": {"value": null, "unknown_reason": "Unavailable"},
  "tool_settings": {"value": "Describe actual browser tools", "unknown_reason": null},
  "cost": {"value": null, "unknown_reason": "No cost telemetry"},
  "isolation": "Record actual fresh-context setup and tool access limits here.",
  "evidence": [{
    "uri": "tool-history:<actual task identifier>",
    "revision": {"value": null, "unknown_reason": "No portable export"},
    "locator": "Actual action/screenshot identifier and timestamp"
  }],
  "limitations": "No portable screenshot bundle; state other actual limitations."
}
```

The values above illustrate the shape, not participant evidence. Use null `note_path`
when a blocked/cancelled attempt produced no note. Save screenshots only through a
supported export facility, retain them in the experiment output, and use exact retained
file/evidence references; otherwise preserve precise tool-history references and state
that no portable screenshot bundle exists. The runner does not fetch opaque evidence
URIs or manufacture screenshots. Evidence accessibility remains an explicit SR-30 review.

```powershell
python -m uv run --locked python -m scripts.virtual_qa.runner finalize --output 'C:/Temp/sr29-output-unique' --run-id '<opaque ID>' --result 'C:/Temp/manual-result.json'
```

The runner copies the actual note byte-for-byte, preserves the manual receipt and
creates a validated SR-27 `run.json`. Preparation/undispatched smoke checks cannot be
finalized as completed sessions. Cancellation maps to SR-27 `blocked`, retaining the
specific outcome in the receipt/lifecycle. Timeouts and environment failures override
optimistic submitted completion. Unknown model/settings/cost remain unknown. Findings
are not authored here; unsolicited findings must not change rubrics or denominators.

Per-attempt files under `attempts/<opaque ID>/`:

| File | Meaning |
|---|---|
| `case.json`, `run.prepared.json` | Frozen SR-27 case and prepared run, never graded as completed |
| `participant.md` | Only brief, URL, browser constraints and stop instructions |
| `reservation.json`, `dispatch.json`, `stop.json` | Budget reservation, optional actual handoff, requested stop |
| `execution.json` | Private baseline/derived commit/tree, recipe, tracked/build hashes, resource locations |
| `lifecycle.json`, optional `failure.json` | Actual stop reason, cleanup result and redacted failure class |
| `participant-note.txt`, `result.json`, `run.json` | Exact note, actual adapter receipt, final SR-27 run |

Final run evidence includes retained lifecycle/execution references for SR-30. Local
file references include byte hashes; opaque tool-history references retain their actual
locator and unknown revision reason. Supply all retry ancestors to `validate_links`.
Records are exclusively created; accidental overwrite is refused. A partially written
finalization is retained for diagnosis rather than silently overwritten or retried.

## Materialization, ownership and recovery

SR-28 recipe shape: `schema_version="virtual-qa-materialization/v1"`, `baseline_commit`,
`case_id`, `case_revision`, SR-27 `data`, `entry_path="/"`, and `replacements` entries
with `path`, `asset`, `before_sha256`, `after_sha256`. Asset paths are relative to the
fixture root beneath `assets/`. V1 permits one replacement of
`frontend/src/preview/InvestigationPreview.tsx`, for synthetic cases only; clean recipes
have none. No generic patch interpreter, expressions or arbitrary recipe commands.

Materialization clones locally without hardlinks and with `core.autocrlf=false` to use
Git blob bytes, checks pre/post hashes and all tracked bytes, and commits the derived
change using the required personal identity. Baseline source bytes remain unchanged.
The actual derived commit is embedded in the frontend/API; baseline, derived tree and
build hashes remain separate in the private receipt. The clean-tree check is retained
before/after builds. Fixture/source byte pins are verified; unsupported recipes stop.
Existing database/demo helpers are unchanged. Dependency installation/build scripts
come from the explicitly selected trusted baseline, not from case text.

The foreground owner retains a process handle, never adopts a PID/port, and stops only
its own HTTP child. DB shutdown rechecks helper ownership and running-server identity.
After verified shutdown it removes only its exact marked scratch child, preserving
output. Preparation failures retain scratch for diagnosis. Cleanup failures keep the
active lease and prevent another attempt/finalization. A killed owner cannot execute
cleanup: preserve its records, inspect exact owned resources and recover manually;
do not delete a lease/lock, kill by port/name, adopt a process or erase scratch blindly.
Markers protect against mistakes, not a malicious local user rewriting files.

## Verification

```powershell
python -m uv run --locked ruff check scripts/virtual_qa contract_tests/test_virtual_qa_runner.py
python -m uv run --locked pytest -q contract_tests/test_virtual_qa_runner.py contract_tests/test_virtual_qa_contracts.py
```

Offline tests use temporary files/local synthetic Git repositories, never database or
model defaults. Actual preparation/cleanup evidence and any remaining integration gaps
are recorded in the PR handoff. No participant pilot or legal/user validation is implied.
