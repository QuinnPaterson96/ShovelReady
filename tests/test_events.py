import uuid
import pytest
from datetime import datetime, timedelta

import pytz
from app.models.user import User
from app.services.db import SessionLocal
from app.models.event import Event
from app.models.card_collection import CardCollection

import pytest
from datetime import datetime, timedelta, timezone
from app.models.event import Event
from app.schemas.event import CreateEventRequest, JoinEventRequest
from tests.conftest import IS_REMOTE


from datetime import datetime, timedelta, timezone

@pytest.fixture(scope="function")
def test_events(db_session, test_user):
    """Fixture to create test events before running tests."""
    now = datetime.now(timezone.utc)

    event1 = Event(
        owner_id=test_user.id,
        card_ids=[1, 2],
        event_title="Nearby Event 1",
        event_text="Test event 1",
        gender_restrict="Any",
        street_address="POINT(-74.0060 40.7128 )",
        icon="icon1.png",
        max_radius=500,
        event_starts=now,
        event_ends=now + timedelta(minutes=30)
    )
    event2 = Event(
        owner_id=test_user.id,
        card_ids=[3, 4],
        event_title="Nearby Event 2",
        event_text="Test event 2",
        gender_restrict="Any",
        street_address="POINT(-74.0050 40.7138)",
        icon="icon2.png",
        max_radius=200,
        event_starts=now,
        event_ends=now + timedelta(minutes=30)
    )
    event3 = Event(
        owner_id=test_user.id,
        card_ids=[5, 6],
        event_title="Distant Event",
        event_text="Too far away",
        gender_restrict="Any",
        street_address="POINT(-73.9352 40.7306)",
        icon="icon3.png",
        max_radius=100,
        event_starts=now,
        event_ends=now + timedelta(minutes=30)
    )

    db_session.add_all([event1, event2, event3])
    db_session.commit()

    yield [event1, event2, event3]

    db_session.query(Event).delete()
    db_session.commit()

# -------------------------------
# 1️⃣ TEST CREATE EVENT
# -------------------------------
def test_create_event(client, db_session, test_user):
    """Test creating an event successfully."""

    test_event = {
        "owner_id": test_user.id,  # ✅ Pass valid owner ID
        "card_ids": [1, 2, 3],
        "event_title": "Test Event",
        "event_text": "This is a test event.",
        "gender_restrict": "Any",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "icon": "icon.png",
        "max_radius": 1000,
        "event_starts": datetime(2025, 2, 10, 10, 0).isoformat(),
        "event_ends": datetime(2025, 2, 10, 12, 0).isoformat()
    }

    response = client.post("/events/create", json=test_event)
    assert response.status_code == 201
    data = response.json()
    
    assert "event_id" in data

    # ✅ Check if event was stored correctly
    event = db_session.query(Event).filter_by(event_id=data["event_id"]).first()
    assert event is not None
    assert event.owner_id == test_user.id 

def test_create_event_ensures_utc(client, test_user, db_session):
    """Test that event timestamps are stored in UTC."""
    event_data = {
        "owner_id": test_user.id,
        "card_ids": [1, 2],
        "event_title": "Timezone Test Event",
        "event_text": "Testing UTC storage",
        "gender_restrict": "Any",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "icon": "icon.png",
        "max_radius": 1000,
        "event_starts": datetime.utcnow().isoformat(),  # Send UTC time
        "event_ends": (datetime.utcnow() + timedelta(hours=2)).isoformat(),
    }

    response = client.post("/events/create", json=event_data)
    
    assert response.status_code == 201
    data = response.json()

    event_id = data["event_id"]

    # ✅ Fetch event directly from DB to check stored time
    event = db_session.query(Event).filter(Event.event_id == event_id).first()
    assert event is not None

    # ✅ Ensure timestamps are stored in UTC
    assert event.event_starts.tzinfo is not None
    assert event.event_starts.tzinfo.utcoffset(event.event_starts) == timedelta(0)

    assert event.event_ends.tzinfo is not None
    assert event.event_ends.tzinfo.utcoffset(event.event_ends) == timedelta(0)


