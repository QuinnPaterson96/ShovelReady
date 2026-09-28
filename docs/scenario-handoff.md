# Scenario handoff (#153, part of #139)

## Implemented on this branch

`ScenarioHandoff` is a standalone React component for a measured occupied-lot
scenario. It accepts `{ site: Case, model: unknown, assessment: Result | null }`
from the existing occupied-lot flow. Its local JSON download uses
`shovelready.scenario-handoff.v1` and preserves the complete received objects,
including provider and municipal source identities, the submitted placement,
requirements/assumptions and all checks. The fixed filename does not expose a
property label or imply accepted publication. There is no server write or share
URL.

The copyable and downloadable text is explicitly an **unsent draft**. It states
the one-placement scope, source labels and dates, actual measurements, user
assumption comparisons, unknowns and three questions. Provider dimensions are
compared with submitted dimensions only when the supplied model has a usable
nominal width and depth. Matching values cannot prove that no edit occurred;
the draft says so. Raw technical IDs remain recoverable in the JSON disclosure
and file, while the draft uses readable citations and links without query
strings. Captured provider service-area restrictions remain visible in the draft.
Requirement comparisons use their actual target and attribution; unresolved
comparisons are identified as such. Source-backed requirements retain their
source and review status, and their legal applicability remains separately gated.

## Mounting after UI integration

The coordinator owns the host UI. Import both component and scoped stylesheet
at its mount point:

```tsx
import ScenarioHandoff from './scenario_handoff/ScenarioHandoff'
import './scenario_handoff/scenario-handoff.css'

<ScenarioHandoff site={selected} model={model ?? null} assessment={result} />
```

Render only when `selected` is a current `Case`. The host must set `result` to
`null` on **every** site, model, placement or assumption change and on request
failure; it must accept a response only for the submitted inputs. The component
also refuses a missing assessment or a mismatched parcel, building, named-boundary
or capture record.
With only these three public props it cannot independently detect a stale
assessment after a model or placement edit. The current `OccupiedLots` state
already invalidates those edits, but mounting and composed browser verification
remain integration work. Do not pass a cached earlier result.

## Verification and limits

- Generated `retained-assessment.fixture.json` from the backend geometry engine
  using retained VIC-087 capture, a user-supplied 4 × 6 m placement and a 1.5 m
  user assumption. Its approximately 1.03 m parcel-boundary distance is an
  engine observation, not independently surveyed truth.
- The frontend test checks lossless site/model/assessment export, readable
  assumption and roofline wording, service restrictions, source-backed and
  named-boundary attribution, unresolved comparisons, no raw identifiers in
  copied text, and refusal of missing or mismatched assessments. Frontend tests,
  typecheck and build passed in the integration checkout after these changes.
  The existing Vite main-chunk advisory remains.
- The standalone PR branch was not mounted in the app. The integration checkout
  mounts the component in `OccupiedLots`; browser download, clipboard, keyboard
  traversal and narrow-screen appearance still need a composed UI check before
  claiming demo usability.
- Legal parcel lines, walls and building roles, current rules, controlled
  provider dimensions and installation/service commitments remain unreviewed.
  An accepted real evaluation still needs those artifacts and source review;
  local software checks and this enquiry draft do not establish feasibility.
- No enquiry is sent. A user must review and choose whether to contact a
  provider. There is no backend sharing, authentication or persistence.
