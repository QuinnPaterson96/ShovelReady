# Compact placement controls — October 8, 2026

The homeowner map is the primary placement and street-marking interface. Rotation
and alignment remain visible below the drawing; less-used dimensions, nudges,
reset and recheck controls are disclosed under More placement controls. The next
action consequently follows a short control group instead of a full editor.

Full-size preview and source help sit above the drawing. Boundary-role illustrated
help also sits above it when marking edges. Street buttons remain available under
Mark without the map for keyboard access, with Not sure visible. Boundary facts
keep the same mounted editor across modes: opening or closing help and revisiting
steps must not edit answers or discard accepted planning suggestions.

Verification: existing frontend suite (171 tests) and production build passed;
map rendering checks cover preview/help order and native disclosures. The journey
regression verifies accepted suggestions survive reopening street marking. No
backend, measurement, reporting contract or source rules changed. Final-head CI
and live post-deployment visual verification are recorded in the PR handoff.

Remaining: automatic movement for main-building separation is still a separate
implementation gap; the homeowner can move the rectangle or carry the concern
into an enquiry. This layout round does not claim independent user validation.
