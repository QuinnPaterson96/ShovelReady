"""Size-bounded, stateless suggestion endpoint; CPU work runs outside the event loop."""

import json

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request as HttpRequest

from app.scouting_geometry.api import MAX_BYTES, _complexity

from .core import Request, Result, suggest

router = APIRouter()


@router.post("/api/placement-suggestions/v1/suggest", response_model=Result)
async def suggest_placement(http_request: HttpRequest) -> Result:
    chunks, size = [], 0
    async for chunk in http_request.stream():
        size += len(chunk)
        if size > MAX_BYTES:
            raise HTTPException(413, "Request exceeds 200 kB")
        chunks.append(chunk)
    try:
        data = json.loads(b"".join(chunks))
    except (ValueError, UnicodeDecodeError, RecursionError):
        raise HTTPException(422, "Malformed JSON") from None
    _complexity(data)
    try:
        # JSON arrays are the wire representation of the strict scenario tuples.
        payload = Request.model_validate_json(b"".join(chunks))
    except ValidationError as exc:
        raise HTTPException(422, exc.errors(include_input=False, include_context=False)) from None
    if any(
        len(items) > 50
        for items in (
            payload.geometry.buildings,
            payload.geometry.named_boundaries,
            payload.geometry.requirements,
        )
    ):
        raise HTTPException(413, "Too many features or requirements")
    return await run_in_threadpool(suggest, payload)
