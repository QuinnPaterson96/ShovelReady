# Homeowner preparation flow handoff · SR-49 / #113

Base: `origin/main` at `34d95c322cfa2139ba758f12bfc8508986dcf9e4`. This branch owns the assessment UI, focused model/site input presentation and tests. The parallel evidence-checklist module and central integration documents are outside this branch.

## Implemented

- Municipality, intended use and building role use explicit Victoria research-scope, unknown and outside-scope choices. Imported synthetic values remain verbatim as a labelled legacy choice until the user changes them. Unknown scope remains unresolved; an outside choice reports outside coverage without suggesting a zoning exclusion.
- The input path labels optional model/site details, unreviewed provider observations, manual site facts and explicit parcel-lead confirmation. The five-row address limit is stated before search. Editing still clears the preparation status and site confirmation; page navigation retains the draft.
- Rule clauses, capture identifiers and address match methods remain available in disclosures. The summary states each value's source or user origin, retains the site source separately from manual corrections, and keeps the copyable provider record.
- No evaluator, data publication, API, package or infrastructure change was made.

## Verified

- `npm ci`, `npm test` (45 passed), `npm run typecheck` and `npm run build` passed in `frontend/` on this branch. The build retained Vite's >500 kB chunk advisory. `git diff --check` passed.
- Focused regressions check explicit scope choices, verbatim synthetic import, outside and unknown status, source address versus manual correction, model height/reference, retained draft and edit invalidation. Existing saved-fixture tests cover lookup payload boundaries and model mapping.
- Isolated Vite preview on `127.0.0.1:18113`: keyboard letter selection worked for Victoria / Garden suite / Accessory building and aux box Model 240. The model kept roof height and reference unknown. Submitting `-2` for model height kept the user on inputs with focus at that field. Manual unmatched facts were explicitly confirmed, a needs-investigation summary displayed, returning to inputs retained values, and changing the note cleared confirmation and the prepared status. The normal browser viewport displayed the form without observed clipping at the inspected position.

## Proposed integration

- After review of both branches, mount `buildEvidenceChecklist(draft)` and `EvidenceChecklistView({ checklist })` in `PreparationSummary`. The current source summary and copyable review record work without the checklist. Coordinator owns combined verification and central docs/backlog.

## Remaining gaps

| Missing evidence / observed limit | Practical impact | Next action / owner |
|---|---|---|
| No lookup API configured in this isolated preview; exact captured address, no-match and unavailable states were not browser-tested on this branch | Bounded address behavior is covered by existing fixtures, but composed live behavior is unverified at this head | Coordinator: run composed browser check with the owned scratch API and pinned address revision after integration |
| Browser control did not expose a narrow viewport resize | Narrow visual layout was not verified in this pass | Coordinator: inspect about 390 px and normal width on composed build, including horizontal overflow and focus |
| Evidence checklist lives on parallel branch | Homeowner next-evidence checklist is absent until integration | Evidence-checklist owner and coordinator: review, mount, and test combined summary |
| Reviewed legal lot, placement, controlled model roof datum/service, current adopted rules and accepted release remain missing | This preparation record cannot establish a real site fit, current rule applicability or permit outcome | Source/site/model reviewers and SR-05/06/10/48 gates: obtain and review controlled artifacts before accepted evaluation |
| No independent homeowner study of this revised flow | Clarity improvement is implemented but user success remains unmeasured | Coordinator / SR-16: test the composed flow with homeowners after integration |

Software tests, the single browser pass, source review, accepted publication and user validation are separate evidence categories. This handoff claims no new coverage or evaluated result.
