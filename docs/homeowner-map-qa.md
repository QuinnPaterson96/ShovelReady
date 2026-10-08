# Homeowner placement map handoff

October 7, 2026. Starting base: `a53f32911c80d068ba64f8c879bba11ba6c20f85`.

The map supports a homeowner choosing an approximate position and deciding which
concerns to carry into a provider or City enquiry. It shows the main-building
selection and proposed model with separately positioned labels, numbered captured
rooflines, and current geometry conflicts. These are preliminary mapped estimates.

## Implemented

- Shared `OccupiedLotPreview` presents both the editable map and a native full-size,
  read-only dialog. Notes remain below the drawing. Main-building source geometry
  is drawn in full; the overlay no longer repeats its label over the parcel.
- Shared `PlacementConcerns` preserves parcel/roof conflicts, entered-clearance
  shortfalls, and parent-supplied candidate concerns beside the map. Its explicit
  continue action carries unresolved findings forward; the callback is owned by
  the journey and cannot change a geometric finding in this component.
- Boundary help is a keyboard/touch disclosure. Street marks identify their user
  origin and incomplete/confirmed state. Unknown remains available. Definitions
  describe sketch vocabulary, not a universal legal lot-line classification.
- Scenario presentation separates mapped gaps, candidate distance requirements,
  user wall measurements, and optional planning margins. Comparisons and full
  evidence payloads retain their existing numeric basis and source identities.

## Software verification

`npm run typecheck --prefix frontend` and `npm run build --prefix frontend` passed.
Build retains the existing large-chunk advisory. `git diff --check` passed.
From `frontend`, `TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx --test
src/occupied_lots/homeowner-map.test.tsx
src/conditional_screening/placement-workspace.test.tsx` passed all five tests.

The new regression examples check model/main-building identification, accessible
preview/help entry points, incomplete street marks, and below-display-resolution
positive overlap/negative clearance margin without mutating source evidence.
Those signed values supply the independent expected meaning. These checks do not
establish legal interpretation, collision-free rendering at every viewport or
actual homeowner comprehension.

An initial full frontend suite before parent integration passed 144/145 tests.
The sole failure was the existing example journey expecting the old overlay's
`.main-building-mark` at journey.test.tsx:473. The parent-owned ExampleProperty
must adopt the shared preview (which retains that class) before integration.

## Integration and remaining gaps

The integration owner wires `placementConcerns` and `onContinueUnresolved` into
OccupiedLots and ExampleProperty, combines relevant candidate findings without
duplicating geometry concerns, and validates the acknowledgement dependencies.
The example parent must replace its older map/tabs/overlay with the shared preview;
without this, the example lacks the new model label/full-size preview and old
main-building overlay has moved. This is a demo integration dependency.

Wide/narrow rendering, keyboard map operation, native dialog Escape/focus return,
and the two requested real-address journeys require composed browser verification
by the integration owner. Map labels use top/bottom callout lanes for main/proposed
unit and in-roof short labels; irregular geometry or many adjacent tiny roofs can
still require visual review. No new source review, accepted regulatory publication,
or real homeowner/provider validation is claimed. Legal boundaries/wall positions,
main-building role and applicable current candidate requirements remain external
review gates; the homeowner/property contact and City reviewer must establish them.
