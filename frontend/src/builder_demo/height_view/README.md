# Height view integration handoff — issue #184

`HeightView` is an illustrative side elevation. It reads the existing catalogue's
`advertised_overall_height`, its original units, source locator/date and review
status. It does not derive an installed or regulatory height. The SVG is deliberately
schematic. The dashed foundation band is never scaled from the entered allowance.

## Placement-stage wiring for #185

Import the component and render it in `BuilderDemo.tsx` inside the Placement stage,
using the already selected Model 300 catalogue record:

```tsx
import { HeightView } from './height_view/HeightView'
import './height_view/height-view.css'

<HeightView model={model} />
```

Props: `model: CatalogueModel` is required. `initialFoundationAllowanceM?: string`
optionally seeds a local scenario amount in metres. The optional
`onFoundationAllowanceChange?: (metres: string | null) => void` reports the raw valid
decimal or `null` after clearing/invalid input. The callback does not alter placement,
catalogue, enquiry, evaluation or regulatory fields. If integration exports this
scenario amount, label it as user-supplied and keep it separate from source facts.

## Boundary and remaining gaps

The current catalogue records a public `10 ft 6 in` exterior height, captured
2026-09-25. Its manufacturer revision and measurement datum/roof point are unknown;
the source capture is a gap and the transcription is unreviewed. A controlled
drawing, installed foundation/grade relationship, roof high point and reviewed
applicable local height rule/basis are still needed before any height comparison.
The view is not a survey, permit analysis or site-specific roof/terrain simulation.
Integration #185 owns mounting, any scenario export and browser journey checks.
