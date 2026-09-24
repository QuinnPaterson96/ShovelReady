# Acquisition, rights and data inspection

Reviewed September 24, 2026 by the Codex agent. This is a source-access audit; neither geometric accuracy nor legal interpretation has been professionally reviewed. `source-manifest.json` identifies the precise bytes underlying every retained sample. Capture timestamps are observations, not effective dates.

## Verified reuse chain

The three official ArcGIS catalogue records below identify the exact service/layer URL and explicitly link to the City's open-data licence in `licenseInfo`. Blank service `copyrightText` alone was **not** used as permission.

| Source IDs | Official catalogue item | Explicitly licensed layer |
|---|---|---|
| `zoning-catalogue`, `zoning-metadata` | [84dde8f57dd7428f8a34d67f13c55051](https://www.arcgis.com/sharing/rest/content/items/84dde8f57dd7428f8a34d67f13c55051?f=pjson) | [PlanningAndDevelopment/MapServer/12](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_PlanningAndDevelopment/MapServer/12) |
| `parcels-catalogue`, `parcels-metadata` | [901cb49452d14dd2855fa701311f0545](https://www.arcgis.com/sharing/rest/content/items/901cb49452d14dd2855fa701311f0545?f=pjson) | [Land/MapServer/11](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/11) |
| `rooflines-catalogue`, `rooflines-metadata` | [dc37de452a614b599dd9c9ff473739d3](https://www.arcgis.com/sharing/rest/content/items/dc37de452a614b599dd9c9ff473739d3?f=pjson) | [Land/MapServer/1](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/1) |

The [Open Data Licence](https://opendata.victoria.ca/pages/open-data-licence) is version 1 for the City of Victoria, based on BC's version 2.0. Its actual content was obtained through the portal's linked [ArcGIS page data](https://www.arcgis.com/sharing/rest/content/items/60eb753ce52d432484c7403d968c530e/data?f=json), captured as `open-data-licence`. It grants copying, adaptation, publication, distribution and commercial use subject to attribution. It excludes personal information, inaccessible records, unlicensed third-party rights, official marks and other specified IP rights. It disallows implied endorsement and supplies information without warranty. No additional attribution statement was found in the three catalogue records.

Apply this attribution to the retained data and downstream displays/exports:

> Contains information licensed under the Open Government Licence - City of Victoria.

Link to the licence where possible. Preserve the provider, layer/source URL and capture/revision identifiers. No logos, imagery, owner/occupant names or contact data are included in the retained fixture responses. Parcel identifiers and legal parcel descriptors locate land; they are not associated here with individuals. A later acquisition of personal information or third-party material requires separate handling; this audit does not authorize it.

## Withheld material

| Material | Terms evidence / decision |
|---|---|
| Municipal bylaw PDFs, general zoning page | [City legal disclaimer](https://www.victoria.ca/legal-disclaimer), captured as `city-terms`, restricts redistribution without written permission. No source-specific overriding grant verified. Retrieved locally for research; URLs, hashes and our inspection notes committed, source bytes/full text withheld. Do not assume open GIS terms cover these PDFs. |
| Manufacturer page/drawings/photos | The manufacturer page carries copyright; no redistribution grant established. Local HTML and two linked plan/elevation PNGs retained; factual observations and missing-input questions recorded. No complete controlled drawing set acquired. |
| Portal licence-page raw bytes | Kept locally as permission evidence; licence URL, hash, version and a summary are recorded. Full page is not bundled. |
| Full GIS service-root metadata | Locally retained as `planninganddevelopment-service` and `land-service` for ArcGIS version/units. Contains listings for unrelated datasets; only the selected licensed layer metadata is redistributed. |

The PDFs are actual successful acquisitions, not search-result substitutes. This repository nevertheless cannot independently reproduce their original contents if the URLs change: hashes identify bytes but do not preserve them. A source-specific permission decision and authorized durable storage are concrete SR-05 blockers. Questions for the City, **not sent**: may we archive/share these exact consolidations and amendments, include exact clauses in a public fixture repository and protected commercial prototype, and what attribution/conditions apply? Which certified consolidation and subsequent amendments establish currency on the evaluation date?

## Actual schema and coordinate observations

Both captured service roots report ArcGIS `currentVersion=11.3`, `units=esriMeters`, and WKID/latestWKID **3157**. The retained layer extents and sample feature responses use WKID 3157; no WGS84 conversion or invented longitude/latitude has been applied. Query parameters explicitly preserve this CRS. ArcGIS server software version is not a dataset release.

The following field names are taken from the saved layer metadata, with original capitalization:

| Layer | Actual fields |
|---|---|
| Zoning | `OBJECTID`, `Shape`, `Shape_Length`, `Shape_Area`, `ZoningBylaw`, `Zoning`, `Title`, `URL` |
| PID parcels | `OBJECTID`, `Shape`, `VicPID`, `Name`, `Parcel`, `Lot`, `Block`, `PlanNumber`, `PID`, `LTSA_Number`, `ParcelStatus`, `City`, `GISLINK`, `ParcelType`, `PrimarySurveyParcel`, `ByLaw`, `CityEquity`, `Shape_Length`, `Shape_Area` |
| Buildings / rooflines | `OBJECTID`, `SHAPE`, `SHAPE_Length`, `SHAPE_Area`, `LAYER` |

No advertised `max_height`, regulatory floor area, principal-building flag, rear-yard boundary, lot-line category or reviewed-placement field exists in these schemas. Parcel `ByLaw` is null in the three samples; it is not a substitute for the zoning layer's `ZoningBylaw`. `Shape_Area` is GIS geometry area, not a reviewed legal lot-area determination. Coordinate lengths are metres; derived planar area has square-metre dimensions. Any use as a regulatory denominator requires review of the legal Lot definition and survey.

Roofline metadata reports `hasZ=true`, and the captured responses contain XYZ vertices. The vertical datum, units and positional accuracy of Z were not established from the inspected metadata. Neither roof Z nor a polygon's area establishes roof height above grade, slope, wall footprint or principal-building identity. No slope is derived from the parcel's 2D polygon.

## Currency and quality evidence, independently of licensing

- Zoning catalogue says Planning maintains the data and copies it to VicMap/Open Data daily. PID parcel catalogue also says daily copying. Both explain that portal modification timestamps describe schema/description changes and are not data freshness timestamps. This is provider-described cadence, not a measured delivery SLA or proof that all amendments were applied.
- Roofline catalogue identifies May 28, 2025 imagery and describes usual acquisition every two years, stereoscopic digitization and correction for building lean. It supplies no numeric positional-accuracy guarantee in the inspected record. Site 59 contains one feature labelled `Residential_2023` alongside `Residential`; therefore the layer-wide imagery date cannot be assigned blindly to each building's geometry.
- PID catalogue warns that strata lots can overlap the parent parcel. These three records are `ParcelType=LA` and `ParcelStatus=ACTIVE`; that does not verify title, easements or regulatory site assembly.
- Each of the three polygon-intersection zoning requests returns one designation. An intersecting feature is not proof of full parcel coverage, absence of all overlays or correct legal instrument selection. No exhaustive overlay query, topological coverage certification or survey comparison was performed.
- Feature IDs are snapshot locators, not promised permanent identities. Preserve PID/VicPID, layer URL, capture hash and geometry together; re-resolve rather than silently trusting OBJECTID after a service rebuild.

Neither public accessibility, an open licence nor successful JSON parsing establishes accuracy, completeness or legal applicability.
