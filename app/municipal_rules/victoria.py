"""Compatibility adapter for the existing Victoria candidate comparisons."""

import json

from app.conditional_screening.api import ApiRequest, _assemble, _packet
from app.conditional_screening.core import evaluate as compare
from app.conditional_screening.scenarios import ScenarioRequest, screen

from .models import Profile


def profile() -> Profile:
    return Profile(
        jurisdiction_id="ca-bc-victoria",
        name="City of Victoria",
        locality="victoria",
        aliases=("city of victoria",),
        parcel_source="city-of-victoria-pid-parcels",
        capabilities=(
            "parcels",
            "buildings",
            "street_edges",
            "waterfront_edges",
            "zoning_lookup",
            "property_scan",
            "screening",
            "placement_scenarios",
        ),
        pathway_id="victoria-grd1-garden-suite",
        label="Victoria garden-suite comparisons",
        revision=_packet()["packet_revision"],
        scope="Preliminary Victoria GRD-1 garden-suite comparisons under stated assumptions.",
    )


def evaluate(payload: dict):
    return compare(_assemble(ApiRequest.model_validate_json(json.dumps(payload)))), ()


def scenarios(payload: dict):
    return screen(ScenarioRequest.model_validate_json(json.dumps(payload)))
