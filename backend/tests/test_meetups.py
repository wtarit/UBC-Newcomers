"""
Tests for the /meetups endpoints.

Covers:
- POST /meetups - create a meetup at a landmark
- GET /meetups - list active meetups (excludes own)
- PUT /meetups/{id}/join - join a meetup
- PUT /meetups/{id}/complete - complete an accepted meetup
- PUT /meetups/{id}/cancel - cancel own meetup
- Edge cases: join own, join already-joined, complete non-accepted, etc.
"""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.landmark import Landmark
from app.models.meetup import Meetup
from app.models.user import User


class TestCreateMeetup:
    async def test_create_meetup_success(
        self, client: AsyncClient, test_landmark: Landmark
    ):
        resp = await client.post(
            "/meetups",
            json={"landmark_id": str(test_landmark.id)},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "active"
        assert data["landmark"]["id"] == str(test_landmark.id)
        assert data["joiner"] is None

    async def test_create_meetup_with_scheduled_time(
        self, client: AsyncClient, test_landmark: Landmark
    ):
        resp = await client.post(
            "/meetups",
            json={
                "landmark_id": str(test_landmark.id),
                "scheduled_time": "2026-07-01T14:00:00Z",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["scheduled_time"] is not None

    async def test_create_meetup_bad_landmark(self, client: AsyncClient):
        resp = await client.post(
            "/meetups",
            json={"landmark_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 404


class TestListActiveMeetups:
    async def test_list_active_excludes_own(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
        test_landmark: Landmark,
    ):
        """Create meetups by both users; listing should exclude test_user's own."""
        own_meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=test_user.id,
            landmark_id=test_landmark.id,
            status="active",
        )
        other_meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=other_user.id,
            landmark_id=test_landmark.id,
            status="active",
        )
        db_session.add_all([own_meetup, other_meetup])
        await db_session.flush()

        resp = await client.get("/meetups", params={"radius_km": 50.0})
        assert resp.status_code == 200
        data = resp.json()
        creator_ids = [m["creator"]["id"] for m in data["meetups"]]
        assert str(test_user.id) not in creator_ids
        assert str(other_user.id) in creator_ids


class TestJoinMeetup:
    async def test_join_meetup_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
        test_landmark: Landmark,
    ):
        meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=other_user.id,
            landmark_id=test_landmark.id,
            status="active",
        )
        db_session.add(meetup)
        await db_session.flush()

        resp = await client.put(f"/meetups/{meetup.id}/join")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "accepted"
        assert data["joiner"]["id"] == str(test_user.id)

    async def test_cannot_join_own_meetup(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_landmark: Landmark,
    ):
        meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=test_user.id,
            landmark_id=test_landmark.id,
            status="active",
        )
        db_session.add(meetup)
        await db_session.flush()

        resp = await client.put(f"/meetups/{meetup.id}/join")
        assert resp.status_code == 400
        assert "own meetup" in resp.json()["detail"].lower()

    async def test_cannot_join_already_joined_meetup(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
        test_landmark: Landmark,
    ):
        meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=other_user.id,
            joiner_id=other_user.id,  # already has a joiner
            landmark_id=test_landmark.id,
            status="active",
        )
        db_session.add(meetup)
        await db_session.flush()

        resp = await client.put(f"/meetups/{meetup.id}/join")
        assert resp.status_code == 400

    async def test_join_nonexistent_meetup(self, client: AsyncClient):
        resp = await client.put(f"/meetups/{uuid.uuid4()}/join")
        assert resp.status_code == 404


class TestCompleteMeetup:
    async def test_complete_meetup_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
        test_landmark: Landmark,
    ):
        meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=test_user.id,
            joiner_id=other_user.id,
            landmark_id=test_landmark.id,
            status="accepted",
        )
        db_session.add(meetup)
        await db_session.flush()

        resp = await client.put(f"/meetups/{meetup.id}/complete")
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    async def test_cannot_complete_active_meetup(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_landmark: Landmark,
    ):
        meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=test_user.id,
            landmark_id=test_landmark.id,
            status="active",
        )
        db_session.add(meetup)
        await db_session.flush()

        resp = await client.put(f"/meetups/{meetup.id}/complete")
        assert resp.status_code == 400
        assert "accepted" in resp.json()["detail"].lower()

    async def test_non_participant_cannot_complete(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        other_user: User,
        test_landmark: Landmark,
    ):
        """Meetup where test_user is neither creator nor joiner."""
        third_user = User(
            id=uuid.uuid4(),
            cognito_sub="test-sub-333",
            email="third@student.ubc.ca",
            full_name="Third User",
        )
        db_session.add(third_user)
        await db_session.flush()

        meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=other_user.id,
            joiner_id=third_user.id,
            landmark_id=test_landmark.id,
            status="accepted",
        )
        db_session.add(meetup)
        await db_session.flush()

        resp = await client.put(f"/meetups/{meetup.id}/complete")
        assert resp.status_code == 403


class TestCancelMeetup:
    async def test_cancel_own_meetup(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        test_landmark: Landmark,
    ):
        meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=test_user.id,
            landmark_id=test_landmark.id,
            status="active",
        )
        db_session.add(meetup)
        await db_session.flush()

        resp = await client.put(f"/meetups/{meetup.id}/cancel")
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    async def test_non_creator_cannot_cancel(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        other_user: User,
        test_landmark: Landmark,
    ):
        meetup = Meetup(
            id=uuid.uuid4(),
            creator_id=other_user.id,
            landmark_id=test_landmark.id,
            status="active",
        )
        db_session.add(meetup)
        await db_session.flush()

        resp = await client.put(f"/meetups/{meetup.id}/cancel")
        assert resp.status_code == 403
