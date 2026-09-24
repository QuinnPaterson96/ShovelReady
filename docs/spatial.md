# SR-09 bounded spatial import

Implemented September 24, 2026. This imports the licensed Victoria packet as
unreviewed spatial observations and computes query-scoped XY intersections. It
does not create a legal site, select a principal building, evaluate fit, publish
data, resolve addresses or search for placements. Issue #9 remains open for its
remaining reviewed-input and address-join criteria.

## Interface and immutable storage

```powershell
python -m uv sync --locked
# Verify and prepare only; optional full unreviewed payload output:
python -m uv run --locked python -m app.spatial --output spatial-import.json
# Explicit project database configuration required; migration is a separate action:
python -m uv run --locked python -m app.persistence.migrate
python -m uv run --locked python -m app.spatial --import-records
```

The two database commands require `SHOVELREADY_DATABASE_URL`. The importer never
runs DDL or publishes data. Local verification uses only the disposable cluster
runner below; do not point that runner at an existing server. The output file is
optional and not needed for database import.

`app.spatial.importer.prepare(root)` returns `(SourceSnapshot tuple, SpatialImport)`.
`import_pilot(repository, root)` prepares and atomically imports all records, then
returns the spatial payload. The default root is `docs/pilot-inputs`; alternate
roots must contain the same bounded packet structure and hash-identified objects.
Source parsing accepts only strict JSON, after verifying each licensed object's
SHA-256 and byte count. Parsing uses the verified byte buffer. Paths must remain
inside the supplied root; objects are limited to 20 MB and responses to 1,000
features. Restricted artifacts remain blocked and are never read. Mismatched
metadata, schema, CRS, IDs, failed/truncated responses and integrity errors abort
before writing. Missing/unusable geometry within a valid response is retained.

Layer URL, captured metadata ID, geometry type, CRS, OID field, full attribute
field set, dimension flags and catalogue URL are checked before mapping. These
checks use the September 24 retained captures, not a claim of live service currency.
Both metadata/catalogue snapshots and request-specific snapshots are referenced.
Every raw Esri response is preserved, including all features, IDs, attributes,
nulls, XYZ vertices, rings and response metadata. The exact original bytes remain
at their hash-identified artifact; JSON storage does not preserve whitespace or
numeric lexical formatting. Attribution travels with each observation:

> Contains information licensed under the Open Government Licence - City of Victoria.

