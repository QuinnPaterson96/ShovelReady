"""Read-only opt-in access to exact repository-owned synthetic reports."""

import os

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.evaluation import EvaluationReport, evaluate
from app.persistence import Repository, connect

from .demo import CASES, request_for

router = APIRouter(prefix="/api/draft-evaluations", tags=["Synthetic draft evaluations"])


@router.get("/{case_id}", response_model=EvaluationReport)
def draft_evaluation(case_id: str) -> EvaluationReport:
    if os.environ.get("SHOVELREADY_DRAFT_EVALUATIONS_ENABLED") != "true":
        raise HTTPException(503, "Draft evaluation demo is disabled")
    if case_id not in CASES:
        raise HTTPException(404, "Synthetic case unavailable")
    url = os.environ.get("SHOVELREADY_DATABASE_URL")
    if not url:
        raise HTTPException(503, "Draft evaluation database unavailable")
    engine = None
    try:
        expected = request_for(case_id)
        try:
            engine = connect(url)
        except ValueError:
            raise HTTPException(503, "Draft evaluation database unavailable") from None
        try:
            stored = Repository(engine).get("draft_evaluation", expected.evaluation_id)
        except ValidationError:
            raise
        except ValueError:
            raise HTTPException(404, "Synthetic case has not been imported") from None
        report = EvaluationReport.model_validate(stored.model_dump(mode="json"))
        if (
            report.request.model_dump(mode="json") != expected.model_dump(mode="json")
            or report.model_dump(mode="json") != evaluate(expected).model_dump(mode="json")
        ):
            raise ValueError("Pinned request or computed report mismatch")
        return report
    except (ValueError, OSError):
        raise HTTPException(502, "Stored draft evaluation is invalid") from None
    except SQLAlchemyError:
        raise HTTPException(503, "Draft evaluation database unavailable") from None
    finally:
        if engine is not None:
            engine.dispose()
