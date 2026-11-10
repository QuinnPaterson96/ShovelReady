# Assessment A — independent design review

Target: frontend/src/project_timeline/ProjectTimeline.tsx and Project economics integration.
Mode: Operate, extending the existing Civic Atlas interface.
Reviewed 2026-11-09. Fresh native IAB tab on http://127.0.0.1:8046, phone 390×844 and desktop 1440×1000, one batched inspection. Tab closed and viewport reset. No detector or Assessment B findings consulted. No implementation files edited.

## Verdict and design specificity

Good foundation: this looks and behaves like part of ShovelReady's evidence workspace. Calm teal typography, native disclosures, compact cost/timing summary and attributed planning allowances fit the existing identity. Manufacturer scope, parallel work, municipal targets and optional first-year rent make the content specific to prefab investigation rather than a generic scheduling dashboard. Keep this composition; it does not need a redesign or a compulsory scheduling wizard.

The collapsed summary answers the useful first question quickly: a ready-for-use range and calendar dates. The editable planning-scenario qualifier is adjacent. The disclosed provisional assumptions are appropriate for a discovery-call decision and are not defects.

## Evidence and strengths

1. Skip rental estimate leaves the timeline visible and fully editable. I opened it, adjusted Completion, and restored its default after skipping rent. This avoids imposing investor decisions on a homeowner.
2. Results, settings, stages and evidence have a useful disclosure hierarchy. Desktop duration alignment supports scanning; phone stacks naturally without observed horizontal overflow. Native input/select/details controls and visible teal keyboard focus preserve incumbent patterns.
3. Timing and rent remain meaningfully distinct: enabling first-year rent showed $10,322–$16,056 CAD collected after vacancy, before running costs, financing and tax, with 162–252 rental days and a stated first-year endpoint. The nearby copy explicitly distinguishes this from stabilized full-year economics. Source/assumption details are available without dominating the initial summary.

## Prioritized reproducible issues

### P2 — Put invalid duration feedback beside the edited range

Reproduce: Try an example → Skip rental estimate → View and adjust timeline → Adjust completion → change From to 8 while To remains 4.

Observed at phone390: the active Completion editor changes to “Not estimated” / “Your override”, but its nearby guidance still only discusses blank values and weeks. The actual explanation (“upper bound at least the lower bound”) is inserted above all six stages, several screens away. The focused input has no local error text or aria-invalid/aria-describedby association in ProjectTimeline.tsx. The headline also says “Complete the missing timing inputs” although both values are present.

Impact: Jordan or Casey must search backwards to diagnose a simple correction; Sam has a global status announcement but no error association when returning to the field. This is recoverable, not a blocker.

Suggested correction: render a concise per-range error next to Bounds and associate it with both fields; preserve the top-level summary if useful. Distinguish incomplete/unknown from invalid, and avoid telling users with invalid values that values are missing. Do not convert intentional unknowns into compulsory-input warnings.

Evidence: live focused editor screenshot in review tool output; ProjectTimeline.tsx Bounds and errors block; model.ts errors construction.

### P2 — Preserve stage meaning when its duration is overridden

In the same interaction, Completion's explanation (“Final connections, inspections, corrections and occupancy authorization where required”) immediately disappears and is replaced by “Your planning allowance.” Restoring the default brings it back. model.ts replaces the entire stage note whenever an override exists.

Impact: editing a number removes the user's nearby reminder of what that number covers. The manufacturer-scope explanation and site-work dependency have similarly useful task meaning that should survive a timing override. Source evidence still exists; this finding concerns in-context task comprehension, not provenance loss.

Suggested correction: retain a short stage-purpose/scope description independently of the editable basis/source note. Keep “Your override” and the user's own rationale; do not continue presenting a default duration rationale as if it justified the override.

Evidence: live Completion before/after override; model.ts stages override spreads note over the default.

### P2 — Keep the selected manufacturer timing scope readable on phone

At phone390 the native select renders “Contract to delivery, including p…” (the rest is clipped). On desktop1440 it is readable in full. The option contains a distinction that determines overlap and duration semantics.

Impact: phone users cannot inspect the complete selected scope without reopening the select. Explanatory text below partly mitigates this, so this is a small usability correction rather than a misunderstanding claim.

Suggested correction: shorten visible option names (for example “Contract to delivery”) and put the selected option's full scope in nearby wrapping helper text. Keep the actual semantics and source qualifications unchanged.

Evidence: live phone screenshot with Manufacturer timing covers at top, desktop expanded screenshot with full value.

## Nielsen heuristic scores

| Heuristic | Score / 4 | Basis |
|---|---:|---|
| Visibility of system status | 3 | Immediate recalculation and explicit unknown state; changed calendar dates are far above lower-stage edits. |
| Match with the real world | 3 | Named build stages, weeks and dates; “permit dependency” and “bundle” require more translation than the rest. |
| User control and freedom | 3 | Optional rent, collapsible detail, editable bounds, per-stage restore; no unnecessary confirmations. |
| Consistency and standards | 4 | Incumbent Civic Atlas tokens and native disclosure/form patterns; no competing workspace. |
| Error prevention | 3 | Bounded validation and explicit unknown semantics; invalid input safely removes estimate. |
| Recognition rather than recall | 3 | Clear stage labels and contextual sources; override removes scope reminder and calendar feedback is distant. |
| Flexibility and efficiency | 3 | Direct overrides, starting assumptions, native keyboard controls; sensible for a lightweight planning scenario. |
| Aesthetic and minimalist design | 3 | Restrained visual language and compact closed state; opened state has a long reading/editing path. |
| Error recognition and recovery | 2 | Plain-language global explanation and restore action; field-level diagnostic context missing. |
| Help and documentation | 3 | Task-specific stage notes and source disclosures; the selected long scope clips on phone. |

