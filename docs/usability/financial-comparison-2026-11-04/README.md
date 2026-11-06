# Measured comparison and budget journey

Agent/software verification on November 4, 2026 (UTC capture November 5), not a
human homeowner study. The local production build combined optional comparison,
per-model retention and export repair. No enquiry was sent.

## Version, environment and scope

| Item | Actual observation |
|---|---|
| Built application | `5dfe188087c873d4096de45130b650f32f10abe1` in `codex/financial-comparison-ui` |
| Baseline | `778e69c7beecc681dbf3b85302522af2c8e909b7`, before host mount |
| Surface | Local Vite production preview on `127.0.0.1:5204`; stateless API on `127.0.0.1:8024` |
| Browser | Chrome `156.0.8078.80`, Playwright headless mobile/touch emulation, reduced motion |
| Narrow viewport | Measured `innerWidth=390`, `innerHeight=844`, `devicePixelRatio=1`, `maxTouchPoints=1` |
| Desktop capture | Measured `1440 × 1000` CSS pixels |
| Network | Local geometry and conditional API requests; municipal lookup/scan deliberately unavailable; external requests blocked |
| Case | Public saved 419 Cecelia example, Garden suite scenario, no ownership asserted |

The first combined run used `6f66326`. Independent finish review requested one
compact priority-question line so Studio's residential suitability question is
named outside collapsed details. After that correction the same combined journey
passed on `5dfe188`; the retained final evidence is from this corrected build.
The independent reviewer marked that finding resolved; the verdict is limited to
the visible priority-question correction, not a certification of the whole surface
or homeowner usefulness. This is an ordinary Civic Atlas extension using the
existing visual rules, shared tokens and native disclosures; no new visual system
was introduced.
The repeatable script pins build identity at entry and also accepts
`COMPARISON_BUILD_COMMIT` for an explicitly known build.

The original October 23 report requested 390 × 844 but measured 1280 × 720 in both
tabs; its desktop screenshot was inspected. That was a test-tool limitation, not a
responsive product defect. The earlier #327 local mobile evidence used a separate
working browser setup. This run supplies current measured evidence; it does not
invalidate that older evidence or claim that October's deployed app was tested
on a phone. No physical phone or screen-reader participant was used.

## Verified journey

1. Open Home and **Try an example** using touch emulation. Continue past the
   existing street-context question with **I’m not sure—continue**.
2. Supply intended use, explicit demonstration relationship and requested response;
   author a Model 300 question about a matching quote and foundation responsibilities.
3. Choose whole-project scope and a CAD 250,000 owner preference, then apply the
   captured CAD 187,000 starting price. It remains a partial subtotal with an
   unknown upper amount, separate from the preference and installed total.
4. Switch to Model 240: no captured price is available. Switch to C.H. Studio Pod
   and apply its currency-unknown 96,860 suggestion: the amount remains withheld
   and cannot become a subtotal.
5. Open the optional comparison with keyboard Enter. Use its 44 px-high **Open
   Model 300** touch target. The exact authored question, approximate placement,
   whole-project scope and CAD 187,000 component return; measurements are current.
6. Open price-scope help with keyboard Enter and continue focus with Tab. Inspect
   narrow and desktop layouts plus the three individual alternative columns.
7. Force clipboard unavailability at the browser boundary. **Copy text** exposes
   its manual-copy recovery, focuses the enquiry field and selects the text.
8. Download the actual enquiry PDF. The file is a non-empty `%PDF` document,
   `652187` bytes, with three pages verified by Poppler; all rendered pages were
   visually inspected. It contains the current message, preserved custom question,
   partial cost scope and approximate placement plan. See the rendering gap below.
9. Navigate Home → Check my property: the question remains. Refresh the page and
   open historical enquiry recovery: the prior unsent message is available while
   editable alternatives/current findings start again.

