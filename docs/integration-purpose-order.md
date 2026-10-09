# Purpose order and required enquiry fields — October 8, 2026

The intended-purpose section is hidden during placement, street marking, boundaries
and property details. Its later step retains the centered card and keyboard focus.
It follows the property-details slot and precedes quick checks in captured map layouts.

Root cause: the footer portal looked for its destination only once per target ID.
Live geometry could create or replace that destination later, leaving purpose at its
fallback source location above the map. The portal now observes DOM child changes,
finds late/replaced destinations and cleans up its observer when unmounted. No input
or evidence changes result from moving a section.

Prepare a useful question labels intended use, property relationship and response
wanted as Required. Empty required inputs are highlighted, with accessible required
semantics and nearby help. Unknown/Not sure/Prefer not to say remain accepted explicit
answers. Question, timing and remaining details stay optional. Existing generation
requirements are unchanged; no new recipient information or mandatory facts added.

Verification: 176 frontend tests pass and production build passes. The late/replaced
map integration reproduces the portal lifecycle defect. Existing journey coverage
checks early hiding, later order, centered focus, required fields and optional question.
CI and live deployed case/layout checks are recorded in the PR. These are software
and developer UI checks, not independent homeowner validation or source review.

Remaining: wider-use rule packages and durable editable journey recovery are separate
product work; this correction does not establish new planning coverage. Stage subgroup
navigation remains a UX follow-up from the previous round.
