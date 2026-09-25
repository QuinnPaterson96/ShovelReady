"""On-demand manual QA: plan, prepare, dispatch, stop, finalize. No model calls."""

import argparse
import json
import os
import random
import subprocess
import sys
import time
import uuid
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal
from urllib.request import urlopen

from pydantic import Field

from scripts.virtual_qa.contracts import (
    CaseDefinition,
    CasePin,
    Metadata,
    Record,
    Reference,
    RunRecord,
    Text,
    validate_links,
)
from scripts.virtual_qa.environment import (
    Recipe,
    build,
    child,
    clean_env,
    command,
    database,
    digest,
    exclusive_json,
    external_root,
    materialize,
    path_checked,
    remove_owned_scratch,
    serve,
    verify_inputs,
)

ALGORITHM = "sorted-case-id-python-random-sample/v1"
OWNER = "shovelready-virtual-qa/v1"
MAX_SESSIONS = 16
SECONDS = 600
ACTIONS = 60
TOOL_ROOT = Path(__file__).resolve().parents[2]


def now():
    return datetime.now(UTC).isoformat()


def known(value):
    return {"value": value, "unknown_reason": None}


def unknown(reason):
    return {"value": None, "unknown_reason": reason}


def read(path):
    return json.loads(path_checked(path).read_text(encoding="utf-8"))


def reference(path, locator="entire file"):
    return {"uri": path.resolve().as_uri(), "revision": known(digest(path.read_bytes())),
            "locator": locator}


@contextmanager
def lock(root):
    path = child(root, "operator.lock")
    path.open("x").close()
    try:
        yield
    finally:
        path.unlink()


def experiment(root):
    root = external_root(root)
    plan = read(root / "plan.json")
    if plan["owner"] != OWNER or plan["output"] != str(root):
        raise ValueError("experiment ownership mismatch")
    return root, plan


def select(cases, *, mode, ids=(), categories=(), splits=("baseline", "development"),
           seed=None, count=None):
    if not splits or set(splits) - {"baseline", "development"}:
        raise ValueError("holdout/reserved selection is not supported by this pilot")
    if len({c.case_id for c in cases}) != len(cases):
        raise ValueError("duplicate case IDs in library")
    groups = {}
    pairs = {}
    for case in cases:
        if groups.setdefault(case.group, case.split) != case.split:
            raise ValueError("related group crosses splits")
        fault = case.facilitator.seeded_fault
        if fault and pairs.setdefault(fault.pair_id, case.group) != case.group:
            raise ValueError("control pair crosses groups")
    pool = sorted((c for c in cases if mode in c.supported_modes and c.split in splits
                   and (not categories or c.category in categories)), key=lambda c: c.case_id)
    if ids:
        if seed is not None or count is not None or len(set(ids)) != len(ids):
            raise ValueError("fixed selection requires distinct IDs and no seed/count")
        selected = [c for c in pool if c.case_id in ids]
        if len(selected) != len(ids):
            raise ValueError("fixed case missing or ineligible")
    else:
        if seed is None or count is None or not 1 <= count <= len(pool):
            raise ValueError("seeded selection requires seed and available positive count")
        selected = sorted(random.Random(seed).sample(pool, count), key=lambda c: c.case_id)
    if len(selected) > MAX_SESSIONS:
        raise ValueError("selection exceeds pilot session ceiling")
    return selected


