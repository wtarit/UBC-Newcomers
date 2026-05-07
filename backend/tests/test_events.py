"""
Tests for the /events endpoints.

Covers:
- GET /events - list all events (paginated)
- POST /events - create a manual event (authenticated)
- GET /events/nearby - nearby events (authenticated, needs location)
"""

import uuid
from datetime import datetime, timezone

import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.user import User


@pytest_asyncio.fixture(loop_scope="session")
async def sample_events(db_session: AsyncSession) -> list[Event]:
    """Seed a few events for listing tests."""
    events = []
    for i in range(3):
        e = Event(
            id=uuid.uuid4(),
            title=f"Test Event {i}",
            description=f"Description for event {i}",
            source="manual",
            club_name=f"Club {i}",
            latitude=49.2665 + i * 0.001,
            longitude=-123.2490 + i * 0.001,
            location_name=f"Location {i}",
            event_date=datetime(2026, 6, 1 + i, tzinfo=timezone.utc),
        )
        db_session.add(e)
        events.append(e)
    await db_session.flush()
    return events


class TestListEvents:
    async def test_list_events_empty(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.get("/events")
        assert resp.status_code == 200
        data = resp.json()
        assert "events" in data
        assert "total" in data
        assert isinstance(data["events"], list)

    async def test_list_events_with_data(
        self, unauthed_client: AsyncClient, sample_events: list[Event]
    ):
        resp = await unauthed_client.get("/events")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 3
        titles = [e["title"] for e in data["events"]]
        assert "Test Event 0" in titles

    async def test_list_events_pagination(
        self, unauthed_client: AsyncClient, sample_events: list[Event]
    ):
        resp = await unauthed_client.get("/events", params={"skip": 0, "limit": 2})
        assert resp.status_code == 200
        assert len(resp.json()["events"]) <= 2

    async def test_list_events_skip(
        self, unauthed_client: AsyncClient, sample_events: list[Event]
    ):
        resp = await unauthed_client.get("/events", params={"skip": 100, "limit": 20})
        assert resp.status_code == 200
        assert len(resp.json()["events"]) == 0


class TestCreateEvent:
    async def test_create_event_success(self, client: AsyncClient):
        resp = await client.post(
            "/events",
            json={
                "title": "My New Event",
                "description": "A cool gathering",
                "club_name": "Coding Club",
                "latitude": 49.2700,
                "longitude": -123.2500,
                "location_name": "The Nest",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "My New Event"
        assert data["source"] == "manual"
        assert data["club_name"] == "Coding Club"

    async def test_create_event_minimal_fields(self, client: AsyncClient):
        resp = await client.post(
            "/events",
            json={"title": "Minimal Event"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Minimal Event"
        assert data["description"] is None

    async def test_create_event_with_date(self, client: AsyncClient):
        resp = await client.post(
            "/events",
            json={
                "title": "Future Event",
                "event_date": "2026-09-01T10:00:00Z",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["event_date"] is not None


class TestNearbyEvents:
    async def test_nearby_events(
        self, client: AsyncClient, sample_events: list[Event], test_user: User
    ):
        """test_user has home_latitude/home_longitude set; events are near UBC."""
        resp = await client.get("/events/nearby", params={"radius_km": 10.0})
        assert resp.status_code == 200
        data = resp.json()
        assert "events" in data
        assert "total" in data
