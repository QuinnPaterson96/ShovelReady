"""Scaffold only: no ingestion, database connections, or schema creation at startup."""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.address_search.api import router as address_search_router
from app.case_preparations.api import router as case_preparations_router
from app.conditional_screening.api import router as conditional_screening_router
from app.draft_evaluations.api import router as draft_evaluations_router
from app.identity import AppIdentity, capture_identity
from app.investigation import router
from app.municipal_sites.api import router as municipal_sites_router
from app.reference_cases import router as reference_cases_router
from app.scouting_geometry.api import router as scouting_geometry_router
from app.scouting_sites.api import router as scouting_sites_router
from app.site_preparations.api import router as site_preparations_router
from app.victoria_zoning.api import router as victoria_zoning_router

FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"


def create_app(*, frontend_dist: Path = FRONTEND_DIST) -> FastAPI:
    environment = os.environ.get("SHOVELREADY_ENV", "development")
    if environment not in {"development", "test", "demo"}:
        raise RuntimeError(
            "SHOVELREADY_ENV must be development, test or demo; "
            "production deployment is not configured"
        )
    if environment == "demo":
        if not (frontend_dist / "index.html").is_file():
            raise RuntimeError("Hosted demo requires the built frontend")
        if os.environ.get("SHOVELREADY_DATABASE_URL") or os.environ.get(
            "SHOVELREADY_DRAFT_EVALUATIONS_ENABLED"
        ) == "true":
            raise RuntimeError("Hosted demo is stateless; database access must remain disabled")
    mcp_manager = None
    mcp_route = None
    if os.environ.get("SHOVELREADY_MCP_ENABLED") == "true":
        from app.mcp_demo.http import build_http

        app_url = os.environ.get("SHOVELREADY_MCP_APP_URL", "http://127.0.0.1:5173/")
        parsed = urlsplit(app_url)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise RuntimeError(
                "MCP app handoff must be a configured HTTP(S) URL without private data"
            )
        mcp_manager, mcp_route = build_http(app_url=app_url)

    @asynccontextmanager
    async def lifespan(_application):
        if mcp_manager is None:
            yield
        else:
            async with mcp_manager.run():
                yield

    application = FastAPI(title="ShovelReady", version="0.1.0", lifespan=lifespan)
    if mcp_route is not None:
        application.router.routes.append(mcp_route)

    application.include_router(address_search_router)
    application.include_router(municipal_sites_router)
    application.include_router(victoria_zoning_router)
    application.include_router(case_preparations_router)
    application.include_router(conditional_screening_router)
    application.include_router(router)
    application.include_router(draft_evaluations_router)
    application.include_router(reference_cases_router)
    application.include_router(scouting_geometry_router)
    application.include_router(scouting_sites_router)
    application.include_router(site_preparations_router)
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
