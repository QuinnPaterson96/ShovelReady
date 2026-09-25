"""Computed synthetic reports, pinned API boundaries and disposable PostgreSQL."""

import hashlib
import json
from copy import deepcopy

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.exc import DBAPIError, OperationalError

from app.draft_evaluations import api
from app.draft_evaluations.__main__ import main
from app.draft_evaluations.demo import CASES, ROOT, request_for
from app.evaluation import evaluate
from app.main import create_app
from app.persistence import Repository
from app.persistence.migrate import upgrade
from app.persistence.tables import records, references
from tests.test_persistence import engine as engine
from tests.test_persistence import repo as repo
from tests.test_persistence import synthetic_records


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setenv("SHOVELREADY_DRAFT_EVALUATIONS_ENABLED", "true")
    monkeypatch.setenv("SHOVELREADY_DATABASE_URL", "postgresql://unused")
    return TestClient(create_app())


@pytest.mark.parametrize("case,outcome,status", [
    (CASES[0], "candidate", "pass"),
    (CASES[1], "needs_investigation", "missing_fact"),
    (CASES[2], "no_match_under_evaluated_pathways", "supported_failure"),
])
def test_independent_arithmetic(case, outcome, status):
    request = request_for(case)
    report = evaluate(request)
    assert report.outcome == outcome
    assert report.traces[0].result.status == status
    assert report.scope == "supplied_placement_only"
    assert report.data_state == "draft_only"
    assert request.sources[0].artifact.sha256 == hashlib.sha256(
        (ROOT / "arithmetic.md").read_bytes()
    ).hexdigest()


def test_upgrade_replay_roundtrip_and_old_readers(engine):
    upgrade(engine, "0003")
    repository = Repository(engine)
    repository.import_records(synthetic_records())
    before = repository.evaluation_inputs("evaluation-1")
    upgrade(engine)
    upgrade(engine)
    reports = [evaluate(request_for(case)) for case in CASES]
    repository.import_records(reports)
    repository.import_records(reports)
    for report in reports:
        key = report.request.evaluation_id
        assert repository.get("draft_evaluation", key).model_dump_json() == report.model_dump_json()
        assert repository.history("draft_evaluation", key) == [report]
    assert repository.evaluation_inputs("evaluation-1") == before
    with engine.connect() as connection:
        assert connection.execute(sa.select(sa.func.count()).select_from(references).where(
            references.c.owner_kind == "draft_evaluation"
        )).scalar() == 0


def test_conflict_failed_batch_and_immutability(repo):
    report = evaluate(request_for(CASES[0]))
    repo.import_records([report])
    changed = report.request.model_dump(mode="json")
    changed["facts"] = []
    other = evaluate(request_for(CASES[1]))
    with pytest.raises(ValueError, match="Immutable identity conflict"):
        repo.import_records([other, evaluate(changed)])
    with pytest.raises(ValueError, match="Missing"):
        repo.get("draft_evaluation", other.request.evaluation_id)
    assert repo.get("draft_evaluation", report.request.evaluation_id) == report
    with pytest.raises(ValueError, match="differs from deterministic"):
        repo.import_records([report.model_copy(update={"outcome": "needs_investigation"})])
    for statement in (records.delete(), records.update().values(logical_id="changed")):
        with pytest.raises(DBAPIError, match="append-only"), repo.engine.begin() as connection:
            connection.execute(statement.where(records.c.kind == "draft_evaluation"))


def test_absent_rule_and_stale_fact_remain_diagnostic(repo):
    for label in ("absent-rule", "stale-fact"):
        value = request_for(CASES[0]).model_dump(mode="json")
        value["evaluation_id"] = label
        if label == "absent-rule":
            value["rules"] = []
        else:
            value["bindings"][0]["fact"]["revision_id"] = "not-the-retained-revision"
        report = evaluate(value)
        assert report.outcome == "needs_investigation"
        repo.import_records([report])
        assert repo.get("draft_evaluation", label) == report


