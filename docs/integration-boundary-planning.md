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


## Property answers and scan checklist — October 7, 2026

Implemented: address Search is the filled primary button; manual entry is a secondary
underlined action with a short fallback hint. Existing Model 300 address/sole-parcel
selection continues to open placement directly; source selection does not attest
ownership or surveyed identity.

Explicit property answers now set user-confirmed evidence immediately. The separate
suite-count confirmation checkbox is removed. Suite counts remain None, One, Two or
more, or Not sure to preserve their stored numerical meaning. Main-home type and
water adjacency have Yes / No / Not sure buttons, with Duplex/Other available after
No. Main-outline buttons let the user adopt even the preselected suggestion in one
click. Untouched defaults remain assumed; Not sure restores unknown and outline
Not sure disables automatic inference. Changing property remounts the assumptions.

The homeowner scenario defaults to assuming not waterfront, with a visible Likely
fine label and correction/help. The API permits only a labelled false waterfront
default. It leaves legal waterfront facts unknown and retains default provenance;
waterfront-true still requires reviewed frontage/siting. Approximate front/rear
passes depending on a default waterfront or inferred main outline are probable,
never checked; explicit unknown waterfront blocks rear-yard interpretation and raw
shortfalls remain conflicts. Selecting No records the user's answer, not independently
verified legal status. Marking water edges records physical observations separately.

The preliminary scan now shows a read-only graphic checklist: Yes means City records
found (Needs review), No means none found in the searched sources (Likely fine), Maybe
means unknown/not checked. Permit conditions, title restrictions, projections and
service capacity remain visibly unsearched. The original detailed findings, readable
source/date/review status, full records and technical exports remain available.
User choices do not overwrite municipal scan results.

Verified locally: 33 targeted HTTP tests for conditional screening and placement
scenarios; 135 frontend tests, extending mounted journey/checklist behavior;
production build; Ruff and diff whitespace checks. The rear-yard regression uses an
independent 20 x 20 lot / 200 m2 yard and 4/200 footprint ratio to show that assumptions
change certainty without changing arithmetic. API coverage shows default waterfront
stays legally unknown and default true is rejected. Browser checks demonstrate
one-action default confirmation, desktop search hierarchy and checklist, and keyboard
confirmation/narrow layout at 390 x 844 without horizontal page overflow. Final-head
CI and public deployment/screenshot checks are integration gates, not source acceptance.

Remaining gaps and owners: product owner / #147 still needs real-homeowner and physical
touch validation; source-review owner / #104 needs current legal rules, waterfront
plans and property applicability before accepted real evaluation; homeowner/provider
must obtain the unsearched property-specific records. Platform owner / SR-14/SR-15
still owns persistence, recovery and rollback operating evidence. This public demo
remains stateless; reload loses the local answers and enquiry.


## Placement continuation and card help — October 7, 2026

Implemented: a full-width Next action below the map and editing area, before findings,
in both saved-example and live-parcel workspaces. Status-count buttons reveal and
focus the first matching checklist row; zero-count buttons are disabled. The individual
checklist starts expanded but can be collapsed. These controls advance the journey,
not a legal submission or an email send.

Planning buffer inputs now hold drafts until **Save planning buffers**. Saved values
continue to drive evaluations and exports while drafts are pending. Invalid/negative
entries disable Save; the main Next action waits for a valid save. A visible status
acknowledges the save, which is local to the open property journey, not durable storage.
Movement retains buffers; a changed property remounts the editor with its own defaults.

