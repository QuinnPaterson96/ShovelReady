# Public application reference candidates (SR-23)

Research date: September 24, 2026. **Ten distinct provisional packets: seven City
of Victoria, one District of Saanich, two City of Vancouver. Zero accepted tests.**
Victoria remains the pilot. The bounded search found seven Victoria packets with
accessible plans useful for extraction or historical review, three short of a
Victoria-only minimum of ten. The three transfer examples supplement that set;
they do not supply Victoria rules or validate the pilot. Other thin or inaccessible
leads are recorded in the [search/gap ledger](search-gap-ledger.md), not counted.

[cases.json](cases.json) is a research manifest (`public-cases.v1`), not an import
payload, published dataset, source-of-truth rule model, or evaluator request. It
contains primary URLs, one-based PDF page/sheet locators, dates, inspection hashes
where original bytes were available, provenance, measurement bases, unresolved
inputs and grouped application identifiers. Null means unverified, never zero or
permission. Numeric observations are not reviewed measurements.

## Evidence and gap matrix

The labels below describe what was actually opened. A tracker report of approval
is weaker than inspection of the adopted resolution and executed permit. A plan
stamp is not a building permit or evidence of construction. No issued building
permit or as-built verification was established for any packet. Prefab status is
**unknown for all ten**; drawings of conventional materials do not settle it.

