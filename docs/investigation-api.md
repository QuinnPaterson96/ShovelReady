# SR-12 licensed observation investigation

This slice exposes stored, unreviewed spatial observations. It performs **no zoning
screening**. Issue #12 remains open for reviewed screening and release integration.
No evaluator interface, source acceptance, design fit, placement or publication is
invented. The six fictional preview scenarios remain a separate selectable mode.

## Run the real observations locally

From this checkout, with Python 3.12, Node 22.14 and PostgreSQL 17 binaries installed:

```powershell
python -m uv sync --locked
npm ci --prefix frontend
npm run build --prefix frontend
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin' --demo --http-port 8012
```

Open http://127.0.0.1:8012 and select **Real observations**. The runner creates a
new loopback-only cluster and UUID disposable database; it never attaches to an
existing server. It first runs the guarded test suite. Only on success and with
`--demo` does it run these existing explicit commands in sequence:

1. `python -m app.persistence.migrate`
2. `python -m app.spatial --import-records`
3. `python -m uvicorn app.main:app --host 127.0.0.1 --port 8012`

The runner passes its new database as `SHOVELREADY_DATABASE_URL`, sets
`SHOVELREADY_SPATIAL_COLLECTION=victoria-pilot-three-leads`, and explicitly selects
the revision printed by **that import command** as `SHOVELREADY_SPATIAL_REVISION`.
It does not query history or choose the newest stored revision. Ctrl+C stops the
server and cluster; diagnostic files remain in the printed temporary directory.
The ordinary runner without `--demo` retains its test-and-stop behavior.

For an independently provisioned disposable ShovelReady database, supply those
three environment variables yourself, run migration and import explicitly, and
copy the printed revision before starting HTTP. Never supply Styx credentials,
a shared database or the legacy `DATABASE_URL`. The Vite development proxy forwards
`/api` and `/health` to port 8000; the built frontend works on any HTTP port.

## Read interface

`GET /api/investigation` returns `sr-12.observations.v1`:

- `screening_status: not_performed`;
- `spatial`: the existing complete `sr-09.v1` SpatialImport, preserving collection
  revision, source/layer/request identities, original response/XYZ rings and
  attributes, feature-index locators, assessments, all query intersections and
  geometry diagnostics;
- `sources`: the fifteen pinned licensed source metadata records with snapshot
  ID, source URL, hash, capture date, printed revision, CRS, units, attribution
  and unreviewed status. Capture time is not legal effective time; effective
  dates remain unknown in this packet. Artifact URIs and review diagnostic paths
  are deliberately excluded.

There are no record-ID, artifact-path, collection-browsing or write routes. Client
query parameters cannot select another revision. Only server configuration selects
it. `/health` is process liveness even if investigation configuration/data is absent.
Startup neither connects to PostgreSQL nor runs migration, import or publication.
Reads use `Repository.get`; no duplicate storage queries or persistence changes.

Configuration absent/invalid or database unavailable returns a generic 503;
missing selected spatial revision returns 404; invalid stored payload, source pin
or configuration URL returns a generic 502. Responses never include exceptions,
connection strings or artifact paths. A missing referenced source is invalid data,
not an empty successful observation. No browser fallback to saved fixtures exists.
The browser shows loading, timeout, unavailable and invalid-response states and
provides an explicit reload button.

`app/investigation/pins.json` is a code-reviewed allowlist derived from the current
licensed September 24 packet: canonical SHA-256 hashes of all fifteen complete
SourceSnapshot payloads and nine LayerObservation payloads. The reader verifies
collection identity, exact source membership, requested revision identity/content
hash, metadata hashes and raw observation hashes before returning data. Thus even
a different source record using the same bytes (sites 80/86 zoning) retains its
own request identity. Merely adding a record to PostgreSQL cannot expose it here.
A new capture requires a deliberate reviewed allowlist change; selecting a new
processing revision of these same pinned observations is supported. Allowlisting
is a redistribution boundary, **not** legal review or SR-11 publication acceptance.

No artifact URI is opened and no source is recaptured at runtime. Only HTTPS links
to the captured Victoria service/catalogue hosts (`maps.victoria.ca`,
`opendata.victoria.ca`, `www.arcgis.com`) are rendered. Credentials, other schemes,
ports, whitespace and backslashes are rejected. Links are external current services,
not promises that live content still matches retained bytes. All source attributes,
issues and metadata render as React text, never HTML or executable expressions.

## UI and geometry

