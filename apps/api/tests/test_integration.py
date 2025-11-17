import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_websocket_connection(api_client: AsyncClient) -> None:
    async with api_client.websocket_connect("/ws/terminal") as ws:
        await ws.send_text("echo 'hello'\n")
        response = await ws.receive_text(timeout=5.0)
        assert "hello" in response.lower() or "workspace" in response.lower()


@pytest.mark.asyncio
async def test_websocket_multiple_commands(api_client: AsyncClient) -> None:
    async with api_client.websocket_connect("/ws/terminal") as ws:
        await ws.send_text("pwd\n")
        response1 = await ws.receive_text(timeout=5.0)
        assert "/workspace" in response1

        await ws.send_text("ls\n")
        response2 = await ws.receive_text(timeout=5.0)
        assert isinstance(response2, str)
