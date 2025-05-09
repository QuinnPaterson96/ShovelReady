import pytest
from app.schemas.user import DeleteAccountRequest
from app.services.db import SessionLocal, init_models
from app.models.user import User



import pytest
from app.models.user import User
from tests.conftest import IS_REMOTE

# -------------------------------
# ✅ TEST 1: Check if a User Exists (Success)
# -------------------------------
def test_check_user_exists_success(client, db_session, test_user):
    """Test checking if an existing user is found successfully."""

    response = client.get(f"/users/check-user?external_id={test_user.external_id}")
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    
    assert data["external_id"] == test_user.external_id
    assert data["name"] == test_user.name
    assert data["phone"] == test_user.phone
    assert data["auth_provider"] == test_user.auth_provider


# -------------------------------
# ❌ TEST 2: Check Non-Existent User (Should Return 404)
# -------------------------------
def test_check_user_not_found(client):
    """Test checking for a non-existent user should return 404."""

    response = client.get("/users/check-user?external_id=non-existent-user-123")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


# -------------------------------
# ✅ TEST 3: Register a New User (Success)
# -------------------------------
def test_create_user_success(client, db_session):
    """Test successfully registering a new user."""

    payload = {
        "external_id": "new-user-456",
        "name": "New User",
        "phone": "+11234567890",
        "gender": "Non-binary",
        "auth_provider": "google"
    }
    response = client.post("/users/register", json=payload)

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert data["external_id"] == payload["external_id"]
    assert data["name"] == payload["name"]
    assert data["phone"] == payload["phone"]
    assert data["auth_provider"] == payload["auth_provider"]

    # ✅ Verify user exists in the database
    user = db_session.query(User).filter_by(external_id=payload["external_id"]).first()
    assert user is not None
    assert user.name == payload["name"]
    assert user.phone == payload["phone"]


