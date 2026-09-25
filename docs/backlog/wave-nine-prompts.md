# Wave nine: user-facing assessment and real-case investigation

September 25, 2026. User requested a home page, parameter entry with optional example
import and an obvious status colour. The prior app test passed 393 tests plus 28
contract subtests and the three synthetic computed UI cases at PR #78 head 6ec8363.
It also found that Pilot's latest diagnostic is CLI-only and its older public inventory
overstates the basis of the conflicting area observations. No real zoning fit resulted.

## Parallel assignments

| Task | Ownership | Dependency |
|---|---|---|
| [SR-36](SR-36.md): Home, form and status | App/navigation, editable draft, example import, shared banner and scoped frontend tests | Existing main; Pilot route wiring after SR-37 |
| [SR-37](SR-37.md): Pilot preparation view | Read-only API/core packaging, isolated component, Pilot inventory correction | Merged PR #78; final shared-banner/navigation wiring with SR-36 |

Both can develop independently. They must not both edit App.tsx or shared styles.
Integration connects the standalone PilotPreparation export to the shell, adopts
the shared status banner, reconciles any test discovery and runs the actual combined
Home -> input -> summary / Pilot evidence workflow. Do not merge a broken intermediate
import or claim integration before both sides are exercised together.

## Shared dispatch prompt

Implement your linked ticket in an isolated managed worktree from current main. Read
AGENTS.md, README.md, docs/architecture.md, docs/quality.md, your ticket and this handoff.
Historical proposals are hypotheses; preserve the current explicit uncertainty,
revision/provenance and acceptance boundaries. Keep the one-app architecture. No new
cloud service, authentication, agent framework, vector store or generic rules engine.

Use personal QuinnPaterson96 auth and repository-local author/committer identity per
AGENTS. GH_CONFIG_DIR=C:/Users/quinn/.config/gh-quinnpaterson96; verify gh api user,
origin and git var author/committer before remote writes. Never use work credentials,
force pushes or the user's original checkout/demo. Use codex/ branches, stage explicit
paths, open and attach a PR against main with exact verification and remaining gaps.
Do not self-merge. Keep data acceptance/publication separate from UI and code delivery.

Run meaningful tests appropriate to your changes and frontend typecheck/build where
applicable. Tests may only use isolated disposable databases. No paid/live model calls,
record-request submissions or cloud resources. When overlapping work is needed,
document the handoff instead of rewriting the other task's owned files.

## Product boundary

Form completion establishes input readiness only, not zoning feasibility. Imported
examples are optional and visibly labelled; edits invalidate source fixture outcomes.
Colour is accompanied by text, scope, uncertainty and next action. Grey is unassessed
or outside coverage, amber is investigation, green is a scoped supported candidate,
red is failure of evaluated supplied placement. Unknowns are never permission or
prohibition, and synthetic results never become real-case findings.
