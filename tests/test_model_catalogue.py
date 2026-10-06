"""Offline provenance and measurement boundary checks for real unreviewed candidates."""

from copy import deepcopy
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.model_catalogue import Catalogue, load_catalogue


def test_snapshot_candidates_and_unknown_regulatory_height():
    catalogue = load_catalogue()
    assert len(catalogue.models) == 3
    assert {model.model_id for model in catalogue.models} == {"click-landing", "aux-240", "aux-300"}
    for model in catalogue.models:
        assert model.review_status == "unreviewed"
        assert model.sources and all(source.url.startswith("https://") for source in model.sources)
        assert next(m for m in model.measurements if m.name == "roof_height").quantity is None
        assert model.source_revision is None
    landing = catalogue.models[0]
    assert landing.service_area_status == "excluded_by_provider"
    assert (
        next(m for m in landing.measurements if m.name == "manufacturer_footprint").quantity is None
    )
    height = next(
        m for m in catalogue.models[1].measurements if m.name == "advertised_overall_height"
    )
    assert height.quantity.value == Decimal("3.1242")
    # Reviewed public headline / FAQ wording, not values copied from normalization.
    model = catalogue.models[2]
    assert model.prices[0].amount.minimum == Decimal("187000")
    assert model.prices[0].currency == "CAD"
    assert model.prices[0].tax_treatment is None
    assert model.prices[0].region is None
    assert model.timings[0].stage == "contract_to_delivery"
    assert model.timings[0].scope == "provider"
    assert model.timings[0].duration.maximum == Decimal("18")
    assert model.timings[0].clock_start == "Purchase contract"
    assert model.timings[1].stage == "on_site_installation"
    assert all(t.stage not in {"delivery", "production_lead_time"} for t in model.timings)
    assert model.sources[0].captured_at == "2026-09-25"
    assert model.sources[-1].captured_at == "2026-10-06"


def test_older_snapshot_omissions_remain_unknown():
    data = load_catalogue().model_dump(mode="json")
    for model in data["models"]:
        model.pop("prices")
        model.pop("timings")
        for source in model["sources"]:
            source.pop("updated_at")
    old = Catalogue.model_validate(data)
    assert all(model.prices == () and model.timings == () for model in old.models)


@pytest.mark.parametrize(
    "field,value",
    [
        ("currency", "cad"),
        ("currency", "ZZZ"),
        ("amount", {"minimum": "-1"}),
        ("amount", {"minimum": True}),
        ("amount", {"minimum": "NaN"}),
        ("amount", {"minimum": "Infinity"}),
        ("amount", {"minimum": "10", "maximum": "9"}),
        ("source_id", "missing"),
    ],
)
def test_commercial_import_rejects_invalid_prices(field, value):
    # Currency ambiguity, nonfinite/negative money and reversed ranges could mislead enquiries.
    data = load_catalogue().model_dump(mode="json")
    data["models"][2]["prices"][0][field] = value
    with pytest.raises(ValidationError):
        Catalogue.model_validate(data)


@pytest.mark.parametrize(
    "field,value",
    [
        ("unit", "m"),
        ("unit", None),
        ("duration", None),
        ("duration", {"minimum": "18", "maximum": "12"}),
        ("duration", {"minimum": "-1"}),
        ("source_id", "missing"),
    ],
)
def test_commercial_import_rejects_invalid_timing(field, value):
    data = load_catalogue().model_dump(mode="json")
    data["models"][2]["timings"][0][field] = value
    with pytest.raises(ValidationError):
        Catalogue.model_validate(data)


def test_multiple_and_unknown_claim_values_survive_round_trip():
    data = load_catalogue().model_dump(mode="json")
    model = data["models"][2]
    model["prices"].append({**model["prices"][0], "amount": None, "currency": None})
    model["timings"].append({**model["timings"][0], "duration": None, "unit": None})
    parsed = Catalogue.model_validate_json(Catalogue.model_validate(data).model_dump_json())
    assert parsed.models[2].prices[1].amount is None
    assert parsed.models[2].prices[1].currency is None
    assert parsed.models[2].timings[2].duration is None


@pytest.mark.parametrize(
    "mutation",
    [
        lambda data: data["models"][0]["measurements"][0]["quantity"].update(original_unit="ft2"),
        lambda data: data["models"][0]["measurements"][0].update(source_id="nonexistent"),
        lambda data: data["models"][0]["measurements"][5].update(status="known", reason=None),
    ],
)
def test_rejects_incompatible_units_source_and_missing_height(mutation):
    data = deepcopy(load_catalogue().model_dump(mode="json"))
    mutation(data)
    with pytest.raises(ValidationError):
        Catalogue.model_validate(data)
