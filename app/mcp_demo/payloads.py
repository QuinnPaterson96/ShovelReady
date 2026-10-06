"""Typed v1 tool boundaries; source payloads retain their existing version contracts."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.address_search.models import SearchRequest as AddressRequest
from app.address_search.models import SearchResponse as AddressResponse
from app.conditional_screening.api import Property
from app.conditional_screening.payloads import Result as ConditionalResult
from app.conditional_screening.scenarios import ScenarioRequest, ScenarioResult
from app.model_catalogue.catalogue import Model
from app.municipal_sites.api import ObserveRequest, ObserveResponse
from app.municipal_sites.api import SearchRequest as ParcelRequest
from app.municipal_sites.api import SearchResponse as ParcelResponse
from app.scouting_geometry.payloads import Assessment


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class ModelsInput(Strict):
    model_id: str | None = Field(default=None, max_length=80)


class LookupInput(Strict):
    municipality: str = Field(min_length=1, max_length=80)
    address_search: AddressRequest | None = None
    parcel_search: ParcelRequest | None = None
    observe: ObserveRequest | None = None
    selection_confirmed: bool = False

    @model_validator(mode="after")
    def one_stage(self):
        if sum(x is not None for x in (self.address_search, self.parcel_search, self.observe)) != 1:
            raise ValueError("supply exactly one lookup stage")
        if (self.parcel_search or self.observe) and not self.selection_confirmed:
            raise ValueError("confirm the selected address/PID or parcel before the next stage")
        return self


class ModelSelection(Strict):
    model_id: str = Field(min_length=1, max_length=80)
    catalogue_snapshot_id: str = Field(min_length=1, max_length=240)
    input_revision: str = Field(min_length=1, max_length=240)
    dimension_origin: Literal["provider_nominal", "user"]
    dimension_note: str | None = Field(default=None, max_length=1000)


class ScreenInput(Strict):
    municipality: str = Field(min_length=1, max_length=80)
    pathway: str = Field(min_length=1, max_length=80)
    selected_property: Property
    property_selection_confirmed: bool
    selected_model: ModelSelection
    scenario: ScenarioRequest | None = None


class Evidence(Strict):
    provider: str
    record_label: str
    capture_date: str | None
    review_status: str
    source_url: str | None


class Handoff(Strict):
    url: str
    mode: Literal["manual_reentry"] = "manual_reentry"
    steps: tuple[str, ...] = (
        "Open Model 300, look up and confirm the same property.",
        "Supply the same placement and assumptions in the map; compare results.",
        "Use the website's copy enquiry action to prepare an unsent provider enquiry.",
    )
    limitation: str = (
        "The website has no scenario-import or URL-resume contract. This link opens the "
        "application home; it does not restore the selected property, placement or evidence. "
        "Exact inputs remain in technical_details for manual re-entry."
    )


class Details(Strict):
    catalogue_snapshot_id: str | None = None
    models: tuple[Model, ...] = ()
    address_search: AddressResponse | None = None
    parcel_search: ParcelResponse | None = None
    observation: ObserveResponse | None = None
    screen_input: ScreenInput | None = None
    geometry: Assessment | None = None
    scenarios: ScenarioResult | None = None
    conditional: ConditionalResult | None = None


class Response(Strict):
    schema_version: Literal["shovelready-mcp.result.v1"] = "shovelready-mcp.result.v1"
    status: Literal[
        "available",
        "choose_candidate",
        "needs_input",
        "placement_conflict",
        "scenario_conflict",
        "partial",
        "unsupported",
        "unavailable",
        "no_match",
    ]
    summary: str
    coverage: str = (
        "aux box Model 300; City of Victoria ordinary garden-suite candidate checks and "
        "supplied-placement observations only. Rules and source observations are unreviewed; "
        "no accepted zoning release or permit determination."
    )
    next_actions: tuple[str, ...]
    evidence: tuple[Evidence, ...] = ()
    material_assumptions: tuple[str, ...] = ()
    handoff: Handoff
    technical_details: Details = Details()
