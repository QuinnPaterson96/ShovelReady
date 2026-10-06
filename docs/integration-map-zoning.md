# Address, placement and zoning API integration — October 6, 2026

Integrated from main `30153f2`: PR #235 (`fccaf3b`), #237 (`0a5aedb`), and #239
(`44609e9`). Combined code checkpoint: `005af6b`. No database migration or accepted
regulatory-data publication is included.

## Implemented

- Address suggestions distinguish harmless omitted street type/province from
  substantive identity ambiguity. Selection remains explicit, alternatives remain
  available, and source corrections remain recoverable.
- Model 300 uses a bounded full-width placement map with controls below it,
  collapsed fine adjustment and model details, and current geometry/scenario/checklist
  results. Candidate distance passes cannot cancel captured geometry conflicts.
- The new `/api/victoria-zoning/lookup` accepts a typed City PID-parcel reference,
  refetches its polygon, and reports zoning intersections, coverage and attributed
  bylaw mappings. Split, partial, missing, unsupported and unavailable results remain
  distinct. This API is not yet wired into Project details in this integration.

## Combined verification

- `npm run build` in frontend: passed (existing bundle-size advisory).
- `node --import tsx --test --test-concurrency=1` over frontend source test files,
  with `TSX_TSCONFIG_PATH=tsconfig.app.json`: 111 passed.
- Targeted pytest: `test_victoria_zoning_api.py`, `test_municipal_sites_api.py`,
  `test_live_discovery_contract.py`, `test_address_search_api.py`,
  `test_placement_scenarios_api.py`, `test_conditional_screening_api.py`: 37 passed.
  No database used; existing Starlette/httpx deprecation warning.
- Combined local production build served with `SHOVELREADY_ENV=demo`, uvicorn on
  port 18150. Browser: public test lead `419 Cecelia, Victoria` produced the leading
  civic suggestion and collapsed alternatives; choosing it collapsed address entry.
  A separate City parcel selection was offered. City parcel/roofline observation
  timed out; retry/manual fallback appeared. Full live placement was therefore not
  independently verified in this pass (worker #237 recorded an earlier live check).
- Saved example: keyboard movement invalidated old observations and automatically
  recalculated; captured overlap/outside conflicts remained visible beside unresolved
  setback results. Reset recalculated. At 390 px, document client/scroll widths both
  measured 375 px. Fine adjustment and model details were collapsed.
- Worker evidence, including click/drag and boundary-mode checks, is recorded in
  [compact placement handoff](integration-compact-model-map.md). Live external API
  observations are not deterministic CI or source-interpretation review.

## Remaining gaps and owners

- **#238, Project details worker:** connect mapped zoning/bylaw evidence to the UI,
  simplify defaults and floor-area help, preserve evidence origins. Until integrated,
  the UI still asks for pathway assumptions. Never reuse a layer-0 object ID as a
  layer-11 PID-parcel ID; use the actual retained typed reference.
- **#233/#231, frontend integration:** physical touch input and full manual wall-distance
  override browser validation remain open; do not close these parent criteria solely
  from the compact layout change. Irregular geometry remains explicitly unsupported.
- **#234, discovery QA:** basic live reported query verified; complete mobile correction
  flow and repeat live observation once the City source responds reliably.
- **#104, source reviewer/product owner:** accepted rule currentness/applicability,
  legal boundary/wall interpretation, front/rear-yard, height, projections and
  site-specific coverage remain incomplete. The lookup is an unreviewed map observation.
- **#147, product owner:** real-user comprehension/usefulness remains untested.

Review the final integration PR's exact-head CI separately before merging. Rollback
is a code revert; this release does not change active regulatory datasets.
