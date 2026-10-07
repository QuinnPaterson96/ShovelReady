# Enquiry context and placement exports

Implemented October 7, 2026, following the owner's manufacturer-perspective feedback.
Recipient: aux box intake staff. Purpose: an initial discussion about Model 300 on
a prospective site, with specific concerns and useful questions. This changes
communication and local exports, not geometric or regulatory evaluation.

## Implemented

- The journey requests intended use, relationship to the property and desired
  response before generating/copying/exporting an enquiry. Unknown and Prefer not
  to say are valid explicit answers. Only an explicit Still deciding answer
  becomes that statement. A screening-use assumption cannot supply intended use.
- Five manufacturer questions remain, with simpler foundation/utility wording
  and standard-model starting price/inclusions unless options are supplied.
  Material concerns and named property findings remain. Generic workflow labels,
  empty-field lists, excess percentages and sender instructions are kept out of
  the recipient message. Rounded equality still discloses an exact exceedance.
- A separate on-screen and exported sender checklist holds permission, property
  facts, plans/photos, planning review and unresolved review topics.
- A current measured placement produces a browser-local drawing after context
  answers are supplied. It includes parcel/building geometry, footprint and
  rotation, main-home identification, marked streets/waterfront, assumed edge
  roles, gaps, buffers, candidate comparisons and source/review information.
  The whole footprint is included even when outside the parcel. Local sketches
  state north unknown. Entrance/access/utility routes are not fabricated.
- PNG and paginated PDF exports visibly say approximate, not a survey or approved
  plan. Page one is the drawing; supporting paragraphs break between paragraphs
  where possible. PDF artwork is rasterized; complete machine-readable values
  and original provenance remain in the supporting Markdown/JSON evidence.
- Standalone Markdown embeds the PNG; the ZIP pairs Markdown with a relative PNG
  reference, PDF, full supporting evidence and separate preparation checklist.
  Readers that reject data images can use the portable ZIP. Without a current
  measurement the enquiry/report export remains available, with no claimed drawing.
- A downloadable X-Unsent MIME .eml draft contains the complete UTF-8 message and
  PNG attachment when site details are included (default, explicitly removable).
  Normal mailto/Gmail links cannot attach files and retain manual-attachment help.
  No email-client API, automatic form filling, transmission or public upload is added.
- Website text mentions a sketch only once a current artifact exists. Attached
  email wording differs from website wording. Geometry/assumption changes invalidate
  old assets; asynchronous results cannot replace the newer placement.
- jsPDF and fflate load on demand for browser PDF/ZIP export. The lockfile also
  updates source-map-js to resolve its reported advisory; audit reports zero issues.

## Verification

Base: main 8476a12ff735e51579b43518edb6e6e4af664c69. Final head and CI are in the PR.
Local full suite: 142 passed. Final focused enquiry/journey tests: 16 passed.
Production build and npm audit passed (zero vulnerabilities). Commands from
frontend: npm run build; npm test; npm audit. The build retains the
existing large-bundle advisory. There are no persistence/backend contract changes
and no local database tests were needed.

Existing mounted journeys cover the context gate, explicit unknown/withheld
answers, navigation and invalidation of old exports during placement updates.
Reporting checks cover preserved concerns, named findings, explicit indecision,
standard pricing and exact evidence. The export test independently uses a 2 x 4
rectangle on a 10 x 10 parcel at 90 degrees, plus holes, escaping and byte-exact
UTF-8 MIME/attachment decoding. These checks establish software behavior only.

Local browser inspection uses the labelled retained example, not a new real-site
evaluation. Downloads were parsed with Python's ZIP/email readers: image references
resolve, inline PNG decodes, and the MIME attachment matches the ZIP PNG exactly.
PDF pages were rendered with bundled pypdfium2 and inspected for drawing/text layout.
The example enquiry was approximately 305 words before sketch availability text.
Retained review artifacts: C:/Temp/shovelready-enquiry-export-review. No provider
form/email was submitted. Desktop/mobile checks and final live identity are recorded
in the PR handoff after completion.

## Remaining gates

- Product owner/#147: test comprehension with actual homeowners/manufacturer staff
  and physical touch devices. Agent/editorial inspection is not recipient validation.
- Product owner: verify .eml editing/attachment behavior in Outlook, Apple Mail and
  other target clients. X-Unsent is a client convention; clients may open a message
  viewer. Copy plus manual attachment remains the supported fallback.
- Source reviewer/#104 with homeowner/provider: controlled rules/drawings,
  survey/title/permit/projection/service evidence remain necessary for accepted
  real evaluation. Neither drawing export nor acknowledgement establishes approval.
- Platform owner/SR14-SR15: full editable refresh recovery, durable assessments and
  isolated rollback/exact-image promotion remain open. This retains the existing
  browser-local text recovery; drawings can be downloaded but are not durable records.
- Provider owner: verify upload capabilities and contact routes individually before
  adding other providers. Current routing is the existing aux box contact page.
