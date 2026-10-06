# Compact Model 300 property selection — October 5, 2026

Issue: [#226](https://github.com/QuinnPaterson96/ShovelReady/issues/226).

## Implemented

- Choosing an address collapses the search and address results to a selected lead with **Change address**. It starts a separate parcel search and never selects a parcel automatically.
- Choosing a parcel collapses the parcel results to a selected lead with **Change parcel**. The observed property still requires a separate confirmation. After confirmation, the builder's existing stage transition closes Property and opens Placement. Reopening preserves the choices until the visitor edits or selects a replacement.
- The observed-property figure now takes the height of its caption, map, legend, explanation, and source details. The map is bounded within the panel on wide and narrow screens. A readable parcel-source line remains visible; full map source details and exact observation records are expandable.

No transport contract, geometry, source value, or backend behavior changed. The selected leads and observation remain unreviewed and do not prove ownership, fit, or permission.

## Verified

- `npm ci`, `npm run typecheck`, `npm test` (104 passing), and `npm run build` in `frontend/`; `git diff --check` passed. The Vite bundle size advisory remains.
- A local Chromium browser used the built app and local FastAPI on `127.0.0.1:8000`. At 1440 × 900 and 390 × 844, a live public lookup for **419 Cecelia Rd, Victoria** covered search, explicit address and parcel choices, observation, confirmation, reopening, and address correction. The observed figure ended above its confirmation button, and neither viewport had horizontal document overflow. Changing the address removed the parcel choice and disabled placement. This address is only a public lookup example, not proof of ownership.
- A browser replay with an injected address-service 503 showed the error and manual path at both widths. A delayed response showed the loading message during the desktop run. The existing flow tests cover delayed replies, selection invalidation, partial observations, and retries.
- Captures: [wide observation](qa/compact-property/desktop-observation.png) and [narrow observation](qa/compact-property/narrow-observation.png). The narrow capture shows the upper portion of the observation panel; the automated bounding-box and overflow checks covered its full height.

## Remaining gaps

- **Demo usability:** No independent visitor has validated whether the shorter sequence is understandable. Next: product owner runs a fresh-user walkthrough, especially the separate parcel and final confirmation steps.
- **Accepted real evaluation blocker:** Address-to-parcel identity, roofline accuracy, source currentness, and Model 300 dimensions remain unreviewed. Next: source reviewers confirm these inputs before using a real property for accepted screening; this UI work does not publish evidence or a zoning result.
- **Regression automation:** The local browser walkthrough is recorded here but is not a CI browser suite. Next: frontend owner adds a small deterministic end-to-end journey when browser infrastructure is available in CI.
