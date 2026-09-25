# Assessment preparation UI (SR-36)

Implemented from `285b923e8f9eb064e47062c5e6686e89a617c5d9`; the PR head
identifies this delivery. Home now leads to editable inputs and a preparation
summary. All four previous investigation modes remain under Examples/evidence.
Build identity and API health are in a secondary disclosure. No backend, database,
contract, research inventory, publication or acceptance state changes.
The container frontend stage copies the three synthetic request JSON build inputs;
the existing backend image packaging is unchanged.

## Behavior and scope

The session draft lives in App React state, with no account, server write or
localStorage. Home, inputs, summary and evidence navigation preserve it. A reload
starts fresh. Empty quantities stay unknown. Nondecimal, nonfinite, zero and negative
dimensions are rejected, with connected field errors and focus on the first error.
There is no invented upper legal limit or inferred area/placement relationship.

An empty or partial submission is allowed: it summarizes the missing evidence,
not input completeness or feasibility. All form submissions remain preparation
only. Victoria garden-suite/accessory inputs show amber investigation; other
geography/use/role shows neutral outside proposed scope, never prohibition.
An unprepared or edited draft is neutral not assessed. Edits invalidate the prior
summary immediately. Summary navigation cannot restore a prior outcome.

Example selection and loading are separate explicit actions. No example is selected
by default. Any user edit makes replacement require an inline confirmation; the
default focus is Keep my draft. Cancellation preserves values and summary. A
confirmed replacement clears the old summary and provenance and records the new
original request. Per-field edit flags remain user supplied even if a user types
the original value again; source review is never transferred to an edit.

## Actual example mapping

The three imports are the existing JSON requests under
`app/draft_evaluations/inputs/`: `synthetic-direct-pass`, `synthetic-missing-fact`
and `synthetic-placement-failure`. The frontend imports these files directly,
not duplicate values or report outcomes. Their mapped design inputs happen to be
identical; their separate scalar facts differ. Full original requests, source
hashes, review limitations and design/site/placement/draft revisions remain
available in the provenance disclosure alongside original/current form values.

| Form field | Request path or measurement name | Current imported value |
|---|---|---|
| Municipality | `scope.jurisdiction` | synthetic |
| Intended use | `design.intended_use` | garden suite |
| Building role | `scope.building_role` | accessory |
| Width | `design.measurements`: `nominal_exterior_width` | 5 m |
| Depth | `design.measurements`: `nominal_exterior_depth` | 9 m |
| Roof height | `design.measurements`: `roof_height` | unknown / blank |
| Interior floor area | `design.measurements`: `manufacturer_interior_area` | 40 m² |

The separate evaluator width fact (10 m, missing, or 11 m) is **not** the nominal
design width. Ceiling height (2.4 m) is **not** roof height. Interior area is **not**
regulatory floor area. Units and definitions are explicit; unknown values are not
derived from geometry. No EvaluationRequest is fabricated or sent on submission.
Pilot is not an import option: conflicting historical observations remain evidence.

## Shared status and integration hook

`frontend/src/StatusBanner.tsx` exports the default component and `StatusContent`.
Required props are `status`, `reason`, `coverage`, `unresolved` and `nextAction`;
`synthetic` is optional. Status values are `not_assessed`, `outside_coverage`,
`needs_investigation`, `candidate` and `failed_placement`. Colour accompanies an
icon, readable label, scope, reasons and next action, with approval kept separate.
App loads the scoped styles from `assessment/assessment.css`.

The existing computed report inspector uses green/red only from its already
validated supported report outcomes, amber for investigation and neutral for
outside coverage. Its API, adapter, evidence and approval semantics are unchanged.
Request errors display no report and do not use a regulatory failure banner.
The authored preview remains explicitly hand-authored and distinct.

Integration now connects the standalone Pilot component as a dedicated navigation
page and directly from the input form. It uses the same amber StatusBanner.
Input status appears immediately below the page heading, with scope details
expandable. Recursive test discovery includes the Pilot tests.
See [combined integration evidence](integration-wave-nine.md). The original
branch verification below is retained as historical evidence.

## Verification performed September 25, 2026

From the repository root, on the delivered code:

- `npm ci --prefix frontend`: 85 packages installed; audit reported zero vulnerabilities.
- `npm test --prefix frontend`: 24 tests passed, none skipped. Eight added tests
  cover validation, original input mapping, confirmed/cancelled replacement,
  provenance retention, edit invalidation, units/labels/errors, preparation statuses
  and actual synthetic report banner mapping. The prior 16 tests remain included.
- `npm run typecheck --prefix frontend`: passed.
- `npm run build --prefix frontend`: passed. Vite reports a 502.75 kB main chunk
  (134.45 kB gzip), slightly above its 500 kB advisory threshold. No new dependency.
- `git diff --check`: passed.

Actual mounted-browser checks used the production build at `127.0.0.1:5186`,
with no backend or database. Launch from frontend with
`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5186 --strictPort`.
For the route checks, an external temporary Vite config set `preview.proxy` to `{}`
so no API request could reach another checkout. Initial health/identity attempts
at the standard proxy port 8000 returned connection refused.

Observed in the browser:

- Home starts without a selected example; inputs are blank. Empty submission shows
  amber with missing facts, not a match.
- Negative width blocks submission and focuses its labelled input/error. Correcting
  it allows preparation; Home -> inputs retains the entered Victoria/use/role/width.
- Dirty replacement keeps existing values until confirmation. Keep my draft and
  Replace draft both work with Enter; cancellation preserves the draft.
- Imported width starts at 5 m, depth at 9 m, area at 40 m², roof height unknown.
  Editing width to 12 returns the summary to grey, preserving original 5 and current
  12 with a user-edit label and original snapshot/hash.
- Toronto produces neutral Outside coverage, with an explicit non-exclusion reason.
- At a 390 × 844 viewport override, form columns stack, text/buttons wrap and the
  DOM's scroll width equals client width (375 px excluding the scrollbar).
  Tab from municipality focuses intended use with a visible focus outline.
  Home navigation returns scroll position to zero. The viewport override was reset.
- All four evidence modes remain reachable. Authored preview renders its saved
  synthetic evidence. Observations/public cases/computed drafts show unavailable
  or invalid-response states without fallback results when the API is absent.

Calculated WCAG text/background contrast for the new banner palettes is 11.33:1
(neutral), 9.45:1 (amber), 9.20:1 (green), 9.21:1 (red); hint text is 7.59:1 and
primary button text 11.68:1. This is a palette/keyboard/layout check, not a full
screen-reader audit or independent accessibility certification.

No live successful API/database-to-browser rerun was performed. Report success
colours were checked against saved evaluator fixtures in static rendering tests.
No backend tests, shared DB, cloud resources, model calls, source/legal review,
accepted data publication or real-user validation were performed. The combined
Pilot route walkthrough remains an integration dependency. Parent SR-12 and
accepted-data objectives remain open.
