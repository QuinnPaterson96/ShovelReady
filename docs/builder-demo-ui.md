# Model 300 sample journey

September 29 integration update: see [combined behavior and verification](integration-live-parcel-discovery.md).
The Model 300 route now owns live discovery and manual placement; the standalone
worker limitations below describe the earlier handoff. Municipal responses also
expose validated `planar_geometry`; geocoder evidence now includes `rawResponseText`.


Implemented on the `Model 300 demo` route in the ShovelReady app. This is an
independent demonstration using the existing unreviewed `aux-300` catalogue record.
The general assessment and occupied-lot routes remain available. The builder route
has an explicit Model 300 allow-list; its placement selector cannot switch to
another provider or model.

The page starts with source-labelled nominal exterior dimensions, a distinct
advertised exterior height, and a notice that installed/regulatory height is
unknown. The catalogue record, capture date, review status and provider source
link remain visible; exact source data is in an expandable record. It then mounts
`SitePreparation` for bounded API lookup and separate manual site facts. A confirmed
unmatched/manual site is enough to prepare an unsent enquiry. Address, PID and area
do not generate parcel geometry. A returned parcel lead is never joined to an
occupied-lot case by address or PID.

The visitor may explicitly import one of three retained geometry examples. It is
labelled as a separate example and feeds the existing occupied-lot placement API.
The builder route receives the current site, model, dimension origins and result
through `OccupiedLots.onMeasurement`; every site, model, position, rotation,
dimension or clearance edit clears that result. The shorter builder enquiry keeps
use, timing, optional budget and access/services questions live, with unknowns
allowed. It has no contact fields, persistence, external submission, price or
legal-fit conclusion. The full site selection and current measurement are available
in technical details; the readable draft foregrounds useful questions and dated
sources.

## Manual sketch mounting handoff

The parallel #160 component exports `ManualSiteInput({ onChange, footprint? })`.
Its callback supplies `{ facts, site: Site | null, placement: Placement | null,
assessment: ManualAssessment | null }`. A supplied `site` uses the explicit
`LOCAL:METRE` frame and user-origin evidence. The parent integration should mount
this as another optional branch after the site-facts step and pass Model 300's
nominal width/depth through `footprint`. Keep its facts separate from the source
candidate and never infer that a matched address identifies the sketch. A null
site or assessment must produce a facts-only enquiry. The builder branch does not
import #160 before it is integrated; manual width/depth geometry is therefore
still a follow-up for the combined journey.

## Verification and limits

`npm ci --prefix frontend`, `npm test --prefix frontend` (63 passed), and
`npm run build --prefix frontend` passed in the #159 worktree. Tests cover the
facts-only enquiry, explicit separate retained example, catalogue allow-list
rendering and the existing geometry-result uncertainty behavior. These software
checks do not review the catalogue source, establish site applicability, publish
an accepted dataset or validate the journey with a prospective homeowner. The
builder route remains an independent sample, not a provider-approved intake.

An isolated local preview used FastAPI on `127.0.0.1:18159` serving this worktree's
built frontend, with no database configuration. In the browser, manual unmatched
address and area produced a facts-only draft; explicit import exposed only Model
300 and the three retained lots. The VIC-087 recentered rectangle returned a
captured roofline overlap, and changing rotation removed both the old result and
its builder enquiry measurement. A 390 px viewport had no horizontal document
overflow. The address lookup returned HTTP 503 in this database-free preview and
kept the manual fallback visible. With map focus, Arrow Right moved the recentered
X coordinate from 473693.57 to 473694.57 m. A matched source lookup still needs
composed verification with an isolated disposable database; this developer
walkthrough is not prospective-user validation.
