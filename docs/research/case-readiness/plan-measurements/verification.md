# Verification and bounded search record

This is documentation-only research at base
`f96a68172bae2f39d33ea0d7dc0c5d90fb6a7ecc` (PR #70), on
`codex/research-plan-measurements` in the task's managed worktree. Before research,
`git status --short` was empty, a personal-authenticated fetch succeeded, and HEAD
and origin/main both equalled that base. The baseline ancestor check succeeded.
Ownership is limited to `docs/research/case-readiness/plan-measurements/`.

## Queries and access

| Search / retrieval | Result and boundary |
|---|---|
| `site.victoria.ca "DPV00081"`; `site.victoria.ca "DVP00216"`; `site.victoria.ca "27 Pilot" "2019"` | November 2018 agenda lead; irrelevant Nanaimo DVP00216 and other Pilot results discarded without treating them as Victoria records |
| Exact DPV00081 and DVP00216 tracker URLs | Direct HTTP 200, primary HTML read; related application grouped. Web tool could not open DPV00081. No account used |
| `site:pub-victoria.escribemeetings.com "27 Pilot" "August"`; variants with `separation`, `2.6`, `22.75`, `September 13, 2018` | Indexed committee packet 25380 and October minutes 29289; revised-letter lead followed to tracker PDF bytes |
| Variants of `"27 Pilot" "November 22" "authorize"`, `"minutes"`, `"CARRIED"`, and November `F.2.a` | Found agenda, not a verified final motion. October minutes explicitly refer to later consideration; not promoted to final approval |
| PM-COTW and PM-OCT direct web opens | Fetch failures. Ordinary direct HTTP request for PM-OCT returned 403; stopped at that restriction. No PDF bytes/hash fabricated |
| November agenda and `Agenda=PostMinutes` view | Agenda direct open 403; PostMinutes view unavailable. Indexed agenda establishes the scheduled item only |
| Three selected tracker PDF attachments | HTTP 200: revised plans, revision list and revised letter. Initial PowerShell plan retrieval was slow; ordinary requests retrieval succeeded; original invocation eventually completed too. Same endpoint, no control bypass |
| `site:pub-victoria.escribemeetings.com "27 Pilot" "prefabricated"` and `"modular"`; inspection of A-2 and letters | No identified manufacturer/model/configuration lead. Material-brand references concern cladding, not a prefab building model. Unknown manufacturing method retained |
| `site:victoria.ca "Schedule M" "Garden Suites"`; exact municipal downloads | PM-M and PM-A obtained. PM-GENERAL was initially fetched while locating definitions, then correctly identified as general regulations; not used as historical law |
| Victoria legal disclaimer | Primary page opened; reuse and electronic-copy limitations read. No durable or commercial reuse grant obtained |

Only **one candidate application group** was investigated. Government Street and
Chandler were reserved fallbacks, not opened in this assignment because Pilot
yielded new primary revision evidence and a dimensioned placement. Stannard's
existing README was read for lessons; its case was not re-researched. Avalon,
Prior and Linden were excluded. No supplier/municipal/customer outreach, FOI,
accounts, paid services, cloud/database use or live model experiments occurred.

The finite outstanding record requests are: final November 22, 2018 F.2.a
minutes; issued DPV00081 with its incorporated August 7 drawing schedule and any
amendments; the historical 2018 Schedule M/A and R-2 scope; and the referenced
2012 survey/file 25264 if needed to review the selected endpoints. These are
requests for future authorized acquisition, **not messages sent**. A corrected
area/revision explanation is additionally needed only if an area check is pursued.

## Parser and visual checks

Bundled Python/pypdf extracted text from actual downloaded bytes. Bundled Poppler
`pdftoppm` rendered PM-PLAN pages 1 and 2; selected placement was enlarged for
reading, never measured from pixels. Poppler printed missing display-font warnings;
the selected dimensions, title/date, stamp and floor-plan label remained legible.
PDFium also rendered the plan, letters and selected bylaw pages. An initial attempt
to render page 18 of the mistakenly named 11-page general-regulations download
failed; inspection identified the wrong document, then fetched Schedule A at
`/media/1195`. The failed render produced no evidence claim.

| Source | Actual visual scope |
|---|---|
| PM-PLAN | p1/A-1 existing/new site diagrams, 2.6 and corner setback dimension lines, suite floor plan 4/A-1, project table, date and receipt; p2/A-2 construction/material and soffit notes and photo context. No height/grade check or annotation authored |
| PM-REVISIONS | Both pages: west-to-south move, withdrawn variance, rear request, construction/glazing/soffit responses |
| PM-LETTER | Entire one-page letter: revision date, area, separation withdrawal and rear request |
| PM-M | Both pages: selected setback/separation rows, restrictions and definition references; footer dates verified. No height/grade benchmark/tuning material created |
| PM-A | pp2,16,18,20: Area, rear line/yard, setback, single-family role and total area definitions and diagrams |
| PM-GENERAL | Text identification only; no visual substantive review or historical rule adopted |
| PM-COTW / PM-OCT | Indexed excerpts only; no full PDF or visual inspection |

The **2.6** transcription is corroborated by the revised letter's explicit metre
unit, not inferred solely from architectural scale. At the east boundary **0.20**
and **0.22** refer to different corners. No tolerance or rounding allowance is
invented. The plan's **22.25** text extraction was not visible in the selected
rendered site label; **22.75** was visibly printed in the floor plan. Both remain
recorded, and the cause of their coexistence is unresolved. No table value became
an accepted measurement.

## Validation actually performed

- JSON parsed successfully with Python `json.loads`; 12 unique source IDs.
- Source tokens in README and this file checked against the manifest; local
  Markdown links checked relative to their files.
- SHA-256 and byte lengths recomputed from the six downloaded PDF files represented
  by hashes. PM-PLAN matched frozen `DPV00081-5`; no existing IDs/data overwritten.
- Dates checked as ISO dates/timestamps, with July drawing versus August receipt
  versus meeting dates distinguished. Local date is September 24 and UTC date is
  September 25; source retrieval times use file-write completion only where logged.
  Exact web/index retrieval times are null, not guessed.
- Decimal arithmetic checked: 2.6 - 2.4 = 0.2 m; 0.20 - 0.60 = -0.40 m;
  17.35 + 5.4 = 22.75 m2; 5 x 3.47 = 17.35 m2; 3 x 1.8 = 5.4 m2.
  These calculations verify arithmetic, not legal measurement definitions.
- `git diff --check` and staged diff reviewed; only the three assigned Markdown/JSON
  files staged. No third-party source bytes, images, full extracted text, personal
  contact details, signatures or owner names included.
- Application tests, database tests, CI reruns and evaluator execution not run:
  no runtime changes or accepted inputs. No new validator/test infrastructure added.
  Final-head CI must be checked independently before integration.

Inspection copies are task-owned scratch outside Git, retained temporarily for
review with rights/retention uncertainty. Hashes identify inspected bytes, not an
authorized shared source bundle. No independent source review, acceptance,
publication or user validation occurred. Active human review time and total effort
were not measured; tool timestamps are not a labour estimate.
