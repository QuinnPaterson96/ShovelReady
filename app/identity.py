"""Nonsecret process snapshot; never inspect Git or connect to a database here."""

import os
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict


class AppIdentity(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")
    schema_version: Literal["sr-21.identity.v1"] = "sr-21.identity.v1"
    application_commit: str | None = None
    frontend_commit: str | None = None
    spatial_revision: str | None = None
    screening_status: Literal["not_performed"] = "not_performed"


def capture_identity() -> AppIdentity:
    def safe(name, pattern):
        value = os.environ.get(name, "")
        return value if re.fullmatch(pattern, value) else None

    return AppIdentity(
        application_commit=safe("SHOVELREADY_APPLICATION_COMMIT", r"[0-9a-f]{40}"),
        frontend_commit=safe("SHOVELREADY_FRONTEND_COMMIT", r"[0-9a-f]{40}"),
        spatial_revision=safe("SHOVELREADY_SPATIAL_REVISION", r"spatial:sha256:[0-9a-f]{64}"),
    )
