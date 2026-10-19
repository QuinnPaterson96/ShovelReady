# BC builder needs: which enquiries deserve the next conversation?

Research decision memo · October 16, 2026 · Research only; no product or catalogue changes.

For Quinn, deciding the next inexpensive ShovelReady experiment. **Prioritize a clearer site-work and cost-scope handoff, then test whether builders actually save a round of questioning.** The evidence supports preparing a better conversation more strongly than automatically accepting or rejecting a lead. Do not buy data or expand municipal coverage before testing that distinction.

The bounded sample contains 17 substantive public sources, including seven published podcast transcripts and ten written sources, across 15 conservatively grouped practitioner/business clusters. Eight sources concern Vancouver Island practitioners directly. One large developer provides a comparison, rather than setting the product direction. These are purposively selected public statements, often promotional, not a market survey or willingness-to-pay study. No recording was independently listened to or watched. See the [evidence matrix](evidence.md), [integration assessment](integrations.md), and [method and verification](verification.md).

## Ranked opportunities

Rank is a judgment about this product, not a numeric market score. Effort means relative implementation and maintenance burden, not a quoted development estimate. Evidence strength concerns the problem; demand for ShovelReady remains untested in every row.

| Rank / action | Opportunity | User/business value hypothesis | Evidence strength | Near-term effort | Data readiness / fit |
|---|---|---|---|---|---|
| 1 · Improve now | Make budget scope explicit: building price versus whole project, with unresolved site costs | Avoid spending a sales conversation correcting what a starting price includes | Strong recurrence across small builders, designers and manufacturers; no measured conversion benefit | Low for labels and a short editable checklist; high for reliable numeric estimates | No external API needed; very close to existing budget field and catalogue exclusions |
| 2 · Test with builders | Turn access/services notes into a small set of next questions with a responsible person | Reduce repeated requests and reveal the right next professional before a quote | Strong recurrence; directly described coordination work | Low for an optional handoff; do not build workflow software | User/provider facts are available; service capacity and crane suitability are not |
| 3 · Test with builders | Let an incomplete enquiry request a call or assessment, with goal and project stage visible | Preserve worthwhile leads whose owners cannot supply technical facts | Moderate direct support for consultation and human fit; weak evidence for a software purchase | Low; current partial-enquiry flow already exists | No new data needed; this is refinement/validation, not a new intake product |
| 4 · Research an integration | Add narrowly labelled Victoria servicing observations; investigate tree evidence separately | Help a builder decide which records/site questions to investigate next | Strong problem evidence; only inferred demand for map automation | Medium: rights, joins, freshness, failure modes and upkeep | Sewer API and licence association verified; capacity not available. Replacement-tree layer is inadequate for a general tree check |

### 1. Clarify cost scope before offering a total

**Direct evidence:** Backyard Bungalows conditions even a general cost guideline on an assessment (S01). DOS/Newcombe describe scope/budget alignment and omitted costs (S06). Nikari describes drawing takeoff, trade quotes and existing budget software (S07). Oak Bay Construction warns that generic calculators overlook site conditions and fixed costs (S10). These support a cost-scope conversation, not a universal price model.

**Verified current gap:** `BuilderDemo.tsx` has an optional free-text budget; catalogue installation notes already distinguish excluded site work. The inspected journey has no explicit answer to whether the supplied budget includes foundations, services, transport/lift, design/permits, tax and contingency. Do not present those existing exclusions as a newly discovered feature opportunity.

**Minimum useful change — inference:** beside the existing budget, offer an optional “Does this cover the building only or the whole project?” answer, including “not sure.” Carry a compact included/excluded/unknown scope list into the enquiry. Leave amounts blank unless supplied or specifically dated and approved by the provider; avoid adding incomparable prices from public websites.

**Beneficiary/payer hypothesis:** homeowners avoid a mistaken premise; manufacturer or design-builder might pay if staff demonstrably need fewer corrective conversations. No source requests this software or establishes a subscription budget.

**Acceptance outcome:** reader distinguishes starting/product price from a supplied whole-project budget; unresolved costs remain visible and do not become zero. Cheapest falsification: Experiment 1 below.

**Feasibility:** existing frontend/local export can carry this information; no implementation performed. Reliable all-in estimating is not verified feasible from the researched data.

### 2. Make the next site question answerable

**Direct evidence:** Hewing Haus requires crane access and coordinated power/water/sewer preparation (S02). MAC/Nexus describe urban access and a local project coordinator (S11). Newlines sells the property-side work around an aux box installation (S12). DOS/Newcombe describe information handoffs and a single point person (S06). These are concrete services and repeated work, though no measured time series is supplied.

**Verified current gap:** access and services are free text; the enquiry already asks generic foundation, crane and utility questions. The separate evidence checklist already names missing evidence and next actions. The incremental gap is a short provider-appropriate request and agreed responsibility, not the absence of a checklist.

