# Budget journey verification

October 23, 2026. Base `a573522715894e66f5c976f377b0004320ff3420`;
checks cover this branch's integrated working tree / GitHub PR head. Final-head CI
is recorded in the PR. [Scope, decisions and exact gaps](../project-budget-journey.md).

## Reproduction and software evidence

From repository root, no database URL or live model/provider credentials:

```powershell
python -m uv sync --locked
npm ci --prefix frontend
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
$env:SHOVELREADY_ENV='test'
python -m uv run --locked pytest -q tests/test_model_catalogue.py tests/test_placement_scenarios_api.py tests/test_scouting_geometry.py
python -m uv run --locked ruff check app tests contract_tests migrations scripts docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py
```

184 frontend tests and 59 focused backend tests passed. Typecheck, build, repository
ruff and whitespace checks passed. Existing build chunk-size warning and upstream
Starlette/httpx deprecation warning remain. No database tests or legacy cleanup
suite was run locally; required CI supplies its own disposable databases. No new
dependencies or test-count/coverage target was introduced. `npm ci` reported existing
dependency advisories; this PR does not change package versions or claim to fix them.

Existing integration coverage protects captured catalogue intake → validated draft →
decimal calculation → recipient formats and full package evidence. Independent
package arithmetic remains 100.10–120.10 + 2.20 + zero tax = 102.30–122.30, without
charging included delivery twice. Starting offers stay unbounded; unknown currency,
mixed currencies, conflicting tax/package scope and malformed intake stay unresolved.
The reproduced recipient omission (unnamed allowance) now has a category/amount
regression in that same integration test. Existing journey coverage now traverses
optional Budget and checks that read-only navigation preserves evidence. The
VIC-087 orientation test retains its original independent parcel fixture; the new
Cecelia case does not inherit its numeric expectations.

## Real local browser and output

Start FastAPI at 127.0.0.1:8027 with `SHOVELREADY_ENV=test`, and Vite at
127.0.0.1:5197. From `frontend`:

```powershell
python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8027 # root, separate terminal
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5197 --strictPort
$env:WALKTHROUGH_URL='http://127.0.0.1:5197'
$env:WALKTHROUGH_API='http://127.0.0.1:8027'
$env:WALKTHROUGH_BROWSER='msedge'
node tools/budget_browser.mjs
$env:WALKTHROUGH_OUTPUT='../docs/budget-journey-verification/walkthrough'
node tools/walkthrough_browser.mjs
node --import tsx tools/budget_journey_comparison.ts
```

The scripts permit local API requests only and explicitly make external municipal
boundaries unavailable. These are genuine API calculations, browser interactions and
downloads; there is no provider contact. `browser-results.json` and
`walkthrough/browser-results.json` retain the final outcomes and request inventory.

Budget checks cover the actual Cecelia demo source price; Back/Next without duplicate
seeding; keyboard takeover; a synthetic, explicitly entered CAD 2,500.25 delivery/lift
allowance; failed edit/import preserving prior data; same-tab Home/assessment navigation;
desktop and 390 px mobile layout with no horizontal overflow; PDF/ZIP and complete
source evidence; incomplete-cost contact; configuration/use/model/property rechecks;
unknown-jurisdiction isolation; session enquiry recovery and explicit JSON draft
import into a new scenario with old costs withheld. The scripted allowance and CAD
250,000 preference are test inputs, not defaults or actual owner/provider facts.

The full walkthrough also exercises delayed/obsolete responses, failed-request retry,
partial overlap responses, model-edit takeover, explicit replacement/cancellation,
mobile keyboard and reduced motion, a 7.5-second normal-motion hold without automatic
advance, and no playback-triggered provider navigation or download. A browser-download
surface is allowed only during an explicit export, with an exact blank/internal Edge
download-hub URL and zero document/network requests.

Initial verification failures were harness assumptions: old Next-count/Parcel 87
expectations, an accessible name excluding a decorative arrow, asynchronous file
import completion, and Edge's `edge://downloads-hub/` being misclassified as provider
navigation. These were corrected without weakening stale-cost or external-request
checks. The old cancellation-prone browser-request proxy now uses independent Node
transport so late responses can be observed without a socket cancellation hiding them.

