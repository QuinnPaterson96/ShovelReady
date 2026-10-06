"""Presentation adapter only. Calculations belong to the existing screening services."""

from decimal import Decimal

from app.address_search.provider import GeocoderClient
from app.conditional_screening.api import ApiRequest, _assemble
from app.conditional_screening.core import evaluate
from app.conditional_screening.scenarios import screen
from app.model_catalogue.catalogue import load_catalogue
from app.municipal_sites import api as municipal
from app.scouting_geometry.core import assess

from .payloads import (
    Details,
    Evidence,
    Handoff,
    LookupInput,
    ModelsInput,
    Response,
    ScreenInput,
)

MODEL_ID = "aux-300"


class Correction(ValueError):
    """A safe, actionable error authored here, never an upstream diagnostic."""


def model_record():
    catalogue = load_catalogue()
    return catalogue, next(model for model in catalogue.models if model.model_id == MODEL_ID)


def model_evidence(model):
    return tuple(
        Evidence(
            provider=model.provider,
            record_label=f"{model.name}: {source.locator}",
            capture_date=source.captured_at,
            review_status=model.review_status,
            source_url=source.url,
        )
        for source in model.sources
    )


class DemoService:
    def __init__(self, *, app_url: str):
        self.handoff = Handoff(url=app_url)

    def response(self, status, summary, actions, *, evidence=(), details=None, assumptions=()):
        return Response(
            status=status,
            summary=summary,
            next_actions=actions,
            evidence=evidence,
            handoff=self.handoff,
            material_assumptions=assumptions,
            technical_details=details or Details(),
        )

    def unsupported(self):
        return self.response(
            "unsupported",
            "This model, municipality or pathway is outside the demo coverage.",
            (
                "Use aux-300 in the City of Victoria garden-suite pathway, "
                "or seek the applicable provider/municipal review.",
            ),
        )

    def models(self, body: ModelsInput) -> Response:
        if body.model_id not in (None, MODEL_ID):
            return self.unsupported()
        catalogue, model = model_record()
        return self.response(
            "available",
            "aux box Model 300 is available as an unreviewed provider snapshot. "
            "Manufacturer revision is not supplied; installed height remains unresolved.",
            (
                "Choose the property, then supply a placement using the published nominal "
                "dimensions or explicitly attributed user dimensions.",
            ),
            evidence=model_evidence(model),
            details=Details(catalogue_snapshot_id=catalogue.snapshot_id, models=(model,)),
        )

    def lookup(self, body: LookupInput) -> Response:
        if body.municipality.casefold().strip() != "victoria":
            return self.unsupported()
        if body.address_search:
            found = GeocoderClient().search(body.address_search)
            evidence = (
                ()
                if not found.source
                else (
                    Evidence(
                        provider=found.source.provider,
                        record_label="Address candidates",
                        capture_date=found.source.fetchedAt.isoformat(),
                        review_status=found.source.reviewStatus,
                        source_url=found.source.sourceUrl,
                    ),
                )
            )
            status = (
                "choose_candidate"
                if found.candidates
                else "no_match"
                if found.status == "no_match"
                else "unavailable"
            )
            return self.response(
                status,
                "Choose an address explicitly; geocoder rank does not confirm a parcel."
                if found.candidates
                else "No usable address candidate was returned.",
                (
                    "Ask the user to select a City of Victoria address before parcel search. "
                    "Other localities in geocoder results remain outside coverage.",
                ),
                evidence=evidence,
                details=Details(address_search=found),
            )
        if body.parcel_search:
            found = municipal.SearchResponse.model_validate(municipal.search(body.parcel_search))
            return self.response(
                "choose_candidate" if found.candidates else "no_match",
                "Select a parcel explicitly; the source join is unreviewed."
                if found.candidates
                else "No parcel matched within the bounded City query.",
                ("Confirm the parcel reference and PID before requesting its observation.",),
                evidence=self.municipal_evidence(found.evidence),
                details=Details(parcel_search=found),
            )
        found = municipal.ObserveResponse.model_validate(municipal.observe(body.observe))
        return self.response(
            "available" if found.status == "available" else "needs_input",
            "Parcel and intersecting rooflines returned; main-building identity is not inferred."
            if found.status == "available"
            else "Parcel observation needs correction or follow-up.",
            (
                "Supply a placement and explicitly identify the main building if known. "
                "Retain roofline basis and observation completeness; do not assume surveyed walls.",
            ),
            evidence=self.municipal_evidence(found.evidence),
            details=Details(observation=found),
        )

    @staticmethod
    def municipal_evidence(items):
        return tuple(
            Evidence(
                provider=item.provider,
                record_label=item.record_label,
                capture_date=item.captured_at_utc,
                review_status=item.review_status,
                source_url=item.source_url,
            )
            for item in items
        )

    def screening(self, body: ScreenInput) -> Response:
        if (
            body.municipality.casefold().strip() != "victoria"
            or body.pathway != "garden_suite"
            or body.selected_model.model_id != MODEL_ID
        ):
            return self.unsupported()
        catalogue, model = model_record()
        if body.selected_model.catalogue_snapshot_id != catalogue.snapshot_id:
            raise Correction(
                "Model snapshot is stale. Call supported_models and reselect Model 300."
            )
        details = Details(
            catalogue_snapshot_id=catalogue.snapshot_id, models=(model,), screen_input=body
        )
        if not body.property_selection_confirmed:
            return self.response(
                "needs_input",
                "Confirm the selected property before screening.",
                ("Ask the user to confirm the parcel selection.",),
                details=details,
            )
        if body.scenario is None:
            return self.response(
                "needs_input",
                "No placement supplied; no fit checks ran.",
                (
                    "Open the map and supply the placement, property geometry and "
                    "material assumptions. Do not invent a placement.",
                ),
                evidence=model_evidence(model),
                details=details,
            )
        scenario = body.scenario
        if scenario.model_revision != body.selected_model.input_revision:
            raise Correction("Scenario model revision differs from the selected model inputs.")
        if scenario.assumptions.property != body.selected_property:
            raise Correction("Scenario property differs from the selection. Reselect the property.")
        placement = scenario.geometry.placement
        if body.selected_model.dimension_origin == "provider_nominal":
            measures = {item.name: item.quantity for item in model.measurements}
            if (
                Decimal(str(placement.width_m)) != measures["nominal_exterior_width"].value
                or Decimal(str(placement.depth_m)) != measures["nominal_exterior_depth"].value
            ):
                raise Correction(
                    "Dimensions differ from Model 300's nominal width/length. "
                    "Correct them or attribute user dimensions with a note."
                )
        elif not body.selected_model.dimension_note:
            raise Correction("Explain user-supplied dimensions in dimension_note.")
        if any(
            len(items) > 50
            for items in (
                scenario.geometry.buildings,
                scenario.geometry.named_boundaries,
                scenario.geometry.requirements,
            )
        ):
            raise Correction("Reduce the supplied geometry to at most 50 features/requirements.")
        geometry = assess(scenario.geometry)
        scenarios = screen(scenario)
        conditional = evaluate(
            _assemble(
                ApiRequest(
                    schema_version="conditional-screening.api.v1",
                    assumptions=scenario.assumptions,
                    model_revision=scenario.model_revision,
                    proposal=scenario.proposal,
                    proposal_evidence=scenario.proposal_evidence,
                )
            )
        )
        details = details.model_copy(
            update={
                "geometry": geometry,
                "scenarios": scenarios,
                "conditional": conditional,
            }
        )
        # Explain findings without turning a check count or boundary pass into an overall fit.
        conflicts = any(
            check.relation in ("positive_area_overlap", "outside")
            or check.comparison == "shortfall"
            for check in geometry.checks
        )
        conflicts |= scenarios.status == "apparent_conflict"
        conflicts |= any(check.status == "conflict" for check in scenarios.additional_checks)
        scenario_conflicts = any(
            check.status == "apparent_conflict_under_assumptions" for check in conditional.checks
        )
        actions = []
        if conflicts:
            status, summary = "placement_conflict", "This supplied placement has a conflict."
            actions.append("Move or revise this placement in the map and screen again.")
        elif scenario_conflicts:
            status, summary = "scenario_conflict", "A stated scenario fact conflicts with a check."
            actions.append(
                "Review the conflicting conditional finding and correct the fact "
                "or ask the municipality/provider about the applicable pathway."
            )
        elif scenarios.status == "unresolved":
            status, summary = "needs_input", scenarios.reason
            actions.append("Correct the property, placement or pathway inputs identified above.")
        else:
            status, summary = (
                "partial",
                (
                    "Partial screening is ready; resolve material questions before deciding "
                    "whether to enquire."
                ),
            )
        if scenarios.status == "clarify":
            actions.append("Clarify street-facing and boundary roles; they change this comparison.")
        for check in scenarios.additional_checks:
            if check.status in ("unknown", "unsupported"):
                actions.append(f"{check.label}: {check.detail}")
        actions.append(
            "Review the conditional findings and stated assumptions with the provider; "
            "the website can prepare an unsent enquiry."
        )
        questions = {
            "proposed_suite_total": "How many garden suites already exist? Use unknown if unsure.",
            "legal_lot": "Verify the legal lot identity.",
            "principal_building": "Identify the main building explicitly.",
            "zone": "Confirm the applicable City zone from municipal evidence.",
            "instrument": "Confirm the applicable zoning bylaw from municipal evidence.",
            "building_type": "Clarify the existing building type.",
            "floor_area_definition": "Clarify the local floor-area measurement basis.",
            "no_relevant_projections": "Check relevant roof/deck projections with the provider.",
            "foundation": "Clarify the proposed foundation attachment.",
            "proposed_use": "Clarify the proposed garden-suite use.",
        }
        missing_ids = {
            check.rule.fact_id
            for check in conditional.checks
            if check.status == "needs_information"
            and (check.fact is None or check.fact.status == "unknown")
        }
        followups = [question for key, question in questions.items() if key in missing_ids]
        if followups:
            actions.insert(
                1 if conflicts else 0,
                " ".join(followups[:2]),
            )
        sources = tuple(
            Evidence(
                provider=s["provider"],
                record_label=s["record_label"],
                capture_date=s["capture_date"],
                review_status=s["review_status"],
                source_url=s["url"],
            )
            for s in scenarios.sources[:1]
        )
        property_source = scenario.geometry.parcel.source
        evidence = (
            Evidence(
                provider=property_source.provider,
                record_label=property_source.record_label,
                capture_date=property_source.capture_date,
                review_status=property_source.review_status,
                source_url=property_source.reference,
            ),
            *model_evidence(model),
            *sources,
        )
        assumptions = []
        for name, label in (
            ("building_type", "Existing building type"),
            ("existing_garden_suites", "Existing garden suites"),
            ("principal_building_id", "Main building"),
            ("waterfront", "Waterfront"),
        ):
            fact = getattr(scenario.assumptions, name)
            state = getattr(fact, "evidence_state", None) or "assumed"
            state = {
                "user_confirmed": "user-confirmed; not independently verified",
                "assumed": "assumed",
                "unknown": "unknown",
            }[state]
            origin = "journey default" if fact.origin == "journey_default" else "user input"
            value = "unknown" if fact.value is None else str(fact.value)
            assumptions.append(f"{label}: {value} ({state}; {origin}).")
        if scenario.proposal_evidence:
            for name in type(scenario.proposal_evidence).model_fields:
                fact = getattr(scenario.proposal_evidence, name)
                if fact.origin in ("journey_default", "user", "user_confirmed"):
                    origin = {
                        "journey_default": "journey default; assumed",
                        "user": "user assumption",
                        "user_confirmed": "user-confirmed; not independently verified",
                    }[fact.origin]
                    assumptions.append(f"{name.replace('_', ' ')}: {fact.value} ({origin}).")
        return self.response(
            status,
            summary,
            tuple(actions[:3]),
            evidence=evidence,
            details=details,
            assumptions=tuple(assumptions),
        )
