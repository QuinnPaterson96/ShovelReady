# Supplied-placement scouting geometry

Issue #137 adds an offline, deterministic `app.scouting_geometry` module. It measures one
user-supplied rectangle against supplied parcel and building observations. It makes no
legal, regulatory, site-fit, or all-placements conclusion. Approximate observations
are useful without a survey or accepted rule release; the caller must retain the
input's source and capture caveats when displaying them.

## Consumer contract

Call `Request.model_validate(data)`, then `assess(request)`. The returned immutable
`Assessment` has `scouting-geometry.v1` input/output schema, `supplied-rectangle.v1`
engine identity, the full original input (including source IDs, geometry and capture
status), the computed placement polygon, checks, and limitations. Serialize with
`result.model_dump(mode="json")`. This module has no HTTP endpoint or database writes.

All coordinates are XY in the explicitly declared common **projected metre** CRS.
Each feature repeats its CRS; mismatch is an invalid observation rather than a
silent transformation. GeoJSON geometry objects are used as coordinate containers
with this explicit CRS; do not interpret them as RFC 7946 longitude/latitude.
Polygon inputs may have holes. Invalid/nonfinite geometry is reported, never repaired.
`placement.centre_xy` is the rectangle centre; `width_m` initially runs along +X,
`depth_m` along +Y, and positive `angle_degrees` rotates counterclockwise about the
centre. The output polygon is derived and does not replace the retained input.

Example (synthetic metres, not a real site):

```json
{
  "schema_version": "scouting-geometry.v1",
  "projected_metre_crs": "EPSG:3157",
  "parcel": {
    "id": "synthetic-parcel",
    "shape": {"crs": "EPSG:3157", "geometry": {"type": "Polygon", "coordinates": [[[0,0],[20,0],[20,20],[0,20],[0,0]]]}},
    "source": {"provider": "Synthetic fixture", "record_label": "20 m square", "capture_date": null, "review_status": "unreviewed", "reference": null}
  },
  "buildings": [{
    "id": "mapped-shed",
    "shape": {"crs": "EPSG:3157", "geometry": {"type": "Polygon", "coordinates": [[[10,7],[12,7],[12,9],[10,9],[10,7]]]}},
    "source": {"provider": "Synthetic fixture", "record_label": "Observed roof outline", "capture_date": null, "review_status": "unreviewed", "reference": null},
    "basis": "roofline"
  }],
  "named_boundaries": [],
  "capture": {"completeness": "partial", "scope": "supplied structures only", "limitations": ["Other structures may be absent."]},
  "placement": {"id": "p1", "centre_xy": [5,5], "width_m": 2, "depth_m": 2, "angle_degrees": 0},
  "requirements": [{"id": "example-gap", "target": "nearest_building", "target_id": null,
    "minimum_m": 5, "status": "user_assumption", "source": null}]
}
```

For that example, containment is observed as `contained` with outside area 0 m²;
parcel-boundary distance is 4 m. The closest mapped building is the shed at
√17 ≈ 4.123 m, giving the assumed 5 m comparison a margin of √17−5 ≈ −0.877 m
and `shortfall`. The building outline is a **roofline**: its distance is not
silently converted into a wall-to-wall setback. A comparison's `meets` means only
the measured distance meets the **supplied number under its stated basis**.

Selected output rows for the example (other rows and the full echoed `input` omitted):

```json
{
  "schema_version": "scouting-geometry.v1",
  "engine_version": "supplied-rectangle.v1",
  "conclusion": "tested_placement_observations_only",
  "checks": [
    {"id": "containment", "kind": "containment", "status": "observed", "relation": "contained", "area_m2": 0},
    {"id": "nearest_building", "kind": "nearest_building_distance", "status": "observed", "distance_m": 4.123105625617661, "source_feature_ids": ["mapped-shed"]},
    {"id": "requirement:example-gap", "kind": "requirement", "status": "compared", "requirement_id": "example-gap", "requirement_status": "user_assumption", "distance_m": 4.123105625617661, "margin_m": -0.8768943743823394, "comparison": "shortfall"}
  ]
}
```

Actual serialized rows also include nullable fields; use the typed schema rather
than assuming the abbreviated JSON above is a complete `Assessment`.

## Check semantics

- `containment.area_m2` is placement area outside the parcel, including holes.
  `contained` means no outside area and no boundary touch; `touches` means no
  outside area but boundary contact; `outside` means positive outside area.
- Per-building `building_overlap` reports positive intersection area, exact
  contact, or separation. `building_distance` is minimum polygon separation,
  zero at contact or overlap. `nearest_building_distance` is computed only if
  every supplied building polygon is valid; it is missing for an empty capture.
- `parcel_boundary_distance` measures to the full parcel boundary, including
  hole edges. Named boundary distance uses only explicitly supplied LineStrings.
  No principal building or front/rear line is inferred from size or compass
  direction; supply its ID or named line explicitly for that comparison.
- Requirement targets are `parcel_boundary`, `nearest_building`, `building`
  with `target_id`, or `named_boundary` with `target_id`. `margin_m` is observed
  distance minus `minimum_m`; zero meets the supplied threshold. A parcel
  boundary comparison is unsupported if the placement is outside the parcel.
  Requirements carry `user_assumption`, `source_unreviewed`, or `source_reviewed`
  status and optional source provenance. None becomes an accepted legal check.
- Each check has `observed`, `compared`, `missing`, `invalid`, or `unsupported`
  status. Missing named features, invalid geometry, unsupported outside-parcel
  comparison, and no mapped buildings have different reasons. Independent valid
  checks still run when one feature is missing or invalid.

The placement UI owner (#139) should display observation and comparison rows
separately. Show source/provider, record label, capture date and review status
from `input`; expose exact IDs and source references in technical details. Label
comparison rows with `requirement_status` and the matched requirement's source.
Keep `capture.scope`, `capture.completeness`, its limitations, and result
limitations visible. A partial capture with no observed overlap cannot be
presented as verified clear space. Do not aggregate these rows into a site-fit
badge or a parcel exclusion. The engine checks the tested placement only and
does not search for alternatives or invent zoning buffers.

## Adapter guidance and verification

An adapter for retained Victoria observations can select a parcel polygon and
building polygons from a **pinned** spatial revision, preserving each feature's
snapshot locator/record label and observation date in `Source`. Supply the actual
XY EPSG:3157 outlines and tag building `basis` as `roofline` where appropriate.
Set capture completeness to `partial` or `unknown` unless the captured scope has
been established; a bounded address/parcel packet does not establish all
obstructions. Supply a separately identified placement and any explicitly
classified lot lines. The adapter must not infer a principal house or legal yard,
relabel roofline to wall, or attach accepted rule status without review. No such
adapter is implemented here; acquisition is #136 and rule-source review is #138.

Verified locally with synthetic offline fixtures in `tests/test_scouting_geometry.py`:
rotation, analytic distances/margins, concavity, hole, touching, overlap, multiple
buildings, malformed/nonfinite geometry, CRS mismatch, missing target and partial
capture. These prove software geometry for the fixtures, not accuracy of Victoria
observations or legal interpretation. Real data conversion and UI integration
remain separate tasks.
