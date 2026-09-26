# Occupied Victoria lots: bounded geometry research packet

Captured 2026-09-26, 22:51:32–22:51:59 UTC. Status: **unreviewed public GIS observations for approximate scouting**. This packet does not establish current occupancy, a principal dwelling, legal development rights, a survey boundary, or a fit result. Rough geometric observations can support an exploratory backyard screen while those facts remain unresolved.

## What was captured

[`manifest.json`](manifest.json) indexes 16 test cases: 13 new bounded captures plus the three existing leads VIC-059, VIC-080 and VIC-086 referenced directly from `docs/pilot-inputs`. The existing leads already have parcel, zoning and roofline snapshots; the pilot source manifest remains their canonical byte record. The new capture retains 76 request records backed by 62 distinct hash-named JSON objects. Each request has its exact URL, redirect target, UTC capture time, byte count, SHA-256, HTTP headers and licensed repository path. Distinct requests can have identical bytes. Every new feature response is in **EPSG:3157 XY metres**. The raw roofline Z values are retained but have unknown vertical datum and cannot support height checks.

Run from the repository root:

```powershell
python -m uv run --locked python scripts/acquire_occupied_lots.py verify
# Deliberate new live capture, replacing the manifest and adding new hash objects:
python -m uv run --locked python scripts/acquire_occupied_lots.py capture
```

`verify` needs no network. `capture` uses only bounded City and ArcGIS item URLs; it does not fetch a provincial dataset or run in the application. New captures will have new bytes/times and need their own review. The exact request URLs in the manifest replay individual responses. The query code and selection predicate reproduce the packet's sampling method; changes in the live service can yield a different sample. This packet is portable with `docs/pilot-inputs/snapshots` for the three referenced leads.

## Layers, meaning and rights