[City licence](https://opendata.victoria.ca/pages/open-data-licence).

New `sr-09.v1` payload `SpatialImport` is stored as repository kind `spatial`.
Its logical ID identifies this bounded capture collection, **not a permanent
parcel or feature**. Its revision ID hashes the complete versioned payload apart
from identity, including sources, raw observations, algorithm, runtime, transform
and derived results. Feature locators are `(snapshot_id, feature_index)`, with the
original OBJECTID retained in attributes. No identity is inferred from OBJECTID
alone. Repeated identical imports are no-ops; changed captures/processing produce
new immutable revisions under the collection identity. `history("spatial", logical_id)`
does not nominate a current revision. A conflict or missing reference rolls back
the entire batch. Geometry assessments are computations, never attributed reviews.

Migration `0003` only expands the `records_kind` check constraint. Existing rows,
reference FKs and immutability triggers remain unchanged; no earlier migration is
rewritten. The new reader accepts `sr-09.v1` and rejects future versions. Existing
SR-04 and SR-08 readers/payloads are unchanged. Old application binaries can read
their old kinds after migration but cannot deserialize the new `spatial` kind;
do not route new records to an old reader. Recovery is a forward fix or restoration
to a separate database, not destructive downgrade. There is still no active release
pointer. `DatasetReference.spatial_snapshot_ids` retains its existing source-snapshot
meaning; this change does not silently point it at spatial import revision IDs.

## Geometry decisions and limitations

Shapely/GEOS performs polygon construction, validity, intersection, union and
difference. pyproj/PROJ performs the explicit coordinate transform. This is the
simpler alternative to PostGIS for nine bounded responses computed in an explicit
Python batch. PostgreSQL continues to store immutable JSONB. There is no spatial
index or database geometry operator. Reconsider PostGIS when querying larger
collections or measuring a concrete need for database-side spatial operations.

All area/overlay operations use XY in EPSG:3157 (NAD83(CSRS) / UTM zone 10N), in
square metres. Derived geographic geometry uses EPSG:4617 (NAD83(CSRS)), explicitly
longitude/latitude order. This is an inverse projection within the same datum,
not an approximate conversion to WGS84. The payload records both WKT definitions,
the PROJ pipeline, library versions and axis handling. Network grid downloading
and ballpark transforms are disabled. Z remains verbatim in raw roofline geometry;
derived geometry is explicitly XY. No vertical datum/unit conversion or regulatory
height inference occurs. Geographic XY must not be labelled EPSG:4326 by a client.

Rings use even-odd containment: disjoint shells, holes and nested islands survive;
ring order/winding does not discard components. Exact repeated-XY self-touches
are decomposed into loops using only existing vertices/edges, then validated and
assembled by containment. This is explicitly marked
`exact_self_touch_decomposed_requires_review`. It is needed for the **observed**
22-ring zoning response used by sites 80 and 86: ring 6 has four repeated vertices,
and decomposes into five valid loops. Its derived polygon has the provider area
within 0.001 m². Raw geometry is unchanged. Crossings, duplicate rings, overlapping
rings, degenerate loops and other invalid topology are not repaired or snapped.
No `buffer(0)` or `make_valid` operation is used.

See [Esri geometry semantics](https://developers.arcgis.com/rest/services-reference/enterprise/geometry-objects/),
[Shapely operations](https://shapely.readthedocs.io/en/stable/manual.html), and
[pyproj transforms](https://pyproj4.github.io/pyproj/stable/api/transformer.html).

All nonempty parcel/zoning intersections are retained, including geometry and
exact source-feature locator. Positive areas at or below 0.01 m² are labelled
`sliver`; larger areas are `material`; line/point contacts are `boundary_touch`.
This threshold is a reporting policy, not legal tolerance or positional accuracy.
Nothing is dropped. Split/overlapping zones, slivers, uncovered query area,
irregular/multipart parcels and unknown/non-LA/inactive parcel types are investigation
flags. The union of usable intersections measures uncovered area; summed overlaps
are reported separately. If parcel geometry is absent or any zoning geometry is
unusable, coverage/overlap measurements are null, not zero. Available intersections
remain visible. An empty parcel response receives an explicit investigation entry
with no feature index; multiple parcel features stay separate, never assembled.

No centroid assignment, longest-edge frontage classification, largest-roof selection,
parcel-minus-buildings rear yard, ground elevation or regulatory lot-area inference
is performed. Rooflines are not wall footprints. Geometric measurements are not
legal measurements. Every parcel report remains `needs_investigation`, even at
100% captured-zone coverage. Heritage and secondary-suite attributes are neither
inferred nor treated as prohibitions.

## Observed coverage and verification

The actual import into disposable PostgreSQL retained **15 source records backed
by 14 objects, nine responses and ten source-scoped feature observations**:
three parcel observations, three zoning observations and four rooflines. Sites 80
and 86 share zoning bytes but retain separate request/snapshot identities. No
deduplication claims they are separate permanent zoning features.

| Captured parcel lead | Computed XY area m² | Zoning contacts | Uncovered query area m² |
|---|---:|---:|---:|
| 59 | 563.7657953943635 | 1 material | 0 |
| 80 | 577.3288014661284 | 1 material | 0 |
| 86 | 660.5342291899517 | 1 material | 0 |

All three have zero computed overlap between zone features in these queries.
The result says nothing about exhaustive overlays, title, positional accuracy or
governing legal instrument. Raw parcel `ByLaw` values remain null. All source and
spatial records remain unreviewed and publication-ineligible.

Verification uses separate observed and synthetic tests. Independent rectangle
arithmetic checks holes/islands/multipolygons (72 m²), split intersections,
0.005 m² slivers, boundary contacts, 9.995 m² uncovered area and 20 m² overlap.
Tolerance is 1e-10 m² on the small integer-area fixture. Independent translated
shoelace arithmetic checks observed single-ring parcels/rooflines within 1e-6 m².
Provider `Shape_Area`/`SHAPE_Area` comparisons use 0.001 m² and are explicitly not
independent survey evidence. The UTM central-meridian/false-easting control maps
(500000, 0) to (-123°, 0°), tolerance 1e-10 degrees; a Victoria-range coordinate
roundtrips within 1e-6 m. These checks establish numerical behavior, not accuracy
of the source survey or datum realization.

```powershell
python -m uv run --locked ruff check app tests contract_tests migrations scripts docs/pilot-inputs/intake.py docs/pilot-inputs/test_intake.py docs/usability/check_fixtures.py
python -m uv run --locked python scripts/test_postgres.py --postgres-bin 'C:/Program Files/PostgreSQL/17/bin'
python -m uv run --locked python docs/pilot-inputs/test_acquire.py
python -m uv run --locked python docs/pilot-inputs/test_intake.py
python -m uv run --locked python docs/usability/check_fixtures.py
```

The disposable runner starts/stops its own loopback cluster; each database test
uses a new schema. Tests exercise actual import/read/replay, synthetic repinned
changed bytes, old revision retrieval, atomic missing-reference/conflict rollback,
database mutation rejection, null geometry retention, and populated `0002` to
`0003` migration without changing earlier evaluation inputs. Existing empty/head
and `0001` upgrade tests also run. Existing CI discovers these tests in its guarded
PostgreSQL service; acquisition/intake/preview/frontend/container checks are preserved.

Local results on September 24, 2026: **82 tests and 28 contract subtests passed**
with no database skips on Python 3.12 / PostgreSQL 17.2. Lint passed; the two
acquisition, ten intake and three preview checks passed. One existing
Starlette/httpx deprecation warning remains. The test cluster was stopped by the
runner. No shared database or cloud resource was used. Container/frontend results
are provided by the existing PR CI checks, not claimed as local runs. The import
command currently runs from a repository checkout; the HTTP image does not bundle
the acquisition notebook or automatically ingest it.

Integration review on September 24 reproduced and corrected triple-zone overlap:
`overlapping_zone_area_m2` measures the physical area covered by at least two zone
features, counted once even where three or more coincide. The independent 100 m²
rectangle regression previously returned 200 m²; it now returns 100 m² while
retaining all three intersections. After merging PR #28 into this branch, full lint,
119 pytest cases, 28 contract subtests, two acquisition, ten intake and three preview
checks passed. PostgreSQL checks used a new disposable local cluster with no skips.

## Remaining acceptance gates

- Source service geometry/schema has been checked against saved September 24
  bytes; numeric positional accuracy, independent professional geometry review
  and current legal applicability remain unestablished.
- The retained packet has no address-point response. Address-to-parcel one-to-many
  joins have **not** been implemented or verified. Synthetic multi-parcel response
  retention is tested separately and is not evidence of address resolution.
- LA/ACTIVE attributes do not resolve air-space/strata/title/assembly ambiguity;
  reviewed single-parcel sites remain required. Principal-building identity, wall
  footprint, classified lot lines, rear yard, survey grade, fixed design and supplied
  placement remain absent. No positive fit is claimed.
- Existing SR-04 `SiteRevision`/`PlacementRevision` and persistence support supplied
  geometry/classification evidence with review state. No such real reviewed input
  was supplied here; no fake provenance or legal geometry is created. SR-04's
  single XY ring limitation is unchanged; raw spatial payloads cannot be substituted
  for those roles. Manual complex geometry would need an explicit future contract.
- There is no publication, evaluator, source-rights expansion or production deployment.
  Keep #9 open until its outstanding criteria are resolved.
