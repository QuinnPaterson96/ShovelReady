"""Conditional, assumption-based comparisons; separate from accepted evaluation."""

from .core import evaluate
from .payloads import Fact, Quantity, Request, Result, Rule

__all__ = ["Fact", "Quantity", "Request", "Result", "Rule", "evaluate"]
