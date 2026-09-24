"""Actual licensed import into the guarded disposable PostgreSQL fixture only."""

import pytest
import sqlalchemy as sa
from sqlalchemy.exc import DBAPIError

from app.persistence import Repository
from app.persistence.migrate import upgrade
from app.persistence.tables import records
from app.spatial.importer import import_pilot, prepare
from tests.spatial_fixtures import changed_packet
from tests.test_persistence import engine as engine
from tests.test_persistence import repo as repo
from tests.test_persistence import synthetic_records


def test_observed_import_replay_changed_capture_and_failed_batch(repo, tmp_path):
    first = import_pilot(repo)
    assert import_pilot(repo) == first
    assert repo.get("spatial", first.identity.revision_id) == first
    assert repo.history("spatial", first.identity.logical_id) == [first]
    with repo.engine.connect() as connection:
        assert connection.execute(sa.select(sa.func.count()).select_from(records)).scalar() == 16
    root = changed_packet(
        tmp_path,
        lambda raw: raw["features"][0]["attributes"].update(
            Parcel="SYNTHETIC changed-source test, not a reviewed parcel"
        ),
    )
    changed = import_pilot(repo, root)
    assert changed.identity.revision_id != first.identity.revision_id
    assert repo.history("spatial", first.identity.logical_id) == [first, changed]
    assert repo.get("spatial", first.identity.revision_id) == first
    sources, payload = prepare(root)
    orphan = sources[0].model_copy(update={"snapshot_id": "synthetic-rollback-source"})
    broken = payload.model_copy(
        update={
            "identity": payload.identity.model_copy(update={"revision_id": "synthetic-bad-import"}),
            "source_snapshot_ids": (*payload.source_snapshot_ids, "missing-source"),
        }
    )
    with pytest.raises(ValueError, match="Missing source"):
        repo.import_records([orphan, broken])
    for kind, key in (("spatial", "synthetic-bad-import"), ("source", "synthetic-rollback-source")):
        with pytest.raises(ValueError, match="Missing"):
            repo.get(kind, key)
    conflict = first.model_copy(update={"runtime": {"algorithm": "changed"}})
    with pytest.raises(ValueError, match="Immutable identity conflict"):
        repo.import_records([orphan, conflict])
    assert repo.history("spatial", first.identity.logical_id) == [first, changed]
    with pytest.raises(DBAPIError, match="append-only"), repo.engine.begin() as connection:
        connection.execute(records.delete().where(records.c.kind == "spatial"))


def test_upgrade_0002_preserves_old_records_and_adds_spatial(engine):
    upgrade(engine, "0002")
    repository = Repository(engine)
    repository.import_records(synthetic_records())
    before = repository.evaluation_inputs("evaluation-1")
    upgrade(engine)
    upgrade(engine)
    observed = import_pilot(repository)
    assert repository.evaluation_inputs("evaluation-1") == before
    assert repository.get("spatial", observed.identity.revision_id) == observed


def test_invalid_geometry_is_retained_as_investigation_not_zero(repo, tmp_path):
    root = changed_packet(tmp_path, lambda raw: raw["features"][0].update(geometry=None))
    observed = import_pilot(repo, root)
    stored = repo.get("spatial", observed.identity.revision_id)
    parcel = stored.parcels[0]
    assert parcel.uncovered_area_m2 is None and not parcel.intersections
    feature = next(f for f in stored.features if f.snapshot_id == parcel.parcel_snapshot_id)
    assert feature.geometric_area_m2 is None and feature.status == "needs_investigation"
    assert stored.observations[0].response["features"][0]["geometry"] is None
