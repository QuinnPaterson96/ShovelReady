"""Version 1 file contracts. Validation establishes structure, never legal truth."""

import hashlib
import json
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints, model_validator

Text = Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1)]
Commit = Annotated[str, StringConstraints(strict=True, pattern=r"^[0-9a-f]{40}$")]
Digest = Annotated[str, StringConstraints(strict=True, pattern=r"^[0-9a-f]{64}$")]
PositiveInt = Annotated[int, Field(strict=True, gt=0)]
Mode = Literal["task_completion", "defect_detection"]


class Record(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, validate_default=True)


class Metadata[T](Record):
    """Required value; null needs a reason and known values forbid an unknown reason."""

    value: T | None
    unknown_reason: Text | None

    @model_validator(mode="after")
    def explicit_unknown(self):
        if (self.value is None) != (self.unknown_reason is not None):
            raise ValueError("null needs an unknown_reason; known values must use null reason")
        return self


class Reference(Record):
    """Opaque pointer, never automatically fetched or executed."""

    uri: Text
    revision: Metadata[Text]
    locator: Text


class Review(Record):
    status: Literal["unreviewed", "reviewed", "independently_reviewed", "disputed"]
    reviewer: Metadata[Text]
    reviewed_at: Metadata[AwareDatetime]
    rationale: Text
    disagreements: tuple[Text, ...]

    @model_validator(mode="after")
    def review_evidence(self):
        if self.status in {"reviewed", "independently_reviewed"}:
            if self.reviewer.value is None or self.reviewed_at.value is None:
                raise ValueError("reviewed status requires reviewer and date")
        if self.status == "disputed" and not self.disagreements:
            raise ValueError("disputed review requires recorded disagreement")
        return self


class ObservableBasis(Record):
    kind: Literal["browser_observation", "task_instruction"]
    description: Text
    evidence: Annotated[tuple[Reference, ...], Field(min_length=1)]


class Expectation(Record):
    check_id: Text
    claim: Text
    kind: Literal["observed_ui_fact", "authored_software_expectation", "legal_expectation"]
    scored: bool = Field(strict=True)
    basis: ObservableBasis | None
    evidence: Annotated[tuple[Reference, ...], Field(min_length=1)]
    review: Review

    @model_validator(mode="after")
    def scored_truth(self):
        if self.scored and self.basis is None:
            raise ValueError("scored checks require browser-observable or task-instruction basis")
        if self.scored and self.review.status == "disputed":
            raise ValueError("disputed expectations cannot be scored")
        if self.scored and self.kind == "legal_expectation":
            if self.review.status != "independently_reviewed":
                raise ValueError("legal expectations need independent review before scoring")
        return self


class SeededFault(Record):
    pair_id: Text
    variant: Literal["clean", "fault"]
    description: Text


class Rubric(Record):
    revision: Text
    expectations: Annotated[tuple[Expectation, ...], Field(min_length=1)]
    disagreements: tuple[Text, ...]
    seeded_fault: SeededFault | None

    @model_validator(mode="after")
    def unique_checks(self):
        _unique([item.check_id for item in self.expectations], "check IDs")
        return self


class CaseDefinition(Record):
    schema_version: Literal["virtual-qa/v1"]
    record_type: Literal["case"]
    case_id: Text
    revision: Text
    category: Text
    evidence_status: Literal["synthetic", "observational", "reviewed"]
    fixtures: Annotated[tuple[Reference, ...], Field(min_length=1)]
    sources: tuple[Reference, ...]
    unknowns: tuple[Text, ...]
    supported_modes: Annotated[tuple[Mode, ...], Field(min_length=1)]
    group: Text
    split: Literal["baseline", "development", "holdout"]
    participant_brief: Text
    facilitator: Rubric

    @model_validator(mode="after")
    def unique_modes(self):
        _unique(list(self.supported_modes), "supported modes")
        return self


def case_digest(case: CaseDefinition) -> str:
    """Hash the complete canonical case, including brief, fixture pins and rubric."""
    wire = json.dumps(
        case.model_dump(mode="json"),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )
    return hashlib.sha256(wire.encode("utf-8")).hexdigest()


class CasePin(Record):
    case_id: Text
    revision: Text
    rubric_revision: Text
    case_sha256: Digest

    @classmethod
    def from_case(cls, case: CaseDefinition):
        return cls(
            case_id=case.case_id,
            revision=case.revision,
            rubric_revision=case.facilitator.revision,
            case_sha256=case_digest(case),
        )


class DataIdentity(Record):
    kind: Literal["observation", "synthetic_fixture", "accepted_release"]
    identity: Metadata[Text]
    revision: Metadata[Text]


class Budget(Record):
    seconds: Metadata[PositiveInt]
    browser_actions: Metadata[PositiveInt]
    cost: Metadata[Text]


