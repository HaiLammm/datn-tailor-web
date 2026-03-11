"""Tests for Inference API Endpoints - Story 2.4.

Tests the /api/v1/inference/translate endpoint that invokes
the Emotional Compiler for style-to-geometry translation.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
def client() -> AsyncClient:
    """Create async test client."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


class TestTranslateEndpoint:
    """Tests for POST /api/v1/inference/translate."""

    @pytest.mark.asyncio
    async def test_translate_success_traditional(self, client: AsyncClient) -> None:
        """Traditional pillar translation should succeed."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "traditional",
                    "intensities": [
                        {"key": "shoulder_width", "value": 60.0},
                        {"key": "body_fit", "value": 50.0},
                    ],
                    "sequence_id": 1,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["snapshot"] is not None
        assert data["error"] is None

    @pytest.mark.asyncio
    async def test_translate_success_minimalist(self, client: AsyncClient) -> None:
        """Minimalist pillar translation should succeed."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "minimalist",
                    "intensities": [
                        {"key": "body_fit", "value": 70.0},
                    ],
                    "sequence_id": 5,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["snapshot"]["sequence_id"] == 5

    @pytest.mark.asyncio
    async def test_translate_success_avant_garde(self, client: AsyncClient) -> None:
        """Avant-garde pillar translation should succeed."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "avant_garde",
                    "intensities": [
                        {"key": "do_bat_doi_xung", "value": 80.0},
                    ],
                    "sequence_id": 1,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_translate_invalid_pillar_404(self, client: AsyncClient) -> None:
        """Unknown pillar should return 404."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "nonexistent_pillar",
                    "intensities": [
                        {"key": "shoulder_width", "value": 50.0},
                    ],
                    "sequence_id": 1,
                },
            )

        assert response.status_code == 404
        data = response.json()
        assert "Không tìm thấy phong cách" in data["detail"]

    @pytest.mark.asyncio
    async def test_translate_missing_pillar_id_422(self, client: AsyncClient) -> None:
        """Missing pillar_id should return 422 validation error."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "intensities": [
                        {"key": "shoulder_width", "value": 50.0},
                    ],
                    "sequence_id": 1,
                },
            )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_translate_missing_sequence_id_422(self, client: AsyncClient) -> None:
        """Missing sequence_id should return 422 validation error."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "traditional",
                    "intensities": [
                        {"key": "shoulder_width", "value": 50.0},
                    ],
                },
            )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_translate_empty_intensities_error(
        self, client: AsyncClient
    ) -> None:
        """Empty intensities should return error response (not 4xx)."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "traditional",
                    "intensities": [],
                    "sequence_id": 1,
                },
            )

        # Returns 200 with success=False (inference error, not validation error)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["error"] is not None
        assert "Không có giá trị cường độ" in data["error"]

    @pytest.mark.asyncio
    async def test_translate_response_has_master_geometry_schema(
        self, client: AsyncClient
    ) -> None:
        """Response snapshot should have all Master Geometry fields."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "traditional",
                    "intensities": [
                        {"key": "shoulder_width", "value": 55.0},
                    ],
                    "sequence_id": 123,
                },
            )

        assert response.status_code == 200
        snapshot = response.json()["snapshot"]

        # Check all required fields per architecture.md
        assert snapshot["sequence_id"] == 123
        assert len(snapshot["base_hash"]) == 64  # SHA-256
        assert snapshot["algorithm_version"] == "1.0.0"
        assert len(snapshot["geometry_hash"]) == 64  # SHA-256
        assert "created_at" in snapshot
        assert isinstance(snapshot["deltas"], list)

    @pytest.mark.asyncio
    async def test_translate_geometry_hash_deterministic(
        self, client: AsyncClient
    ) -> None:
        """Same inputs should produce same geometry hash."""
        request_body = {
            "pillar_id": "traditional",
            "intensities": [
                {"key": "shoulder_width", "value": 50.0},
                {"key": "body_fit", "value": 50.0},
            ],
            "sequence_id": 1,
        }

        async with client:
            response1 = await client.post(
                "/api/v1/inference/translate", json=request_body
            )
            response2 = await client.post(
                "/api/v1/inference/translate", json=request_body
            )

        hash1 = response1.json()["snapshot"]["geometry_hash"]
        hash2 = response2.json()["snapshot"]["geometry_hash"]

        assert hash1 == hash2

    @pytest.mark.asyncio
    async def test_translate_different_inputs_different_hash(
        self, client: AsyncClient
    ) -> None:
        """Different inputs should produce different geometry hash."""
        async with client:
            response1 = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "traditional",
                    "intensities": [{"key": "shoulder_width", "value": 50.0}],
                    "sequence_id": 1,
                },
            )
            response2 = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "traditional",
                    "intensities": [{"key": "shoulder_width", "value": 60.0}],
                    "sequence_id": 1,
                },
            )

        hash1 = response1.json()["snapshot"]["geometry_hash"]
        hash2 = response2.json()["snapshot"]["geometry_hash"]

        assert hash1 != hash2

    @pytest.mark.asyncio
    async def test_translate_inference_time_under_threshold(
        self, client: AsyncClient
    ) -> None:
        """Inference time should be well under 15 seconds (NFR1)."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "traditional",
                    "intensities": [
                        {"key": "shoulder_width", "value": 60.0},
                        {"key": "body_fit", "value": 70.0},
                        {"key": "garment_length", "value": 55.0},
                        {"key": "do_rong_tay", "value": 50.0},
                    ],
                    "sequence_id": 1,
                },
            )

        data = response.json()
        assert data["inference_time_ms"] < 15000  # NFR1 requirement
        # Rule-based MVP should be very fast
        assert data["inference_time_ms"] < 1000

    @pytest.mark.asyncio
    async def test_translate_deltas_have_vietnamese_labels(
        self, client: AsyncClient
    ) -> None:
        """All deltas should have Vietnamese labels per NFR11."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "traditional",
                    "intensities": [
                        {"key": "shoulder_width", "value": 60.0},
                    ],
                    "sequence_id": 1,
                },
            )

        deltas = response.json()["snapshot"]["deltas"]

        for delta in deltas:
            assert "label_vi" in delta
            assert len(delta["label_vi"]) > 0
            assert delta["unit"] == "cm"

    @pytest.mark.asyncio
    async def test_translate_with_base_measurement_id(
        self, client: AsyncClient
    ) -> None:
        """Optional base_measurement_id should be accepted."""
        async with client:
            response = await client.post(
                "/api/v1/inference/translate",
                json={
                    "pillar_id": "traditional",
                    "intensities": [
                        {"key": "shoulder_width", "value": 50.0},
                    ],
                    "sequence_id": 1,
                    "base_measurement_id": "measurement_123",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestInferencePillarsEndpoint:
    """Tests for GET /api/v1/inference/pillars utility endpoint."""

    @pytest.mark.asyncio
    async def test_get_pillars_returns_list(self, client: AsyncClient) -> None:
        """Should return list of available pillar IDs."""
        async with client:
            response = await client.get("/api/v1/inference/pillars")

        assert response.status_code == 200
        data = response.json()
        assert "pillar_ids" in data
        assert "traditional" in data["pillar_ids"]
        assert "minimalist" in data["pillar_ids"]
        assert "avant_garde" in data["pillar_ids"]