Every preliminary-scan card opens the existing accessible help popup on hover, focus
or click/tap, with Escape dismissal. Captured rows show returned record labels, current
finding detail and readable source/date/review status. Unknown and unsearched cards
explain the concept and next record/provider to consult; none becomes a clearance.
General guidance does not establish legal applicability. The title/permit guidance links
to [LTSA title information](https://ltsa.ca/property-owners/how-can-i/find-information-on-a-title/)
and [City permit records](https://www.victoria.ca/building-business/permits-development-construction/building-renovating/accessing-permit-records).
These official help sources were checked October 7, 2026; the scan's underlying sources,
contracts and accepted-publication status are unchanged.

Verification: 135 frontend tests passed, including extensions to the mounted journey
for first-status focus, expanded defaults, draft/save/invalid buffer behavior and card
help. Production build/typecheck and whitespace checks passed. Desktop preview verified
Next position and saved/pending states; 390 × 844 keyboard preview showed a bounded
popup with real returned permit-area names and no page overflow. This is agent inspection,
not physical-touch or homeowner comprehension evidence. Final-head CI and live version
verification remain integration gates.

Remaining gaps: source owner / #104 needs reviewed site/rule applicability and installed
measurements before accepted evaluation; homeowner/provider needs permit/title/projection/
servicing records; product owner / #147 needs homeowner and physical-touch validation;
platform owner / SR14/SR15 owns persistence/recovery and rollback evidence. Refresh loses
the draft. None is resolved by the new navigation or help text.


## Property details step and boundary acceptance — October 7, 2026

Implemented: Next now precedes the details/optional controls in both placement
workspaces. Property details is a separate rail milestone between Boundaries and
Quick checks; entering it reveals the shared editor's property questions. Facts
remain mounted and correction links reveal this step rather than duplicating inputs.
Workflow review never establishes passing legal checks.

A complete, non-conflicting suggestion for a supported simple four-edge lot shows
its role/buffer preview before the editor, with Yes, use suggestions / No, adjust them.
Yes fills only unknown roles, with user origin, assumed evidence and the note
Suggested · accepted for planning. It acknowledges the existing saved buffers;
measured offsets and explicit roles are kept. No reveals the original editor.
Complex shapes, missing street/front context or conflicting marks use the editor
directly. Revisiting/changing street marks clears accepted suggestions while keeping
manual roles and measurements. Flag-to-buffer navigation explicitly reveals the editor.
These are local planning selections, not legal classifications or durable saves.

Verification: mounted journey checks cover acceptance, role order from the retained
single-street fixture, preserved measurements/buffers, No revealing the editor,
new details progression and correction navigation. Final-head frontend/build/CI
and live deployment evidence are recorded in the PR. Source review/publication
remains separate.

Gaps: source owner/#104 still needs reviewed property/rule applicability and installed
measurements for accepted evaluation; homeowner/provider needs permit/title/servicing
records. Product owner/#147 owns real-user and physical-touch validation. Platform
owner/SR14-SR15 owns persistence/recovery and rollback evidence; refresh loses answers.

## Facts completion, waterfront return and map help — October 7, 2026

Implemented: Property facts opens on entering Property details. Its bottom Next:
Review quick checks marks workflow review and closes the section; re-entering opens
it again. Unknown answers remain unknown. Detailed measurements is now Optional
measurements, with a visible hint to retain preliminary estimates when unavailable.
Mark waterfront follows Adjust boundaries. Choosing waterfront Yes focuses and
scrolls to the newly mounted tab; finishing marking returns to Property details.
Map sources & accuracy uses accessible hover/focus/click help beside the legend,
with readable provider, record, capture date and review state. The roofline-not-wall
hint stays visible and full technical evidence remains recoverable elsewhere.

Verification: 135 frontend checks, production build/typecheck and whitespace check
passed. Desktop browser inspection reproduced and fixed the newly mounted-tab
focus timing defect, verified facts completion and return navigation. A 390 × 844
preview showed bounded map help with source/date/review state. Final-head CI and
live deployment proof are recorded in the PR; physical-touch and homeowner
comprehension validation were not performed.

Remaining gaps: source owner/#104 needs reviewed applicability and installed
measurements before accepted evaluation; homeowner/provider needs permit/title/
projection/servicing records. Product owner/#147 owns real-user and touch validation.
Platform owner/SR14-SR15 owns persistence/recovery and rollback evidence; refresh
loses answers. This change supplies navigation and disclosure, not those validations.
