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


def first_selection(geocoder):
    return transfer.candidate_locator(geocoder["features"][0], 0)


def test_selected_point_spatial_candidate_is_still_unverified():
    packet = transfer.read_packet()
    geocoder = packet["lone-oak-geocoder.json"]
    candidate = transfer.map_case(geocoder, packet["lone-oak-pmbc.json"], first_selection(geocoder))
    assert candidate["status"] == "unique_spatial_candidate"
    assert candidate["candidates"][0]["pid"] == "030498481"
    assert candidate["candidates"][0]["geometric_area_m2_epsg3005"] == pytest.approx(
        7318.568, abs=0.001
    )
    assert candidate["parcel_match_verified"] is False
    assert candidate["address_text_equal"] is True
    assert candidate["match_precision"] == "CIVIC_NUMBER"


@pytest.mark.parametrize("case", transfer.CASES)
def test_every_saved_candidate_requires_independent_coverage(case):
    packet = transfer.read_packet()
    geocoder = packet[f"{case}-geocoder.json"]
    defaults = transfer.replay()["cases"][case]
    assert defaults["status"] == "ambiguous"
    assert defaults["geocoder_pagination"]["may_be_truncated"] is True
    for index, feature in enumerate(geocoder["features"]):
        locator = transfer.candidate_locator(feature, index)
        result = transfer.replay(selections={case: locator})["cases"][case]
        assert result["selection"]["locator"] == locator
        assert result["selection"]["source"]["sha256"]
        assert result["parcel_match_verified"] is False
        assert result["requested_address"] == geocoder["queryAddress"]
        assert result["geocoder_address"] == feature["properties"]["fullAddress"]
        if index:
            assert result["status"] == "unavailable"
            assert result["candidates"] == []
        else:
            assert result["status"] in ("unique_spatial_candidate", "no_match")
            assert result["parcel_pagination"]["complete_for_saved_bbox"] is True
    with pytest.raises(ValueError, match="selection locator"):
        transfer.replay(selections={case: "0:wrong"})


def test_simulated_ambiguous_no_match_and_unavailable():
    packet = transfer.read_packet()
    geocoder = packet["lone-oak-geocoder.json"]
    selection = first_selection(geocoder)
    parcels = packet["lone-oak-pmbc.json"]
    duplicate = copy.deepcopy(parcels)
    containing = next(f for f in duplicate["features"] if f["properties"]["PID"])
    another = copy.deepcopy(containing)
    another["id"] = "simulated-overlap"
    another["properties"]["PID"] = "simulated-pid"
    duplicate["features"].append(another)
    duplicate["numberReturned"] += 1
    duplicate["numberMatched"] += 1
    assert transfer.map_case(geocoder, duplicate, selection)["status"] == "ambiguous"
    empty = copy.deepcopy(parcels)
    empty["features"] = []
    empty["numberReturned"] = empty["numberMatched"] = 0
    assert transfer.map_case(geocoder, empty, selection)["status"] == "no_match"
    assert transfer.map_case(geocoder, None, selection)["status"] == "unavailable"


def test_integrity_and_crs_rejections(tmp_path):
    packet = transfer.read_packet()
    geocoder = packet["lone-oak-geocoder.json"]
    wrong_geocoder = copy.deepcopy(geocoder)
    wrong_geocoder["crs"]["properties"]["code"] = 3005
    with pytest.raises(ValueError, match="geocoder CRS"):
        transfer.map_case(wrong_geocoder, packet["lone-oak-pmbc.json"])
    wrong_crs = copy.deepcopy(packet["lone-oak-pmbc.json"])
    wrong_crs["crs"]["properties"]["name"] = "urn:ogc:def:crs:EPSG::4326"
    with pytest.raises(ValueError, match="CRS"):
        transfer.map_case(geocoder, wrong_crs, first_selection(geocoder))

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
    geocoder["maxResults"] = 4
    result = transfer.map_case(geocoder, packet["lone-oak-pmbc.json"])
    assert result["status"] == "ambiguous"
    assert len(result["geocoder_candidates"]) == len(geocoder["features"])
    assert result["candidates"] == []
    assert result["parcel_match_verified"] is False
    with pytest.raises(ValueError, match="features"):
        transfer.map_case({"features": None}, None)