Two batched desktop/mobile visual passes inspected the budget view. The first showed
a narrow preference field and continuation below all details; one correction widened
the input and moved Continue beside the summary. The final retained screenshots
show those corrections. Final document-only allowance attribution adds no UI layout
change. The mechanical Impeccable detector returned no findings on the budget
component/CSS and navigation component. No broader accessibility audit is claimed.

`example-enquiry.txt`, `example-enquiry.pdf`, `example-evidence.json` and
`example-package.zip` come from the actual integrated Cecelia journey. All three PDF
pages were rendered and inspected: budget preference, subtotal, unavailable upper
amount, missing work and source attribution agree with text/evidence; the plan
identifies both captured rooflines and unknown street/boundary roles. The current
renderer rasterizes text and leaves a sparse second page. Those pre-existing PDF
accessibility/pagination gaps remain for #205/export owner; plain text/Markdown and
technical JSON retain usable alternatives.

## Recipient comprehension inspection

The [same-facts comparison](../samples/budget-journey/comparison.html) retains the
actual generated PR #326 before text and revised output with identical inputs/date:
435 words before, 348 after, 87 words / 20% shorter. It keeps the original free-text
owner question rather than silently editing it. No numeric scope or quote was added.

A separate read-only agent inspected desktop/mobile and both enquiry examples.
It distinguished CAD 250,000 spending preference, CAD 189,500.25-or-more priced
components and unavailable installed total; identified missing scope and a useful
builder response; found no material contradiction or obstructive duplicate. It
identified that “owner allowances” alone did not explain the subtotal contribution.
The generator now names Delivery and lift and CAD 2,500.25, with a behavioral
regression. The final text was re-inspected after that correction. Demo-generated
answers stay labelled; test-entered preference/allowance attribution is explicit in
this evidence record. This is agent inspection, not actual user validation or proof
of sales usefulness/time saved.

## Source recheck — one unresolved component

Only Victoria's building-permit component was rechecked. Official downloaded bytes:

| Capture | Official source / revision | SHA-256 |
|---|---|---|
| 2026-10-23 | [26-020 waiver](sources/victoria-fee-waiver.pdf), ss2–6; adopted 2026-01-29, repeal after 12 months | `3f03e95a7244ba51a56755ff236780625bd9e96f5e29f2d71dd0b19eaad003a3` |
| 2026-10-23 | [17-113 base consolidation](sources/victoria-building-bylaw.pdf), through 23-037, dated 2023-04-27; ss15,19, Schedule A | `f5189f080190685b4e0c1edd2e2f8bd5a360c7fe3bfa66742f064e4390766189` |

Original URLs, revision/capture and null scenario inputs are in
`frontend/src/project_budget/victoriaFee.ts` and the exported evidence. Browser
retrieval of the base PDF timed out; direct official download succeeded. The base
defines a valuation comparison and conditional reductions/payments/refunds. It does
not support substituting the factory price. City receipt date/status, accepted
valuation and applicable adjustments remain absent; later amendments and real
application eligibility need independent review. No fee, zero, credit or waiver is
calculated. January 29 adoption is an exclusive lower boundary in the waiver text;
January 29, 2027 repeal is inclusive, with City acceptance/status conditions still
required. No date-boundary algorithm or real application fact is claimed. Other
municipalities and fee components are deferred.

## Remaining gates

The demo is usable with unpriced work and incomplete contact. Accepted real costs
still need matching manufacturer/installed scope, qualified site investigations,
tax/fee evidence and independent source review (#124/#125; City/cost reviewer).
Actual comprehension/usefulness needs Quinn's separately authorized participant
study (#16/#147). Conservative re-entry and memory-only assessment/reload recovery
remain prototype limits owned by product. Accepted regulatory publication remains
separate. Raster/sparse PDFs remain an export-owner follow-up (#205). Reconcile open
PR #298's export overlap and require final-head CI for review. No merge, deployment,
paid service, enquiry transmission or accepted publication occurred.
