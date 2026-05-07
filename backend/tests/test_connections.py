"""
Tests for the /connections endpoints.

Covers:
- POST /connections/request/{user_id} - send connection request
- PUT /connections/{id}/accept - accept request
- PUT /connections/{id}/decline - decline request
- GET /connections - list accepted connections
- GET /connections/pending - list pending requests
- Edge cases: self-connect, duplicate requests, wrong receiver
"""

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connection import Connection
from app.models.user import User


class TestSendConnectionRequest:
    async def test_send_request_success(
        self, client: AsyncClient, other_user: User
    ):
        resp = await client.post(f"/connections/request/{other_user.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending"
        assert data["receiver"]["id"] == str(other_user.id)

    async def test_cannot_connect_with_self(
        self, client: AsyncClient, test_user: User
    ):
        resp = await client.post(f"/connections/request/{test_user.id}")
        assert resp.status_code == 400
        assert "yourself" in resp.json()["detail"].lower()

    async def test_cannot_connect_nonexistent_user(self, client: AsyncClient):
        resp = await client.post(f"/connections/request/{uuid.uuid4()}")
        assert resp.status_code == 404

    async def test_duplicate_request_rejected(
        self, client: AsyncClient, other_user: User
    ):
        await client.post(f"/connections/request/{other_user.id}")
        resp = await client.post(f"/connections/request/{other_user.id}")
        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"].lower()


class TestAcceptConnection:
    async def test_accept_connection(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
    ):
        """Create a pending connection where other_user is the requester,
        test_user is receiver. test_user (the authed user) accepts it."""
        conn = Connection(
            id=uuid.uuid4(),
            requester_id=other_user.id,
            receiver_id=test_user.id,
            status="pending",
        )
        db_session.add(conn)
        await db_session.flush()

        resp = await client.put(f"/connections/{conn.id}/accept")
        assert resp.status_code == 200
        assert resp.json()["status"] == "accepted"

    async def test_only_receiver_can_accept(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
    ):
        """test_user is the requester, so test_user cannot accept."""
        conn = Connection(
            id=uuid.uuid4(),
            requester_id=test_user.id,
            receiver_id=other_user.id,
            status="pending",
        )
        db_session.add(conn)
        await db_session.flush()

        resp = await client.put(f"/connections/{conn.id}/accept")
        assert resp.status_code == 403

    async def test_accept_nonexistent_connection(self, client: AsyncClient):
        resp = await client.put(f"/connections/{uuid.uuid4()}/accept")
        assert resp.status_code == 404

    async def test_cannot_accept_non_pending(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
    ):
        conn = Connection(
            id=uuid.uuid4(),
            requester_id=other_user.id,
            receiver_id=test_user.id,
            status="accepted",
        )
        db_session.add(conn)
        await db_session.flush()

        resp = await client.put(f"/connections/{conn.id}/accept")
        assert resp.status_code == 400
        assert "not pending" in resp.json()["detail"].lower()


class TestDeclineConnection:
    async def test_decline_connection(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
    ):
        conn = Connection(
            id=uuid.uuid4(),
            requester_id=other_user.id,
            receiver_id=test_user.id,
            status="pending",
        )
        db_session.add(conn)
        await db_session.flush()

        resp = await client.put(f"/connections/{conn.id}/decline")
        assert resp.status_code == 200
        assert resp.json()["status"] == "declined"

    async def test_only_receiver_can_decline(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
    ):
        conn = Connection(
            id=uuid.uuid4(),
            requester_id=test_user.id,
            receiver_id=other_user.id,
            status="pending",
        )
        db_session.add(conn)
        await db_session.flush()

        resp = await client.put(f"/connections/{conn.id}/decline")
        assert resp.status_code == 403


class TestListConnections:
    async def test_list_accepted_connections(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
    ):
        conn = Connection(
            id=uuid.uuid4(),
            requester_id=other_user.id,
            receiver_id=test_user.id,
            status="accepted",
        )
        db_session.add(conn)
        await db_session.flush()

        resp = await client.get("/connections")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert any(c["status"] == "accepted" for c in data["connections"])

    async def test_list_does_not_include_pending(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
    ):
        conn = Connection(
            id=uuid.uuid4(),
            requester_id=other_user.id,
            receiver_id=test_user.id,
            status="pending",
        )
        db_session.add(conn)
        await db_session.flush()

        resp = await client.get("/connections")
        data = resp.json()
        statuses = [c["status"] for c in data["connections"]]
        assert "pending" not in statuses


class TestListPending:
    async def test_list_pending_requests(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
        other_user: User,
    ):
        conn = Connection(
            id=uuid.uuid4(),
            requester_id=other_user.id,
            receiver_id=test_user.id,
            status="pending",
        )
        db_session.add(conn)
        await db_session.flush()

        resp = await client.get("/connections/pending")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert all(c["status"] == "pending" for c in data["connections"])