Every inspected narrow phase measured 390 × 844, with document `scrollWidth` and
`clientWidth` both 390. No horizontal page overflow, unexpected external request or
uncaught browser error occurred. Desktop width was also 1440 without page overflow.
Native disclosure, selector/input and touch actions completed; this is bounded
interaction inspection, not comprehensive accessibility certification.

The test script was corrected to answer the existing street-context dialog and
to target the actual button/accessibility names in navigation. Those harness
selector errors were not product defects. Final `completed: true` evidence is
retained; failed harness captures were removed to avoid confusing them with final
product evidence.

## Evidence

| File | Purpose |
|---|---|
| [browser-results.json](browser-results.json) | Completed combined run, actual viewport metrics, touch target, export bytes, errors/network record |
| [baseline-browser-results.json](baseline-browser-results.json) | Independent pre-mount 390 × 844 baseline |
| [desktop-comparison.png](desktop-comparison.png), [narrow-comparison.png](narrow-comparison.png) | Wide/narrow comparison framing |
| [Model 300](narrow-model300-comparison.png), [Model 240](narrow-model240-comparison.png), [Studio Pod](narrow-studio-comparison.png) | Complete narrow alternative columns; current price, missing price and unknown currency |
| [narrow-budget.png](narrow-budget.png) | Preference, whole-project scope and partial subtotal |
| [narrow-copy-recovery.png](narrow-copy-recovery.png), [narrow-refresh-recovery.png](narrow-refresh-recovery.png) | Actual manual-copy and historical-refresh paths |
| [comparison-ui.txt](comparison-ui.txt), [unsent-enquiry.txt](unsent-enquiry.txt) | Actual readable composed comparison and provider message |
| [representative-enquiry.pdf](representative-enquiry.pdf) | Browser-downloaded three-page enquiry |
| [Page 1](enquiry-page-1.png), [page 2](enquiry-page-2.png), [page 3](enquiry-page-3.png) | Poppler render of every downloaded PDF page |

## Reproduce locally

Start the ordinary stateless API and build/preview the frontend in this checkout.
No database or provider/model credentials are required. From the root:

```powershell
python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8024
# Separate terminal, frontend directory:
$env:COMPARISON_BUILD_COMMIT = git rev-parse HEAD
npm run build
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5204
# Separate terminal, frontend directory:
$env:COMPARISON_BUILD_COMMIT = '<the commit built above>'
node tools/verify_financial_comparison.mjs
```

The script defaults to the loopback URLs above and rejects remote URLs. Set
`COMPARISON_OUTPUT` for a separate evidence folder. An installed Chrome is used;
the script deliberately does not contact providers or live municipal sources.

## Remaining gaps and owners

- **PDF rendering:** page 2 visibly loses the initial “S” in “Site information”
  while the copied source text retains it. The document is readable and downloads,
  but its rendering is not flawless. The export worker has the actual PDF/page
  evidence to diagnose the page-splitting behaviour; integration owner must carry
  the finding forward or verify its repair. Raster text also remains untagged and
  non-searchable; copied text/Markdown remain the accessible/editable forms.
- **Hosted/device coverage:** local production-preview success does not establish
  a hosted deployment rollover, actual phone browser, native share UI or broad
  assistive-technology support. Release/QA owner should repeat affected paths on
  the selected deployment/device before claiming that scope. There is no new
  confirmed responsive product defect from this run.
- **Quote/site evidence:** controlled provider configurations, current matching
  quotes, installed-cost scope and applicable site/source review remain missing.
  Providers/property contacts own #124/#125; source/site reviewers own accepted
  legal evaluation/publication. This observational demonstration is not accepted
  real evaluation, and no financial return winner is established.
- **Human usefulness:** whether homeowners understand the comparison and whether
  it improves the next provider conversation remain unmeasured. Quinn/product
  research own #16/#147. Agent completion supplies no human time-saved or
  comprehension evidence.
- **Integration/release:** final combined CI, user review, merge and deployment
  remain with the integration/release owner; none was performed by this worker.
