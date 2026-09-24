# Search and access ledger

September 24, 2026; bounded manual discovery, explicit record retrieval and selected
PDF inspection. No general crawler, accounts, outreach, FOI request, paid access,
live extraction calls, AWS or databases. Search results were leads only. A case was
counted only after opening a primary page plus substantive plan/report evidence,
or primary decision text. Stop point: seven Victoria plan packets plus three
separately labelled transfer packets, with explicit gaps rather than thin-case padding.

## Search sequence and coverage

| Stage / representative actual query | Result / follow-up |
|---|---|
| `site.victoria.ca garden suite variance application report`; `site.victoria.civicweb.net "garden suite"` | Found City guidance, tracker and indexed council archive; current guidance was not used to interpret old cases. |
| `"garden suite" "application" site:pub-victoria.escribemeetings.com` | Leads for Pilot, Belton, Linden, Chester, Avalon and Stannard; minutes generally inaccessible on opening. |
| `site:tender.victoria.ca/webapps/ourcity "garden suite" "Folder Number"` | Prior and Chandler records, including duplicate/replacement applications. |
| Exact tracker URLs from identifiers in agendas and related-record sections | Nineteen initial identifier attempts plus corrected Avalon and Government records; results below. These are selected case requests, not a municipal crawl. |
| `"229 Government" "rezoning" Victoria` | Found REZ00589; opened tracker and July 2017 revision packet. |
| `"garden suite" Victoria "refuse" application` | No verified final Victoria refusal. No negative case invented. |
| `site:saanich.ca "garden suite" "DPR" report`; `"garden suite" "site:saanich.ca" "report" "2021"` | Saanich council agenda leads: Tait, Gordon Head, Haliburton, Derby, Kingsley. Only Kingsley report advanced into inventory. |
| `site:vancouver.ca "laneway house" "Board of Variance" "2024"`; `"laneway" site:vancouver.ca/files/cov/ "REFUSED"` | Opened two board-minute PDFs with site-specific outcomes; treated as transfer examples. |
| Municipal copyright/website-terms searches | Opened Victoria disclaimer and Vancouver terms. Saanich archival-image fee policy was out of scope and not used as a plan licence. |

Counted records cover Victoria applications from February 2016 through November
2024, with later related tracker entries through 2025; Saanich report July 2023;
Vancouver decisions November 2023 and May 2024. These are document/event ranges,
not verified effective-law dates or an exhaustive date-range search. Search-engine
publication dates often reflected indexing and were not substituted for printed dates.

## Victoria access and deduplication

All tracker identifiers below use this public endpoint:
`https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=IDENTIFIER`.
The URLs for counted cases are individually listed in cases.json and the report.

| Opened identifiers | Actual result and disposition |
|---|---|
| DPV00081 | HTTP 200 with record and six attachments; selected latest non-bubbled plans opened. DVP00216 related-record text grouped, not a second case. |
| DPV00039 | HTTP 200, 710 Belton garden-suite record; no attached plans. Kept discovery-only outside counted inventory. Council agenda's numeric variance was not promoted from a search snippet. |
| REZ00708 | HTTP 200; final-labelled 14-page plans and three-page draft garden-suite permit opened. Related small-lot, variance and replacement identifiers grouped. |
| REZ00787 | HTTP 200; six-page final-stamped plans opened. DP000603, DPV00268 and later DDP01047 are related, not new cases. Later change outcome not inspected. |
| REZ00744 | HTTP 200 but application-level error: folder could not be retrieved. Indexed agenda label not accepted as identity. |
| DPV00223, then REZ00774 | HTTP 200 records. DPV cross-reference resolved Avalon to REZ00774. Seven-page final plans and two-page posted bylaw opened. |
| REZ00471 | HTTP 200, 324 Chester accessory-dwelling record, no plans attached. Discovery-only; inaccessible minutes do not establish approval here. |
| REZ00507 | HTTP 200, three-page raster plans opened; only receipt stamps readily extracted as text. |
| DP000488 | HTTP 200 application-level folder error. |
| REZ00488 | HTTP 200, 59 Cook subdivision/small-lot dwelling description, no garden-suite packet established; excluded as off-scope. |
| DPV00282, DDV00041 | HTTP 200, eight-page plans under retired DPV. Replacement record active; undated workflow label retained as unknown issuance. |
| DDP00864 | HTTP 200, 1215 Basil Avenue conversion record, no plans. Search-indexed closure-report lead calls it Basil Street; unresolved, not counted. |
| DDP00639, DDP00408 | HTTP 200 application-level folder errors (Vining leads). Not counted. |
| DDP00932, DPV00274, DDV00017 | HTTP 200, grouped 1568 Burton conversion lead; DPV address N/A, other related records establish grouping. No plans/dated decision verified. Not counted. |
| DDP00853 | HTTP 200, 2951 Cedar Hill garden-suite record without plans. Archived is not proof of refusal/closure reason. Not counted. |
| REZ00589 | HTTP 200; six-page revised plans opened. No final decision established. |