# Tests that an event can be fetched by its ID
def test_get_event(client, test_user, db_session):
    # Create a test event
    event = Event(
        owner_id=test_user.id,
        card_ids=[1],
        event_title="Test Get Event",
        event_text="Fetching this event by ID.",
        gender_restrict="Any",
        street_address="POINT(40.7128 -74.0060)",
        icon="test_icon.png",
        max_radius=500,
        event_starts=datetime.now(),
        event_ends=datetime.now()
    )
    db_session.add(event)
    db_session.commit()

    response = client.get(f"/events/{event.event_id}")
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert data["event_id"] == event.event_id
    assert data["event_title"] == "Test Get Event"

def test_join_event(client, db_session, test_user, test_secondary_user, test_card):
    """Test that a user can successfully join an event and exchange cards."""


    # ✅ Create a mock event
    event = Event(
        owner_id=test_secondary_user.id,
        card_ids=[5, 6],  # Existing cards in the event
        event_title="Mock Event",
        event_text="Mock event for testing.",
        gender_restrict="Any",
        street_address="POINT(-74.0060 40.7128)",  # Mock PostGIS POINT
        icon="icon.png",
        max_radius=1000,
        event_starts=datetime.utcnow(),
        event_ends=datetime.utcnow() + timedelta(hours=2),
    )

    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)  # Ensure event is fully persisted

    # ✅ Prepare request payload using `JoinEventRequest`
    join_request = JoinEventRequest(
        user_id=test_user.id,
        card_id=test_card.card_id,  # User is adding this card
        event_id=event.event_id,
        meeting_date=datetime.utcnow()
    )

    response = client.patch("/events/join", json=join_request.model_dump(mode="json"))

    # ✅ Check response status
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"

    # ✅ Validate response format
    data = response.json()
    assert "event_id" in data
    assert data["event_id"] == event.event_id
    assert "card_ids" in data  # Should include the updated list of cards
    assert sorted(data["card_ids"]) == sorted([5, 6, test_card.card_id]), "Card IDs should be updated correctly"


    # ✅ Validate user's card collection
    user_collection = db_session.query(CardCollection).filter(
        CardCollection.user_id == test_user.id,
        CardCollection.event_id == event.event_id
    ).first()
    
    assert user_collection is not None, "User's card collection should exist"
    assert sorted(user_collection.card_ids) == sorted([5, 6, test_card.card_id]), "User should have received all event cards"

    if IS_REMOTE:
        db_session.expire_all()

    # ✅ Validate database state
    updated_event = db_session.query(Event).filter(Event.event_id == event.event_id).first()
    assert updated_event is not None
    assert sorted(updated_event.card_ids) == sorted([5, 6, test_card.card_id])  # Ensure the card list is updated

    print("✅ Join event test passed!")


@pytest.mark.parametrize(
    "lng, lat, expected_event_count",
    [
        (-74.0060, 40.7128, 2),  # ✅ event1 & event2 (both within range)
        (-74.0050, 40.7138, 2),  # ✅ event1 & event2 (both should match)
        (-74.0070, 40.7120, 1),  # ✅ Only event1 (within 500m)
        (-73.9152, 40.7306, 0),  # ❌ No events (event3 is too far)
    ],
)
def test_get_events_in_area(client, db_session, test_events, lng, lat, expected_event_count, test_user):
    """Test fetching events near a given location with `POST /events/nearby`."""
    
    payload = {
        "lat": lat,
        "lng": lng,
        "gender": "Any",
        "user_id": test_user.id
    }
    
    response = client.post("/events/nearby", json=payload)
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert isinstance(data, list), "Response should be a list"
    assert len(data) == expected_event_count, f"Expected {expected_event_count} events, but got {len(data)}"

    # ✅ Ensure each event has required fields
    for event in data:
        assert "event_id" in event
        assert "event_title" in event
        assert "event_text" in event
        assert "event_starts" in event
        assert "event_ends" in event
        assert "distance" in event
        assert "max_radius" in event
        assert "street_address" in event
        assert isinstance(event["distance"], float), "Distance should be a float"

