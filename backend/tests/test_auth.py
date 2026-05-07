"""
Tests for the /auth endpoints.

Covers:
- UBC email validation (accepts *.ubc.ca, rejects others)
- Test-allowlisted email bypass
- Signup, verify, login, refresh, forgot/reset password flows (with mocked Cognito)
"""

import pytest
from httpx import AsyncClient

from app.services.cognito import validate_ubc_email
from fastapi import HTTPException

# ---------------------------------------------------------------------------
# Email validation (unit tests, no HTTP needed)
# ---------------------------------------------------------------------------
class TestEmailValidation:
    """Unit tests for the validate_ubc_email helper."""

    def test_accepts_student_ubc_ca(self):
        validate_ubc_email("alice@student.ubc.ca")

    def test_accepts_ubc_ca(self):
        validate_ubc_email("prof@ubc.ca")

    def test_accepts_alumni_ubc_ca(self):
        validate_ubc_email("grad@alumni.ubc.ca")

    def test_accepts_mail_ubc_ca(self):
        validate_ubc_email("student@mail.ubc.ca")

    def test_accepts_subdomain_of_ubc_ca(self):
        validate_ubc_email("someone@cs.ubc.ca")

    def test_rejects_gmail(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_ubc_email("user@gmail.com")
        assert exc_info.value.status_code == 400
        assert "UBC email" in exc_info.value.detail

    def test_rejects_outlook(self):
        with pytest.raises(HTTPException):
            validate_ubc_email("user@outlook.com")

    def test_rejects_similar_domain(self):
        with pytest.raises(HTTPException):
            validate_ubc_email("trick@notubc.ca")

    def test_allowlisted_email_bypasses_check(self):
        """The test email in settings should pass even though it is gmail."""
        validate_ubc_email("tarit.witworrasakul@gmail.com")

    def test_allowlist_is_case_insensitive(self):
        validate_ubc_email("Tarit.Witworrasakul@gmail.com")


# ---------------------------------------------------------------------------
# Signup endpoint
# ---------------------------------------------------------------------------
class TestSignup:
    async def test_signup_ubc_email_success(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post(
            "/auth/signup",
            json={
                "email": "new@student.ubc.ca",
                "password": "StrongPass1!",
                "full_name": "New Student",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "cognito_sub" in data
        assert data["message"] == "Verification code sent to your email"

    async def test_signup_non_ubc_email_rejected(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post(
            "/auth/signup",
            json={
                "email": "person@gmail.com",
                "password": "StrongPass1!",
                "full_name": "Bad Email",
            },
        )
        assert resp.status_code == 400
        assert "UBC email" in resp.json()["detail"]

    async def test_signup_allowlisted_email_accepted(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post(
            "/auth/signup",
            json={
                "email": "tarit.witworrasakul@gmail.com",
                "password": "StrongPass1!",
                "full_name": "Tarit W",
            },
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Verify email
# ---------------------------------------------------------------------------
class TestVerifyEmail:
    async def test_verify_success(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post(
            "/auth/verify",
            json={"email": "new@student.ubc.ca", "confirmation_code": "123456"},
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Email verified successfully"


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------
class TestLogin:
    async def test_login_returns_tokens(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post(
            "/auth/login",
            json={"email": "new@student.ubc.ca", "password": "StrongPass1!"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "id_token" in data
        assert data["token_type"] == "Bearer"


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------
class TestRefreshToken:
    async def test_refresh_returns_new_tokens(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post(
            "/auth/refresh",
            json={"refresh_token": "old-refresh-token"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "id_token" in data


# ---------------------------------------------------------------------------
# Forgot / reset password
# ---------------------------------------------------------------------------
class TestForgotResetPassword:
    async def test_forgot_password(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post(
            "/auth/forgot-password",
            json={"email": "student@student.ubc.ca"},
        )
        assert resp.status_code == 200
        assert "reset code" in resp.json()["message"].lower()

    async def test_reset_password(self, unauthed_client: AsyncClient):
        resp = await unauthed_client.post(
            "/auth/reset-password",
            json={
                "email": "student@student.ubc.ca",
                "confirmation_code": "654321",
                "new_password": "NewPass2!",
            },
        )
        assert resp.status_code == 200
        assert "reset successfully" in resp.json()["message"].lower()
