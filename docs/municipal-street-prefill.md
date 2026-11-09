# Editable municipal street edges

A homeowner who selects a mapped Victoria or Saanich property can start with the streets already marked. The map names the suggested roads and lanes. In **Mark street edges**, click a line or use **Mark without the map** to remove or add any edge. Consecutive suggested segments along a named street can also be toggled together. **Not sure** clears the selection. The placement and enquiry use the current selection.

## Sources and interpretation

| Capability | City of Victoria | District of Saanich |
|---|---|---|
| Find a parcel and mapped buildings | Existing City address/parcel join and observed rooflines | Exact address or PID on the District parcel record, followed by a bounded building intersection query. Multiple matches remain separate choices. |
| Suggest street-facing segments | Named street or lane alongside an exposed block edge, corroborated with the road-area polygon | Named street centreline alongside the parcel. An intervening mapped parcel blocks the suggestion. Private/access-only or otherwise unsupported classes can leave a side unresolved. |
| Interpret local rules | Existing preliminary Victoria rule subset | Physical map and placement only. Local zoning comparisons require their own implementation and review. |

The coverage profile chooses the parcel and street source independently of rule availability. The server preserves the provider, source link, record IDs, capture time, licence and exact query evidence. The report records the map source and any visitor edits. Suppressing site details in an email suppresses its street names too. [Victoria Streets](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Transportation/MapServer/25) · [Victoria Road Polygons](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Transportation/MapServer/2) · [District of Saanich Data Catalogue](https://www.saanich.ca/EN/main/local-government/data-catalogue-1.html)

## Matching and extension

`POST /api/municipal-sites/street-edges` takes the existing municipal observation request, including the parcel source, object ID and optional expected PID. The client applies the result only if the returned parcel reference and ordered polygon coordinates match the selection. Editing, clearing, switching the parcel, or switching municipality takes precedence over an outstanding lookup. A source failure leaves the editor usable. The technical record distinguishes unavailability, no clear match, partially resolved sides and a suggested set.

For each eligible exterior segment, three outward probes check for a nearby named centreline running along the boundary. The maximum reach is 22 m and the angular tolerance is 35 degrees. Three compatible hits are needed to suggest the whole segment. Victoria also checks block alignment and samples 1 m outside the parcel against mapped road areas. Its small attribute queries avoid fetching the citywide road geometry. Saanich checks the intervening space against neighbouring parcel polygons. These metre-based heuristics support a correctable preliminary scenario. A suggested set treats other sides as ordinary for exploration. It does not establish legal frontage, road width, access or a provincial coverage standard.

For another municipality, register its licensed layers, coordinate handling, names and street classes in [municipal sources](../app/municipal_sites/sources.py), and add the matching [coverage profile](../frontend/src/municipality_coverage/model.ts). Supply a parcel discovery adapter when its address or geometry contract differs. The matching code and editor can then be exercised on local reference parcels before enabling their suggestions. [Waterfront prefill](municipal-waterfront-prefill.md) uses this shared parcel selection, geometry revision and evidence handling with its own observations and tests for water contact.

## Verification and remaining work

November 6, 2026. Live queries found Cecelia Rd on the saved demo, May St and Lane 229-2 on opposite sides, and Spring Rd and Queens Ave on adjoining sides. In Saanich they found Kingsley St, Cedar Hill Rd and three named road sides on the Gorge Rd W example. Kingsley and Cedar Hill parcel lookup also returned mapped buildings. A live browser run selected Kingsley and May, checked the suggested names and removed a mark on each.

The repeatable [browser journey](../frontend/tools/placement_demo_browser.mjs) uses captured municipal responses. It checks a late reply after a Victoria edit, Saanich prefill and correction, clearing and report provenance. The [HTTP geometry case](../tests/test_municipal_street_edges.py) tests an intervening lot, a private drive, a changed PID and a truncated source independently of the live parcels. The implementation does not contact a database.

Mapped parcel identity and positional accuracy remain unreviewed. Multipart parcels, complex outlines beyond the bounded lookup and ambiguous matches may require manual marking. The next product/data task is an independently labelled sample in each city to measure wrong and missed marks, homeowner corrections and lookup latency. Saanich legal rule coverage remains separate work.