@pytest.mark.parametrize(
    "local_timezone, expected_offset",
    [
        ("America/New_York", timedelta(hours=-5)),  # Eastern Standard Time (EST)
        ("Europe/London", timedelta(hours=0)),  # GMT (UTC+0)
        ("Asia/Tokyo", timedelta(hours=9)),  # Japan Standard Time (JST)
        ("Australia/Sydney", timedelta(hours=11)),  # Australian Eastern Daylight Time (AEDT)
    ]
)
def test_event_time_converts_to_utc(client, db_session, local_timezone, test_user, expected_offset):
    """Test that events created in various timezones are stored and retrieved in UTC."""

    # ✅ Define the local timezone
    local_tz = pytz.timezone(local_timezone)

    # ✅ Create a local time for event start
    local_time = local_tz.localize(datetime(2025, 5, 10, 14, 0))  # 2:00 PM local time

    # ✅ Convert local time to UTC
    expected_utc_time = local_time.astimezone(pytz.utc)

    event_data = {
        "owner_id": test_user.id,
        "card_ids": [1, 2],
        "event_title": f"Timezone Test - {local_timezone}",
        "event_text": "Testing timezone conversion",
        "gender_restrict": "Any",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "icon": "icon.png",
        "max_radius": 1000,
        "event_starts": local_time.isoformat(),
        "event_ends": (local_time + timedelta(hours=2)).isoformat(),
    }

    response = client.post("/events/create", json=event_data)
    assert response.status_code == 201

    data = response.json()
    event_id = data["event_id"]

    # ✅ Fetch event directly from DB
    event = db_session.query(Event).filter(Event.event_id == event_id).first()
    assert event is not None

    # ✅ Ensure stored timestamps are in UTC
    assert event.event_starts.replace(tzinfo=None) == expected_utc_time.replace(tzinfo=None)
    assert event.event_ends.replace(tzinfo=None) == (expected_utc_time + timedelta(hours=2)).replace(tzinfo=None)

    # ✅ Retrieve event via API & ensure it's returned in UTC
    response = client.get(f"/events/{event.event_id}")
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"

    event_data = response.json()
    event_start_utc = datetime.fromisoformat(event_data["event_starts"].replace("Z", "+00:00"))
    event_end_utc = datetime.fromisoformat(event_data["event_ends"].replace("Z", "+00:00"))

    assert event_start_utc.tzinfo is not None
    assert event_start_utc.tzinfo.utcoffset(event_start_utc) == timedelta(0)
    assert event_end_utc.tzinfo.utcoffset(event_end_utc) == timedelta(0)

    # ✅ Ensure UTC timestamp matches expected converted value
    assert event_start_utc == expected_utc_time
    assert event_end_utc == expected_utc_time + timedelta(hours=2)


def test_get_event_returns_utc(client, db_session, test_user):
    """Test that event retrieval returns UTC timestamps."""
    
    test_event = Event(
        owner_id=test_user.id,
        card_ids=[3, 4],
        event_title="UTC Retrieval Test",
        event_text="Checking UTC retrieval",
        gender_restrict="Any",
        street_address="POINT(40.7128 -74.0060)",
        icon="test_icon.png",
        max_radius=500,
        event_starts=datetime.utcnow(),
        event_ends=datetime.utcnow() + timedelta(hours=3),
    )
    
    db_session.add(test_event)
    db_session.commit()
    db_session.refresh(test_event)

    response = client.get(f"/events/{test_event.event_id}")

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    # ✅ Ensure response timestamps are in ISO 8601 UTC format
    event_start = datetime.fromisoformat(data["event_starts"].replace("Z", "+00:00"))
    event_end = datetime.fromisoformat(data["event_ends"].replace("Z", "+00:00"))

    assert event_start.tzinfo is not None
    assert event_start.tzinfo.utcoffset(event_start) == timedelta(0)

    assert event_end.tzinfo is not None
    assert event_end.tzinfo.utcoffset(event_end) == timedelta(0)



