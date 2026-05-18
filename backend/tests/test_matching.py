"""
Tests for the /matching endpoints.

Covers:
- GET /matching/users - AI-matched users (bedrock mocked)
- GET /matching/events - AI-matched events (bedrock mocked)
- Behavior when no candidates / no events exist
"""

import json
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.user import User


def _make_bedrock_response(content_text: str) -> MagicMock:
    """Build a mock Bedrock invoke_model response."""
    body_bytes = json.dumps(
        {"content": [{"text": content_text}]}
    ).encode()
    mock_body = MagicMock()
    mock_body.read.return_value = body_bytes
    return {"body": mock_body}


class TestMatchUsers:
    async def test_match_users_returns_matches(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
    ):
        """Mock bedrock to return a scored match for other_user."""
        bedrock_json = json.dumps([
            {"index": 0, "score": 0.85, "reason": "Shared interest in science"}
        ])

        with patch("app.services.bedrock._client") as mock_br:
            br_client = MagicMock()
            mock_br.return_value = br_client
            br_client.invoke_model.return_value = _make_bedrock_response(bedrock_json)

            resp = await client.get("/matching/users", params={"limit": 10})

        assert resp.status_code == 200
        data = resp.json()
        assert "matches" in data

    async def test_match_users_empty_when_no_candidates(
        self, client: AsyncClient, test_user: User
    ):
        """When there are no other onboarded users, matches should be empty."""
        with patch("app.services.bedrock._client") as mock_br:
            br_client = MagicMock()
            mock_br.return_value = br_client
            # bedrock.match_users returns [] for empty candidates, never calls invoke_model

            resp = await client.get("/matching/users", params={"limit": 10})

        assert resp.status_code == 200
        data = resp.json()
        assert data["matches"] == []

    async def test_match_users_fallback_when_bedrock_fails(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
    ):
        similar_user = User(
            id=uuid.uuid4(),
            firebase_uid="fallback-uid-333",
            email="fallback@student.ubc.ca",
            full_name="Fallback User",
            major=test_user.major,
            faculty=test_user.faculty,
            year_standing=test_user.year_standing,
            interests=test_user.interests,
            onboarding_completed=True,
        )
        db_session.add(similar_user)
        await db_session.flush()

        with patch("app.services.bedrock._client") as mock_br:
            br_client = MagicMock()
            mock_br.return_value = br_client
            br_client.invoke_model.side_effect = Exception("Bedrock unavailable")
            resp = await client.get("/matching/users", params={"limit": 10})

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["matches"]) >= 1


class TestMatchEvents:
    async def test_match_events_returns_matches(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
    ):
        # Seed an event
        event = Event(
            id=uuid.uuid4(),
            title="Coding Workshop",
            description="Learn Python",
            source="manual",
            club_name="CS Club",
            event_date=datetime(2026, 7, 1, tzinfo=timezone.utc),
        )
        db_session.add(event)
        await db_session.flush()

        bedrock_json = json.dumps([
            {"index": 0, "score": 0.90, "reason": "Matches coding interest"}
        ])

        with patch("app.services.bedrock._client") as mock_br:
            br_client = MagicMock()
            mock_br.return_value = br_client
            br_client.invoke_model.return_value = _make_bedrock_response(bedrock_json)

            resp = await client.get("/matching/events", params={"limit": 10})

        assert resp.status_code == 200
        data = resp.json()
        assert "matches" in data

    async def test_match_events_empty_when_no_events(
        self, client: AsyncClient, test_user: User
    ):
        with patch("app.services.bedrock._client") as mock_br:
            br_client = MagicMock()
            mock_br.return_value = br_client

            resp = await client.get("/matching/events", params={"limit": 10})

        assert resp.status_code == 200
        assert resp.json()["matches"] == []

    async def test_match_events_bedrock_failure_returns_empty(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
    ):
        """If Bedrock raises, match_events catches and returns []."""
        event = Event(
            id=uuid.uuid4(),
            title="Some Event",
            source="manual",
        )
        db_session.add(event)
        await db_session.flush()

        with patch("app.services.bedrock._client") as mock_br:
            br_client = MagicMock()
            mock_br.return_value = br_client
            br_client.invoke_model.side_effect = Exception("Bedrock is down")

            resp = await client.get("/matching/events", params={"limit": 10})

        assert resp.status_code == 200
        assert resp.json()["matches"] == []
