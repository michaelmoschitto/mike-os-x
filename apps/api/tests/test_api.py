from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import WebSocket
from httpx import AsyncClient

from config.settings import settings
from main import get_client_ip, reject_disallowed_websocket_origin


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
async def test_empty_admin_key_is_rejected(api_client: AsyncClient) -> None:
    response = await api_client.post(
        "/api/admin/terminal/reset", headers={"X-Admin-Key": ""}
    )
    assert response.status_code == 401


def test_forwarded_ip_is_ignored_from_untrusted_peer(monkeypatch) -> None:
    websocket = MagicMock(spec=WebSocket)
    websocket.client.host = "203.0.113.10"
    websocket.headers.get.return_value = "198.51.100.20"
    monkeypatch.setattr(settings, "trusted_proxy_ips", "")

    assert get_client_ip(websocket) == "203.0.113.10"


def test_forwarded_ip_is_used_from_trusted_peer(monkeypatch) -> None:
    websocket = MagicMock(spec=WebSocket)
    websocket.client.host = "10.0.0.5"
    websocket.headers.get.return_value = "198.51.100.20, 10.0.0.5"
    monkeypatch.setattr(settings, "trusted_proxy_ips", "10.0.0.5")

    assert get_client_ip(websocket) == "198.51.100.20"


@pytest.mark.asyncio
async def test_disallowed_websocket_origin_is_rejected() -> None:
    websocket = AsyncMock(spec=WebSocket)
    websocket.headers.get.return_value = "https://attacker.example"

    rejected = await reject_disallowed_websocket_origin(websocket)

    assert rejected is True
    websocket.close.assert_awaited_once_with(code=1008, reason="Origin not allowed")
