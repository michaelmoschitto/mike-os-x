from unittest.mock import patch

import pytest
import redis
from fastapi import HTTPException
from httpx import AsyncClient

from config.settings import settings
from services.rate_limiter import RateLimiter


@pytest.mark.asyncio
async def test_health_endpoint(api_client: AsyncClient) -> None:
    response = await api_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "container_status" in data


@pytest.mark.asyncio
async def test_terminal_status_endpoint(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/terminal/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "running" in data
    assert "container_id" in data


@pytest.mark.asyncio
async def test_admin_reset_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.post("/api/admin/terminal/reset")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_restart_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.post("/api/admin/terminal/restart")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_stats_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/admin/terminal/stats")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_logs_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/admin/terminal/logs")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_rate_limit_stays_active_without_redis(monkeypatch, caplog) -> None:
    monkeypatch.setattr(settings, "rate_limit_connections", 1)
    monkeypatch.setattr(
        settings,
        "redis_url",
        "redis://service-user:super-secret-password@redis.example:6379/0",
    )

    with patch(
        "services.rate_limiter.redis.from_url",
        side_effect=redis.ConnectionError("unavailable"),
    ):
        limiter = RateLimiter()

    await limiter.check_connection_limit("203.0.113.10")
    with pytest.raises(HTTPException) as error:
        await limiter.check_connection_limit("203.0.113.10")

    assert error.value.status_code == 429
    assert "super-secret-password" not in caplog.text