def test_get_events_in_area_excludes_expired_events(client, db_session, test_events, test_user):
    """Ensure past events are not included in results."""

    # Manually set all events to be in the past
    db_session.query(Event).update({Event.event_ends: datetime.utcnow().replace(tzinfo=timezone.utc) - timedelta(hours=1)})
    db_session.commit()

    payload = {
        "lat": 40.7128,
        "lng": -74.0060,
        "gender": "Any",
        "user_id": test_user.id
    }

    response = client.post("/events/nearby", json=payload)
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert data == [], "Expired events should not be returned"




def test_get_events_in_area_large_distance(client, db_session, test_user, test_events):
    """Test that very far locations return an empty list (no false positives)."""

    payload = {
        "lat": 35.0000,  # Far from the test events
        "lng": -120.0000,
        "gender": "Any",
        "user_id": test_user.id,
    }

    response = client.post("/events/nearby", json=payload)
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert data == [], "Should return an empty list for locations with no events"


def test_extend_event_success(client, test_user, db_session):
    """Successfully extends an event's duration."""
    test_event = Event(
        owner_id=test_user.id,
        event_title="Test Event",
        event_text="An example event",
        street_address="POINT(40.7128 -74.0060)",
        max_radius=500,
        event_starts=datetime.utcnow(),
        event_ends=datetime.utcnow() + timedelta(hours=1),
        card_ids=[1, 2]
    )
    db_session.add(test_event)
    db_session.commit()
    db_session.refresh(test_event)

    new_end_time = test_event.event_ends + timedelta(hours=1)

    response = client.patch(f"/events/{test_event.event_id}/extend", json={"event_end": new_end_time.isoformat()})

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()

    assert datetime.fromisoformat(data["event_ends"]) == new_end_time


def test_extend_event_fail_invalid_time(client, test_user, db_session):
    """Fails when trying to set event_ends before event_starts."""
    test_event = Event(
        owner_id=test_user.id,
        event_title="Test Event",
        event_text="An example event",
        street_address="POINT(40.7128 -74.0060)",
        max_radius=500,
        event_starts=datetime.utcnow(),
        event_ends=datetime.utcnow() + timedelta(hours=1),
        card_ids=[1, 2]
    )
    db_session.add(test_event)
    db_session.commit()
    db_session.refresh(test_event)

    invalid_end_time = test_event.event_starts - timedelta(hours=1)

    response = client.patch(f"/events/{test_event.event_id}/extend", json={"event_end": invalid_end_time.isoformat()})

    assert response.status_code == 400
    assert response.json()["detail"] == "Event end time must be after start time."


def test_update_event_cards_success(client, test_user, db_session):
    """Fails when trying to set event_ends before event_starts."""
    test_event = Event(
        owner_id=test_user.id,
        event_title="Test Event",
        event_text="An example event",
        street_address="POINT(40.7128 -74.0060)",
        max_radius=500,
        event_starts=datetime.utcnow(),
        event_ends=datetime.utcnow() + timedelta(hours=1),
        card_ids=[1, 2]
    )
    db_session.add(test_event)
    db_session.commit()
    db_session.refresh(test_event)

    new_card_ids = [3, 4]

    response = client.patch(f"/events/{test_event.event_id}/update_cards", json={"card_ids": new_card_ids})

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert sorted(data["card_ids"]) == sorted([1, 2, 3, 4])


