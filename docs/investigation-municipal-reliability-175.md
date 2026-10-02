# Victoria live-source reliability follow-up (#175)

October 2, 2026; base `071568dad10bc744baedea96e09518da5ea35208`.
Public, bounded queries only; no customer contact or owner fields. City of Victoria
Open Data MapServer layers 11 (parcel) and 1 (building) are unreviewed live
observations under the [City licence](https://opendata.victoria.ca/pages/open-data-licence).

## Observation and diagnosis

- Known public parcel OBJECTID 87: the original adapter returned ArcGIS error
  envelope in 5.36 s; holdout OBJECTID 80 returned one roofline in 0.61 s.
  A direct repeat of the parcel request showed HTTP 200 plus ArcGIS code 400,
  message `Pagination is not supported.` in 0.25 s, then one feature in 0.27 s.
- Two parcel and two address requests without `resultRecordCount` succeeded in
  0.24–0.28 s. A later adapter call *without that parameter* still returned the
  same ArcGIS 400 for each parcel (0.55 and 0.23 s); two subsequent identical
  parcel-and-building requests succeeded in 0.56 and 0.49 s. Removing the
  parameter is simpler and keeps a bounded client-side limit, but it did not
  eliminate the intermittent error. The provider's internal cause is unknown.
- The original browser catch path labelled any observation exception as
  unavailable or invalid *geometry*, even for a 502 provider envelope. Roofline
  fetch errors already produced partial parcel evidence and did not establish
  an empty lot.

## Implemented boundary and recovery

The adapter omits unsupported pagination arguments, enforces 1 MB and fewer
than 25 feature rows, and retries once after 250 ms only for the observed exact
pagination envelope, HTTP/ArcGIS 429 or 5xx, and network failures. Each network
attempt has a 5 s timeout. Other ArcGIS 400s, malformed JSON/contracts,
unexpected CRS, and invalid geometry do not retry. Failed provider responses
report only source layer and a bounded error category/code; no request URL,
address, or raw response is logged. Successful source evidence remains exact.

The site-discovery UI gives explicit retry controls for failed parcel search,
failed observation, and partial roofline observation. Retrying an observation
clears prior confirmation and placement; late replies cannot restore it. An
outage is labelled as a City source outage, separate from missing or invalid
geometry. Manual entry stays available and partial rooflines remain unknown.

## Verification and remaining gaps

Offline route/contract tests replay the saved public ArcGIS envelope and normal
source bytes, including retry exhaustion, nonretryable 400, and evidence
retention. Frontend tests cover network classification and stale retry response.
The local demo browser completed address → parcel → one roofline → confirmation,
then a deliberately stopped local API cleared confirmation/placement and showed
retry/manual fallback; after restarting the API, retry returned one roofline.
This controlled outage verifies UI recovery, not the City's own availability.

**Remaining:** the cause and frequency of the City's intermittent 400 and
production quota behavior are unverified. #169 owns broader unfamiliar-address,
strata/boundary, human usability, and request-budget validation. This change
does not establish current parcel accuracy, roofline completeness, accepted
zoning data, or site fit. No regulatory data publication or deployment occurred.
