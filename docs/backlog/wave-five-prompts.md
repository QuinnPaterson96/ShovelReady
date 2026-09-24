# Wave five: inspectable public evidence and a virtual-user rehearsal

September 24, 2026, after PRs #40-#43. Read [integration evidence](../integration-wave-four.md)
and the individual specifications. All three tasks start from this merged planning
checkpoint in separate managed worktrees and return PRs for review.

| Task | Specification | Ownership | Start dependency |
|---|---|---|---|
| Public-case investigation view | [SR-24](SR-24.md), [#44](https://github.com/QuinnPaterson96/ShovelReady/issues/44) | Focused API/DTO, frontend mode, tests and necessary metadata packaging | Existing inventory; ready |
| Historical Stannard packet | [SR-25](SR-25.md), [#45](https://github.com/QuinnPaterson96/ShovelReady/issues/45) | `docs/research/stannard-reference/` only | Existing inventory; ready |
| Blinded virtual-user walkthrough | [SR-26](SR-26.md), [#46](https://github.com/QuinnPaterson96/ShovelReady/issues/46) | `docs/usability/wave-five/` only, isolated scratch demo | Existing VIC-080 viewer/launcher; ready |

SR-24 reads the current inventory; SR-25 records potential corrections separately.
SR-26 runs a frozen merged baseline, so it neither waits for nor validates SR-24's new
mode. Merge order is flexible. Shared dependency/CI changes and central README,
architecture/backlog reconciliation belong to integration. Preserve the four required
checks and use the new PR handoff template. Existing source-review/publication gates apply.

## Common task instructions

Read AGENTS.md, README.md, architecture, quality and the live ticket. Confirm this handoff
and all prior merged PRs exist in the checkout. Use the task's managed worktree and its
specified `codex/` branch; do not create a second worktree or touch the original dirty
checkout. Verify personal author/committer and both Git/gh authentication before writes.
The personal CLI config is `C:/Users/quinn/.config/gh-quinnpaterson96`; account verification
is still required. If Git Credential Manager cannot supply personal credentials, the
verified personal gh credential helper can be used for that command without changing
global identity or printing secrets. Never use work credentials or Styx.

Implement only the bounded ticket and record exact commands, actual results and skips.
Tests/demo rehearsal use fresh owned scratch resources, never the user's default
persistent database or running preview. Commit explicit paths, push and open a PR.
Do not auto-merge, change branch protection or close broader parent objectives.

SR-26 is explicitly authorized to use one isolated participant subagent. Give it no
inherited history and only the participant brief, URL and necessary browser operating
constraints. The facilitator alone reads the rubric/code. Use the computer-use skill
for real UI interaction; a browser walkthrough is not a model response to copied
fixtures. If the tooling prevents separation, report that limitation. Do not manufacture
human usability statistics or convert an agent's conclusion into legal acceptance.

## Completion and next decision

Review the evidence-view PR for provenance/uncertainty and packaging, the Stannard packet
for exact source support and finite review gaps, and the virtual run for observed behavior
with a withheld rubric. Use demonstrated failures to scope subsequent fixes. No task
creates an accepted release or removes the independent review needed for real screening.