def plan(fixture_root, output, *, mode, ids=(), categories=(),
         splits=("baseline", "development"), seed=None, count=None, dry_run=False):
    fixture_root = path_checked(fixture_root)
    cases = [CaseDefinition.model_validate(read(p))
             for p in sorted((fixture_root / "cases").glob("*.json"))]
    selected = select(cases, mode=mode, ids=ids, categories=categories,
                      splits=splits, seed=seed, count=count)
    entries = []
    payloads = []
    for case in selected:
        recipe = Recipe.model_validate(read(child(fixture_root, f"recipes/{case.case_id}.json")))
        if (recipe.case_id, recipe.case_revision) != (case.case_id, case.revision):
            raise ValueError("recipe/case identity mismatch")
        assets = {}
        for replacement in recipe.replacements:
            if not replacement.asset.startswith("assets/"):
                raise ValueError("replacement asset must be under assets/")
            payload = child(fixture_root, replacement.asset).read_bytes()
            if digest(payload) != replacement.after_sha256:
                raise ValueError("recipe asset hash mismatch")
            assets[replacement.asset] = payload
        recipe_wire = recipe.model_dump(mode="json")
        entries.append({"pin": CasePin.from_case(case).model_dump(),
                        "recipe_sha256": digest(json.dumps(recipe_wire, sort_keys=True).encode())})
        payloads.append((case, recipe_wire, assets))
    output = external_root(output)
    result = {"owner": OWNER, "experiment_id": uuid.uuid4().hex, "output": str(output),
              "created_at": now(), "mode": mode, "selection": "fixed" if ids else "seeded",
              "seed": seed, "algorithm": ALGORITHM, "python_version": sys.version.split()[0],
              "categories": list(categories), "splits": list(splits), "entries": entries,
              "maximum_sessions": MAX_SESSIONS, "seconds": SECONDS, "browser_actions": ACTIONS}
    if not dry_run:
        output.mkdir(parents=True, exist_ok=False)
        (output / "attempts").mkdir()
        for index, (case, recipe_wire, assets) in enumerate(payloads):
            folder = output / "selection" / str(index)
            folder.mkdir(parents=True)
            exclusive_json(folder / "case.json", case.model_dump(mode="json"))
            exclusive_json(folder / "recipe.json", recipe_wire)
            for name, payload in assets.items():
                target = child(folder, name)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(payload)
        exclusive_json(output / "plan.json", result)
    return result


def selected(root, plan_record, index):
    if type(index) is not int or not 0 <= index < len(plan_record["entries"]):
        raise ValueError("selection index out of range")
    folder = child(root, f"selection/{index}")
    case = CaseDefinition.model_validate(read(folder / "case.json"))
    recipe = Recipe.model_validate(read(folder / "recipe.json"))
    entry = plan_record["entries"][index]
    if CasePin.from_case(case).model_dump() != entry["pin"]:
        raise ValueError("frozen case changed")
    if digest(json.dumps(recipe.model_dump(mode="json"), sort_keys=True).encode()) != (
        entry["recipe_sha256"]
    ):
        raise ValueError("frozen recipe changed")
    assets = {r.asset: child(folder, r.asset).read_bytes() for r in recipe.replacements}
    return case, recipe, assets


def attempt_path(root, run_id):
    if len(run_id) != 32 or any(c not in "0123456789abcdef" for c in run_id):
        raise ValueError("run ID must be an opaque runner UUID")
    return child(root, f"attempts/{run_id}")


def reserve(root, index, retry_of=None):
    root, planned = experiment(root)
    with lock(root):
        if (root / "active.json").exists():
            raise ValueError("an attempt is already active; inspect it, never silently reclaim")
        attempts = list((root / "attempts").iterdir())
        if len(attempts) >= MAX_SESSIONS:
            raise ValueError("pilot session ceiling exhausted (failures also consume slots)")
        case, recipe, assets = selected(root, planned, index)
        number = 1
        if retry_of:
            parent_path = attempt_path(root, retry_of)
            parent = RunRecord.model_validate(read(parent_path / "run.json"))
            if parent.cases != (CasePin.from_case(case),) or parent.mode != planned["mode"]:
                raise ValueError("retry changed case or mode")
            if parent.data != recipe.data:
                raise ValueError("retry changed data")
            number = parent.attempt + 1
        run_id = uuid.uuid4().hex
        folder = attempt_path(root, run_id)
        folder.mkdir()
        exclusive_json(folder / "case.json", case.model_dump(mode="json"))
        exclusive_json(folder / "reservation.json", {
            "owner": OWNER, "run_id": run_id, "index": index, "attempt": number,
            "retry_of": retry_of, "reserved_at": now(),
        })
        exclusive_json(root / "active.json", {"owner": OWNER, "run_id": run_id})
    return folder, planned, case, recipe, assets


