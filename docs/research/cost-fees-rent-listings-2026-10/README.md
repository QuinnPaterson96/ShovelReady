# Costs, fees, rents and listings: integration decision

Research date: **October 16, 2026 (UTC)**. For ShovelReady's product owner and a future builder reviewer. This is a feasibility report, not an appraisal, quote, financing approval or full project determination. All features and experiments remain proposals.

**Start with an editable project-budget worksheet and a short responsibility checklist.** Keep unknown costs visible. The next external data integration worth testing is Statistics Canada's quarterly rental context, after testing whether rental context improves decisions at all. Start municipal fees with reviewed, dated examples and links; defer an automatic four-municipality total. Defer listings ingestion until the buying workflow and the necessary rights are established.

## Priority and decision

Ranks are product judgments. Effort/time estimates assume one contributor and existing local exports, excluding production persistence and external review.

| Rank | Opportunity / decision | Homeowner and builder value | Evidence / access | Effort, operating burden and time to useful result |
|---|---|---|---|---|
| 1 | **Small experiment:** editable capital-budget worksheet, one model, explicit missing lines and unsent questions | High potential: exposes the difference between a factory unit and an installed project; helps builders triage scope | Strong evidence of exclusions; no installed site quote or reuse agreement. Public model facts are a research input, not an authorized feed | Low: approximately 1–2 days for a manually populated review artifact; no paid integration. Recheck each price/configuration before reuse |
| 2 | **Integrate now at research/reference level:** official municipal fee links and date/applicability checklist. **Small experiment:** one reviewed fee component | High potential: avoids materially wrong expectations and duplicate application fees | Strong primary schedules for Victoria, Saanich and Langford; Oak Bay's current base building schedule remains an access gap | Low for links, medium for executable rules. Approximately 2–4 days for a bounded offline fee rehearsal; high continuing amendment/applicability burden |
| 3 | **Small experiment, then conditional integration:** Statistics Canada rent context; CMHC as a separate cross-check | Medium: useful for deciding which questions to ask; limited for a specific small detached suite | Public documented StatCan API actually sampled; clear open licence. Apartment figures are not ADU predictions | Low: approximately 0.5–1 day for an offline import/display experiment; quarterly review, revisions and suppression handling |
| 4 | **Negotiate/access research later:** builder-authorized price/inclusion sheet, or commercial rent data | Potentially high if the builder supplies comparable scopes; commercial rent value unproven | No manufacturer feed found; Rentsync mentions APIs but does not establish access to third-party comparable rents | Medium/high and externally dependent; price and elapsed access time unknown. No provider contacted |
| 5 | **Defer:** active-listing feed, property acquisition ranking and derived feasibility scoring | Low for an owner screening an existing lot; potentially different value for buyers | CREA has documented routes, but ShovelReady has no agreement, member client or test feed. Display access does not establish analytics rights | High contractual and operational burden; useful date unknown. Published technology-provider onboarding alone is CAD $1,500; other costs unresolved |

The evidence and exact official links are in the [source/access matrix](sources.md), [municipal fee review](municipal-fees.md), and [budget prototype and data mapping](budget-prototype-and-mapping.md). See [experiments, blockers and verification](validation-gaps-and-verification.md) before approving implementation.

## Why this fits the current application

The [catalogue contract](../../../app/model_catalogue/catalogue.py) already stores sourced dimensions, provider/configuration/service context, and optional structured `Price` and `Timing` claims. Prices support currency, basis, inclusions/exclusions and tax treatment; timing supports stage, duration, clock start and prerequisites. Reuse these existing claims rather than introducing duplicate provider-price or lead-time contracts. A complete project-budget ledger is a separate proposed capability; the measurement quantity contract should not be repurposed for money.

[BuilderDemo](../../../frontend/src/builder_demo/BuilderDemo.tsx) already accepts free-text budget, timing, access and services; [scenario handoff](../../scenario-handoff.md) exports local evidence. A separate budget draft can extend this journey. User timing, provider lead time and a booked slot remain different facts.

The prior [supply research](../prefab-supply/README.md) and now-available parallel [builder-needs memo](../bc-builder-needs-2026-10/README.md) support testing cost scope and responsibility first. The named chat and memo were consulted read-only; no messages or duplicate interview/media research. Public practitioner statements are not measured demand, and existing builder assessments may already solve the problem.

## Decision-critical limits

1. **Installed cost is incomplete.** No validated quote covers a selected configuration and site. The builder/cost reviewer must establish inclusions, route, foundation, servicing, tax treatment and completion scope before the worksheet can show a complete range.
2. **Fees depend on time and applicability.** Victoria's temporary waiver and CRD's future water charge materially change a naive schedule total. Oak Bay's current building-fee schedule was not fully retrieved. A municipal source reviewer must resolve these before automatic fee totals.
3. **Rents are context.** The sampled StatCan Victoria house series has unavailable values; no inspected source establishes a new ADU's achievable rent. A rental reviewer must supply relevant evidence before property-specific scenarios are called estimates.
4. **Listings rights are unestablished.** The product owner must first validate buying-property demand, then establish a permitted access and use route. A saved user-supplied link can remain a reference without automatically fetching its content.

These gaps do not block a clearly incomplete manual demonstration. They block claims of a dependable installed total, fees payable, property rent prediction or accepted real evaluation. No active application, catalogue, dataset release, deployment, account, payment or provider contact changed.

## Integration correction — October 19, 2026

The original research inspected local baseline `8cfbe0a`, which was older than current main. Integration reviewed `415420a` and corrected the memos: catalogue `Price` and `Timing` contracts already exist, and the enquiry already carries relationship, stage and requested-response context. Historical verification statements describe the original research only. Current-feature gap claims must be rechecked at implementation time. External research is retained as dated, unreviewed evidence; this integration did not independently validate every source, fee interpretation or licence conclusion. See [combined next steps](../commercial-research-integration-2026-10-19.md).
