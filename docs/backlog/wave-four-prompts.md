# Wave four: development workflow and public reference cases

September 24, 2026, after merged implementation PRs #31-#33 and integration note #34.
This wave implements three small process improvements and investigates evidence for
the next real-case integration. It does not launch accepted screening or deployment.

## Parallel work and ownership

| Task | Specification | Owned changes | Dependencies |
|---|---|---|---|
| Native lifecycle CI | [SR-20](SR-20.md), [#35](https://github.com/QuinnPaterson96/ShovelReady/issues/35) | CI workflow, focused lifecycle tests/skip guard, `docs/ci-local-database.md` | Merged helper/API only |
| Reproducible local demo | [SR-21](SR-21.md), [#36](https://github.com/QuinnPaterson96/ShovelReady/issues/36) | Demo launcher, app identity/API/UI, focused tests, local-development handoff | Merged helper/API only |
| Concise PR handoffs | [SR-22](SR-22.md), [#37](https://github.com/QuinnPaterson96/ShovelReady/issues/37) | PR template, AGENTS handoff rule, quality integration checklist | Independent |
| Public case research | [SR-23](SR-23.md), [#38](https://github.com/QuinnPaterson96/ShovelReady/issues/38) | `docs/research/public-cases/`, linked report/manifest/verification | Independent research; reviewed acceptance remains later |

All four may start together from the merged planning checkpoint. Each uses its own
managed worktree; do not create a second worktree within the task or edit the original
dirty checkout. The task's default model is used. Shared dependency/lockfile changes
need explicit coordination; no planned task requires them. Central README, architecture
and backlog reconciliation belongs to integration. Each task may update its own ticket
handoff when implementation is complete but must not close broader parent criteria.

## Shared implementation prompt

Read AGENTS.md, README.md, docs/architecture.md, docs/quality.md, this handoff and your
specific ticket/live issue. Confirm the checkout includes PRs #31-#34 and this planning
handoff before editing. Use the assigned managed worktree and the ticket's `codex/`
branch name after inspecting status. Preserve unrelated work and do not restart existing
user previews or operate on their persistent database during tests.

Verify repository-local author/committer and personal Git/GitHub authentication. The
personal CLI config is `C:/Users/quinn/.config/gh-quinnpaterson96`; verify its account,
not just its path. Git credentials may differ. Never use work credentials or Styx.

Implement the bounded ticket, run meaningful checks against disposable resources only,
and document actual evidence and remaining limitations. Commit explicit paths, push and
open a PR against main, then stop for integration review. Do not merge, force-push,
change branch protection or launch more tasks. No new paid services or live extraction
runs are authorized by these implementation tasks. Research browsing is explicitly in
scope for SR-23; outreach, paid access and corpus acceptance are not.

## Research prompt emphasis

Find 10-20 distinct public municipal development/application cases useful for testing
ShovelReady. Start with City of Victoria garden suites/accessory dwellings, inspect
official primary records, and keep secondary municipalities separately labelled if
needed. Group plans/reports/decisions for the same application into one case, retaining
revisions and conditions. Distinguish approved, refused, pending, recommended and unknown
outcomes with direct evidence. Public approval of a different or historical building is
not current fit for the chosen prefab model.

Return a versioned machine-readable inventory and source-linked report, classify exact
test uses and missing facts, and shortlist 3-5 cases for independent review plus one
first integration candidate. Treat retention and redistribution separately from public
access. Keep annotations provisional and existing holdouts protected. If 10-20 useful
cases are not available, report a documented shortfall instead of filling the inventory
with unsupported or duplicate entries. Follow all details in SR-23.

## Integration sequence

Review each PR on its merits. SR-22 can merge first to establish the template; SR-20 and
SR-21 do not need to wait for it to implement. Combine and verify CI/demo changes before
demonstrating the merged app. Promote a new required check only after successful actual
CI evidence. Review research claims and artifact rights separately; merging its report
does not accept reference outcomes. Use the strongest source-supported case to scope
the later SR-06/SR-10/SR-11/SR-12/SR-13 integration.
