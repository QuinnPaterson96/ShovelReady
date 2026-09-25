# Routine garden-suite public-record test

Research: September 24, 2026 (America/Vancouver; capture timestamps are September 25 UTC).
**Provisional, benchmark-ineligible, split unassigned. Zero accepted checks or legal outcomes.**

## Result and selected case

**1685 Warren Gardens, City of Victoria, BC: DDP00930** is the best ordinary-pathway
lead examined, but this bounded search did **not** establish a complete source/design/site/
placement chain. The [public tracker](https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=DDP00930)
identifies a delegated application for a new garden suite and supplies dated review and
issuance workflow entries. The inspected record has no Documents section, downloadable
plans, executed permit or related-application links. This is a specific public-input gap,
not evidence that municipal plans do not exist.

The application is described as an existing-zoning delegated pathway, not a rezoning.
**“Routine” remains a search strategy, not a verified legal classification:** the principal
building's use, applicable zone, other applications and absence of variances have not been
established. No conclusion is drawn from missing public-hearing records. Montrose's
verified variance is explicitly kept out of Warren's proposed pathway.

All source IDs resolve to [sources.json](sources.json), which records URLs, exact locators,
capture times, hashes where bytes were obtained, inspection limits and date evidence.
It is research metadata, not a new import format. No existing source IDs were changed.

| Scope component | Selected scope / precise gap |
|---|---|
| Municipality and site | City of Victoria, British Columbia, Canada; tracker label **1685 WARREN GDNS**, displayed here as Warren Gardens. No parcel identifier, survey boundary or legal yard assignment supplied. |
| Application aliases | DDP00930 only verified. No other address/application aliases established. |
| Building role/use | Tracker proposes a **new garden suite**; principal building's single-family use, secondary suites and other housing units are unknown. Do not infer them from the garden-suite label. |
| Design / plan revision | Unknown. The October 21, 2024 revised-plan workflow start is not a drawing date or plan revision. No sheet index, site plan or floor plan obtained. |
| Site and supplied placement | Site address known; exact site revision and supplied placement unknown. No anchor, rotation, footprint, endpoints or controlled measurement. |
| Historical cutoff | End of **November 28, 2024**, the tracker-reported permit-issued day. Current permissions, permit validity and later amendments are outside the claimed scope. Governing law at that cutoff is still a gap. |
| Prefab | Manufacturer, model, configuration and manufacturing method unknown. New construction does not establish prefab. |
| Status | Tracker reports issuance; executed development permit, its conditions, linked approved plans, building permit and construction status unverified. Historical plan facts would not require an as-built claim, but no plans were obtained. |

This case can teach the scouting product that a promising delegated application and a
dated municipal workflow are insufficient measurement evidence. It cannot establish a
prefab fit, compliant placement, current entitlement, representative approval rate or a
cleaner ordinary-case measurement chain. A house with a garden suite was preferred but
not verified here. Changing UI or assigning an “accepted” flag would not fill this gap.

## Three application groups considered

| Group | Evidence and selection decision |
|---|---|
| **1685 Warren Gardens / DDP00930 — selected** | Fresh guest-tracker discovery and direct record retrieval (`RG-warren`); dated issuance trail but no attachments. Strongest lead for the ordinary-pathway question. No numeric site/design facts. |
| **1275 Montrose Avenue / Board appeal 00772** | `RG-montrose-minutes` pp1-2 identifies single-family use in R1-B, garage conversion, and approval of a rear setback relaxation from 0.60 m to 0.52 m on March 28, 2019. These are decision values, not a measured Warren setback. **Variance case, not routine.** Indexed October 2020 monthly reporting suggests a later revision (`RG-montrose-monthly`), but full document access failed and no controlled plans were obtained. Not selected. |
| **1048 Richmond Avenue / DDP00589** | Indexed official reporting lead (`RG-richmond-report`, p5 section 6(B) item 1) describes an accessory-building conversion and inactivity closure. Full PDF returned 403; tracker returned HTTP 200 with an application-level retrieval error (`RG-richmond`). No controlled plans or verified decision. Closure is not a merits refusal. Not selected. |

Search result rows were discovery only. No fourth application group was opened or
advanced. Stannard, Pilot, Avalon, Prior, Linden, Chandler and Government were excluded;
Basil, Burton and Cedar Hill were not revisited. Existing packets were read for context,
not reused as a new case. See [verification.md](verification.md) for bounded fallbacks.

## Evidence and chronology

