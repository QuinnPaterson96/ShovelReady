"""Stateless municipal dispatch. Existing Victoria endpoints remain compatible."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import ValidationError

from .models import EvaluationRequest, EvaluationResult
from .registry import catalogue, evaluate, selected

router = APIRouter(prefix="/api/municipal-rules/v1", tags=["municipal-rules"])


@router.get("/catalogue")
def get_catalogue():
    return catalogue()


@router.post("/evaluate", response_model=EvaluationResult)
async def municipal_evaluate(request: Request):
    raw = await request.body()
    if len(raw) > 131_072:
        raise HTTPException(status_code=413, detail="request too large")
    try:
        return evaluate(EvaluationRequest.model_validate_json(raw))
    except (ValidationError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail="Invalid municipal request or unsupported "
            "municipality/pathway. Check input definitions and property identity.",
        ) from exc


@router.post("/placement-scenarios")
async def municipal_scenarios(request: Request):
    raw = await request.body()
    if len(raw) > 131_072:
        raise HTTPException(status_code=413, detail="request too large")
    try:
        body = EvaluationRequest.model_validate_json(raw)
        package = selected(body)
        if "placement_scenarios" not in package.profile().capabilities:
            raise ValueError("Placement scenarios are outside this package's scope")
        return package.scenarios(body.payload)
    except (ValidationError, ValueError) as exc:
        raise HTTPException(
            status_code=422, detail="Invalid or unsupported municipal scenario"
        ) from exc