class RunRecord(Record):
    schema_version: Literal["virtual-qa/v1"]
    record_type: Literal["run"]
    run_id: Text
    provenance: Literal["participant_run", "report_derived_example"]
    source_report: Reference | None
    attempt: PositiveInt
    retry_of: Text | None
    application_commit: Metadata[Commit]
    frontend_commit: Metadata[Commit]
    cases: Annotated[tuple[CasePin, ...], Field(min_length=1)]
    data: DataIdentity
    selection: Literal["fixed", "seeded"]
    seed: Metadata[Annotated[int, Field(strict=True)]]
    mode: Mode
    participant_prompt: Reference
    model: Metadata[Text]
    model_settings: Metadata[Text]
    tool_settings: Metadata[Text]
    isolation: Text
    rubric_frozen_at: Metadata[AwareDatetime]
    started_at: Metadata[AwareDatetime]
    ended_at: Metadata[AwareDatetime]
    budget: Budget
    status: Literal["prepared", "completed", "timeout", "blocked"]
    final_note: Metadata[Reference]
    evidence: tuple[Reference, ...]

    @model_validator(mode="after")
    def run_consistency(self):
        _unique([pin.case_id for pin in self.cases], "selected case IDs")
        if (self.attempt == 1) != (self.retry_of is None) or self.retry_of == self.run_id:
            raise ValueError("retry must be a distinct linked attempt; first attempt has no parent")
        if self.selection == "seeded" and self.seed.value is None:
            raise ValueError("seeded selection requires a seed")
        if self.selection == "fixed" and self.seed.value is not None:
            raise ValueError("fixed selection has no seed")
        if self.provenance == "report_derived_example" and self.source_report is None:
            raise ValueError("report-derived examples require a source report")
        freeze, start, end = (
            self.rubric_frozen_at.value,
            self.started_at.value,
            self.ended_at.value,
        )
        if freeze is not None and start is not None and freeze > start:
            raise ValueError("rubric must freeze before dispatch")
        if start is not None and end is not None and end < start:
            raise ValueError("end precedes start")
        if self.provenance == "participant_run":
            if freeze is None or (self.status in {"completed", "timeout"} and start is None):
                raise ValueError("new runs require recorded freeze/dispatch times")
            if self.status in {"completed", "timeout"} and end is None:
                raise ValueError("finished runs require an end time")
            if self.status == "completed" and self.final_note.value is None:
                raise ValueError("completed participant runs require a final note")
        return self


class Adjudication(Record):
    status: Literal["unresolved", "disputed", "confirmed", "rejected"]
    reviewer: Metadata[Text]
    reviewed_at: Metadata[AwareDatetime]
    rationale: Text

    @model_validator(mode="after")
    def adjudicated(self):
        if self.status in {"confirmed", "rejected"}:
            if self.reviewer.value is None or self.reviewed_at.value is None:
                raise ValueError("final adjudication requires reviewer and date")
        return self


class Finding(Record):
    schema_version: Literal["virtual-qa/v1"]
    record_type: Literal["finding"]
    finding_id: Text
    revision: Text
    supersedes: Text | None
    run_id: Text
    case_id: Text
    check_id: Text
    category: Literal[
        "app_defect",
        "agent_omission",
        "agent_error",
        "false_alarm",
        "source_data_gap",
        "environment_tool_failure",
        "usability_hypothesis",
    ]
    claim: Text
    supporting_evidence: Annotated[tuple[Reference, ...], Field(min_length=1)]
    contradicting_evidence: tuple[Reference, ...]
    severity: Literal["unknown", "informational", "minor", "major", "critical"]
    reproduction: Literal["not_attempted", "reproduced", "not_reproduced", "blocked"]
    reproduction_evidence: tuple[Reference, ...]
    adjudication: Adjudication
    linked_issue: Text | None

    @model_validator(mode="after")
    def confirmed_defect(self):
        if self.reproduction == "reproduced" and not self.reproduction_evidence:
            raise ValueError("reproduced findings need reproduction evidence")
        if self.category == "app_defect" and self.adjudication.status == "confirmed":
            if self.reproduction != "reproduced":
                raise ValueError("confirmed app defects require reproduction")
        return self


def _unique(values: list, label: str):
    if len(values) != len(set(values)):
        raise ValueError(f"duplicate {label}")


def validate_links(
    cases: tuple[CaseDefinition, ...], runs: tuple[RunRecord, ...], findings: tuple[Finding, ...]
) -> None:
    """Validate a closed record set, including all retry ancestors; no I/O or scoring."""
    _unique([(case.case_id, case.revision) for case in cases], "case revisions")
    _unique([run.run_id for run in runs], "run IDs")
    _unique([(f.finding_id, f.revision) for f in findings], "finding revisions")
    case_map = {(case.case_id, case.revision): case for case in cases}
    run_map = {run.run_id: run for run in runs}
    for run in runs:
        for pin in run.cases:
            case = case_map.get((pin.case_id, pin.revision))
            if case is None or pin != CasePin.from_case(case):
                raise ValueError("case/rubric/fixture content differs from frozen run pin")
            if run.mode not in case.supported_modes:
                raise ValueError("run mode unsupported by case")
        if run.retry_of is not None:
            parent = run_map.get(run.retry_of)
            if parent is None or run.attempt != parent.attempt + 1:
                raise ValueError("missing retry ancestor or nonconsecutive attempt")
            if run.cases != parent.cases or run.mode != parent.mode or run.data != parent.data:
                raise ValueError("retry changed case, mode or data; create a new experiment")
    for finding in findings:
        run = run_map.get(finding.run_id)
        if run is None:
            raise ValueError("finding references missing run")
        pin = next((pin for pin in run.cases if pin.case_id == finding.case_id), None)
        if pin is None:
            raise ValueError("finding case was not selected")
        case = case_map[(pin.case_id, pin.revision)]
        if finding.check_id not in {item.check_id for item in case.facilitator.expectations}:
            raise ValueError("finding references missing check")
