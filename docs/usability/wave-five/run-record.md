# SR-26 observed run — September 24, 2026

One actual browser-based virtual participant investigated the existing licensed VIC-080 lead. The report covers the frozen merged viewer, not SR-24's parallel public-case UI. See the [exact brief](participant-brief.md), [unaltered participant response](participant-note.md), [prewritten rubric](withheld-rubric.md) and [assessment](findings.md).

## Baseline and isolation

- Managed checkout: `C:/Users/quinn/.codex/worktrees/db82/ShovelReady`.
- Base/application/frontend: `24b6cc0d503d1b53a242e23339eb0fbc447a4195`, also verified `origin/main` after fetch. Merge history includes #40 (`d8dec84`), #41 (`ebc2361`), #42 (`8cb7753`), #43 (`88b8b6d`) and #47 (`24b6cc0`). Live issue #46 matched the checked-in ticket.
- Branch: `codex/virtual-user-vic080`, created after clean status inspection. No worktree was created and no other checkout was changed.
- Windows / PowerShell; Python 3.12.3, uv 0.12.17, Node v22.14.0, PostgreSQL 17.2; locked dependencies.
- Newly allocated owned root: `C:/Temp/sr26-vic080-5f710567-173a-4188-a124-fb7583d6c79b`; DB loopback port 54446; HTTP loopback port 54447. Ports were obtained by binding temporary loopback listeners to port zero, then releasing them. The helpers independently refused conflicts; the demo reserved its HTTP socket during build.
- Seed read-back: `spatial:sha256:db45fb736cd0fe2455d65b64105b038539bc7695e62666be6b2840474af8aee7`, collection `victoria-pilot-three-leads`; nine responses, ten features, three parcels, unreviewed, no screening/publication.
- HTTP PID 30368, PostgreSQL listener PID 41776. Both listeners were explicitly checked as 127.0.0.1. No default database, existing preview, Styx, shared service or paid resource was used.

The facilitator read AGENTS, README, architecture, quality, integration-wave-four, wave-five prompts, SR-26/live issue, local-development, investigation-api, evaluation, and prior usability README/rubric/walkthrough before the pass. The facilitator alone also read the site-fixture handoff and current UI source to scope a supportable rubric.

The rubric was fixed in facilitator tool-session memory **before participant dispatch** and copied unchanged into its separate file after shutdown. This ordering is preserved in the task's tool record; it is not an independently timestamped/signed rubric artifact. No checkout file was written while the demo served; clean status and unchanged HEAD were checked before shutdown. Launcher-generated ignored dependencies/build files are the documented build step, not edited application sources.

Exactly one participant was spawned with `fork_turns="none"`, no model override and only the recorded brief/URL/operating constraints. No subsequent message, hint, rubric or source data was supplied. This establishes conversation separation and an instructed browser-only boundary, **not OS-level denial of shared filesystem access**. The participant reported using actual in-app browser controls and screenshots, with no fixture/HTTP substitution. Its first visible-tab attempt failed because visibility was unsupported for subagents; it recovered with a background tab and a returned tab ID. A background browser remains actual rendered UI. The facilitator did not intervene.

## Commands and lifecycle evidence

Commands ran in the managed checkout. Personal authentication was scoped to `GH_CONFIG_DIR=C:/Users/quinn/.config/gh-quinnpaterson96`; `gh api user --jq .login` returned `QuinnPaterson96`. Effective author and committer both returned `quinnpaterson96 <60762693+QuinnPaterson96@users.noreply.github.com>`. Origin was `https://github.com/QuinnPaterson96/ShovelReady.git`. The verified personal gh credential helper was used command-locally for Git fetch/push; no token was printed and no global configuration changed.

```powershell
$env:GH_CONFIG_DIR='C:/Users/quinn/.config/gh-quinnpaterson96'
gh api user --jq .login
gh issue view 46 --repo QuinnPaterson96/ShovelReady
git status --short
git remote -v
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' fetch origin main
git rev-parse HEAD origin/main
git switch -c codex/virtual-user-vic080

# Newly allocated GUID root and free ports for this run:
$scratchRoot='C:/Temp/sr26-vic080-5f710567-173a-4188-a124-fb7583d6c79b'
python -m uv run --locked python scripts/local_database.py start --root $scratchRoot --port 54446
python -m uv run --locked python scripts/local_database.py migrate --root $scratchRoot --port 54446
python -m uv run --locked python scripts/local_database.py seed --root $scratchRoot --port 54446
./scripts/demo.ps1 -Config "$scratchRoot/local.json" -Revision 'spatial:sha256:db45fb736cd0fe2455d65b64105b038539bc7695e62666be6b2840474af8aee7' -Port 54447
```

Start/migrate/seed exited successfully. The launcher ran `npm ci` (85 packages, zero audit vulnerabilities) and `npm run build` (TypeScript and Vite, 177 modules), then displayed the exact app/frontend commit and spatial revision. Its foreground terminal session was 78553. Browser requests for `/`, application assets, `/api/identity`, `/health` and `/api/investigation` succeeded; the log also contains a favicon 404 without a participant-reported impact. Those HTTP logs corroborate serving only; they are not substituted for the browser run.

