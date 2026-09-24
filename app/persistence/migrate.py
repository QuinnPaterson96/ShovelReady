"""Explicit migrations. Never called by HTTP startup."""

import os
from pathlib import Path

from alembic import command
from alembic.config import Config

from .repository import connect


def upgrade(engine, revision="head"):
    root = Path(__file__).resolve().parents[2]
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, revision)


if __name__ == "__main__":
    url = os.environ.get("SHOVELREADY_DATABASE_URL")
    if not url:
        raise SystemExit("Set SHOVELREADY_DATABASE_URL explicitly; no legacy URL fallback")
    engine = connect(url)
    try:
        upgrade(engine)
    finally:
        engine.dispose()
