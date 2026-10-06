# Approximate placement setback scenarios — handoff

Base: `main` at `8cfbe0a` (#224). This branch adds a bounded scenario screen to the Model 300 placement journey. It does not publish a rule release or extend accepted evaluation.

## Implemented

- After a current geometry measurement, the app posts the exact captured parcel and nominal rectangle to a stateless scenario endpoint. The server remeasures containment and each captured edge with the existing geometry engine before comparing with the candidate packet's 0.6 m side/rear and 3.5 m flanking distances.
- The supported assignment set is a valid, convex, simple four-edge parcel with no holes. Each scenario has one tentative front edge, the opposite rear edge, and two side or possible flanking edges. Unknown street adjacency retains all combinations. Existing manual roles constrain the assignments; inconsistent roles or unsupported shapes yield unresolved. No maximum parcel-boundary distance filter rejects a placement.
- All scenarios passing means only the declared distance subset passes under all supported assignments. Mixed scenarios request boundary clarification; all failing gives an apparent conflict for this placement. A known waterfront exception or incompatible stated pathway is unresolved. The initial saved example crosses the parcel and is unresolved until moved.
- The map and numbered buttons ask which edge faces the street when assignments can change the supported comparison. Not sure, corner/multiple-street and explicit single-street choices remain available. A selected street edge alone does not narrow the legal-front alternatives. The existing edge-role and manual wall measurement editor is under **Adjust boundary assumptions**. Street-facing is a tentative scenario input, not a legal frontage finding.
- Placement, model, parcel, pathway, edge and manual assumption changes change the request identity; old results are hidden immediately. The approximate result appears in the unsent enquiry with readable source attribution. Exact requests, distances, assignment outcomes, rule and revision IDs are copyable in technical details. Existing explicit wall-based conditional checks stay separate.

## Verified

- Synthetic integration cases independently use a 20 m square and 2 m rectangle: centre (10,10) has 9 m to every edge (all assignments pass); centre (2,10) has 1 m to the west edge (mixed when it could be flanking); centre (1.1,1.1) has two 0.1 m edges (all assignments fail because at most one is tentative front). Unsupported holes, five edges, changed placement, conflicting roles, waterfront and a different zone stay unresolved.
- The [City of Victoria published PDF](https://www.victoria.ca/media/file/zoning-bylaw-2018) was read for Part 3.1(28)(f)-(g) and the Part 2.1 front, rear, side and setback definitions. It supports the packet's 0.6 m and 3.5 m candidate values and also shows why frontage and setback measurement basis need review. Its cover consolidation and amendment list do not establish current site applicability; this is source inspection, not independent legal interpretation or accepted publication.
- `python -m uv run --locked pytest -q tests/test_placement_scenarios_api.py tests/test_conditional_screening_api.py tests/test_conditional_screening.py tests/test_scouting_geometry.py`
- `python -m uv run --locked ruff check app/conditional_screening tests/test_placement_scenarios_api.py`
- `npm ci`; `npm test`; `npm run typecheck`; `npm run build` from `frontend`; `git diff --check`.
- A local browser walkthrough of the final build first showed an unresolved screen for the initial crossing. Moving the rectangle into an open captured area produced 16 scenarios and a boundary-clarification prompt. Selecting edge 4 alone retained all 16 alternatives and the prompt; explicitly confirming one street edge narrowed to one passing distance scenario while missing front and other rule coverage remained visible. This is software/UI evidence, not a source interpretation review or human validation.

## Demo

Build the frontend with `npm ci` and `npm run build` in `frontend`, then run `python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000`. Open Model 300 → Try an example property. The initial illustrative placement is outside the captured parcel; click the empty area toward the top of the parcel map to move the rectangle and wait for the automatic screen. Compare numbered edges and inspect exact scenario evidence. No database, manufacturer contact or enquiry send is involved.

## Remaining gaps

- **Accepted real evaluation blocker — source and legal basis:** The candidate packet's current amendment chain, front/rear legal line interpretation, waterfront exception and site-specific applicability have not been independently reviewed. A qualified source/site reviewer must resolve these and publish an accepted release before a legal setback result is offered.
- **Accepted real evaluation blocker — coverage:** Front setback, rear-yard location and occupancy, height, projections and other applicable provisions are absent. Rule and geometry owners must add reviewed rules and complete checks; passing this subset cannot mean all zoning setbacks pass.
- **Accepted real evaluation blocker — measurement basis:** Captured parcel edges and a nominal product rectangle are not registered lot lines or installed wall faces. Site and manufacturer owners need a survey and controlled design/installation geometry. Manual wall-based values remain separately identified assumptions.
- **Demo usability gap — shapes and street context:** Hole, irregular and multi-edge parcels remain unresolved; there is no reviewed street-adjacency layer or legal front-line derivation. Geometry and UX owners should expand supported topology and test with real users before claiming broader coverage. The current four-edge prompt works only as a scenario assumption.
- **User validation:** The browser walkthrough is a single agent check, not a homeowner study. Run the occupied-lot journey protocol (#147) with prospective users after source review.

No migration, cloud change, accepted publication or external contact was performed. Full isolated database, Windows lifecycle and container checks belong to CI on the final PR head.
