# Bounded scouting sites API

This packet supports a homeowner supplied-placement exploration of three retained City of Victoria parcels: VIC-087, VIC-090 and VIC-093. It is a preliminary geometry observation, not a zoning screening result, legal lot assessment or permit conclusion. The City data is licensed under the [Open Government Licence – City of Victoria](https://opendata.victoria.ca/pages/open-data-licence).

## Immutable packet

`python -m uv run --locked python -m scripts.build_scouting_sites` explicitly builds `app/scouting_sites/data/` from `docs/research/occupied-lots/manifest.json` and its saved snapshots. The command verifies each source byte count and SHA-256 before copying six raw parcel/roofline responses. `sources.json` retains each digest, capture timestamp, exact resolved URL, attribution and licence. `sites.json` contains the derived EPSG:3157 polygons and any conversion issue in `capture.limitations`. Conversion uses the existing XY converter and does not silently repair geometry. The application reads only this packaged directory; it does not fetch City data or read checkout research paths at runtime.

The packet deliberately includes parcel-intersecting mapped rooflines only. They are not walls, principal-building roles or an exhaustive obstruction inventory. Neither addresses nor zoning records have been validated as legal site identity or applicable rules. VIC-093 has multiple address points and zoning intersections in the research capture; this API does not resolve those ambiguities. No named legal boundaries or automatic rule thresholds are provided.

## Interface

`GET /api/scouting-sites` returns `scouting-sites.v1` with three cases. Each case has a stable `case_id`, a plain parcel label, and a `site` containing `projected_metre_crs`, `parcel`, `buildings`, `named_boundaries` and `capture`. Feature/source structures match `app.scouting_geometry.payloads`. `source.reference` retains the exact captured City URL. `capture.completeness` is `partial` for every case.

`POST /api/scouting-geometry/assess` takes the existing `scouting-geometry.v1` request: copy a case's `site`, add `schema_version`, an explicit `placement` (centre in EPSG:3157 metres, width/depth in metres and rotation in degrees) and optional `requirements`. It returns the existing `Assessment` with the request, footprint, independent observations and limitations. The route performs no writes or placement search. It caps request bytes at 200 kB, structure at 10,000 nodes, numeric values at 4,000 and each feature/requirement collection at 50. Malformed JSON and schema violations return 422; size/complexity violations return 413.

Representative VIC-087 request placement: `{"id":"example","centre_xy":[473714.5708999997,5362219.7984],"width_m":2,"depth_m":3,"angle_degrees":0}`. With the VIC-087 site, the response contains `schema_version: scouting-geometry.v1`, `conclusion: tested_placement_observations_only`, and a containment check of `status: observed`, `relation: outside`, `area_m2: 6.0`. It also reports roofline overlap and distances as observations. This deliberately outside example verifies geometry arithmetic; it is not a proposed placement.

## Verification and remaining work

The focused connected test checks retained bytes against the packaged hashes, fetches each real site through HTTP, submits an independently specified 2 × 3 m outside placement, validates the serialized assessment and confirms recovery after malformed/oversized requests. This is software verification only. Source accuracy, site identity, legal interpretation, supplier dimensions, user validation and accepted publication remain open. The frontend integration and combined browser check belong to #146 and #147; current packet publication into an accepted data release needs a separate review and decision.
