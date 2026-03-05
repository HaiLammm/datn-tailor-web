"""API tests for Style Pillars endpoints - Story 2.1.

Tests for GET /api/v1/styles/pillars endpoint.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest_asyncio.fixture
async def client():
    """Create async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestStylePillarsAPI:
    """Test suite for Style Pillars API."""

    @pytest.mark.asyncio
    async def test_get_pillars_returns_list(self, client: AsyncClient) -> None:
        """Test GET /api/v1/styles/pillars returns list of pillars."""
        response = await client.get("/api/v1/styles/pillars")

        assert response.status_code == 200
        data = response.json()
        assert "pillars" in data
        assert isinstance(data["pillars"], list)
        assert len(data["pillars"]) > 0

    @pytest.mark.asyncio
    async def test_get_pillars_contains_required_fields(self, client: AsyncClient) -> None:
        """Test that each pillar has required fields."""
        response = await client.get("/api/v1/styles/pillars")

        assert response.status_code == 200
        data = response.json()

        for pillar in data["pillars"]:
            assert "id" in pillar
            assert "name" in pillar
            assert "description" in pillar
            assert "sliders" in pillar

    @pytest.mark.asyncio
    async def test_get_pillars_sliders_have_config(self, client: AsyncClient) -> None:
        """Test that sliders have min/max/default configuration."""
        response = await client.get("/api/v1/styles/pillars")

        assert response.status_code == 200
        data = response.json()

        for pillar in data["pillars"]:
            for slider in pillar["sliders"]:
                assert "key" in slider
                assert "label" in slider
                assert "min_value" in slider
                assert "max_value" in slider
                assert "default_value" in slider
                assert slider["min_value"] <= slider["default_value"] <= slider["max_value"]

    @pytest.mark.asyncio
    async def test_get_pillar_by_id_success(self, client: AsyncClient) -> None:
        """Test GET /api/v1/styles/pillars/{id} returns specific pillar."""
        response = await client.get("/api/v1/styles/pillars/traditional")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "traditional"
        assert "sliders" in data

    @pytest.mark.asyncio
    async def test_get_pillar_by_id_not_found(self, client: AsyncClient) -> None:
        """Test GET /api/v1/styles/pillars/{id} returns 404 for unknown ID."""
        response = await client.get("/api/v1/styles/pillars/nonexistent")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_pillars_use_vietnamese_terminology(self, client: AsyncClient) -> None:
        """Test that pillar content uses Vietnamese terminology (NFR11)."""
        response = await client.get("/api/v1/styles/pillars")

        assert response.status_code == 200
        data = response.json()

        vietnamese_chars = set("àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ")

        # Check if any pillar uses Vietnamese
        has_vietnamese = any(
            any(c.lower() in vietnamese_chars for c in pillar["name"])
            or any(c.lower() in vietnamese_chars for c in pillar["description"])
            for pillar in data["pillars"]
        )
        assert has_vietnamese, "Response should use Vietnamese terminology"
