# PR handoff rehearsals

Recorded September 24, 2026 for [SR-22](backlog/SR-22.md). These are retrospective
template rehearsals using PR bodies, changed files, merge parents and pinned repository
documentation. No historical checks were rerun and no independent reader test was
performed. Reproducibility below is an assessment of the recorded instructions, not
new evidence that the commands pass. Other contributors' PRs were not edited.

## Implementation: PR #31

**Problem and result:** [PR #31](https://github.com/QuinnPaterson96/ShovelReady/pull/31)
adds direct scalar evaluation and coherent alternative aggregation where only contracts
and preview assertions existed. It supplies partial technical preparation for
[SR-10 / #10](https://github.com/QuinnPaterson96/ShovelReady/issues/10); the real pilot
checks and accepted screening remain open.

**Provenance and impact:** Target `main`; recorded start `2d46a4d`; final PR head
`ad370e34c901351c8c24c9393aafc05266a817b0`; merge `a28b720b`. The merge's first
parent matches the recorded start. New `app.evaluation.evaluate(payload)` and
`sr-10.v1` request/report types are draft-only. Shared readers, HTTP, configuration
and migrations are unchanged. See the
[pinned handoff](https://github.com/QuinnPaterson96/ShovelReady/blob/ad370e34c901351c8c24c9393aafc05266a817b0/docs/evaluation.md).

**Verification and demo:** The pinned handoff records these repository-root commands:

```powershell
python -m uv run --locked ruff check app tests contract_tests migrations scripts docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked pytest tests/test_evaluation.py -q
```

Recorded outcomes: lint passed; 195 tests plus 28 contract subtests passed in a newly
created guarded PostgreSQL 17 cluster, with no skips and clean shutdown. The 76 focused
evaluator tests passed again after a final diagnostic-label refinement. The full run's
exact tested commit is not recorded, so it is not presented as a final-head rerun.
The existing Starlette/httpx deprecation warning remained. Frontend, deployment, live
extraction and cloud verification were not claimed for this evaluator-only change.

The recorded repository-root demo prints a synthetic draft evaluation report:

```powershell
python -m uv run --locked python -c "from tests.evaluation_fixtures import request; from app.evaluation import evaluate; print(evaluate(request()).model_dump_json(indent=2))"
```

Use the pinned head and its locked Python environment (Python 3.12/uv setup in its
README); the full database command also needs PostgreSQL binaries at the supplied
path and must provision its own disposable cluster. The demo needs no accepted dataset.
The [integration review](integration-review-2026-09-24.md) separately records required
CI passing on the implementation PRs' final heads; this rehearsal did not inspect CI
logs or independently verify that historical claim.

**Remaining work / reader assessment:** Another reader has concrete commands and
setup to attempt the checks and synthetic demo, but cannot attribute the full local
run to an exact revision from this handoff alone. Independent source/applicability
review, controlled design/site/placement revisions, reviewed bindings, real expected
outcomes and separate publication/screening integration remain required. Synthetic
software results establish neither legal accuracy nor a real-user study.

## Documentation only: PR #39

**Problem and result:** [PR #39](https://github.com/QuinnPaterson96/ShovelReady/pull/39)
turns the next workflow and research proposals into specifications for issues #35-#38,
assigns ownership and reconciles the planning backlog. It implements none of those
four work packages and closes none of their criteria.

**Provenance and impact:** Target `main`; merge-parent base `e336ec9b`; final PR head
`8e39480676e3acd54eeae5114acff67e46ee5aa5`; merge `df1e9ab`. This base is derived
from Git merge parents, not a claim about the author's original checkout. Changed
files are README and backlog/planning documents. Runtime interfaces/config/migrations:
N/A, documentation only.

**Verification and demo:** The body reports UTF-8, local link-target and explicit staged
file checks, plus `git diff --check`. It does not record the first three commands,
their detailed results, or the exact revision/index state checked. A clean checkout
running `git diff --check` now cannot reproduce the original staged/working-tree review.
It says required CI runs before merging, but gives no run links or final-head results;
merge status alone is not CI evidence. Runtime tests: no local run recorded and none
needed for the documentation-only diff. Demo: N/A, no runnable behavior changed.

**Remaining work / reader assessment:** Another reader can inspect the pinned
[planning handoff](https://github.com/QuinnPaterson96/ShovelReady/blob/8e39480676e3acd54eeae5114acff67e46ee5aa5/docs/backlog/wave-four-prompts.md),
but the recorded evidence is insufficient to reproduce all claimed documentation
checks exactly. A new handoff should supply the commands and compared revisions or
link a durable check record. All four implementations and later real-case review remain
separate work; planning is not implementation or acceptance of a reference corpus.
