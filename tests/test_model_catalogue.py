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
