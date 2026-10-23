# Optional project budget scope prototype

The [October 23 journey follow-up](project-budget-journey.md) supersedes the UI
entry and walkthrough descriptions below. The original draft/calculation contract
and historical verification remain intact. Budget is now an optional stage before
enquiry; the walkthrough uses captured 419 Cecelia geometry and one priced component.

October 19, 2026. Parent [#320](https://github.com/QuinnPaterson96/ShovelReady/issues/320),
implementation [#321–#325](https://github.com/QuinnPaterson96/ShovelReady/issues/321).
Based on main `86ddb42` including the integrated commercial research in PR #319.
This is a preliminary conversation aid, not an installed-cost estimator or accepted
catalogue publication. No provider contact, deployment or paid service is involved.

## Recipient and decision

The homeowner should see the difference between their affordability preference,
a provider starting price and the scope still needing a price. A builder should
identify the project and next useful conversation without decoding a ledger.
Keep the first-contact draft concise; full cost/source records travel in the
secondary evidence package. Unknown financial answers never prevent contact.
The user-supplied reporting standard governs the assembled enquiry. It was read
from the primary checkout; that unrelated uncommitted document is preserved there
and is not swept into this branch.

## Implemented boundaries

```text
existing catalogue Price + source        user allowance / quote fact
                  \                     /
                explicit intake + strict validation
                           |
                 project-budget.draft.v1
                           |
              deterministic decimal calculation
                           |
          optional assessment / enquiry / evidence export
```

Ordinary TypeScript modules live in `frontend/src/project_budget` because the
canonical journey and its scenario/export state already live in the browser.
This avoids an extra HTTP contract or a parallel Python financial implementation.
There is no new database, runtime service or background refresh. Existing
catalogue `Price`, `Timing`, model selection and enquiry relationship/stage/nextStep
remain authoritative for their existing responsibilities. No catalogue/schema
files, accepted datasets, deployment settings or dependencies change.

`contract.ts` exports the typed draft, reusable JSON schema, strict parser and
decimal primitives. `pipeline.ts` owns catalogue/manual intake, reconciliation,
calculation, recipient summaries, next questions and evidence serialization.
`BudgetSection.tsx` owns local controls only. Calculation does not read the DOM,
make network requests or execute source expressions. Full evidence uses an
additive optional `project_budget` field in the existing `builder-evidence.v1`
envelope and therefore travels with the existing ZIP and technical JSON exports.

### Small draft contract

The draft records scope (`building`, `whole_project`, `not_sure`) and at most 80
cost records. The supported slots are building, upgrades, delivery/lift,
foundation/site work, services, professional work, fees, tax and contingency.
Each line retains:

- State: priced, included in another line, unpriced/unknown, or not applicable.
  Included and not-applicable entries require a rationale.
- Original currency (nullable), decimal minimum/maximum strings and declared
  precision. Up to 18 integer digits and six decimal places are supported;
  scientific notation, negative amounts and ordered-range violations are rejected.
  Zero is an explicit amount. A missing maximum stays unbounded.
- Price basis: catalogue starting/fixed/estimated, user allowance or user-entered
  quote fact. Origin and basis must agree; every origin remains unreviewed. Tax
  included/excluded/unknown is explicit; free-text tax wording never resolves it.
- Source/provider, meaningful label, locator, capture/effective/expiry dates when
  supplied, separate intake date, original record, inclusions/exclusions and tax
  basis. Catalogue raw evidence retains the existing claim, source, model/revision,
  configuration and snapshot identity without inventing a price-effective date.
- Model, snapshot, manufacturer revision, configuration, property and scenario
  context, a persistent recheck reason and alternative/inclusion relationships.
  Technical identifiers and original records remain in secondary disclosure/export.
- Capital-cost versus refundable-security treatment. Refundable deposits/security
  are explicitly withheld as separate unsupported cash requirements; the prototype
  does not calculate refunds, credits or cash timing.

An imported JSON record is untrusted input, including the original-record string.
That string is retained as evidence, never interpreted as instructions or used to
populate editor state. Structural validation does not establish source authenticity.

### Intake and refresh

In the canonical assessment, open **Prepare enquiry → Budget and cost scope**.
Choose the scope, then **Use a captured model price** to explicitly adopt an existing
Price claim. Model 300's existing October 6 capture supplies a CAD 187,000 starting
price; it is not newly imported from the October 16 research report. Models without
captured prices stay unknown. The C.H. Studio Pod's missing currency stays unknown.
Manual entry accepts allowances or quote facts, source/date/scope details and explicit
amount bounds. One stated amount creates equal low/high amounts; minimum-only and
an empty range upper amount retain no finite upper bound.

Saving a manual entry selects that category's new line and retains a prior provider
claim as an unselected alternative. Selecting another catalogue suggestion similarly
chooses one building offer. Arbitrary imported multiple selected entries in a category
are withheld until reconciled; this slice does not infer disjoint package breakdowns.
Both active alternatives in the same alternative group are also withheld.

**Full cost evidence and local draft file** downloads the reusable JSON draft.
Import a saved JSON file (at most 1 MB) or paste JSON and select **Validate and replace
budget draft**. Validation finishes before replacement. A malformed import leaves
the previous valid draft and catalogue untouched. This is local draft intake, never
catalogue publication. Keep private quote details out of shared packages unless
sharing them is intended. The draft itself is in memory; reload recovery requires
the saved JSON. Existing enquiry recovery remains available separately.

Re-enter or replace affected costs after a model/configuration/property/scenario
change; the old record remains inspectable and excluded even after switching back.
Owner budget text and chosen scope survive ordinary property/model edits. Entering
the explicitly replacing guided example resets the assessment, as before.
Pending cost edits are closed on context changes. Imported drafts also reconcile
against the latest context before use.

Recency is an explicit prototype policy: catalogue captures over 90 days old, missing
capture dates, future source/effective dates and expired offers are withheld. This
is a refresh threshold, not a professional opinion about contractual validity.
Effective-date and expiry gaps remain unknown in evidence. There is no automatic
refresh. Update an existing catalogue claim through its existing reviewed intake
process, then explicitly select the updated suggestion; or enter a dated quote fact.
Selection does not independently validate a provider's configuration or region.
Custom project configurations and provider-wide claims are withheld pending a matching
offer. All public model configurations remain controlled-design/scope gaps.

### Calculation and limits

Amounts are added using integer decimal arithmetic at the maximum input precision,
without binary floating point. Each original currency has a separate subtotal;
missing currency never enters a subtotal and no FX is attempted. A fixed catalogue
single-amount claim can normalize to equal endpoints while preserving its original
null maximum in evidence. A starting claim always has no finite upper amount, even
if an input supplies a maximum.

Whole-project and Not-sure views list all nine slots. Building-only covers building,
upgrades, tax and contingency and explicitly excludes the remaining site/project work.
Included work references a selected usable priced parent in another category and adds
no second charge. Missing/circular links, identical inclusion/exclusion wording,
explicit known category exclusions, duplicate category entries and incompatible
selected packages stay unresolved. The small category/exclusion alias list is a
conservative conflict check, not semantic source interpretation; an unfamiliar
scope needs human reconciliation.

A complete scenario range requires a known scope, every relevant slot bounded,
included or explicitly not applicable, one currency, stated tax treatment and no
excluded/conflicting/stale entries. Otherwise the result is a **priced-components
subtotal**, with unpriced categories and absent upper bounds visible. Complete means
complete only under the supplied scope and assumptions; it is neither a quote
guarantee nor a probability interval. No default tax/contingency rates, site-work
prices, affordability verdict, financing, rent, ROI or underwriting are supplied.

An independently priced component explicitly included in another priced package is
withheld until its relationship is reconciled. Tax notes alone never resolve tax
status. Separate tax on tax-inclusive work is withheld, and mixed included/excluded
tax treatments need a confirmed combined scope before a complete range; no tax
apportionment is attempted.

The optional cost section generates up to three financial next questions, identifying
the builder/provider, homeowner or qualified site/utility reviewer. Existing technical
enquiry questions remain; the duplicated generic price question is omitted when the
budget section supplies it. The unchanged free-text owner budget is never parsed into
a confirmed amount, currency or cost estimate.

## Reproduction and comparison

From a clean checkout, `python -m uv sync --locked` and `npm ci` in `frontend`.
No database variables are required. From the root, start:

```powershell
python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8017
```

From `frontend`, in another terminal:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187
```

Run the offline checks and on-demand browser verifier from `frontend`:

```powershell
npm test
npm run typecheck
npm run build
node --import tsx tools/budget_comparison.ts
$env:WALKTHROUGH_URL='http://127.0.0.1:5187'
$env:WALKTHROUGH_API='http://127.0.0.1:8017'
$env:WALKTHROUGH_BROWSER='msedge'
node tools/budget_browser.mjs
```

The browser script uses installed Edge by default; an installed Playwright Chromium
channel can be selected explicitly. It permits local app/API requests only, blocks
municipal boundaries and never opens a provider site, sends enquiries or runs live
model calls. The PDF/ZIP and screenshots are real browser downloads/captures.
See [retained verification](budget-verification/README.md).

The [paired comparison](samples/budget-scope/comparison.html) records the same input
case and the unchanged baseline enquiry path with budget omitted versus the optional
structured draft. Both receive the same captured model facts, whole-project owner
preference and synthetic CAD 2,500.25 delivery/lift allowance. Independent arithmetic
is CAD 187,000 + CAD 2,500.25 = CAD 189,500.25, with no finite upper bound. The retained
JSON distinguishes source facts from synthetic assumptions. The comparison's blank
study prompts save/transmit nothing. This is prepared material, not a completed study.

## Future seams and ownership

A future reviewed municipal-fee adapter would emit the same validated cost item with
dated authority/source, applicability, charging event and calculation evidence after
that narrow source boundary is established. No fee formula or research fee is active.
Rental context belongs in a separate future context/owner-scenario contract; it must
not be inserted as a capital cost. Neither adapter is implemented here.

This worker owns the new budget modules, narrow BuilderDemo/manufacturer/evidence
connections, one App stylesheet import and budget docs/tools. No parallel edits were
delegated. Open PR #298 also touches enquiry/export controls; main already contains
its current contracts, which this change preserves. Reconcile both diffs at integration.

| Remaining gap | Practical impact | Next action / owner |
|---|---|---|
| Builder/homeowner paired review and incomplete-lead study | Software correctness cannot establish clarity, time saved or willingness to pay | Quinn/product owner: separately authorize/recruit study under #16/#147 using the comparison |
| Controlled configuration, current installed quote and scope review | No dependable installed project price or quote guarantee | Manufacturer and cost/site reviewer: supply a dated matching scope/quote; #124/#125 |
| Site-specific foundation/services/access and reviewed fees/tax scope | Material categories remain unknown; many real cases cannot have a bounded range | Property contact and qualified reviewers: establish those inputs; no invented defaults |
| Independent source/currentness review and accepted publication | Existing public catalogue claims and candidate zoning are unreviewed; no accepted real evaluation | Source/publication owner: review the original evidence and existing release gates separately |
| In-memory draft, exact context matching, one selected line per category | Reload needs JSON recovery; imported/different contexts require re-entry; detailed estimating needs a confirmed combined allowance | Prototype owner #320: assess study feedback before expanding storage or breakdowns |
| Bounded semantic conflict checking | Unfamiliar overlapping package wording still requires human review | Builder/cost reviewer: reconcile included/excluded scope before reliance |
| Existing raster PDF renderer | Downloaded PDF is visually readable but has no searchable/selectable text layer; text/Markdown alternatives remain available | Export owner #205: assess a text-based PDF follow-up separately |

The prototype remains usable with these gaps: incomplete enquiries reach contact,
and no financial gate is added. They block accurate installed-cost/accepted-evaluation
claims, not the authorized software demonstration. Merge/deployment, source acceptance,
data publication and human validation are separate decisions.
