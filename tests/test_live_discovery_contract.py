"""Actual mounted API output shared with the frontend, using saved provider bytes.

The clock is synthetic and explicit; this is a boundary-drift regression, not an
independent assertion of source/legal accuracy. No provider request or database.
"""

import json
from datetime import UTC, datetime
from pathlib import Path

from app.municipal_sites import api
from tests.test_municipal_sites_api import client, request_observe, request_search

TARGET = Path(__file__).parents[1] / "frontend/src/site_discovery/municipal-api.fixture.json"


def responses(monkeypatch):
    class FixtureClock:
        @staticmethod
        def now(_zone):
            return datetime(2000, 1, 1, tzinfo=UTC)

    monkeypatch.setattr(api, "datetime", FixtureClock)
    http = client(monkeypatch)
    return {
        "note": (
            "Offline replay of September 29 public source bytes; "
            "synthetic fixture clock 2000-01-01."
        ),
        "search": http.post("/api/municipal-sites/search", json=request_search()).json(),
        "observation": http.post("/api/municipal-sites/observe", json=request_observe()).json(),
    }


def test_live_discovery_consumer_fixture_matches_producer(monkeypatch):
    assert responses(monkeypatch) == json.loads(TARGET.read_text(encoding="utf-8"))


if __name__ == "__main__":
    from pytest import MonkeyPatch

    with MonkeyPatch.context() as context:
        TARGET.write_text(json.dumps(responses(context), indent=2) + "\n", encoding="utf-8")