def test_update_event_cards_fail_non_existent_event(client, db_session):
    """Fails when trying to update cards for a non-existent event."""
    response = client.patch("/events/999/update_cards", json={"card_ids": [3, 4]})
    assert response.status_code == 404
    assert response.json()["detail"] == "Event not found"


def test_update_event_cards_does_not_duplicate(client, test_user, db_session):
    """Ensures that duplicate cards are not added multiple times."""
    test_event = Event(
        owner_id=test_user.id,
        event_title="Test Event",
        event_text="An example event",
        street_address="POINT(40.7128 -74.0060)",
        max_radius=500,
        event_starts=datetime.utcnow(),
        event_ends=datetime.utcnow() + timedelta(hours=1),
        card_ids=[1, 2]
    )
    db_session.add(test_event)
    db_session.commit()
    db_session.refresh(test_event)

    duplicate_card_ids = [2, 3]  # Card 2 already exists

    response = client.patch(f"/events/{test_event.event_id}/update_cards", json={"card_ids": duplicate_card_ids})

    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    assert sorted(data["card_ids"]) == sorted([1, 2, 3])  # Should not have duplicate `2`

from datetime import datetime, timedelta
from app.models.event import Event


def test_end_event_early_success(client, test_user, db_session):
    """Test successfully ending an active event early."""
    test_event = Event(
        owner_id=test_user.id,
        event_title="Ongoing Event",
        event_text="This event is currently active.",
        street_address="POINT(40.7128 -74.0060)",
        max_radius=500,
        event_starts=datetime.utcnow() - timedelta(hours=1),  # Started 1 hour ago
        event_ends=datetime.utcnow() + timedelta(hours=2),  # Ends 2 hours from now
        card_ids=[1, 2]
    )
    db_session.add(test_event)
    db_session.commit()
    db_session.refresh(test_event)

    response = client.patch(f"/events/{test_event.event_id}/end")
    
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"
    data = response.json()
    
    assert data["event_id"] == test_event.event_id
    assert datetime.fromisoformat(data["event_ends"].replace("Z", "+00:00")) <= datetime.utcnow().replace(tzinfo=timezone.utc)


def test_end_event_early_non_existent_event(client, db_session):
    """Test attempting to end an event that doesn't exist."""
    response = client.patch("/events/99999/end")  # Non-existent event ID

    assert response.status_code == 404
    assert response.json()["detail"] == "Event not found"


def test_end_event_already_ended(client, test_user, db_session):
    """Test attempting to end an event that has already ended."""
    test_event = Event(
        owner_id=test_user.id,
        event_title="Past Event",
        event_text="This event has already ended.",
        street_address="POINT(40.7128 -74.0060)",
        max_radius=500,
        event_starts=datetime.utcnow() - timedelta(days=1),  # Started yesterday
        event_ends=datetime.utcnow() - timedelta(hours=1),  # Ended 1 hour ago
        card_ids=[3, 4]
    )
    db_session.add(test_event)
    db_session.commit()
    db_session.refresh(test_event)

    response = client.patch(f"/events/{test_event.event_id}/end")

    assert response.status_code == 400
    assert response.json()["detail"] == "Event has already ended."

