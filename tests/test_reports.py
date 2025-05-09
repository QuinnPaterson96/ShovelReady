import pytest
from datetime import datetime, timezone
from app.models.report import Report
from app.models.card import Card
from app.models.user import User
from app.schemas.report import ReportRequest  # ✅ Import the new schema

# -------------------------------------
# ✅ TEST 1: Successfully Report a User
# -------------------------------------
def test_report_user_success(client, db_session, test_user, test_card):
    """Test successfully reporting a user based on a card ID."""

    # 🔹 Create a second user (to be reported)
    reported_user = User(
        name="Reported User",
        phone="+1987654321",
        gender="Other",
        external_id="reported-user-123",
        auth_provider="google"
    )
    db_session.add(reported_user)
    db_session.commit()
    db_session.refresh(reported_user)

    # 🔹 Create a card owned by the reported user
    reported_card = Card(
        user_id=reported_user.id,
        card_text="Offensive Content",
        background="red",
        background_address="Unknown"
    )
    db_session.add(reported_card)
    db_session.commit()
    db_session.refresh(reported_card)

    # 🔹 Create request payload using `ReportRequest`
    payload = ReportRequest(
        user_id=test_user.id,  # Reporter
        card_id=reported_card.card_id,
        report_text="This user violated the rules."  # ✅ Use `report_text`
    ).dict()  # ✅ Convert to dict for FastAPI request

    response = client.post("/reports/report", json=payload)

    # ✅ Assertions
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert "report_id" in data

    # ✅ Verify database entry
    report = db_session.query(Report).filter_by(report_id=data["report_id"]).first()
    assert report is not None
    assert report.reporter_id == test_user.id
    assert report.reported_id == reported_user.id
    assert report.report_text == "This user violated the rules."
    assert isinstance(report.created_at, datetime)  # ✅ Ensure timestamp exists




# -------------------------------------
# ❌ TEST 3: Report User with Missing Fields
# -------------------------------------
@pytest.mark.parametrize("missing_field", ["user_id", "report_text"])
def test_report_user_missing_fields(client, missing_field):
    """Test reporting a user with missing required fields (should return 422)."""

    payload = ReportRequest(
        user_id="some-user-id",
        card_id=1,
        report_text="This is an invalid report."
    ).dict()

    del payload[missing_field]  # 🔹 Remove one field

    response = client.post("/reports/report", json=payload)

    assert response.status_code == 422  # ✅ Pydantic should catch missing fields


# -------------------------------------
# ✅ TEST 4: Ensure `created_at` is Automatically Populated
# -------------------------------------
def test_report_created_at_populated(client, db_session, test_user, test_card):
    """Ensure the `created_at` field is auto-generated upon report creation."""

    # 🔹 Report a user
    payload = ReportRequest(
        user_id=test_user.id,
        card_id=test_card.card_id,
        report_text="This user was spamming."
    ).dict()

    response = client.post("/reports/report", json=payload)

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    # ✅ Fetch report from database
    report = db_session.query(Report).filter_by(report_id=data["report_id"]).first()
    assert report is not None
    assert report.created_at is not None
    assert isinstance(report.created_at, datetime)
    assert report.created_at <= datetime.now(timezone.utc)  # ✅ Ensure timestamp is correct


def test_general_report_submission(client, test_user):
    """Test submitting a general report without specifying a card ID."""

    payload = {
        "user_id": test_user.id,
        "report_text": "This app is amazing, but the UI could be smoother."  # General feedback
    }

    response = client.post("/reports/report", json=payload)

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert "report_id" in data
    assert data["reported_id"] is None  # ✅ No one reported

def test_report_user_nonsense_card_id(client, test_user):
    """Test report with invalid card_id type (should return 422)."""

    payload = {
        "user_id": test_user.id,
        "card_id": "not-a-number",  # Invalid type
        "report_text": "Something's off."
    }

    response = client.post("/reports/report", json=payload)

    assert response.status_code == 422
    assert "card_id" in response.text


def test_report_user_nonsense_card_id(client, test_user):
    """Test report with invalid card_id type (should return 422)."""

    payload = {
        "user_id": test_user.id,
        "card_id": "not-a-number",  # Invalid type
        "report_text": "Something's off."
    }

    response = client.post("/reports/report", json=payload)

    assert response.status_code == 422
    assert "card_id" in response.text

# -------------------------------------
# 🟡 TEST: Graceful Handling of Invalid Card ID
# -------------------------------------
def test_report_user_nonexistent_card_graceful(client, test_user, db_session):
    """Test that a report still succeeds when an invalid card ID is provided."""

    payload = {
        "user_id": test_user.id,
        "card_id": 999999,  # Non-existent card ID
        "report_text": "This user is abusive."
    }

    response = client.post("/reports/report", json=payload)

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    # ✅ Check that reported_id is None
    assert data["reporter_id"] == test_user.id
    assert data["reported_id"] is None
    assert data["report_text"] == "This user is abusive."
