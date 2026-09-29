# Victoria live municipal sites: provisional API boundary

September 29 integration update: see [combined behavior and verification](integration-live-parcel-discovery.md).
The Model 300 route now owns live discovery and manual placement; the standalone
worker limitations below describe the earlier handoff. Municipal responses also
expose validated `planar_geometry`; geocoder evidence now includes `rawResponseText`.


Issue [#167](https://github.com/QuinnPaterson96/ShovelReady/issues/167), under [#165](https://github.com/QuinnPaterson96/ShovelReady/issues/165). Base: `cfddc1e`. This is a bounded, live public-source observation adapter, not an accepted site, title, occupancy, zoning or fit determination.

## Versioned contract

Mount `app.municipal_sites.api.router` in the shared FastAPI application during #169 integration. The adapter never fetches on import/startup. Both endpoints are `POST` with JSON requests; responses carry `schema_version: municipal-sites.v1`. `POST /api/municipal-sites/search` accepts exactly one of `address` (1–120 characters) or `pid` (`NNN-NNN-NNN`), plus optional `point_hint: {crs:"EPSG:3157", x, y}` within the layer's Victoria extent. It returns all bounded candidate parcels, their original City identities, relation (`gislink_join`, `pid_exact`, or `spatial_lead`), and source evidence. `spatial_lead` never proves identity. `POST /api/municipal-sites/observe` accepts `{schema_version:"municipal-sites.v1", parcel_ref:{source:"city-of-victoria-pid-parcels", object_id:87}}`; the user must select a candidate explicitly. It re-fetches the selected parcel by OBJECTID, measures valid EPSG:3157 geometry, and fetches intersecting rooflines. It never selects a parcel automatically.

Responses include capture UTC time, fixed source URL, City licence link and attribution, source-date limitations, raw bounded provider responses, and a SHA-256 check value. Raw bytes are **returned in the evidence export** and must be saved by the caller for later reproducibility; the API does not persist them. A checksum alone does not imply retention. An observation can have `available`, `partial`, `missing`, or `invalid` geometry status; `stale` is reported when the selected identity differs from the re-fetched identity. No returned rooflines does not certify open space. Lengths and areas are computed from full-precision EPSG:3157 metre coordinates; human-facing consumers should round lengths to at most 2 decimals and areas to 1, while preserving source values in technical evidence.

`tests/fixtures/municipal_sites/` contains genuine previously saved City responses and a contract example. Failure cases are synthetic mutations of those responses and are labelled accordingly.

### Recorded response shape (public case)

```json
{"schema_version":"municipal-sites.v1","status":"candidates","candidates":[{"parcel_ref":{"source":"city-of-victoria-pid-parcels","object_id":87},"pid":"001-328-107","gislink":"03229041","address":"1144 MAY ST","address_object_id":9209,"relation":"gislink_join","identity_status":"source_join_unreviewed","attributes":{"OBJECTID":87,"PID":"001-328-107","GISLINK":"03229041"}}],"evidence":["bounded City response receipts with raw_response_text"],"note":"Select a parcel explicitly"}
```

The example abbreviates evidence and attributes for readability; actual responses contain full attributes, source URLs, licence, capture times, checksums and exact provider response text. An observation for selected OBJECTID 87 has `status: available`, `parcel.horizontal_crs: EPSG:3157`, `parcel.area_m2: 642.0220911965725` and one intersecting roofline. The exact JSON is produced by the isolated router and saved fixture replay; it is not a title or source accuracy finding.

## Source meaning and rights

The City [Address Points layer 0](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/0?f=pjson) exposes `FullAddress`, `GISLINK` and `OBJECTID`; [PID parcels layer 11](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/11?f=pjson) exposes `PID`, `GISLINK`, parcel type/status and `OBJECTID`; [Building Rooflines layer 1](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/1?f=pjson) exposes roofline features. The [address catalogue](https://www.arcgis.com/sharing/rest/content/items/d638de50c2bb46e3a4c15fefe3756e78?f=pjson), [parcel catalogue](https://www.arcgis.com/sharing/rest/content/items/901cb49452d14dd2855fa701311f0545?f=pjson), and [roofline catalogue](https://www.arcgis.com/sharing/rest/content/items/dc37de452a614b599dd9c9ff473739d3?f=pjson) link the [City Open Data Licence](https://opendata.victoria.ca/pages/open-data-licence). Attribution: **Contains information licensed under the Open Government Licence - City of Victoria.** The roofline catalogue describes digitization from aerial imagery flown May 28, 2025; this does not date every feature. Parcel and address feature update dates and numeric accuracy are unknown. Portal modified timestamps are not feature currency dates.

`GISLINK` is a source field joining address rows to parcel rows; the relationship can be one-to-many or ambiguous. `OBJECTID` is a layer-local locator, not title identity. Geocoder `siteID`, PID and `GISLINK` are distinct. Roofline intersections are spatial contacts, not building ownership or wall outlines. The [retained occupied-lot packet](research/occupied-lots/README.md) supplies historical public examples, not a live runtime source or accepted release.

## Integration and remaining gates

### Opt-in source probe, 2026-09-29 UTC

`python -m uv run --locked python -m app.municipal_sites.probe` queried only the three pre-existing public cases below. It requested no owner or contact fields. Results reflect that run, not ongoing service availability:

| Public address | Joined PID / parcel OBJECTID | Observed parcel area m² | Intersecting rooflines | Status |
|---|---|---:|---:|---|
| 1144 MAY ST | 001-328-107 / 87 | 642.0220911965725 | 1 | available |
| 1170 MAY ST | 008-140-723 / 80 | 577.3288014661284 | 1 | available |
| 1253 QUEENS AVE | 028-279-638 / 59 | 563.7657953943635 | 2 | available |

The three search responses each returned one `gislink_join` candidate. The run completed at 02:53:02–02:53:05 UTC. All observations remain unreviewed; no feature update date or positional accuracy was supplied. Test fixtures separately preserve the exact response bytes for case 87. The probe does not establish coverage outside these cases, geometry accuracy, ownership or legal rights.

#169 owns mounting the router, UI contract reconciliation, combined browser verification and shared configuration. Live calls use fixed City URLs with feature, byte and time limits; no credentials or database are required. The caller should expose manual correction when search is unavailable or ambiguous. Independent source accuracy/currency review, accepted publication, legal checks and user validation remain separate. The opt-in source probe records 3–5 public cases without owner/contact fields; ordinary tests remain offline.
