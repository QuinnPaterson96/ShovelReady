# Integrated financial journey browser verification

November 6, 2026. Agent software and visual inspection against code revision
`87a27e1085232ef9880afc4c0b600fb0dc8b661a`, using its production Vite build and the
same checkout's real, stateless Python API. This is a local demonstration check;
no deployment, database, source publication, live municipal lookup or provider
contact took place. Final execution status is recorded in
[browser-results.json](browser-results.json), together with the exact entry asset
and its SHA-256, Chrome version, measured browser dimensions and request boundaries.

All four fresh contexts completed on this revision in Chrome 156.0.8078.80.
Each made 42 local stateless requests, with zero page errors and zero external
requests. Sixteen authored model scenarios and sixteen restoration/quote/copy
checks passed. Every recorded stage had the requested viewport dimensions and
no page-level horizontal overflow. The initial quote target was 44 px tall and
309.73 px wide, beginning 395.84 px below the opened comparison's top on phone
and 275.72 px below it on desktop.

## Behavior exercised

The dedicated [replay harness](../../../frontend/tools/verify_financial_integration.mjs)
uses four fresh Chrome contexts: 390 × 844 with touch for phone, and 1440 × 1000
for desktop, each choosing both Project cost / Potential rental income and taking
the separate Skip for now path. Each context follows Model 300 → Model 240 →
C.H. Studio Pod → Quadra 4, then restores and prepares a quote request for all four.

The financial question is visible while the detailed comparison is closed. Its
choice survives the four model switches and return visits. Selected rental interest
adds the explicit rent/occupancy/running-cost questions; skipping still permits the
same comparison, enquiry and download workflow.

Each model gets a different authored width, rotation, translated position,
multiline provider question and spending preference. Model 240, Studio and Quadra
also get distinct configuration preferences. Restored placements are measured
again through the API and compared with their exact retained coordinates and
dimensions. The model question, configuration, preference and complete cost draft
must return unchanged. Preparing a quote request preserves that authored question;
the copy control receives exactly the current enquiry.

Model 300 retains its catalogue configuration as a CAD 187,000-or-more
priced-components control. Model 240 retains an explicitly synthetic CAD 175,000
planning allowance while its captured manufacturer price remains unknown. Studio's
captured amount keeps unknown currency and supplies no usable subtotal. Studio and
Quadra's captured suggestions remain evidence for their original configurations;
custom configurations require matching offers and withhold those amounts. The
overview retains incomplete installed-cost coverage and current material property
space concerns; missing price or missing checks do not produce a preferred model.
Cross-provider drafts stay isolated in the enquiry and PDF.

Measurement controls reveal full precision on focus. The harness first focuses,
waits for that render, and then replaces the value, matching a person's edit. An
earlier immediate Playwright fill raced that render and appended digits to the
original value; it was a harness issue, not retained-placement loss. The final
script asserts exact authored width and rotation before continuing.

## Visual and export inspection

The `*-initial-financial-overview.png` captures show the initial active-model
answer, price basis, incomplete cost coverage, quote action and current questions.
The phone and desktop selected-interest `*-comparison.png` captures retain the
complete four-model overview and source details; all four routes retain full text
without requiring a very tall image. Browser
metrics verify both requested viewport dimensions and no page-level horizontal
overflow at each recorded stage. Quote target dimensions and its distance from the
opened comparison's top are recorded separately.

Every fresh context used the actual **Save enquiry PDF** control. The
[download/render record](download-render-verification.json) preserves each route's
original filename, byte count, SHA-256 and independently rendered page hashes.
The harness checks the PDF signature, active Quadra
heading, complete **Site information** heading, saved-example attribution and
absence of unrelated provider/currency diagnostics in the text painted into the
download. Each original PDF was independently rendered with Poppler. The full
**Site information** heading was visibly intact in all four page-1 renders at
readable magnification, with no missing characters or clipping. All three pages of
the representative were inspected: selected model, authored question, custom-size
scope, unpriced work, attribution and source plan remain readable. The other three
downloads' page images were pixel-identical to those three pages. To avoid storing
duplicate content, the representative
[original PDF](phone-interests-quadra-enquiry.pdf) and its three page PNGs remain;
the record retains every original download identity and explains pruning. The
compact [last-route heading](desktop-skip-site-heading.png) is also retained.

## Reproduction

Build with `npm run build` in `frontend`. Start a compatible Python 3.12 environment
from the repository root with `python -m uvicorn app.main:app --host 127.0.0.1
--port 8036`, with `SHOVELREADY_DATABASE_URL` absent and
`SHOVELREADY_DRAFT_EVALUATIONS_ENABLED=false`. The executed environment was the
already installed `financial-comparison-ui/ShovelReady/.venv`.

In another terminal in `frontend`, run:

```powershell
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5236 --strictPort
```

Then, in `frontend`:

```powershell
node tools/verify_financial_integration.mjs
```

The harness rejects external browser origins, returns 503 at live source boundaries
and proxies only geometry, conditional screening, scenario and placement-suggestion
requests to the local API. It performs no provider website navigation or sending.
Render retained PDFs independently from the repository root with:

```powershell
pdftoppm -png -scale-to 1600 docs/usability/financial-integrated-2026-11-06/phone-interests-quadra-enquiry.pdf docs/usability/financial-integrated-2026-11-06/phone-interests-enquiry-page
```

## Remaining gaps

| Missing evidence or capability | Practical impact | Next action / owner |
|---|---|---|
| More economical PDF pagination | The tested enquiry has a sparse second message page before its placement plan; content and heading remain readable | Export owner, #342; usable demonstration, not an evaluation blocker |
| Durable assessment recovery across reload | These model drafts and financial interests exist only in the open assessment; a reload needs saved exports and re-entry | Product owner to scope persistence separately; the UI states the session limit |
| Matching current quotes and site costs, local rent/occupancy/expenses and financing inputs | No installed total, rental-return number or winning model is established | Homeowner, providers/installers and relevant reviewers under #124/#125 |
| Independent source/legal acceptance and published regulatory release | Retained source observations and conditional checks cannot establish accepted real evaluation | Data/publication owners under existing review/publication gates |
| Actual homeowner/provider comprehension and commercial value | Browser checks and agent visual inspection do not measure usefulness or time saved | Quinn/product research under #16/#147 |

Live-source/address discovery, exhaustive device/accessibility coverage and human
recipient testing were outside this bounded replay. Those are separate from the
demonstrated local workflow and deterministic API/browser connections.
