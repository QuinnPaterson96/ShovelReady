# Model 300 journey integration — 2026-10-05

Integrated worker heads: municipal recovery #179 d205c60; candidate choices #187 4138f1c; map #188 18f79b3; height #186 b77c6d4; example #189 4870484. Base main 45e08e1. Final integration edits and CI revision are recorded in the integration PR.

## Implemented

Connected the observation map and height view to the Model 300 journey. Preserved municipal retry controls while merging the candidate layout. Example property uses the licensed saved VIC-087 packet and a measured illustrative placement without live geocoding/GIS. Provider ranking is presentation only, with explicit selections and confirmation; ties, locality/precision differences and different unit records stay expanded.

Foundation allowance is a separate optional user assumption in the enquiry and technical export; it never changes geometry or regulatory results. Switching property modes resets it and the example/intake state. Browser QA caught and fixed a sibling React key collision that otherwise retained the previous height input. Height dimension line now spans the schematic roof rather than the eave. The elevation follows the placement workspace, so the example map remains first.

## Verification

- `npm --prefix frontend test`: 83 passed after integration edits.
- `npm --prefix frontend run build`: typecheck and Vite production build passed; existing large-bundle warning remains.
- `python -m uv run --locked pytest tests/test_municipal_sites_api.py -q`: 10 passed, saved provider HTTP fixtures, no database. Upstream Starlette/httpx deprecation warning remains.
- `python -m uv run --locked ruff check app/municipal_sites/api.py tests/test_municipal_sites_api.py`: passed.
- Local stateless API/production frontend at 127.0.0.1:18142. Browser example measured containment, no captured-roof overlap, boundary distance 1.21 m and roofline distance 1.94 m. These are geometry observations, not setbacks or suitability conclusions.
- Changing width clears measured output; remeasurement succeeds. Optional 0.5 m foundation assumption appears separately in the unsent draft. Example-to-own-property reset leaves exactly one blank height input and no example enquiry. Live public fixture address 1144 May St, Victoria returned a parcel and one roofline; map scale, north, sources and CRS limitation visible. Keyboard Enter confirmed the observation. Editing address removed the prior placement workspace.
- 390x844 and 1280x900 browser checks found no horizontal document overflow. Tab from confirmation controls reached the evidence disclosure. This is a limited keyboard walkthrough, not a complete accessibility audit.
- Retry/partial/late-response and alternate-choice invalidation exercised in deterministic integration tests; no forced production outage. Conservative live ambiguity was visible; leading-choice disclosure behavior covered by component tests, not a live ranked example.
- Screenshot: local artifact `C:/Users/quinn/.codex/visualizations/shovelready-model300-wave/example.png`.

## Remaining gaps

1. Provider corrections still render raw phrases such as `missing:`. Real responses often contain lower-precision/locality alternatives, keeping all choices expanded under the conservative rule. Improve with evidence-based correction labels and fixture-backed ranking, retaining genuine ambiguity.
2. Example placement editing uses projected X/Y; add readable movement controls or reuse the existing click/drag placement workspace in a follow-up.
3. GIS recovery is bounded retry, not a fix for Victoria's intermittent pagination error. Source availability must not be claimed resolved (#169).
4. No accepted zoning publication, site-grade/foundation relationship, installed height comparison, surveyed walls, or legal fit is established. The map omits the geocoder marker because its CRS differs.
5. No independent human comprehension test yet. Run a small curious-visitor walkthrough after release; this integration test is software evidence only.

Code deployment does not publish accepted regulatory data. No database migration or new service is required.
