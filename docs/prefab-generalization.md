# Prefab journey mapping and integration

Decision scope: help a homeowner decide whether a selected model looks worth
discussing with its provider, then prepare an unsent enquiry. Recipient: provider
staff, who can establish configuration, dimensions and installation scope. Detailed
calculations and complete source identities remain in separate evidence exports.

## Field mapping before implementation

Research dependency: [draft PR #292](https://github.com/QuinnPaterson96/ShovelReady/pull/292),
commit `030101d5ed0c893a194c549e5f97b75943be41d8`, inspected while open/draft.
Its README, sheets, evidence, candidate and staged verification were read. It is
referenced, not merged. Factual candidate JSON is carried separately for a reproducible
unreviewed demo; no proprietary image/plan bytes are carried.

| Existing field | Model 240 control | Quadra 4 | C.H. Studio Pod | Yarrow (staged only) / gap |
|---|---|---|---|---|
| Provider/name/URL/configuration | aux box / Model 240 | Hewing Haus / Quadra 4 | West Coast Container Homes / C.H. Studio Pod | Nexus Modular Solutions / Yarrow; controlled configurations unknown |
| Nominal exterior width/depth + original/normalized Quantity | 10 × 24 ft 1 in | 20 ft 1 in square | 8 × 20 ft | 15 × 26 ft 6 in; no new geometry field required |
| Advertised overall height | 10 ft 3 in | Missing | 9 ft 6 in, datum unknown | Missing; never populates installed regulatory height |
| Roof height | Missing datum | Missing | Missing datum | Missing; existing explicit missing state suffices |
| Manufacturer interior area | Published living-space claim, not legal area | Missing | Missing | Missing; 397.5 ft² plan label is not an interior-area definition |
| Manufacturer footprint | Published claim | Missing defined basis | Missing defined basis | Missing defined basis; never substitute body arithmetic |
| Footprint/height notes, missing facts | Deck/envelope reconciliation | Awnings unresolved | Measurement faces/projections unresolved | Deck/stairs/roof extent unresolved; retain narrative, no invented envelope |
| Intended-use note | Studio options unresolved | Residential configuration needs confirmation | Permanent dwelling suitability unconfirmed | Residential follow-up only; acceptance remains unknown |
| Service-area status/note, installation note | Provider claim | Island offer, locality unconfirmed | Regional project evidence, model-specific scope unknown | Island offer; provider/site work split unresolved |
| Prices/timings with scope, basis and source | Existing optional claims | CAD 224,000 starting; qualified delivery claim | 96,860, currency unknown; no inferred CAD from deposit | No model price; provider timing stages stay separate |
| Sources/revision/review status | Existing source record | Capture gaps, unknown revision | Capture gaps, unknown revision | Capture gaps, unknown revision; offline validation is not provider review |
| User overrides | Existing dimension origins | Reset on switch | Reset on switch | No schema change needed |
| Contact route / selectable demo IDs | Journey configuration | Official Connect | Official Contact | Not selectable; configuration outside measurement schema |

Decision: retain `sr-40.catalogue.v1`; use a separate demo catalogue adapter and a
small explicit journey allow-list/contact configuration. No tenancy or universal
ontology. Preserve the active catalogue's snapshot identity. The research-derived bundle has
its own `demo.prefab-journey.2026-10-07.v1` identity because this integration adds
qualified timing observations; it is not membership in the active catalogue. Switching keeps site/contact facts and removes
model-specific dimensions, configuration, question, recipient and reviewed results.

Implementation owner: this isolated worktree owns demo bundle/adapter, targeted
BuilderDemo/ExampleProperty and placement consumer changes, reporting identity and
this note. Primary checkout edits and homeowner worker work are preserved. README,
quality and architecture reconciliation is integration-owner work if concurrently
edited; this note is the implementation handoff source.

## Implemented and verified

Four choices are available: Model 300 (default), Model 240, C.H. Studio Pod and
Quadra 4. Yarrow remains staged and outside the explicit journey allow-list.
Provider contacts, descriptions, measured rectangles, enquiries, report titles,
drawings and package contents follow the selected model. New providers use links
to official product pages; no provider photos or plans were copied or hotlinked.
The height illustration labels the roof profile unknown. Studio Pod has an explicit
unknown permanent-dwelling suitability check and provider question.

Switching invalidates current results immediately, clears source dimension overrides,
configuration, recipient, foundation, use scenario and model-specific evidence inputs,
and retains the property, site answers and homeowner enquiry context. The behavioral
integration test reproduced and fixes loss of site answers when the placement
editor remounted. No catalogue schema, database, deployment or publication changes.

Verification on the implementation branch, Windows, disposable local process only:
- `npm ci --prefix frontend --no-audit --no-fund`; `npm run typecheck --prefix frontend`;
  `npm run build --prefix frontend`: pass (existing large-chunk Vite advisory).
- `npm test --prefix frontend`: 153 pass, zero failures/skips. The new host integration
  switches 300 -> 240 -> Studio -> Quadra -> 300, retains site facts, resets overrides,
  checks model dimensions against source values and inspects enquiry/report/drawing
  and technical/package identities. HTTP is fixture-backed, not source review.
- `python -m uv run --locked ruff check app/model_catalogue tests/test_model_catalogue.py`;
  `python -m uv run --locked pytest -q tests/test_model_catalogue.py tests/test_model_research_intake.py`:
  pass, 34 tests. Intake/export checks preserve missing measures, unknown use and
  unknown Studio price currency; active catalogue contents remain unchanged.
- `python -m uv run --locked python -m app.model_catalogue.build_demo --check` and
  `python -m uv run --locked python -m app.model_catalogue.build_snapshot --check`: pass.
  Staged intake is `valid_unreviewed`, 50 actionable gaps, not accepted data.
- Local browser: saved-property journey with 300/240/Studio/Quadra; source dimensions,
  unknown height/use, current provider contacts and qualified timings inspected.
  Actual Studio ZIP downloaded: seven correctly named files; recipient message,
  supporting report and JSON inspected for identity/unknowns/old-provider leakage;
  actual exported PNG visually inspected. PDF present, not separately rendered.
  Final Quadra layout inspected at 390 x 844: selector/navigation readable, missing
  height explicit. Keyboard activation of the source disclosure was attempted but
  locator failed; accessibility verification remains incomplete.

Demo: `npm ci --prefix frontend`; `npm run build --prefix frontend`; then PowerShell
`$env:SHOVELREADY_ENV='demo'; python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 5187`.
Open localhost port 5187, Explore prefab models, Try an example property; switch
models and prepare an unsent enquiry. To regenerate observations explicitly run
`python -m uv run --locked python -m app.model_catalogue.build_demo`.
Research #292 remains separate, unmerged; this PR can run without merging it.

## Remaining gaps and next actions

| Gap | Practical impact | Next action / owner |
|---|---|---|
| Controlled drawing/revision, measurement faces/projections, regulatory height datum, defined interior/footprint area | Blocks accepted real evaluation; displayed body rectangle is preliminary only | Product/data owner obtains provider drawings and reviews source mapping before publication |
| Studio permanent residential suitability; configuration, installation/site-work split, locality serviceability and current quotes for all new models | No dwelling eligibility, installed envelope or full-cost/schedule conclusion | Homeowner asks the relevant provider using the generated questions; provider supplies evidence, jurisdiction confirms applicability |
| Yarrow delivery assessment unavailable during research; not proof it does not exist | Yarrow is staged only | Recommend Yarrow as the next residential candidate. Data owner asks Nexus for current controlled Yarrow drawings, exterior/installed height and datum, roof/deck/stair extent, defined interior/footprint area, residential certification/use limits, site work/transport/crane scope, Island service area, current price/currency/exclusions, timeline stages and delivery assessment access |
| Source/capture gaps and no acceptance review | Demo observations cannot be published as accepted data | Data owner resolves the 50 staged gaps, records review and uses separate publication workflow |
| Provider image rights unresolved | Link previews only | Product owner requests permission or continues neutral link cards |
| Real homeowner/provider review and exhaustive accessibility/device audit not completed | Core local journeys are checked; software/browser checks do not establish usefulness for recipients or all assistive technologies | Product owner arranges recipient validation; integration owner expands device/assistive-technology checks before release |

No outreach was sent, no active release published, no merge or deployment performed.

## Follow-up usability verification — October 7, 2026

Completed the local follow-up against real local geometry and public read-only
BC/City endpoints, with no database or provider submission:
- Keyboard: Enter opens the journey and source `<summary>` disclosure; ArrowDown
  changes the native model selector. The previous disclosure locator failure was
  automation targeting, not a broken UI. Enter opens City floor-area help and the
  disclosure reports expanded. Core guided workflow proceeds through Move unit,
  street/boundary review with unknowns retained, property facts, quick checks,
  enquiry review and contact handoff. A map ArrowRight move works. The external
  provider link was verified without opening/submitting a form. This is core
  keyboard journey coverage, not an exhaustive accessibility audit.
- Manual: synthetic 20 x 35 m sketch and centre 10/20 m measured with Model 240;
  width override removed on Studio switch; site facts/frame/position retained.
  Studio -> Quadra resets dimensions and clears the previous measurement. Remeasure
  uses 6.121399999999999 m on both axes. Focus/Tab away preserves exact measurement
  and current result despite ordinary 6.12 m display.
- Live: public May Street fixture address searched and selected through real BC and
  City APIs. Quadra -> Studio -> Quadra keeps parcel 87 and single-detached answer,
  invalidates the old result immediately, preserves unknown use/foundation and
  measures the selected model dimensions after explicit placement. Overlap with the
  captured roofline remains a conflict and travels into the unsent enquiry.
- Independently rendered every page of actual downloaded Studio and Quadra PDFs
  with bundled PDFium, and inspected recipient report/JSON identities. Studio two
  pages are readable. Quadra exposed a model/edge label collision; the proposed
  model label now occupies a copper-key legend slot at the top of the map rather
  than the placement centre. This changes display only, not geometry or evidence.
  Fresh final-build Quadra download/render reviewed after the correction.

Provider/source evidence, acceptance/publication, image rights and real recipient
validation remain as assigned above. Nothing was merged, deployed or sent.


Fresh selection before property search also reproduced stale callback defaults:
SiteDiscovery's mounted flow retained its initial host callback, so selecting a
property after choosing Quadra could restore Model 300 use/foundation assumptions.
The flow now invokes the latest callback through a ref. The existing behavioral
switch test additionally chooses Quadra before fixture-backed address/parcel
selection and asserts unknown use and foundation plus unknown evidence origins.
Final live browser and downloaded evidence confirm those defaults remain unknown.
This is source-workflow state protection; fixtures do not establish source accuracy.
