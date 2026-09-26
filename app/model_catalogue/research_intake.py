"""Stage explicitly supplied, unreviewed catalogue JSON without publishing it."""

import argparse
import json
import re
from datetime import date
from pathlib import Path

from pydantic import ValidationError

from app.model_catalogue.catalogue import SNAPSHOT, Catalogue

ROOT = Path(__file__).resolve().parents[2]
ACTIVE = {SNAPSHOT.resolve(), (ROOT / "frontend/src/model_catalogue/catalogue.json").resolve()}


class DuplicateKeyError(ValueError):
    """A JSON object repeats a key, so one supplied value would be discarded."""


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def validate_candidate(raw):
    """Return a contract-valid candidate and review gaps; raise on unsafe input."""
    candidate = Catalogue.model_validate(raw)
    if candidate.snapshot_id == Catalogue.model_validate_json(SNAPSHOT.read_text()).snapshot_id:
        raise ValueError("candidate snapshot_id must differ from the active snapshot")
    if not candidate.models:
        raise ValueError("candidate must contain at least one model")
    catalogue_date = _date("catalogue captured_at", candidate.captured_at)

    gaps = []
    for model in candidate.models:
        if not model.sources:
            raise ValueError(f"{model.model_id}: at least one source is required")
        if model.provider_url not in {source.url for source in model.sources}:
            gaps.append(
                _gap(
                    model.model_id,
                    "provider_url",
                    "provider URL not among captured sources",
                    "Confirm the provider link separately from the supplied report.",
                )
            )
        for source in model.sources:
            source_date = _date(
                f"{model.model_id}/{source.source_id} captured_at", source.captured_at
            )
            if source_date > catalogue_date:
                raise ValueError(
                    f"{model.model_id}/{source.source_id}: source captured after candidate"
                )
            if source.sha256 is not None and not re.fullmatch(r"[0-9a-f]{64}", source.sha256):
                raise ValueError(f"{model.model_id}/{source.source_id}: invalid SHA-256 digest")
            if source.sha256 is None:
                gaps.append(
                    _gap(
                        model.model_id,
                        source.source_id,
                        "source hash missing",
                        "Hash the artifact or document why it cannot be retained.",
                    )
                )
            if source.artifact_status == "capture_gap":
                gaps.append(
                    _gap(
                        model.model_id,
                        source.source_id,
                        "source capture gap",
                        "Obtain a reviewable capture or document the access/reuse limitation.",
                    )
                )
            if source.upstream_revision is None:
                gaps.append(
                    _gap(
                        model.model_id,
                        source.source_id,
                        "upstream revision unknown",
                        "Request a controlled provider revision or drawing identifier.",
                    )
                )
        if model.source_revision is None:
            gaps.append(
                _gap(
                    model.model_id,
                    "source_revision",
                    "model revision unknown",
                    "Confirm the configuration and controlled revision for these dimensions.",
                )
            )
        for measure in model.measurements:
            if measure.status == "missing":
                if measure.source_id is not None:
                    raise ValueError(
                        f"{model.model_id}/{measure.name}: missing measure has a source ID"
                    )
                gaps.append(
                    _gap(
                        model.model_id,
                        measure.name,
                        measure.reason,
                        "Acquire a sourced value and definition, or keep it missing.",
                    )
                )
            elif measure.reason is not None:
                raise ValueError(
                    f"{model.model_id}/{measure.name}: known measure cannot carry a missing reason"
                )
        for fact in model.missing_facts:
            gaps.append(
                _gap(
                    model.model_id,
                    "missing_facts",
                    fact,
                    "Resolve against a cited source before acceptance.",
                )
            )
        gaps.append(
            _gap(
                model.model_id,
                "source review",
                "Source meaning and applicability unreviewed",
                "Check transcriptions, definitions, configuration and service claims.",
            )
        )
    return candidate, gaps


def _date(label, value):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError(f"{label} must be an ISO calendar date (YYYY-MM-DD)")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{label} must be an ISO calendar date (YYYY-MM-DD)") from exc


def _gap(model_id, field, issue, action):
    return {"model_id": model_id, "field": field, "issue": issue, "next_action": action}


def stage(input_path: Path, output_dir: Path):
    """Create a fresh staging directory and an actionable report on either outcome."""
    input_path = input_path.resolve(strict=True)
    output_dir = output_dir.resolve()
    if input_path in ACTIVE or output_dir in {path.parent for path in ACTIVE}:
        raise ValueError("active catalogue paths cannot be used for intake")
    if output_dir.exists():
        raise FileExistsError(f"output directory already exists: {output_dir}")

    try:
        raw = json.loads(input_path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
        candidate, gaps = validate_candidate(raw)
    except (OSError, ValueError, ValidationError) as exc:
        report = {
            "status": "rejected",
            "candidate_written": False,
            "errors": _errors(exc),
            "gaps": [],
        }
        candidate = None
    else:
        report = {
            "status": "valid_unreviewed",
            "candidate_written": True,
            "errors": [],
            "gaps": gaps,
        }

    output_dir.mkdir(parents=True)
    if candidate is not None:
        _write(output_dir / "candidate.json", candidate.model_dump(mode="json"))
    _write(output_dir / "report.json", report)
    return report


def _errors(exc):
    if isinstance(exc, ValidationError):
        return [f"{'.'.join(map(str, item['loc']))}: {item['msg']}" for item in exc.errors()]
    return [str(exc)]


def _write(path, data):
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input", type=Path, required=True, help="structured Catalogue JSON supplied locally"
    )
    parser.add_argument(
        "--output-dir", type=Path, required=True, help="new directory for candidate and report"
    )
    args = parser.parse_args()
    try:
        report = stage(args.input, args.output_dir)
    except (OSError, ValueError) as exc:
        parser.exit(2, f"intake setup failed: {exc}\n")
    print(f"{report['status']}: {args.output_dir / 'report.json'}")
    if report["status"] == "rejected":
        parser.exit(1)


if __name__ == "__main__":
    main()
