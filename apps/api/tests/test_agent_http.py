import os

os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("TERMINAL_AGENT_TOKEN", "test-terminal-agent-token-32chars!!")

from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from services.agent_auth import SIGNATURE_HEADER, TIMESTAMP_HEADER, sign_request


@pytest.fixture
async def agent_client(monkeypatch):
    with patch("services.container_manager.ContainerManager") as manager_cls:
        manager = MagicMock()
        manager.get_container_status.return_value = {
            "status": "running",
            "running": True,
            "container_id": "abc",
        }
        manager.remove_all_session_containers.return_value = 0
        manager_cls.return_value = manager

        from agent.main import app

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            yield client


@pytest.mark.asyncio
async def test_agent_health_is_public(agent_client: AsyncClient) -> None:
    response = await agent_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_agent_status_requires_signature(agent_client: AsyncClient) -> None:
    response = await agent_client.get("/v1/status")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_agent_status_accepts_valid_signature(agent_client: AsyncClient) -> None:
    token = os.environ["TERMINAL_AGENT_TOKEN"]
    timestamp, signature = sign_request(token, "GET", "/v1/status")
    response = await agent_client.get(
        "/v1/status",
        headers={
            TIMESTAMP_HEADER: timestamp,
            SIGNATURE_HEADER: signature,
        },
    )
    assert response.status_code == 200
    assert response.json()["running"] is True
