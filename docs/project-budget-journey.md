# Homeowner budget journey — review handoff

October 23, 2026. Follow-up [#327](https://github.com/QuinnPaterson96/ShovelReady/issues/327)
to merged PR #326, based on `a573522715894e66f5c976f377b0004320ff3420`.
Implemented for review, not merged or deployed. No provider contact or enquiry submission.

## Implemented

The existing mounted assessment now connects model, property, placement, optional
budget and unsent enquiry. Budget uses the existing `project_budget` calculation,
strict import boundary and catalogue Price/Timing. Its navigation entry remains
optional without a completion gate. A spending preference is free text, never a
calculation input or affordability decision. The summary separately names priced
components and material unpriced work; starting prices have no finite upper bound.
Workings, sources and cost editing remain expandable. Continue appears beside the
summary, before those details. No installed-cost, tax or contingency default was added.

The current walkthrough controller gains one explicit Next/Back budget stop, making
six narrated stages (seven stops because placement has two positions). It takes
longer by one user-paced stop; there is no timed advance. Skip still reaches the
placement result; users can then continue through budget or take over. The demo
adopts only the existing October 6 Model 300 CAD 187,000 starting-price claim and
labels whole-project scope as demo setup. Spending preference, site work and
allowances are empty. Edits cancel playback; Back/Next does not reseed the draft.

The prior walkthrough used VIC-087, not the requested 419 Cecelia property. The
saved example now copies the existing `cecelia-geometry.fixture.json` site capture,
including both rooflines and original source provenance. The same assessment
controller and entry actions use it; no parallel demo flow was created. Municipal
requests now use its captured parcel reference 10573. The illustrative initial
centre (471913, 5365834) overlaps the mapped house; the retained moved centre
(471906.5401536183, 5365824.096762222) is inside the parcel and separate from both
rooflines under the real geometry API. This does not establish legal boundaries,
access, residential suitability or zoning permission. Street context stays unknown.

The builder enquiry now has one short cost paragraph and up to three financial
questions, reconciled with existing plans, installation and timing questions.
Included user allowances identify their category and amount; public provider claims
retain a source link and capture date. Full diagnostics remain in the supporting
report and technical JSON/ZIP, rather than the first-contact paragraph.

## Decisions and recovery

- Retain conservative cost invalidation: the existing context has no dependable
  per-line dependencies. Model/configuration/property/placement/use changes withhold
  old amounts, including after switching back. Preference and selected cost scope
  survive; original claims and recheck reasons remain recoverable. Same-tab
  navigation without edits preserves the budget. Reconsider finer dependencies only
  with explicit scope evidence; do not guess which site quote remains applicable.
- Model and price configuration descriptions are free text. No equality between
  those two descriptions was added. A model-level offer stays a bounded reference
  to its original configuration; custom project preferences still need a matching
  quote. No financial ontology or catalogue schema change.
- Keep existing local persistence: assessment state is memory-only. Save budget
  JSON before reload. Existing session recovery retains previous enquiry/report/
  evidence text, not a live evaluation. Importing the saved budget into a different
  scenario validates it atomically and withholds old costs. Owner preference is in
  the recovered enquiry text, not automatically restored into the current input.

## One municipal component

Only Victoria's building-permit fee is considered. [Bylaw 26-020](https://www.victoria.ca/media/file/development-fee-waiver-bylaw)
was rechecked October 23: its temporary waiver depends on complete City acceptance
after adoption January 29, 2026 through repeal January 29, 2027, with application
status conditions. Unknown receipt/status never yields zero. The [linked base
consolidation](https://www.victoria.ca/media/file/building-and-plumbing-regulation-bylaw-17-113-consolidated)
is dated April 27, 2023; later amendments are not independently certified.

No fee arithmetic is active. City receipt/status and accepted construction
valuation are absent; professional/affordable-housing reductions, application
payments and cancellation refunds have conditions. The provider starting price
does not supply section 19(9)'s valuation. Nothing is added as a charge or credit.
The UI shows the official reference and the exact unanswered question; evidence
keeps revision, capture, null inputs, null amount and conditions. This reference is
limited to the saved Victoria example or a selected live Victoria address; manual
or unknown jurisdictions do not inherit it. No waiver of other charges is inferred.
Retained official bytes and hashes are in [verification](budget-journey-verification/README.md).

## Verified and separate gates

[Verification](budget-journey-verification/README.md) records integration tests,
browser recovery, desktop/mobile/keyboard, generated outputs and the agent audit.
[Same-facts comparison](samples/budget-journey/comparison.html) uses actual PR #326
before text: 435 words before, 348 after (20% shorter), with identical source/model,
preference and synthetic allowance facts. This is agent inspection, not participant
evidence, independent source acceptance or accepted publication. There are no new
dependencies, HTTP financial APIs, accounts, database changes or cloud resources.

| Remaining gap | Practical impact | Next action / owner |
|---|---|---|
| Matching current manufacturer configuration/quote, site access/foundation/services and tax scope | Installed total stays unavailable; the incomplete enquiry remains usable | Manufacturer, property contact and qualified cost/site reviewers, #124/#125 |
| City-accepted application receipt/status, valuation and source-currentness review | Building-permit fee remains an unresolved reference, not a payable amount | City/qualified municipal-source reviewer, tracked under #327; independent acceptance remains separate |
| Conservative dependencies and memory-only assessment | Material edits require cost re-entry; reload needs saved JSON and reselected property/model; preference must be copied from recovery text | Product owner: assess this friction after the bounded study; no new storage is proposed here |
| Actual homeowner/builder comprehension and commercial usefulness | No measured time saved, lead quality or willingness to pay | Quinn/product owner, separately authorized studies #16/#147 |
| Raster PDF and sparse spillover page | Text PDF accessibility/search remains limited and some messages use an extra page; text/Markdown/evidence alternatives work | Export owner #205; preserve overlap with open PR #298, no PDF redesign in this slice |
| Unreviewed source/site data and accepted regulatory release | Demo observations cannot establish accepted real evaluation | Source/publication owners under existing #124/#125 and rule/publication gates |

These are input/acceptance and validation gaps, not blockers to using the incomplete
demo. Review and final-head CI precede any separate merge/deployment decision.