| Date / locator | Evidence category | What the record establishes and what it does not |
|---|---|---|
| May 8, 2024; `RG-warren`, Application Date / first task | Source statement | Application and staff-review start. No permission inferred. |
| June 7–October 21, 2024; `RG-warren`, With Applicant | Source statement | Dated workflow interval; does not identify the actual submitted drawing revision. |
| June 30, 2024 annotation; `RG-general`, p9 §52 and p10 amendment list | Instrument annotation | Current consolidation attributes §52 to 24-035. This is between application and reported issuance; adoption/effectiveness and transition text were not independently checked. |
| October 21–November 13, 2024; `RG-warren`, Staff Review of Revised Plans | Source statement | Revision review interval; no revised sheets or conditions available in the record. |
| November 28, 2024; `RG-warren`, Development Permit Issued, both dates | Source statement | Tracker-reported issuance, distinct from inspection of an executed permit or approved plans. Cutoff chosen here. |
| Current download; `RG-definitions`, pp17,22 | Visual document observation | Restricted-zone definition is annotated May 28, 2026, Bylaw 26-048. Cannot silently substitute this definition for its 2024 predecessor. |
| Current download; `RG-general`, p10 | Visual document observation | Contains October 2, 2025 amendment material; not a frozen 2024 consolidation. |
| September 24, 2026 research; `RG-warren` | HTML observation | No Documents section or FileDownload links in the obtained record, and no linked related application. Search access success does not supply withheld/missing documents. |
| No plan available | Plan-table observation | **None.** No proposed setback, separation, floor area, floor dimensions or principal-building use transcribed. |
| No plan available | Visual drawing observation | **None for this case.** Regulatory diagrams inspected below are generic, not this site. No pixel scaling or GIS measurement substituted. |
| None | Calculation | No case-specific arithmetic performed. Threshold normalization below is identity conversion in metres only. |
| Bounded comparison | Researcher inference | Public workflow evidence is cleaner than an undated status label, but the design/site/placement evidence chain remains absent. It has not reduced the interpretation burden enough for an evaluator fixture. |

## Two blocked check candidates

These are requests for future evidence, not assertions, accepted facts or expected pass/fail.
`null` means missing, never zero. Both compare lengths, so percentage/ratio denominators
are **not applicable**. Area/coverage checks were deliberately not added without plans.

| Candidate | Original source value → normalized threshold | Case observation / normalization | Measurement basis, references and blocker |
|---|---|---|---|
| **C1: garden-suite rear setback** | `RG-schedule-m`, p1 §2(a): minimum **0.6 m → 0.6 m**, inclusive lower bound | Proposed value **null**; original unit **null**; normalized value **null**; no measurement source | `RG-definitions`, p18 defines shortest horizontal lot-boundary-to-building-face distance, excluding cornice, retaining wall, fence, and exterior wall treatment/insulation/rainscreen up to 0.13 m depth. P16 defines rear line/yard, including intersecting-side-line case. Requires actual rear boundary, building face/projection treatment, historical definitions and stamped placement. Site-specific variance/override absence unverified. |
| **C2: garden-suite building separation** | `RG-schedule-m`, p1 §2(d): minimum **2.4 m → 2.4 m**, inclusive lower bound | Proposed value **null**; original unit **null**; normalized value **null**; no measurement source | Schedule M names suite and single-family dwelling. `RG-general`, p9 §52(1)(d)(ii) can extend the other endpoint to **any other building containing housing units**, subject to §52 applicability/exclusions. Face/roof/deck/porch endpoint rules have not been settled. Do not transplant the setback definition to separation or use a building-code limiting distance. Every relevant building and the supplied placement remain missing. |

**Common applicability and unresolved references:** Schedule M p1 §1 retains primary-use,
secondary-suite and suite-count restrictions and accessory-conversion age/occupancy rules;
§2(e) requires rear-yard location. Its footer directs underlined terms to Schedule A.
The tracker says new suite, not conversion, but no design review confirms that classification.
Site coverage (§3), plus-site area pathway (§5), parking (§6/Schedule C) and all other
requirements remain outside these two comparisons, not waived. No optimistic value is
borrowed from the Montrose variance or a different development alternative.

