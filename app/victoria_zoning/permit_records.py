"""Parcel-linked permit leads from Victoria's development application history."""

import re
from dataclasses import dataclass
from datetime import date
from typing import Literal

from pydantic import Field

from .api import MAX_FEATURES, SourceRecord, StrictModel

TRACKER = "https://tender.victoria.ca/webapps/ourcity/Prospero"
PERMIT_CASE = re.compile(r"(?:DDP|DDV|DP|DPV|DVP)[0-9]{5,6}")
NON_PERMIT_TYPES = {"rezoning", "subdivision", "official community plan amendment"}
IssuanceTask = Literal["dated_completion", "no_completion_date"]


class PermitRecord(StrictModel):
    case_number: str
    application_type: str | None
    subject: str | None
    application_status: str | None
    case_url: str
    application_date: date | None = None
    evidence_checked_on: date | None = None
    issuance_task: IssuanceTask | None = None
    issued_on: date | None = None
    approved_plan_links: tuple[str, ...] | None = None
    applicable_condition_reviewed: Literal[False] = False
    follow_up: str


class PermitRecords(StrictModel):
    status: Literal["records_found", "no_match", "unavailable", "truncated"]
    source: SourceRecord | None = None
    records: list[PermitRecord] = Field(default_factory=list, max_length=MAX_FEATURES)
    detail: str


@dataclass(frozen=True)
class TrackerObservation:
    checked_on: date
    applied_on: date
    follow_up: str
    issuance_task: IssuanceTask | None = None
    issued_on: date | None = None
    approved_plan_links: tuple[str, ...] | None = None


# City Development Tracker case metadata, observed 2026-11-19. The tracker URL
# below leads to the source record and its plan links. Keep this evidence scoped
# to its parcel and case. A completed issuance task supplies the issuance date.
TRACKER_OBSERVATIONS = {
    ("02130017", "DDP01126"): TrackerObservation(
        checked_on=date(2026, 11, 19),
        applied_on=date(2026, 3, 17),
        issuance_task="dated_completion",
        issued_on=date(2026, 4, 2),
        approved_plan_links=tuple(
            f"{TRACKER}/FileDownload.aspx?fileId={file_id}&folderId=40950C260317092306829401"
            for file_id in (
                "36EEF97B-5D89-469E-B051-2B7BBB25F6FE",
                "8B21C48D-3D8E-4EAB-8939-DFC237023406",
                "D1F371CC-CEC0-4BC5-A53C-C4DF3BBC9476",
            )
        ),
        follow_up="Ask City Planning which approved plan sheets govern the site and whether "
        "the changes affect the footprint or access you are considering.",
    ),
    ("02130017", "DDP01187"): TrackerObservation(
        checked_on=date(2026, 11, 19),
        applied_on=date(2026, 11, 2),
        issuance_task="no_completion_date",
        follow_up="Ask City Planning whether this application has been decided and if it "
        "changes the approved plans for the area you are considering.",
    ),
}


def _source_text(row: dict, key: str) -> str | None:
    value = row.get(key)
    return value.strip() if isinstance(value, str) and value.strip() else None


def permit_records(link: str, rows: list[dict], source: SourceRecord) -> PermitRecords:
    records = {}
    unidentifiable = False
    for row in rows:
        case_number = _source_text(row, "FOLDER_NUMBER")
        application_type = _source_text(row, "AppType")
        if not case_number or not PERMIT_CASE.fullmatch(case_number):
            recognized_type = (application_type or "").casefold()
            if recognized_type not in NON_PERMIT_TYPES:
                unidentifiable = True
            continue
        if case_number in records:
            continue
        observation = TRACKER_OBSERVATIONS.get((link, case_number))
        records[case_number] = PermitRecord(
            case_number=case_number,
            application_type=application_type,
            subject=_source_text(row, "SUBJECT"),
            application_status=_source_text(row, "STATUS"),
            case_url=f"{TRACKER}/Details.aspx?folderNumber={case_number}",
            application_date=observation.applied_on if observation else None,
            evidence_checked_on=observation.checked_on if observation else None,
            issued_on=observation.issued_on if observation else None,
            issuance_task=observation.issuance_task if observation else None,
            approved_plan_links=observation.approved_plan_links if observation else None,
            follow_up=observation.follow_up if observation else (
                "Ask City Planning whether the file includes a decision or approved plan "
                "that affects the use, footprint or access you are considering."
            ),
        )
    if records:
        detail = (
            "City application history links these cases to the selected parcel. "
            "Ask City Planning which permit, plan revision or condition applies to your project."
        )
        if unidentifiable:
            detail += " Some history entries lack a supported case number."
        return PermitRecords(
            status="records_found", source=source, records=list(records.values()), detail=detail
        )
    if unidentifiable:
        return PermitRecords(
            status="unavailable",
            source=source,
            detail="The City application history includes entries without a supported case number.",
        )
    return PermitRecords(
        status="no_match",
        source=source,
        detail="No supported permit case was found in the searched City application history.",
    )
