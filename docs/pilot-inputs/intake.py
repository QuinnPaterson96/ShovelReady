"""Offline pilot intake. No network, database, geometry inference or publication.

Run from the repository root with: uv run --locked python docs/pilot-inputs/intake.py
"""

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Annotated, Literal

from pydantic import AwareDatetime, Field, StrictInt, model_validator

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app.contracts.common import (  # noqa: E402
    Artifact,
    Contract,
    Digest,
    Review,
    SourceSnapshot,
    Text,
)

ROOT = Path(__file__).resolve().parent
VERSION = "pilot-intake.v1"
LICENSED = "victoria-open-data-v1"


class Capture(Contract):
    source_id: Text
    requested_url: Text
    resolved_url: Text
    captured_at_utc: AwareDatetime
    sha256: Digest
    byte_count: Annotated[StrictInt, Field(gt=0)]
    object: Text
    http_metadata: dict[str, str | None]
    redistribution: Literal[
        "victoria-open-data-v1",
        "withheld-terms-evidence",
        "withheld-city-website-terms",
        "withheld-no-redistribution-grant",
        "withheld-service-wide-scope",
        "withheld-manufacturer-image-rights",
    ]
    repository_path: Text | None
    original_crs: dict[str, StrictInt] | None
    original_units: dict[str, str] | list[str] | None
    version_evidence: dict[str, str | int | None] | None
    effective_date: None  # Current notebook supplies no verified legal effective dates.
    technical_review: Text
    licence_url: Text | None = None
    same_bytes_as_2026_09_18: bool | None = None


class SourceIntake(Contract):
    capture: Capture
    snapshot_id: Text
    status: Literal["verified_repository", "verified_private_restricted", "blocked"]
    diagnostics: tuple[Text, ...]
    snapshot: SourceSnapshot | None


class SpatialSample(Contract):
    source_id: Text
    snapshot_id: Text
    artifact: Artifact
    layer_metadata_source_id: Text
    catalogue_source_id: Text
    crs: Literal["EPSG:3157"]
    horizontal_unit: Literal["m"]
    vertical_unit: None
    vertical_datum: None
    feature_ids: tuple[StrictInt, ...]
    coordinate_dimensions: tuple[StrictInt, ...]
    interpretation: Literal["raw_esri_json_only"]


class SitePacket(Contract):
    site_id: Text
    source_ids: tuple[Text, ...]
    status: Literal["unreviewed_lead"]
    supplied_placement: None
    expected_fit: None
    missing_facts: tuple[Text, ...]
    specific_action: Text


class Clause(Contract):
    clause_id: Text
    group: Text
    split: Literal["development", "held_out"]
    source_id: Literal["zoning-2018"]
    snapshot_id: Text
    locator: Text
    provisional_annotation: Text
    annotation_provenance: Literal["agent transcription of clause-review-queue.md; not new review"]
    exact_excerpt: None
    review_status: Literal["unreviewed"]
    reviewer: None
    disagreements: tuple[Text, ...]
    disagreement_status: Literal["not_solicited"]
    dependency_groups: tuple[Text, ...]
    benchmark_eligible: Literal[False]
    blockers: tuple[Text, ...]


class Corpus(Contract):
    schema_version: Literal["pilot-corpus.v1"]
    clauses: tuple[Clause, ...]
    sites: tuple[SitePacket, ...]

    @model_validator(mode="after")
    def grouped(self):
        ids = [c.clause_id for c in self.clauses]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate clause ID")
        groups = {}
        for clause in self.clauses:
            if clause.group in groups and groups[clause.group] != clause.split:
                raise ValueError("related group split across development and held-out")
            groups[clause.group] = clause.split
        for clause in self.clauses:
            for dependency in clause.dependency_groups:
                if dependency not in groups or groups[dependency] != clause.split:
                    raise ValueError("missing or cross-split dependency group")
        if len({s.site_id for s in self.sites}) != len(self.sites):
            raise ValueError("duplicate site ID")
        return self


class IntakePacket(Contract):
    schema_version: Literal["pilot-intake.v1"]
    sources: tuple[SourceIntake, ...]
    spatial_samples: tuple[SpatialSample, ...]
    corpus: Corpus
    publication_eligible: Literal[False]


