# Live parcel and builder integration — September 29, 2026

Starting main: `cfddc1e`. Integrated worker heads: #161 `48a313c`, #162 `1938715`,
#163 `ab129f4`, #164 `f341e11`, #170 `722e7ec`, #171 `31264cf`, #172 `759046b`.
The integration PR records the final tested head and CI status. Worker CI passed
on these heads; their separate checks did not establish a combined working route.

## Result and review decisions

The Model 300 demo now connects BC address search -> explicit address choice ->
City of Victoria parcel choice -> observation confirmation -> nominal placement ->
local unsent enquiry. The general assessment links to this journey instead of
maintaining a separate live selection that could not affect its summary (and
nesting the search form inside another form). Existing retained lookup remains
available as a separate example workflow. Manual facts or a scaled local sketch
can be used without a database or a matching public parcel.

Mounted both source routers in the existing FastAPI app. Live selections retain
`site-discovery.confirmed.v1`; they never acquire the retained spatial revision or
`sr-38.site-selection.v1`. A small adapter supplies the existing stateless geometry
engine with the confirmed geometry and provenance. Address/site/mode edits clear
old measurements and enquiries. Partial roofline fetches preserve useful parcel
geometry with incomplete obstruction coverage. No zoning check, publication,
owner database, outreach or automatic placement search was added.

Integration repairs:

- Export exact geocoder response text alongside its hash and parsed JSON.
- Municipal responses now also expose validated XY `planar_geometry`. Consumers
  no longer treat every Esri ring after the first as a GeoJSON hole. Original XYZ
  source bytes remain available. Multipart shapes display intact; the current
  single-Polygon placement engine returns unresolved measurements for them.
- Read collection-level Z/M metadata and propagate decomposition issues. Invalid
  source structures fail visibly instead of silently supplying invented geometry.
- Mount the manual sketch, preserve `LOCAL:METRE`, validate returned measurements,
  and reuse the two-decimal length/one-decimal area display policy. Exact numeric
  values remain in calculation and evidence. User-edited sketch dimensions are
  identified separately from the advertised model dimensions in the enquiry.
- Suppress late placement replies after component replacement. All sources and
  full response text remain copyable under technical evidence; nothing is
  durably stored on the server by these endpoints.

## Verification

Run from the repository root:

```powershell
python -m uv run --locked ruff check app tests
python -m uv run --locked pytest -q
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

The integration adds an actual mounted-API response fixture checked by Python and
consumed by the frontend parser/placement adapter. Its clock is explicitly synthetic;
it tests boundary compatibility, not legal or source correctness. A disjoint-shell
and hole regression preserves the whole shape without inventing a measurable parcel.
Local database tests skip when no explicitly disposable PostgreSQL is configured;
final-head CI supplies its own isolated database and container checks.

Local final checks: Ruff passed; 483 backend tests and 28 subtests passed, with
37 explicit database/lifecycle skips; 71 frontend tests passed; TypeScript/Vite
build passed. Existing TestClient deprecation and Vite bundle-size advisories remain.
Run `python -m uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 18139`
after the frontend build, then choose **Model 300 demo**. Retained database-backed
investigation pages still need their separately configured disposable/local database.

Developer browser walkthrough on localhost18139 (integration working tree):

- Live `1144 May St, Victoria, BC`: five address alternatives, explicit civic
  choice, one municipal parcel, 642 m² displayed and one roofline. Confirmation
  opened placement using that observation, without importing a retained example.
- Recentered nominal Model 300: contained, captured-roofline conflict, 5.35 m
  parcel-boundary distance in enquiry. Rotating cleared the prior measurement.
  Editing the address removed both the old placement workspace and enquiry.
- `200 Gorge Rd W, Saanich, BC` retained its Saanich choice and corrected Victoria
  alternative. Choosing Saanich produced outside-coverage guidance and a working
  manual-entry button; no silent substitution with the Victoria alternative.
- Manual 20 × 30 m lot, user-edited 2 × 4 m rectangle at (10,15): 9 m boundary
  distance, unknown obstruction coverage. Editing a note cleared the result.
- 390 × 844 viewport: no horizontal document overflow in the manual journey.
  Keyboard activation exercised search/selection/measurement controls. This is
  not a complete accessibility audit or independent user validation.

Opt-in source probe (`python -m app.municipal_sites.probe`) on September 29,
16:38 UTC returned one GISLINK candidate and available geometry for each:

| Public case | Mapped area (m², display) | Intersecting rooflines |
|---|---:|---:|
| 1144 May St | 642.0 | 1 |
| 1170 May St | 577.3 | 1 |
| 1253 Queens Ave | 563.8 | 2 |

Anonymous geocoder access worked in the browser; production entitlement, quotas
and uptime are unverified. City feature currency/accuracy remain unspecified.
These known research cases are a biased convenience sample, not a coverage rate.

## Acceptance matrix and outstanding work

Source-backed rows use public captures/live requests; injected failures are software
tests with explicitly synthetic changes. No row is a legally accepted fit label.

| Case | Evidence / result |
|---|---|
| Ordinary Victoria civic address | Live browser + offline captured HTTP tests pass |
| Other known Victoria parcel / multiple roofs | Bounded live probe passes, not a browser journey |
| Corrected street/locality alternative | Saanich saved capture + live browser preserves alternatives |
| Outside Victoria | Saanich choice offers manual recovery in browser |
| Missing civic match | Saved provider response and offline no-match behavior |
| Multiple municipal address rows | Injected ambiguity retains separate options |
| Wrong provider CRS | Injected response rejected, not treated as empty |
| Provider truncation | Injected transfer limit rejected |
| Missing rooflines | Injected partial response keeps parcel and unknown obstructions |
| Invalid/missing parcel | Injected source geometry yields explicit unresolved response |
| Stale parcel PID | Injected identity change rejected |
| Rate limit / outage / timeout | Offline address/municipal network-edge failure cases |
| Late address/parcel/observation replies | Deferred-response frontend checks clear old choices |
| Multipart with hole | Analytic topology regression preserves shape, measurement unresolved |
| Manual scaled lot | Analytic API tests + 9 m browser example |
| Real unit/strata ambiguity and new-address holdout | Pending; do not count synthetic ambiguity as this evidence |

Next, finish #169 with a small predeclared holdout set including real unit/strata
and boundary cases, lookup success/ambiguity and user review effort. Complete
keyboard/mobile live-map checks and independent walkthrough under #147. Keep #165
and discovery milestone M3 open until these gates are satisfied. Source-adapter
milestone M1 and connected selection M2 are complete after the integration merges.

Other remaining gaps and effects:

- #124/#125: controlled manufacturer drawings and local installation/service facts
  are absent; advertised dimensions support rough placement only. Request these
  from a participating builder when outreach is authorized.
- #104 and #11: current applicable rules are not reviewed/published; no legal
  compatibility result is available. Add only a small reviewed check subset.
- #16/#147: no real builder/homeowner has validated utility or willingness to pay.
  Use this reachable demo for one builder interview before broader municipal work.
- #169: live sources are session observations with copyable evidence, not durable
  database records. Refresh/mode changes can discard work. Decide minimum save/reopen
  needs from the pilot; do not imply that a checksum is a saved source.
- #169/#14: anonymous source access, request budgets and production reliability need
  deployment review. This integration runs locally and adds no hosted environment.

Recommended next round: complete the holdout/UX validation, obtain one builder's
model/site requirements, then implement the smallest repeated gap revealed. Defer
Saanich/Langford expansion, homeowner mail campaigns and earnings projections until
this narrower workflow demonstrates useful enquiries.
