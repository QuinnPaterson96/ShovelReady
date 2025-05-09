import os
import pytest
import requests
from sqlalchemy import text
from app.models.card import Card
from app.models.user import User
from app.services.db import get_db
from tests.db_setup import engine, TestingSessionLocal, init_db, cleanup_db
from fastapi.testclient import TestClient
from app.main import app

IS_REMOTE = os.getenv("REMOTE", "false").lower() == "true"
REMOTE_BASE_URL = os.getenv("REMOTE_BASE_URL", "http://100.26.29.229:8000")


@pytest.fixture(scope="session")
def test_db():
    """Initializes and tears down the test DB (local or remote)."""
    init_db()
    yield engine
    cleanup_db()


@pytest.fixture(scope="function")
def db_session(test_db):
    """Creates a new DB session for each test and ensures full cleanup after."""
    session = TestingSessionLocal()
    yield session
    session.rollback()
    session.close()

    # 🔁 Clean up with a fresh session
    with engine.connect() as conn:
        conn.execute(text("TRUNCATE TABLE reports, cards, users, events RESTART IDENTITY CASCADE;"))
        conn.commit()


@pytest.fixture(scope="function")
def override_get_db(db_session):
    """Overrides FastAPI's dependency with test DB session (local only)."""
    if IS_REMOTE:
        yield  # Do nothing
    else:
        def _get_db():
            yield db_session
        app.dependency_overrides[get_db] = _get_db
        yield
        app.dependency_overrides.clear()



@pytest.fixture(scope="function")
def client(override_get_db):
    if IS_REMOTE:
        class RemoteClient:
            def __init__(self, base_url):
                self.base_url = base_url

            def get(self, path, **kwargs):
                return requests.get(f"{self.base_url}{path}", **kwargs)

            def post(self, path, **kwargs):
                return requests.post(f"{self.base_url}{path}", **kwargs)

            def put(self, path, **kwargs):
                return requests.put(f"{self.base_url}{path}", **kwargs)

            def patch(self, path, **kwargs):
                return requests.patch(f"{self.base_url}{path}", **kwargs)

            def delete(self, path, **kwargs):
                return requests.delete(f"{self.base_url}{path}", **kwargs)

        yield RemoteClient(REMOTE_BASE_URL)  # Update with EC2 public IP
    else:
        # Local mode: inject dependency override
        if IS_REMOTE:
            def _get_db():
                yield db_session

            app.dependency_overrides[get_db] = _get_db
            with TestClient(app) as test_client:
                yield test_client
            app.dependency_overrides.clear()
        else:
            with TestClient(app) as test_client:
                yield test_client



@pytest.fixture(scope="function")
def test_user(db_session):
    existing = db_session.query(User).filter_by(external_id="external-12345").first()
    if existing:
        db_session.delete(existing)
        db_session.commit()

    user = User(
        name="Test User",
        phone="+1234567890",
        gender="Non-binary",
        external_id="external-12345",
        auth_provider="google"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_secondary_user(db_session):
    secondary = User(
        name="Joiner User",
        phone="+1987654321",
        gender="Male",
        external_id="external-54321",
        auth_provider="google"
    )
    db_session.add(secondary)
    db_session.commit()
    db_session.refresh(secondary)
    return secondary


@pytest.fixture
def test_card(db_session: pytest.Session, test_user):
    """Creates a test card."""
    card = Card(
        user_id=test_user.id,
        card_text="Test Card",
        background="blue",
        background_address="123 Street"
    )
    db_session.add(card)
    db_session.commit()
    db_session.refresh(card)

    return card
