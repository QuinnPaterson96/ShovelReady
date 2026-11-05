# Placement guidance in the homeowner demo

Start with the same question a homeowner brings to a discovery call: is there a promising spot for this model, and which assumptions would change that answer?

1. Select an address. A structured BC locality suggests the municipality; selecting a recognized municipal parcel gives stronger evidence. Corrections are attributed to the visitor. Victoria opens its preliminary rule subset. Another municipality offers a public coverage request (city name only, submitted by the visitor on GitHub) or a manual sketch. An unknown locality is not treated as Victoria.
2. Open a mapped property. The [suggestion service](../app/placement_suggestion/README.md) tests several orientations of the **whole** nominal model rectangle, keeps it inside the parcel and away from mapped roofs, and ranks candidate positions by the room left around them. Where applicable, it checks one complete boundary assignment, planning buffers and supported position-dependent comparisons. The result says which basis was used. A bounded search can miss a viable position. Its failure never means that a unit cannot fit.
3. Move, rotate or resize the unit. A suggestion starts an untouched placement once; a new suggestion after an edit requires the visitor's action. The map shows [candidate setbacks](../frontend/src/setback_overlays/README.md) and distinguishes additional planning buffers. Fixed guides stay in view as the footprint moves. When more than one set of boundary roles is possible, view one complete scenario at a time. For an unanswered use, an explicitly illustrative garden-suite layer does not record an intended use or become a zoning finding.
4. Change municipality. Previous city checks, buffers shown on the map, mapped zoning findings and comparison wording are withheld from the new jurisdiction. Captured physical geometry and its original source remain available. The handoff identifies the municipality and its basis separately from parcel identity; site-detail redaction also applies to the added municipality section.

The demo shades setback margins on supported simple parcels. It does **not** show every point or orientation where the selected unit fits. Other parcel shapes may still support a starting suggestion without a setback drawing. Source accuracy, unseen structures, access, survey boundaries and review of the applicable rules remain open.

## Verification

From the repository root, install with `uv sync --locked` and `npm ci --prefix frontend`, then `npm run build --prefix frontend`. In a shell with no database configuration, run `uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 18137`. In another shell:

```powershell
# Use an installed browser channel (or Playwright's locally installed Chromium).
$env:WALKTHROUGH_BROWSER='msedge'
npm run test:placement-demo --prefix frontend
$env:WALKTHROUGH_URL='http://127.0.0.1:18137'
$env:WALKTHROUGH_API=$env:WALKTHROUGH_URL
$env:WALKTHROUGH_OUTPUT='../.local/placement-walkthrough'
npm run test:walkthrough --prefix frontend
```

The first journey uses captured address and municipal responses with real placement and rule engines. It checks the first suggested placement, changing assumptions, delayed suggestions after keyboard edits, recovery from failed requests, moving beyond a boundary, and the unsupported-city path at mobile width. Container CI runs it against the built image. The second exercises the saved example, keyboard takeover, model switching and a user-initiated PDF download. The [representative enquiry](samples/placement-guidance/enquiry.txt) comes from that saved example. Neither journey contacts a manufacturer or submits a coverage request.

## Still open

- **Product / demo host:** try these paths with homeowners or manufacturers. In particular, ask the visitor what the shaded margin means and whether they can find out why a position was suggested. Offer a model-specific fit map only if the single starting point and margins leave a decision unanswered.
- **Municipal data owner:** Victoria is the only candidate rule set. Review source interpretations and publish accepted rules separately before claiming reviewed coverage, or onboard another municipality with its own rule packet and geographic evidence.
- **Product owner:** GitHub intake is real and public, and can require an account. If the audience cannot complete it comfortably, use a first-party intake; no address or contact information needs to leave the demo to test placement.
