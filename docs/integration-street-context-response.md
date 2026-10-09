# Deliberate street context — October 8, 2026

Street marking explains why frontage affects boundary comparisons beside the map.
Moving past an unanswered street step (including later-stage navigation and the
boundary tab) opens a native modal explaining potential legal classifications,
distances and garden-suite location. It offers Mark streets, Not sure and explicit
No edges border a street. Escape/Mark streets do not supply an answer.

Marks save an answer immediately; removing the last mark clears it. Not sure clears
marks and retains unknown street completeness. Explicit none records zero selected
edges with user-confirmed selection completeness; it does not infer front/rear roles
or verified legal frontage. The modal opens only until a deliberate response is
recorded for this parcel geometry. Revisit/placement changes retain it; changing
property or clearing the last mark asks again. Workflow ticks record answering,
not resolved evidence. Unknown street-dependent findings remain unresolved.

Verification: frontend tests (176), production build, diff checks. Journey regression
covers untouched/cleared streets opening the modal without confirming data, returning
to mark, explicit unknown continuation and revisit, explicit none, and marked streets
continuing unchanged. Existing canonical replacement-modal test now identifies an
open dialog instead of assuming it is the first dialog in the DOM. Live deployment
identity and browser checks are recorded in the PR. These are developer/software
checks, not independent homeowner validation or legal source review.

Remaining: automatic street detection, reviewed legal frontage and broader rule
coverage remain separate work. No road geometry is automatically verified. Editable
state persistence across reload remains a separate recovery task; this response is
kept in the active journey only. No enquiry or provider form is sent.