def contained(root: Path, relative: str) -> Path:
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError("artifact path escapes supplied root")
    return path


def snapshot_id(capture: Capture) -> str:
    # Source identity stays distinct when two different requests share identical bytes.
    return f"{capture.source_id}:sha256:{capture.sha256}"


def map_source(capture: Capture, root: Path, private_root: Path | None) -> SourceIntake:
    sid = snapshot_id(capture)
    problems = []
    licensed = capture.redistribution == LICENSED
    path = None
    if licensed and capture.repository_path:
        path = contained(root, capture.repository_path)
        uri = "repo:docs/pilot-inputs/" + capture.repository_path
    elif not licensed and capture.repository_path:
        problems.append("restricted_repository_path: remove private bytes from repository")
    elif not licensed and private_root is not None:
        path = contained(private_root, capture.object)
        uri = "private-capture:" + capture.object
    elif licensed:
        problems.append("missing_repository_path: restore licensed object from pinned capture")
    else:
        problems.append(
            "private_root_required: pass --private-root to authorized capture directory; "
            "resolve durable/shared retention rights separately"
        )
    if path is not None:
        if not path.is_file():
            problems.append(
                "missing_artifact: restore exact hash-named object; URL may have changed"
            )
        else:
            raw = path.read_bytes()
            if len(raw) != capture.byte_count or hashlib.sha256(raw).hexdigest() != capture.sha256:
                problems.append(
                    "integrity_mismatch: quarantine replacement; preserve pinned manifest"
                )
    if problems:
        return SourceIntake(
            capture=capture,
            snapshot_id=sid,
            status="blocked",
            diagnostics=tuple(problems),
            snapshot=None,
        )
    version = capture.version_evidence or {}
    units = capture.original_units or []
    if isinstance(units, dict):
        units = [f"{key}: {value}" for key, value in units.items()]
    category = "spatial" if licensed or capture.source_id.endswith("-service") else "guidance"
    if capture.source_id in {"zoning-2018", "amendment-25-038", "historical-schedule-m"}:
        category = "bylaw"
    elif capture.source_id.startswith("landing"):
        category = "design"
    snapshot = SourceSnapshot(
        schema_version="sr-04.v1-provisional",
        source_id=capture.source_id,
        snapshot_id=sid,
        category=category,
        jurisdiction="City of Victoria, BC (provisional pilot scope)",
        instrument=str(version.get("instrument") or capture.source_id),
        source_url=capture.requested_url,
        artifact=Artifact(uri=uri, sha256=capture.sha256),
        captured_at=capture.captured_at_utc,
        printed_revision=None,
        effective_from=None,
        effective_to=None,
        effective_date_evidence=(),
        original_crs=(f"EPSG:{capture.original_crs['wkid']}" if capture.original_crs else None),
        original_units=tuple(units),
        reuse_constraints=(
            capture.redistribution + "; see acquisition-evidence.md; "
            "Contains information licensed under the Open Government Licence - "
            "City of Victoria."
            if licensed
            else capture.redistribution + "; local research only; no redistribution grant"
        ),
        review=Review(
            status="unreviewed",
            scope="source intake; no legal acceptance",
            rationale=capture.technical_review,
        ),
    )
    return SourceIntake(
        capture=capture,
        snapshot_id=sid,
        snapshot=snapshot,
        status="verified_repository" if licensed else "verified_private_restricted",
        diagnostics=() if licensed else ("restricted: not authorized for sharing",),
    )


