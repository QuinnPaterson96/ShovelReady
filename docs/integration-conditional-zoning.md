# Conditional zoning and manufacturer preview integration

Integrates worker PRs #220–#223 from main f851e42. Worker heads: evaluator dcc31f3, candidate packet e7640b4, property assumptions c51ba6f, manufacturer card 980e59a.

## Decision

Add a separate candidate-assumption comparison to the Model 300 journey, retaining the accepted evaluator and publication gates unchanged. The server owns the pinned Victoria candidate packet. User assumptions and measurements do not become surveyed facts, independent source review or an accepted rule release. A comparison can meet under stated assumptions while current legal applicability remains unknown.

Keep geometry observations separate from zoning comparisons. Show per-check outcomes, source clauses, basis, coverage and remaining checks; never summarize the packet as probable legality. The selected ordinary garden-suite pathway does not cover the whole bylaw. Research leaves the effective amendment chain, separation endpoints, rear-yard location/occupancy, projections and site-specific conditions unresolved.

The manufacturer card links to the official Model 300 page and uses a typographic fallback. Specific Model 300 photo reuse permission remains unresolved under #199; no contact or image copying was authorized/performed.

## Verification

Integration validation is recorded on the integration PR at the exact tested head. Worker tests alone do not establish the connected workflow. Required combined checks include unknown versus explicit assumptions, proposed-suite count, per-edge roles and distances, floor-area basis, change invalidation, enquiry carry-through, narrow layout and source citations. Passing software tests does not verify current law or human usefulness.

Local integration evidence: 15 evaluator/API tests passed. Frontend tests and production build passed. A real browser against the combined FastAPI/static frontend verified zero matches for unknown inputs; a constructed scenario produced side/rear matches, a 0.4 m side conflict against the candidate 0.6 m threshold, a 54 m² area match against 56 m², and unresolved separation endpoints. These numbers are explicit test assumptions, not findings about the saved parcel. Moving the placement cleared supplied measurements and stale enquiry findings while retaining edge roles. A waterfront assumption moved three setbacks outside supported scope. The enquiry carried each result and its clause/source URL. The 390 px viewport had no horizontal overflow.

The browser found a producer/consumer property-revision mismatch; the integration fixes it and adds a real producer response contract fixture. CI also exercises the candidate endpoint inside the built container so missing packet packaging cannot pass startup checks. No local database or external email was used. Full isolated database, Windows lifecycle and container checks are left to required CI at the integration head.

## Next gaps

- Establish source amendment currentness and independently review the candidate interpretation; no accepted data publication occurs in this integration.
- Resolve separation measurement endpoints, rear-yard requirements, projections, height and other omitted/site-specific rules before expanding supported comparisons.
- Improve the repeated prerequisite/source presentation after observing users; prerequisite matches are assumptions, not independent verification.
- Obtain authorized model imagery if an embedded photo is wanted (#199); the shipped preview remains an official-page link.
