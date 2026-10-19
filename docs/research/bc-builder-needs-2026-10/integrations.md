# Integration feasibility: verified access versus a useful answer

Inspected October 16, 2026. These are source/API investigations, not deployed adapters or reusable legal conclusions. Practitioner need is in [S01–S17](evidence.md); none directly requested these APIs. Recommendations below are inferences. Existing BC geocoding and Victoria parcel/roofline discovery should be reused, not repurchased.

## 1. Victoria sewer observations: plausible narrow follow-up

**Need:** site-service uncertainty affects assessment and cost (S01/S02/S09/S10). **Proposed minimum:** an attributed record pointer or sewer-lateral observation to prepare a professional question; no connection/capacity pass.

**Official access inspected:** the [City open-data directory](https://maps.victoria.ca/server/rest/services/OpenData?f=pjson) lists Sewer, StormDrain and Water MapServers. Read-only metadata shows JSON/GeoJSON/PBF query support and 2,000-record response limits. Specific layers inspected include [Sewer Lateral Line, layer 12](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Sewer/MapServer/12?f=pjson), [Storm Drain Gravity Mains, layer 10](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_StormDrain/MapServer/10?f=pjson), and [Water Lateral Lines, layer 12](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Water/MapServer/12?f=pjson). A query with `where=1=0`, no geometry and OBJECTID only returned an empty feature array without error on each. This verifies the query boundary, not correct property joins or real-record completeness. No customer/property record was retrieved.

**Rights:** the exact [Sewer Lateral Lines catalogue item](https://www.arcgis.com/sharing/rest/content/items/d7e4656dac7f4aaab60ecc11fb9650a7?f=json), owned by CityOfVictoriaBC, links the [City Open Data Licence](https://opendata.victoria.ca/pages/open-data-licence). Its full text was read through the public [Hub Page data](https://www.arcgis.com/sharing/rest/content/items/60eb753ce52d432484c7403d968c530e/data?f=json), because the page shell did not expose text to the web reader. The licence permits commercial reuse with attribution; it excludes personal information and unlicensed third-party rights, disclaims warranty and prohibits implying endorsement. Exact membership/rights for the other two candidate layers remain to be checked before reuse. A blank REST copyright field is not a licence.

**Geography/cost/freshness:** City of Victoria service scope, not CRD-wide coverage. Metadata/query access required no login or fee in this check; no production SLA, guaranteed quota or support price was established. The [portal](https://opendata.victoria.ca/) explicitly warns that its displayed last-updated date reflects schema/description changes, while automatic data refresh does not trigger that date. Capture time must not be represented as survey or observation age. A precise feature-refresh cadence is unknown.

**Burden and limits:** spatial identity/CRS joins, request bounds, pagination/truncation, source capture, outage fallback and currency checks require implementation and maintenance. Nearby infrastructure does not establish private routing, invert/depth, condition, capacity, connection permission or civil-work price. Do Experiment 3 before building an adapter; begin with a link/manual record if sufficient.

## 2. Tree evidence: do not use a replacement-tree layer as a clearance check

**Need:** tree constraints can change design/siting (S09/S10; neighbourhood concerns in S16). **Proposed minimum:** an explicit question about trees and an arborist/municipal record-review next action.

**Official access inspected:** [Environment MapServer](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Environment/MapServer) exposes [Protected Replacement Tree, layer 6](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Environment/MapServer/6?f=pjson). Its fields include replacement status, species/date planted, property address and tree location. Status values include pending replacement, new tree planted, inspection complete and cash in lieu. These describe replacement obligations/records, not all trees or surveyed root-protection zones. An empty-result query succeeded; no property records were retrieved.

**Rights:** the exact [City-owned catalogue item](https://www.arcgis.com/sharing/rest/content/items/2075ad400dd0411dbbda595b9341961e?f=json) links the same City licence. Commercial reuse is therefore evidenced for this item, subject to its exclusions and attribution. Avoid exposing personal information; a licence does not override that exclusion.

**Geography/cost/freshness/burden:** Victoria-only service extent; anonymous metadata/query access worked without charge. Coverage completeness, actual observation age, service commitments and suitable private-tree inventory were not established. Displaying this layer alone risks false reassurance even if its API is inexpensive. Research a suitable inventory only after a practitioner needs it; until then ask for supplied evidence and professional review. Do not derive a tree-clear site from an empty response.

## 3. Title/survey and electrical services: link to the established process first

**Need:** property rights, control, financing and service preparation appear in S03/S17 and S01/S02. These are useful prerequisites but not necessarily first-contact requirements.

The official [LTSA ParcelMap BC overview](https://ltsa.ca/products-services/parcelmap-bc/) distinguishes mapped parcel representation from authoritative legal boundaries/registry records. Its [attribution/help](https://help.ltsa.ca/parcelmap-bc/maps/attribution) also cautions against treating search display as authoritative. Do not treat a parcel polygon or free public viewer as a title/covenant API. The [April 1, 2026 customer fee listing](https://ltsa.ca/fees/) lists a title search at CAD $11.06 and a document/plan order at $17.78; this does not price complete due diligence, professional interpretation or all account/intermediary costs. No order, account creation or payment occurred. Automated title retrieval, account/contract eligibility, caching/redistribution rights and freshness guarantees were not established. Recommended next step: ask whether the owner has title/survey evidence and identify who will review it; defer paid integration.

[BC Hydro's official connection-request guidance](https://app.bchydro.com/accounts-billing/electrical-connections/connection-requests.html?fixZoomMobile=true) tells applicants to involve an electrician/consultant/developer and distinguish express from design connections. Requests/documents are managed through MyHydro. Its [connection-charge explanation](https://app.bchydro.com/accounts-billing/electrical-connections/connection-requests/express/fees-charges.html) distinguishes standard connections from extensions with additional fees. This supports an assessment/referral link, not an automated capacity/price answer. No public reusable parcel-capacity API or production redistribution licence was verified. Confirm the service territory for the actual site. Terms, capacity and project charges remain case-specific; do not scrape authenticated workflows or use outdated public anecdotes as a fee schedule.

## Existing geocoder: retain, do not count as a new opportunity

The [official March 24, 2026 overview](https://www2.gov.bc.ca/gov/content/data/geographic-data-services/location-services/geocoder) describes BC address standardization and an access-request route for government and non-government organizations. The [official developer guide](https://github.com/bcgov/api-specs/blob/master/geocoder/geocoder-developer-guide.md) describes public/gated access and sandbox keys capped at 1,000 requests/minute. That sandbox limit is not a commercial production entitlement or SLA. This research did not revalidate all current licensing, caching and production cost terms; the existing application's integration is not proof of those terms. Address coordinates do not determine jurisdictional rule coverage, parcel ownership or a surveyed boundary. No replacement commercial geocoder is justified by this sample.

## Named services actually mentioned versus researcher additions

| Service | Evidence status | Decision |
|---|---|---|
| Buildxact takeoff/budget/client portal | Explicitly described in S07; use documented, price/API terms not investigated | Evidence of an existing solution; no replacement or connector yet |
| Local crane/site trades; manufacturer/local coordinator | Explicit in S02/S11/S12 | Ask responsibility/next-evidence questions; no supplier marketplace |
| Credit-union relationship / lender referrals | Explicit but historical in S03; referral offer S02 | Preserve finance as a question; no underwriting or current loan recommendation |
| Municipal utility/tree APIs, LTSA record path, BC Hydro guidance | Researcher's matches to demonstrated problems, not practitioner API requests | Use links/manual evidence first; narrow API investigation only after Experiment 3 |

All integration effort estimates remain qualitative. No measured uptime, benchmark, paid contract, complete source audit, property inspection or professional acceptance was performed.
