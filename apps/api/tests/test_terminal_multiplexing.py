import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import WebSocket

from services.container_manager import ContainerManager
from services.rate_limiter import RateLimiter
from services.terminal_bridge import TerminalBridge


@pytest.fixture
def mock_container():
    container = MagicMock()
    container.id = "test-container-id"
    container.status = "running"
    container.client.api.exec_create.return_value = {"Id": "exec-123"}

    mock_socket = MagicMock()
    mock_socket._sock = MagicMock()
    mock_socket._sock.setblocking = MagicMock()
    container.client.api.exec_start.return_value = mock_socket
    container.client.api.exec_resize = MagicMock()

    return container


@pytest.fixture
def mock_container_manager(mock_container):
    manager = MagicMock(spec=ContainerManager)
    manager.ensure_container_running.return_value = mock_container
    return manager


@pytest.fixture
def mock_rate_limiter():
    limiter = MagicMock(spec=RateLimiter)
    limiter.check_connection_limit = AsyncMock()
    limiter.check_command_limit = AsyncMock(return_value=True)
    limiter.track_connection = MagicMock()
    limiter.untrack_connection = MagicMock()
    return limiter


@pytest.fixture
def terminal_bridge(mock_container_manager, mock_rate_limiter):
    bridge = TerminalBridge()
    bridge.container_manager = mock_container_manager
    bridge.rate_limiter = mock_rate_limiter
    return bridge


@pytest.mark.asyncio
async def test_rate_limit_check_before_accept(terminal_bridge, mock_rate_limiter):
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.client.host = "127.0.0.1"
    mock_websocket.headers.get.return_value = "test-agent"
    mock_websocket.accept = AsyncMock()
    mock_websocket.receive_text = AsyncMock(side_effect=Exception("Test"))
    mock_websocket.send_text = AsyncMock()

    mock_rate_limiter.check_connection_limit.side_effect = Exception("Rate limit exceeded")

    with pytest.raises(Exception, match="Rate limit exceeded"):
        await terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1")

    mock_rate_limiter.check_connection_limit.assert_called_once_with("127.0.0.1")
    mock_websocket.accept.assert_not_called()


@pytest.mark.asyncio
async def test_create_session_message(terminal_bridge, mock_container):
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.client.host = "127.0.0.1"
    mock_websocket.headers.get.return_value = "test-agent"
    mock_websocket.accept = AsyncMock()
    mock_websocket.send_text = AsyncMock()

    messages = []

    async def receive_text():
        if not messages:
            await asyncio.sleep(0.1)
            raise Exception("No more messages")
        return messages.pop(0)

    mock_websocket.receive_text = receive_text

    session_id = "test-session-123"
    create_msg = json.dumps(
        {
            "type": "create_session",
            "sessionId": session_id,
        }
    )
    messages.append(create_msg)

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        loop.sock_sendall = AsyncMock()
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.1)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    mock_websocket.accept.assert_called_once()
    send_calls = [call[0][0] for call in mock_websocket.send_text.call_args_list]
    assert any("session_created" in str(call) and session_id in str(call) for call in send_calls)


@pytest.mark.asyncio
async def test_multiple_sessions_same_websocket(terminal_bridge, mock_container):
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.client.host = "127.0.0.1"
    mock_websocket.headers.get.return_value = "test-agent"
    mock_websocket.accept = AsyncMock()
    mock_websocket.send_text = AsyncMock()

    messages = []

    async def receive_text():
        if not messages:
            await asyncio.sleep(0.1)
            raise Exception("No more messages")
        return messages.pop(0)

    mock_websocket.receive_text = receive_text

    session1_id = "session-1"
    session2_id = "session-2"

    messages.append(
        json.dumps(
            {
                "type": "create_session",
                "sessionId": session1_id,
            }
        )
    )
    messages.append(
        json.dumps(
            {
                "type": "create_session",
                "sessionId": session2_id,
            }
        )
    )

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        loop.sock_sendall = AsyncMock()
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    assert mock_container.client.api.exec_create.call_count == 2


@pytest.mark.asyncio
async def test_input_message_routing(terminal_bridge, mock_container):
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.client.host = "127.0.0.1"
    mock_websocket.headers.get.return_value = "test-agent"
    mock_websocket.accept = AsyncMock()
    mock_websocket.send_text = AsyncMock()

    messages = []

    async def receive_text():
        if not messages:
            await asyncio.sleep(0.1)
            raise Exception("No more messages")
        return messages.pop(0)

    mock_websocket.receive_text = receive_text

    session_id = "test-session"
    messages.append(
        json.dumps(
            {
                "type": "create_session",
                "sessionId": session_id,
            }
        )
    )
    messages.append(
        json.dumps(
            {
                "type": "input",
                "sessionId": session_id,
                "data": "ls\n",
            }
        )
    )

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        loop.sock_sendall = AsyncMock()
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    loop.sock_sendall.assert_called()


@pytest.mark.asyncio
async def test_resize_message(terminal_bridge, mock_container):
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.client.host = "127.0.0.1"
    mock_websocket.headers.get.return_value = "test-agent"
    mock_websocket.accept = AsyncMock()
    mock_websocket.send_text = AsyncMock()

    messages = []

    async def receive_text():
        if not messages:
            await asyncio.sleep(0.1)
            raise Exception("No more messages")
        return messages.pop(0)

    mock_websocket.receive_text = receive_text

    session_id = "test-session"
    messages.append(
        json.dumps(
            {
                "type": "create_session",
                "sessionId": session_id,
            }
        )
    )
    messages.append(
        json.dumps(
            {
                "type": "resize",
                "sessionId": session_id,
                "cols": 120,
                "rows": 40,
            }
        )
    )

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        loop.sock_sendall = AsyncMock()
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    mock_container.client.api.exec_resize.assert_called_with("exec-123", height=40, width=120)


@pytest.mark.asyncio
async def test_close_session_message(terminal_bridge, mock_container):
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.client.host = "127.0.0.1"
    mock_websocket.headers.get.return_value = "test-agent"
    mock_websocket.accept = AsyncMock()
    mock_websocket.send_text = AsyncMock()

    messages = []

    async def receive_text():
        if not messages:
            await asyncio.sleep(0.1)
            raise Exception("No more messages")
        return messages.pop(0)

    mock_websocket.receive_text = receive_text

    session_id = "test-session"
    messages.append(
        json.dumps(
            {
                "type": "create_session",
                "sessionId": session_id,
            }
        )
    )
    messages.append(
        json.dumps(
            {
                "type": "close_session",
                "sessionId": session_id,
            }
        )
    )

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        loop.sock_sendall = AsyncMock()
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    send_calls = [call[0][0] for call in mock_websocket.send_text.call_args_list]
    assert any("session_closed" in str(call) and session_id in str(call) for call in send_calls)
