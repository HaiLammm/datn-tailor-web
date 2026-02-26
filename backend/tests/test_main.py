"""Tests for the FastAPI application and health endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.mark.asyncio
async def test_health_endpoint_returns_200() -> None:
    """Health endpoint should return HTTP 200."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_endpoint_returns_healthy_status() -> None:
    """Health endpoint should return {"status": "healthy"}."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    data = response.json()
    assert data == {"status": "healthy"}


@pytest.mark.asyncio
async def test_health_endpoint_content_type_json() -> None:
    """Health endpoint should return application/json."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    assert response.headers["content-type"] == "application/json"


def test_app_title() -> None:
    """FastAPI app should have correct title."""
    assert app.title == "Tailor Project API"


def test_app_version() -> None:
    """FastAPI app should have version 0.1.0."""
    assert app.version == "0.1.0"


@pytest.mark.asyncio
async def test_nonexistent_route_returns_404() -> None:
    """Non-existent routes should return 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cors_headers_present() -> None:
    """CORS headers should be present for allowed origins."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.options(
            "/health",
            headers={
                "origin": "http://localhost:3000",
                "access-control-request-method": "GET",
            },
        )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


@pytest.mark.asyncio
async def test_cors_allows_credentials() -> None:
    """CORS should allow credentials."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.options(
            "/health",
            headers={
                "origin": "http://localhost:3000",
                "access-control-request-method": "GET",
            },
        )
    assert response.headers.get("access-control-allow-credentials") == "true"