def test_cli_compute_to_http(repo, monkeypatch, configured, tmp_path):
    import app.draft_evaluations.__main__ as cli

    monkeypatch.setattr(cli, "connect", lambda _: repo.engine)
    monkeypatch.setattr(api, "connect", lambda _: repo.engine)
    assert configured.get(f"/api/draft-evaluations/{CASES[0]}").status_code == 404
    main(["--demo"])
    main(["--demo"])
    for case in CASES:
        response = configured.get(f"/api/draft-evaluations/{case}")
        assert response.status_code == 200
        assert response.json() == evaluate(request_for(case)).model_dump(mode="json")
    private = request_for(CASES[0]).model_dump(mode="json")
    private["evaluation_id"] = "private-case"
    private["scope"]["description"] = "PRIVATE LOCAL REQUEST"
    path = tmp_path / "request.json"
    path.write_text(json.dumps(private), encoding="utf-8")
    main(["--request", str(path)])
    retained = repo.get("draft_evaluation", "private-case")
    assert retained.request.scope.description.startswith("PRIVATE")
    assert configured.get("/api/draft-evaluations/private-case").status_code == 404
    response = configured.get(f"/api/draft-evaluations/{CASES[0]}", params={
        "record_id": "private-case", "request": str(path)
    })
    assert "PRIVATE" not in response.text
    # Supplying a computed report is still not a request accepted by the CLI.
    path.write_text(evaluate(private).model_dump_json(), encoding="utf-8")
    with pytest.raises(SystemExit) as error:
        main(["--request", str(path)])
    assert error.value.code == 1


@pytest.mark.parametrize("flag", [None, "false", "TRUE", "1"])
def test_disabled_no_startup_database_or_writes(monkeypatch, flag):
    monkeypatch.delenv("SHOVELREADY_DRAFT_EVALUATIONS_ENABLED", raising=False)
    if flag is not None:
        monkeypatch.setenv("SHOVELREADY_DRAFT_EVALUATIONS_ENABLED", flag)
    monkeypatch.setattr(api, "connect", lambda _: pytest.fail("unexpected connection"))
    client = TestClient(create_app())
    assert client.get("/health").status_code == 200
    assert client.get(f"/api/draft-evaluations/{CASES[0]}").status_code == 503
    assert client.post(f"/api/draft-evaluations/{CASES[0]}").status_code == 405
    assert client.get("/api/draft-evaluations").status_code == 404
    assert client.get(f"/api/draft-evaluations/{CASES[0]}/source").status_code == 404


def test_configuration_and_safe_database_errors(configured, monkeypatch):
    monkeypatch.delenv("SHOVELREADY_DATABASE_URL")
    monkeypatch.setenv("DATABASE_URL", "private legacy credentials")
    assert configured.get(f"/api/draft-evaluations/{CASES[0]}").status_code == 503
    assert configured.get("/api/draft-evaluations/private-case").status_code == 404
    monkeypatch.setenv("SHOVELREADY_DATABASE_URL", "malformed")
    assert configured.get(f"/api/draft-evaluations/{CASES[0]}").status_code == 503

    def broken(_):
        raise OperationalError("private credentials", {}, Exception("secret path"))

    monkeypatch.setattr(api, "connect", broken)
    response = configured.get(f"/api/draft-evaluations/{CASES[0]}")
    assert response.status_code == 503
    assert response.json() == {"detail": "Draft evaluation database unavailable"}


@pytest.mark.parametrize("mutation", ["version", "identity", "private", "outcome", "trace"])
def test_invalid_or_unpinned_raw_storage_never_exposed(repo, configured, monkeypatch, mutation):
    monkeypatch.setattr(api, "connect", lambda _: repo.engine)
    original = evaluate(request_for(CASES[0]))
    value = deepcopy(original.model_dump(mode="json"))
    if mutation == "version":
        value["schema_version"] = "future"
    elif mutation == "identity":
        value["request"]["evaluation_id"] = "stale-record"
    elif mutation == "private":
        value["request"]["sources"][0]["artifact"]["uri"] = "file:///PRIVATE"
    elif mutation == "outcome":
        value["outcome"] = "needs_investigation"
    else:
        value["traces"][0]["diagnostics"] = ["PRIVATE diagnostic"]
    # Deliberately bypass the importer, testing the read boundary against corrupt storage.
    with repo.engine.begin() as connection:
        connection.execute(records.insert().values(
            kind="draft_evaluation", record_id=original.request.evaluation_id,
            logical_id=original.request.evaluation_id, payload=value,
        ))
    response = configured.get(f"/api/draft-evaluations/{CASES[0]}")
    assert response.status_code == 502
    assert response.json() == {"detail": "Stored draft evaluation is invalid"}
