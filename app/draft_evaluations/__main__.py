"""Compute requests locally and atomically import; never accept supplied reports."""

import argparse
import os
from pathlib import Path

from sqlalchemy.exc import SQLAlchemyError

from app.evaluation import EvaluationRequest, evaluate
from app.persistence import Repository, connect

from .demo import CASES, request_for


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--request", type=Path, help="Local sr-10.v1 request JSON")
    source.add_argument("--demo", action="store_true", help="Import all three synthetic cases")
    args = parser.parse_args(argv)
    url = os.environ.get("SHOVELREADY_DATABASE_URL")
    if not url:
        parser.exit(2, "Set SHOVELREADY_DATABASE_URL explicitly; no legacy URL fallback\n")
    engine = None
    try:
        requests = (
            [request_for(case) for case in CASES]
            if args.demo
            else [EvaluationRequest.model_validate_json(args.request.read_bytes())]
        )
        reports = [evaluate(request) for request in requests]
        engine = connect(url)
        Repository(engine).import_records(reports)
    except (ValueError, OSError, SQLAlchemyError):
        parser.exit(1, "Draft import failed; check local request, database and migrations\n")
    finally:
        if engine is not None:
            engine.dispose()
    print(f"Imported or replayed {len(reports)} draft diagnostic record(s); no publication")


if __name__ == "__main__":
    main()
