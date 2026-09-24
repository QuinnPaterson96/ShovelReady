"""python -m app.ingestion: local replay and eligibility reports only."""

import argparse
import hashlib
import json
from pathlib import Path

from .benchmark import assess, context_issues, read_corpus
from .models import ReplayReport, RunInput
from .replay import replay


def artifact(name, raw):
    return {"uri": name, "sha256": hashlib.sha256(raw).hexdigest()}


def save_replay(response: Path, metadata: Path, prompt: Path, output: Path):
    raw, meta, prompt_bytes = response.read_bytes(), metadata.read_bytes(), prompt.read_bytes()
    run = RunInput.model_validate_json(meta)
    count, issues, outcomes = replay(raw, run)
    report = ReplayReport(
        metadata=run,
        raw_response=artifact("response.bin", raw),
        original_prompt=artifact("prompt.bin", prompt_bytes),
        metadata_artifact=artifact("metadata.json", meta),
        object_count=count,
        parse_issues=issues,
        outcomes=outcomes,
    )
    # An explicit new directory avoids overwriting an earlier diagnostic run.
    # This is an export bundle, not a second database or publication mechanism.
    output.mkdir(parents=True, exist_ok=False)
    (output / "response.bin").write_bytes(raw)
    (output / "prompt.bin").write_bytes(prompt_bytes)
    (output / "metadata.json").write_bytes(meta)
    (output / "report.json").write_text(report.model_dump_json(indent=2) + "\n", encoding="utf-8")
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    saved = commands.add_parser("replay")
    for name in ("response", "metadata", "prompt", "output"):
        saved.add_argument("--" + name, type=Path, required=True)
    eligible = commands.add_parser("eligibility")
    eligible.add_argument("--corpus", type=Path, required=True)
    context = commands.add_parser("check-context")
    for name in ("corpus", "window", "text"):
        context.add_argument("--" + name, type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "replay":
            report = save_replay(args.response, args.metadata, args.prompt, args.output)
            print(
                json.dumps(
                    {
                        "benchmark_status": report.benchmark_status,
                        "parse_issues": report.parse_issues,
                        "states": [o.state for o in report.outcomes],
                    }
                )
            )
            return (
                0
                if not report.parse_issues and all(o.state == "normalized" for o in report.outcomes)
                else 2
            )
        corpus = read_corpus(args.corpus)
        if args.command == "eligibility":
            print(json.dumps(assess(corpus), indent=2))
            return 2
        from .benchmark import ContextWindow

        window = ContextWindow.model_validate_json(args.window.read_bytes())
        issues = context_issues(corpus, window, args.text.read_bytes())
        print(json.dumps({"status": "blocked" if issues else "eligible", "issues": issues}))
        return 2 if issues else 0
    except (OSError, ValueError, TypeError):
        # Do not print raw model text, private evidence or provider metadata.
        print(json.dumps({"status": "invalid_input", "detail": "check paths and typed metadata"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
