# Enquiry and download slice - homeowner UX round 2

October 7, 2026. Base: `becce2e` on the isolated export worktree; integration
branch `codex/homeowner-ux-round-2`. Recipient: the selected prefab provider.
Purpose: request the homeowner's chosen response and useful next steps, carrying
material preliminary concerns without asking the provider to determine planning
permission. Full evidence remains separately recoverable in the existing package.

## Implemented

The existing structured enquiry is still the single source for preview, copy,
email and Markdown. Free answers now form prose; provider product questions come
before distinct planning-review tasks. Not sure stays unconfirmed. A concrete
`EnquiryInput.propertyConcern` appears with material concerns, while hypothetical
garden-suite comparisons are excluded from the recipient's concern list for
unknown/other-use scenarios. Approximate physical concerns remain. Saved examples
do not claim the sender owns the example property.

`renderEnquiryPdf(enquiry, assets)` in `placementExport.ts` exports that recipient
document and, when supplied, a separate approximate plan with readable source
notes and clickable source URLs. `renderDrawing` additionally provides
`mapPngUrl` and `mapNotes`; older DrawingAssets remain compatible. Enquiry PDF
works without a plan and does not fabricate an attachment. Existing placement
PDF, PNG, Markdown, ZIP and unsent email paths remain available.

`EnquirySaveOptions` accepts `onSave(kind)`, `disabled`, `busy`, `hasPlacement`.
Kinds: enquiry-pdf, markdown, png, pdf (placement-only), package. It presents
Save enquiry PDF first and other formats in a keyboard/touch disclosure.

## Parent wiring

The integration owner imports EnquirySaveOptions and renderEnquiryPdf, adds
'enquiry-pdf' to the existing guarded exportPlacement action, and downloads
`prefab-enquiry.pdf` as application/pdf. Pass only coherent current enquiry and
placement inputs. Recheck the captured enquiry/property/model/use/revision identity
after every asynchronous generation step before downloading or storing artifacts;
the drawing revision alone does not protect changed contact/project answers.
Busy/updating state must disable save. Pass the confirmed parcel's concrete
identity concern as propertyConcern; do not manufacture a generic warning.

Replace competing primary download buttons with EnquirySaveOptions while retaining
the existing unsent-email and supporting-report actions. Current assets can be null;
a missing plan must not disable the message PDF.

## Verification

- Build/typecheck and git diff --check passed. Vite retains its existing chunk-size
  advisory. Focused public document/model-switch/download checks passed 25/25.
- `frontend/tools/verify_enquiry_pdf.mjs` ran through actual browser canvas and
  jsPDF with installed Chrome and bundled Playwright. It generated a three-page
  saved-example Model 300 enquiry (two message pages plus plan/sources) and a
  one-page unknown-use C.H. Studio Pod enquiry without a plan. Poppler rendered
  every final page; all four pages were visually inspected. Layout, paragraphs,
  contact block, page numbering, Unicode Su’it/Zoë and plan labels were readable,
  with no clipping or missing glyphs. Pypdf found six source-link annotations.
- The fixture combines retained Parcel 87 geometry with the existing reporting
  reconstruction of rear-yard concerns, and labels its 4 by 6 m rectangle as user
  edited. This is a rendering/reporting exercise, not a new real-site evaluation.
  The Studio address is a supplied text fixture; no live selection is implied.

To reproduce, run Vite from frontend on port 5189, set PLAYWRIGHT_MODULE to an
installed Playwright package and PLAYWRIGHT_CHROMIUM_EXECUTABLE to Chrome when
bundled browsers are unavailable, then run `node tools/verify_enquiry_pdf.mjs`
from frontend. PDF_CHECK_ORIGIN can override the server origin. PDFs and document
JSON appear under output/pdf. Render with `pdftoppm -png` and inspect every page.
Ordinary CI remains offline and does not require Chrome/Playwright.

## Remaining gaps

- Parent must integrate the primary-save component and asynchronous current-input
  guards, then inspect actual PDFs for 601 Su’it Street, 419 Cecelia Road and the
  saved example through the composed journey. This blocks round acceptance, not
  generation of the verified fixtures. Owner: integration coordinator.
- PDF text is rasterized to preserve browser/system-font Unicode fidelity. It is
  readable but not searchable or screen-reader-tagged; Markdown remains the
  accessible/editable format. A future tagged/vector Unicode PDF needs a licensed
  bundled font and suitable document structure. Owner: future accessibility work.
- Long/irregular real plans still need representative recipient review; the existing
  plan renderer's label placement has not been redesigned in this slice. Parent
  owns actual-case visual review and any reproduced defect fix.
- Independent planning/provider source review, accepted publication and homeowner/
  manufacturer validation remain external gates; software checks and agent visual
  inspection do not establish source accuracy, legal feasibility or recipient usefulness.
