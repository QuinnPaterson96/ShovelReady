"""Synthetic storage tests only; no accepted zoning data or evaluation oracle."""

import os
import runpy
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import date
from pathlib import Path
from uuid import uuid4

import pytest
import sqlalchemy as sa
from sqlalchemy.exc import DBAPIError

from app.contracts.common import Review
from app.persistence import Repository, connect
from app.persistence.migrate import upgrade
from app.persistence.payloads import RecordRef, ReviewEvent
from app.persistence.repository import MODELS
from app.persistence.tables import records, references
from contract_tests import fixtures as f
from tests.database_safety import require_disposable_database


@pytest.fixture
def engine():
    if "SHOVELREADY_TEST_DATABASE_URL" not in os.environ:
        pytest.skip("Explicit disposable PostgreSQL not configured")
    url = require_disposable_database(os.environ)  # Before any connection or DDL.
    admin = connect(url)
    schema = "test_" + uuid4().hex
    with admin.begin() as connection:
        connection.execute(sa.schema.CreateSchema(schema))
    admin.dispose()
    engine = connect(url)

    @sa.event.listens_for(engine, "connect")
    def search_path(connection, _):
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema}"')
        connection.commit()

    yield engine
    engine.dispose()  # No destructive cleanup; dispose of the whole test cluster afterward.


def payload(kind, data):
    return MODELS[kind].model_validate(deepcopy(data))


def synthetic_records():
    return [
        payload(k, v)
        for k, v in (
            ("source", f.SOURCE),
            ("design", f.DESIGN),
            ("site", f.SITE),
            ("placement", f.PLACEMENT),
            ("candidate", f.CANDIDATE),
            ("rule", f.RULE),
            ("draft", f.DATASET),
            ("evaluation", f.RESULT),
        )
    ]


@pytest.fixture
def repo(engine):
    upgrade(engine)
    return Repository(engine)


def test_empty_migration_and_supported_fixture_upgrade(engine):
    upgrade(engine, "0001")
    repo = Repository(engine)
    repo.import_records(synthetic_records())
    before = repo.evaluation_inputs("evaluation-1")
    upgrade(engine)
    upgrade(engine)  # Already at head.
    assert repo.evaluation_inputs("evaluation-1") == before
    event = ReviewEvent(
        event_id="review-1",
        target=RecordRef(kind="site", record_id="site-r1"),
        decision=Review.model_validate(f.REVIEW),
    )
    repo.import_records([event])
    assert repo.reviews("site", "site-r1") == [event]


def test_repeat_import_and_conflicting_identity_rolls_back(repo):
    batch = synthetic_records()
    repo.import_records(reversed(batch))  # Input ordering does not determine reference resolution.
    repo.import_records(batch)
    assert len(repo.history("rule", "coverage")) == 1
    changed = deepcopy(f.SOURCE)
    changed["reuse_constraints"] = "different content"
    new = deepcopy(f.SOURCE)
    new["snapshot_id"] = "new-snapshot"
    with pytest.raises(ValueError, match="Immutable identity conflict"):
        repo.import_records([payload("source", new), payload("source", changed)])
    with pytest.raises(ValueError, match="Missing"):
        repo.get("source", "new-snapshot")
    assert repo.get("source", f.SOURCE["snapshot_id"]) == batch[0]


@pytest.mark.parametrize(
    "kind,original,change",
    [
        ("design", f.DESIGN, lambda d: d["provenance"]["evidence"][0].update(snapshot_id="absent")),
        ("placement", f.PLACEMENT, lambda d: d["site"].update(revision_id="absent")),
        ("placement", f.PLACEMENT, lambda d: d["design"].update(logical_id="wrong")),
        ("rule", f.RULE, lambda d: d.update(candidate_id="absent")),
        (
            "rule",
            f.RULE,
            lambda d: d.update(supersedes=[{"logical_id": "coverage", "revision_id": "absent"}]),
        ),
        (
            "draft",
            f.DATASET,
            lambda d: d["alternatives"][0]["rules"][0].update(revision_id="absent"),
        ),
        ("draft", f.DATASET, lambda d: d.update(spatial_snapshot_ids=["absent"])),
        ("evaluation", f.RESULT, lambda d: d["placement"].update(revision_id="absent")),
    ],
)
def test_dangling_or_wrong_identity_rolls_back(repo, kind, original, change):
    data = deepcopy(original)
    change(data)
    batch = [v for v in synthetic_records() if type(v) is not MODELS[kind]]
    with pytest.raises(ValueError, match="Missing|identity mismatch"):
        repo.import_records([payload(kind, data), *batch])
    assert repo.history("source", f.SOURCE["source_id"]) == []


