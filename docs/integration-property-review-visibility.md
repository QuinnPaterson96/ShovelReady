# Property review visibility correction — October 8, 2026

The compact map-controls wrapper hid property facts as well as unused boundary
controls. Review main building correctly selected the property-details step and
focus target, but hidden ancestors made its controls invisible. The shared map
contract now explicitly exposes property details during that step while keeping
the same editor mounted. Ordinary placement and street marking remain compact.

The existing integrated journey regression checks that main-building selection,
home type, suite count and waterfront controls have no hidden ancestors during
property review. Navigation still does not confirm or edit answers. Frontend tests,
build, final-head CI and live action/focus verification are recorded in the PR.

Remaining: automatic main-building separation movement is a separate follow-up;
manual movement and unresolved-concern handoff remain available. Software and
agent-operated browser checks do not claim independent homeowner validation.
