"""
Tests for the /landmarks endpoints.

Covers:
- GET /landmarks - list all landmarks
- GET /landmarks/{id} - get a single landmark
- 404 for nonexistent landmark
"""

import uuid

from httpx import AsyncClient

from app.models.landmark import Landmark


class TestListLandmarks:
    async def test_list_landmarks(
        self, unauthed_client: AsyncClient, test_landmark: Landmark
    ):
        resp = await unauthed_client.get("/landmarks")
        assert resp.status_code == 200
        data = resp.json()
        assert "landmarks" in data
        assert isinstance(data["landmarks"], list)
        assert len(data["landmarks"]) >= 1

    async def test_landmark_has_expected_fields(
        self, unauthed_client: AsyncClient, test_landmark: Landmark
    ):
        resp = await unauthed_client.get("/landmarks")
        landmark = resp.json()["landmarks"][0]
        assert "id" in landmark
        assert "name" in landmark
        assert "latitude" in landmark
        assert "longitude" in landmark


class TestGetLandmark:
    async def test_get_landmark_by_id(
        self, unauthed_client: AsyncClient, test_landmark: Landmark
    ):
        resp = await unauthed_client.get(f"/landmarks/{test_landmark.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Landmark"
        assert abs(data["latitude"] - 49.2665) < 0.001

    async def test_get_nonexistent_landmark_returns_404(
        self, unauthed_client: AsyncClient
    ):
        resp = await unauthed_client.get(f"/landmarks/{uuid.uuid4()}")
        assert resp.status_code == 404
