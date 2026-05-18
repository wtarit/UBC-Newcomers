from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.otp_code import OTPCode


class TestOTPSend:
    async def test_send_otp_success(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post("/auth/otp/send", json={"email": "user@gmail.com"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["expires_in_seconds"] == 600

    async def test_send_otp_invalid_email(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post("/auth/otp/send", json={"email": "not-an-email"})
        assert resp.status_code == 422

    async def test_send_otp_rate_limit(self, unauthed_client: AsyncClient, db_session: AsyncSession):
        email = "ratelimit@test.com"
        for _ in range(3):
            otp = OTPCode(
                email=email,
                code="123456",
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            )
            db_session.add(otp)
        await db_session.flush()

        resp = await unauthed_client.post("/auth/otp/send", json={"email": email})
        assert resp.status_code == 429


class TestOTPVerify:
    async def _create_otp(self, db_session: AsyncSession, email: str = "verify@test.com", code: str = "123456") -> OTPCode:
        otp = OTPCode(
            email=email,
            code=code,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db_session.add(otp)
        await db_session.flush()
        return otp

    async def test_verify_success_new_user(self, unauthed_client: AsyncClient, db_session: AsyncSession):
        await self._create_otp(db_session, "newuser@gmail.com", "654321")
        resp = await unauthed_client.post("/auth/otp/verify", json={"email": "newuser@gmail.com", "code": "654321"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["firebase_custom_token"] == "mock-custom-token"
        assert data["is_new_user"] is True
        assert data["ubc_verified"] is False

    async def test_verify_success_ubc_email(self, unauthed_client: AsyncClient, db_session: AsyncSession):
        await self._create_otp(db_session, "student@student.ubc.ca", "111222")
        resp = await unauthed_client.post("/auth/otp/verify", json={"email": "student@student.ubc.ca", "code": "111222"})
        assert resp.status_code == 200
        assert resp.json()["ubc_verified"] is True

    async def test_verify_wrong_code(self, unauthed_client: AsyncClient, db_session: AsyncSession):
        await self._create_otp(db_session, "wrong@test.com", "123456")
        resp = await unauthed_client.post("/auth/otp/verify", json={"email": "wrong@test.com", "code": "000000"})
        assert resp.status_code == 400
        assert "Invalid code" in resp.json()["detail"]

    async def test_verify_expired_code(self, unauthed_client: AsyncClient, db_session: AsyncSession):
        otp = OTPCode(
            email="expired@test.com",
            code="123456",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
        db_session.add(otp)
        await db_session.flush()

        resp = await unauthed_client.post("/auth/otp/verify", json={"email": "expired@test.com", "code": "123456"})
        assert resp.status_code == 400
        assert "No valid code" in resp.json()["detail"]

    async def test_verify_max_attempts(self, unauthed_client: AsyncClient, db_session: AsyncSession):
        otp = OTPCode(
            email="maxattempts@test.com",
            code="123456",
            attempts=5,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db_session.add(otp)
        await db_session.flush()

        resp = await unauthed_client.post("/auth/otp/verify", json={"email": "maxattempts@test.com", "code": "123456"})
        assert resp.status_code == 400
        assert "Too many attempts" in resp.json()["detail"]

    async def test_verify_already_used(self, unauthed_client: AsyncClient, db_session: AsyncSession):
        otp = OTPCode(
            email="used@test.com",
            code="123456",
            used=True,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db_session.add(otp)
        await db_session.flush()

        resp = await unauthed_client.post("/auth/otp/verify", json={"email": "used@test.com", "code": "123456"})
        assert resp.status_code == 400
        assert "No valid code" in resp.json()["detail"]
