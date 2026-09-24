"""Fail closed before future database fixtures connect or perform any cleanup.

This validates configuration, not server ownership. Provision a new disposable
local database per run. Never reuse a shared database with a test-like name.
"""

import re
from collections.abc import Mapping
from urllib.parse import urlsplit


def require_disposable_database(environ: Mapping[str, str]) -> str:
    message = "Database tests require an explicitly disposable local ShovelReady test database"
    raw = environ.get("SHOVELREADY_TEST_DATABASE_URL", "")
    try:
        url = urlsplit(raw)
        valid = (
            environ.get("SHOVELREADY_ENV") == "test"
            and environ.get("SHOVELREADY_TEST_DATABASE_DISPOSABLE") == "yes"
            and url.scheme in {"postgresql", "postgresql+psycopg"}
            and url.hostname in {"127.0.0.1", "::1"}
            and url.port is not None
            and 0 < url.port < 65536
            and re.fullmatch(r"/shovelready_test_[0-9a-f]{32}", url.path)
            and not url.query
            and not url.fragment
            and not any(character.isspace() for character in raw)
        )
    except ValueError:
        valid = False
    if not valid:
        # Do not include URLs or chained parsing errors: they may contain secrets.
        raise ValueError(message) from None
    return raw
