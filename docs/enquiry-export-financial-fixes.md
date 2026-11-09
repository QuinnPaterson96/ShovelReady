# Enquiry export and recipient cost fixes — November 4, 2026

Tickets: #329 and #331. Base: `86dfee4` (main `a27c2f5` plus the accepted
[financial comparison decisions](decisions/financial-comparison.md)). Core change:
`1747810`. No deployment, merge, source publication or provider transmission occurred.
PR #298 was inspected for overlap; its existing branch was left untouched.

## Communication decision

The recipient is the selected model's provider, being asked whether a discovery
call or further investigation is worthwhile. The message needs the current model,
property, authored request, relevant price scope and unresolved installation work.
It must retain relevant stale-cost warnings without making another model/provider's
costs part of this request. The homeowner's supporting report, recovery snapshot and
technical evidence retain every cost record, its context, source and exclusion reason.
These are preliminary, unreviewed inputs, not installed quotes or accepted evaluations.

## PDF diagnosis and change

Read-only public checks on November 4 found application/frontend identity
`a27c2f511d4087cddb307590f21bd4ea9c57e432`. The reported old asset
`jspdf.es.min-cNaD-dTm.js` returned HTTP 404. The current entry
`index-GmgFaJhd.js` referenced `jspdf.es.min-BP8KvqnK.js`, which returned HTTP 200
with JavaScript content. A fresh Chrome session successfully downloaded a PDF from
that unchanged deployment with no page errors; the recorded
[live diagnosis](usability/enquiry-export-2026-11-04/live-diagnosis.json) names the
assets and identity. This does not recover the October 23 network history or prove
which cache supplied that session's entry.

The same failure mechanism was then reproduced locally from archived baseline
`86dfee4`: load the homepage, replace the served build with one having new asset
URLs and remove the previous assets, then enter the saved-example journey and save
the PDF. The old page requested the removed `jspdf.es.min-D3qNu3W9.js`, displayed
the dynamic-import error, and produced no download. The
[baseline failure record](usability/enquiry-export-2026-11-04/baseline-failure.json)
retains the two entries, requests and failed download event.

The PDF renderer now imports with the assessment instead of first loading at
export time. Export-control CSS joins the startup stylesheet imports. After the
same local replacement, both the already-open page and a fresh page downloaded
actual PDFs with the current authored question, selected Model 300 and measured
placement. The renderer no longer needs a removed PDF chunk. This adds about
137 kB gzip to the initial JavaScript in this measured build (292 kB to 429 kB);
the existing large-chunk advisory remains. Optional jsPDF HTML-rendering dependencies
remain lazy, but the canvas/PNG PDF paths used here do not call them.

`exportFailureMessage` supplies retry and **Copy text** recovery instructions without
an opaque asset URL or reload instruction. It retains the specific changed-input
qualification when appropriate. Host wiring is owned by the state worker and is
reported in `5ef6575`; this export branch alone does not include that host change.
Existing export identity checks and draft/recovery state remain intact.

## Recipient cost behavior

Recipient composition excludes records for a different model, configuration or
property, including another model from the same provider. Changed placement/project
assumptions, capture revision or age do not by themselves make a record unrelated:
the active model's relevant recheck warning remains visible. Installation work and
missing installed totals still prompt a useful provider response.

This is a reporting projection. It preserves the original calculation and subtotals;
it does not resolve overlaps, turn a withheld price into a usable one, remove a
recheck flag, or make an incomplete budget complete. Full budget evidence adds
`recipient_exclusions` with record identity, label, provider and reasons, while
retaining the complete original draft and calculation. The supporting homeowner
report and recovery continue to receive that unfiltered evidence.

## Verification and retained output

- `npm test`: 187/187 passing on the core code change, with no database or model calls.
- Focused reporting/download suite: 18/18 passing after the follow-up copy-label
  correction. Tests connect catalogue claims, mixed-context draft, composition,
  plain text/Markdown/email and the complete package. Expected identity exclusions
  come from the selected model/configuration/property; subtotals are compared to
  the unchanged full calculation. Existing independent decimal arithmetic remains.
- `npm run build`: typecheck and production build passed. The jsPDF/fflate static
  sharing notice and pre-existing large-entry advisory are understood, not errors.