def prepared_record(folder, planned, case, recipe, commit, prompt):
    reserved = read(folder / "reservation.json")
    return RunRecord.model_validate({
        "schema_version": "virtual-qa/v1", "record_type": "run", "run_id": folder.name,
        "provenance": "participant_run", "source_report": None,
        "attempt": reserved["attempt"], "retry_of": reserved["retry_of"],
        "application_commit": known(commit) if commit else unknown("Preparation failed"),
        "frontend_commit": known(commit) if commit else unknown("Preparation failed"),
        "cases": [CasePin.from_case(case).model_dump()], "data": recipe.data.model_dump(),
        "selection": planned["selection"],
        "seed": known(planned["seed"]) if planned["seed"] is not None else unknown("Fixed IDs"),
        "mode": planned["mode"], "participant_prompt": reference(prompt),
        "model": unknown("Manual handoff; actual participant not yet recorded"),
        "model_settings": unknown("Manual handoff; not yet recorded"),
        "tool_settings": unknown("Manual handoff; not yet recorded"),
        "isolation": "Manual fresh-context handoff; browser-only instructions are not an OS "
                     "boundary. Actual tool access must be recorded at finalize.",
        "rubric_frozen_at": known(reserved["reserved_at"]),
        "started_at": unknown("Not dispatched"), "ended_at": unknown("Not finished"),
        "budget": {"seconds": known(SECONDS), "browser_actions": known(ACTIONS),
                   "cost": unknown("No cost telemetry; no new paid service authorized")},
        "status": "prepared", "final_note": unknown("Not yet received"), "evidence": [],
    })


def handoff(case, url):
    return (f"{case.participant_brief}\n\nOpen {url}\n\n"
            "Use a fresh context and browser-visible evidence only. Do not read source code, "
            "local case/recipe/rubric files or facilitator history. Return your actual note "
            "with precise browser action and evidence references, including tool failures.\n"
            "Stop at 10 minutes or 60 browser actions, whichever comes first. Count individual "
            "browser operations, including reads/screenshots; do not hide actions in batches. "
            "The facilitator must track actions and stop you; the manual adapter cannot "
            "intercept browser actions. No silent retry.\n")


def http_check(url, commit, observation=False):
    with urlopen(url + "api/identity", timeout=2) as response:
        identity = json.load(response)
    if identity["application_commit"] != commit or identity["frontend_commit"] != commit:
        raise ValueError("served identity mismatch")
    with urlopen(url, timeout=2) as response:
        if b"ShovelReady" not in response.read():
            raise ValueError("frontend missing")
    if observation:
        with urlopen(url + "api/investigation", timeout=5) as response:
            json.load(response)