def spatial_sample(source: SourceIntake, root: Path) -> SpatialSample:
    capture = source.capture
    raw = json.loads(contained(root, capture.repository_path).read_bytes())
    if raw.get("error") or raw.get("exceededTransferLimit"):
        raise ValueError(f"{capture.source_id}: failed or truncated feature response")
    if raw.get("spatialReference", {}).get("wkid") != 3157:
        raise ValueError(f"{capture.source_id}: unexpected spatial reference")
    features = raw.get("features", [])
    if not features or raw.get("geometryType") != "esriGeometryPolygon":
        raise ValueError(f"{capture.source_id}: missing polygon features")
    dimensions = set()
    ids = []
    for feature in features:
        ids.append(feature["attributes"]["OBJECTID"])
        geometry = feature.get("geometry")
        if not isinstance(geometry, dict):
            raise ValueError(f"{capture.source_id}: missing geometry")
        rings = geometry.get("rings", [])
        if not rings:
            raise ValueError(f"{capture.source_id}: missing rings")
        for ring in rings:
            if len(ring) < 4 or ring[0] != ring[-1]:
                raise ValueError(f"{capture.source_id}: unclosed/short ring")
            for point in ring:
                if len(point) not in (2, 3) or any(
                    isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n)
                    for n in point
                ):
                    raise ValueError(f"{capture.source_id}: malformed vertex")
                dimensions.add(len(point))
    layer = {"parcel": "parcels", "zones": "zoning", "rooflines": "rooflines"}[
        capture.source_id.rsplit("-", 1)[1]
    ]
    return SpatialSample(
        source_id=capture.source_id,
        snapshot_id=source.snapshot_id,
        artifact=source.snapshot.artifact,
        layer_metadata_source_id=f"{layer}-metadata",
        catalogue_source_id=f"{layer}-catalogue",
        crs="EPSG:3157",
        horizontal_unit="m",
        vertical_unit=None,
        vertical_datum=None,
        feature_ids=tuple(ids),
        coordinate_dimensions=tuple(sorted(dimensions)),
        interpretation="raw_esri_json_only",
    )


def build(root: Path = ROOT, private_root: Path | None = None) -> IntakePacket:
    captures = [
        Capture.model_validate(x)
        for x in json.loads((root / "source-manifest.json").read_text(encoding="utf-8"))
    ]
    if len({c.source_id for c in captures}) != len(captures):
        raise ValueError("duplicate source ID")
    sources = tuple(map_source(c, root, private_root) for c in captures)
    index = {s.capture.source_id: s for s in sources}
    corpus = Corpus.model_validate_json((root / "corpus.json").read_text(encoding="utf-8"))
    for clause in corpus.clauses:
        if clause.snapshot_id != index[clause.source_id].snapshot_id:
            raise ValueError("clause references a different source snapshot")
    for site in corpus.sites:
        if any(sid not in index for sid in site.source_ids):
            raise ValueError("site references missing source")
    spatial = []
    for source in sources:
        if source.capture.source_id.startswith("site-") and source.snapshot:
            sample = spatial_sample(source, root)
            if any(
                index[sid].status != "verified_repository"
                for sid in (sample.layer_metadata_source_id, sample.catalogue_source_id)
            ):
                raise ValueError("spatial metadata/licence catalogue unavailable")
            spatial.append(sample)
    return IntakePacket(
        schema_version=VERSION,
        sources=sources,
        spatial_samples=tuple(spatial),
        corpus=corpus,
        publication_eligible=False,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private-root", type=Path, help="explicit authorized local capture root")
    parser.add_argument("--output", type=Path, help="metadata packet only; never copies raw bytes")
    parser.add_argument(
        "--require-all", action="store_true", help="fail if any artifact is blocked"
    )
    args = parser.parse_args()
    try:
        packet = build(private_root=args.private_root)
        if args.output:
            args.output.write_text(packet.model_dump_json(indent=2) + "\n", encoding="utf-8")
        for source in packet.sources:
            print(f"{source.capture.source_id}: {source.status}")
            for diagnostic in source.diagnostics:
                print(f"  {diagnostic}")
        print(
            f"{len(packet.spatial_samples)} raw spatial samples; "
            f"{len(packet.corpus.clauses)} provisional clauses; publication withheld"
        )
        blocked = any(s.status == "blocked" for s in packet.sources)
        # Default succeeds for the useful licensed subset, but integrity/missing public bytes fail.
        public_blocked = any(
            s.status == "blocked" and s.capture.redistribution == LICENSED for s in packet.sources
        )
        return 1 if public_blocked or (args.require_all and blocked) else 0
    except (ValueError, KeyError, OSError, TypeError):
        print(
            "intake_invalid: inspect manifest/corpus structure, references and artifact roots",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