- Chrome actual-download check with a local stateless API: baseline fails after
  release replacement; fixed already-open and fresh sessions succeed. The
  [delivery record](usability/enquiry-export-2026-11-04/delivery.json) captures entry
  identity, browser requests and text painted into the generated PDF. Downloaded
  [already-open PDF](usability/enquiry-export-2026-11-04/open-session.pdf) and
  [fresh-session PDF](usability/enquiry-export-2026-11-04/fresh-session.pdf) each
  have three pages. All six pages were rendered with Poppler and visually checked:
  current authored question, nominal dimensions, readable map/gap labels, source
  links, preliminary scope and saved-example attribution survive without clipping.
  The short second message page is sparse; pagination was not redesigned.
- The direct real-browser PDF harness also generated coherent Cecelia and unknown-use
  Studio documents, plus an assembled
  [Quadra enquiry with unrelated Studio costs retained only in evidence](usability/enquiry-export-2026-11-04/quadra-cross-provider-enquiry.pdf)
  and an [active Model 300 stale-cost enquiry](usability/enquiry-export-2026-11-04/model-300-stale-cost-enquiry.pdf).
  All representative pages were rendered/inspected. Provider identity, missing
  installed scope and active recheck warning remain intelligible; unrelated provider
  names/currency diagnostics do not enter the Quadra prose. Full context/source
  evidence remains in the [representative records](usability/enquiry-export-2026-11-04/representative-enquiries.json).
- Harness correction: the old PDF smoke tool mixed a different property's result
  into the Cecelia site, making its plan tiny. It now uses one coherent retained
  `cecelia-geometry.fixture.json` measurement and assumptions. This corrects verification
  input, not product geometry or legal interpretation.

To reproduce the delivery check from `frontend`, build A with `npm run build`, then
build B with `node node_modules/vite/bin/vite.js build --base=/replacement/
--outDir=../output/enquiry-delivery/replacement`. Start the stateless local API on
`127.0.0.1:8019` with database access disabled, then run
`node tools/verify_enquiry_delivery.mjs`. The tool serves both builds locally,
removes A from the served set before first assessment entry, uses real local
geometry/planning calculations, and fails municipal network boundaries explicitly.
Chrome is the default browser; `ENQUIRY_DELIVERY_BROWSER` can select another installed
Playwright channel. `ENQUIRY_ORIGINAL_DIR`, `ENQUIRY_REPLACEMENT_DIR`,
`ENQUIRY_DELIVERY_OUTPUT` and `ENQUIRY_DELIVERY_API` configure isolated local paths.
The direct PDF smoke tool still uses a Vite dev server via `PDF_CHECK_ORIGIN`.

## Remaining gaps and integration requests

| Gap | Practical impact | Next action / owner |
|---|---|---|
| Integrated host catch/failure regression is in state-worker commit `5ef6575`, not this worker's base | Core helper alone does not change the displayed host error | Integration owner must include `1747810`, comparison `778e69c` and state `5ef6575`, then run combined checks/QA. |
| No hosted release transition was performed | Local replacement proves the diagnosed path, not Railway/CDN behavior | Release owner / #329: after an authorized deployment, record identity and fresh/already-open downloaded PDFs across a later rollout. |
| Sessions already running old production JavaScript still have its lazy imports | Eager loading cannot retrofit those old pages; removed historical chunks may still fail | Release owner / #329: preserve copy/recovery and assess previous-asset retention or an explicit recovery path for the first rollout. Do not claim old sessions were retroactively repaired. |
| Exact October 23 response/cache history is unavailable | The historical session's original trigger remains inferred | #329: retain the original report; new evidence establishes removed-asset mechanism and current fresh-session success only. |
| PDF body remains rasterized and untagged | Search/screen-reader extraction is limited | Existing #205 export follow-up: keep Markdown/plain text available; assess accessible PDF authoring separately. |
| Provider/source/legal acceptance and human usefulness remain unmeasured | Software behavior does not establish installed prices, suitability or recipient comprehension | Quote/configuration #124/#125, source/data reviewers, and human validation #16/#147 remain the owners. |

These checks establish software behavior and recipient-perspective agent inspection.
They do not establish independent source accuracy, accepted publication or human validation.
