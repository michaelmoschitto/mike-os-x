from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.agent_backends import AgentContainerManager, AgentPTYSessionManager
from services.agent_client import AgentClient


@pytest.mark.asyncio
async def test_agent_container_manager_status() -> None:
    client = MagicMock(spec=AgentClient)
    client.get_status = AsyncMock(
        return_value={"status": "running", "running": True, "container_id": "abc"}
    )
    manager = AgentContainerManager(client)

    status = await manager.get_container_status()

    assert status["running"] is True
    client.get_status.assert_awaited_once()


@pytest.mark.asyncio
async def test_agent_session_manager_relays_input_and_output() -> None:
    client = MagicMock(spec=AgentClient)
    websocket = MagicMock()
    client.open_session = AsyncMock(return_value=websocket)
    client.send_session_message = AsyncMock()
    client.read_session_message = AsyncMock(
        side_effect=[
            {"type": "output", "sessionId": "s1", "data": "hi"},
            {"type": "session_closed", "sessionId": "s1"},
        ]
    )

    manager = AgentPTYSessionManager(client)
    session = await manager.create_session("s1")
    assert session.session_id == "s1"

    await manager.write_to_session("s1", b"ls\n")
    client.send_session_message.assert_awaited()

    outputs = []

    async def capture(message):
        outputs.append(message)

    await manager.read_from_session("s1", MagicMock(), capture)
    assert outputs[0]["data"] == "hi"
    assert "s1" not in manager.sessions


@pytest.mark.asyncio
async def test_agent_client_signs_http_requests() -> None:
    client = AgentClient("https://agent.example.com", "a" * 32)

    mock_response = MagicMock()
    mock_response.content = b'{"status":"running","running":true,"container_id":null}'
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "status": "running",
        "running": True,
        "container_id": None,
    }

    with patch.object(client._client, "request", new=AsyncMock(return_value=mock_response)) as request:
        payload = await client.get_status()

    assert payload["running"] is True
    kwargs = request.await_args.kwargs
    assert "x-terminal-agent-timestamp" in kwargs["headers"]
    assert "x-terminal-agent-signature" in kwargs["headers"]
    await client.aclose()
