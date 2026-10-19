# Validation experiments, blockers and verification

Research date: October 16, 2026 UTC. Recipient: product owner deciding whether to invest, then builders/source reviewers validating a narrow prototype. Status: **report delivered; all software features and experiments below are proposed and unrun**. No outreach or external messages were sent.

## Three prioritized experiments

The sample sizes, thresholds and effort limits below are proposed decision rules, not measured results. Use appropriately authorized/de-identified cases. Recruitment, data access and future contact require their own authorization; these drafts do not initiate it.

### 1. Can financial information fail to add value? Test before building a calculator

**Owner:** product owner with 2–3 willing builder reviewers and approximately6 homeowner review sessions. **Budget:** at most2 contributor-days to prepare and score materials, plus scheduled reviewer time; no paid data. Compare the existing model/site enquiry with the same enquiry plus the incomplete manual budget/responsibility ledger. Counterbalance order, use equivalent cases, and separate time-to-understand from investigation time. Do not manufacture a complete installed estimate to make the enriched version look better.

Measure whether readers identify missing servicing/site scope, distinguish unit price from installed cost, choose an appropriate next step, and save builder clarification time. Ask builders whether their existing free assessment already captures the same facts. Record misunderstanding of the visible priced subtotal or rent benchmark as a product failure, even if users say they like the page.

**Advance signal:** most sessions (proposed ≥4/6) correctly distinguish scope and choose a useful next action, with both participating builders independently identifying a specific enquiry improvement and no increase in material misunderstanding. **Falsification/stop signal:** financial context mainly creates price anchoring, confident but unsupported rental returns, more corrections, or no time/decision benefit over the current free-text enquiry. In that case keep a short scope checklist and defer financial data integration. Do not rationalize failure as a need for more APIs.

### 2. Can one builder bound costs and one municipality supply reproducible fees cheaply?

**Owner:** builder/cost reviewer plus municipal-source reviewer. **Inputs:** 3 permissioned/de-identified past or hypothetical scoped projects, one model family, one municipality first. Request current scope/quote artifacts only when separately authorized. Start with the Saanich component example; no site/customer data is required for the research arithmetic.

Have the builder fill included/excluded responsibilities and range bounds, then reconcile against the fuller quote/works schedule. Independently reconstruct the fee component from the governing text, checking application credit, securities, legal area/valuation and source dates. Record time, unresolved major components and estimate-to-quote differences without treating a three-case sample as a calibrated prediction model.

**Advance signal:** all3 can be represented without double counting, every material unknown is visible, and two reviewers reproduce the same supported fee amount/credit. Set a target of ≤30minutes manual maintenance per already-scoped case; a builder must set an acceptable estimate tolerance in advance rather than this research inventing one. **Failure signal:** inclusions remain contradictory, services stay unbounded, source interpretations differ materially, or maintenance costs exceed saved triage time. Retain manual quotes/authority links; no automatic whole-project range.

Builders specifically need to validate configuration and revision, factory scope, local execution responsibilities, route/lift feasibility, foundation/ground assumptions, private versus authority services, professional/permit scope, quote tax/expiry/escalation, contingency base, final completion/occupancy responsibilities and timing milestones. Software cannot supply these artifacts.

### 3. Does rental or buying context justify its data/rights burden?

**Owner:** product owner with a rental-market reviewer; a future listing-rights reviewer only if buyer demand survives. **Budget:** approximately1 contributor-day for a local artifact and3 decision walkthroughs; no commercial subscriptions or feed development.

Use the retained StatCan example, a CMHC link and an optional user-entered rent scenario. Include a “no usable detached-house value” case. Test whether readers distinguish asking/occupied/turnover averages and CMA/municipal/site geography, and leave their scenario unset when evidence is insufficient. For buyers, compare user-supplied addresses/links with a paper description of a licensed feed; gather no scraped listings. Record which decision actually needs sold data, photos, automatic discovery or batch ranking.

