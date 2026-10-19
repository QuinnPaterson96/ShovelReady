# Budget prototype verification

October 19, 2026. Base main `86ddb42`; results apply to this PR's working tree / PR
head, with final-head CI recorded in the PR. No production or shared database used.

## Software behavior

From `frontend`, `npm test` passed 184 tests on the integrated implementation;
the seven budget integration/arithmetic cases also passed independently. Cases cover
existing catalogue claim → draft → deterministic calculation → recipient formats and
full package evidence; user allowances and zero; package arithmetic and inclusion links;
partial ranges and missing upper amounts; missing/mixed currency; malformed input
preserving prior data; model/property/configuration/scenario changes; expired/stale
claims; and unknown-context contact. The hand-calculated package example is
100.10–120.10 + 2.20 + tax 0 = 102.30–122.30, with included delivery adding no charge.
Refundable-security treatment is excluded from capital cost and retains an explanation.

`npm run typecheck` and `npm run build` pass. The build retains the existing large
bundle warning; no bundle/performance improvement is claimed. Impeccable's mechanical
detector reported no findings on the new section/CSS. Runtime boundary validation
checks shape and supported meaning, not the authenticity or accuracy of source claims.

From the root with `SHOVELREADY_ENV=test` and no test database configured:

```powershell
python -m uv run --locked pytest -q tests/test_model_catalogue.py tests/test_placement_scenarios_api.py tests/test_scouting_geometry.py
```

59 tests passed; one upstream FastAPI/Starlette test-client deprecation warning.
An initial command named a nonexistent `test_builder_demo_api.py` and ran no tests;
the corrected explicit command above is the recorded result. The unrelated legacy
suite was not run. No backend API or database schema changed; the new budget-draft
boundary is local/frontend only. No database persistence behavior is claimed.

## Browser and document evidence

The on-demand `tools/budget_browser.mjs` drives installed Edge against local Vite and
FastAPI, with external municipal boundaries deliberately unavailable. It checks the
guided example and demo attribution, optional keyboard disclosure, catalogue/manual
cost entry, failed edit/import recovery, exact draft/evidence exports, desktop and
390 px mobile overflow, PDF/ZIP downloads, incomplete-cost contact and model/property
invalidation while retaining owner budget. See `browser-results.json` for the actual
outcome and request inventory, and the adjacent screenshot/download artifacts. The
completed run passed all listed checks with zero browser page errors and local
app/API requests only. Both 1280 px desktop and 390 px mobile views were visually
inspected, including default scope/coverage, readable provenance and keyboard disclosures.
Those captures preceded the final explicit-tax-status and package-overlap guards;
the retained case's default display is unchanged. The functional browser journey and
downloads were rerun after those fixes, with screenshots disabled to keep the visual
review bounded to its two passes. Seven focused regression cases and the full 184-test
frontend suite passed again; typecheck/build passed for the final working tree.

The three PDF pages were rendered with bundled `pypdfium2` and inspected: the cost
scope/subtotal/unknown upper bound agree with the text draft, demo attribution remains
prominent, and the approximate placement plan follows the message. No clipped text
or overlapping labels were observed. Page two is sparse under the existing pagination.
The current renderer rasterizes the PDF: `pypdf` returned no text layer, so text
extraction did not establish PDF content correctness. The adjacent plain text/Markdown
and ZIP evidence preserve machine-readable values. Searchable/selectable PDF and
screen-reader accessibility remain an existing export limitation for owner #205.

The older full walkthrough script encountered a test-harness request-cancellation
`socket hang up` after reaching desktop enquiry. That failed run does not establish
full walkthrough success. The budget-specific verifier uses Node fetch for local
API calls independently of browser cancellation; it exercises the real calculation
endpoints and existing guided path without changing production request behavior.

The same-facts [paired comparison](../samples/budget-scope/comparison.html) is generated
by `tools/budget_comparison.ts`: baseline 304 words, revised version 435 words. Original
catalogue evidence and synthetic allowance inputs are adjacent. This is an agent
recipient-perspective inspection, not a test with a builder or homeowner.

## Separate evidence gates and remaining gaps

Software checks establish the bounded behavior described above. No independent
manufacturer/fee/legal interpretation review, accepted catalogue/regulatory publication,
actual recipient comprehension study, price accuracy, sales-time savings or willingness
to pay has been established. No contact, paid feed, merge or deployment occurred.

- **Demo usability:** optional cost entry and contact work without financial answers;
  context changes deliberately require cost re-entry, and reload needs saved JSON.
  Prototype owner #320 should decide whether those restrictions matter after the study.
- **Accepted real cost/evaluation:** matching controlled design, installed quote, site
  investigations and reviewed tax/fee scope remain missing. Manufacturer, property
  contact and qualified cost/site reviewers own those inputs (#124/#125). Existing
  rule/currentness/publication gates still apply; this PR does not resolve them.
- **User validation:** Quinn/product owner owns a separately authorized paired review
  and incomplete-lead study under #16/#147. Use the retained comparator to measure
  understanding, repeated questions and time before expanding the financial pipeline.
- **Integration:** reviewer should reconcile open PR #298's enquiry/export overlap and
  confirm required checks on this PR's final head before merge. No automatic deployment
  or publication is implied.
