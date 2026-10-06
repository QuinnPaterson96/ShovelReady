# Placement and checklist integration

Integrates #228 (5418691), #229 (ae0a593) and #230 (a24c930) from main 8cfbe0a. No accepted data release or database migration.

## Implemented

Address and parcel choices collapse independently, with explicit property confirmation retained. Observation-map layout is contained. The placement map supports optional front/rear selection and a bounded automatic candidate distance screen for convex four-edge parcels. Single-street role suggestions are explicit assumptions; computed distances remain approximate nominal-footprint observations. Detailed conditional results now use expandable checklists with unknown and omitted requirements visible. Integration adds a ten-second request timeout so an unavailable scenario endpoint cannot leave loading indefinitely.

## Combined verification

- Focused Python geometry/conditional/scenario suite: 43 passed. No local database tests.
- Frontend serial suite: 107 passed; production build passed. Serial execution avoids the workers' observed Windows process-memory exhaustion. Existing bundle-size advisory remains.
- Real combined browser: saved example crossing remains unresolved; moving north four metres and selecting edge 4 with a single-street assumption produced one passing distance-subset scenario. Detailed checklist still lists missing legal/pathway facts and height/rear-yard coverage as unknown.
- Public 419 Cecelia Rd lookup: address and parcel choices collapse separately; confirmation opens placement; address editing clears downstream state. At 390 px, no document overflow. Worker #229 additionally supplies desktop/mobile screenshots and loading/error evidence.
- Required integration CI checks and production identity verification are recorded on the integration PR. Software evidence is not legal/source review or independent user validation.

## Remaining gaps and next actions

- Demo usability: automatic scenario roles and the detailed manual checklist are not fully unified. A role may be suggested in the automatic view yet remain unknown in manual evaluation. Frontend/geometry follow-up #231 must preserve derived-role provenance while presenting consistent results.
- Demo coverage: irregular, holed and multi-edge parcels remain unresolved. Geometry owner should expand topology only with explicit role rules and representative cases.
- Accepted evaluation: #104 retains currentness/interpretation review; front/rear-yard, height, projection and site-specific rules remain incomplete. Source reviewer must close those before an accepted complete evaluation; this release only reports a bounded approximate subset.
- User validation: product owner should run the occupied-lot journey protocol #147 with prospective users. Agent/browser checks do not establish comprehension.