| ID / primary record | Opened evidence and precise prospective use | Unsupported / next evidence |
|---|---|---|
| VIC-PC-001: [419/421 Stannard, REZ00787](https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=REZ00787) | Final-stamped C1, received December 2, 2022; October 12, 2023 approval reported. Separate duplex and suite tables support building-role and metric-value extraction. | Executed variance, legal measurement definitions, later DDP01047 modification and supplied placement remain unresolved. |
| VIC-PC-002: [27 Pilot, DPV00081](https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=DPV00081) | Two-sheet revision; tracker reports November 22, 2018 approval. Rear-yard variance and conflicting suite-area labels test uncertainty retention. | Final plan linkage, full conditions and DVP00216's different separation description need reconciliation. |
| VIC-PC-003: [623/625 Avalon, REZ00774](https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=REZ00774) | January 11, 2023 plan stamped approved April 18, 2024; posted 23-086 has blank enactment dates. Tests version evidence and rear-yard ratio basis. | Enacted instrument, final variance conditions and coverage denominator need review. Indexed REZ00744 is not used as the case identifier. |
| VIC-PC-004: [2920/2926 Prior, REZ00708](https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=REZ00708) | Final-labelled plans and draft DPV00151. Tracker says approval October 8, 2020; cover stamp says October 8, 2021. Tests date conflict and draft-versus-issued handling. | Approval year unresolved; draft dates are placeholders. Subdivision and later applications remain grouped. Height material excluded from development tuning. |
| VIC-PC-005: [155 Linden, REZ00507](https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=REZ00507) | Three-page revision packet; handwritten raster site plan with May 16, 2016 receipt. Tests image-dependent extraction and revision provenance. | Council minutes could not be opened; no approval or governing version asserted. Independent transcription required. |
| VIC-PC-006: [1660/1670 Chandler, DPV00282](https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=DPV00282) | Eight-page submission; replacement [DDV00041](https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=DDV00041) is active. Tests alias grouping and blank workflow dates. | An undated permit-issued task label does not establish issuance. Final decision, subdivision and plans unknown. Two proposed lots count as one packet. |
| VIC-PC-007: [229 Government, REZ00589](https://tender.victoria.ca/webapps/ourcity/Prospero/Details.aspx?folderNumber=REZ00589) | Six-page bubbled revision received July 13, 2017. A-2 setback table disagrees with drawing/revision note. Tests stale-table detection. | No final approval verified; resolve drawing conflict before using a setback numerically. |
| SAA-PC-001: [3325 Kingsley, DPR00993](https://saanich.ca.granicus.com/MetaViewer.php?clip_id=770&meta_id=59045&view_id=1) **transfer** | July 4, 2023 staff recommendation, variance table and undated permit copy. Tests proposed GFA exceeding listed limit without inferring permission. | Council outcome, issued permit, complete plans and GFA definition unverified. |
| VAN-PC-001: [825 East 37th, DB451752](https://vancouver.ca/files/cov/may-21-2024-bov-minutes.pdf#page=16) **transfer** | May 21, 2024 board minutes p16 approve a side-yard relaxation while stating development permits are required. Tests approval/issuance separation and imperial units. | Plans, revision and issued permits missing; PDF text verified through web parser, local retrieval 403 and visual review incomplete. |
| VAN-PC-002: [2204 East 38th, DP-2022-00934](https://vancouver.ca/files/cov/november-21-2023-bov-minutes.pdf#page=5) **transfer** | November 21, 2023 minutes pp5–7 preserve initial refusal and conditional appeal allowance. Tests decision chronology and changed rule context. | Complete transition history, plan revision, permits and measurement exclusions missing; visual review incomplete. |

The plan observations, staff/board interpretations and researcher-proposed uses
are separate manifest fields. There is no binary compliance label. Public hearing
and variance records overrepresent exceptional projects. The inventory includes
routine plan extraction opportunities but is not a representative approval/refusal
sample: the verified refusal was overturned, not a final refused case. It is not
evidence of approval rates, feasibility, current law or demand.

## Prioritized review shortlist

These are research priorities, not professional-review estimates or approvals.

1. **VIC-PC-001, Stannard — best first integration candidate.** Start with a
   historical, supplied-placement separation check, not a whole-site result. C1's
   suite table supplies 28.50 m against a listed 2.40 m minimum. Work categories:
   source rights/capture, historical applicability and definitions review, controlled
   plan/site/placement transcription, approval/variance review, scalar binding and
   trace verification. The later modification must be resolved or explicitly excluded
   by a historical cutoff. The duplex pathway must not become ordinary garden-suite
   permission by inference.
2. **VIC-PC-002, Pilot.** Small two-sheet packet with a clear tracker variance and
   a useful area inconsistency. Work categories: obtain final decision/plan linkage,
   reconcile area labels, verify yard definition and preserve the unvaried/varied
   alternatives. Better for uncertainty/exception handling than an immediate pass.
3. **VIC-PC-003, Avalon.** Good received/approved version evidence plus a specific
   rezoning instrument, but its posted enactment fields are blank. Work categories:
   enactment/variance verification, source-version reconciliation and coverage-basis
   review. Do not import a plan's ratio as a reviewed calculation.
4. **SAA-PC-001, Kingsley — transfer only.** Compact staff explanation makes the
   numeric/discretionary boundary reviewable. Work categories: verify Council outcome,
   inspect full plans and GFA definition, and keep Saanich semantics separate.
5. **VIC-PC-004, Prior.** Strong document-status regression candidate rather than
   first scalar fixture. Work categories: reconcile approval-year conflict, obtain
   executed permit, group subdivision/replacement records and isolate height context.

Compared with VIC-059/080/086, these packets add explicit proposed development,
drawing revisions and historical process evidence. The existing pilot leads have
licensed spatial observations, but unresolved principal-building/yard/use/placement
facts (including VIC-059 roofline/year ambiguity, VIC-080 PGA/use/frontage, and
VIC-086's independent facts despite shared zoning bytes). New cases also lack accepted
facts and authorized shared source bundles. Stannard is proposed for a **separate
historical reference**, not as a replacement pilot parcel or evidence that The Landing
fits. Manufacturer revision/options and regulatory-area mapping remain missing.

Before any SR-10 use, an independent reviewer must establish scoped applicability,
exact rule/fact definitions, evidence and compatible alternatives. The current scalar
evaluator does not execute conditions, calculate legal geometry, resolve enactment
history or infer approval. An accepted scalar reference would still not complete
real-site screening, SR-06, publication or the MVP.

## Retention, dependencies and holdouts

Only original research summaries, identifiers, URLs, locators and inspection metadata
are committed. No PDFs, rendered plans, correspondence, full text, personal contact
details, signatures or property-owner names are included. Public site addresses are
kept only to identify/deduplicate applications.

[Victoria's disclaimer](https://www.victoria.ca/legal-disclaimer) restricts reuse and
warns that electronic copies may differ from official versions. Prior's architectural
and survey sheets and Avalon's sheets also reserve rights. Public download access
does not grant redistribution or commercial use. [Vancouver's terms](https://vancouver.ca/your-government/terms-of-use.aspx)
allow some non-commercial record reproduction with conditions; this research does
not assume that grant covers ShovelReady's later use. No packet-specific Saanich
redistribution grant was established. Rights evidence/handling is in the manifest.

PDF hashes identify the bytes inspected temporarily outside the repository; they do
not promise authorized durable storage or a reproducible source bundle. Temporary
inspection copies remain outside the repository: automatic approval review blocked
both bounded cleanup attempts with "blocked by policy" and no more specific reason.
They are not an authorized shared source bundle. Future authorized retrieval
must compare hashes and treat changed bytes as another revision. Web-parser-only
Vancouver sources deliberately have null hashes and no local artifact references.

Every case is provisional, benchmark-ineligible and split-unassigned. Keep all
applications, aliases, revisions, later modifications, shared plans and derived
annotations within the same dependency group. Before splitting, also assess common
rules, designers/templates and shared reports across groups; ten cases do not mean
ten statistically independent tests. Do not mix development and holdout derivatives.
Existing group H (height/average-grade) reservation is unchanged. This packet and
full plans may contain adjacent height/grade material and must not be sent to tuning
prompts. No prompts were tuned, model extraction run, corpus acceptance changed or
expected evaluation outcomes authored.

## Verification and handoff

Run from the repository root, with Python's standard library only:

```powershell
python docs/research/public-cases/verify_inventory.py
```

The verifier checks strict JSON parsing, versions, unique case/application identities,
counts, evidence references/locators, dates, hash shape, required metadata, shortlist,
provisional/split protections and containment/existence of local artifact references.
It performs no network access or database operation and does not establish legal
accuracy. Source access and inspection limits are in the ledger. Runtime, CI, shared
docs and the existing corpus were unchanged. No source files are needed to run the
inventory checker, but rights and independent review remain gates to integration.

Recorded verification: inventory checker passed (10 cases, 21 sources); ten
deliberate malformed-input checks rejected duplicate IDs/JSON keys, cross-case
application duplication, missing source/artifact references, path escape, false
acceptance/current-law claims, premature split assignment and non-finite JSON.
Focused Ruff checks and `git diff --check` passed after formatting the verifier.
No application or database tests were run for this metadata-only change.

Integration review independently spot-checked Stannard C1, the Kingsley staff report
and the November 2023 Vancouver board minutes. Fresh Stannard PDF bytes matched the
inventory hash; visual/text inspection confirmed the table's 28.50 m separation
against its listed 2.40 m minimum, and its received/approved stamps. The stamp fact
now also cites the plan itself. This confirms transcription only, not the legal
measurement basis or applicability. Kingsley remains a recommendation; Vancouver's
2204 East 38th decision retains its conditions. The other seven case packets were
reviewed as metadata, not independently re-audited against every source page.
