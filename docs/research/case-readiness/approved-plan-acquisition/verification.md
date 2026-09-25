# SR-35 verification

September 25, 2026. Starting base:
`285b923e8f9eb064e47062c5e6686e89a617c5d9` (merged PR #76).
PR #73 was verified MERGED; the managed worktree was clean. Fetched personal origin,
verified the integration ancestor, and created `codex/sr-35-approved-plan-acquisition`
from origin/main. Prior branch/history and the original checkout/demo were preserved.
Read AGENTS, current README/architecture/quality, SR-35, wave-eight prompt, integration
review and relevant Pilot/Avalon packets. Only this acquisition directory is owned.

## Evidence actually inspected

| Route | Action / result | Boundary |
|---|---|---|
| City's records guidance | Opened official page, followed documented property and plan-search routes. | No formal request. |
| Guest property portal | Address result -> selected property -> All Permits on Selected Properties, Avalon then Pilot. Confirmed named permit IDs, application dates, status and parcel identifiers. Report has navigation/print controls, no exposed approved-plan download. | No report export; no session URL, owner or contractor details committed. No issue/occupancy dates inferred. |
| Development Tracker | Public requests GET + BeautifulSoup inspection for REZ00774, DPV00223, DPV00081 and DVP00216; all HTTP 200. | Relevant document/related-record listings read. No guessed building-permit download endpoints or repeated denied eScribe endpoints. |
| Plan-search guidance/welcome | Full relevant public text read. Owner permission and MyCity profile required; unfinished requests autosave. | Stopped before Continue; authorization form/agent eligibility not verified. No existing account used. |
| Fee schedule | Current opened PDF text says September 3, 2026, $25 plan-search row. Indexed result carried older date; not adopted. | No guaranteed charge, waiver decision or copy quote. Screenshot tool returned a reference without an inspectable image here; no visual-audit claim. No approved-plan PDF became available. |
| Rights | Read City copyright and electronic-copy terms. | No licence obtained; retention and proposed research uses remain questions in drafts. |
| LTSA | Official title/plan help and title-information page opened. | Route specification only; no title/plan purchase, owner search or account creation. |

Research used official sources, two properties and the identified records. No broad
case survey, Modo/listing re-research, database, cloud, live extraction/model call,
account, payment, outreach or submission occurred. Drafts ask for existing records
and attribution, not new professional opinions. The request route's gating is a
valid acquisition outcome, not evidence that plans do not exist. No new third-party
bytes or screenshots were saved in this task; no cleanup was needed for this packet.
Prior task scratch disposition is unchanged and remains in its original verification.

## Verification scope and handoff

Read the final documents against SR-35: Avalon first, Pilot second, both public
systems checked, exact unsent requests with identifiers/destination and unresolved
authority/cost/reuse questions, and each requested record tied to its useful check.
The Plan 5130/5230 and REZ00774/00744 discrepancies are preserved. Historical,
approved, reported completed and as-built states remain separate.

Documentation checks: strict JSON (reject duplicate keys and nonfinite values),
unique source IDs, HTTPS source URLs, source references, relative Markdown links,
provisional/non-acquisition flags and `git diff --check`. Full staged diff reviewed
before commit. Application/database tests are N/A for this documentation-only change;
no independent source/legal review, evidence acceptance, publication or user validation.
Final PR-head CI is separate and must be checked before integration.

Personal origin: `https://github.com/QuinnPaterson96/ShovelReady.git`.
`GH_CONFIG_DIR=C:/Users/quinn/.config/gh-quinnpaterson96`;
`gh api user --jq .login` returned `QuinnPaterson96`.
`git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT` both returned
`quinnpaterson96 <60762693+QuinnPaterson96@users.noreply.github.com>`.
Fetch/push use the verified CLI credential helper explicitly, clearing other helpers
for that command. No tokens persisted or printed. PR links #75 without closing it;
no merge or parent closure authorized.
