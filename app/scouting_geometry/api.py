"""Bounded stateless supplied-placement measurements."""

import json

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from starlette.requests import Request as HttpRequest

from .core import assess
from .payloads import Assessment, Request

router = APIRouter()
MAX_BYTES = 200_000
MAX_NODES = 10_000
MAX_GEOMETRY_NUMBERS = 4_000


def _complexity(value):
    nodes = 0
    numbers = 0
    stack = [value]
    while stack:
        item = stack.pop()
        nodes += 1
        if nodes > MAX_NODES:
            raise HTTPException(413, "Request structure is too complex")
        if isinstance(item, dict):
            stack.extend(item.values())
        elif isinstance(item, list):
            stack.extend(item)
        elif isinstance(item, (int, float)) and not isinstance(item, bool):
            numbers += 1
            if numbers > MAX_GEOMETRY_NUMBERS:
                raise HTTPException(413, "Request geometry is too complex")


@router.post("/api/scouting-geometry/assess", response_model=Assessment)
async def assess_placement(http_request: HttpRequest) -> Assessment:
    size = 0
    chunks = []
    async for chunk in http_request.stream():
        size += len(chunk)
        if size > MAX_BYTES:
            raise HTTPException(413, "Request exceeds 200 kB")
        chunks.append(chunk)
    try:
        data = json.loads(b"".join(chunks))
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(422, "Malformed JSON") from None
    _complexity(data)
    try:
        payload = Request.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(422, exc.errors(include_input=False)) from None
    if any(
        len(items) > 50
        for items in (payload.buildings, payload.named_boundaries, payload.requirements)
    ):
        raise HTTPException(413, "Too many features or requirements")
    return assess(payload)
