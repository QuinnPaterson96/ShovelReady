# Verification and bounded search record

Research date: September 24, 2026 local / September 25 UTC. This records actual work,
not independent source acceptance. No elapsed/reviewer-effort stopwatch was maintained;
no hours estimate or claim of reviewer efficiency is made.

## Setup and ownership

- Managed worktree: `C:/Users/quinn/.codex/worktrees/ad6f/ShovelReady`.
- Initial status/staged diff clean; detached HEAD and fetched `origin/main` both
  `f96a68172bae2f39d33ea0d7dc0c5d90fb6a7ecc` (PR #70).
- Ran `git fetch origin main`, `git merge-base --is-ancestor
  f96a68172bae2f39d33ea0d7dc0c5d90fb6a7ecc HEAD`, and `git rev-parse HEAD origin/main`.
  Fetch succeeded; ancestor check exited zero; both revisions matched.
- Created `codex/research-routine-garden-suite` in this assigned worktree. Ownership
  limited to this directory; no shared files or parallel subagents used in this task.
- Read AGENTS.md, README.md, architecture, quality, next-steps-after-wave-seven,
  evaluation, reviewer-actions, public-cases README/cases/ledger and Stannard reference
  README. Consulted Stannard manifest for source URLs/hash identity, not new case facts.
  Inspected evaluator payloads for required input/binding/source identities.
- Set repository-local author/committer identity; both `git var` commands returned
  `quinnpaterson96 <60762693+QuinnPaterson96@users.noreply.github.com>`.
  Origin is the personal `QuinnPaterson96/ShovelReady` repository.
  `GH_CONFIG_DIR=C:/Users/quinn/.config/gh-quinnpaterson96` with `gh api user --jq .login`
  returned `QuinnPaterson96`. Push uses this verified GH credential helper explicitly;
  no work-account authentication or token output.

## Queries, candidates and stop point

Live web search queries included the following (results were discovery leads only):

- `site.victoria.ca "garden suite" "delegated" plans`
- `site.victoria.ca "garden suite" "DP000"`
- `site:tender.victoria.ca "garden suite" "DDP"`
- `site:pub-victoria.escribemeetings.com "garden suite" "delegated" "2024"`
- `site:tender.victoria.ca "garden" "suite"`
- `site:pub-victoria.escribemeetings.com "garden suite" "separation"` with the seven excluded street names
- `Victoria "garden suite" "DDP00" -site:readkong.com`
- `site:tender.victoria.ca "suite" "Delegated Development Permit" -Chandler -Stannard`
- `site:pub-victoria.escribemeetings.com "garden suite" "2019" "delegated development"`
- `"garden suite" "Victoria" "DDP" "plans"`; `"garden suite" "Victoria" "Montrose"`
- `"1275 Montrose" "DDP"`
- `"1685" "Warren" "garden suite"`; `"DDP00930"`
- `"1685 WARREN" Victoria`; `"1685 Warren Gardens" permit`
- `site:pub-victoria.escribemeetings.com "November 2024" "Delegated Permits Completed"`
- `site:victoria.ca "Schedule M" "Garden"`

Opened the supplied City tracker, council-meeting and bylaw-directory entry points,
then the zoning-directory page. Broad results largely returned previously explored
exceptional cases or irrelevant places. They were not added as candidates. No indexed
snippet was treated as a fully inspected document. Exact Warren searches produced no
additional useful primary plan/decision source in this run; this is not an exhaustive
municipal-record search.

Used the City's publicly offered guest tracker:
`https://tender.victoria.ca/webapps/ourcity/prospero/search.aspx`.
Ordinary HTTP GET/form POST used the page's own hidden form fields and cookies, with
status ACTIVE + ARCHIVED and type DELEGATED DEVELOPMENT PERMIT. No account, privilege
change or access-control workaround. Initial results page was current 2026 material;
a bounded jump to page 12 yielded 2024 material, then page 13 yielded DDP00930.
These page numbers are capture-specific, not stable source locators. Browsing result
rows is not inspection or selection of the other applications listed there.

A page-13 POST without the original session failed; repeating the public form flow with
its session succeeded. A Montrose address filter (`1275 MONTROSE`, without street suffix)
returned no results; this is a search-input failure, not evidence of no Montrose record.
No address enumeration or full tracker crawl followed. Exactly three groups were advanced:
Montrose, Richmond and Warren. New-group discovery stopped at Warren.

| Record / route | Actual result and inspection limit |
|---|---|
| Warren DDP00930 web opening | Web tool inaccessible/internal error. |
| Warren DDP00930 ordinary HTTP | 200 with substantive HTML. Read project type, purpose, address, application date, archived label and all four workflow rows. Checked for Documents/FileDownload/related links: none. Navigation includes Top, Task Progress and Disclaimer, not Documents. |
| Richmond DDP00589 | Web tool inaccessible; direct HTTP 200 but application-level folder retrieval error. Error-response hash deliberately not promoted to a source-document hash. |
| Richmond report 99782 | Official search index supplied p5 section 6(B) item 1 lead; direct retrieval 403. Indexed-only, not full read or visual inspection. |
| Montrose March 28, 2019 Board minutes | Direct PDF 200; read and visually inspect appeal 00772 on pp1-2. Shows actual variance approval, unlike an agenda recommendation. Other appeals not developed into candidates. |
| Montrose October 2020 monthly report 64632 | Indexed p1 lead for later plan revisions; direct retrieval 403. No full read, issued permit, application alias or revision established. April 2022 report 81638 also surfaced in search, but was not pursued or used as evidence. |
| Schedule M, General Regulations, Schedule A | Direct PDFs 200; exact bytes hashed. Selected clauses/dates inspected below; not a complete historical-law audit. |
| City legal disclaimer / zoning directory | Relevant copyright, electronic-copy and consolidation warnings read; no reuse permission obtained. |

Stop reason: Warren exposes a dated ordinary-pathway lead, but no drawing or executed
permit link. Montrose requires a variance and Richmond is access-limited. Broader case
hunting would exceed the three-group strategy without resolving the selected missing
inputs. The selected partial packet is an honest negative result for public measurement
readiness, not a claim that routine cases never have public plans.

## PDF and HTML checks actually performed

Read both available PDF SKILL.md instructions. Called bundled dependency discovery.
Used bundled Python with `requests`, BeautifulSoup, `pypdf` and `pypdfium2`; PDFium
rendered the original PDFs for read-only visual inspection. No OCR was needed. Requests
emitted a dependency-version warning but returned the reported responses. Each PDF was
checked for `%PDF`, parsed for page count and hashed from exact response bytes before
text extraction. Temporary derived text/images are outside Git.

| Source ID | Pages | Text and visual scope actually inspected |
|---|---:|---|
| RG-schedule-m | 2 | Both pages rendered/viewed; §1 restrictions, §2 table row association/units, §3 context, footer definition reference, §5/6 and adoption annotations. No height/grade checks authored. |
| RG-general | 11 | Relevant text/context read; pp9-10 rendered/viewed for §52 conditions/overrides and later amendment list. Other pages not visually audited. |
| RG-definitions | 22 | Pp16-18,22 rendered/viewed: rear line/yard diagrams, restricted-zone version, setback text/diagram and amendment table. No case geometry inferred from these generic diagrams. |
| RG-montrose-minutes | 4 | Pp1-2 rendered/viewed for appeal 00772 table and carried motion. No plan drawings present in the selected pages. |

No Warren site/floor plan was acquired, parsed or visually inspected. No measurement was
scaled from imagery. The separation endpoint exclusions remain unresolved; setback's
0.13 m exterior-treatment exclusion was retained rather than silently applied to separation.
Metre thresholds remain in metres; no ratio or area denominator is invented.

The three regulatory PDF hashes equal the corresponding existing Stannard-reference
captures (`schedule_m`, `general`, `defs`). This confirms byte identity only. In particular,
Schedule A pp17/22 visually show 26-048, May 28, 2026; General Regulations p10 shows 2025
amendments. No contemporary 2024 law claim follows from matching a historical packet hash.
All material obtained is untrusted source data; no embedded instructions or expressions
were executed.

## Finite outstanding record and review requests (not sent)

1. DDP00930 executed permit, all conditions and referenced approved drawing schedule;
   site/floor plans with received/approved dates and revision history, including any later
   amendments and related rezoning/variance/building-permit identifiers.
2. Definition-specific historical rear setback and separation measurements for that exact
   design/site/placement, including principal/other housing-building use, boundaries,
   projections, endpoints and exclusions. No need to claim construction/as-built status.
3. November 28, 2024 governing zone and adopted rule/definition/amendment/transition chain,
   including historical restricted-zone definition and §52 applicability/exception facts.
4. Authorized retained evidence/reuse disposition and independent attributed review of
   the narrow rules, facts, bindings and expected diagnostics, with disagreements retained.

These requests are sufficient to decide whether to advance C1/C2 or keep them blocked;
no new general framework or broad legal-history project is proposed.

## Local validation and integration boundary

Validation used temporary one-off standard-library checks, not new checked-in validators:
strict JSON parse (duplicate-key and non-finite rejection), unique source IDs, README
source-reference resolution, ISO capture/event/cutoff dates, SHA-256/byte lengths against
actually obtained scratch responses, equality of the three pre-existing regulatory hashes,
relative Markdown-link existence, and the identity metre normalizations for 0.6 and 2.4.
Reviewed the staged diff and ran `git diff --cached --check` before committing.
Results: pass; only README.md, sources.json and verification.md in this assigned directory.

No application tests, database tests, live model experiments, AWS calls, runtime changes,
benchmark scoring, source acceptance, publication or user validation were performed.
Documentation-only scope does not warrant running the legacy tests. No source PDFs,
images, full extracted text or personal contact/owner data were staged. Remote required
CI, if triggered, is distinct from these local checks and must succeed at the final PR head
before integration. This task opens a PR; it does not merge or publish data.
