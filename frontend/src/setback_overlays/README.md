# Approximate setback map

`useSetbackMap(context, preferredScenarioKey?)` supplies an SVG layer and an
accessible legend for the existing shared placement map. The host supplies only
the current jurisdiction-supported `ScenarioRequest` and `ScenarioResult` through
`BoundaryMapInteraction.setbackContext`. Absent context leaves a geometry-only map.
The drawing checks property, placement and model identity and parses the scenario
response against its request before projecting the rule offsets. A host-supplied
`setbackGuideKey` lets the map retain those offsets during a move or rotation,
including when the current rectangle crosses a parcel edge. The retained values
contain only edges, assignments, buffers and rule sources. A changed parcel,
city, use, role, buffer or other relevant assumption clears them. New responses
must match the same packet and sources before an outside placement can reuse the
guides. An illustrative garden-suite preview is visibly labelled in the legend.

One complete scenario is drawn at a time; the selector never combines individual
favourable edges. A new suggested placement may select its whole scenario through
`setbackScenarioKey`. Later user selection is retained. Candidate setbacks and
additional planning allowances use separate lines and shading. Values come from
the existing comparisons, with no new regulatory constants. Their source and
scope remain in the expandable legend. A measured, source-backed front-distance
check contributes its threshold when all current scenarios identify one front.
Its planning line uses the saved front-edge buffer for a mapped measurement and
zero additional buffer for a manual wall measurement. Ambiguous or unavailable
front evidence is explained in the legend. The guides describe boundary margins.

The clipping routine supports convex four-edge parcels, matching the current
scenario subset. Concave, holed, multipart and mismatched boundaries withhold the
overlay with an explanation; placement remains available. Geometry is calculated
in the declared metre coordinates before display rounding.

## Verification

Worker base: `a27c2f5`. Four focused tests use independently calculated 20 × 30 m
rectangle offsets, both ring windings and a 5,000,000 m translation; complete
scenario switching; suggested scenario preference; stale identity and unsupported
geometry rejection; and readable source/planning-margin display.

- `npm run typecheck`, `npm run build` and `npm test` passed (188 frontend tests).
- The follow-up passed six focused tests and typecheck. Coverage includes
  retention across compatible moves, clearing guides after rule-input or packet
  changes, the illustrative label, and a front guide with an independent 4 m
  threshold and 1 m planning allowance.
- Impeccable detector returned no findings for changed UI files; `git diff --check`
  passed.
- A standalone synthetic rendering in headless Edge was visually inspected at
  1100 px and 390 px; document width matched viewport width. The native details
  control expanded with keyboard Enter. This verifies the component drawing, not
  the integrated live journey or human comprehension.

Integration owner must mount the layer after the parcel and before buildings,
mount the legend below the map, pass current municipality-gated context and verify
the complete address/placement/check flow. Full model-fit shading is deferred.
Independent source interpretation and accepted publication remain separate work.
