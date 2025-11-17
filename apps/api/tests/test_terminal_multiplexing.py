import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import WebSocket

from services.container_manager import ContainerManager
from services.pty_session_manager import PTYSessionManager
from services.rate_limiter import RateLimiter
from services.terminal_bridge import TerminalBridge


@pytest.fixture
def mock_container():
    container = MagicMock()
    container.id = "test-container-id"
    container.status = "running"
    container.client.api.exec_create.return_value = {"Id": "exec-123"}
    container.client.api.exec_resize = MagicMock()

    mock_socket = MagicMock()
    mock_socket._sock = MagicMock()
    mock_socket._sock.setblocking = MagicMock()
    container.client.api.exec_start.return_value = mock_socket

    return container


@pytest.fixture
def mock_container_manager(mock_container):
    manager = MagicMock(spec=ContainerManager)
    manager.ensure_container_running.return_value = mock_container
    manager.ensure_container_healthy.return_value = mock_container
    manager.get_container.return_value = mock_container
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
def mock_session_manager(mock_container):
    manager = MagicMock(spec=PTYSessionManager)

    mock_session = MagicMock()
    mock_session.session_id = "test-session"
    mock_session.read_task = None
    mock_session.write_task = None

    async def create_session(session_id: str):
        mock_session.session_id = session_id
        return mock_session

    manager.create_session = AsyncMock(side_effect=create_session)
    manager.get_session = MagicMock(return_value=mock_session)
    manager.close_session = AsyncMock()
    manager.resize_session = AsyncMock()
    manager.write_to_session = AsyncMock()
    manager.read_from_session = AsyncMock()
    manager.sessions = {}

    return manager


@pytest.fixture
def terminal_bridge(mock_container_manager, mock_rate_limiter, mock_session_manager):
    bridge = TerminalBridge()
    bridge.container_manager = mock_container_manager
    bridge.rate_limiter = mock_rate_limiter
    bridge.session_manager = mock_session_manager
    return bridge


@pytest.mark.asyncio
async def test_rate_limit_check_before_accept(terminal_bridge, mock_rate_limiter):
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.client.host = "127.0.0.1"
    mock_websocket.headers.get.return_value = "test-agent"
    mock_websocket.accept = AsyncMock()
    mock_websocket.receive_text = AsyncMock(side_effect=Exception("Test"))
    mock_websocket.send_text = AsyncMock()
    mock_websocket.close = AsyncMock()

    mock_rate_limiter.check_connection_limit.side_effect = Exception("Rate limit exceeded")

    await terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1")

    mock_rate_limiter.check_connection_limit.assert_called_once_with("127.0.0.1")
    mock_websocket.accept.assert_called_once()


@pytest.mark.asyncio
async def test_create_session_message(terminal_bridge, mock_session_manager):
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

    session_id = "test-session-1"
    messages.append(
        json.dumps(
            {
                "type": "create_session",
                "sessionId": session_id,
            }
        )
    )

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    mock_websocket.accept.assert_called_once()
    mock_session_manager.create_session.assert_called_once_with(session_id)

    send_calls = [call[0][0] for call in mock_websocket.send_text.call_args_list]
    assert any("session_created" in str(call) and session_id in str(call) for call in send_calls)


@pytest.mark.asyncio
async def test_multiple_sessions_same_websocket(terminal_bridge, mock_session_manager):
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

    session_ids = ["session-1", "session-2", "session-3"]
    for session_id in session_ids:
        messages.append(
            json.dumps(
                {
                    "type": "create_session",
                    "sessionId": session_id,
                }
            )
        )

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.3)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    assert mock_session_manager.create_session.call_count == 3
    for session_id in session_ids:
        mock_session_manager.create_session.assert_any_call(session_id)


@pytest.mark.asyncio
async def test_input_message_routing(terminal_bridge, mock_session_manager):
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
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    mock_session_manager.write_to_session.assert_called()
    call_args = mock_session_manager.write_to_session.call_args
    assert call_args[0][0] == session_id
    assert call_args[0][1] == b"ls\n"


@pytest.mark.asyncio
async def test_resize_message(terminal_bridge, mock_session_manager):
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
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    mock_session_manager.resize_session.assert_called_once_with(session_id, 120, 40)


@pytest.mark.asyncio
async def test_close_session_message(terminal_bridge, mock_session_manager):
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
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    mock_session_manager.close_session.assert_called_once_with(session_id)

    send_calls = [call[0][0] for call in mock_websocket.send_text.call_args_list]
    assert any("session_closed" in str(call) and session_id in str(call) for call in send_calls)


@pytest.mark.asyncio
async def test_session_isolation(terminal_bridge, mock_session_manager):
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

    session_a = "session-a"
    session_b = "session-b"

    messages.append(json.dumps({"type": "create_session", "sessionId": session_a}))
    messages.append(json.dumps({"type": "create_session", "sessionId": session_b}))
    messages.append(json.dumps({"type": "input", "sessionId": session_a, "data": "echo A\n"}))
    messages.append(json.dumps({"type": "input", "sessionId": session_b, "data": "echo B\n"}))

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.3)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    write_calls = mock_session_manager.write_to_session.call_args_list
    assert len(write_calls) == 2
    assert write_calls[0][0][0] == session_a
    assert write_calls[1][0][0] == session_b


@pytest.mark.asyncio
async def test_rate_limit_per_connection(terminal_bridge, mock_rate_limiter):
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

    messages.append(json.dumps({"type": "create_session", "sessionId": "session-1"}))

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    mock_rate_limiter.check_connection_limit.assert_called_once_with("127.0.0.1")


@pytest.mark.asyncio
async def test_rate_limit_per_session_input(
    terminal_bridge, mock_rate_limiter, mock_session_manager
):
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
    messages.append(json.dumps({"type": "create_session", "sessionId": session_id}))
    messages.append(json.dumps({"type": "input", "sessionId": session_id, "data": "test\n"}))

    mock_rate_limiter.check_command_limit.return_value = False

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.2)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    mock_rate_limiter.check_command_limit.assert_called_with("127.0.0.1")
    send_calls = [call[0][0] for call in mock_websocket.send_text.call_args_list]
    assert any("error" in str(call) and "Rate limit" in str(call) for call in send_calls)


@pytest.mark.asyncio
async def test_websocket_close_cleans_all_sessions(terminal_bridge, mock_session_manager):
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

    session_ids = ["session-1", "session-2", "session-3"]
    for session_id in session_ids:
        messages.append(json.dumps({"type": "create_session", "sessionId": session_id}))

    with patch("asyncio.get_event_loop") as mock_loop:
        loop = MagicMock()
        loop.sock_recv = AsyncMock(return_value=b"")
        mock_loop.return_value = loop

        task = asyncio.create_task(terminal_bridge.handle_websocket(mock_websocket, "127.0.0.1"))

        await asyncio.sleep(0.3)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

    for session_id in session_ids:
        mock_session_manager.close_session.assert_any_call(session_id)
