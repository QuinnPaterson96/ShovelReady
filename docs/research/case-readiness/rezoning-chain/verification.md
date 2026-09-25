# Verification and research boundary

This is documentation-only historical research on VIC-PC-003. Started from clean
managed worktree `ecbb/ShovelReady`; HEAD and fetched origin/main both equalled
`f96a68172bae2f39d33ea0d7dc0c5d90fb6a7ecc` (PR #70). Created
`codex/research-rezoning-chain`. Ownership is only this directory. No original
checkout, demo, central inventory, frozen source IDs, application, CI or database
was modified. No other candidate application group was explored.

## Research and actual access

Repository context read: AGENTS.md, README.md, architecture, quality, next steps
after wave seven, evaluation, pilot reviewer actions, public-case README/cases/
search-gap ledger and Stannard README. The latter informed the known access and
revision pitfalls only. Inspected `app/evaluation/payloads.py` for concrete input
and binding gates. PDF skills read; pypdf plus PDFium used from bundled runtime.

Representative actual searches (search hits were leads, not full inspection):

- `site.victoria.ca "Avalon" "23-086"`
- `site.pub-victoria.escribemeetings.com "Avalon" "April 18, 2024"`
- `site.pub-victoria.escribemeetings.com "REZ00774"`
- `"victoria" "23-086" "Avalon"`
- `"victoria" "623/625" "2023" Council`
- `site.pub-victoria.escribemeetings.com "November 9, 2023" "Avalon" "third"`
- `"623/625 Avalon" "June 15, 2023"` with official archive domain filter
- `"23-086" "READ A FIRST" Victoria`

Some queries returned similarly named places or unrelated results. None was used
as Victoria evidence. No open-ended municipal inventory or unrelated bylaw history
was pursued. Search publication/crawl timestamps were never treated as event dates.

| Route / record | Actual inspection and outcome |
|---|---|
| REZ00774 tracker and DPV00223 tracker | Direct public HTTP 200; read Purpose, dates, related records and available document/task sections. DP000598/CLC00320 aliases verified in related sections, not independently researched as new cases. |
| Final plan and posted 23-086 | HTTP 200 PDF bytes; hashes/lengths exactly match frozen `REZ00774-17` and `REZ00774-18`. Both are recaptures with new packet IDs; original IDs untouched. |
| June/October/November/April agenda pages | Direct HTTP 200 HTML; read complete relevant Avalon items and attachment/link lists. April links establish June and November meeting IDs. November expressly postpones adoption/permit approval. Browser also inspected April attachment panel. |
| April 18 archive | Browser navigated official archive, selected 2024, expanded daytime Council list; confirmed meeting 480f4112-5a02-48e4-ad4e-2464984c460d and minutes document 97222. This verifies archive linkage, not PDF contents. |
| April minutes 97222 | Web open failed; direct HTTP 403 returned HTML, not PDF. Browser direct PDF gave blank view. No source hash of denial HTML. Indexed F.7 pp6-7 supplies only a decision lead. |
| November minutes 96250 | Direct HTTP 403; indexed pp2-3 only. |
| Staff 91308 / clerk 93521 | Direct HTTP 403; indexed selected text only. No claim that staff report tables or all 12 pages were read. |
| July minutes 92240 | Search-indexed G.1.a.b pp3-4 only; no full-document retrieval claim. |
| Adoption-stage bylaw 96683 | Discovered in April F.7; direct HTTP 403, web open failure and browser click produced no readable PDF. Not presumed identical to posted draft. |
| October HTML minutes fallback | A public `Agenda=PostMinutes` request returned HTTP 200 but still displayed **REVISED AGENDA**. Classified as agenda only; not counted as successful minutes access. |
| Bylaw directory / zoning landing page | Opened primary pages; directory routes zoning to separate instruments. Did not locate an executed Avalon bylaw there. No inference that the instrument does not exist. |
| R2-65 / Schedule M / A / general regulations | HTTP 200 current copies. Definitions retrieval initially stalled; cancelled that request, used a bounded 15-second-timeout request which succeeded. Full historical applicability remains unverified. |
| Rights | City Legal Disclaimer opened with web tool, Copyright and Electronic Documentation read; separate plan rights reservations observed. No reuse grant presumed. |

No authentication, access-control bypass, account creation, FOI/outreach, paid
services, live model experiment, cloud resource or database work was undertaken.
Prior and a third case were not needed: Avalon yielded substantive new primary
agenda evidence and finite decision-record leads despite PDF access limits.

## PDF inspection and separation of evidence

| Source | Text/parser inspection | Actual visual inspection |
|---|---|---|
| `RC-PLAN` | pypdf over all seven pages; pp1-6 mostly raster, so sparse text is not missing content | pp1 A-1.0 and 2 A-2.0. Checked issue/receipt/approval dates, zoning table, building roles, rear/east dimensions and supplied footprint arrangement. p7 rendered but **not** visually reviewed. |
| `RC-DRAFT` | Both pages; blank enactment fields | pp1-2, including hatched map and **00774** caption; not an executed bylaw. |
| `RC-ZONE` | Font-mapped extraction unsuitable for reliance | pp1-2; role substitution, definition and 23-077 adoption footer. |
| `RC-M` | Both pages parsed | p1 sections 1-3 and context; p2 footer read as text. No height/grade check extracted for the packet. |
| `RC-A` | Relevant pages parsed; amendment list p22 includes later dates | pp16,18,19,21 definitions and associated diagrams, including setback exclusions and structure/lot-area coverage illustration. No measurement scaled from diagram. |
| `RC-GENERAL` | Selected pp2,5,6,7 text read | None relied on visually; no selected table/drawing. Rendered pages alone are not claimed as inspected. |

Local renders used `pypdfium2.PdfDocument(...)[page].render(scale=...).to_pil()`
and the image-view tool. No OCR-derived numeric value was accepted without visual
inspection. Rear-yard ratio numerator/denominator polygons were not reconstructed
from pixels. The plan table's “unchanged” was retained, not relabelled as a new
measured proposal. Metric labels govern this packet; imperial rounding was not
used to replace them. Quantities/thresholds retain their exact decimal forms.

## Validation actually performed

- Standard-library JSON parse with duplicate-key and non-finite rejection;
  19 distinct source records, unique IDs and HTTPS primary URLs; required metadata
  keys and all README `RC-*` references checked against sources.json.
- Local original PDF/HTML hashes recomputed only for downloaded source bytes;
  frozen plan/bylaw hash and length equality checked. Failed/minutes/index-only
  retrievals have null hashes and no local artifact claim.
- Retrieval timestamps for captured files use UTC local write-completion time
  immediately after retrieval. Exact times for web/index-only records were not
  measured; they have null timestamps and a session date. No fabricated precision.
- Decimal arithmetic checked: 25/100 = 0.25, 28.1/100 = 28.10/100 = 0.281,
  difference 3.10 percentage points; 1.05 - 0.6 = 0.45 m. These validate
  transcription/arithmetic only. No legal expected pass/fail authored.
- Dates reviewed against source type: January 2023 plan receipt versus April 2024
  stamp/approval report; November agenda third reading versus later adoption;
  October 2023 R2-65 creation footer is not Avalon adoption. Verified legal effect
  and permit issue fields stay null. Two-year anniversary calculation is not lapse
  evidence.
- Internal relative Markdown links and `git diff --check` checked; reviewed the
  complete staged diff and explicit file list before commit. Only README.md,
  sources.json and this verification.md are intended deliverables.

No new validator/test/runtime infrastructure added. No app, frontend, evaluator,
database or model tests run: documentation and metadata only. No accepted data
publication, source/legal review attestation or user validation performed. GitHub
CI is separate final-head evidence; no merge is authorized by this packet.

## Finite outstanding record/review queue

1. Full April 18 minutes 97222 F.7 pp6-7, adopted 23-086 plus map, and executed
   DPV00223 incorporating the January 11 plan set: verify enacted text, effect,
   authorization/issuance and complete conditions.
2. October 19 first/second reading record and November 9 minutes 96250 E.1;
   July 13 minutes 92240 and clerk 93521: confirm intermediate actions and
   registrable agreement prerequisite. Resolve 00744/00774 with the map and tracker.
3. Staff report 91308 pp1-12 and its plan attachment 91311: inspect complete
   recommendation/rationale and compare attachment revision to the selected plan.
4. Applicable 2024 Schedule A/M/general amendment coverage; review rear-yard
   denominator, shortest-distance endpoint, projections and conversion eligibility.
5. Controlled plan/site/placement facts and independent measurements; executed
   agreements/car-share satisfaction and permit commencement/extensions as required
   for any proposed temporal claim. Rights and attributed review before mapping.

These are record needs, not messages or requests sent to anyone. Research effort
was not timed as billable/reviewer effort; no effort or accuracy benchmark claimed.

## Scratch and Git handoff

Inspection scratch was task-owned outside Git. Source files and renders are not
deliverables or an authorized durable evidence bundle. Cleanup disposition is
recorded below after the final checks. Identical future bytes are not guaranteed
by a URL or hash.

After validation, attempted bounded cleanup with a resolved absolute path check
and PowerShell `Remove-Item -LiteralPath ... -Recurse -Force`. Automatic approval
review rejected the action as **blocked by policy**, with no more specific reason.
No alternative deletion mechanism was attempted. The task-owned scratch remains
outside Git at `C:/Users/quinn/AppData/Local/Temp/rezoning-chain-ecbb`; this does
not establish authorized durable retention. PDFs, denial HTML, extracted text and
renders were not staged or committed. User/integrator cleanup remains outstanding.

Git origin verified as `https://github.com/QuinnPaterson96/ShovelReady.git`.
`GH_CONFIG_DIR=C:/Users/quinn/.config/gh-quinnpaterson96` with `gh api user --jq .login`
returned `QuinnPaterson96`. Effective author/committer were both
`quinnpaterson96 <60762693+QuinnPaterson96@users.noreply.github.com>`.
Fetch/push use that verified CLI credential helper explicitly, with other helpers
cleared for the command. No credential values are printed or stored in the packet.
