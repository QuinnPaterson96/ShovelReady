"""Synthetic analytical fixtures; no live source or database."""

import math

import pytest

from app.scouting_geometry import Request, assess


def polygon(shell, holes=()):
    return {"type": "Polygon", "coordinates": [shell, *holes]}


def feature(id, geometry, *, crs="EPSG:3157", basis=None):
    item = {
        "id": id,
        "shape": {"crs": crs, "geometry": geometry},
        "source": {
            "provider": "Synthetic fixture",
            "record_label": id,
            "review_status": "unreviewed",
        },
    }
    if basis is not None:
        item["basis"] = basis
    return item


def fixture(**changes):
    raw = {
        "schema_version": "scouting-geometry.v1",
        "projected_metre_crs": "EPSG:3157",
        "parcel": feature("parcel", polygon([[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]])),
        "buildings": [
            feature(
                "shed", polygon([[10, 7], [12, 7], [12, 9], [10, 9], [10, 7]]), basis="roofline"
            )
        ],
        "capture": {"completeness": "partial", "scope": "synthetic mapped structures"},
        "placement": {
            "id": "p1",
            "centre_xy": [5, 5],
            "width_m": 2,
            "depth_m": 2,
            "angle_degrees": 0,
        },
        "requirements": [
            {
                "id": "assumed-gap",
                "target": "nearest_building",
                "minimum_m": 5,
                "status": "user_assumption",
            }
        ],
    }
    raw.update(changes)
    return Request.model_validate(raw)


def checks(result):
    return {item.id: item for item in result.checks}


def test_independently_calculable_distances_and_margin():
    result = assess(fixture())
    found = checks(result)
    # Placement east edge x=6, north edge y=6; shed begins x=10,y=7.
    assert found["nearest_building"].distance_m == pytest.approx(math.sqrt(17))
    assert found["requirement:assumed-gap"].margin_m == pytest.approx(math.sqrt(17) - 5)
    assert found["requirement:assumed-gap"].comparison == "shortfall"
    assert found["parcel_boundary"].distance_m == pytest.approx(4)
    assert found["containment"].relation == "contained"
    assert result.input == fixture()
    assert any("not verified clear space" in item for item in result.limitations)


def test_rotated_rectangle_and_multiple_buildings():
    extra = feature(
        "far", polygon([[15, 15], [17, 15], [17, 17], [15, 17], [15, 15]]), basis="wall"
    )
    request = fixture(
        buildings=[fixture().buildings[0].model_dump(), extra],
        placement={
            "id": "p1",
            "centre_xy": [5, 5],
            "width_m": 4,
            "depth_m": 2,
            "angle_degrees": 90,
        },
    )
    found = checks(assess(request))
    assert found["parcel_boundary"].distance_m == pytest.approx(3)
    assert found["nearest_building"].source_feature_ids == ("shed",)
    assert found["building:far:distance"].distance_m > found["nearest_building"].distance_m


def test_concavity_and_hole_make_containment_outside():
    concave = polygon([[0, 0], [10, 0], [10, 3], [3, 3], [3, 10], [0, 10], [0, 0]])
    request = fixture(
        parcel=feature("parcel", concave),
        buildings=[],
        requirements=[],
        placement={"id": "p1", "centre_xy": [4, 4], "width_m": 2, "depth_m": 2},
    )
    assert checks(assess(request))["containment"].area_m2 == pytest.approx(4)
    with_hole = polygon(
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]]
    )
    request = fixture(
        parcel=feature("parcel", with_hole),
        buildings=[],
        requirements=[],
        placement={"id": "p1", "centre_xy": [5, 5], "width_m": 2, "depth_m": 2},
    )
    assert checks(assess(request))["containment"].area_m2 == pytest.approx(4)


