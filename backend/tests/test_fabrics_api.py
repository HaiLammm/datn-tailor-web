"""API tests for Fabric Recommendations endpoint - Story 2.3.

Tests for GET /api/v1/fabrics/recommendations endpoint.
"""

import json

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.main import app
from src.services.fabric_service import FabricService


@pytest_asyncio.fixture
async def client():
    """Create async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestFabricRecommendationsAPI:
    """Test suite for Fabric Recommendations API."""

    @pytest.mark.asyncio
    async def test_get_recommendations_returns_list(self, client: AsyncClient) -> None:
        """Test GET /recommendations returns fabric list for valid pillar."""
        response = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "traditional"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "fabrics" in data
        assert "total" in data
        assert "pillar_id" in data
        assert data["pillar_id"] == "traditional"
        assert isinstance(data["fabrics"], list)
        assert data["total"] > 0
        assert data["total"] == len(data["fabrics"])

    @pytest.mark.asyncio
    async def test_get_recommendations_fabric_fields(self, client: AsyncClient) -> None:
        """Test that each fabric has required fields."""
        response = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "traditional"},
        )

        assert response.status_code == 200
        data = response.json()

        for fabric in data["fabrics"]:
            assert "id" in fabric
            assert "name" in fabric
            assert "description" in fabric
            assert "properties" in fabric
            assert "compatibility_score" in fabric
            assert "compatibility_label" in fabric
            assert 0.0 <= fabric["compatibility_score"] <= 100.0
            assert fabric["compatibility_label"] in ("Rất phù hợp", "Phù hợp", "Có thể dùng")

    @pytest.mark.asyncio
    async def test_get_recommendations_fabric_properties(self, client: AsyncClient) -> None:
        """Test that fabric properties contain all required fields."""
        response = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "minimalist"},
        )

        assert response.status_code == 200
        data = response.json()

        for fabric in data["fabrics"]:
            props = fabric["properties"]
            assert "do_ru" in props
            assert "do_day" in props
            assert "do_co_dan" in props
            assert "do_bong" in props
            assert "kha_nang_giu_phom" in props

    @pytest.mark.asyncio
    async def test_get_recommendations_sorted_by_compatibility(self, client: AsyncClient) -> None:
        """Test that fabrics are sorted descending by compatibility_score."""
        response = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "traditional"},
        )

        assert response.status_code == 200
        data = response.json()
        scores = [f["compatibility_score"] for f in data["fabrics"]]
        assert scores == sorted(scores, reverse=True)

    @pytest.mark.asyncio
    async def test_get_recommendations_with_intensities(self, client: AsyncClient) -> None:
        """Test that intensities parameter affects recommendations."""
        # Without intensities
        resp_base = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "traditional"},
        )
        # With intensities that favor stretch (do_om_than high)
        intensities = json.dumps({"do_om_than": 90, "do_rong_vai": 30})
        resp_intensity = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "traditional", "intensities": intensities},
        )

        assert resp_base.status_code == 200
        assert resp_intensity.status_code == 200

        base_scores = {f["id"]: f["compatibility_score"] for f in resp_base.json()["fabrics"]}
        intensity_scores = {f["id"]: f["compatibility_score"] for f in resp_intensity.json()["fabrics"]}

        # Scores should differ when intensities are provided
        assert base_scores != intensity_scores

    @pytest.mark.asyncio
    async def test_get_recommendations_all_pillars(self, client: AsyncClient) -> None:
        """Test that recommendations work for all known pillars."""
        for pillar_id in ("traditional", "minimalist", "avant-garde"):
            response = await client.get(
                "/api/v1/fabrics/recommendations",
                params={"pillar_id": pillar_id},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["pillar_id"] == pillar_id
            assert data["total"] == 10  # 10 fabrics in LKB

    @pytest.mark.asyncio
    async def test_get_recommendations_unknown_pillar_returns_404(self, client: AsyncClient) -> None:
        """Test that unknown pillar_id returns 404."""
        response = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "nonexistent"},
        )

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_get_recommendations_missing_pillar_id_returns_422(self, client: AsyncClient) -> None:
        """Test that missing pillar_id returns 422."""
        response = await client.get("/api/v1/fabrics/recommendations")

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_recommendations_malformed_intensities_returns_422(self, client: AsyncClient) -> None:
        """Test that malformed intensities JSON returns 422."""
        response = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "traditional", "intensities": "not-valid-json"},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_recommendations_vietnamese_terminology(self, client: AsyncClient) -> None:
        """Test that fabric names use Vietnamese terminology (NFR11)."""
        response = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "traditional"},
        )

        assert response.status_code == 200
        data = response.json()

        vietnamese_chars = set("àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ")

        has_vietnamese = any(
            any(c.lower() in vietnamese_chars for c in fabric["name"])
            or any(c.lower() in vietnamese_chars for c in fabric["description"])
            for fabric in data["fabrics"]
        )
        assert has_vietnamese, "Fabric names/descriptions should use Vietnamese"

    @pytest.mark.asyncio
    async def test_get_recommendations_returns_10_fabrics(self, client: AsyncClient) -> None:
        """Test that the LKB contains exactly 10 fabric types."""
        response = await client.get(
            "/api/v1/fabrics/recommendations",
            params={"pillar_id": "traditional"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 10


class TestFabricService:
    """Unit tests for FabricService recommendation logic."""

    def test_traditional_pillar_favors_lua_gam(self) -> None:
        """Traditional style should rank Lụa Hà Đông and Gấm high."""
        service = FabricService()
        result = service.get_recommendations("traditional")

        assert result is not None
        top_3_ids = [f.id for f in result.fabrics[:3]]
        # Lụa and Gấm should be in top 3 for traditional
        assert "lua-ha-dong" in top_3_ids or "gam-thai-tuan" in top_3_ids

    def test_minimalist_pillar_favors_structured_fabrics(self) -> None:
        """Minimalist style should favor fabrics with good shape retention."""
        service = FabricService()
        result = service.get_recommendations("minimalist")

        assert result is not None
        top_fabric = result.fabrics[0]
        # Top fabric for minimalist should have good shape retention
        assert top_fabric.properties.kha_nang_giu_phom in ("medium", "high")

    def test_unknown_pillar_returns_none(self) -> None:
        """Unknown pillar_id should return None."""
        service = FabricService()
        result = service.get_recommendations("unknown_style")
        assert result is None

    def test_compatibility_labels_correct(self) -> None:
        """Verify compatibility labels match score thresholds."""
        service = FabricService()
        result = service.get_recommendations("traditional")

        assert result is not None
        for fabric in result.fabrics:
            if fabric.compatibility_score >= 75.0:
                assert fabric.compatibility_label == "Rất phù hợp"
            elif fabric.compatibility_score >= 50.0:
                assert fabric.compatibility_label == "Phù hợp"
            else:
                assert fabric.compatibility_label == "Có thể dùng"

    def test_intensities_affect_scores(self) -> None:
        """Intensity values should affect compatibility scores."""
        service = FabricService()
        base = service.get_recommendations("traditional")
        with_intensity = service.get_recommendations(
            "traditional", {"do_om_than": 95, "do_rong_vai": 10}
        )

        assert base is not None
        assert with_intensity is not None

        base_map = {f.id: f.compatibility_score for f in base.fabrics}
        intensity_map = {f.id: f.compatibility_score for f in with_intensity.fabrics}

        # At least some scores should differ
        differences = sum(1 for fid in base_map if base_map[fid] != intensity_map[fid])
        assert differences > 0
