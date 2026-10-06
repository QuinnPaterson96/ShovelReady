# Model 300 manufacturer preview card handoff

Checked 2026-10-05 for [issue #199](https://github.com/QuinnPaterson96/ShovelReady/issues/199). This is an independent commercial demonstration and is not affiliated with aux box.

## Decision and source review

The [official Model 300 page](https://www.auxbox.ca/model-300) labels several gallery items as Model 300 and describes a private bedroom, kitchen, bathroom and 300 sq ft footprint. It does not identify the photographer or grant reuse of those gallery photos in ShovelReady. The [media kit](https://www.auxbox.ca/media-kit) links to [brand assets](https://www.auxbox.ca/brand-assets) and cautions against implying endorsement with its logos. The brand-assets page says its press images are prepared for digital use, but the labelled product images are 146, auxffice, 106, “Models” and muskokad; no specific Model 300 image is identified. The [privacy/legal page](https://www.auxbox.ca/privacy-and-legal) addresses personal information, not gallery-image licensing. Public viewing, page metadata and a generic “Models” file do not establish a right to publish a Model 300 photograph here. No manufacturer contact was made.

The card therefore uses a locally rendered text/number graphic and a prominent official-page link. It does not copy, download, hotlink, embed or generate a purported Model 300 photo. The previous [image research note](research/model-300-image/README.md) reaches the same rights decision.

## Implemented

- `ModelImage` remains the existing export and mount in `BuilderDemo`; `App.tsx` already imports the module CSS. No host or catalogue change is required.
- The responsive card names Model 300 and aux box, gives a short manufacturer-sourced description, links to the official product page in a new tab, and states the independent-demo context.
- The optional `ClearedModelPhoto` contract remains for a future locally hosted, attributed image. Remote URLs and incomplete metadata fall back to the link-only card. A failed local image displays a text fallback, leaving the source link available.

## Verification

From `frontend/`, `npm ci`, `npm test` (98/98), `npm run typecheck` and `npm run build` passed on the working tree before commit. The first `npm test` attempt failed because dependencies were absent; `npm ci` resolved that setup issue. `git diff --check` passed. The in-app browser refused both `http://127.0.0.1:5174/` and `http://localhost:5174/` with `ERR_BLOCKED_BY_CLIENT`, so mounted visual inspection, keyboard navigation, narrow-layout inspection and a runtime broken-image check remain unverified here. The source review establishes a conservative display decision, not legal clearance or verified manufacturer specifications.

## Remaining gaps and ownership

- **Photo acceptance, issue #199 / product owner:** Obtain a written grant or a clearly applicable licence from the actual rights holder for one identified Model 300 image, including permitted commercial-demo use, transformations and credit. Record photographer/rights holder, asset identity, permission evidence and check date, then place the approved file under `frontend/public/model-300/` and pass its local path and metadata. Until then the demo has a useful manufacturer link but no photo. Keep #199 open.
- **Placement visibility, integration owner:** The card is inside the existing “Model photos, specifications and sources” disclosure. Move or expose it above that disclosure if the entry journey needs the preview visible by default; this task does not edit the shared host.
- **Browser acceptance, integration owner:** Run the local Model 300 journey in a browser that permits localhost. Open the model disclosure, inspect the card at desktop and 320 px, tab to the official link, and use a deliberately missing local photo in a focused harness to confirm the error fallback. Browser blocking prevents those checks in this task.
- **Accepted real evaluation, separate data/rule owners:** Manufacturer input review, site observations and applicable zoning checks remain separate gates. The card does not establish site fit, legal compliance or manufacturer endorsement.