For restricted zones, General Regulations p9 §52(1)(d) disapplies Schedule M §§1(a), 1(b),
6(a) and changes the separation subject. Section 52(2) excludes specified heritage-protected
or designated land, transit-oriented land, unserviced land, certain pre-December 7, 2023
heritage agreements, zones requiring 4,050 m² subdivision lots, lots above 4,050 m²,
and lots below 230 m² or 7.5 m average width. Those facts are unknown here. Preserve
§52(1)(a)-(c) housing allowances, (e)'s Schedule P §§3.2–3.4 reference and (f)'s parking
conditions if that pathway is later established; this packet has not audited those linked
instruments. The applicable historical zone and 2024 restricted-zone definition are missing.

Keep two **unresolved pathway hypotheses** separate: ordinary Schedule M with applicable
zone/general rules, versus Schedule M modified by §52. Neither is an accepted alternative;
the record does not yet select one. A November cutoff cannot simply inherit May's law.
The current downloads provide clause leads, not complete historical authority or a claim
that these are all applicable restrictions. No unqualified scalar rule is manufactured.

## Readiness and finite next actions

| Evidence level | Readiness now | Exact next artifact / gate |
|---|---|---|
| **(a) Provisional investigation** | Useful new, attributable application/process record with a dated issuance task; two precise measurement requests; documented negative attachment finding. | Reopen DDP00930 or use an authorized supplied record packet if it becomes available. Preserve the current record separately if it changes. |
| **(b) Diagnostic mapping: design/site/placement** | Blocked for both checks; no controlled plans, survey, placement or values. | Approved drawing index plus site/floor plans and revision dates linked to the November 28 permit; site boundaries/rear-yard classification; principal and other housing-building roles; exact placement and definition-specific distances, with actual supplier provenance. No as-built evidence required for a historical drawing check. |
| **(b) Diagnostic mapping: rules and decision** | Blocked; cutoff applicability and variance/permit conditions unknown. | Executed DDP00930 and its plan schedule, conditions, amendments/related applications; historical zone evidence and governing Schedule M/A/general amendments including 24-035 and its applicability/transition. Confirm relevant overrides instead of relying on absence in search. |
| **(b) Existing evaluator support** | Arithmetic shapes `distance >= 0.6 m` and `distance >= 2.4 m` are supported in isolation. Neither candidate is executable from this packet. | Exact accepted rule revision, reviewed direct MeasuredFact, matching definition and Binding, source snapshots, exact design/site/placement revisions and scoped provenance. Existing [evaluator](../../../evaluation.md) does not calculate geometry, resolve temporal law, select buildings or execute conditions/references. Even resolved references block execution. Preserve conditions; future semantics work must be justified by reviewed evidence. |
| **(c) Independent review/acceptance** | No reviewer named, no accepted binding, no expected legal outcome. Municipal process evidence is not ShovelReady review. | Named independent review of narrow source/fact/definition/binding scope, rationale, disagreements and separately justified expected diagnostics; resolve source retention/reuse rights. |
| **(c) Publication and user validation** | No release, source acceptance, evaluator run or public screening output. | Separate release membership/compatibility and publication checks, authorized retained evidence, then a scoped end-to-end diagnostic and independent user validation. Code merge cannot publish data. |

If only one missing packet is pursued, prioritize the executed DDP00930 with its approved
site/floor-plan schedule and revision history. It could resolve several input gaps at once.
These are **unsent record requests**, not outreach or authorization to contact anyone.
If the packet still lacks endpoints or historical applicability, retain investigation status.

## Retention, handoff and limits

Only citations, research metadata and original short factual summaries are committed.
No PDFs, drawings, rendered images, complete extracted text, owners, signatures or contact
details are included. `RG-rights` limits reuse; access is not a licence. Inspection copies
remain in task-owned scratch outside Git for handoff, with durable/shared retention unresolved.
Hashes identify obtained bytes only, not authority, acceptance or availability to another reviewer.

The case and all future aliases/revisions/derivatives must stay together. Shared regulatory
sources also require dependency assessment before any split. Nothing was sent to extraction
or tuning prompts; the existing height/grade holdout remains reserved. This packet is not
added to the frozen inventory, synthetic HTTP aliases, demo or runtime.

Suggested integrator note only: the existing Schedule A hash also contains the May 2026
restricted-zone amendment (pp17,22), and General Regulations contains 2025 amendments.
Historical work must not describe either hash as a contemporaneous 2024 or 2023 snapshot.
The existing historical packet already warns about later material; no central file was edited.

This bounded result does **not** close SR-01/05/06/09/10/13. A routine case was not proven
impossible to obtain; this attempt found a specific new candidate whose public tracker lacks
the necessary plans and measurements. Software verification, source review, publication
and user validation remain separate evidence categories.
