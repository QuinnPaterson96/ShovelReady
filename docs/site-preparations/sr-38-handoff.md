# SR-38 retained Victoria parcel preparation

Issue: https://github.com/QuinnPaterson96/ShovelReady/issues/86. Starting base:
`6c14d9f4f4dc43c297b341a212dd8174585d1880` (main with PR #85).

## Decision and scope

The existing `sr-09.v1` spatial import and `sr-12.observations.v1` investigation
reader already preserve the licensed raw responses, source snapshots, feature
locators and exact selected revision. This slice projects those observations
into `sr-38.site-lookup.v1` without a second acquisition or storage pipeline.
The runtime searches only three retained Victoria parcel leads. It never
queries a live service, selects a newest revision, mutates a record, or performs
zoning screening. An address lookup is `unavailable` because the retained
collection has no address-point response or reviewed address-to-PID join. A
valid PID with no result is `no_match` **within those three leads only**.

The [live City parcel layer metadata](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/11?f=pjson)
was checked September 25, 2026: layer 11 remains a queryable polygon layer
in EPSG:3157 and exposes `PID`, `VicPID`, `ParcelType`, `ParcelStatus`,
`Shape_Area` and `OBJECTID`. `PID` is the lookup join field; `OBJECTID` is
only a service feature locator. The [recorded acquisition evidence](../pilot-inputs/acquisition-evidence.md)
and [City Open Data Licence](https://opendata.victoria.ca/pages/open-data-licence)
support retaining and attributing the existing open-data packet. The live
service metadata alone does not authorize arbitrary other datasets. The City
also lists an Address Points layer, but this work does not assert a permitted,
stable, one-to-many address/PID join until its schema, terms and captured
responses are reviewed. No province-wide coverage is claimed.

`candidate_id` is `parcel_snapshot_id/feature_index`, scoped to the exact
spatial revision. It is deliberately not a permanent parcel identity. Matching
returns all exact normalized PID candidates, including duplicates, and never
marks one selected. The UI callback fires only after a user presses a
confirmation button. Manual address, PID, approximate area and notes remain
separate `user` facts. Source values are retained in the candidate even when
manual values differ. Every value has source/user/derived origin and unreviewed
status. Derived area uses Shapely XY polygon area in EPSG:3157 square metres,
not a surveyed or regulatory lot area. Boundary is original Esri rings with
its CRS label; no geometry is required for manual entry. Zoning is an observed
contact, not current legal applicability. Constraints are `not_queried`, not
an assertion that none exist.

## API and integration

Run the existing explicit migration and `python -m app.spatial --import-records`
command against a project-owned database as described in
[the investigation setup](../investigation-api.md). Configure
`SHOVELREADY_DATABASE_URL`, `SHOVELREADY_SPATIAL_COLLECTION` and the exact
`SHOVELREADY_SPATIAL_REVISION` from that import. Application startup does not
import, fetch or refresh. Refresh requires an explicit licensed recapture
through `docs/pilot-inputs/acquire.py`, review/update of the packet manifest
and pinned hashes, validation by `app.spatial.importer.prepare`, an explicit
new import and explicit server revision selection. Earlier snapshots remain.

`GET /api/site-preparations/lookup?kind=pid&q=028-279-638` returns one
candidate in the retained packet. The same endpoint with
`kind=pid&q=000-000-001` returns `no_match`; `kind=address&q=123%20Example%20St`
returns `unavailable` with a manual path. Configuration absence is 503;
missing selected revision is 404; invalid stored investigation is 502;
malformed query is 400/422. There is no arbitrary URL or file parameter.

The SR-41 integrator can mount
`frontend/src/site_preparations/SitePreparation.tsx` with
`<SitePreparation onConfirm={selection => ...} />`, import its scoped
`site-preparation.css` at the application entry, and consume
`SitePreparationSelection` from `types.ts`. The callback payload is
`sr-38.site-selection.v1`, `mode` is `retained_candidate` or
`manual_unmatched`, and it carries the original candidate, exact spatial
revision (when matched), and distinct manual facts. A callback is a user
confirmation of a lead, not a reviewed site or screening outcome. SR-41 owns
assessment form/model and final wiring; this PR does not edit those files.

## Checked examples and remaining gates

Retained PID `028-279-638` yields one `GRD-1` observation, source snapshot
`site-59-parcel:sha256:8d666d1dffaaa039101ee84f407e7bb84d80ed7c933f70fde0e8e8b87d7a7f92`,
and approximately `563.7657953943635 m2` XY area. The address is unknown.
An unretained PID returns no match only within the three-lead collection.
Synthetic duplicate-PID testing verifies ambiguous candidates are retained.
No survey, title review, current-law determination, principal-building
geometry, placement or accepted publication has occurred. A wider official
address/API lookup needs licensed capture, join testing, bounded refresh and
review before activation.

## Verification at task head

On September 25, 2026, `python -m uv run --locked ruff check app tests
contract_tests migrations scripts docs/pilot-inputs/intake.py
docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py` passed.
`python -m uv run --locked pytest -q` passed 368 tests and 28 contract
subtests; 37 database/lifecycle tests skipped because no explicitly disposable
PostgreSQL cluster was configured. `npm test --prefix frontend` passed 32
tests, and `npm run build --prefix frontend` passed TypeScript and Vite (the
existing chunk-size advisory remains). `git diff --check` passed. These
software checks do not constitute independent source review, accepted data
publication, or user validation. The standalone component has no app route
until SR-41 integrates it; no browser interaction claim is made here.
