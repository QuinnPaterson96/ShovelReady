"""Read-only, fixed-case boundary. Never accepts input paths or runs evaluation."""

import json
from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import JsonValue, StrictBool

from app.case_preparations import core
from app.contracts.common import Contract, Digest, Text
from app.contracts.inputs import DesignRevision, PlacementRevision, SiteRevision
from app.contracts.rules import RuleContent
from app.evaluation.payloads import InputRefs, MeasuredFact


class Citation(core.Link):
    url: Text


class RetainedObservation(core.Observation):
    sources: tuple[Citation, ...]
    eligible_for_historical_fact_fragment: StrictBool


class Diagnostic(Contract):
    code: Text
    detail: Text
    sources: tuple[Citation, ...]
    next_artifact: Text
    scope: Text


class BoundaryError(Contract):
    type: Text
    loc: tuple[str | int, ...]
    msg: Text
    sources: tuple[Citation, ...] = ()


class BoundaryAttempt(Contract):
    boundary: Literal["SourceSnapshot", "EvaluationRequest"]
    item: Text
    errors: tuple[BoundaryError, ...]
    sources: tuple[Citation, ...]
    # Rejected candidate shapes are deliberately retained as JSON, not accepted sources.
    attempted_payload: dict[str, JsonValue] | None = None
    period: Text | None = None


class Fragments(Contract):
    inputs: InputRefs
    facts: tuple[MeasuredFact, ...]
    design: DesignRevision
    site: SiteRevision
    placement: PlacementRevision
    rule_contents: tuple[RuleContent, ...]


class PilotPreparation(Contract):
    schema_version: Literal["pilot-preparation.v1"]
    case_id: Literal["VIC-PC-002"]
    status: Literal["evaluation_not_run"]
    annotation_revision: Text
    annotation_text_sha256: Digest
    source_manifest_text_sha256: Digest
    hash_basis: Text
    selected_period: Literal["2018-proposal"]
    design_date: date
    received_date: date
    historical_cutoff: date
    retained_observations: tuple[RetainedObservation, ...]
    parcel_claims: tuple[core.ParcelClaim, ...]
    later_permit_observations: tuple[dict[str, JsonValue], ...]
    mapped_fragments: Fragments
    boundary_attempts: tuple[BoundaryAttempt, ...]
    diagnostics: tuple[Diagnostic, ...]


def prepare_pilot() -> PilotPreparation:
    return PilotPreparation.model_validate_json(
        json.dumps(core.diagnose(core.ANNOTATIONS.read_bytes(), core.MANIFEST.read_bytes()))
    )


router = APIRouter(prefix="/api/case-preparations", tags=["case preparations"])


@router.get("/pilot", response_model=PilotPreparation, response_model_exclude_unset=True)
def pilot(request: Request, response: Response) -> PilotPreparation:
    if request.query_params:
        raise HTTPException(400, "This fixed preparation does not accept query parameters.")
    response.headers["Cache-Control"] = "no-store"
    try:
        return prepare_pilot()
    except (ValueError, OSError, KeyError, TypeError, RuntimeError):
        raise HTTPException(
            503, "Pilot preparation is unavailable; no evaluation was run."
        ) from None
