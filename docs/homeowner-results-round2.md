# Homeowner results round 2 slice

Recipient: a homeowner deciding whether to discuss a selected prefab with its
provider. Lead with the supported finding, material placement concerns and the
next useful control; full original evidence statuses remain in the checklist.
Provider suitability and City planning applicability are separate questions.

## Implemented

- An early intended-use control including an unanswered choice and explicit
  Not sure. `mapIntendedUse` preserves supplied words; only an explicit garden
  suite selects that bounded pathway. `applyIntendedUse` records the answer and
  origin in project settings. Office and unrecognized supplied uses select other;
  unknown remains null. Product advertising does not answer the homeowner's use.
- A display-only retained-result hook. Same-property/model recalculation retains
  the previous coherent finding with Updating checks. Different scopes cannot
  retain it. The `current` return value is false while pending. The renderer
  disables acknowledgement and calculation actions while showing that snapshot.
- Three visible count groups, named concerns and priority questions, a primary
  next action and expanded original checks sorted by material concerns.
  Acknowledgement does not change evidence status. A favourable recommendation
  still requires the existing bounded coverage conditions; geometry alone cannot
  establish planning suitability.
- Optional native boundary disclosure with a labelled illustrative SVG, editable
  planning-margin explanation and explicit I don't know path. It adds no measured
  geometry, new threshold, legal classification or mandatory workflow step.

## Integration contract

The integration owner owns coordinator state and must wire `IntendedUseControl`
near the model/property start, route every use change through `applyIntendedUse`,
and reconcile the project-details pathway control with the same enquiry answer.
The results review action targets `builder-intended-use`.

Call `useRetainedResult<Summary>({ scopeKey, inputKey, current, pending })` at a
stable hook position. Scope must include exact property capture plus selected model
revision/snapshot; input identity must include all evaluation inputs and completed
source/result identity. Pass only a coherent settled summary as current. Pending
must cover debounce/request-key mismatches as well as geometry, scenario, rule,
zoning and scan requests. Retain the summary and its use qualification together to avoid displaying a previous result with a current-use caption. Render returned result with returned updating; use
current to guard acknowledgements/readiness/exports. Response concurrency and
immediate input-change invalidation remain coordinator responsibilities. A
settled null clears retention; revisiting unchanged settled inputs retains it.

The adapter suppresses garden-suite outcomes for office/unknown use and retains
approximate physical observations. Enquiries and reports must apply the same use
qualification to raw hypothetical scenario outcomes; evidence exports retain the
original payloads. The hook is not a second findings evaluator.

## Verification and remaining work

28 focused frontend checks passed (result retention, homeowner summary, placement
workspace, boundary assumptions and homeowner map); TypeScript and production build passed. Full base-suite replay before final disclosure adjustments reported 156/158: old checklist/category navigation and old boundary-help wording assertions failed. The latter is updated and passing in focused replay; coordinator-owned category navigation remains for integration.
The DOM regression reproduces retained nonzero concerns during recalculation,
disabled stale acknowledgement, revisiting unchanged inputs and immediate
property/model scope removal. Explicit use mapping checks protect office and
unknown answers against inherited garden-suite results. Existing source fixtures
are replay evidence, not independent source validation. Native disclosure and
illustration semantics were inspected; integrated browser review remains below.

| Missing work | Practical impact | Next action / owner |
|---|---|---|
| Coordinator wiring, concurrency and export guards | Helpers alone do not stabilize the actual journey or stop stale exports | Integration owner wires and tests current-request identity and coherent state |
| Integrated enquiries/PDF scope reconciliation | Raw hypothetical checks could contradict an unknown-use display | Output worker and integration owner qualify outputs and inspect actual artefacts |
| Combined journey assertions for three count groups | Old tests target six categories | Integration owner updates behavioral navigation assertions |
| Wide/narrow browser and actual keyboard/touch review | DOM checks do not establish the final layout or usability | Integration owner reviews combined interface, including 601 Su’it, Cecelia and saved example |
| Current source/rule review and accepted publication | No accepted real planning evaluation is established | Source owner conducts the separate review/publication process |
| Real homeowner/provider validation | Software checks cannot establish usefulness | Product owner arranges human walkthroughs |

No database, live source calls, cloud resources, publication, deployment or provider
submissions were used in this slice.
