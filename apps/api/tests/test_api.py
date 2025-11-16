import pytest
from httpx import AsyncClient

from main import app


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
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_restart_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.post("/api/admin/terminal/restart")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_stats_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/admin/terminal/stats")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_logs_requires_auth(api_client: AsyncClient) -> None:
    response = await api_client.get("/api/admin/terminal/logs")
    assert response.status_code == 401

