"""Storage-only envelopes; SR-04 payloads remain unchanged."""

from typing import Literal

from pydantic import model_validator

from app.contracts.common import Contract, Review, Text
from app.contracts.rules import ExtractionTrace

Kind = Literal[
    "source",
    "design",
    "site",
    "placement",
    "run",
    "candidate",
    "rule",
    "draft",
    "evaluation",
    "review",
    "spatial",
]


class RecordRef(Contract):
    kind: Kind
    record_id: Text


class ExtractionRun(Contract):
    schema_version: Literal["sr-08.v1"] = "sr-08.v1"
    trace: ExtractionTrace


class ReviewEvent(Contract):
    schema_version: Literal["sr-08.v1"] = "sr-08.v1"
    event_id: Text
    target: RecordRef
    decision: Review

    @model_validator(mode="after")
    def attributed_decision(self):
        if self.decision.status == "unreviewed":
            raise ValueError("review history requires an attributed decision")
        if self.target.kind == "review":
            raise ValueError("review the original record with a new event")
        return self
