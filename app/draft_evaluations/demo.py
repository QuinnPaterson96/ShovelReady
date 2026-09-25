"""Repository-owned inputs; aliases never select arbitrary files or records."""

from pathlib import Path

from app.evaluation import EvaluationRequest

ROOT = Path(__file__).with_name("inputs")
CASES = (
    "synthetic-direct-pass",
    "synthetic-missing-fact",
    "synthetic-placement-failure",
)


def request_for(case_id: str) -> EvaluationRequest:
    if case_id not in CASES:
        raise ValueError("Unknown synthetic case")
    return EvaluationRequest.model_validate_json((ROOT / f"{case_id}.json").read_bytes())