def test_corrected_inputs_rules_and_review_history_keep_old_result(repo):
    repo.import_records(synthetic_records())
    before = repo.evaluation_inputs("evaluation-1")
    rule = deepcopy(f.RULE)
    rule["identity"]["revision_id"] = "coverage-r2"
    rule["supersedes"] = [f.RULE["identity"]]
    rule["identity_decision"] = "Synthetic correction, same logical rule, retain original evidence"
    rule["content"]["text"] = "Corrected synthetic interpretation"
    site = deepcopy(f.SITE)
    site["identity"]["revision_id"] = "site-r2"
    site["conditions"] = ["Synthetic corrected footprint awaiting further review"]
    site["geometry_facts"][1]["geometry"]["coordinates"][1] = ["11", "0"]
    placement = deepcopy(f.PLACEMENT)
    placement["identity"]["revision_id"] = "placement-r2"
    placement["site"] = site["identity"]
    design = deepcopy(f.DESIGN)
    design["identity"]["revision_id"] = "design-r2"
    design["configuration"] = "Synthetic corrected fixed design"
    placement["design"] = design["identity"]
    placement["footprint"]["geometry"]["coordinates"][1] = ["12", "0"]
    draft = deepcopy(f.DATASET)
    draft["release_id"] = "fixture-release-2"
    draft["alternatives"][0]["rules"] = [rule["identity"]]
    review1 = ReviewEvent(
        event_id="review-1",
        target=RecordRef(kind="rule", record_id="coverage-r1"),
        decision=Review.model_validate({**f.REVIEW, "status": "needs_review"}),
    )
    review2 = ReviewEvent(
        event_id="review-2",
        target=review1.target,
        decision=Review.model_validate({**f.REVIEW, "status": "rejected"}),
    )
    repo.import_records(
        [
            payload("rule", rule),
            payload("design", design),
            payload("site", site),
            payload("placement", placement),
            payload("draft", draft),
            review1,
            review2,
        ]
    )
    repo.import_records([review1])
    assert repo.evaluation_inputs("evaluation-1") == before
    assert repo.reviews("rule", "coverage-r1") == [review1, review2]
    assert len(repo.history("rule", "coverage")) == 2
    assert before["design"].measurements[-1].status == "missing"
    assert before["sources"][0].effective_from is None
    assert before["site"].provenance.uncertainty


def test_split_merge_requires_mapping_and_existing_predecessors(repo):
    repo.import_records(synthetic_records())
    split = deepcopy(f.RULE)
    split["identity"] = {"logical_id": "split", "revision_id": "split-r1"}
    split["supersedes"] = [f.RULE["identity"]]
    split["identity_decision"] = ""
    with pytest.raises(ValueError):
        payload("rule", split)
    split["identity_decision"] = "Synthetic reviewer maps this split to coverage-r1"
    repo.import_records([payload("rule", split)])
    assert repo.get("rule", "split-r1").supersedes[0].revision_id == "coverage-r1"


def test_failed_extraction_and_run_identity(repo):
    failed = deepcopy(f.CANDIDATE)
    failed.update(extraction_status="failed", content=None, issues=["Malformed saved response"])
    repo.import_records([payload("source", f.SOURCE), payload("candidate", failed)])
    assert (
        repo.get("run", "synthetic-run").trace.raw_response.sha256 == f.SOURCE["artifact"]["sha256"]
    )
    conflicting = deepcopy(failed)
    conflicting["candidate_id"] = "candidate-2"
    conflicting["trace"]["model"] = "different model, same run ID"
    with pytest.raises(ValueError, match="Immutable identity conflict"):
        repo.import_records([payload("candidate", conflicting)])
    assert repo.get("candidate", "candidate-1").content is None


@pytest.mark.parametrize(
    "statement",
    [
        records.update().values(logical_id="rewrite"),
        records.delete(),
        references.delete(),
        sa.text("TRUNCATE records CASCADE"),
    ],
)
def test_database_rejects_mutation(repo, statement):
    repo.import_records(synthetic_records())
    with pytest.raises(DBAPIError, match="append-only"), repo.engine.begin() as connection:
        connection.execute(statement)
    assert repo.get("rule", "coverage-r1").identity.logical_id == "coverage"


def test_database_reference_constraint(repo):
    repo.import_records(synthetic_records())
    with pytest.raises(DBAPIError), repo.engine.begin() as connection:
        connection.execute(
            references.insert().values(
                owner_kind="site",
                owner_id="site-r1",
                target_kind="source",
                target_id="absent",
            )
        )


def test_revalidation_and_cross_payload_semantics(repo):
    invalid = payload("source", f.SOURCE).model_copy(update={"effective_from": date(2026, 1, 1)})
    with pytest.raises(ValueError):
        repo.import_records([invalid])
    placement = deepcopy(f.PLACEMENT)
    placement["footprint"]["geometry"]["crs"]["identifier"] = "different"
    batch = [v for v in synthetic_records() if type(v) is not MODELS["placement"]]
    with pytest.raises(ValueError, match="coordinate references"):
        repo.import_records([*batch, payload("placement", placement)])


def test_concurrent_repeat_import_is_idempotent(repo):
    source = payload("source", f.SOURCE)
    with ThreadPoolExecutor(max_workers=2) as workers:
        list(workers.map(lambda _: repo.import_records([source]), range(2)))
    assert repo.history("source", source.source_id) == [source]


def test_verified_pilot_intake_roundtrips_without_acceptance(repo):
    intake_path = Path(__file__).resolve().parents[1] / "docs/pilot-inputs/intake.py"
    packet = runpy.run_path(str(intake_path))["build"]()
    sources = [s.snapshot for s in packet.sources if s.status == "verified_repository"]
    assert len(sources) == 15
    assert all(s.snapshot is None for s in packet.sources if s.status == "blocked")
    repo.import_records(sources)
    repo.import_records(sources)
    for source in sources:
        retained = repo.get("source", source.snapshot_id)
        assert retained == source
        assert retained.review.status == "unreviewed"
        assert retained.effective_from is None
        assert repo.history("source", source.source_id) == [retained]
