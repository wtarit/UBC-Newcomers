"""
Shared fixtures for the UBC Newcomers test suite.

Strategy:
- Tables are created once (idempotent create_all) at session start.
- Each test gets an isolated DB session using the nested-transaction
  (SAVEPOINT) pattern: the outer transaction is never committed, so
  every test's writes are fully rolled back -- including writes made
  by route handlers that call session.commit().
- AWS services (Cognito, S3, Bedrock) are mocked via autouse fixture.
- FastAPI's get_current_user dependency is overridden per-test.
"""

from __future__ import annotations

import uuid
from typing import AsyncGenerator
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)
from sqlalchemy.orm import SessionTransaction

from app.config import settings
from app.database import Base, get_db
from app.dependencies import get_current_user
from app.models.landmark import Landmark
from app.models.user import User

# ---------------------------------------------------------------------------
# Engine (module-level singleton)
# ---------------------------------------------------------------------------
_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(settings.database_url, echo=False)
    return _engine


# ---------------------------------------------------------------------------
# Session-scoped: ensure tables exist
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _setup_tables():
    engine = _get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()
    global _engine
    _engine = None


# ---------------------------------------------------------------------------
# Function-scoped DB session using the SAVEPOINT pattern
#
# 1. Open a raw connection and start a real transaction (BEGIN).
# 2. Create a SAVEPOINT (begin_nested) inside it.
# 3. Bind an AsyncSession to that connection.
# 4. Whenever the session commits (releasing the SAVEPOINT), immediately
#    open a new SAVEPOINT so subsequent operations keep working.
# 5. On teardown, rollback the outer transaction -- undoing everything.
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(loop_scope="session")
async def db_session(_setup_tables) -> AsyncGenerator[AsyncSession, None]:
    engine = _get_engine()
    conn = await engine.connect()
    txn = await conn.begin()          # outer transaction (never committed)
    await conn.begin_nested()         # first SAVEPOINT

    session = AsyncSession(bind=conn, expire_on_commit=False)

    # Whenever a SAVEPOINT is ended (committed or rolled back inside the
    # session), start a fresh one so the session keeps working within the
    # outer transaction.
    @event.listens_for(session.sync_session, "after_transaction_end")
    def _restart_savepoint(sess, trans: SessionTransaction):
        if conn.closed:
            return
        if not conn.in_nested_transaction():
            conn.sync_connection.begin_nested()

    yield session

    await session.close()
    await txn.rollback()
    await conn.close()


# ---------------------------------------------------------------------------
# Test data fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(loop_scope="session")
async def test_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        cognito_sub="test-sub-111",
        email="testuser@student.ubc.ca",
        full_name="Test User",
        major="Computer Science",
        year_standing=3,
        origin="Canada",
        interests=["hiking", "coding", "photography"],
        faculty="Science",
        bio="A test user for unit tests",
        onboarding_completed=True,
        is_available_to_meet=True,
        last_latitude=49.2606,
        last_longitude=-123.2460,
        home_latitude=49.2606,
        home_longitude=-123.2460,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture(loop_scope="session")
async def other_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        cognito_sub="test-sub-222",
        email="other@student.ubc.ca",
        full_name="Other User",
        major="Biology",
        year_standing=2,
        origin="Japan",
        interests=["music", "cooking"],
        faculty="Science",
        bio="Another test user",
        onboarding_completed=True,
        is_available_to_meet=True,
        last_latitude=49.2650,
        last_longitude=-123.2500,
        home_latitude=49.2650,
        home_longitude=-123.2500,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture(loop_scope="session")
async def test_landmark(db_session: AsyncSession) -> Landmark:
    landmark = Landmark(
        id=uuid.uuid4(),
        name="Test Landmark",
        description="A test landmark on campus",
        latitude=49.2665,
        longitude=-123.2490,
    )
    db_session.add(landmark)
    await db_session.flush()
    return landmark


# ---------------------------------------------------------------------------
# Mock AWS services (autouse)
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _mock_aws_services():
    """Patch all AWS service calls so no real requests are made."""
    with (
        patch("app.services.cognito._client") as mock_cognito,
        patch("app.services.s3._client") as mock_s3,
        patch("app.services.bedrock._client") as mock_bedrock,
    ):
        cognito_client = MagicMock()
        mock_cognito.return_value = cognito_client
        cognito_client.sign_up.return_value = {"UserSub": "mock-cognito-sub-123"}
        cognito_client.confirm_sign_up.return_value = {}
        cognito_client.initiate_auth.return_value = {
            "AuthenticationResult": {
                "AccessToken": "mock-access-token",
                "RefreshToken": "mock-refresh-token",
                "IdToken": "mock-id-token",
            }
        }
        cognito_client.get_user.return_value = {
            "UserAttributes": [
                {"Name": "sub", "Value": "test-sub-111"},
                {"Name": "email", "Value": "testuser@student.ubc.ca"},
                {"Name": "name", "Value": "Test User"},
            ]
        }
        cognito_client.forgot_password.return_value = {}
        cognito_client.confirm_forgot_password.return_value = {}

        s3_client = MagicMock()
        mock_s3.return_value = s3_client
        s3_client.generate_presigned_url.return_value = (
            "https://s3.example.com/presigned"
        )

        bedrock_client = MagicMock()
        mock_bedrock.return_value = bedrock_client

        yield


# ---------------------------------------------------------------------------
# HTTP clients
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(loop_scope="session")
async def client(
    db_session: AsyncSession,
    test_user: User,
) -> AsyncGenerator[AsyncClient, None]:
    """Authenticated async HTTP client bound to the test DB session."""
    from main import app

    async def _override_get_db():
        yield db_session

    async def _override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(loop_scope="session")
async def unauthed_client(
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncClient, None]:
    """Unauthenticated HTTP client bound to the test DB session."""
    from main import app

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()