**Minimum useful change — inference:** optional prompts for known access obstacles, sewer versus septic/unknown, existing records/photos available, and who will coordinate the next assessment. Keep “unknown” valid. Produce no more than three material requests, each with who can answer: homeowner photo/known fact; builder or crane contractor site review; municipal servicing or electrical professional assessment. Allow corrections and omissions. A long document-collection gate would defeat first contact.

**Beneficiary/payer hypothesis:** manufacturer sales team and local installation partner; payment could sit with the party doing recurring triage, not necessarily the homeowner. MAC/Nexus is evidence that bundled coordination is offered, not that it would buy a separate SaaS product.

**Acceptance outcome:** a recipient knows what it must establish next, without reconstructing the app or mistaking a mapped line for a connection approval. Cheapest falsification: Experiment 1, with the case-level missing-question count.

**Feasibility:** local questions/export require no external integration. Public sources do not establish an automatic crane envelope, service capacity or geotechnical answer.

### 3. Preserve the useful early conversation

**Direct evidence:** aux box starts with a discovery call and subsequently visits the property (S13); Backyard Bungalows offers a complimentary assessment (S01); Kemp offers a complimentary visit (S04). Newcombe explicitly recommends meeting, rather than merely requesting a price (S06). Financing and family/property relationships matter in Smallworks/Bell accounts (S03/S17), but their 2021 details are not current lending guidance.

**Verified current gap:** use/timing/budget and a free question already exist, and users can prepare an enquiry with placement unknown. Integration correction: current main already carries project relationship, stage and requested-next-step context. Reuse and evaluate these inputs rather than adding duplicate questions; their benefit still needs recipient validation. A generic “readiness score” is unjustified.

**Minimum useful change — inference:** test optional “exploring / have a site / have plans” and “owner / family property / considering purchase / other” context, with a chosen next step such as call versus assessment information. Reuse the existing unsent export and official contact route. Never block a lead because survey, finance or placement is unknown.

**Beneficiary/payer hypothesis:** builder staff and homeowners; first prove the existing partial-enquiry flow is useful. An established builder may prefer its current phone process and pay nothing.

**Acceptance outcome:** an incomplete but legitimate enquiry reaches a sensible next conversation, with no unsupported disqualification and no hidden technical prerequisites. Cheapest falsification: Experiment 2.

**Feasibility:** no external API necessary. Automated financing eligibility, shared-title advice and lender referral economics are unverified and outside this minimum change.

### 4. Use maps to prepare investigation, not approve servicing

**Direct evidence:** site services/access affect assessment and price in S01/S02/S09/S10/S11. OG Prefab specifically identifies trees and servicing as design drivers (S09); it is a supplier's account, not independently verified prevalence. No practitioner here directly requests a Victoria GIS API integration.

**Verified current gap:** the municipal adapter reads the Land service for parcel/roofline observations. It does not fetch the sewer/water/storm or replacement-tree services assessed here. Current comparisons are conditional/unreviewed; there is no accepted zoning release. Municipal expansion is already under research and should not be re-proposed as if absent.

**Minimum useful change — inference:** first attach a municipal map/record pointer to a manually prepared case. If that changes a builder's next action, consider one source-attributed sewer-lateral observation. Keep capacity, condition, private routing, invert levels, permissions and price explicitly unestablished. Treat tree evidence as a separate question, not a green “no trees” result.

**Beneficiary/payer hypothesis:** local builder or site-preparation coordinator; more plausible for repeated local cases than a one-off homeowner. Data readiness alone does not establish commercial value.

**Acceptance outcome:** recipient correctly states what the observation establishes and identifies the person/record needed next. Missing or unavailable map data produces an unknown, never a serviceable-site result. Cheapest falsification: Experiment 3.

**Feasibility:** metadata, empty-result query behavior and exact sewer/tree licence links were inspected; no occupied-property query or app integration was built. See [access, costs and operational limits](integrations.md).

## Exactly three prioritized inexpensive experiments

These are proposed protocols and decision thresholds, not completed studies or predicted ROI. Recruitment/contact requires a separate authorized task; none occurred here. Quinn owns deciding whether to run them.

