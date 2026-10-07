# Main-building correction and enquiry evidence — October 7, 2026

## Implemented

The supplied 419 Cecelia package incorrectly chose a 12.7 m² shed because the
122.3 m² house roofline protruded about 0.0231 m² beyond the mapped parcel. Both
frontend and API now rank usable full outlines before testing the largest
outline's centroid against the parcel. A crossing roofline is retained and flagged;
it does not silently demote the house to a shed. Ties, unusable geometry and a
largest outline centered elsewhere leave identification unresolved. Explicit user
choices remain possible. API validation rejects a stale default naming another
outline. These are assumptions about mapped geometry, not proof of building use.

The same proposed rectangle and source geometry now produce:

| Comparison | Previous shed assumption | Corrected house assumption |
| --- | --- | --- |
| Main-outline area | 12.7 m² | 122.3 m² |
| Main-building gap | 5.19 m | 1.51 m: below candidate 2.4 m |
| Approximate rear-yard area | 47.2 m² | 168.3 m² |
| Nominal footprint / rear yard | 59.1% | 16.6%: below candidate 25% |
| Inside estimated rear yard | No | Yes, under assumptions |

The API supplies versioned optional drawing evidence: selected outline, exact area,
parcel crossing flag, closest-point endpoints, estimated yard polygon and footprint
portion outside that yard. Exports consume the same evidence as the comparisons;
they do not derive another legal yard definition. PNG/PDF show the yellow yard and
its dashed boundary, red outside-yard portions when present, and labelled mapped
gaps with endpoints and spaced callouts. Manual wall measurements remain separate
from mapped endpoint lines. Unsupported yard geometry is not drawn as a known yard.

The package has separate recipient Markdown, sender checklist, readable supporting
report, technical JSON, PNG and PDF files. Standalone report and JSON downloads are
separate. New tab recovery snapshots also keep readable text and technical JSON
separate; older historical snapshots remain recoverable in their original format.
Coordinates, exact values, provenance and identifiers remain in JSON. The report
uses plain descriptions, groups repeated rule sources, and attachments use structured
observations rather than input instructions. Owner preparation recognizes an explicit
“I own the property” answer while retaining unverified ownership and title questions.
The manufacturer email retains its existing questions and voice; its concerns change
only because the underlying comparisons changed.

## Verified

- Reproduced the defect from the supplied public mapped geometry, retained in
  `frontend/src/builder_demo/cecelia-geometry.fixture.json`; no sender contact/context
  answers are stored in the fixture.
- Stateless API regression checks the house identification, gap, yard denominator,
  outside-yard evidence, stale-default refusal and explicit shed override. Endpoint
  length and polygon area match the comparison values. Frontend regression covers
  order/winding invariance and refusal to fall back to a shed when the largest
  outline is centered elsewhere.
- Package behavior checks JSON preservation, report separation, owner context,
  visual concern layers, corrupt endpoint rejection and recovery separation.
- 54 focused backend tests passed without a database. Typecheck/build passed;
  all 145 frontend tests passed, including the recovery/endpoint extensions.
- Generated the corrected package through the actual browser export functions and
  rendered/visually inspected all three PDF pages. The readable report was about
  2,100 words / approximately 18 KB; the 297 KB technical JSON was separate. Recipient Markdown was
  about 316 words including the sketch reference. The final reproduction refreshes both API comparisons and clears prior acknowledgements/readiness after changing the main-building assumption; it does not invent a renewed user review. No enquiry was transmitted.

## Remaining gaps

- Homeowner/source reviewer must confirm which outline is the actual principal home,
  surveyed walls/boundaries, projections and the applicable legal rear-yard definition.
  The correction establishes reproducible mapped comparisons, not accepted compliance.
  Controlled source and applicability review remains under #104.
- Product owner/provider must validate recipient usefulness, physical touch behavior,
  email-client attachment handling and actual intake upload availability (#147).
- Platform owner still needs durable editable case recovery and exact-image deployment,
  promotion and rollback controls (SR-14/SR-15). This change adds no persistence service
  or accepted regulatory publication.