def test_touch_is_distinct_from_area_overlap():
    touch = fixture(placement={"id": "p1", "centre_xy": [9, 8], "width_m": 2, "depth_m": 2})
    found = checks(assess(touch))
    assert found["building:shed:overlap"].relation == "touches"
    assert found["building:shed:overlap"].area_m2 == 0
    overlap = fixture(placement={"id": "p1", "centre_xy": [10, 8], "width_m": 2, "depth_m": 2})
    assert checks(assess(overlap))["building:shed:overlap"].area_m2 == pytest.approx(2)
    edge = fixture(placement={"id": "p1", "centre_xy": [1, 5], "width_m": 2, "depth_m": 2})
    assert checks(assess(edge))["containment"].relation == "touches"


def test_invalid_and_mismatched_features_do_not_stop_independent_checks():
    bowtie = feature("bad", polygon([[10, 7], [12, 9], [10, 9], [12, 7], [10, 7]]), basis="unknown")
    wrong_crs = feature(
        "other",
        polygon([[15, 15], [16, 15], [16, 16], [15, 16], [15, 15]]),
        basis="wall",
        crs="EPSG:4326",
    )
    request = fixture(buildings=[bowtie, wrong_crs])
    found = checks(assess(request))
    assert found["containment"].status == "observed"
    assert found["building:bad:overlap"].status == "invalid"
    assert found["building:other:distance"].reason == "geometry_crs_mismatch"
    assert found["nearest_building"].status == "invalid"
    assert found["requirement:assumed-gap"].status == "invalid"
    bad_coordinate = feature(
        "bad", polygon([[10, 7], [12, 7], [12, float("nan")], [10, 9], [10, 7]]), basis="wall"
    )
    assert (
        checks(assess(fixture(buildings=[bad_coordinate])))["building:bad:overlap"].reason
        == "nonfinite_coordinate"
    )


def test_missing_target_and_explicit_named_line():
    boundary = feature("rear", {"type": "LineString", "coordinates": [[0, 20], [20, 20]]})
    request = fixture(
        named_boundaries=[boundary],
        requirements=[
            {
                "id": "rear-gap",
                "target": "named_boundary",
                "target_id": "rear",
                "minimum_m": 10,
                "status": "user_assumption",
            },
            {
                "id": "front-gap",
                "target": "named_boundary",
                "target_id": "front",
                "minimum_m": 1,
                "status": "user_assumption",
            },
        ],
    )
    found = checks(assess(request))
    assert found["requirement:rear-gap"].margin_m == pytest.approx(4)
    assert found["requirement:front-gap"].status == "missing"
    assert found["boundary:rear"].distance_m == pytest.approx(14)


def test_empty_capture_keeps_unknown_obstruction_state():
    found = checks(assess(fixture(buildings=[])))
    assert found["nearest_building"].status == "missing"
    assert found["requirement:assumed-gap"].status == "missing"
    assert found["containment"].status == "observed"


def test_outside_parcel_cannot_meet_boundary_requirement():
    request = fixture(
        placement={"id": "p1", "centre_xy": [23, 5], "width_m": 2, "depth_m": 2},
        requirements=[
            {"id": "edge", "target": "parcel_boundary", "minimum_m": 1, "status": "user_assumption"}
        ],
    )
    found = checks(assess(request))
    assert found["containment"].relation == "outside"
    assert found["parcel_boundary"].distance_m == pytest.approx(2)
    assert found["requirement:edge"].status == "unsupported"
    assert found["requirement:edge"].requirement_status == "user_assumption"


def test_geographic_crs_is_invalid_for_planar_measurement():
    found = checks(assess(fixture(projected_metre_crs="EPSG:4326")))
    assert found["containment"].reason == "crs_must_be_projected_metres"
    assert found["nearest_building"].status == "invalid"


@pytest.mark.parametrize("value", [True, "2"])
@pytest.mark.parametrize("field", ["width_m", "depth_m", "angle_degrees", "minimum_m", "centre_xy"])
def test_numeric_boundary_rejects_boolean_and_text(value, field):
    from pydantic import ValidationError

    raw = fixture().model_dump()
    if field == "minimum_m":
        raw["requirements"][0][field] = value
    elif field == "centre_xy":
        raw["placement"][field] = [value, 5]
    else:
        raw["placement"][field] = value
    with pytest.raises(ValidationError):
        Request.model_validate(raw)
