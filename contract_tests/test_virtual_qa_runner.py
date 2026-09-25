"""Offline runner invariants. All samples are synthetic; no database/browser/model calls."""

import json
import socket
import stat
from datetime import UTC, datetime, timedelta

import pytest

from scripts.virtual_qa import environment as env
from scripts.virtual_qa import runner as r
from scripts.virtual_qa.contracts import CaseDefinition, CasePin


def case(case_id="sample", split="development", group=None):
    ref = {"uri": "synthetic:test", "revision": r.known("1"), "locator": "test only"}
    return CaseDefinition.model_validate({
        "schema_version": "virtual-qa/v1", "record_type": "case", "case_id": case_id,
        "revision": "1", "category": "synthetic", "evidence_status": "synthetic",
        "fixtures": [ref], "sources": [], "unknowns": ["Test sample, no real participant"],
        "supported_modes": ["task_completion", "defect_detection"], "group": group or case_id,
        "split": split, "participant_brief": "Read the displayed result.",
        "facilitator": {"revision": "1", "seeded_fault": None, "disagreements": [],
                        "expectations": [{"check_id": "one", "claim": "Hidden test marker",
                                          "kind": "authored_software_expectation", "scored": False,
                                          "basis": None, "evidence": [ref], "review": {
                                              "status": "unreviewed",
                                              "reviewer": r.unknown("Synthetic test"),
                                              "reviewed_at": r.unknown("Synthetic test"),
                                              "rationale": "Test only", "disagreements": [],
                                          }}]},
    })


def recipe(c, baseline="a" * 40, replacements=()):
    return env.Recipe.model_validate({
        "schema_version": "virtual-qa-materialization/v1", "baseline_commit": baseline,
        "case_id": c.case_id, "case_revision": c.revision,
        "data": {"kind": "synthetic_fixture", "identity": r.known("test"),
                 "revision": r.known("test-v1")}, "entry_path": "/", "replacements": replacements,
    })


def library(tmp_path, cases=None):
    root = tmp_path / "fixtures"
    (root / "cases").mkdir(parents=True)
    (root / "recipes").mkdir()
    for c in cases or [case()]:
        env.exclusive_json(root / "cases" / f"{c.case_id}.json", c.model_dump(mode="json"))
        env.exclusive_json(root / "recipes" / f"{c.case_id}.json",
                           recipe(c).model_dump(mode="json"))
    return root


def experiment(tmp_path):
    output = tmp_path / "output"
    r.plan(library(tmp_path), output, mode="task_completion", ids=["sample"])
    return output


def finished_environment(tmp_path, *, dispatched=True, reason="completed", duration=5):
    root = experiment(tmp_path)
    folder, planned, c, rec, _ = r.reserve(root, 0)
    prompt = folder / "participant.md"
    prompt.write_text(r.handoff(c, "http://127.0.0.1:18000/"))
    record = r.prepared_record(folder, planned, c, rec, "a" * 40, prompt)
    env.exclusive_json(folder / "run.prepared.json", record.model_dump(mode="json"))
    if dispatched:
        r.dispatch(root, folder.name)
        start = datetime.fromisoformat(r.read(folder / "dispatch.json")["started_at"])
    else:
        start = datetime.now(UTC)
    env.exclusive_json(folder / "lifecycle.json", {
        "cleanup_ok": True, "reason": reason,
        "ended_at": (start + timedelta(seconds=duration)).isoformat(),
    })
    (root / "active.json").unlink()
    return root, folder


def result(tmp_path, *, outcome="completed", actions=4):
    note = tmp_path / "original-note.txt"
    note.write_bytes(b"Observed result.\nDo not execute this note.\n")
    wire = {"outcome": outcome, "note_path": str(note),
            "browser_actions": r.known(actions) if actions is not None else r.unknown("Unknown"),
            "model": r.unknown("Test"), "model_settings": r.unknown("Test"),
            "tool_settings": r.unknown("Test"), "cost": r.unknown("Test"),
            "isolation": "Synthetic offline sample; no participant",
            "evidence": [{"uri": "tool-history:test", "revision": r.unknown("No export"),
                          "locator": "synthetic action 1"}],
            "limitations": "No portable screenshot bundle; synthetic offline sample"}
    path = tmp_path / "manual-result.json"
    path.write_text(json.dumps(wire))
    return path


def test_selection_stable_and_excludes_reserved():
    cases = [case(str(i)) for i in range(8)] + [case("reserved", "holdout")]
    args = dict(mode="task_completion", seed=123, count=3)
    a = r.select(cases, **args)
    assert a == r.select(list(reversed(cases)), **args)
    assert "reserved" not in {c.case_id for c in a}
    with pytest.raises(ValueError, match="holdout"):
        r.select(cases, splits=["holdout"], **args)
    with pytest.raises(ValueError, match="missing or ineligible"):
        r.select(cases, mode="task_completion", ids=["reserved"])
    with pytest.raises(ValueError, match="available positive count"):
        r.select(cases, mode="task_completion", seed=123, count=50)