Selections use `(snapshot_id, feature_index)`; parcel IDs alone are not permanent
sites. Capture-request groups 59, 80 and 86 remain investigation cases. The SVG
uses original EPSG:3157 XY in metres, reverses only display Y for north-up, and
retains every ring with even-odd fill (holes and multiple parts). Polygon,
multipolygon, line, point and collection intersections are supported. Rooflines
are purple and explicitly distinguished from wall footprints/principal buildings.
Zoom, four-direction pan, reset, roofline and zoning toggles work without tiles,
provider accounts, geographic relabelling or inferred legal measurements.

Every retained intersection appears in the list, including slivers and boundary
touches even if too small to distinguish at a given zoom. The real capture has
one material intersection per parcel; it has no observed sliver or boundary-touch
case. Those rendering cases are synthetic tests, not observations claimed here.
Geometric area, uncovered area and overlapping area retain their names and null
states. Derived longitude/latitude remains EPSG:4617, not EPSG:4326/RFC 7946.
Missing geometry has an explicit unavailable map state. All captured feature
attributes (including nulls), XYZ rings and fifteen metadata records are accessible.

The frontend validates the versioned JSON Schema generated from the API DTO using
Ajv, then checks source URLs, geometry shape/finite coordinates and scoped references.
A backend test detects schema drift. `observed.test.json` is a licensed API envelope
for offline wire-reader tests; it is never imported by the application or used as
an evaluator oracle. Source pin generation uses canonical JSON (sorted keys,
compact separators, UTF-8, SHA-256), matching SR-09's digest convention. No new
persistence migration or shared contract was introduced.

## Verification and simulated author rehearsal

September 24, 2026, Windows / Python 3.12 / PostgreSQL 17.2 / Node 22:

- Guarded disposable PostgreSQL suite: 130 tests plus 28 contract subtests passed
  in the final run (129 at the earlier browser-demo checkpoint). Actual licensed import
  -> PostgreSQL -> Repository -> HTTP returned 15 sources, nine responses, ten
  features and three parcel analyses. No database skips in that run.
- API regressions cover absent configuration/legacy fallback, liveness, missing
  revision, sanitized database errors, version rejection, source/collection pins,
  raw-observation tampering and forbidden URLs. Schema drift is checked.
- Four frontend test groups cover valid real payload parsing, malformed/versioned
  payloads, bad references/geometry/URLs, null measurements, holes/multipart and
  zero-area geometry, plus inert malicious text through the actual UI renderer.
- Frontend typecheck/build passed. Backend lint, two acquisition checks, ten intake
  checks and three synthetic-preview checks passed. Existing CI jobs are retained;
  `npm test` is added to the frontend job. npm audit reported zero vulnerabilities
  after selecting Ajv 8.18.0. No local Docker run is claimed.
- In-app browser walkthrough against the runner's actual stored import selected
  leads 59, 80 and 86, inspected a roofline and source metadata, used zoom, pan,
  reset and the roofline toggle, and checked the SVG visually. Loading appeared
  during reload. A second HTTP process with no investigation configuration showed
  an unavailable alert while process health remained reachable. No fixture fallback.
  Browser inspection found and fixed a roofline-toggle suffix mismatch and a mode
  label encoding issue. Unit tests cover malformed responses; that error was not
  injected into the real browser server.

Using the existing [tasks](usability/tasks.md) and [rubric](usability/rubric.md), the
author rehearsed A-F after switching explicitly to fictional mode. A retained its
fictional candidate; B its missing facts; C its supplied-placement failure; D its
outside-coverage investigation; E its unresolved reference; F its archived candidate
and separately expandable correction. These are simulated author observations,
not independent participants, customer demand, speed, satisfaction, legal accuracy
or demonstrated human understanding. No customer session or source review occurred.

Applying the same evidence questions to the real mode: none of the three leads can
be described as buildable; the source date is a capture date; rooflines and geometric
areas cannot resolve legal yards/grade; a next-information request must seek reviewed
site facts, legal applicability and a controlled design with supplied placement.
No fabricated rule/release citation can answer those missing questions.

## Remaining gates

SR-11 acceptance/publication remains separate. Reviewed applicable clauses and
source rights for regulatory content, independently reviewed site boundaries and
measurements, principal-building/wall-footprint identity, grade/lot-line/legal-yard
facts, controlled design revision and supplied placement are still required.
F3's evaluator must later consume supported reviewed facts/rules through an agreed
screening contract; this viewer neither calls it nor asserts outcomes. Screening,
batch evaluation, accepted-release/result identity, full saved-source-to-result
integration (SR-13), deployment and independent customer validation remain open.
Address resolution and positional/legal accuracy are also unverified. The selected
observation revision never becomes an active release merely by being displayed.
