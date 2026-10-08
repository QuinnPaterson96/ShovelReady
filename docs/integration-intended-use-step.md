# Intended use in property details — October 8, 2026

Moved the existing intended-use question from the model introduction to the top
of Property details, after placement/street/boundary work and before the conflicts
and checklist. Entering that step focuses the question; intended-use review links
open the same control. The answer and enquiry editing use the existing shared
state and applicability mapping. No answer or planning pathway is inferred by
navigation. Sites without a supported map editor retain a property-details control.

Verification: extended the existing host/map journey to check visible intended use
inside Property details, its order before the findings and the new focus target.
The 171 frontend checks and production build passed on the final change;
final-head CI and live verification are recorded in the PR handoff.

Separate proposal-type/use questions and a main-home planning pathway remain
proposals for a future round. This move does not add planning coverage. No enquiry
is sent; developer checks are separate from independent homeowner validation.