# -------------------------------
# ❌ TEST 4: Register Duplicate User (Should Return 400)
# -------------------------------
def test_create_user_duplicate(client, db_session, test_user):
    """Test trying to register a user who already exists should return 400."""

    payload = {
        "external_id": test_user.external_id,
        "name": "Duplicate User",
        "phone": "+19876543210",
        "gender": "Male",
        "auth_provider": "google"
    }
    response = client.post("/users/register", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "User already exists"


# -------------------------------
# ❌ TEST 5: Register User with Missing Fields (Should Return 422)
# -------------------------------
@pytest.mark.parametrize("missing_field", ["external_id", "name", "auth_provider"])
def test_create_user_missing_fields(client, missing_field):
    """Test that missing required fields result in a 422 validation error."""

    payload = {
        "external_id": "user-789",
        "name": "Incomplete User",
        "phone": "+1234567890",
        "gender": "Other",
        "auth_provider": "google"
    }
    del payload[missing_field]  # 🔹 Remove one required field

    response = client.post("/users/register", json=payload)

    assert response.status_code == 422  # ✅ FastAPI should handle validation


# -------------------------------
# ✅ TEST 6: Ensure Name Defaults to 'Unknown User' if Not Provided
# -------------------------------
def test_create_user_no_name_fails(client, db_session):
    """Test that if 'name' is missing, it defaults to 'Unknown User'."""

    payload = {
        "external_id": "user-without-name",
        "phone": "+14567890123",
        "gender": "Female",
        "auth_provider": "phone"
    }
    response = client.post("/users/register", json=payload)

    assert response.status_code == 422



# -------------------------------
# 8. TEST UPDATE USER'S CARD
# -------------------------------
@pytest.mark.usefixtures("db_session")
def test_update_user_card(client, test_user):
    # First, create a user
    # Update the user's card
    response = client.put("/users/update_card", json={"user_id": str(test_user.id), "card_id": 10})
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert data["card_id"] == 10

# -------------------------------
# 9. TEST FETCH BY USER_ID
# -------------------------------
def test_get_user_by_user_id(client, test_user):
    """Test retrieving a user by their user_id."""
    response = client.get(f"/users/get?user_id={test_user.id}")
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert data["id"] == test_user.id
    assert data["name"] == test_user.name
    assert data["phone"] == test_user.phone
    assert data["gender"] == test_user.gender
    assert data["external_id"] == test_user.external_id
    assert data["auth_provider"] == test_user.auth_provider

# -------------------------------
# 10. TEST FETCH BY EXTERNAL_ID
# -------------------------------
def test_get_user_by_external_id(client, test_user):
    """Test retrieving a user by their external_id."""
    response = client.get(f"/users/get?external_id={test_user.external_id}")
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert data["id"] == test_user.id
    assert data["name"] == test_user.name
    assert data["phone"] == test_user.phone
    assert data["gender"] == test_user.gender
    assert data["external_id"] == test_user.external_id
    assert data["auth_provider"] == test_user.auth_provider

# -------------------------------
# ✅ TEST 1: Update User Successfully
# -------------------------------
@pytest.mark.usefixtures("db_session")
def test_update_user_success(client, test_user):
    """Test updating user details successfully."""
    
    payload = {
        "name": "Updated Name",
        "phone": "+1999888777",
        "gender": "Male"
    }
    
    response = client.patch(f"/users/{test_user.id}", json=payload)
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    
    assert data["name"] == payload["name"]
    assert data["phone"] == payload["phone"]
    assert data["gender"] == payload["gender"]

# -------------------------------
# ❌ TEST 2: Update Non-Existent User (Should Return 404)
# -------------------------------
def test_update_non_existent_user(client):
    """Test updating a user that does not exist should return 404."""

    payload = {
        "name": "Non-Existent User"
    }

    response = client.patch("/users/999999", json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# -------------------------------
# ❌ TEST 3: Update User with Invalid Data (Should Return 422)
# -------------------------------
@pytest.mark.parametrize("invalid_payload", [
    {"gender": 123},  # Gender should be a string
])
def test_update_user_invalid_data(client, test_user, invalid_payload):
    """Test updating a user with invalid data should return 422."""

    response = client.patch(f"/users/{test_user.id}", json=invalid_payload)

    assert response.status_code == 422  # ✅ FastAPI should reject invalid data

# -------------------------------
# ✅ TEST 4: Update User Location Successfully
# -------------------------------
@pytest.mark.usefixtures("db_session")
def test_update_user_location_success(client, test_user):
    """Test updating user location successfully."""

    payload = {
        "latitude": 40.7128,
        "longitude": -74.0060
    }

    response = client.patch(f"/users/{test_user.id}/location", json=payload)

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert "last_known_location" in data
    assert isinstance(data["last_known_location"], list)  # JSON serializes tuples as lists
    assert tuple(data["last_known_location"]) == (40.7128, -74.0060) 

# -------------------------------
# ❌ TEST 5: Update Location for Non-Existent User (Should Return 404)
# -------------------------------
def test_update_non_existent_user_location(client):
    """Test updating location for a user that does not exist should return 404."""

    payload = {
        "latitude": 34.0522,
        "longitude": -118.2437
    }

    response = client.patch("/users/999999/location", json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

# -------------------------------
# ❌ TEST 6: Update User Location with Invalid Data (Should Return 422)
# -------------------------------
@pytest.mark.parametrize("invalid_payload", [
    {"latitude": "invalid-lat", "longitude": -74.0060},  # Invalid latitude
    {"latitude": 40.7128, "longitude": "invalid-lon"},  # Invalid longitude
    {"latitude": None, "longitude": -74.0060},  # Missing latitude
])
def test_update_user_location_invalid_data(client, test_user, invalid_payload):
    """Test updating user location with invalid data should return 422."""

    response = client.patch(f"/users/{test_user.id}/location", json=invalid_payload)

    assert response.status_code == 422  # ✅ FastAPI should reject invalid data

def test_update_user_fcm_token_success(client, test_user, db_session):
    """Test updating FCM token successfully."""
    payload = {"fcmToken": "new_fcm_token_123"}

    response = client.patch(f"/users/{test_user.id}/fcm-token", json=payload)
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    assert response.json() == {"message": "FCM token updated successfully"}

    # Verify DB update
    if(IS_REMOTE):
        db_session.expire_all()
    updated_user = db_session.query(User).filter(User.id == test_user.id).first()
    assert updated_user.fcm_token == "new_fcm_token_123"

def test_update_user_fcm_token_not_found(client, db_session):
    """Test updating FCM token for a non-existent user."""
    payload = {"fcmToken": "new_fcm_token_456"}

    response = client.patch("/users/non-existent-user/fcm-token", json=payload)

    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}

def test_update_user_fcm_token_invalid_payload(client, test_user):
    """Test updating FCM token with an invalid payload (missing required field)."""
    payload = {}  # Missing `fcmToken`

    response = client.patch(f"/users/{test_user.id}/fcm-token", json=payload)

    assert response.status_code == 422  # Unprocessable Entity


def test_accept_terms_endpoint(client, db_session, test_user):
    # Ensure it's false by default
    user = db_session.query(User).filter(User.id == test_user.id).first()
    assert user.terms_accepted is False

    # Hit the endpoint
    response = client.patch(f"/users/{test_user.id}/accept-terms")
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    assert response.json()["message"] == "Terms and conditions accepted successfully"

    # Refresh user and assert update
    db_session.refresh(user)
    assert user.terms_accepted is True

@pytest.mark.skipif(IS_REMOTE, reason="Skip test in remote mode")
def test_delete_user_success(client, db_session, test_user):
    payload = DeleteAccountRequest(external_id=test_user.external_id).dict()

    
    response = client.request(
        method="DELETE",
        url=f"/users/{test_user.id}",
        json=payload
    )
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    assert response.json() == {"message": "User deleted successfully"}

    # Confirm the user is gone from DB
    deleted = db_session.query(User).filter_by(id=test_user.id).first()
    assert deleted is None

@pytest.mark.skipif(IS_REMOTE, reason="Skip test in remote mode")
def test_delete_user_wrong_external_id(client, db_session, test_user):
    payload = DeleteAccountRequest(external_id="wrong-external-id").dict()

    response = client.request(
        method="DELETE",
        url=f"/users/{test_user.id}",
        json=payload
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "External ID does not match"}


@pytest.mark.skipif(IS_REMOTE, reason="Skip test in remote mode")
def test_delete_user_not_found(client):
    payload = DeleteAccountRequest(external_id="non-existent-external").dict()

    response = client.request(
        method="DELETE",
        url=f"/users/non-existent-user",
        json=payload
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}