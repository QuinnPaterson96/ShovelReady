# Commercial research integration and next steps

October 19, 2026. Research integration only; no application changes or accepted-data publication.

## Decision

Both the [builder-needs research](bc-builder-needs-2026-10/README.md) and [integration feasibility research](cost-fees-rent-listings-2026-10/README.md) support improving the budget/scope conversation before buying feeds or building a general estimator. The next useful outcome is a homeowner and builder understanding what the model price includes, what remains unpriced and who can answer the next question.

## Corrections before reuse

Both workers inspected stale local code at 8cfbe0a. Main at 415420a already contains optional sourced Price and Timing claims in app/model_catalogue/catalogue.py, plus relationship, stage and nextStep in the enquiry. Corrected those contrary claims in the reports. Preserve existing contracts and evaluate existing fields; do not implement duplicate intake or catalogue schemas. Report source dates and historical verification remain intact.

The builder sample contains 17 public sources, including seven transcripts; no recording was independently listened to. Recurrence is evidence of practitioner concerns, not market prevalence, purchase intent or measured savings. Financial source checks include access/licensing and effective-date gaps. Integration does not certify those interpretations for production.

## Proposed next sequence

1. Prepare a small before/after enquiry comparison using the existing demo and incomplete cases. Add only budget scope (building-only / whole-project / unknown), a short included/excluded/unpriced summary and up to three next questions. Reuse existing provider claims and project context. Keep the original enquiry as a comparator. No new API required.
2. Have willing builders/homeowners compare the versions before investing in a full calculator. Product owner arranges separately authorized recruitment. Measure clarity, repeated questions and time; stop or narrow if extra information adds effort without improving the next decision.
3. If useful, implement a bounded optional project-budget draft: sourced price components, editable allowances, package inclusion relationships, tax status and visible missing costs. Show a priced subtotal when incomplete, never an invented installed range. No blocking questions merely to reach first contact.
4. Independently review one municipal fee component using dated authoritative text, credits and applicability. Expand only after reproducible calculation and a useful user need are established; do not build a four-municipality total from mixed schedules.
5. Test rental context offline only if the budget experiment shows demand. StatCan is the strongest documented candidate in this research, but sampled apartment asking rents are not ADU predictions and some house values are unavailable.
6. Defer listing ingestion and property-acquisition ranking. User-supplied addresses/links are enough to test that separate workflow; CREA permitted access, analytics/display rights and total costs remain unresolved.

## Remaining gaps

| Gap | Impact | Next action / owner |
|---|---|---|
| Builder scope/quote validation and participant evidence | Cannot claim installed cost accuracy, reduced sales effort or willingness to pay | Product owner: paired enquiry experiment; manufacturer/cost reviewer: reconcile scope |
| Current municipal fee applicability, credits, waivers and Oak Bay schedule gaps | Automated payable totals would be premature | Municipal-source reviewer: one supported component first |
| Rental representativeness and CMHC reuse uncertainty | No site-specific rent estimate or automatic CMHC redistribution | Rental/data-rights reviewer: validate exact dataset and purpose |
| CREA agreement and derived-use rights | Listing feed/scoring is not ready for implementation | Product owner: validate buyer workflow before pursuing access |
| Servicing capacity/tree evidence | Map observations cannot establish serviceability or tree clearance | Practitioner review of manual map pointers before another adapter |
| Stale-checkout research process | False feature gaps can create duplicate implementation | Future research prompts: record current main revision and verify feature claims against it |

## Integration verification

Reviewed both memos and implementation proposals, checked current catalogue/enquiry contracts, parsed retained JSON and checked local document links and staged whitespace. No app/database tests are warranted for this documentation-only integration. External source verification remains the workers' recorded research, not independent professional review. No outreach, purchase, active catalogue update or deployment configuration change.
