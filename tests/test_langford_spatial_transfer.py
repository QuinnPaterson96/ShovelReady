"""Saved licensed captures and explicitly simulated negative controls for SR-44."""

import copy
import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tools/municipality_transfer/langford_spatial.py"
spec = importlib.util.spec_from_file_location("langford_spatial_transfer", SCRIPT)
transfer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transfer)


def test_real_saved_packet_replays_without_publishing():
    result = transfer.replay()
    assert all(case["status"] == "ambiguous" for case in result["cases"].values())
    assert all(len(case["geocoder_candidates"]) > 1 for case in result["cases"].values())
    assert all(case["candidates"] == [] for case in result["cases"].values())
    assert result["publication_eligible"] is False


def single_geocoder_fixture(packet):
    # Simulated explicit selection, not a verified match for the real address.
    geocoder = copy.deepcopy(packet["lone-oak-geocoder.json"])
    geocoder["features"] = geocoder["features"][:1]
    return geocoder


def test_selected_point_spatial_candidate_is_still_unverified():
    packet = transfer.read_packet()
    candidate = transfer.map_case(single_geocoder_fixture(packet), packet["lone-oak-pmbc.json"])
    assert candidate["status"] == "unique_spatial_candidate"
    assert candidate["candidates"][0]["pid"] == "030498481"
    assert candidate["candidates"][0]["geometric_area_m2_epsg3005"] == pytest.approx(
        7318.568, abs=0.001
    )
    assert candidate["parcel_match_verified"] is False


def test_simulated_ambiguous_no_match_and_unavailable():
    packet = transfer.read_packet()
    geocoder = single_geocoder_fixture(packet)
    parcels = packet["lone-oak-pmbc.json"]
    duplicate = copy.deepcopy(parcels)
    containing = next(f for f in duplicate["features"] if f["properties"]["PID"])
    another = copy.deepcopy(containing)
    another["id"] = "simulated-overlap"
    another["properties"]["PID"] = "simulated-pid"
    duplicate["features"].append(another)
    duplicate["numberReturned"] += 1
    duplicate["numberMatched"] += 1
    assert transfer.map_case(geocoder, duplicate)["status"] == "ambiguous"
    empty = copy.deepcopy(parcels)
    empty["features"] = []
    empty["numberReturned"] = empty["numberMatched"] = 0
    assert transfer.map_case(geocoder, empty)["status"] == "no_match"
    assert transfer.map_case(geocoder, None)["status"] == "unavailable"


def test_integrity_and_crs_rejections(tmp_path):
    packet = transfer.read_packet()
    wrong_crs = copy.deepcopy(packet["lone-oak-pmbc.json"])
    wrong_crs["crs"]["properties"]["name"] = "urn:ogc:def:crs:EPSG::4326"
    with pytest.raises(ValueError, match="CRS"):
        transfer.map_case(single_geocoder_fixture(packet), wrong_crs)

    import shutil

    shutil.copytree(transfer.PACKET, tmp_path / "packet")
    path = tmp_path / "packet/lone-oak-geocoder.json"
    path.write_bytes(path.read_bytes() + b" ")
    with pytest.raises(ValueError, match="integrity"):
        transfer.read_packet(tmp_path / "packet")


def test_multiple_geocoder_results_are_not_silently_selected():
    packet = transfer.read_packet()
    geocoder = copy.deepcopy(packet["lone-oak-geocoder.json"])
    geocoder["features"].append(copy.deepcopy(geocoder["features"][0]))
    result = transfer.map_case(geocoder, packet["lone-oak-pmbc.json"])
    assert result["status"] == "ambiguous"
    assert len(result["geocoder_candidates"]) == len(geocoder["features"])
    assert result["candidates"] == []
    assert result["parcel_match_verified"] is False
    with pytest.raises(ValueError, match="features"):
        transfer.map_case({"features": None}, None)
