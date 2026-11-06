# Recoverable model alternatives

Implemented for #330 and #332 on baseline `86dfee4` (main `a27c2f5` plus the
accepted financial-comparison decision). This branch also consumes the comparison
worker's `778e69c` and export worker's `1747810`; those workers own their respective
components and reporting changes. PRs #296/#297/#298 were inspected for overlap;
none was merged or rewritten.

Each explored model keeps its exact authored question, configuration, foundation
allowance, planning buffers, supplied installed height, project settings, placement
draft, user clearance targets, spending preference and cost draft in this mounted
assessment. Text is not rewritten when a model name changes. Relationship and
requested-response answers remain shared across model switches. Questions survive
a property change; placements, configurations and property cost drafts start fresh.

Property facts, street/boundary marks and the manual property sketch remain shared.
The saved example, source-selected parcel and manual sketch editors expose authored
placement drafts separately from their measurements. Returning to a model restores
its draft, clears old geometry and rule results, then uses the existing calculation
path. A manual sketch still needs its existing **Measure this placement** action.
Placement-dependent manual wall/legal-line measurements remain subject to the
existing placement-revision invalidation; restoration does not certify them.

Cost context uses actual authored inputs rather than a remount counter. An unchanged
same-property alternative therefore retains its cost context. Changed use, property
facts, placement, configuration or foundation assumptions flag affected costs for
rechecking. The optional comparison includes only the current property's explored
models. Shared-context changes remove retained summaries from the current comparison
and label its affected scenarios for rechecking. Current checks, source qualifications,
correctable defaults and the incomplete-data enquiry path continue to apply.

These drafts last while the assessment stays mounted in the open app. Reloading
clears recoverable alternatives. The existing explicit enquiry recovery/download
features remain separate; they do not restore editable project state. No accounts,
database, new storage service, publication, deployment or provider contact was added.

## Verification

From `frontend`, `TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx --test
src/builder_demo/model-switch.test.tsx` passed. The extended existing host journey
uses user-authored multiline questions and independent values, rather than expected
values copied from an evaluator. It covers:

- Model 300 → Model 240 → other providers → Model 300, restoring exact question
  text in the preview and clipboard, custom dimensions, translation/rotation,
  configuration, foundation allowance, spending preference and model-specific costs.
- Shared-use edits invalidating affected findings/costs while preserving physical
  input and authored prose; an unchanged restored alternative keeps its cost context.
- A failed export preserving the question and enabled copy recovery without a
  success message. The failure is injected at the browser image boundary.
- A genuinely different property: saved Cecelia geometry → source-selected May
  Street parcel object 87, with no prior placement or cost draft transferred.
- Independent source-selected parcel placements/clearance targets and manual model
  placements while the manual property sketch stays shared.

`npm test` passed 188/188; `npm run typecheck` and `npm run build` passed. Build
retains the large-entry advisory and reports the export worker's static jsPDF /
dynamic fflate overlap. Impeccable's detector returned no findings for the changed
UI targets. No database, AWS, live model or live source test was run.

The host test mocks HTTP using retained producer fixtures; it verifies connections
and stale-state handling, not geometric arithmetic, legal interpretation or source
currency. Preview/copy inspection is an agent software review, not a recipient study.

## Remaining gaps and owners

- The comparison/QA worker owns measured desktop/narrow browser review for #334,
  including the integrated controls and downloads. DOM and build success alone do
  not establish touch layout or real-browser export behavior.
- Editable alternatives do not survive reload. The visible session boundary and
  existing copy/download paths address this bounded increment; durable project
  recovery would need a separately scoped product decision.
- Matching provider quotes/site evidence remain under #124/#125. Cost drafts cannot
  establish an installed total or rental-return winner without that evidence.
- Independent source/legal review and accepted publication remain data-owner work;
  these software changes do not produce accepted real evaluation. Homeowner/provider
  usefulness remains for Quinn/product research under #16/#147.
