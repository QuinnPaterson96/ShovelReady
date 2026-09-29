# BC address candidate search

Status: implemented adapter boundary for #166. The route supplies address candidates, not a parcel match, reviewed site fact, or fit result. It does not change the retained `/api/site-preparations` contract.

## v1 HTTP contract

`POST /api/address-search` accepts JSON such as:

```json
{"schemaVersion":"sr-address-search.v1","query":"200 Gorge Rd W, Saanich, BC","maxResults":5}
```

`query` is trimmed, printable and 3–160 characters. `maxResults` is 1–5, default 5. Unknown fields, unsupported versions and invalid input return HTTP 422. The response is always `sr-address-search.v1` with the normalized `query`, ordered `candidates`, `mayBeTruncated`, `status`, optional `reason`, and optional `source`.

| Status | Meaning |
|---|---|
| `candidates` | Provider returned one or more ordered alternatives. A person must select explicitly. |
| `no_match` | Valid provider response contained zero features. |
| `unavailable` | Connection, timeout, server or access failure. Manual address entry remains available to the caller. |
| `rate_limited` | Provider HTTP 429. No automatic retry. |
| `malformed` | Provider JSON, CRS, coordinates, required fields, limit or response size failed validation. |

Every candidate contains `locator` (position plus feature digest tied to this response), `fullAddress`, structured `address`, `locality`, `providerSiteId` (BC Geocoder locator only), `score`, `matchPrecision`, full `faults`, `locationDescriptor`, `locationPositionalAccuracy`, `point` with `EPSG:4326`, and `sourceChangeDate` when supplied. `score` measures address matching, never parcel linkage or legal identity. There is no selected candidate field. The caller must keep address and parcel confirmation separate.

`source` gives the BC Address Geocoder name, exact request URL, UTC `fetchedAt`, provider `providerSearchTimestamp`, `providerBaseDataDate` and `providerVersion`, response SHA-256, licence, `unreviewed` status and `rawResponse`. The complete raw response permits replay of normalization from this returned result; the service does **not** persist it. A client needing durable evidence must export or save it explicitly. `fetchedAt` is this application's retrieval time, not the address feature's `sourceChangeDate` or the provider base-data date. Hashes and raw JSON belong in expandable technical evidence in a UI.

Saved examples:

- [Saanich API response](../tests/fixtures/address_search/saanich-api-response.json) preserves a Saanich first candidate **and** a different Victoria second candidate, with faults and their original coordinates. [Provider bytes](../tests/fixtures/address_search/saanich-provider.json) and [capture record](../tests/fixtures/address_search/saanich-capture.json) support replay.
- [Victoria provider response](../tests/fixtures/address_search/victoria-provider.json) returns five alternatives for 525 Superior St, including less precise street/locality candidates. The limit is reached, so further alternatives may exist.
- [Missing-address probe](../tests/fixtures/address_search/missing-provider.json) for an imaginary civic address still returns low-precision locality fallbacks. A true zero-feature response is represented by `no_match` in the offline test. Do not treat fallback localities as a verified civic address.

## Provider access, rights and operation

The [official developer guide](https://github.com/bcgov/api-specs/blob/master/geocoder/geocoder-developer-guide.md) documents the fixed `https://geocoder.api.gov.bc.ca/addresses` resource, `addressString` or structured address components, `outputSRS`, `maxResults`, and gateway 401/403/429 conditions. This adapter calls only `https://geocoder.api.gov.bc.ca/addresses.json` with structured URL parameters `addressString`, `maxResults`, `outputSRS=4326`, `echo=true`, and `autoComplete=false`; it does not restrict locality. The guide's own Saanich/Victoria locality-filter example demonstrates why filtering could silently change the sought address. No `/parcels` or occupant resource is used.

The [BC Geocoder catalogue record](https://catalogue.data.gov.bc.ca/dataset/bc-address-geocoder-web-service) identifies the public service; the captured responses link their copyright licence to the [Open Government Licence – British Columbia](https://www2.gov.bc.ca/gov/content/data/policy-standards/data-policies/open-data/open-government-licence-bc). Attribution: **Contains information licensed under the Open Government Licence – British Columbia.** The guide says an API key can be acquired through the API Services Portal for a stated rate limit. These three public bounded probes succeeded without a key on September 28, 2026. This does not establish production entitlement, quota or uptime. If deployment requires a key, obtain approved project access through that portal and set `BC_GEOCODER_API_KEY` in server-side environment configuration. Do not send it to the browser or log it. A 401/403 returns `unavailable`; manual entry must remain usable.

Each request has a 4-second timeout, at most one retry for connection/timeout or HTTP 5xx, a 100,000-byte response ceiling and five-candidate ceiling. 429 and access denials are not retried. No cache, user-query log, database write or network call at startup is added. The returned capture is fresh for that call, but the provider's source dates may differ. Provider changes or outages can alter candidate lists; callers should show the fetch date and review status.

## Verification and limitations

On September 28, 2026, direct public GETs for 525 Superior St, 200 Gorge Rd W and a deliberately nonexistent civic address returned 200 JSON. The first two returned both exact and less precise/corrected alternatives; the nonexistent address returned locality fallbacks. Saved response bytes, URLs, UTC fetch times, byte counts and hashes are in the fixture directory. These probes establish current public response shape only, not source accuracy or service guarantees.

Offline tests drive FastAPI through the real adapter with those saved bytes, replacing only the network opener. They cover ordered/corrected alternatives, no-match versus fallback, invalid JSON, wrong CRS, oversized/invalid coordinates, gateway errors, bounded retry and timeout, and retained lookup route coexistence. No live request runs in ordinary CI. The adapter does not verify an address–parcel crosswalk, positional accuracy, source currency, licence suitability for a particular deployment, or legal suitability of any site. The municipal adapter and #169 integration own parcel confirmation and combined user validation.
