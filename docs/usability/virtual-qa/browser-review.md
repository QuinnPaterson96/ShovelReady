# SR-28 facilitator control review

Reviewed 2026-09-25, approximately 00:44–00:46 UTC, by the Codex SR-28 fixture author.
This is an author/facilitator browser verification with known expected answers; no
participant was spawned, no task-completion/detection rate measured, and no independent
legal review claimed. Source-derived legal expectations remain provisional.

## Environment and frozen builds

Application baseline `303b40aeb9e69f476878959148ed299cad2a5e9b` includes integrated SR-27.
Four new owned clones under `C:/Temp/sr28-facilitator-rbiw4ohp` used Git blob LF bytes,
Python 3.12.3, locked existing Python dependencies, Node 22.14.0 and npm 10.9.2.
No database was configured or started. Only loopback HTTP was served; inherited
SHOVELREADY/PG/database settings were removed from each child environment.

Preparation executed `git clone --no-hardlinks --no-checkout`, repository-local
`core.autocrlf=false`, detached checkout of the baseline, and personal local Git identity
configuration. Each fault copied its exact recipe asset after before/after SHA checks,
staged only the renderer and made a disposable local commit. `git status --porcelain`
was empty before and after `npm ci` and `npm run build` in each clone's `frontend`.
`VITE_APPLICATION_COMMIT` was its actual commit. All four builds passed TypeScript and
Vite compilation. No existing application fixture bytes changed in the task checkout.

The temporary facilitator harness launched existing `create_app()` with each built
frontend, actual `SHOVELREADY_APPLICATION_COMMIT` / `SHOVELREADY_FRONTEND_COMMIT`,
`SHOVELREADY_ENV=test`, and a new exclusively reserved loopback socket passed to uvicorn.
It did not invoke or bypass `demo.py`'s DB-required path. This harness was a one-off
review, not SR-29 implementation or a substitute for its ownership/refusal smoke tests.

| Build | Actual commit | Tree | Port / owned PID |
|---|---|---|---|
| Clean (all three controls) | `303b40aeb9e69f476878959148ed299cad2a5e9b` | `c2bcf02db918fe4fd7eb07367da2f48cedeef867` | 60311 / 17272 |
| Evidence access fault | `6c3cd43acfd03007596a017c1759647c8a43c80a` | `873ffd0fa8464ee1b999e1dd9ecf234ce78ab0bc` | 60314 / 12812 |
| Unit display fault | `d379ecccac42f75580b647e4b7a7a398af56aa08` | `74299c1893e607dcbbb98523b75e7705b20cf70a` | 60318 / 42976 |
| Affirmative headline fault | `0b3843371d26c9a79d3fadfe40156dc32e277564` | `2603f292cf08d1bdb839512cd2d7a749cacf4a8e` | 60321 / 7696 |

[Build file hashes](browser-builds.json) preserve the index/JS/CSS bytes actually
reviewed. A regenerated derived commit may have a different SHA because commit time
differs; compare the recipe's bytes/tree and record the new identity honestly.

## Actual browser observations

Codex in-app browser, background tabs 1–4, used supported `cua_repl` accessibility
and Playwright browser APIs. Initial page shows Real observations unavailable because
these synthetic builds deliberately have no DB; switch Investigation mode to
“Fictional preview · synthetic saved scenarios”. This is a known entry-state limitation,
not a seeded fault. Each control brief explicitly names Fictional preview.

| Case IDs | Action and actual evidence |
|---|---|
| `evidence-access-clean` / `evidence-access-fault` | Select A. Clean “Inspect rule and source evidence” opened section A, `<= 0.45 fraction (original: 45%)`, ratio basis, snapshot v1, capture and unknown effective dates. Fault A retained the candidate/check/scope text but had no disclosure. C's disclosure still existed in the evidence-fault build. |
| `unit-display-clean` / `unit-display-fault` | Select C and open evidence. Clean `>= 2 m (original: 2 m)` versus fault `>= 2 ft (original: 2 m)`; section C and explanation both still say 2 m, saved distance 1 m, no placement search. |
| `affirmative-label-clean` / `affirmative-label-fault` | Select E. Clean headline “Needs investigation”; fault headline “Candidate”. Both retain alternative “needs investigation”, conditional approval, absent Schedule X and unresolved source section D. Evidence disclosure opens in both. |
| `synthetic-f-correction` | Clean F comparison opened corrected result with release 2, A-r2, 35% and no-match outcome while archived candidate/release 1 remained. Corrected evidence showed section E, same snapshot/capture and unknown effective dates. |

Then performed a visible-text comparison of all six examples A–F in all four builds:
select each via its labelled control; expand F comparison; expand all visible source
disclosures; read only rendered text of the labelled preview region. No hidden fixture
or application state was read through the browser. Across the three variant-versus-clean
comparisons, all 15 non-target scenario texts were identical. The three target differences
were exactly:

- A: disclosure label plus its evidence content removed; no added text.
- C: only `m` replaced by `ft` in the displayed threshold.
- E: only headline `Needs investigation` replaced by `Candidate`.

This comparison excludes the separate app identity panel: derived build identity is
intentionally different and retained above. Source-file reversal checks independently
show no other renderer edits. No actual bug in the ordinary application is asserted.

Evidence is retained as this text record and the browser tool history in task
`01a0d5f1-4ca6-7832-8a32-f6fd9e0d5d0c`, tool calls titled “Compare all visible synthetic
scenarios across four reviewed builds” and “Record exact visible differences for seeded
controls”. A viewport screenshot was also inspected in that history; it showed the
preview header, not a full-page defect capture. No portable screenshot bundle or human
comprehension/accessibility study is claimed.

## Cleanup and limits

All four agent-created browser tabs were closed. The harness terminated and waited
for its four retained child process handles. `Get-Process` for the owned PIDs and
`Get-NetTCPConnection -State Listen` for the four ports both returned zero remaining
resources. The harness exited successfully. `git diff 303b40a --exit-code --
frontend/src/preview frontend/src/investigation/observed.test.json
docs/usability/synthetic-source.txt` confirmed unchanged task-checkout baseline inputs.
The disposable
clones/build receipts remain local diagnostic artifacts; no shared preview or default
database was adopted. This review establishes browser observability of authored
controls, not combined runner execution, blind tester reliability, zoning accuracy,
accepted data publication or customer value. VIC-080 uses source inspection and the
earlier SR-26 report; it was not re-run against a new database in this review.
