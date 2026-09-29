# Manual site input handoff

Issue #160 adds a standalone manual site form in `frontend/src/manual_site/`. It is not mounted in the app yet. It keeps user-entered address, stated area and notes in `facts` even when no shape is available. Address and area never generate geometry or a geocoded parcel match.

## Boundary and frame

`LOCAL:METRE` is the sole engineering frame accepted by `app.scouting_geometry` alongside its existing projected metre CRS validation. The exact marker must be repeated in `site.projected_metre_crs` and every feature's `shape.crs`. The sketch origin (0,0) is the user's approximate parcel lower-left corner; X follows entered width, Y follows entered depth. Neither axis is a compass bearing or geolocation. A local sketch and EPSG observation cannot be mixed: individual mismatched features remain invalid. Unknown CRS, longitude/latitude and non-metre map frames retain their existing rejection path. API request and echoed assessment retain the marker and user source labels. Existing projected-site callers and `scouting-geometry.v1` schema remain valid.

The user enters positive parcel width/depth in metres to enable a rectangle. A stated area alone leaves `site: null`. Existing structures require their own label, lower-left X/Y and positive width/depth in the same frame. Incomplete structure rows are omitted with an explicit capture limitation so parcel measurements remain available. Their basis is `unknown` (neither a surveyed wall nor captured roofline). The capture stays `unknown` or `partial`; even an empty list does not assert clear space. A footprint additionally requires positive width/depth, finite centre coordinates and rotation to measure. The UI posts the exact scaled request to `/api/scouting-geometry/assess` and displays only the returned tested-placement observations. Any edit clears the assessment, including fact edits and upstream footprint changes. Stale responses are ignored. No zoning, legal setbacks, automatic placement search or address association are computed.

## Component contract

```tsx
import { ManualSiteInput } from './manual_site/ManualSiteInput'
import type { ManualSiteOutput } from './manual_site/model'

const [manual, setManual] = useState<ManualSiteOutput | null>(null)
<ManualSiteInput
  footprint={{ widthM: 9.144, depthM: 3.048, label: 'Model 300 nominal exterior' }}
  onChange={setManual}
/>

// Only if explicit manual geometry exists, offer it to an existing Case consumer:
const manualCase = manual?.site
  ? { case_id: 'manual-local', label: 'User supplied approximate site', site: manual.site }
  : null
// manual.facts remains separate; address is not verified against manualCase.
// manual.placement and manual.assessment refer only to the current local sketch.
```

`onChange` receives `{ facts, site, placement, assessment }`. `site` is an existing `Site` shape or `null`; `placement` is null until both site and footprint/position are usable; `assessment` is null before measurement and after any edit. `facts` carries strings `{ address, statedAreaM2, notes }` as user assertions, not normalized cadastral records. `footprint` is optional; absent dimensions default to blank/unknown. A changed footprint prop resets both dimension fields and clears the assessment. The caller may copy these facts into an unsent enquiry, with user attribution, but should not imply an address-to-parcel join.

## Verification and limits

The stateless API test uses a 20 m × 30 m local parcel and a centred 2 m × 4 m footprint. Its nearest parcel edge is independently 9 m away. The test checks unknown buildings remain missing, mixed local/EPSG frames fail, and an unsupported local unit fails. Frontend model checks reject absent, zero, negative and incomplete dimensions. Browser integration into the builder entry, source review of any real site, accepted publication and user validation remain for the combined owner. The rectangle cannot express angled/irregular boundaries, outbuildings without entered positions, or access/utility constraints; these stay unresolved in an enquiry.