Total: 30/40 — Good. Scores concern the inspected timeline surface, not the entire application. This was not a screen-reader run, contrast measurement or user study.

## Cognitive load and emotional journey

Collapsed state: low load. Ready-for-use result, date range and one disclosure are a coherent group. Initial summary does not force users to process the six stages.

Expanded state: moderate load (2 checklist weaknesses: working-memory demand between late-stage edits and calendar result; one-task focus weakened by stage explanation disappearing on edit). Settings form a group of three controls. Each stage offers one edit action, so the six sequential rows are not six simultaneous decisions and should not be treated as an automatic “more than four options” violation. A range editor has three fields plus restore, within the intended working-memory budget.

Emotional journey: a useful date range provides early orientation; adjustable assumptions give agency. The valley occurs after an invalid lower-stage edit, where the estimate disappears but the correction is elsewhere. Restoring defaults works and returns the useful estimate. The endpoint remains useful with first-year rent and sources, though adding calendar dates to the existing bottom milestone summary could reduce upward scrolling; optional refinement, not a release requirement.

## Persona observations

- Jordan, first-time homeowner: stage purposes and range labels help. Losing stage meaning after a single numerical change makes the edit less understandable. No extra mandatory confirmation is warranted.
- Casey, distracted mobile user: one-column layout and generously sized disclosure rows work. The clipped schedule option and distant validation increase scanning and reopening work.
- Sam, keyboard/assistive-technology user: native controls have labels, the focused duration showed a clear ring, and disclosure controls expose expanded state. Field-level error association is the main evidenced gap. Screen-reader behavior itself remains untested.

## Minor observations and scope limits

- At phone width, From / (weeks) and To / (weeks) wrap to separate lines; still understandable but slightly awkward.
- Date input and select styling differ slightly on desktop, consistent with existing native form styling; no need for a custom date picker.
- Repeating the occupancy qualification in Completion and bottom milestones is modest copy repetition. It is not a blocker, and no additional warnings are recommended.
- Live optional municipal lookups completed in the native browser. Their factual accuracy was not reviewed.
- No mathematical accuracy, municipal source acceptance, real manufacturer comprehension, or whole-app accessibility claim follows from this visual inspection.
- Only review artifact owned/edited: .local/timeline/design-review.md. Root owns implementation and shared documentation.

Questions skipped: this is an implementation review requested by the parent, which will synthesize and fix the bounded batch without a separate user-facing critique question.


## Single correction confirmation — 2026-11-09

The original review above is preserved. Native IAB became unavailable (creation returned “Browser is not available: iab”; browser inventory was empty). Used the permitted Playwright/installed Chrome fallback with fresh isolated contexts at phone390×844 and desktop1440×1000, external sources isolated using the existing runner pattern. Browser closed in finally. No detector was rerun or read. Two locator-only harness failures were corrected before successful confirmation; they were not product failures. This was the one correction confirmation, with no implementation or polish loop.

All three original P2s are resolved in the inspected build:

- Invalid Completion 8–4 shows “Use 0–520 weeks for each bound. To must be at least From.” directly beneath the range at both widths. The From field has aria-invalid=true and aria-describedby targeting that same text. Blank From removes aria-invalid and shows the neutral “This duration is open while either bound is blank.” Restore completion default succeeds. The headline now asks users to review open or invalid timing inputs rather than claiming everything is missing.
- The same override retains “Final connections, inspections, corrections and occupancy authorization where required.” above the editor, independently of “Your planning allowance.” Source inspection confirms scope is separately represented for all stages.
- “Contract to delivery” is fully readable in the phone native select; desktop remains clear. Scope/overlap explanatory text is retained beneath settings.

Additional changed-surface confirmation: the timeline is now a flat section within economics, reclaiming useful phone width; From (weeks) and To (weeks) each render on one line; the bottom readiness text includes calendar dates after restore. Both viewports had no horizontal page overflow. The timeline still works after Skip rental estimate. No new consequential issue was observed in the bounded changed surface.

Evidence: confirmation-phone-scope.png, confirmation-phone-error.png, confirmation-desktop-scope.png, confirmation-desktop-error.png, plus the root's fresh phone/desktop summary and expanded images. Reproduction harness: review-confirmation.mjs (review-local only).

Revised heuristic scores: error recognition/recovery 2→3 because diagnosis and field association are now local. All other scores remain unchanged; their improvements do not justify claiming excellence or untested capabilities. Total 31/40 — Good. Expanded cognitive load now has one residual working-memory weakness across a long schedule, mitigated by the repeated bottom dates; low by the checklist. No original P2 remains open. Screen-reader operation, factual timing-source acceptance and actual homeowner comprehension remain outside this review's evidence.

Questions skipped: bounded implementation confirmation; root synthesizes the handoff.