1. **Paired enquiry review before code.** Recruit three relevant practitioners, including an Island garden-suite builder and a prefab/local-installation party. Use four public or consented scenarios per practitioner, with incomplete and difficult sites. Counterbalance current export versus a manually edited version covering opportunities 1–2; keep factual content comparable. Record triage time, questions asked again, next action and any changed exclusion. Continue if at least two practitioners prefer the revised handoff, the median repeated-question count falls, and no viable lead is incorrectly rejected because of the added wording. Fail/narrow if it adds reading time without removing a question, or recipients reconstruct the packet anyway. A hypothetical paid-pilot discussion can follow demonstrated usefulness; preference is not payment evidence.
2. **Incomplete-lead journey against the current phone route.** With five consenting prospective users, compare preparation of a partial enquiry against following the provider's existing public contact instructions, without actually sending either. Include unknown budget/services and family-owned property. Record completion/abandonment, invented answers and the next step participants think is available. Continue only if at least four can make a useful enquiry without inventing technical facts and the added stage/relationship context helps the reviewing builder choose a next action in at least three cases. Fail if the extra form work obstructs the call, creates false confidence, or adds context builders disregard. Test the already implemented flow before adding fields.
3. **Manual data-value test on five Victoria cases.** Prepare two versions of each case: existing evidence versus existing evidence plus manually verified municipal servicing pointers and an explicit tree-evidence gap. Have a local practitioner state the next action and missing evidence before/after. Continue toward a narrow adapter only if useful action changes occur in at least three cases, no reviewer infers capacity/tree clearance, and preparation/update effort fits a maintenance ceiling Quinn sets before the test. Fail if the map adds no useful question, needs a site visit anyway without improving preparation, or creates an unsupported pass. Record retrieval, review and correction minutes separately; do not invent dollar savings.

## Evidence against the thesis and commercial limits

- **Existing intake may be enough.** Free assessments, discovery calls and local coordination are already offered (S01/S04/S11–S13). ShovelReady must improve that process, not assume there is a missing service.
- **Trust can outweigh data completeness.** Newcombe recommends meeting; Nikari brings the project manager into meetings and already uses Buildxact plus client communications (S06/S07). More automation may be unwelcome.
- **Site economics cannot be screened away.** Xquimalt describes funding, density, buyer needs and neighbourhood constraints together (S16). Wesgroup supplies a broader approvals/fees comparison (S08). Aryze's advocacy concerns family housing and policy, not demand for a prefab widget (S14).
- **Prefab is not one delivery method.** Smallworks describes panelization and hassle with larger modules (S03); MAC/Nexus promote volumetric delivery (S11). A constrained modular lead may merit a different construction conversation; do not automatically reject the property.
- **Evidence of effort is not evidence of software spend.** Trade quotes, takeoff software, staff coordination, site visits, deposits and paid professional work appear in accounts. No source supplies attributable ShovelReady willingness to pay, lead rejection rates, conversion lift, or unit economics. Public marketing and successful-project stories omit failed enquiries and customer acquisition cost.

## What not to build from this sample

- A province-wide automated feasibility verdict, lead score or automatic lead rejection.
- A generic all-in cost/ROI/rental-return calculator using mixed public price ranges.
- Automated service-capacity, crane-lift, geotechnical or protected-tree clearance from maps.
- A replacement for Buildxact, a construction CRM, consultant marketplace, lender-underwriting product or title/legal interpretation engine.
- A missing-middle pro forma platform merely because larger redevelopment pain is visible. MMS's sale-versus-development service is an adjacent commercial direction worth a separate customer-discovery decision, not a fit assumption for Model 300.

## Remaining gaps and next owners

| Missing evidence | Practical impact | Next action / owner |
|---|---|---|
| Real intake comparisons, rejected leads and payment behavior | Cannot claim saved sales time or a viable paid product | Quinn: authorize Experiment 1 before feature investment |
| Recent Island recording content with inspectable transcript | Island evidence leans on written practitioner accounts; transcript sample is Lower Mainland-heavy | Research owner: seek an already public transcript or listen to the logged Emerson recording in a separately bounded follow-up |
| Independent validation of vendor claims, project prices and permit interpretations | Findings describe needs; cannot supply legal rules, defaults or market prices | Source/data reviewer: review any claim proposed for product reuse; do not import this report into the active catalogue |
| Exact private-site services, tree inventory, access and controlled design | Blocks accepted real evaluation, although a partial demonstration/enquiry remains usable | Property contact, relevant professionals and manufacturer: supply/review the case-specific evidence |
| Municipal feed freshness/coverage and additional layer rights | A promising API is not production-ready evidence coverage | Data integration owner: run Experiment 3, then document layer-by-layer rights, failure behavior and update burden |
| Existing accepted-rule/currentness gates | Product cannot claim accepted legal compatibility | Existing source-review/publication owner: resolve the documented conditional-zoning gaps independently of this research |

Delivered: research and proportionate document/metadata verification. Proposed: every product change and experiment above. No implementation, outreach, form submission, private-group access, deployment, commit or PR was performed.

## Integration correction — October 19, 2026

The original research inspected local baseline `8cfbe0a`, which was older than current main. Integration reviewed `415420a` and corrected the memos: catalogue `Price` and `Timing` contracts already exist, and the enquiry already carries relationship, stage and requested-response context. Historical verification statements describe the original research only. Current-feature gap claims must be rechecked at implementation time. External research is retained as dated, unreviewed evidence; this integration did not independently validate every source, fee interpretation or licence conclusion. See [combined next steps](../commercial-research-integration-2026-10-19.md).
