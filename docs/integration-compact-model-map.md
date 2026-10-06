# Compact Model 300 placement workspace

Scope: UI ticket #233 and the display/provenance portion of #231. This is a preliminary builder-journey presentation change, not a zoning data release.

## Implemented

- The saved example and confirmed live parcel now use a compact model summary and full-width bounded map. Movement, rotation, alignment and reset are below the map. Direction buttons, dimensions, clearance targets and source records remain available through keyboard and touch accessible disclosures. The generic occupied-lot journey retains its own full model selection workflow.
- Placement and candidate checks refresh after input settles. The explicit action is a recheck/retry. Old geometry and scenario results disappear when the input revision changes. Boundary selection disables map movement, including arrow keys.
- The current result area separates captured geometry, approximate candidate edge scenarios and the user-entry legal-basis checklist. Role labels derive from the returned scenario assignments and are never copied into user facts. User wall-to-line distances are shown next to the separate captured distances with their distinct basis. The full regulatory checklist is disclosed below a short default summary; missing front setback, rear-yard, height and other coverage stays visible.
- Nested scenario response fields are validated before display. Exact requests, results, source records and measurements remain copyable in technical details and enquiry exports.

## Actually verified

- Frontend typecheck and production build passed; the existing bundle-size advisory remains. Frontend suite: 109 passed, including the scenario consumer/provenance regression. Focused Python scenario and conditional API tests: 14 passed with a Starlette/httpx deprecation warning. No database was used.
- In the local combined app at desktop and 390 px, the saved example auto-measured, displayed a captured conflict, invalidated old results on keyboard movement, and recomputed a one-scenario bounded distance result after choosing edge 4 and a single-street assumption. Boundary mode prevented arrow movement. At 390 px the document client and scroll widths were both 375 px.
- The public 419 Cecelia Rd example was used only as a test lead, with no ownership claim. Address and parcel were separately selected and locally confirmed; the compact live map rendered at 390 px without horizontal overflow. Click-to-place triggered automatic checks, and dragging the copper rectangle changed the projected centre. The result retained a roofline overlap alongside a passing *distance subset*. The UI now states that a distance subset cannot cancel that conflict.

## Remaining gaps and next action

- Demo usability: touch-device input and detailed manual override editing were not completed in this browser pass. Frontend owner should cover them in the next focused user journey; existing scenario/assumption tests cover the underlying basis and invalidation contracts. Keep #231 open until that pass and review confirm its full criteria.
- Demo topology: irregular, holed and multi-edge parcels remain unresolved. Geometry owner should add reviewed role rules and representative cases before widening the automatic screen.
- Accepted evaluation: #104 needs current source interpretation, legal lot lines and walls, current zoning, front/rear-yard, height, projections and site-specific rules. Source reviewer and product owner must review and publish accepted data separately before this can become a complete real-site evaluation.
- User validation: #147 needs prospective users; agent/browser checks do not establish comprehension or practical usefulness.