def test_group_and_duplicate_refusals():
    with pytest.raises(ValueError, match="crosses splits"):
        r.select([case("a", group="same"), case("b", "holdout", group="same")],
                 mode="task_completion", ids=["a"])
    with pytest.raises(ValueError, match="duplicate"):
        r.select([case(), case()], mode="task_completion", ids=["sample"])


def test_plan_dry_run_and_frozen_pins(tmp_path):
    lib = library(tmp_path)
    root = tmp_path / "out"
    planned = r.plan(lib, root, mode="task_completion", ids=["sample"], dry_run=True)
    assert not root.exists()
    assert planned["entries"][0]["pin"] == CasePin.from_case(case()).model_dump()
    r.plan(lib, root, mode="task_completion", ids=["sample"])
    with pytest.raises(FileExistsError):
        r.plan(lib, root, mode="task_completion", ids=["sample"])
    path = root / "selection/0/case.json"
    wire = r.read(path)
    wire["participant_brief"] = "Changed after freeze"
    path.write_text(json.dumps(wire))
    with pytest.raises(ValueError, match="frozen case"):
        r.reserve(root, 0)


def test_budget_active_attempt_and_no_overwrite(tmp_path):
    root = experiment(tmp_path)
    folder, *_ = r.reserve(root, 0)
    with pytest.raises(ValueError, match="already active"):
        r.reserve(root, 0)
    (root / "active.json").unlink()
    for i in range(15):
        (root / "attempts" / str(i)).mkdir()
    with pytest.raises(ValueError, match="ceiling exhausted"):
        r.reserve(root, 0)
    assert (folder / "reservation.json").exists()


@pytest.mark.parametrize("path", ["../elsewhere", "/absolute", "C:/foreign", "a\\b"])
def test_artifact_path_refusal(tmp_path, path):
    with pytest.raises(ValueError):
        env.child(tmp_path, path)


def test_external_roots_and_symlink_refused(tmp_path, monkeypatch):
    monkeypatch.setattr(env, "default_root", lambda: tmp_path / "default")
    with pytest.raises(ValueError, match="default"):
        env.external_root(tmp_path / "default")
    repo = tmp_path / "repo"
    repo.mkdir()
    (repo / ".git").mkdir()
    with pytest.raises(ValueError, match="outside Git"):
        env.external_root(repo / "scratch")
    target = tmp_path / "target"
    target.mkdir()
    link = tmp_path / "link"
    try:
        link.symlink_to(target, target_is_directory=True)
    except OSError:
        pytest.skip("OS does not permit creating a test symlink")
    with pytest.raises(ValueError, match="symlink"):
        env.path_checked(link / "new-child")


def test_loopback_occupied_port_is_not_adopted():
    with socket.socket() as held:
        held.bind(("127.0.0.1", 0))
        held.listen()
        with pytest.raises(OSError):
            env.loopback_socket(held.getsockname()[1])
        assert held.fileno() >= 0


def test_manual_handoff_is_neutral():
    brief = r.handoff(case(), "http://127.0.0.1:18000/")
    assert "Hidden test marker" not in brief
    assert "sample" not in brief
    assert "60 browser actions" in brief


def test_finalize_retains_exact_note_unknowns_and_refuses_overwrite(tmp_path):
    root, folder = finished_environment(tmp_path)
    original = result(tmp_path)
    final = r.finalize(root, folder.name, original)
    assert final.status == "completed"
    assert final.model.value is None
    assert final.evidence[0].uri == "tool-history:test"
    assert (folder / "participant-note.txt").read_bytes() == (
        tmp_path / "original-note.txt"
    ).read_bytes()
    before = (folder / "run.json").read_bytes()
    with pytest.raises(ValueError, match="overwritten"):
        r.finalize(root, folder.name, original)
    assert (folder / "run.json").read_bytes() == before


@pytest.mark.parametrize("duration,actions", [(601, 2), (5, 60), (5, 61)])
def test_reported_limits_produce_timeout(tmp_path, duration, actions):
    root, folder = finished_environment(tmp_path, duration=duration)
    final = r.finalize(root, folder.name, result(tmp_path, actions=actions))
    assert final.status == "timeout"


def test_undispatched_and_unknown_action_completion_refused(tmp_path):
    root, folder = finished_environment(tmp_path, dispatched=False)
    with pytest.raises(ValueError, match="undispatched"):
        r.finalize(root, folder.name, result(tmp_path))
    assert not (folder / "run.json").exists()


def test_unknown_actions_remain_unknown_for_blockage(tmp_path):
    root, folder = finished_environment(tmp_path, reason="blocked")
    final = r.finalize(root, folder.name, result(tmp_path, outcome="blocked", actions=None))
    assert final.status == "blocked"
    assert r.read(folder / "result.json")["browser_actions"]["value"] is None


