"""Scaffold only: no ingestion, database connections, or schema creation at startup."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.draft_evaluations.api import router as draft_evaluations_router
from app.identity import AppIdentity, capture_identity
from app.investigation import router
from app.reference_cases import router as reference_cases_router

FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"


def create_app(*, frontend_dist: Path = FRONTEND_DIST) -> FastAPI:
    environment = os.environ.get("SHOVELREADY_ENV", "development")
    if environment not in {"development", "test"}:
        raise RuntimeError(
            "SHOVELREADY_ENV must be development or test; deployment is not configured"
        )
    application = FastAPI(title="ShovelReady", version="0.1.0")

    application.include_router(router)
    application.include_router(draft_evaluations_router)
    application.include_router(reference_cases_router)
    identity = capture_identity()

    @application.get("/api/identity", response_model=AppIdentity)
    def app_identity() -> AppIdentity:
        return identity

    @application.get("/health")
    def health() -> dict[str, str]:
        """Process liveness only; does not assert data or database readiness."""
        return {"status": "ok"}

    @application.get("/", response_model=None)
    def home() -> FileResponse | JSONResponse:
        index = frontend_dist / "index.html"
        if index.is_file():
            return FileResponse(index)
        return JSONResponse(
            {"detail": "Frontend is not built. Run npm ci and npm run build in frontend/."},
            status_code=503,
        )

    if (frontend_dist / "assets").is_dir():
        application.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")
    return application


app = create_app()