**Advance signal:** all3 distinguish context from a site estimate, and an identified user task demonstrably needs refreshed data that the manual alternative cannot supply. A listing implementation advances only after a separately authorized written scope review establishes the precise permissible agreement/access route, derived-use and deletion terms, coverage and total cost. **Failure signal:** users confuse market averages with ADU income, require unsupported neighbourhood detail, or existing-lot screening works equally well without listings. Keep optional manual scenarios/links and defer the feed. No provider-access test has been performed under this experiment.

## Blockers, conflicts and next actions

| Gap / observed evidence | Practical impact | Next action and owner | Gate |
|---|---|---|---|
| No current configuration/site quote; Jay delivery/crane inclusion contradicts its header | Installed budget cannot have defensible complete bounds or compare suppliers fairly | Builder/manufacturer reviewer obtains a reconciled scope and permissioned pricing sheet after explicit outreach authorization | Numeric prototype completeness / commercial use |
| No controlled delivery/ground/service design or local execution commitment | A geometrically promising placement can still be inaccessible or expensive; map proximity cannot price capacity | Builder + engineer/trade/utility reviewers identify minimum facts and quote/site-visit triggers | Accepted real project investigation |
| Victoria base schedule versus temporary waiver; original DCC rate differs from current guide | An undated calculation could overstate a waived fee or use superseded rates | Municipal-source reviewer reconcile current instruments, receipt/status and rate changes | Executable current fees |
| Saanich Q&A versus fee-schedule fractional-thousand wording; application band boundary gaps; phased DCC tables | Boundary values and effective rates cannot be silently guessed | Municipal-source reviewer confirms rounding, bands and operative amendment/date | Executable Saanich fees |
| Langford calculator timed out; mixed-date fee packet and catchment classes | No tested calculator parity; a sum of visible rates would mix authorities/charging events | Municipal-source reviewer confirm calculator behavior when available, class/catchment and credits | Broader municipal automation |
| Oak Bay current4845 building schedule and complete utility schedule not retrieved; 4952 and4961 later amendments established | Current full Oak Bay fee estimate is blocked; an older schedule cannot fill the gap | Municipal-source reviewer acquire current consolidated/certified fee record; confirm adoption/effective dates and ADU category | Oak Bay fees, not manual demo |
| Oak Bay ACC PDF adoption-year error and overlapping class descriptions | Wrong date/category can materially alter the result | Municipal-source reviewer resolve with authoritative final record; do not select cheapest category | Accepted fee interpretation |
| CRD RWS adopted but delayed until2027; FAQ retains some “proposed” language | Capture date alone cannot determine charge; future timing matters | Regional-source reviewer audit final4658, exemptions/precursor dates before use | Future regional fee calculation |
| Manufacturer guide/API reuse rights absent; tax bulletin retrieval failed | Public prices aren't an authorized maintained feed; no justified default tax treatment | Product owner/source-rights reviewer establishes permission; supplier/tax reviewer establishes tax basis | Commercial automation / complete cost |
| StatCan house values unavailable; no ADU cohort or cell sample size supplied | No property-specific ADU rent prediction justified; unsupported precision risks misdirection | Rental reviewer define comparable evidence; keep benchmark context and user scenarios distinct | Rental estimate, not contextual demo |
| CMHC direct-site terms restrict reuse; indexed portal metadata suggests different licence scope, but portal read returned403 | Commercial permission for specific workbook not established | Rights reviewer verify exact licensed resource or written permission; prefer clear StatCan route initially | CMHC redistribution |
| Rentsync API offer does not establish market-comparables licence or price | Buying an integration may not solve the required rental-data gap | Product owner specify fields/rights first, assess vendor only after experiment3 and separate outreach authorization | Commercial rental integration |
| CREA member/client or non-member agreement absent; internal analytics/retention/media rights unknown | No licensed listing ingestion or acquisition ranking can be assumed | Product owner validate buyer workflow; rights reviewer pursue exact agreement only when authorized | Listing feature |
| No actual builder/homeowner comprehension or savings measured | Priority remains a hypothesis | Product owner run experiment1 before implementing calculations | Product investment |
| Existing accepted source/site/model/rule/publication gates remain open | Financial context cannot confer accepted regulatory evaluation or permit certainty | Existing source/integration owners continue controlled-input and accepted-evaluation work separately | Accepted real evaluation |