| Layer | Source and relevant fields | What it means here |
|---|---|---|
| PID parcels | [City Land MapServer layer 11](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/11); `OBJECTID`, `PID`, `VicPID`, `ParcelType`, `ParcelStatus`, `PrimarySurveyParcel`, `Shape_Area` | PID based cadastral representation; `LA` means the City's “Land” parcel type. The catalogue warns that strata lots can overlap parent parcels. `ACTIVE` and `LA` do not prove title, survey accuracy or a buildable legal lot. |
| Buildings / rooflines | [City Land MapServer layer 1](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/1); `OBJECTID`, `LAYER`, `SHAPE_Area`, `HasZ` | The [City catalogue item](https://www.arcgis.com/sharing/rest/content/items/dc37de452a614b599dd9c9ff473739d3) calls these **Building Rooflines** digitized stereoscopically from aerial imagery. It says the 2025 capture used imagery flown May 28, 2025. A roofline is not a wall footprint; `Residential` is a feature label, not proof of occupied dwelling count or principal-building role. Z has no verified usable height basis. |
| Address points | [City Land MapServer layer 0](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Land/MapServer/0); `FullAddress`, `GISLINK`, `OBJECTID` | Points intersecting the parcel query geometry. One point is not a verified one-to-one address or title join. Several parcels have multiple points. No owner fields were requested. Source age/positional accuracy were not supplied in layer metadata. |
| Zoning | [City Planning MapServer layer 12](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_PlanningAndDevelopment/MapServer/12); `Zoning`, `ZoningBylaw`, `Title`, `OBJECTID` | Spatial intersections and labels only. The catalogue says Planning maintains this layer and copies it daily; the portal “Last Updated” date is **not** a feature currency date. Geometry alone does not establish legal applicability or complete overlay coverage. |

The packet retains current layer metadata and the three available ArcGIS catalogue items. Those items link the [Open Government Licence – City of Victoria](https://opendata.victoria.ca/pages/open-data-licence); attribution is embedded in the manifest. The new address layer has no separately identified catalogue item in this packet, so its lineage is its City MapServer metadata and query URLs. Neither the catalogues nor metadata state numerical positional accuracy for these selected features. Parcel and zoning source feature update times are unknown. The catalogue “modified” fields are portal/schema or description dates, not observation dates. Existing pilot source metadata and licensed bytes are retained unchanged.

## Selection and coverage audit

Discovery is limited to parcel OBJECTID **87–150** with `ParcelType='LA'`, `ParcelStatus='ACTIVE'`, provider `Shape_Area` strictly between 500 and 900 m². The area window is a convenience to obtain ordinary sized test geometry, **not an eligibility threshold**. Discovery uses `returnIdsOnly=true`; all 64 possible IDs are within a bounded window and the returned ID list is saved. In ascending OBJECTID order, capture one parcel and its intersecting building, zoning and address features. Include the first 13 parcels with at least one `Residential` labelled building polygon and a `GRD-1` zoning intersection. Add the three prior leads by reference. All candidate decisions through OBJECTID 109 are in `candidate_audit`; later discovered IDs were not queried after the target was met. This is a convenience sample concentrated in nearby geography, not a representative population or confirmed residential occupancy.

No observed query set `exceededTransferLimit`; responses had at most 11 address points versus the layer metadata's 2,000 record default limit. Integrity replay confirms 13 new parcel records, 24 intersecting roofline features, 17 zoning features and 37 address points. These are **query intersections**, not uniquely assigned buildings or resolved addresses. Several rooflines intersect adjacent parcels; their full area is not attributable to this parcel. Four new cases have two zoning features, and four have more than two address points. A single `GRD-1` intersection does not resolve those combinations. Missing or ambiguous joins remain unknown.

The existing importer’s `xy_polygon` routine assessed all 13 new parcel polygons and 24 rooflines as usable XY geometry. Thirteen responses share zoning feature OBJECTID 3, whose exact self-touch decomposition is tagged `exact_self_touch_decomposed_requires_review` by that importer; this is **not** independent zoning validation. Raw rings are unmodified. No snapping, invalid-geometry repair, parcel assembly or feature ownership inference is performed in this packet. Transfer-limit, malformed-response and missing-geometry conditions fail capture rather than becoming empty findings.

## Three proposed placement exercises

The [`map-sanity.png`](map-sanity.png) visualizes raw XY parcel outlines (green), intersecting rooflines (gray), address points (red) and zoning outlines (orange). It was inspected at parcel scale. Orange lines can pass through or beside a parcel; they are not a legal boundary adjudication. The image is a visual check, not a measurement source.

| Case | Geometric reason for selection | Unknown to resolve before any comparison |
|---|---|---|
| VIC-087 | One parcel polygon, one 195 m² roofline polygon and one address point. Simple single-building shape for a first placement sketch. | Wall footprint, principal role, street/rear orientation and actual usable yard. |
| VIC-090 | Three intersecting rooflines, including one with only about 2 m² of overlap with the parcel; one address point. Tests partial building overlap and role ambiguity. | Which rooflines belong to the site, building use and wall edges. |
| VIC-093 | Two intersecting building polygons, two address points and two zoning feature intersections. Tests multi-source ambiguity without forcing a fit label. | Address linkage, zoning coverage/applicability, principal role and legal rear yard. |

These are **geometric test cases**, with no actual fit or no-fit label. Any later sketch should distinguish observable parcel/roofline spacing, comparisons under named assumptions and supported legal checks. A negative supplied placement says only that that placement fails its stated assumptions. Survey and legal review may be needed for later decisions, but are not blanket prerequisites to showing approximate spatial observations.

## Minimal adapter sketch for a future UI

Read the manifest and referenced hash-verified Esri responses offline. For each case return a versioned observation object containing `case_id`, source receipt IDs/URLs/dates/licence, `horizontal_crs: EPSG:3157`, raw parcel rings, an array of intersecting roofline rings with each source `OBJECTID` and `LAYER`, address-point observations, zoning intersections, and unresolved flags. Use the existing `app.spatial.geometry.xy_polygon` logic for XY topology/validation, and carry its issue status; do not silently repair geometry. Render metric XY in a local coordinate frame or perform an **explicit** EPSG:3157 transform for a web map. Do not label raw XY coordinates GeoJSON WGS84. Expose feature relationships as intersections until verified joins and roles are supplied. No runtime networking or active spatial import is part of this packet.

## Remaining gaps and next actions

- **Demo usability:** no mounted UI consumes these observations. #139 can adapt the packet and display the three exercise cases with sources and uncertainty. Approximate geometry is already available offline.
- **Geometry/assumptions:** rooflines can differ from walls, and parcel lines, orientation, addresses, building roles and current occupancy are unverified. #137 should keep exploratory measurements separate from any supplied assumptions; a site reviewer or homeowner must supply missing facts for stronger comparisons.
- **Legal checks:** zoning intersections and labels do not identify a complete, current applicable rule pathway. #138 owns source review. Accepted legal evaluation and publication remain separate decisions.
- **Coverage/user validation:** the 16 selected cases are not a representative accuracy sample, and no homeowner has validated the screen. A later targeted field/user review should measure misleading candidates, false exclusions and verification time before using this for customer decisions.
