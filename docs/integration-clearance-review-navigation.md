# Clearance suggestions and review navigation — October 8, 2026

Empty property entry stays visible during navigation and has no collapse toggle until a usable property is selected. Enquiry navigation focuses its section heading. Adding a finding acknowledgement focuses the next unaddressed finding (wrapping to earlier questions), while removing one stays in place; original evidence status is preserved.

A current approximate main-building clearance concern now offers a conservative translation using the selected mapped outline, nominal rotated footprint and candidate threshold. Projected extents are separated along their centre-to-centre direction, including overlaps. Coincident centres have no suggested direction. User-entered separation measurements do not get this mapped adjustment. The action uses existing movement wiring, preserves streets and boundary answers, and recomputes dependent findings; it can produce boundary or other-building conflicts. It does not establish a feasible position or legal wall separation.

Verification: 173 frontend tests and production build passed (existing bundle-size warning). Regression coverage checks empty address visibility after navigation, next-question focus without resolving concern, enquiry-heading focus, and independently calculable overlapping rectangle translation. Final-head CI and live deployment checks are recorded in the PR handoff. These are software/developer checks, not independent homeowner validation.

Remaining: movement is conservative, not a whole-site optimizer; the homeowner must review every recalculated concern. Source/outline accuracy and legal applicability remain unresolved. Coincident-centre placements require manual movement. Search ranking and duplicate cleanup remain a separate search follow-up.
