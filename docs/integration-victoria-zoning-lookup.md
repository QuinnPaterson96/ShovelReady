# Victoria zoning map observation contract

Issue [#236](https://github.com/QuinnPaterson96/ShovelReady/issues/236). This
backend slice returns an unreviewed, read-only zoning map observation for the
polygon of a parcel the user has selected. It does not publish an accepted rule,
validate a legal parcel, resolve amendments or overlays, or establish whether a
particular building is permitted. The compact builder UI has not been wired to it.

## Source check and decision

The [City zoning layer](https://maps.victoria.ca/server/rest/services/OpenData/OpenData_PlanningAndDevelopment/MapServer/12)
was checked on 2026-10-05. It reports polygon geometry in EPSG:3157, an
`OBJECTID` and `ZoningBylaw`, `Zoning`, `Title`, `URL` fields. A bounded distinct
query returned `ZB1980` and `ZB2018`. The City explains that both the
[Zoning Regulation Bylaw (No. 80-159)](https://www.victoria.ca/building-business/permits-development-construction/zoning/zoning-regulation-bylaw)
and [Zoning Bylaw 2018 (No. 18-072)](https://www.victoria.ca/building-business/permits-development-construction/zoning/zoning-regulation-bylaw-2018)
continue to apply in different parts of Victoria. The two code-to-name mappings
in this adapter are supported by the observed code values, source zone examples
and those City pages; no official machine-readable code dictionary or feature
revision date was found. Recheck if the City changes the codes or zone schedule.
Unknown `ZoningBylaw` values remain unmapped. The source `Zoning`, `Title` and
`URL` are retained verbatim as source fields, not reinterpreted as a current
legal clause or a trusted browser link. The [City Open Data Licence](https://opendata.victoria.ca/pages/open-data-licence)
and attribution follow the existing municipal observation contract.

The adapter uses a fixed City parcel layer and fixed zoning layer, a five second
upstream timeout, a 1 MB response cap, at most 23 features per response, and a
40,000 character request URL cap. Provider errors, truncation and unexpected
shapes return `unavailable`, without invented zone results. It queries zoning
with the selected parcel's actual Esri polygon after refetching it by object ID.
No service or database was added. A changed optional `expected_pid` or unsupported
parcel geometry returns `unsupported_geometry` with an issue.

Every zone with positive intersection area is retained; boundary-only contacts
are omitted. Union of all intersections determines coverage so overlapping
features cannot create coverage greater than the parcel area. The only coverage
tolerance is **0.000001 m²**, approximately a 1 mm square, for floating-point
area arithmetic. It does not remove a positive-area zone or change measured
values. A larger uncovered area is `partial_coverage`. The adapter does not
choose a largest zone. A City zoning geometry with exact repeated self-touch
vertices is decomposed by the existing lossless parser and flagged for review.
Other invalid geometries make the observation unavailable.

## Consumer contract

`POST /api/victoria-zoning/lookup` accepts:

```json
{
  "schema_version": "victoria-zoning.v1",
  "parcel_ref": {"source": "city-of-victoria-pid-parcels", "object_id": 87},
  "expected_pid": "001-328-107"
}
```

`expected_pid` is optional but recommended to detect a changed source identity.
`parcel_ref` comes from explicit parcel selection in `/api/municipal-sites/search`.
There is no address-centre or municipality default. The response is always a
versioned result with `status`, `parcel_ref`, `parcel_source_fields`,
`parcel_source_geometry`, `parcel_area_m2`,
`covered_area_m2`, `uncovered_area_m2`, `coverage_tolerance_m2`,
`horizontal_crs`, `zones`, `source_records`, `issues` and `note`. For example,
the essential fields in a fully covered single-zone response are:

```json
{
  "schema_version": "victoria-zoning.v1",
  "status": "single_covered_mapping",
  "horizontal_crs": "EPSG:3157",
  "parcel_area_m2": 100.0,
  "covered_area_m2": 100.0,
  "uncovered_area_m2": 0.0,
  "zones": [{
    "object_id": 4,
    "source_fields": {"OBJECTID": 4, "ZoningBylaw": "ZB2018", "Zoning": "GRD-1", "Title": "source zone title", "URL": "https://www.victoria.ca/media/file/example"},
    "source_geometry": {"rings": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]},
    "intersection_geometry": {"type": "Polygon", "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]},
    "intersection_area_m2": 100.0,
    "parcel_coverage_fraction": 1.0,
    "bylaw_name": "Zoning Bylaw 2018 (No. 18-072)",
    "bylaw_url": "https://www.victoria.ca/building-business/permits-development-construction/zoning/zoning-regulation-bylaw-2018",
    "mapping_status": "mapped"
  }],
  "source_records": [],
  "issues": []
}
```

That example abbreviates the response: actual `source_records` contain City
provider and record labels, query URLs, capture time, review status, licence,
attribution, response hash and a note that source revision/accuracy are unknown.
Actual geometry uses Victoria EPSG:3157 coordinates. Preserve the source records
and full source geometry in a technical evidence view; default copy should lead
with City of Victoria, zone label, capture date, review status and uncertainty.

The status values are `single_covered_mapping`, `split_zones`,
`partial_coverage`, `no_match`, `unsupported_geometry`, `unavailable` and
`unmapped_bylaw`. In `partial_coverage`, inspect every hit and the uncovered
area; an unknown code remains explicit per hit. `split_zones` retains all hits,
including different bylaws. `unavailable` has no invented successful fallback;
the parcel source record remains if its read succeeded. A source record is an
observation of the map at capture time, not a known legal revision.

## Verification and remaining work

The five HTTP-level synthetic ArcGIS replay tests calculate expected areas from
10 m squares and cover full, split, partial, boundary touch, unknown bylaw,
timeout, unsupported geometry and malformed input. The bounded live lookup of
the existing test parcel on 2026-10-05 returned one `ZB2018` source hit and
642.0220911965724 m² covered, with an exact self-touch decomposition review
issue. This confirms transport and parsing for that observation only. It does
not validate current legal applicability or boundaries independently.

- **Demo usability:** The compact builder UI does not consume this contract.
  Its owner should present these statuses and readable provenance in project
  settings, without turning an unresolved result into a selected rule.
- **Accepted real evaluation:** A planning/source reviewer must confirm the
  bylaw code mapping, parcel identity, current amendments, overlays and
  site-specific interpretation before accepted rule publication. This API
  cannot satisfy that review by itself.
- **User validation:** A user should check whether the status, coverage and
  provenance wording communicates uncertainty before this is relied on in
  a screening journey.