The [June 29, 2023 agenda](https://pub-victoria.escribemeetings.com/Meeting.aspx?Agenda=Merged&Id=67633e66-9953-4d89-a166-d3a1bc81f401&lang=English)
and [November 22, 2018 agenda](https://pub-victoria.escribemeetings.com/Meeting.aspx?Id=641184f5-197c-4caa-bcf9-11530b78c349&lang=English)
returned 403 through the web tool. Opening indexed minutes
[7680](https://pub-victoria.escribemeetings.com/FileStream.ashx?DocumentId=7680),
[8179](https://pub-victoria.escribemeetings.com/filestream.ashx?documentid=8179) and
[8867](https://pub-victoria.escribemeetings.com/FileStream.ashx?DocumentId=8867)
failed (fetch error or 403); a direct HTTP attempt at 7680 also returned 403.
Those snippets are not verified decisions in this inventory.

Web opening of DPV00081 and DPV00039 was unavailable, but ordinary direct HTTP
retrieval succeeded. All selected Victoria plan links returned PDF bytes with HTTP
200. No access restriction was bypassed, credentials used or source protection removed.

## Transfer examples and PDF verification

The [Kingsley council agenda](https://saanich.ca.granicus.com/GeneratedAgendaViewer.php?clip_id=770&view_id=1)
and linked report opened successfully. The report is a recommendation; its attached
permit copy has blank resolution and issue dates. [Tait's agenda](https://saanich.ca.granicus.com/GeneratedAgendaViewer.php?clip_id=582&view_id=1)
opened, but its report link returned a web-tool internal error and was not advanced.
The [Saanich advisory-panel agenda](https://saanich.ca.granicus.com/AgendaViewer.php?clip_id=463&view_id=1)
also opened as a discovery lead; no additional case counted. Other Saanich search hits
were not opened or verified as packets.

Both Vancouver PDFs opened with page-indexed primary text in the web tool. Direct
local requests returned HTTP 403 HTML (not PDFs), so no source hashes were invented.
Screenshot attempts failed or returned no usable image; visual verification remains
incomplete. Their limited uses are decision/status references rather than drawing
measurements. Neither was counted from a search snippet.

Applied PDF skill workflow: pypdf text extraction and pypdfium2 local rendering from
downloaded original bytes (bundled runtime). Poppler was located, but PDFium was used
for these read-only page renders. Sparse raster text was checked visually rather than
assumed absent. Selected pages actually viewed:

| Source ID | Visually inspected PDF pages / relevant scope |
|---|---|
| DPV00081-5 | 1: A-1 site/floor-plan labels, table, dates |
| REZ00708-14 | 1–2: conflicting approval stamp, cover/revision and subdivision/survey context |
| REZ00787-9 | 1: C1 separate building tables, plan, stamps and notes |
| REZ00507-0 | 1: handwritten site plan and revision dates |
| DPV00282-0 | 1: A.100 project table, site plan and received stamp |
| REZ00774-17 | 1: A-1.0 table, revision history and approval stamp |
| REZ00589-2 | 1–2: existing/proposed site plans, table and bubbled revision disagreement |
| SAA-kingsley | 3, 9–11: variance explanation, proposed permit clauses, blank dates and attachment |

Draft DPV00151 pp1–3 and posted 23-086 p1 were inspected as extracted text. This
was a targeted evidence inspection, not a full technical audit of every sheet or
attachment. Source manifest hashes/lengths refer to all original PDF bytes even when
only selected pages were reviewed. PDF metadata timestamps were not used as legal dates.

## Gaps and stopping decision

Seven Victoria packets are useful now for provisional extraction/version research;
only a subset are prospective dimensional references after review. The inaccessible
minutes, thin delegated records, unknown permit issuance and rights gaps prevent
calling this ten accepted Victoria cases. Three transfer packets add distinct
status/variance behaviors without masking the three-case local shortfall. No final
Victoria refusal, sourced prefab case, current compliance result or as-built packet
was verified. More searching could find further records; absence here is not evidence
that they do not exist. The next useful work is rights/independent review of the
shortlist and targeted missing-document retrieval, not corpus inflation.
