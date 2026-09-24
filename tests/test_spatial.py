"""Observed Victoria byte checks and explicitly synthetic adversarial geometry tests."""

import json
import math
import shutil
from copy import deepcopy

import pytest
from pyproj import Transformer
from shapely.geometry import box, shape

from app.spatial.geometry import geographic_transformer, intersect_parcel, xy_polygon
from app.spatial.importer import ROOT, prepare, strict_json
from app.spatial.payloads import SpatialImport
from tests.spatial_fixtures import changed_packet


def ring(x, y, size):
    return [[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]


def raw(*rings):
    return {"rings": list(rings)}


def test_synthetic_holes_disjoint_shells_nested_islands_and_ring_order():
    rings = [ring(0, 0, 10), ring(2, 2, 6), ring(3, 3, 2), ring(20, 20, 2)]
    # Independent rectangle arithmetic: 100 - 36 + 4 + 4 = 72 square metres.
    for values in (rings, list(reversed(rings)), [r[::-1] for r in rings]):
        polygon, issue = xy_polygon(raw(*values))
        assert issue is None
        assert polygon.geom_type == "MultiPolygon"
        assert polygon.area == pytest.approx(72, abs=1e-10)
        assert len(polygon.geoms) == 3


@pytest.mark.parametrize(
    "geometry,reason",
    [
        (None, "missing_geometry"),
        ({"rings": []}, "empty_geometry"),
        (raw([[0, 0], [1, 1], [0, 1], [1, 0], [0, 0]]), "invalid_ring"),
        (raw([[0, 0], [1, 0], [1, 1], [0, 1]]), "unclosed_ring"),
        (raw(ring(0, 0, 2), ring(1, 1, 2)), "crossed_rings"),
        (raw(ring(0, 0, 2), ring(0, 0, 2)), "duplicate_ring"),
        (raw([[0, 0], [1, 0], [1, math.nan], [0, 0]]), "invalid_coordinate"),
        ({"curveRings": []}, "unsupported_geometry"),
        ({"rings": [ring(0, 0, 1)], "spatialReference": {"wkid": 4326}}, "crs_mismatch"),
    ],
)
def test_synthetic_unusable_geometry_remains_unknown(geometry, reason):
    polygon, issue = xy_polygon(geometry)
    assert polygon is None and reason in issue
    report = intersect_parcel(polygon, [box(0, 0, 10, 10)], "parcel", 0, "zone")
    assert report.uncovered_area_m2 is None
    assert report.status == "needs_investigation"


def test_synthetic_exact_touch_decomposition_does_not_repair_crossings():
    # Two squares sharing a vertex, traversed as one Esri ring: all edges preserved.
    vertices = [[0, 0], [2, 0], [2, 2], [4, 2], [4, 4], [2, 4], [2, 2], [0, 2], [0, 0]]
    original = deepcopy(vertices)
    polygon, issue = xy_polygon(raw(vertices))
    assert polygon.is_valid and polygon.area == 8
    assert issue == "exact_self_touch_decomposed_requires_review"
    assert vertices == original


def test_synthetic_split_sliver_boundary_uncovered_and_overlap():
    parcel = box(0, 0, 10, 10)
    zones = [box(0, 0, 4, 10), box(4, 0, 9, 10), box(9, 0, 9.0005, 10), box(10, 0, 11, 10)]
    result = intersect_parcel(parcel, zones, "parcel", 0, "zones")
    assert [i.classification for i in result.intersections] == [
        "material",
        "material",
        "sliver",
        "boundary_touch",
    ]
    assert [i.area_m2 for i in result.intersections] == pytest.approx([40, 50, 0.005, 0])
    assert result.uncovered_area_m2 == pytest.approx(9.995)
    assert "split_zoning_or_overlapping_zone_features" in result.issues
    assert "parcel_type_status_or_strata_airspace_unresolved" in result.issues
    overlap = intersect_parcel(parcel, [box(0, 0, 6, 10), box(4, 0, 10, 10)], "p", 0, "z")
    assert overlap.overlapping_zone_area_m2 == 20
    assert overlap.uncovered_area_m2 == 0
    # Physical overlap area is counted once even where three zone features coincide.
    triple = intersect_parcel(parcel, [parcel, parcel, parcel], "p", 0, "z")
    assert triple.overlapping_zone_area_m2 == 100
    assert len(triple.intersections) == 3
    incomplete = intersect_parcel(parcel, [zones[0], None], "p", 0, "z")
    assert len(incomplete.intersections) == 1
    assert incomplete.uncovered_area_m2 is None
    empty = intersect_parcel(parcel, [], "p", 0, "z")
    assert empty.uncovered_area_m2 is None


def test_synthetic_crs_controls_and_roundtrip():
    transformer = geographic_transformer()
    # UTM zone 10's central meridian and false easting, an independent definition control.
    assert transformer.transform(500_000, 0) == pytest.approx((-123, 0), abs=1e-10)
    inverse = Transformer.from_crs(4617, 3157, always_xy=True, allow_ballpark=False)
    xy = (475_000, 5_365_000)
    longitude, latitude = transformer.transform(*xy)
    assert -124 < longitude < -123 and 48 < latitude < 49
    assert inverse.transform(longitude, latitude) == pytest.approx(xy, abs=1e-6)
    assert "utm" in transformer.definition and "zone=10" in transformer.definition


def independent_shoelace(vertices):
    # Shift origin to avoid cancellation at UTM coordinate magnitudes; no GEOS calls.
    x0, y0 = vertices[0][:2]
    return (
        abs(
            sum(
                (a[0] - x0) * (b[1] - y0) - (b[0] - x0) * (a[1] - y0)
                for a, b in zip(vertices, vertices[1:], strict=False)
            )
        )
        / 2
    )


def test_observed_victoria_full_raw_preservation_areas_and_intersections():
    sources, result = prepare()
    assert len(sources) == 15 and len(result.observations) == 9 and len(result.features) == 10
    assert prepare()[1] == result
    assert SpatialImport.model_validate_json(result.model_dump_json()) == result
    assert all(s.review.status == "unreviewed" for s in sources)
    assert result.vertical_datum is None and result.vertical_unit is None
    assessment = {(f.snapshot_id, f.feature_index): f for f in result.features}
    source_index = {s.snapshot_id: s for s in sources}
    for observed in result.observations:
        source = source_index[observed.snapshot_id]
        path = ROOT / source.artifact.uri.removeprefix("repo:docs/pilot-inputs/")
        assert observed.response == strict_json(path.read_bytes())
        for i, feature in enumerate(observed.response["features"]):
            derived = assessment[(observed.snapshot_id, i)]
            attributes = feature["attributes"]
            expected = attributes.get("Shape_Area", attributes.get("SHAPE_Area"))
            # Provider area is a cross-check, not an independent survey accuracy oracle.
            assert derived.geometric_area_m2 == pytest.approx(expected, abs=0.001)
            rings = feature["geometry"]["rings"]
            if len(rings) == 1:
                assert derived.geometric_area_m2 == pytest.approx(
                    independent_shoelace(rings[0]), abs=1e-6
                )
            if "rooflines" in observed.source_id:
                assert all(len(p) == 3 for r in rings for p in r)
                assert shape(derived.geographic_xy).has_z is False
            if observed.source_id in {"site-80-zones", "site-86-zones"}:
                assert len(rings) == 22
                assert derived.status == "needs_investigation"
                assert "exact_self_touch_decomposed_requires_review" in derived.issues
                assert shape(derived.geographic_xy).is_valid
    assert [p.intersections[0].area_m2 for p in result.parcels] == pytest.approx(
        [563.7657953943635, 577.3288014661283, 660.5342291899517], abs=1e-6
    )
    assert all(
        p.uncovered_area_m2 == 0 and p.status == "needs_investigation" for p in result.parcels
    )
    assert all(p.overlapping_zone_area_m2 == 0 for p in result.parcels)


def test_corrupt_source_rejected_before_json_processing(tmp_path):
    shutil.copytree(ROOT, tmp_path / "packet")
    root = tmp_path / "packet"
    source = json.loads((root / "intake-packet.json").read_bytes())["sources"][0]
    (root / source["capture"]["repository_path"]).write_bytes(b"not even JSON")
    with pytest.raises(ValueError, match="integrity"):
        prepare(root)


def test_reader_rejects_future_versions_missing_features_and_nan():
    result = prepare()[1].model_dump(mode="json")
    for field, value in (("schema_version", "sr-09.v2"), ("features", [])):
        with pytest.raises(ValueError):
            SpatialImport.model_validate({**result, field: value})
    with pytest.raises(ValueError, match="nonfinite"):
        strict_json('{"value":NaN}')
    with pytest.raises(ValueError, match="duplicate"):
        strict_json('{"a":1,"a":2}')


def test_synthetic_empty_parcel_response_is_explicit_investigation(tmp_path):
    root = changed_packet(tmp_path, lambda raw: raw.update(features=[]))
    result = prepare(root)[1]
    assert len(result.parcels) == 3
    assert result.parcels[0].parcel_feature_index is None
    assert result.parcels[0].uncovered_area_m2 is None
    assert result.parcels[0].status == "needs_investigation"


def test_synthetic_multiple_parcels_remain_separate(tmp_path):
    def add_parcel(raw):
        other = deepcopy(raw["features"][0])
        other["attributes"].update(OBJECTID=999, ParcelType="STRATA")
        raw["features"].append(other)

    result = prepare(changed_packet(tmp_path, add_parcel))[1]
    assert len(result.parcels) == 4
    assert [p.parcel_feature_index for p in result.parcels[:2]] == [0, 1]
    assert "parcel_type_status_or_strata_airspace_unresolved" in result.parcels[1].issues


@pytest.mark.parametrize(
    "mutation,reason",
    [
        (lambda raw: raw.update(exceededTransferLimit=True), "truncated"),
        (lambda raw: raw["features"][0]["attributes"].update(NEW_FIELD=None), "schema"),
        (lambda raw: raw.update(spatialReference={"wkid": 4326}), "CRS"),
    ],
)
def test_synthetic_schema_drift_and_truncation_rejected(tmp_path, mutation, reason):
    root = changed_packet(tmp_path, mutation)
    with pytest.raises(ValueError, match=reason):
        prepare(root)
