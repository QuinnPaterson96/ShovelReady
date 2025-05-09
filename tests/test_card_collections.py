import pytest
from datetime import datetime, timedelta
from app.models.card_collection import CardCollection
from app.models.user import User

# ✅ Helper function to create a valid request payload
def create_payload(user_id, event_id, card_ids=None, meeting_date=None):
    return {
        "user_id": str(user_id),
        "event_id": event_id,  # ✅ Include event_id
        "card_ids": card_ids or [1, 2, 3],
        "meeting_date": meeting_date or datetime.utcnow().isoformat()
    }

# ✅ Helper function to create a card collection in the database
def create_card_collection(db_session, user_id, card_ids, event_id, meeting_date):
    collection = CardCollection(
        user_id=user_id,
        card_ids=card_ids,
        event_id=event_id,
        meeting_date=meeting_date
    )
    db_session.add(collection)
    db_session.commit()
    db_session.refresh(collection)
    return collection

# -------------------------------
# ✅ TEST 1: Successfully Create a New Card Collection (With Event ID)
# -------------------------------
def test_create_card_collection_success(client, db_session, test_user):
    payload = create_payload(test_user.id, event_id=1001)  # ✅ Add an event_id
    response = client.post("/card-collections/create", json=payload)

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert data["event_id"] == 1001
    assert set(data["card_ids"]) == {1, 2, 3}

    # ✅ Verify entry in database
    collection = db_session.query(CardCollection).filter_by(event_id=1001).first()
    assert collection is not None
    assert set(collection.card_ids) == {1, 2, 3}

# -------------------------------
# ✅ TEST 2: Ensure Replacing Existing Collection (Same Event ID)
# -------------------------------
def test_replace_existing_card_collection(client, db_session, test_user):
    existing_collection = CardCollection(
        user_id=test_user.id,
        event_id=2002,  # ✅ Unique event_id
        card_ids=[1, 2, 3],
        meeting_date=datetime.utcnow()
    )
    db_session.add(existing_collection)
    db_session.commit()

    # ✅ New request with same event_id should replace the collection
    new_card_ids = [4, 5, 6]
    payload = create_payload(test_user.id, event_id=2002, card_ids=new_card_ids)
    response = client.post("/card-collections/create", json=payload)

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert set(data["card_ids"]) == {4, 5, 6}  # ✅ Old cards replaced

    # ✅ Verify that the database reflects the updated cards
    updated_collection = db_session.query(CardCollection).filter_by(event_id=2002).first()
    assert updated_collection is not None
    assert set(updated_collection.card_ids) == {4, 5, 6}

# -------------------------------
# ❌ TEST 3: Missing `user_id`
# -------------------------------
def test_create_card_collection_missing_user_id(client):
    payload = create_payload(None, event_id=3003)

    response = client.post("/card-collections/create", json=payload)

    assert response.status_code == 500

# -------------------------------
# ❌ TEST 4: Missing `event_id`
# -------------------------------
def test_create_card_collection_missing_event_id(client, test_user):
    payload = create_payload(test_user.id, event_id=None)

    response = client.post("/card-collections/create", json=payload)

    assert response.status_code == 422


# -------------------------------
# ❌ TEST 5: Invalid `meeting_date` Format
# -------------------------------
def test_create_card_collection_invalid_date_format(client, test_user):
    payload = create_payload(test_user.id, event_id=4004, meeting_date="invalid-date")

    response = client.post("/card-collections/create", json=payload)

    assert response.status_code == 422


# -------------------------------
# ❌ TEST 6: Duplicate Card IDs in Request
# -------------------------------
def test_create_card_collection_with_duplicate_cards(client, db_session, test_user):
    payload = create_payload(test_user.id, event_id=5005, card_ids=[1, 1, 2, 2, 3, 3])

    response = client.post("/card-collections/create", json=payload)

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert set(data["card_ids"]) == {1, 2, 3}  # ✅ Deduplicated

    # ✅ Verify in DB
    collection = db_session.query(CardCollection).filter_by(event_id=5005).first()
    assert collection is not None
    assert set(collection.card_ids) == {1, 2, 3}

# -------------------------------
# ✅ TEST 7: Ensure `meeting_date` Can Handle Timezones
# -------------------------------
def test_create_card_collection_with_timezone(client, db_session, test_user):
    meeting_date = (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"  # ✅ Add UTC timezone

    payload = create_payload(test_user.id, event_id=6006, meeting_date=meeting_date)

    response = client.post("/card-collections/create", json=payload)

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert set(data["card_ids"]) == {1, 2, 3}

    # ✅ Verify entry in database
    collection = db_session.query(CardCollection).filter_by(event_id=6006).first()
    assert collection is not None
    assert collection.meeting_date.isoformat().startswith(meeting_date[:19])  # ✅ Strip "Z"

# -------------------------------------
# ✅ TEST 8: Fetch collections successfully
# -------------------------------------
def test_get_user_card_collections_success(client, db_session, test_user):
    """Test retrieving all card collections for a user."""

    # ✅ Ensure user_id is passed as a string
    user_id = str(test_user.id)

    # 🔹 Create 3 collections for the user
    collection1 = create_card_collection(db_session, user_id, [1, 2, 3], event_id=101, meeting_date=datetime.utcnow() - timedelta(days=1))
    collection2 = create_card_collection(db_session, user_id, [4, 5, 6], event_id=102, meeting_date=datetime.utcnow())
    collection3 = create_card_collection(db_session, user_id, [7, 8, 9], event_id=103, meeting_date=datetime.utcnow() - timedelta(days=2))

    # 🔹 Make API request
    response = client.get(f"/card-collections/{user_id}")  # ✅ Ensure user_id is in the URL
    
    # ✅ Verify response
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert isinstance(data, list)  # ✅ Expect a list
    assert len(data) == 3  # ✅ Expect 3 collections
    assert data[0]["event_id"] == collection2.event_id  # ✅ Most recent first
    assert data[1]["event_id"] == collection1.event_id
    assert data[2]["event_id"] == collection3.event_id

# -------------------------------------   
# ✅ TEST 9: Return an empty list if no collections exist
# -------------------------------------
def test_get_user_card_collections_empty(client, test_user):
    """Test that an empty list is returned if the user has no collections."""
    
    response = client.get(f"/card-collections/{test_user.id}")
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    assert response.json() == []  # ✅ Should return an empty list

# -------------------------------------
# ❌ TEST 10: Invalid user ID should return an empty list
# -------------------------------------
def test_get_user_card_collections_invalid_user(client):
    """Test that an invalid user ID returns an empty list."""
    
    response = client.get("/card-collections/invalid-user-id")
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    assert response.json() == []  # ✅ No collections found, return empty list

# -------------------------------------
# ✅ TEST 11: Ensure collections are sorted by meeting_date (most recent first)
# -------------------------------------
def test_get_user_card_collections_sorted(client, db_session, test_user):
    """Ensure collections are sorted by most recent `meeting_date` first."""

    collection_old = create_card_collection(db_session, test_user.id, [1, 2], event_id=201, meeting_date=datetime.utcnow() - timedelta(days=5))
    collection_new = create_card_collection(db_session, test_user.id, [3, 4], event_id=202, meeting_date=datetime.utcnow())

    response = client.get(f"/card-collections/{test_user.id}")
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    
    assert len(data) == 2
    assert data[0]["event_id"] == collection_new.event_id  # ✅ Newest first
    assert data[1]["event_id"] == collection_old.event_id  # ✅ Oldest last