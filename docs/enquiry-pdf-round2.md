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

## Follow-up: recipient opening and reproduced plan-label collision

The supplied requested response now leads the enquiry. A distinct free-text
question remains in the provider questions; the default suitability prompt and
identical response are not duplicated. The contact closes the message without
another generic next-step request. A dedicated placement section lets each
recipient format replace availability wording with its actual included/following
sketch statement, or omit it when no drawing is present.

Measured-gap drawings now reserve right and bottom callout gutters. All connector
paths render before opaque label cards, preventing a connector from crossing the
candidate minimum. Drawings without gap callouts retain their existing transform;
source geometry, measurements and comparison evidence are unchanged.

Verification: build/typecheck passed and 28 focused behavioural checks passed
(default/custom/duplicate opening, delivery wording, callout layer order, existing
exports and model switching). Browser-generated Model 300 and unknown-use Studio
PDFs were regenerated, Poppler rendered, and all four pages inspected. Headings
retain following text, Unicode and contact blocks remain readable, and the plan
statement accurately describes the following page. A separate browser-rendered
Su’it label-risk reconstruction uses the retained second-PID parcel and rooflines
with a 3.048 by 9.144 m unit at 80.48 degrees; gap endpoints/distances were supplied
for collision review, not evaluated as a real-site result. Its right gap labels
and zero-gap/2.4 m minimum card are clear, including the full crossing roofline.

Remaining acceptance work: the coordinator will cherry-pick this follow-up,
regenerate actual composed Su’it/Cecelia/example PDFs, and inspect their final
pages. This is needed to verify current integrated input and labels; the worker
reconstruction does not substitute for that review. Raster-PDF accessibility and
independent source/provider review gaps above remain.

## Follow-up: actual Cecelia pagination review

The PDF message now omits the sketch availability section: the plan page carries
its discussion-sketch note beside the actual drawing. The drawing's own header
is used once instead of adding a second PDF heading. Body text remains 22 px with
32 px line height; paragraph separation is 14 px rather than 18 px.

Verification: typecheck and seven focused export checks passed. The real-browser
PDF smoke check now asserts the painted message has no sketch-availability block
or duplicate plan heading, the plan has its scope caption, and no-assets output
has no phantom plan note. All four regenerated example/unknown-use PDF pages were
rendered and visually inspected. The longer reconstruction retains two message
pages for readable content. Actual Cecelia recipient Markdown from the integrated
package was reconstructed with a clearly separate saved-plan rendering fixture:
its message, including Thank you, now fits page one and the plan occupies page two.
Both pages were inspected. This checks message pagination, not Cecelia geometry.
Coordinator still owns final actual-case re-download and integrated plan review;
raster-PDF accessibility and independent source-review gaps remain unchanged.