def prepare(root, source, scratch, index, port, *, postgres_bin=None, database_port=None,
            retry_of=None, smoke=False):
    root, _ = experiment(root)
    scratch = external_root(scratch)
    if scratch.is_relative_to(root) or root.is_relative_to(scratch):
        raise ValueError("scratch and retained output must be disjoint")
    source = path_checked(source)
    folder, planned, case, recipe, assets = reserve(root, index, retry_of)
    run_id = folder.name
    owned = scratch / run_id
    process = None
    helper = None
    commit = None
    stage = "scratch_allocation"
    reason = "preparation_failed"
    cleanup_errors = []
    prompt = folder / "participant.md"
    url = f"http://127.0.0.1:{port}/"
    prompt.write_text(handoff(case, url), encoding="utf-8")
    print(f"Attempt: {run_id}", flush=True)
    try:
        owned.mkdir(parents=True, exist_ok=False)
        exclusive_json(owned / "owner.json", {"owner": OWNER, "run_id": run_id})
        checkout = owned / "checkout"
        stage = "materialization"
        receipt = materialize(source, checkout, recipe, assets)
        stage = "fixture_verification"
        verify_inputs(checkout, case)
        commit = receipt["derived_commit"]
        stage = "frontend_build"
        receipt["build_sha256"] = build(checkout, receipt)
        if recipe.data.kind == "observation":
            if postgres_bin is None or database_port is None:
                raise ValueError("observation requires explicit PostgreSQL binaries and port")
            if database_port == port:
                raise ValueError("HTTP and database ports must differ")
            helper = database(owned / "database", postgres_bin, database_port)
            for action in ("start", "migrate", "seed"):
                stage = "database_" + action
                command([sys.executable, "scripts/local_database.py", action,
                         "--root", str(helper.root), "--postgres-bin", str(helper.bin),
                         "--port", str(database_port)], checkout, env=clean_env())
            # Reuse demo validation without changing its clean-tree guarantee.
            sys.path.insert(0, str(TOOL_ROOT / "scripts"))
            from scripts.demo import database_url

            database_url(helper.config, recipe.data.revision.value)
        receipt.update(owner=OWNER, run_id=run_id, recipe=recipe.model_dump(mode="json"),
                       url=url, scratch=str(owned), database_required=helper is not None)
        exclusive_json(folder / "execution.json", receipt)
        config = owned / "serve.json"
        stage = "http_startup"
        ready = owned / "ready.json"
        exclusive_json(config, {"owner": run_id, "commit": commit,
                               "database_config": str(helper.config) if helper else None,
                               "revision": recipe.data.revision.value})
        # Invoke trusted runner tooling, but import the app from the pinned disposable checkout.
        env = dict(clean_env(), PYTHONPATH=str(TOOL_ROOT))
        process = subprocess.Popen(
            [sys.executable, "-m", "scripts.virtual_qa.runner", "_serve", str(checkout),
             str(config), str(ready), str(port)], cwd=TOOL_ROOT, env=env,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        deadline = time.monotonic() + 30
        while True:
            if process.poll() is not None:
                raise ValueError("owned HTTP process exited during startup")
            if ready.exists() and read(ready) == {"owner": run_id}:
                try:
                    http_check(url, commit, helper is not None)
                    break
                except OSError:
                    pass
            if time.monotonic() > deadline:
                raise ValueError("owned HTTP process did not become ready")
            time.sleep(0.1)
        record = prepared_record(folder, planned, case, recipe, commit, prompt)
        exclusive_json(folder / "run.prepared.json", record.model_dump(mode="json"))
        print(f"Ready: {url}\nManual brief: {prompt}", flush=True)
        reason = "smoke_only" if smoke else "stopped_before_dispatch"
        stage = "manual_session"
        monotonic_deadline = None
        while not smoke:
            if process.poll() is not None:
                reason = "environment_failure"
                break
            if (folder / "stop.json").exists():
                reason = read(folder / "stop.json")["reason"]
                break
            if (folder / "dispatch.json").exists():
                started = datetime.fromisoformat(read(folder / "dispatch.json")["started_at"])
                if monotonic_deadline is None:
                    elapsed = (datetime.now(UTC) - started).total_seconds()
                    monotonic_deadline = time.monotonic() + max(0, SECONDS - elapsed)
                if time.monotonic() >= monotonic_deadline:
                    reason = "timeout"
                    break
            time.sleep(0.1)
    except KeyboardInterrupt:
        reason = "cancelled"
    except Exception as error:
        # Persist error category, not potentially secret driver/subprocess exception text.
        exclusive_json(folder / "failure.json", {"stage": stage, "error": type(error).__name__})
    finally:
        stopped_at = now()
        if process is not None:
            try:
                if process.poll() is None:
                    process.terminate()
                process.wait(timeout=10)
            except Exception:
                cleanup_errors.append("owned HTTP process exit unverified")
        if helper is not None:
            try:
                helper.execute("stop")
                if helper.running():
                    raise ValueError("still running")
            except Exception:
                cleanup_errors.append("owned database stop unverified; scratch retained")
        if not (folder / "run.prepared.json").exists():
            record = prepared_record(folder, planned, case, recipe, None, prompt)
            exclusive_json(folder / "run.prepared.json", record.model_dump(mode="json"))
        # Preserve scratch on failures; no blind deletion of incomplete/foreign resources.
        removed = False
        if not cleanup_errors and reason in {"smoke_only", "completed", "timeout", "cancelled",
                                            "blocked", "stopped_before_dispatch"}:
            try:
                remove_owned_scratch(owned, scratch, {"owner": OWNER, "run_id": run_id})
                removed = True
            except Exception:
                cleanup_errors.append("scratch cleanup unverified; retained for inspection")
        exclusive_json(folder / "lifecycle.json", {
            "owner": OWNER, "run_id": run_id, "reason": reason, "ended_at": stopped_at,
            "cleanup_finished_at": now(),
            "cleanup_ok": not cleanup_errors, "cleanup_errors": cleanup_errors,
            "scratch_removed": removed,
        })
        with lock(root):
            if read(root / "active.json") != {"owner": OWNER, "run_id": run_id}:
                raise ValueError("active attempt ownership changed")
            if not cleanup_errors:
                (root / "active.json").unlink()
        print(f"Stopped: {reason}; cleanup verified: {not cleanup_errors}", flush=True)
    return folder


def dispatch(root, run_id):
    root, _ = experiment(root)
    with lock(root):
        folder = attempt_path(root, run_id)
        if read(root / "active.json") != {"owner": OWNER, "run_id": run_id}:
            raise ValueError("attempt not active")
        if (folder / "lifecycle.json").exists() or (folder / "stop.json").exists():
            raise ValueError("attempt already stopping/stopped")
        RunRecord.model_validate(read(folder / "run.prepared.json"))
        exclusive_json(folder / "dispatch.json", {"started_at": now(), "adapter": "manual"})


def stop(root, run_id, reason):
    if reason not in {"completed", "timeout", "cancelled", "blocked"}:
        raise ValueError("unsupported stop reason")
    root, _ = experiment(root)
    with lock(root):
        folder = attempt_path(root, run_id)
        if read(root / "active.json") != {"owner": OWNER, "run_id": run_id}:
            raise ValueError("attempt not active")
        exclusive_json(folder / "stop.json", {"reason": reason, "requested_at": now()})


class ManualResult(Record):
    """Adapter receipt only; all case/run records remain SR-27 types."""

    outcome: Literal["completed", "timeout", "blocked", "cancelled"]
    note_path: Text | None
    browser_actions: Metadata[Annotated[int, Field(strict=True, ge=0)]]
    model: Metadata[Text]
    model_settings: Metadata[Text]
    tool_settings: Metadata[Text]
    cost: Metadata[Text]
    isolation: Text
    evidence: tuple[Reference, ...]
    limitations: Text


def ancestors(root, record):
    runs = [record]
    seen = {record.run_id}
    while runs[-1].retry_of:
        parent = runs[-1].retry_of
        if parent in seen:
            raise ValueError("retry cycle")
        seen.add(parent)
        runs.append(RunRecord.model_validate(read(attempt_path(root, parent) / "run.json")))
    return tuple(runs)


def finalize(root, run_id, result_file):
    root, _ = experiment(root)
    with lock(root):
        folder = attempt_path(root, run_id)
        if (folder / "run.json").exists() or (folder / "result.json").exists():
            raise ValueError("finalized or partially finalized attempt cannot be overwritten")
        lifecycle = read(folder / "lifecycle.json")
        if not lifecycle["cleanup_ok"]:
            raise ValueError("cleanup unverified; resolve ownership before finalization")
        result = ManualResult.model_validate(read(result_file))
        record = RunRecord.model_validate(read(folder / "run.prepared.json"))
        case = CaseDefinition.model_validate(read(folder / "case.json"))
        if record.participant_prompt.model_dump() != reference(folder / "participant.md"):
            raise ValueError("frozen participant prompt changed")
        started = read(folder / "dispatch.json")["started_at"] if (
            folder / "dispatch.json"
        ).exists() else None
        status = "blocked" if result.outcome == "cancelled" else result.outcome
        if not started:
            if result.outcome in {"completed", "timeout"}:
                raise ValueError("undispatched environment cannot be a completed/timeout session")
            status = "blocked"
        elif lifecycle["reason"] in {"preparation_failed", "environment_failure", "cancelled",
                                      "blocked"}:
            status = "blocked"
        else:
            elapsed = (datetime.fromisoformat(lifecycle["ended_at"]) -
                       datetime.fromisoformat(started)).total_seconds()
            if elapsed >= SECONDS or lifecycle["reason"] == "timeout" or (
                result.browser_actions.value is not None and result.browser_actions.value >= ACTIONS
            ):
                status = "timeout"
        if status == "completed" and (
            result.note_path is None or result.browser_actions.value is None
        ):
            raise ValueError("completion needs actual note and action count evidence")
        note_bytes = path_checked(Path(result.note_path)).read_bytes() if result.note_path else None
        if note_bytes is not None and not note_bytes.strip():
            raise ValueError("empty participant note")
        wire = record.model_dump(mode="json")
        wire.update(status=status,
                    started_at=known(started) if started else unknown("Not dispatched"),
                    ended_at=known(lifecycle["ended_at"]), isolation=result.isolation,
                    model=result.model.model_dump(),
                    model_settings=result.model_settings.model_dump(),
                    tool_settings=result.tool_settings.model_dump(),
                    evidence=[e.model_dump(mode="json") for e in result.evidence])
        wire["budget"]["cost"] = result.cost.model_dump()
        wire["evidence"].append(reference(folder / "lifecycle.json"))
        if (folder / "execution.json").exists():
            wire["evidence"].append(reference(folder / "execution.json"))
        note = folder / "participant-note.txt"
        if note_bytes is not None:
            wire["final_note"] = known({"uri": note.resolve().as_uri(),
                                       "revision": known(digest(note_bytes)),
                                       "locator": "entire file"})
        else:
            wire["final_note"] = unknown("No note received; see result.json limitations")
        final = RunRecord.model_validate(wire)
        validate_links((case,), ancestors(root, final), ())
        # Persist unmodified actual note; never interpret its contents as commands.
        if note_bytes is not None:
            with note.open("xb") as stream:
                stream.write(note_bytes)
        exclusive_json(folder / "result.json", result.model_dump(mode="json"))
        exclusive_json(folder / "run.json", final.model_dump(mode="json"))
        return final


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    p = commands.add_parser("plan")
    p.add_argument("--fixtures", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--mode", choices=("task_completion", "defect_detection"), required=True)
    p.add_argument("--ids", nargs="*", default=[])
    p.add_argument("--categories", nargs="*", default=[])
    p.add_argument("--splits", nargs="+", default=["baseline", "development"])
    p.add_argument("--seed", type=int)
    p.add_argument("--count", type=int)
    p.add_argument("--dry-run", action="store_true")
    p = commands.add_parser("prepare")
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--source", type=Path, required=True)
    p.add_argument("--scratch", type=Path, required=True)
    p.add_argument("--index", type=int, required=True)
    p.add_argument("--port", type=int, required=True)
    p.add_argument("--postgres-bin", type=Path)
    p.add_argument("--database-port", type=int)
    p.add_argument("--retry-of")
    p.add_argument("--smoke", action="store_true")
    for name in ("dispatch", "stop", "finalize"):
        p = commands.add_parser(name)
        p.add_argument("--output", type=Path, required=True)
        p.add_argument("--run-id", required=True)
        if name == "stop":
            p.add_argument("--reason", choices=("completed", "timeout", "cancelled", "blocked"),
                           required=True)
        if name == "finalize":
            p.add_argument("--result", type=Path, required=True)
    p = commands.add_parser("_serve", help=argparse.SUPPRESS)
    for name in ("checkout", "config", "ready"):
        p.add_argument(name, type=Path)
    p.add_argument("port", type=int)
    args = parser.parse_args()
    try:
        if args.command == "plan":
            print(json.dumps(plan(args.fixtures, args.output, mode=args.mode, ids=args.ids,
                                  categories=args.categories, splits=args.splits, seed=args.seed,
                                  count=args.count, dry_run=args.dry_run), indent=2))
        elif args.command == "prepare":
            folder = prepare(args.output, args.source, args.scratch, args.index, args.port,
                             postgres_bin=args.postgres_bin, database_port=args.database_port,
                             retry_of=args.retry_of, smoke=args.smoke)
            lifecycle = read(folder / "lifecycle.json")
            return int(not lifecycle["cleanup_ok"] or lifecycle["reason"] in {
                "preparation_failed", "environment_failure",
            })
        elif args.command == "dispatch":
            dispatch(args.output, args.run_id)
        elif args.command == "stop":
            stop(args.output, args.run_id, args.reason)
        elif args.command == "finalize":
            final = finalize(args.output, args.run_id, args.result)
            print(f"Saved {final.run_id}: {final.status}")
        else:
            serve(args.checkout, args.config, args.ready, args.port)
    except Exception as error:
        print(f"Runner refused/failed ({type(error).__name__}); retained records unchanged where "
              "possible. Inspect nonsecret lifecycle/failure records.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
