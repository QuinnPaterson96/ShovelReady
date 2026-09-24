"""Licensed observation reader; no artifact access, import or publication."""

import hashlib
import json
import os
import re
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException
from pydantic import AwareDatetime, ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.contracts.common import Contract, Digest, SourceSnapshot, Text
from app.persistence import Repository, connect
from app.spatial.payloads import SpatialImport

COLLECTION = "victoria-pilot-three-leads"
PINS = json.loads(Path(__file__).with_name("pins.json").read_text())


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    ).hexdigest()


def safe_url(value: str) -> str:
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in {"maps.victoria.ca", "opendata.victoria.ca", "www.arcgis.com"}
        or parsed.username
        or parsed.password
        or parsed.port not in {None, 443}
        or any(ord(c) < 33 for c in value)
        or "\\" in value
    ):
        raise ValueError("Unsupported source URL")
    return value


class SourceMetadata(Contract):
    source_id: Text
    snapshot_id: Text
    source_url: Text
    sha256: Digest
    captured_at: AwareDatetime
    printed_revision: Text | None
    effective_from: None = None
    effective_to: None = None
    original_crs: Text | None
    original_units: tuple[Text, ...]
    attribution: Text
    review_status: Literal["unreviewed"] = "unreviewed"


class Investigation(Contract):
    schema_version: Literal["sr-12.observations.v1"] = "sr-12.observations.v1"
    screening_status: Literal["not_performed"] = "not_performed"
    spatial: SpatialImport
    sources: tuple[SourceMetadata, ...]


def read_investigation(repository: Repository, revision: str) -> Investigation:
    retained = repository.get("spatial", revision)
    spatial = SpatialImport.model_validate(retained.model_dump(mode="json"))
    if (
        spatial.identity.logical_id != COLLECTION
        or spatial.identity.revision_id != revision
        or set(spatial.source_snapshot_ids) != set(PINS["sources"])
    ):
        raise ValueError("Outside licensed collection")
    if revision != "spatial:sha256:" + digest(
        spatial.model_dump(mode="json", exclude={"identity"})
    ):
        raise ValueError("Revision integrity mismatch")
    sources = []
    for sid in spatial.source_snapshot_ids:
        retained = repository.get("source", sid)
        source = SourceSnapshot.model_validate(retained.model_dump(mode="json"))
        if digest(source.model_dump(mode="json")) != PINS["sources"][sid]:
            raise ValueError("Source outside pinned licensed metadata")
        sources.append(
            SourceMetadata(
                source_id=source.source_id,
                snapshot_id=source.snapshot_id,
                source_url=safe_url(source.source_url),
                sha256=source.artifact.sha256,
                captured_at=source.captured_at,
                printed_revision=source.printed_revision,
                original_crs=source.original_crs,
                original_units=source.original_units,
                attribution=source.reuse_constraints,
            )
        )
    if {o.snapshot_id for o in spatial.observations} != set(PINS["observations"]):
        raise ValueError("Unexpected observations")
    for observation in spatial.observations:
        if (
            digest(observation.model_dump(mode="json"))
            != PINS["observations"][observation.snapshot_id]
        ):
            raise ValueError("Observation outside licensed capture")
        safe_url(observation.layer_url)
        safe_url(observation.request_url)
    return Investigation(spatial=spatial, sources=tuple(sources))


router = APIRouter(prefix="/api/investigation", tags=["Unreviewed licensed observations"])


@router.get("", response_model=Investigation)
def investigation() -> Investigation:
    url = os.environ.get("SHOVELREADY_DATABASE_URL")
    revision = os.environ.get("SHOVELREADY_SPATIAL_REVISION")
    collection = os.environ.get("SHOVELREADY_SPATIAL_COLLECTION")
    if (
        not url
        or not revision
        or collection != COLLECTION
        or not re.fullmatch(r"spatial:sha256:[0-9a-f]{64}", revision)
    ):
        raise HTTPException(503, "Investigation configuration unavailable")
    engine = None
    try:
        engine = connect(url)
        return read_investigation(Repository(engine), revision)
    except ValidationError:
        raise HTTPException(502, "Stored investigation payload is invalid") from None
    except ValueError as error:
        if str(error).startswith("Missing spatial record:"):
            raise HTTPException(404, "Selected spatial revision unavailable") from None
        raise HTTPException(502, "Stored investigation or configuration is invalid") from None
    except SQLAlchemyError:
        raise HTTPException(503, "Investigation database unavailable") from None
    finally:
        if engine is not None:
            engine.dispose()