## What was actually verified

- Read current README, architecture, quality and reporting standards; historical restart/design decisions; model-catalogue/intake, provider technical/supply and scenario-handoff documentation; strict catalogue contract and BuilderDemo budget/timing/enquiry code. No price/timing support was inferred from the words “budget” alone.
- Read live primary pages and relevant PDF sections as listed in the matrix; followed original/adopted-versus-proposed distinctions. Rendered and visually inspected Victoria waiver p2, Langford building p23, Saanich building p52 and Oak Bay4952 attachment p10 using bundled Poppler. Extracted PDFs using bundled pypdf; rendering corrected no table reading discrepancy. Metadata/hashes for these four captures are in [capture metadata](capture-metadata.json); raw documents and temporary renders are not committed or delivered as licensed source assets.
- Successfully sampled Statistics Canada's public WDS full-table GET and official returned ZIP, inspecting real headers, latest reference period, one-bedroom apartment value and two unavailable house rows. No account/key or personal data used. The [small retained excerpt](statcan-sample.json) preserves raw fields and source attribution. No other provider API or authenticated listing/rental feed was tested.
- Read CREA production public documentation's embedded OpenAPI. Read current linked rules and official published technology pricing; did not mistake documentation examples for actual listing access or a published schema field for a populated feed entitlement.
- Ordinary public retrievals that failed are recorded: Oak Bay current base schedules/main-site403, CMHC Open Government portal403, Victoria eScribe403, Langford calculator timeout, obsolete aux services-PDF404 and PST bulletin502. No anti-bot bypass, account creation, form submission, restricted scraping, credential request, purchase or provider contact performed.
- Consulted the named parallel builder-needs chat read-only while in progress, then read its available [decision memo](../bc-builder-needs-2026-10/README.md). It corroborates the scope-first experiment, based on public practitioner material rather than actual ShovelReady user validation. No other chat was messaged.

## Repository and handoff checks

Starting tracked base: `8cfbe0a8147f00fef8da7df7c7d70e1967ccc0f6`. The shared checkout already had unrelated changes in AGENTS.md, README.md, docs/quality.md, an untracked reporting standard and other research directories. This task owns **only this new unique research directory** and preserves those changes. No commit, push or PR was requested or created; no identity/authentication operation was needed. There is no database, runtime interface, configuration, migration, active catalogue or release change.

Documentation-only verification uses JSON parsing, internal-link/anchor checks, scoped whitespace inspection, source/arithmetic review and final status inspection. Exact results are recorded below after the final check. Application/DB/frontend tests and CI are **not run**: no executable application change, and repository rules prohibit blindly running historical tests against unisolated databases. No claim of independent legal/source acceptance, accepted data publication, actual quotes or real-user validation is made.

### Final check record

From the ShovelReady checkout, the final local Python documentation check parsed **2 JSON files**, inspected **5 Markdown files**, resolved **19 internal links/anchors**, checked trailing whitespace, placeholders and web-token leakage, and independently verified the fee/rent arithmetic and the retained sample's missing-versus-numeric values: **zero errors**. `git diff --check -- docs/research/cost-fees-rent-listings-2026-10` emitted no error, but does not inspect untracked files; the explicit Python checks cover these new files. `git status --short` showed this task's new directory plus unrelated existing changes and the parallel builder-needs directory. No tracked file was edited by this task. This final check record is a documentation edit after that check, not a new software or source-validation claim.

## Integration correction — October 19, 2026

The original research inspected local baseline `8cfbe0a`, which was older than current main. Integration reviewed `415420a` and corrected the memos: catalogue `Price` and `Timing` contracts already exist, and the enquiry already carries relationship, stage and requested-response context. Historical verification statements describe the original research only. Current-feature gap claims must be rechecked at implementation time. External research is retained as dated, unreviewed evidence; this integration did not independently validate every source, fee interpretation or licence conclusion. See [combined next steps](../commercial-research-integration-2026-10-19.md).