@pytest.mark.skipif(IS_REMOTE, reason="Skip test in remote mode")
def test_fanout_card_on_join(client, db_session):
    """
    Test that when a new user joins an event, their card is fanned out to existing attendees.
    """
    # ✅ Generate short unique suffix for IDs
    suffix = str(uuid.uuid4())[:8]
    attendee_id = f"attendee_{suffix}"
    joiner_id = f"joiner_{suffix}"
    card_id_joiner = 99

    try:
        # ✅ Create initial attendee
        attendee = User(
            id=attendee_id,
            name="Alice",
            gender="Female",
            external_id=f"{attendee_id}_ext",
            terms_accepted=True
        )
        db_session.add(attendee)

        # ✅ Create joiner
        joiner = User(
            id=joiner_id,
            name="Bob",
            gender="Male",
            external_id=f"{joiner_id}_ext",
            terms_accepted=True
        )
        db_session.add(joiner)

        # ✅ Create event with only the attendee
        event = Event(
            owner_id=attendee.id,
            participant_ids=[attendee.id],
            card_ids=[1, 2],
            event_title="Fanout Test Event",
            event_text="Let's test fanout.",
            gender_restrict="Any",
            street_address="POINT(-74.0060 40.7128)",
            icon="icon.png",
            max_radius=500,
            event_starts=datetime.utcnow(),
            event_ends=datetime.utcnow() + timedelta(hours=2)
        )
        db_session.add(event)
        db_session.commit()

        # ✅ Perform the join operation as the joiner
        join_request = {
            "user_id": joiner.id,
            "card_id": card_id_joiner,
            "event_id": event.event_id,
            "meeting_date": datetime.utcnow().isoformat()
        }

        response = client.patch("/events/join", json=join_request)
        assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"

        # ✅ Verify that joiner got all previous cards
        joiner_collection = db_session.query(CardCollection).filter_by(
            user_id=joiner.id,
            event_id=event.event_id
        ).first()
        assert joiner_collection is not None
        assert set(joiner_collection.card_ids) == {1, 2, card_id_joiner}

        # ✅ Verify that the attendee received the joiner's card
        attendee_collection = db_session.query(CardCollection).filter_by(
            user_id=attendee.id,
            event_id=event.event_id
        ).first()
        assert attendee_collection is not None
        assert card_id_joiner in attendee_collection.card_ids

    finally:
        # ✅ Cleanup: remove all test data
        db_session.query(CardCollection).filter(CardCollection.user_id.in_([attendee_id, joiner_id])).delete()
        db_session.query(Event).filter_by(event_title="Fanout Test Event").delete()
        db_session.query(User).filter(User.id.in_([attendee_id, joiner_id])).delete()
        db_session.commit()

def test_create_event_with_street_name(client, test_user):
    """Ensure event is created successfully when street_name is provided."""
    payload = {
        "owner_id": test_user.id,
        "card_ids": [1],
        "event_title": "Street Name Event",
        "event_text": "Testing street name field.",
        "gender_restrict": "Any",
        "street_name": "123 Main St",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "icon": "event_icon.png",
        "max_radius": 1000,
        "event_starts": datetime.utcnow().isoformat(),
        "event_ends": (datetime.utcnow() + timedelta(hours=2)).isoformat()
    }

    response = client.post("/events/create", json=payload)
    assert response.status_code == 201
    assert response.json()["street_name"] == "123 Main St"


from datetime import datetime, timedelta
from app.models.event import Event
from app.models.user import User
from app.schemas.event import FindEventRequest

def test_get_events_in_area_returns_street_name(client, db_session, test_user):
    """Ensure that the /events/nearby endpoint includes street_name in response."""

    # Create an event with a specific street_name
    event = Event(
        owner_id=test_user.id,
        card_ids=[1, 2],
        participant_ids=[test_user.id],
        event_title="Street Test Event",
        event_text="Event for street name test",
        gender_restrict="Any",
        street_address="POINT(-74.0060 40.7128)",
        street_name="456 Test Ave",
        icon="event_icon.png",
        max_radius=1000,
        event_starts=datetime.utcnow(),
        event_ends=datetime.utcnow() + timedelta(hours=2)
    )
    db_session.add(event)
    db_session.commit()

    # Send request to /events/nearby with user close to the event
    payload = {
        "user_id": test_user.id,
        "lat": 40.7128,
        "lng": -74.0060,
        "gender": "Any"
    }

    response = client.post("/events/nearby", json=payload)
    assert response.status_code == 200, f"Unexpected response: {response.status_code}, body: {response.text}"

    data = response.json()
    assert len(data) >= 1
    matching = next((e for e in data if e["event_title"] == "Street Test Event"), None)
    assert matching is not None
    assert matching["street_name"] == "456 Test Ave"
