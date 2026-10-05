# Model 300 enquiry preview and email drafts (#196, #197)

## Implemented

- The builder journey derives its semantic preview, plain-text copy, Markdown download and concise email body from one `EnquiryDocument`. The visitor's question leads the document, followed by Model, Property, Placement and Still to confirm. HTML text is escaped by React; public HTTPS source links remain clickable. Exact raw evidence stays in the separate technical export.
- The email controls show the editable recipient, fixed subject and exact body before opening the default email app or Gmail compose in a new tab. Site details are excluded unless the visitor opts in. The app never sends email. Invalid or multiline recipients are rejected. If a URL exceeds 1,800 characters, the app explains that it will open a short placeholder; the full text remains available to copy and paste.
- `BuilderDemo` now accepts optional `onProgressChange(progress)` with `{ model, property, placement, enquiry }` booleans. Model is selected for this single-model journey. Property requires the saved example, a confirmed source selection, or explicit confirmation of manual facts/sketch. Placement requires a current measurement. Enquiry requires the visitor to select **Mark enquiry ready**. Edits clear readiness. The parent can mount journey navigation without changing `BuilderDemo` internals.

## Recipient source review, 2026-10-05

The [official aux box contact page](https://www.auxbox.ca/contact) directs general enquiries to its contact form or a discovery call but does not publish a product enquiry email. Other official pages publish addresses for [media and brand enquiries](https://www.auxbox.ca/media-kit), [privacy enquiries](https://www.auxbox.ca/privacy-and-legal) and [jobs](https://www.auxbox.ca/jobs). No address was verified as a product enquiry recipient, so the field is blank and editable. This is a source review of the public contact route, not a validation of delivery or a provider relationship.

## Verification and remaining work

- Frontend `npm test` passed 88 tests, including source identity, unknown placement, cross-format content, escaping, optional site details, URL encoding, injection rejection and overlength fallback. `npm run typecheck` and `npm run build` passed from this worktree.
- Browser use could not open the local Vite server in the in-app browser (`net::ERR_BLOCKED_BY_CLIENT`); Chrome was unavailable as a separate browser target. Narrow-screen rendering and keyboard use still need human browser validation. The responsive CSS and native controls were inspected in code.
- This remains a preliminary, unsent demonstration. It does not establish accepted zoning evaluation, provider dimensions, service availability, recipient suitability or conversion usability. Source review of current controlled drawings, accepted data publication and real-user validation are separate future work.
