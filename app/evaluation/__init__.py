"""Offline, draft-only scalar evaluation; no publication or geometry inference."""

from .core import evaluate
from .payloads import EvaluationReport, EvaluationRequest

__all__ = ["EvaluationReport", "EvaluationRequest", "evaluate"]
