# Approximate setback map

`useSetbackMap(context, preferredScenarioKey?)` supplies an SVG layer and an
accessible legend for the existing shared placement map. The host supplies only
the current jurisdiction-supported `ScenarioRequest` and `ScenarioResult` through
`BoundaryMapInteraction.setbackContext`. Absent context leaves a geometry-only map.
The drawing also checks property, placement and model identity and parses the
scenario response against the request before rendering.

One complete scenario is drawn at a time; the selector never combines individual
favourable edges. A new suggested placement may select its whole scenario through
`setbackScenarioKey`. Later user selection is retained. Candidate setbacks and
additional planning allowances use separate lines and shading. Values come from
the existing comparisons, with no new regulatory constants. Their source and
scope remain in the expandable legend. The shaded margins are not a model-fit
area and do not include an invented front setback.

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
- After a legend wrapping/font refinement, the four focused tests passed again.
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
