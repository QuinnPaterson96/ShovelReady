# Main outline, waterfront marks and boundary planning

Implemented October 6, 2026. Base: main `14a86f7a9093acf33747fb82950a0382bcf24df0`.

The homeowner map selects a sole or unique largest usable outline on a convex
single-ring parcel as **Main building · assumed**. Ties, unknown geometry bases,
invalid outlines and unsupported parcel geometry retain the manual path. The
selection is attributed as a journey assumption. The API independently rechecks
that it is the unique largest valid contained polygon; it cannot satisfy the
legal principal-building prerequisite. Selecting an outline changes the source to
a user assumption; **Not sure** disables automatic reselection for this property.
A changed property/geometry remounts the facts; placement changes preserve marks
and buffers but clear placement-specific measured overrides.

**Waterfront lot: Yes** opens **Mark waterfront**. Exterior edges can be toggled
on the map or by labelled buttons, independently of streets and front/rear roles.
Choosing No clears water marks. These physical observations do not define a legal
front line or resolve waterfront siting rules. Waterfront-dependent comparisons
remain missing information with a specific property-plan review explanation.

The edge detail card has **Close edge details**, distinct from **Clear this mark**.
Closing preserves the role and measurements, clears the active marking tool and
returns focus to the marking controls. Selecting the edge again reopens it.

The right-hand grid uses explicit **Planning buffers (m)**, initially 1 m per edge
in the homeowner journey. Planning clearance is captured clearance less the stated
buffer, bounded at zero for display. Actual geometry distances and measured wall-to-
line overrides remain separate; buffers do not apply to measured overrides.
The raw scenario outcome and exact raw evidence are preserved. A buffer-only
shortfall shows **Needs review**, never an observed conflict. Clearing the candidate
minimums with the buffers shows **Likely fine**. A real comparison shortfall remains
a conflict, and unavailable geometry cannot become a zero measurement or a pass.
Front-distance checks use the same distinction. An overall exploration recommendation
cannot bypass a Needs review finding. These states and assumptions appear in the
unsent enquiry and the full technical record; no dataset was published.

**Likely fine** replaces **Probably fine** in the summary and preliminary scan,
with a question-mark explanation and the existing yellow check on green. Positive
mapped records now show Needs review; source failures remain missing information.
This is not a calibrated 90% confidence estimate.

## Verification

- `npm run build --prefix frontend`: passed; existing bundle-size advisory remains.
- `npm test --prefix frontend`: 135 passed. Existing mounted journey now covers
  card dismissal/reopening, preserved roles, default buffers, a buffer-only review,
  rejected automatic main selection, conditional waterfront marking/keyboard tabs,
  and readable enquiry assumptions. Mathematical outline tests cover sole/largest,
  ties and unknown bases with independent 2×2 and 3×3 examples.
- `uv run --locked ruff check app tests contract_tests migrations scripts`: passed.
- `uv run --locked pytest -q`: 552 passed, 37 skipped, 28 subtests passed locally.
  Skips are guarded disposable PostgreSQL/PostGIS checks; no shared database ran.
  Added real-HTTP examples independently specify raw 1 m versus buffered 0 m,
  measured 0.59 m versus the 0.6 m minimum, and front 4 m versus buffered 3 m.
  Invalid buffer values/edge references, contradictory waterfront facts, tied defaults,
  explicit Not sure and the unresolved legal principal-building prerequisite are covered.
- Local combined API/UI: main badge/selector, all four 1 m buffers, retained role
  after close, captured/planning clearances, watermark/conditional tab and keyboard
  marking inspected. At 390×844 the controls wrap without horizontal page overflow.
  Physical touchscreen use and independent homeowner validation remain untested.

Full local suites above cover `f756fbfb34d1535b44d86d5cdd7808917a25aab4`.
A final wording follow-up makes raw-pass/buffer-review evidence explicit and limits
the buffer-only explanation to that state. Its focused 33 HTTP tests, lint and
production build passed; required CI must cover the final PR head before integration.

## Projected-coordinate label rendering follow-up

Live screenshot review after #267 found that absolute x/y on the new SVG labels
produced DOM boxes but unreliable painted glyphs at Victoria's large EPSG:3157
coordinates. The follow-up uses translated groups with local text coordinates,
matching the existing edge-label technique; the waterfront label is also separated
from the edge-role label. A local screenshot now visibly shows both Main building ·
assumed and Waterfront · your mark. Production build and the existing frontend
journey suite cover the follow-up; final-head CI and live screenshot are the gates.

## Remaining gaps and owners

- Source-review owner / #104: review effective bylaw version, waterfront legal front
  and special provisions, projections, installed measurements and site applicability.
  Water marks and buffers support scouting; accepted evaluation remains blocked on
  reviewed inputs/rules and separate accepted-data publication.
- Homeowner/provider: title, permit conditions and service capacity are unsearched;
  retrieve those property-specific records before treating an enquiry as complete.
- Product owner / #147: test real homeowners and physical touch interaction.
  Software/browser checks establish behavior, not comprehension or a full access audit.
- Platform owner / SR-14 and SR-15: persistent assessments, recovery and immutable
  rollback operating evidence remain separate work. This change has no persistence.
