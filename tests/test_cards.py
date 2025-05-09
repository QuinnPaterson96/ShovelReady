import pytest
from app.models.card import Card

# ----------------------------
# ✅ Helper function: Create a test card
# ----------------------------
def create_test_card(db_session, user_id: str, user_name:str = "Test User", card_text: str = "Test Card", background: str = "blue", background_address: str = "123 Street"):
    card = Card(
        user_id=user_id,
        card_text=card_text,
        user_name=user_name,
        background=background,
        background_address=background_address
    )
    db_session.add(card)
    db_session.commit()
    db_session.refresh(card)
    return card

# -------------------------------
# ✅ TEST 1: Create Card Successfully
# -------------------------------
def test_create_card_success(client, db_session, test_user):
    """Test creating a new card with valid data."""
    
    response = client.post("/cards/create", json={
        "user_id": test_user.id,
        "user_name": test_user.name,
        "card_text": "Sample Card",
        "background": "green",
        "background_address": "789 Road"
    })

    assert response.status_code == 201
    data = response.json()
    
    assert "card_id" in data

    # ✅ Verify database entry
    card = db_session.query(Card).filter(Card.card_id == data["card_id"]).first()
    assert card is not None
    assert card.user_id == test_user.id
    assert card.card_text == "Sample Card"
    assert card.background == "green"
    assert card.background_address == "789 Road"


# -------------------------------
# ❌ TEST 2: Create Card with Missing Required Fields
# -------------------------------
def test_create_card_missing_field(client):
    """Test creating a card with missing required fields (should fail)."""
    
    response = client.post("/cards/create", json={
        "card_text": "Incomplete Card"
    })  # ❌ Missing `user_id`
    
    assert response.status_code == 422  # ✅ Should return validation error


# -------------------------------
# ✅ TEST 3: Get Card by ID Successfully
# -------------------------------
def test_get_card_by_id_success(client, db_session, test_user):
    """Test retrieving a valid card by ID."""
    
    card = create_test_card(db_session, test_user.id, test_user.name,  "Retrieval Card", "red", "456 Avenue")
    
    response = client.get(f"/cards/{card.card_id}")
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    
    assert data["card_id"] == card.card_id
    assert data["card_text"] == "Retrieval Card"
    assert data["background"] == "red"
    assert data["background_address"] == "456 Avenue"


# -------------------------------
# ❌ TEST 4: Get Non-Existent Card by ID
# -------------------------------
def test_get_card_by_id_not_found(client):
    """Test retrieving a non-existent card (should return 404)."""
    
    response = client.get("/cards/99999")  # ✅ Card ID that doesn't exist
    
    assert response.status_code == 404
    assert response.json()["detail"] == "404: Card not found"


# -------------------------------
# ✅ TEST 5: Get Multiple Cards Successfully
# -------------------------------
def test_get_card_details_success(client, db_session, test_user):
    """Ensure we can fetch details for multiple card IDs."""
    
    # 🔹 Create multiple test cards
    card1 = create_test_card(db_session, test_user.id,  test_user.name, "Card A", "blue", "bg1.png")
    card2 = create_test_card(db_session, test_user.id, test_user.name,  "Card B", "yellow", "bg2.png")

    response = client.post("/cards/get-cards", json={"card_ids": [card1.card_id, card2.card_id]})

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert len(data) == 2
    assert data[0]["card_id"] == card1.card_id
    assert data[0]["card_text"] == "Card A"
    assert data[0]["background"] == "blue"
    assert data[0]["background_address"] == "bg1.png"

    assert data[1]["card_id"] == card2.card_id
    assert data[1]["card_text"] == "Card B"
    assert data[1]["background"] == "yellow"
    assert data[1]["background_address"] == "bg2.png"


# -------------------------------
# ✅ TEST 6: Get Single Card via `/get-cards`
# -------------------------------
def test_get_single_card(client, db_session, test_user):
    """Ensure we can fetch a single card using `/get-cards`."""
    
    card = create_test_card(db_session, test_user.id, test_user.name, "Single Card", "green", "bg3.png")

    response = client.post("/cards/get-cards", json={"card_ids": [card.card_id]})

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert len(data) == 1
    assert data[0]["card_id"] == card.card_id
    assert data[0]["card_text"] == "Single Card"
    assert data[0]["background"] == "green"
    assert data[0]["background_address"] == "bg3.png"


# -------------------------------
# ❌ TEST 7: Request for Non-Existent Card IDs via `/get-cards`
# -------------------------------
def test_get_card_details_not_found(client):
    """Ensure requesting non-existent cards returns an empty list."""
    
    response = client.post("/cards/get-cards", json={"card_ids": [9999, 8888]})

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    assert response.json() == []  # ✅ Should return an empty list


# -------------------------------
# ❌ TEST 8: Invalid Request Format for `/get-cards`
# -------------------------------
def test_get_card_details_invalid_request(client):
    """Ensure invalid payload structure returns 422."""
    
    response = client.post("/cards/get-cards", json={})  # ❌ Missing `card_ids` key

    assert response.status_code == 422
    assert "card_ids" in response.json()["detail"][0]["loc"]


# -------------------------------
# ❌ TEST 9: Empty List of Card IDs
# -------------------------------
def test_get_card_details_empty_list(client):
    """Ensure requesting an empty card ID list returns an empty list."""
    
    response = client.post("/cards/get-cards", json={"card_ids": []})

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    assert response.json() == []  # ✅ Should return an empty list


# -------------------------------
# ❌ TEST 10: Non-Integer Card IDs
# -------------------------------
def test_get_card_details_invalid_card_ids(client):
    """Ensure passing invalid card IDs (e.g., strings) returns a 422 error."""
    
    response = client.post("/cards/get-cards", json={"card_ids": ["not-an-int", 5]})

    assert response.status_code == 422
    assert "card_ids" in response.json()["detail"][0]["loc"]
