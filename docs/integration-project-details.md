# Project details and mapped zoning handoff

## Scope and decision

The compact Model 300 journey now has a visible Project details summary. It begins with editable garden-suite use and permanent-foundation *scenario defaults*, each tagged `journey_default`. Those defaults allow a preliminary question to run; neither proves installation or legal use. Other pathway settings begin unknown. Explicit user changes are tagged `user` and remain unverified.

For a live City of Victoria property, the client sends the selected municipal parcel candidate's typed `city-of-victoria-pid-parcels` reference and optional PID to `/api/victoria-zoning/lookup`. This is the PID parcel layer reference supplied by `/api/municipal-sites/search`, not the address point's layer ID, the client display ID, or a parsed placement ID. The lookup runs only after explicit parcel confirmation. A matching, completely covered, single mapped zoning polygon can tentatively populate zone and bylaw; source label, capture date, review state, coverage and issues remain visible. The complete response, including geometry and raw source fields, stays in technical evidence. Split, partial, missing, unsupported, unavailable, malformed, mismatched or stale observations cannot populate those settings. A manual zone/bylaw choice remains separately tagged `user`; it is never overwritten by a later lookup.

The backend screening and placement-scenario requests carry the setting evidence next to values. The screening API checks that evidence values match the proposal, retains their origins and source, and rejects malformed or mismatched payloads. Legacy clients without evidence still work with the former user-assumption behavior. No candidate legal rule or accepted data release changes here.

Floor area is entered under a plain `Floor area (m²)` label with click/keyboard help naming the candidate Victoria definition and rule revision. A number starts as a rough estimate and is not used for the candidate area check. Selecting the candidate regulatory measurement basis tags the acknowledgment as derived from that choice; the measurement and exact number remain in the request. Nominal Model 300 footprint remains distinct. Changes to placement clear the entered measurement and basis.

## Verification and limits

- Frontend test suite, production build, and focused conditional-screening/scenario API tests are the software checks for this change. The new behavioral cases cover exact selected parcel identity, single/split/stale mapping, manual override, rough versus regulatory area, and evidence value mismatch. Browser walkthrough findings are recorded in the PR handoff.
- Municipal map records are live, unreviewed observations. They do not establish a current legal zoning designation, overlays, amendments, variance, lot identity, parcel boundary accuracy or garden-suite permission. City feature update dates and legal revisions are not supplied by the live map response.
- The candidate Victoria garden-suite packet remains unreviewed and unpublished. Front setback, rear-yard occupancy/location, height, projections, full site-specific provisions and current applicability remain outside positive coverage. A real evaluation needs reviewed current source documents, controlled manufacturer drawings, legal lot evidence and user validation. See [quality gates](quality.md#explicit-integration-gaps).
