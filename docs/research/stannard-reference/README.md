# Stannard historical reference candidate

SR-25 / [issue #45](https://github.com/QuinnPaterson96/ShovelReady/issues/45).
Research accessed September 24, 2026; **provisional, zero accepted outcomes**.
The [manifest](manifest.json) separates source transcription, official-record
summaries and researcher interpretation. Source IDs below resolve there to exact
URLs, versions, access methods, locators and hashes where bytes were inspected.

The fixed historical cutoff is **the end of the October 12, 2023 Council meeting**,
using the plans received December 2, 2022. This is a design/decision reference,
not a construction snapshot. Later records inform revision history only. Neither
this design nor the 2025 redesign establishes The Landing's fit.

## What the evidence establishes

Fresh historical plan bytes match inventory source `REZ00787-9`: SHA-256
`f87777a69ec3d3a37a6e182d0decbcaaa6ebef99113677f589441819c6718a78`,
8,423,264 bytes, six pages. Visual inspection of PDF p1/C1 confirms the December
2, 2022 drawing/received date and October 12, 2023 approval stamp. The inventory's
28.50 / 2.40 separation transcription is preserved. Its legal meaning is not
established by the stamp or hash.

The relevant pathway is **R2-65**, created by Bylaw 23-077, rather than treating
C1's existing R1-B label as the approved zone. The downloadable zone sheet
(`zone`, pp1-2) records the October 12 adoption. Section 2.164.1(b) applies Schedule
M to an accessory dwelling as if it were a garden suite and the duplex a
single-family dwelling. Section 2.164.2(a) defines the accessory unit with
foundation, self-contained dwelling and non-strata requirements. The earlier
agenda bylaw (`draft-bylaw`) has adoption blanks; it is not an executed enactment.

Indexed official Council minutes (`minutes`, E.1.a, pp3-4) record adoption and
conditional authorization to issue DP with Variances 000603 against the December
2 plans. Conditions concern car-share security, revised arborist material and
zoning compliance except duplex parking and accessory-building area variances.
The latter increases 37 to 42 m²; it must not replace the suite's distinct 56 m²
table limit. The motion includes a two-year lapse provision if issued. Condition
discharge, an executed 2023 permit and any later extension remain unverified.
Full minutes download returned 403; this is indexed primary-record evidence,
not a visual/full-document audit. These summaries are not independent legal review.

## Chronology and decision levels

| Date | Record and locator | What can be said |
|---|---|---|
| June 8, 2021 | `tracker-REZ00787`, application date | Application received; no approval inferred. |
| December 2, 2022 | `plan`, p1/C1 | Selected design revision, later approval stamp. |
| June 15 / June 29, 2023 | `staff`, pp1,5-6; `cotw`, C.1 | Staff recommendation and committee consideration; not final permit issuance. |
| July 13, 2023 | `clerk`, p1 background | Clerk reports Council instructed bylaw preparation; no legal rights created by that preliminary step. |
| September 14, 2023 | `draft-bylaw`, first page; REZ tracker task | First and second readings recorded; adoption still blank in agenda copy. |
| October 12, 2023 | `minutes`, E.1; `plan`, C1; `zone`, p2 footer | Adopted rezoning and conditional permit authorization reported; historical cutoff. |
| May 27, 2025 | `tracker-DDP01047`, application date/Purpose | Later form-and-character modification linked to DPV00268. |
| June 25 / June 27, 2025 | `later`, p1/A0.0 | Drawing issue / received dates; ten-page replacement packet. |
| July 7 / July 9, 2025 | `later`, p1 stamp / DDP tracker task | Approval stamp / tracker-reported permit issuance, respectively. Distinct events. |
| September 24, 2026 | Current access | Does not establish present entitlement, construction, occupancy or continued permit validity. |

The 2025 project brief says the prefab kit was discontinued and a custom design
substituted. It asserts no change to footprint, dimensions, siting or setbacks
(`later`, pp1-2). That assertion needs reconciliation: C1's rear/side figures
differ from A0.1's figures. A0.1 also lists 980 m² lot area versus C1's 985.6 m²,
while its FSR row uses 1947 as denominator. No numerical correction is inferred.
The July 7 approval stamp and July 9 issuance task do not resolve these issues.
The separately linked June 27 bubbled PDF has different bytes; only metadata was
checked, and it is not substituted for FINAL APPROVED.

## Two proposed assertions; no zoning pass

| Candidate | Exact plan role and transcription | Governing evidence and unresolved work |
|---|---|---|
| Separation | C1 **GARDEN SUITE** table: main-building separation, permitted minimum 2.40, proposed 28.50. Metres are contextual; this row lacks an explicit `(M)`. Duplex table repeats the pair. | Schedule M §2(d), p1 lists 2.4 m between garden suite and single-family dwelling; R2-65 supplies the role substitution. Do not bind the separate accessory-structure row (1.6 m) or building-code limiting-distance drawings to this check. |
| Suite floor area | C1 **GARDEN SUITE** table: combined floor area, permitted maximum 56.00 m², proposed 55.70 m². Separate living-area schedule repeats 55.7 / 600 ft². | Schedule M §4(c) has 37 m²; §5(a), §5(b)(iii) conditionally replace it with 56 m² on a plus site. The 985.6 m² plan label and staff's plus-site description are evidence, not accepted legal lot-area measurements. |

These are proposed **transcription assertions**, not normalized MeasuredFacts or
expected numerical zoning results. Indexed staff p6 corroborates the floor-area
pair and describes separation as greater than 2.40, not independently as 28.50.
The inherited integration spot check confirmed transcription, not legal applicability.

**Separation endpoints:** neither Schedule M §2(d) nor the reviewed zone sheet
specifies how to choose the relevant faces/projections. A search of the downloaded
Schedule A found no standalone separation-space definition. Its p18 setback
definition measures from a lot boundary to a building face with exclusions;
that does not authorize transplanting the method to building-to-building distance.
We lack a reviewed definition of wall/roof/deck/porch endpoints, relevant
projections, and a supplied placement measured under that definition. Do not scale
the raster plan or subtract unrelated dimensions to manufacture the distance.

**Floor-area basis:** Schedule A p2 defines floor Area through interior wall faces,
cantilevered elements and exclusions for required parking/bicycle parking,
balconies/exposed decks/patios/roofs and elevator shafts. Page 20 defines Total
Floor Area through aggregation and an additional exclusion. A reviewer must map
Schedule M's floor area to the correct definition and examine the covered patio,
wall boundaries and all included spaces. C1's gross-looking dimension labels and
headline living area are insufficient. No height/grade calculation is undertaken.

The downloaded Schedule M carries 2017/2019 adoption/amendment annotations; the
zone sheet carries the 2023 adoption footer. They support a historical lead, but
are current downloads, not certified snapshots of all law at the cutoff. Schedule
A explicitly includes 2024 amendments. General regulations (`general`) incorporate
zone/schedule requirements and contain later provisions. The contemporaneous
definition/amendment chain, applicable general restrictions and any overriding
instruments remain incomplete. Today's broader permissions cannot be backdated.

## Why the current evaluator cannot use this packet

At base `24b6cc0`, [the evaluator](../../../app/evaluation/core.py) compares reviewed
direct scalar measurements only. It does not execute geometric definitions, role
substitutions, conditional applicability, dependency references or overrides.
`core.py` explicitly blocks site conditions, applicability conditions/exceptions,
unreviewed sources and unsupported definition bindings; the [contract description](../../evaluation.md)
also requires exact accepted rule and reviewed design/site/placement references.

Separation could eventually have the arithmetic shape `distance >= 2.4 m` once
historical applicability, endpoints, inputs and scope are independently resolved.
Floor area adds the plus-site OR criterion and §5 override of §4; selecting 56
without those semantics is not supported. Resolving a reference's identity does
not implement its meaning. Any future reviewed projection must preserve the full
conditional source rule and prove its scope; stripping conditions to pass the
current engine is not a solution. Permit conditions also remain separate from
arithmetic. This packet supplies no accepted RuleRevision, DesignRevision,
SiteRevision, placement, binding, release or evaluation request.

## Finite independent-review queue

Prioritized for the first separation check, not a prerequisite to delivery:

1. **P0 — Historical authority:** confirm adopted 23-077 and the applicable 2023
   Schedule M/A/general provisions. Available: current hashed copies, indexed
   bylaw and minutes. Missing: authenticated adopted instrument and full amendment
   chain. Record any disagreement and evidence, not just an approval checkbox.
2. **P0 — Distance definition and measurement:** settle endpoints/projections,
   roles and the December 2022 supplied placement; independently reproduce or
   reject 28.50 m. Available: C1 and Schedule M §2(d). Missing: reviewed
   definition-specific measurement and controlled input revisions.
3. **P0 — Permit identity and conditions:** reconcile 000603/DPV00268, obtain the
   executed permit and evidence of condition discharge/lapse/extension. C1's
   combined-side-yard variance request is absent from the indexed adopted
   variance list. Do not treat the requested variance as granted.
4. **P0 — Reuse/retention:** establish permission for durable source snapshots,
   excerpts and any commercial corpus use, including third-party plan rights.
   Available: City Copyright/Electronic Documentation notice and later drawing
   rights notice. Missing: permission scope and authorized evidence storage.
5. **P1 — Optional floor-area check:** confirm plus-site facts and applicable area
   definitions, interior measurement, cantilevers and covered-patio treatment.
   Reconcile the later area/FSR inconsistencies without mixing design revisions.
6. **P1 — Later revision boundary:** inspect executed DDP01047 and verify which
   revised sheets it incorporates; reconcile its unchanged-siting narrative,
   different table values and prefab-to-custom assertion. This can refine history
   without changing the frozen 2023 candidate.
7. **P2 — Independent expected outcome:** only after the relevant preceding gates,
   author a narrowly scoped expected result with reviewer attribution and dissent.
   Separate software verification, legal/source review, publication and actual
   user validation. Building permit/occupancy/as-built facts stay unknown unless
   separately evidenced; none is required to publish this provisional memo.

## Proposed integration corrections (not applied)

- Add the R2-65/Schedule M pathway and distinguish adopted rezoning/conditional
  authorization from executed permit issuance. Retain the 2023 permit identity gap.
- Replace “2025 amendment outcome not inspected” with the precise July 7 plan
  approval / July 9 tracker issuance evidence and remaining execution gaps.
- Qualify prefab status by revision: later applicant brief reports an earlier kit
  and subsequent custom redesign; original manufacturer/configuration unknown.
- Preserve original table values while adding version/measurement conflicts and
  current-download limitations. No accepted benchmark or holdout reclassification.

## Access, rights and stopping boundary

All discovery used public official records, with no account creation, outreach or
paid access. eScribe full-file access failed for minutes 95470, bylaw 92901,
clerk report 93441 and committee minutes 94297 (HTTP 403). Search-index text for
official documents 93451 and 91300 supplied additional leads. The web tool could
not open two trackers; direct public HTTP succeeded. R2-65 text extraction had
broken font mappings; visual rendering was used. Later-plan pypdf extraction
fragmented text; Poppler layout extraction and visual pages resolved the selected
facts. These are access/parser limitations, not evidence that documents are absent.

The [City disclaimer](https://www.victoria.ca/legal-disclaimer) restricts reuse and
states electronic documents are informational copies. Public availability and a
hash do not establish redistribution or durable-retention rights. Only citation
metadata and short factual research summaries are committed. Source PDFs, images,
full text and incidental personal details are excluded; owned inspection scratch
is removed after verification. Re-fetching identical bytes is not guaranteed.
This is the bounded public-discovery shortfall; further review and missing records
remain explicit rather than delaying the packet or inventing a numerical pass.

See [verification](verification.md) for commands, evidence scope and skips.
