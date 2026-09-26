# Bounded Victoria address join

Issue [SR-38/#86](https://github.com/QuinnPaterson96/ShovelReady/issues/86).
Starting base is main `4e177989080bdf0a6831b9006b8630a96883c139` (PR #101).
This adds address preparation to the existing three PID leads. It does not
establish a legal site, current zoning applicability, exact parcel dimensions,
placement, title rights or a screening result.

## Source and join decision

The City's [Address Points catalogue](https://www.arcgis.com/sharing/rest/content/items/d638de50c2bb46e3a4c15fefe3756e78?f=pjson)
identifies the exact [OpenData Address Points layer](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/0?f=pjson)
and links the [City Open Data Licence](https://opendata.victoria.ca/pages/open-data-licence).
The catalogue describes address points at parcel centroids, merged using a matching
ID and copied to the portal daily. Its modified timestamp is **not** a data
currency date. The layer is queryable, uses EPSG:3157 and exposes `FullAddress`,
`GISLINK`, `Legal_Type` and `OBJECTID`. The existing [PID parcel layer](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/11?f=pjson)
also exposes `GISLINK`. That field, checked against the actual retained parcel
attributes, is the join key. `OBJECTID` is only a response locator; a point
coordinate is not used as a parcel identity or boundary. Both datasets are
covered by their own catalogue licence links. Attribution: **Contains information
licensed under the Open Government Licence - City of Victoria.**

On September 26, 2026 UTC, the fixed requests in
[`address-requests.json`](address-requests.json) captured the catalogue, layer
metadata and three `GISLINK` queries using the existing bounded HTTP capture
tool. The five raw JSON responses are content-addressed in
`app/site_preparations/data`, with byte hashes, URLs, capture times and HTTP
receipt metadata in `address-manifest.json`. They are unreviewed observations,
not independent confirmation of City records or title. The fixed queries returned:

| Retained PID | Actual `FullAddress` rows | `Legal_Type` |
|---|---|---|
| `028-279-638` | `1253 QUEENS AVE`; `1255 QUEENS AVE` | `LAND`; `ALIAS` |
| `008-140-723` | `1170 MAY ST` | `LAND` |
| `001-327-470` | `1156 MAY ST`; `B-1156 MAY ST` | `LAND`; `ALIAS` |

An alias remains a source observation. The response does not prove that every
valid address or every parcel is captured. Search is exact after whitespace
and case normalization; no geocoder guess or unit-number inference is made.
Different retained parcels with the same address would return `ambiguous`.
An unmatched address returns `no_match` **only among these five rows**, not
absence from Victoria. A selected parcel still requires explicit user
confirmation. `Candidate.address.evidence` preserves the response hash,
feature index, URL, capture time, `Legal_Type` and join method. PID lookup remains compatible
and leaves `address` unknown because a parcel can have several address rows.

## Explicit acquisition and selection

No application startup fetch or import occurs. To reproduce or refresh this
bounded packet, inspect the two official catalogue/layer metadata pages and
licence first, then run from the repository root:

```powershell
python docs/pilot-inputs/acquire.py docs/site-preparations/address-requests.json C:/temporary/shovelready-address-capture
python -m uv run --locked python -m app.site_preparations --import-capture C:/temporary/shovelready-address-capture
python -m uv run --locked python -m app.site_preparations --check
```

The capture directory must be outside the checkout. Import checks all five
receipts, byte hashes, exact request URLs, licence link, layer schema, CRS,
response bounds and `GISLINK` keys before atomically replacing the active
address manifest. A failed import leaves the selected manifest intact. Review
the resulting Git diff and commit the new content-addressed objects and
manifest as an explicit data change. Re-capture does not select a new runtime
revision automatically. The current address revision is
`address:sha256:4830a1985952b3150bf01bc276575a08238c5bbb71bf4fc489675231be534e5f`.
The importer binds it to the three exact parcel source snapshot IDs in the
manifest. Derived spatial revision hashes can vary with the geometry runtime,
while these content-addressed source snapshots remain identical. Different
parcel source snapshots require a reviewed join and new address capture; the
old address packet returns `unavailable` for those sources.

Import the existing spatial packet into an explicitly project-owned database
using [the investigation instructions](../investigation-api.md) and configure
its exact `SHOVELREADY_SPATIAL_COLLECTION` and `SHOVELREADY_SPATIAL_REVISION`.
Select the address packet separately with
`SHOVELREADY_ADDRESS_REVISION=address:sha256:4830a1985952b3150bf01bc276575a08238c5bbb71bf4fc489675231be534e5f`.
Without that exact value, or with mismatched parcel source snapshots, address lookup returns `unavailable` and PID/manual
preparation remains available. No migration is needed. These captures are
unreviewed and are not accepted data publication.

## API result and limits

The existing `GET /api/site-preparations/lookup?kind=address&q=...` and
`sr-38.site-lookup.v1` shape are unchanged. `1253 QUEENS AVE` yields one
unselected candidate with PID `028-279-638` and a source-backed address fact.
`123 Example St` yields `no_match` within the five rows. Malformed capture
or a broken join yields HTTP 502, never a blank successful match. A missing
address revision or mismatched parcel source snapshots yields `unavailable`. The
manual fallback remains appropriate for uncaptured addresses and corrections;
manual facts retain user origin and do not overwrite source evidence.

Software verification uses saved responses only. It covers exact rows and
alias responses, no match, synthetic ambiguity, revision mismatch, corrupt
capture, failed API and atomic import. It does not establish address accuracy,
official legal parcel identity, accepted publication or user validation. SR-41
owns browser wiring and presentation; no frontend component or shell changed
here. The integrator should update its visible three-PID/five-address coverage
and manual path, then verify the mounted producer-to-browser flow.
