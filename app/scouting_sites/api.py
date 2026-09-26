"""Database-free retained site examples."""

import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.scouting_geometry.payloads import Boundary, Building, Capture, Feature

router = APIRouter()
DATA = Path(__file__).with_name("data") / "sites.json"


class Site(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    projected_metre_crs: str
    parcel: Feature
    buildings: tuple[Building, ...]
    named_boundaries: tuple[Boundary, ...]
    capture: Capture


class Case(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    case_id: str
    label: str
    site: Site


class Sites(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal["scouting-sites.v1"]
    cases: tuple[Case, ...]


@lru_cache(maxsize=1)
def packet() -> Sites:
    return Sites.model_validate(json.loads(DATA.read_bytes()))


@router.get("/api/scouting-sites", response_model=Sites)
def scouting_sites() -> Sites:
    return packet()