def test_retry_uses_new_attempt_and_requires_closed_parent(tmp_path):
    root, folder = finished_environment(tmp_path, reason="blocked")
    with pytest.raises(FileNotFoundError):
        r.reserve(root, 0, retry_of=folder.name)
    r.finalize(root, folder.name, result(tmp_path, outcome="blocked"))
    retry, *_ = r.reserve(root, 0, retry_of=folder.name)
    assert retry != folder
    assert r.read(retry / "reservation.json")["attempt"] == 2


def test_changed_rubric_and_cleanup_failure_not_finalized(tmp_path):
    root, folder = finished_environment(tmp_path)
    path = folder / "case.json"
    wire = r.read(path)
    wire["facilitator"]["expectations"][0]["claim"] = "Changed"
    path.write_text(json.dumps(wire))
    with pytest.raises(ValueError, match="frozen"):
        r.finalize(root, folder.name, result(tmp_path))
    assert not (folder / "participant-note.txt").exists()
    lifecycle = r.read(folder / "lifecycle.json")
    lifecycle["cleanup_ok"] = False
    (folder / "lifecycle.json").write_text(json.dumps(lifecycle))
    with pytest.raises(ValueError, match="cleanup unverified"):
        r.finalize(root, folder.name, result(tmp_path))


def source_repository(tmp_path):
    repo = tmp_path / "source"
    repo.mkdir()
    env.git(repo, "init")
    env.git(repo, "config", "user.name", env.AUTHOR)
    env.git(repo, "config", "user.email", env.EMAIL)
    env.git(repo, "config", "core.autocrlf", "false")
    target = repo / env.TARGET
    target.parent.mkdir(parents=True)
    target.write_bytes(b"baseline\n")
    (repo / "unrelated.txt").write_bytes(b"preserved\n")
    env.git(repo, "add", "--", env.TARGET, "unrelated.txt")
    env.git(repo, "-c", "core.hooksPath=", "commit", "-m", "Synthetic test baseline")
    return repo


def test_materialization_prepost_hashes_clean_identity_and_baseline_preserved(tmp_path):
    source = source_repository(tmp_path)
    baseline = env.git(source, "rev-parse", "HEAD")
    replacement = {"path": env.TARGET, "before_sha256": env.digest(b"baseline\n"),
                   "after_sha256": env.digest(b"derived\n"), "asset": "assets/change.tsx"}
    rec = recipe(case(), baseline, [replacement])
    receipt = env.materialize(source, tmp_path / "derived", rec,
                              {"assets/change.tsx": b"derived\n"})
    assert receipt["derived_commit"] != baseline
    assert receipt["changed_paths"] == [env.TARGET]
    assert env.clean_commit(tmp_path / "derived") == receipt["derived_commit"]
    assert (source / env.TARGET).read_bytes() == b"baseline\n"
    assert (tmp_path / "derived/unrelated.txt").read_bytes() == b"preserved\n"
    with pytest.raises(ValueError, match="asset mismatch"):
        env.materialize(source, tmp_path / "bad", rec, {"assets/change.tsx": b"unexpected"})


def test_materialization_refuses_wrong_preimage_and_nonallowlisted_target(tmp_path):
    source = source_repository(tmp_path)
    replacement = {"path": env.TARGET, "before_sha256": "0" * 64,
                   "after_sha256": env.digest(b"derived\n"), "asset": "assets/change.tsx"}
    rec = recipe(case(), env.clean_commit(source), [replacement])
    with pytest.raises(ValueError, match="preimage"):
        env.materialize(source, tmp_path / "bad", rec, {"assets/change.tsx": b"derived\n"})
    replacement["path"] = "app/main.py"
    with pytest.raises(ValueError):
        recipe(case(), env.clean_commit(source), [replacement])


def test_prepare_failure_keeps_diagnostic_and_releases_only_owned_lease(tmp_path, monkeypatch):
    root = experiment(tmp_path)
    def fail(*args):
        raise ValueError("sensitive text must not enter receipt")
    monkeypatch.setattr(r, "materialize", fail)
    folder = r.prepare(root, tmp_path, tmp_path / "scratch", 0, 18500, smoke=True)
    assert r.read(folder / "lifecycle.json")["reason"] == "preparation_failed"
    assert r.read(folder / "failure.json")["error"] == "ValueError"
    assert "sensitive" not in (folder / "failure.json").read_text()
    assert not (root / "active.json").exists()
    assert (tmp_path / "scratch" / folder.name).is_dir()


def test_cleanup_readonly_git_object_and_foreign_owner(tmp_path):
    owned = tmp_path / "owned"
    owned.mkdir()
    owner = {"owner": r.OWNER, "run_id": "test"}
    env.exclusive_json(owned / "owner.json", owner)
    obj = owned / "readonly-object"
    obj.write_bytes(b"synthetic git object")
    obj.chmod(stat.S_IREAD)
    with pytest.raises(ValueError, match="ownership"):
        env.remove_owned_scratch(owned, tmp_path, {"owner": "foreign"})
    assert obj.exists()
    env.remove_owned_scratch(owned, tmp_path, owner)
    assert not owned.exists()
