# Demo catalogue source-label correction — November 6, 2026

Issue [#339](https://github.com/QuinnPaterson96/ShovelReady/issues/339) corrects
attribution beside captured model prices. The recipient is a homeowner comparing
which provider to call; the useful next step remains a dated, configuration-specific
quote and site-cost enquiry.

The maintained demo candidate copied “browser inspection for Quadra price” into
the Yarrow and C.H. Studio Pod source locators. The retained October 7 research
packet from PR #292 (`030101d5ed0c893a194c549e5f97b75943be41d8`, model sheets and
inspection evidence) supports these replacements:

| Source | Corrected locator | Retained commercial boundary |
|---|---|---|
| Nexus Modular Solutions / Yarrow model page | Yarrow model specifications | No model price captured |
| West Coast Container Homes / C.H. Studio Pod model page | C.H. Studio Pod specifications and advertised starting price | 96,860 starting amount, currency unknown |
| Hewing Haus / Quadra 4 model page | Existing Quadra browser-inspection locator retained | CAD 224,000 starting amount |

This is a correction to retained observations, without a live source refresh. Source
URLs, October 7 capture dates, source IDs, null revisions/hashes, capture gaps,
review status, price amounts and qualifications remain unchanged. The observational
snapshot is now `demo.prefab-journey.2026-11-06.source-labels.v2`; the accepted/active
catalogue is unchanged. A new snapshot identifies changed content without implying
that November 6 is a new provider capture date.

Updated `docs/demo-data/prefab/candidate-input.json`, staged with the existing
`app.model_catalogue.research_intake` command into a fresh temporary directory, and
copied its generated candidate/report into the maintained `staged` directory.
Regenerated the frontend with `app.model_catalogue.build_demo`. The gap report is
byte-equivalent: all 50 source/data gaps remain unresolved and the candidate stays
`valid_unreviewed`.

Verification:

- Both `build_demo --check` and `build_snapshot --check` passed. A structural diff
  confirmed that only snapshot identity and the two locators changed in each of
  the three candidate/export copies.
- Catalogue/intake tests: 34 passed. The existing integration test now protects the
  reproduced cross-model caption error, the legitimate Quadra locator, Studio's
  unchanged amount/unknown currency and Yarrow's missing price. Ruff passed.
- The existing comparison behavior test passed. A local Chrome harness rendered
  the actual `AlternativeComparison` component with the current Studio candidate:
  provider, model, price-source URL, capture date and review state agreed; the
  96,860 amount remained withheld with no usable priced-components subtotal.
  This component inspection does not replace the final integrated journey review.

The fresh integrated-worktree Python environment could not complete `uv` setup
within this check. Verification instead used the existing financial comparison
worktree's Python environment (Pydantic 2.13.5) against this checkout's modules;
no database or live external source was used. Final-head CI remains a separate
integration check.

No source acceptance or publication occurred. Current configuration, currency,
installed quote and controlled dimensions still require provider/source review;
the homeowner's next enquiry can obtain them. Real homeowner comprehension remains
for product research. These are data/research gaps, separate from the corrected
demo attribution.
