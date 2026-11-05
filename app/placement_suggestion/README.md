# Suggested starting placement

`POST /api/placement-suggestions/v1/suggest` takes a versioned geometry request and
an optional current Victoria scenario context. It returns one editable position for
the nominal rectangle, or a bounded no-suggestion/unsupported result. It does not
change the supplied-placement evaluator or publish regulatory data.

The search samples a 25 × 25 grid plus representative points and centres of mapped
open-space components. It tries the supplied angle, the lot's long direction, and
their perpendiculars. The complete rotated footprint must lie strictly inside the
parcel and clear all captured structures, including contact. Explicit applicable
clearance targets are preserved. Broken source shapes are not dropped to get a
better score. Partial coverage remains disclosed even when a position is suggested.

Where a boundary scenario is available, each complete assignment is scored using
the scenario evaluator's side/rear/street-side limits, supported front limit, and
per-edge planning buffers. An old wall-to-line or wall-to-wall measurement cannot
be transferred to another location. Prefer a position satisfying all tested boundary
assignments when possible, then maximize the smallest clearance left under a whole
assignment. Check up to 80 shortlisted positions for supported additional spatial
conflicts before offering a candidate. The HTTP body, geometry complexity and feature
counts are bounded; the search also checks a three-second computation budget. A
time-limited search may return no suggestion without exhausting the sampled set.

The map auto-suggests on first placement for the selected parcel. A drag, rotation,
manual edit or scripted walkthrough position cancels pending movement. Subsequent
searches are deliberate. The selected candidate's packet, source, scenario and
placement observations remain distinguishable from the subsequent assessment.

Focused verification: `python -m uv run --locked pytest -q tests/test_placement_suggestion.py`
and the mounted frontend journey in `frontend/src/placement_suggestion/placement-suggestion.test.tsx`.
These protect occupied, narrow, touching, oversized and invalid examples, coherent
setback margins, and recovery after a stale suggestion. They do not verify legal
applicability, a global optimum, delivery access or homeowner usefulness.
