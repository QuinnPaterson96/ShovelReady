"""Offline, bounded SR-42 replay controls; no database or network."""

import copy
import importlib.util
import json
from pathlib import Path

import pytest
from shapely.affinity import translate
from shapely.geometry import MultiPolygon, Polygon, mapping, shape

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "saanich_spatial", ROOT / "tools/municipality_transfer/saanich_spatial.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


@pytest.fixture(scope="module")
def capture():
    return MODULE.load_capture()


def test_three_observed_candidates_and_unresolved_zoning(capture):
    cases = (
        ("3325 KINGSLEY ST", "000-554-294", 518.1212854152819),
        ("4225 CEDAR HILL RD", "002-559-790", 849.5821673268191),
        ("2150 FOUL BAY RD", "007-769-938", 777.0856950718796),
    )
    for address, pid, area in cases:
        result = MODULE.map_address(capture, address)
        assert result["status"] == "unique_observed_candidate"
        assert result["observations"]["pid"] == pid
        assert result["observations"]["approximate_xy_area_m2"] == pytest.approx(area)
        assert result["review_status"] == "unreviewed"
        assert result["publication_eligible"] is False
        assert all(x["source_record_index"] >= 0 for x in result["observations"]["zoning_contacts"])
    cedar = MODULE.map_address(capture, "4225 CEDAR HILL RD")
    assert any(
        z["classification"] == "material" and z["original_type"] == "RS-10"
        for z in cedar["observations"]["zoning_contacts"]
    )
    assert any(
        z["classification"] == "geometry_unusable" and z["intersection_area_m2"] is None
        for z in cedar["observations"]["zoning_contacts"]
    )
    creek = MODULE.map_address(capture, "2150 FOUL BAY RD")
    assert creek["observations"]["watercourses_within_50m_in_excerpt"][0][
        "distance_to_parcel_m"
    ] == pytest.approx(18.964513967, abs=0.001)


def test_ambiguous_candidate_is_retained_without_selection(capture):
    fixture = copy.deepcopy(capture)
    duplicate = copy.deepcopy(fixture["layers"]["parcels"][0])
    duplicate["source_record_index"] = 999999
    duplicate["attributes"]["PID"] = "SIMULATED-SECOND-PID"
    fixture["layers"]["parcels"].append(duplicate)
    result = MODULE.map_address(fixture, "3325 KINGSLEY ST")
    assert result["status"] == "ambiguous"
    assert len(result["candidates"]) == 2
    assert result["observations"] is None


def test_no_match_is_packet_scoped(capture):
    result = MODULE.map_address(capture, "1 SIMULATED UNKNOWN ST")
    assert result["status"] == "no_match"
    assert result["scope"] == "retained_three_address_excerpt_only"
    assert result["observations"] is None


def test_unavailable_is_not_a_negative_match(capture):
    fixture = copy.deepcopy(capture)
    fixture["availability"] = "unavailable"
    result = MODULE.map_address(fixture, "3325 KINGSLEY ST")
    assert result["status"] == "unavailable"
    assert result["observations"] is None
    assert "no negative inference" in result["issues"][0]


def test_tampered_capture_rejected(tmp_path):
    source = MODULE.DEFAULT_ROOT
    (tmp_path / "manifest.json").write_bytes((source / "manifest.json").read_bytes())
    (tmp_path / "capture.json").write_bytes((source / "capture.json").read_bytes() + b" ")
    with pytest.raises(ValueError, match="integrity"):
        MODULE.load_capture(tmp_path)


def test_source_topology_revision_keeps_invalid_features_quarantined(capture):
    revision = json.loads((MODULE.DEFAULT_ROOT / MODULE.TOPOLOGY_REVISION).read_text())
    manifest = json.loads((MODULE.DEFAULT_ROOT / "manifest.json").read_text())
    assert revision["schema_version"] == "sr46.saanich.zoning_topology.v2"
    assert revision["input_capture_sha256"] == manifest["capture_sha256"]
    assert revision["input_archive_sha256"] == manifest["archives"]["ZoningSHP.zip"]["sha256"]
    assert (
        revision["input_shp_sha256"]
        == manifest["archives"]["ZoningSHP.zip"]["members"]["Zoning.shp"]
    )
    assert all(record["source_parts_match_capture_exactly"] for record in revision["records"])
    invalid_parts = {
        record["source_record_index"]: [
            ring["part_index"] for ring in record["source_ring_findings"] if not ring["valid"]
        ]
        for record in revision["records"]
    }
    assert invalid_parts == {1853: [67], 1475: [], 1659: [0], 1790: [0, 12, 14]}
    assert all(
        not record["captured_geometry_valid"]
        for record in revision["records"]
        if record["source_record_index"] != 1475
    )
    assert all(
        shape(feature["geometry"]).is_valid == (feature["source_record_index"] == 1475)
        for feature in capture["layers"]["zoning"]
    )


def test_holes_and_multipart_preserve_contact_area(capture):
    fixture = copy.deepcopy(capture)
    parcel = shape(fixture["layers"]["parcels"][0]["geometry"])
    outer = parcel.envelope.buffer(20).exterior.coords
    hole = parcel.envelope.buffer(1).exterior.coords
    hole_zone = Polygon(outer, [hole])
    multipart_zone = MultiPolygon([parcel, translate(parcel, xoff=100000)])
    assert hole_zone.is_valid and multipart_zone.is_valid
    fixture["layers"]["zoning"] = [
        {
            "source_record_index": 900001,
            "attributes": {"TYPE": "HOLE"},
            "geometry": mapping(hole_zone),
        },
        {
            "source_record_index": 900002,
            "attributes": {"TYPE": "MULTIPART"},
            "geometry": mapping(multipart_zone),
        },
    ]
    result = MODULE.map_address(fixture, "3325 KINGSLEY ST")
    contacts = result["observations"]["zoning_contacts"]
    assert [contact["source_record_index"] for contact in contacts] == [900002]
    assert contacts[0]["classification"] == "material"
    assert contacts[0]["contact_basis"] == "polygon_intersection"
    assert contacts[0]["intersection_area_m2"] == pytest.approx(parcel.area)


def test_invalid_source_geometry_remains_unknown(capture):
    fixture = copy.deepcopy(capture)
    parcel = shape(fixture["layers"]["parcels"][0]["geometry"])
    x, y = parcel.centroid.coords[0]
    bowtie = Polygon(
        [(x - 100, y - 100), (x + 100, y + 100), (x - 100, y + 100), (x + 100, y - 100)]
    )
    assert not bowtie.is_valid
    fixture["layers"]["zoning"] = [
        {
            "source_record_index": 900003,
            "attributes": {"TYPE": "INVALID"},
            "geometry": mapping(bowtie),
        }
    ]
    result = MODULE.map_address(fixture, "3325 KINGSLEY ST")
    contact = result["observations"]["zoning_contacts"][0]
    assert contact["classification"] == "geometry_unusable"
    assert contact["contact_basis"] == "envelope_overlap_only"
    assert contact["intersection_area_m2"] is None
    assert "zoning_geometry_unusable; no coverage_inference" in result["issues"]
