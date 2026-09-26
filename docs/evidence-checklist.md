# Evidence checklist handoff (SR-50 / issue #114)

## Implemented

`buildEvidenceChecklist(draft)` in `frontend/src/evidence_checklist/model.ts` returns plain versioned data (`sr-50.evidence-checklist.v1`) with stable item IDs and `screening_status: not_performed`. Each item gives available attributed evidence, the specific missing input, impact, suggested supplier and next action. `evidenceChecklistText(checklist)` exports copyable text. `EvidenceChecklistView({ checklist })` renders an accessible standalone section; its CSS uses the shared Civic Atlas tokens. A complete generated example is in `frontend/src/evidence_checklist/example-output.json` (Victoria scope, unconfirmed example address, selected Click Landing model). The example address is illustrative and is expressly unconfirmed.

The builder reads the selected site, editable model selection, existing provider catalogue and four provisional Victoria packet clauses. It does not parse `preparationStatus().unresolved` or run a rule evaluator. Retained GIS observations, manual entries, source model baselines, current user overrides and synthetic inputs retain distinct origin and review labels. It retains source URL, locator, capture date, snapshot/revision, normalized value/unit and basis where those fields exist. The rear-yard clause keeps its ratio numerator and denominator. User notes are displayed as attributed, unreviewed notes. Unknowns, conflicts, unreviewed sources and provisional clauses never produce a pass or accepted state. The Click Landing captured Sunshine Coast service limitation is called out explicitly.

## Mounting in the parent composition

In `frontend/src/App.tsx`, import `buildEvidenceChecklist` and `EvidenceChecklistView` from `./evidence_checklist/model` and `./evidence_checklist/EvidenceChecklistView`; import `./evidence_checklist/evidence-checklist.css` alongside existing application style imports. At the point where the current `Draft` is available, after the preparation summary or on its evidence page, render:

```tsx
<EvidenceChecklistView checklist={buildEvidenceChecklist(draft)} />
```

Use `evidenceChecklistText(buildEvidenceChecklist(draft))` for a future copy button. Build from the current draft on each render so a site/model edit invalidates the old checklist in the same way it invalidates the summary. Do not store a stale copy of the derived payload. The coordinator owns this mount; no existing component, shared source packet or central documentation was changed in this branch.

## Verified and limits

Focused tests cover retained/manual/unconfirmed sites, conflicting PID/area, notes, unknown roof datum, model source/user overrides, the model-specific service exclusion, four provisional rule identities, synthetic examples, text output and rendered labels. Frontend typecheck, suite and build are the intended checks; final PR results are recorded in the PR handoff.

This checklist prepares evidence requests. It does not verify a legal lot, building geometry, placement, installed roof datum, regulatory Floor Area, provider service or rule currentness. The Victoria packet remains provisional; outside or incomplete scope is explicitly labeled, and no other municipality packet is added. The selected `Draft` has no typed source contract for new document references, so reference-entry UI, uploads and storage are deferred. A future issue should specify provenance, review and revision behavior for such inputs before adding controls. Independent source review, controlled site/model artifacts, accepted publication, real evaluation and user validation remain separate gates.
