# Compact map help and persistent Next — October 8, 2026

The street-marking workspace prioritizes one instruction, the map and Next. The
long role illustration and street assumptions move into the existing accessible
info popups. Native keyboard marking remains expandable, Not sure remains visible,
and the saved-status line names how many streets the user marked. The unused
editor wrapper is hidden while its mounted state and evaluation callbacks remain.

Ordinary info triggers now draw a small circle inside their existing 44 px hit
target. Hover, focus, click/tap pinning and Escape remain supported. Rich property
scan cards retain their custom triggers. The legend is shortened; full geometry,
provenance and evidence exports are unchanged.

Next floats at the bottom of the viewport, aligned with the map, while the drawing
is visible. It returns to document flow outside the map and retains the same
disabled/saving logic and navigation handler. No answer is confirmed by scrolling
or opening help. The action retains specific buffer-saving and unknown-street
status; supporting continuation text moves into its info button.

Verification: existing frontend integration tests exercise visibility transitions
without changes to the technical scenario, plus existing revisiting, uncertainty,
keyboard-help and answer invalidation behaviours. Rendering checks cover compact
help and native keyboard disclosure. Final-head CI and live visual/keyboard checks
are recorded in the PR handoff, separately from independent user validation.

Remaining: automatic movement for main-building separation remains a separate
follow-up. Manual movement and carrying unresolved concerns into an enquiry are
available. This presentation round does not expand measurement or legal coverage.
