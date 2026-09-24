import os
import socket

import pytest

from tests.database_safety import require_disposable_database


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    """Unit tests may use loopback for TestClient, never external services."""
    original_connect = socket.socket.connect
    original_create_connection = socket.create_connection

    def checked_connect(sock, address):
        if isinstance(address, tuple) and address[0] in {"127.0.0.1", "::1"}:
            return original_connect(sock, address)
        raise AssertionError("External network access is disabled in unit tests")

    def checked_create_connection(address, *args, **kwargs):
        if isinstance(address, tuple) and address[0] in {"127.0.0.1", "::1"}:
            return original_create_connection(address, *args, **kwargs)
        raise AssertionError("External network access is disabled in unit tests")

    monkeypatch.setattr(socket.socket, "connect", checked_connect)
    monkeypatch.setattr(socket, "create_connection", checked_create_connection)


@pytest.fixture
def disposable_database_url():
    """Reserved for future integration tooling; no connection or cleanup here."""
    return require_disposable_database(os.environ)