## Actual participant sequence and evidence

The sequence below preserves the participant's returned action account; it is not an invented click-by-click transcript. Raw browser actions and screenshots remain in the participant tool history of this Codex task. No separate image bundle or video was exported into the repository; the durable report preserves the visible text and final note. Do not treat later facilitator observations as original participant screenshots.

| Order | Actual action / obstacle reported | Visible evidence retained in final response |
|---|---|---|
| 1 | Read computer-use skill; request fresh visible in-app tab. | Subagent visibility unsupported; no claim that a visible window opened. |
| 2 | Create background tab; recover undefined handle using returned ID. | Real browser inspection worked at the supplied local URL. Tool setup recovery, not a demonstrated app defect. |
| 3 | Select site-80 in real observations; expand identity. | No screening/accepted dataset/design/placement/publication; matching full application/frontend commit and selected observation revision. |
| 4 | Inspect parcel and zoning evidence; scroll and capture screenshots. | PID 008-140-723, Am.44 / VIP937 / V02291034; area about 577.33 m²; GRD-1 (PGA), full title, ZB2018 / OBJECTID 3; exact self-touch review warning. External bylaw URL was read as an attribute, not opened. |
| 5 | Inspect roofline; capture map/intersection view. | OBJECTID 69970 / Residential, about 119.59 m²; roofline-not-wall/principal-building warning; intersection about 577.33 m², uncovered/overlap 0 m² with geometric-only caveat. |
| 6 | Return qualification note and next-information request. | Three exact feature locators and capture timestamps, no fit/permit conclusion, limits and necessary reviewed inputs. Full text retained separately. |

Participant screenshots were reported to show identity, foundation limitations, missing facts, zoning attributes and map/intersection evidence. Screenshot persistence is limited to tool history; readers of this Git report alone cannot audit pixels. No human time, satisfaction or correctness rate is measured.

## Post-pass facilitator check and cleanup

After the participant's final response, the facilitator opened a separate fresh browser tab at the frozen URL, used the rendered lead selector to choose `site-80-parcel / feature 0 · needs investigation`, then chose `site-80-zones / feature 0` in the captured-feature selector. Accessibility observations confirmed:

- Parcel locator and IDs exactly match the participant's note. Calculated parcel area `577.3288014661284 m²`; intersection `577.3288014661283 m²` (both reasonably summarized as 577.33).
- Zoning title `General Residential District-1 Zone Priority Growth Area`, `GRD-1 (PGA)`, OBJECTID 3, ZB2018, captured URL ending `zoning-bylaw-2018#page=30`.
- Selected zoning feature's own area is `4239589.130495181 m²`, distinct from the parcel/intersection. The participant did not confuse these quantities.
- `exact_self_touch_decomposed_requires_review` is visible, along with missing-fact and source-date caveats. A facilitator screenshot of this selected zoning evidence was emitted to tool history.

This was a narrow corroborating check after the blind pass, not a second independent participant or coached rerun. No consequential application defect was established that required reproduction/fix testing. The tool-visibility error is environment-specific; the facilitator's visible-tab creation succeeded, which does not reproduce subagent visibility support.

Before any report writes, `git status --porcelain` was empty and HEAD remained the baseline. Ctrl+C was sent only to the owned launcher session. Uvicorn logged shutdown complete and finished PID 30368; the terminal returned exit 1 on interruption, not a claimed zero-exit lifecycle test. The database remained running until its explicit owned stop:

```powershell
python -m uv run --locked python scripts/local_database.py status --root $scratchRoot --port 54446
python -m uv run --locked python scripts/local_database.py stop --root $scratchRoot --port 54446
python -m uv run --locked python scripts/local_database.py status --root $scratchRoot --port 54446
Get-Process -Id 30368,41776 -ErrorAction SilentlyContinue
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object LocalPort -in 54446,54447
```

Results: running before explicit stop, stop successful, then stopped; zero remaining owned PIDs and zero listeners on the two scratch ports at `2026-09-24T16:58:26.9542760-07:00`. Scratch files remain outside Git for diagnosis and contain local configuration; they are not report artifacts and must not be shared. No recursive deletion, foreign process termination or service stop occurred.

## Verification scope

This docs-only change uses documentation/link/diff review. The real merged launcher build, migration, seed, browser pass and cleanup above were verified on the baseline. Backend suites, extra database tests, Docker, mobile, other browsers, assistive technology, external legal sources and live model extraction were not run: no runtime change and no such acceptance claim. Required final-head CI is separately reported by the PR; baseline/local evidence does not establish its outcome. Central README/architecture/backlog remain under integration ownership.

Report review: five Markdown files; PowerShell resolved every relative `.md` link against this directory and found zero broken links. `rg -n 'password|token|secret|SHOVELREADY_DATABASE_URL|postgresql://' docs/usability/wave-five` returned only the prose statement that no token was printed. Manual review found no credentials or configuration contents. `git diff --cached --check` checks the explicitly staged report before commit; only this owned directory is included. The PR head identifies the final report revision.
