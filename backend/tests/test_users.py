"""
Tests for the /users endpoints.

Covers:
- GET /users/me - fetch own profile
- POST /users/onboarding - create user on onboarding
- PUT /users/me - update profile
- PUT /users/me/location - update live location
- PUT /users/me/home-location - set home location
- PUT /users/me/availability - toggle availability
- GET /users/me/presigned-upload - S3 presigned URL
- GET /users/me/stats - user statistics
- GET /users/nearby - nearby available users
- GET /users/{user_id} - public profile
"""

from httpx import AsyncClient

from app.models.user import User


class TestGetMe:
    async def test_get_me_returns_profile(self, client: AsyncClient, test_user: User):
        resp = await client.get("/users/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name
        assert data["major"] == "Computer Science"

    async def test_get_me_includes_expected_fields(self, client: AsyncClient):
        resp = await client.get("/users/me")
        data = resp.json()
        expected_fields = {
            "id", "email", "full_name", "major", "year_standing",
            "origin", "interests", "transfer_from", "faculty", "bio",
            "profile_picture_url", "home_latitude", "home_longitude",
            "is_available_to_meet", "connections_count", "meetups_completed",
            "events_attended", "created_at",
        }
        assert expected_fields.issubset(data.keys())


class TestOnboarding:
    async def test_complete_onboarding_creates_user(self, onboarding_client: AsyncClient):
        resp = await onboarding_client.post(
            "/users/onboarding",
            json={
                "full_name": "New User",
                "major": "Physics",
                "year_standing": 2,
                "origin": "Korea",
                "interests": ["stargazing", "gaming"],
                "faculty": "Science",
                "bio": "Love physics!",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["full_name"] == "New User"
        assert data["major"] == "Physics"
        assert data["year_standing"] == 2
        assert data["origin"] == "Korea"
        assert data["email"] == "newuser@student.ubc.ca"

    async def test_onboarding_duplicate_returns_409(self, onboarding_client: AsyncClient):
        # First call creates the user
        await onboarding_client.post(
            "/users/onboarding",
            json={"full_name": "New User"},
        )
        # Second call with same identity should conflict
        resp = await onboarding_client.post(
            "/users/onboarding",
            json={"full_name": "New User"},
        )
        assert resp.status_code == 409


class TestUpdateProfile:
    async def test_update_full_name(self, client: AsyncClient):
        resp = await client.put(
            "/users/me",
            json={"full_name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    async def test_update_multiple_fields(self, client: AsyncClient):
        resp = await client.put(
            "/users/me",
            json={
                "bio": "New bio here",
                "interests": ["swimming", "reading"],
                "year_standing": 4,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["bio"] == "New bio here"
        assert data["interests"] == ["swimming", "reading"]
        assert data["year_standing"] == 4


class TestUpdateLocation:
    async def test_update_location(self, client: AsyncClient):
        resp = await client.put(
            "/users/me/location",
            json={"latitude": 49.2700, "longitude": -123.2500},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert abs(data["home_latitude"] - 49.2606) < 0.01  # home stays the same
        # last_latitude is not in UserResponse directly, but the endpoint should succeed

    async def test_set_home_location(self, client: AsyncClient):
        resp = await client.put(
            "/users/me/home-location",
            json={"latitude": 49.2800, "longitude": -123.2300},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert abs(data["home_latitude"] - 49.28) < 0.001
        assert abs(data["home_longitude"] - (-123.23)) < 0.001


class TestAvailability:
    async def test_set_available(self, client: AsyncClient):
        resp = await client.put(
            "/users/me/availability",
            json={"is_available_to_meet": True},
        )
        assert resp.status_code == 200
        assert resp.json()["is_available_to_meet"] is True

    async def test_set_unavailable(self, client: AsyncClient):
        resp = await client.put(
            "/users/me/availability",
            json={"is_available_to_meet": False},
        )
        assert resp.status_code == 200
        assert resp.json()["is_available_to_meet"] is False


class TestPresignedUpload:
    async def test_get_presigned_upload_url(self, client: AsyncClient):
        resp = await client.get("/users/me/presigned-upload")
        assert resp.status_code == 200
        data = resp.json()
        assert "upload_url" in data
        assert "file_key" in data


class TestUserStats:
    async def test_get_stats(self, client: AsyncClient):
        resp = await client.get("/users/me/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "connections_count" in data
        assert "meetups_completed" in data
        assert "events_attended" in data
        assert "member_since" in data


class TestNearbyUsers:
    async def test_nearby_returns_other_user(
        self, client: AsyncClient, test_user: User, other_user: User
    ):
        """other_user is within ~0.5 km of test_user and is available."""
        resp = await client.get("/users/nearby", params={"radius_km": 5.0})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        ids = [u["user"]["id"] for u in data]
        assert str(other_user.id) in ids

    async def test_nearby_excludes_self(
        self, client: AsyncClient, test_user: User, other_user: User
    ):
        resp = await client.get("/users/nearby", params={"radius_km": 50.0})
        ids = [u["user"]["id"] for u in resp.json()]
        assert str(test_user.id) not in ids

    async def test_nearby_respects_radius(
        self, client: AsyncClient, test_user: User, other_user: User
    ):
        resp = await client.get("/users/nearby", params={"radius_km": 0.001})
        assert resp.status_code == 200
        # With a tiny radius, other_user (0.5 km away) should not appear
        assert len(resp.json()) == 0


class TestGetUserPublic:
    async def test_get_other_user_profile(
        self, client: AsyncClient, other_user: User
    ):
        resp = await client.get(f"/users/{other_user.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["full_name"] == "Other User"
        # Public profile should not include email
        assert "email" not in data

    async def test_get_nonexistent_user_returns_404(self, client: AsyncClient):
        import uuid
        resp = await client.get(f"/users/{uuid.uuid4()}")
        assert resp.status_code == 404
