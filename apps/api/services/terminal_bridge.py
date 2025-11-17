import asyncio
import json
import logging
import time
import uuid
from fastapi import WebSocket, WebSocketDisconnect

from services.container_manager import ContainerManager
from services.message_protocol import (
    ClientMessage,
    CreateSessionMessage,
    InputMessage,
    ResizeMessage,
    CloseSessionMessage,
    ServerMessage,
    SessionCreatedMessage,
    SessionClosedMessage,
    ErrorMessage,
)
from services.pty_session_manager import PTYSessionManager
from services.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

MAX_WEBSOCKET_MESSAGE_SIZE = 64 * 1024
MAX_INPUT_SIZE = 64 * 1024
MAX_TOTAL_INPUT_PER_SESSION = 10 * 1024 * 1024
MIN_TERMINAL_COLS = 1
MAX_TERMINAL_COLS = 1000
MIN_TERMINAL_ROWS = 1
MAX_TERMINAL_ROWS = 1000
SESSION_IDLE_TIMEOUT = 30 * 60


class TerminalBridge:
    def __init__(self) -> None:
        self.container_manager = ContainerManager()
        self.rate_limiter = RateLimiter()
        self.session_manager = PTYSessionManager(self.container_manager)
        self.session_last_activity: dict[str, float] = {}
        self.session_input_totals: dict[str, int] = {}
        self.websocket_sessions: dict[str, set[str]] = {}  # connection_id -> set of session_ids

    async def _send_message(self, websocket: WebSocket, message: ServerMessage) -> None:
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message: {e}")

    async def _handle_create_session(
        self,
        websocket: WebSocket,
        connection_id: str,
        client_ip: str,
        msg: CreateSessionMessage,
    ) -> None:
        session_id = msg.get("sessionId")
        if not session_id:
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": "",
                "error": "Missing sessionId in create_session message",
            }
            await self._send_message(websocket, error_msg)
            return

        try:
            session = await self.session_manager.create_session(session_id)
            self.session_last_activity[session_id] = time.time()
            self.session_input_totals[session_id] = 0

            if connection_id not in self.websocket_sessions:
                self.websocket_sessions[connection_id] = set()
            self.websocket_sessions[connection_id].add(session_id)

            response: SessionCreatedMessage = {
                "type": "session_created",
                "sessionId": session_id,
            }
            await self._send_message(websocket, response)

            async def send_output(message: ServerMessage) -> None:
                await self._send_message(websocket, message)

            async def read_from_session() -> None:
                await self.session_manager.read_from_session(session_id, websocket, send_output)

            session.read_task = asyncio.create_task(read_from_session())
            logger.info(f"Session {session_id} created and read task started")

        except Exception as e:
            logger.error(f"Error creating session {session_id}: {e}", exc_info=True)
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": f"Failed to create session: {str(e)}",
            }
            await self._send_message(websocket, error_msg)

    async def _handle_input(
        self,
        websocket: WebSocket,
        connection_id: str,
        client_ip: str,
        msg: InputMessage,
    ) -> None:
        session_id = msg.get("sessionId")
        if not session_id:
            return

        session = self.session_manager.get_session(session_id)
        if not session:
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": "Session not found",
            }
            await self._send_message(websocket, error_msg)
            return

        if not await self.rate_limiter.check_command_limit(client_ip):
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": "Rate limit exceeded. Please wait.",
            }
            await self._send_message(websocket, error_msg)
            return

        input_data = msg.get("data", "")
        if not input_data:
            return

        encoded_data = input_data.encode("utf-8")

        if len(encoded_data) > MAX_INPUT_SIZE:
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": "Input too large. Maximum size is 64KB.",
            }
            await self._send_message(websocket, error_msg)
            return

        try:
            encoded_data.decode("utf-8")
        except UnicodeDecodeError:
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": "Invalid character encoding.",
            }
            await self._send_message(websocket, error_msg)
            return

        self.session_input_totals[session_id] = (
            self.session_input_totals.get(session_id, 0) + len(encoded_data)
        )

        if self.session_input_totals[session_id] > MAX_TOTAL_INPUT_PER_SESSION:
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": "Session input limit exceeded (10MB). Please reconnect.",
            }
            await self._send_message(websocket, error_msg)
            await self.session_manager.close_session(session_id)
            if connection_id in self.websocket_sessions:
                self.websocket_sessions[connection_id].discard(session_id)
            return

        self.session_last_activity[session_id] = time.time()

        try:
            await self.session_manager.write_to_session(session_id, encoded_data)
        except Exception as e:
            logger.error(f"Error writing to session {session_id}: {e}")
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": f"Failed to write to session: {str(e)}",
            }
            await self._send_message(websocket, error_msg)

    async def _handle_resize(
        self,
        websocket: WebSocket,
        connection_id: str,
        client_ip: str,
        msg: ResizeMessage,
    ) -> None:
        session_id = msg.get("sessionId")
        if not session_id:
            return

        cols = msg.get("cols", 80)
        rows = msg.get("rows", 24)

        if not isinstance(cols, int) or not isinstance(rows, int):
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": f"Invalid resize dimensions type: cols={type(cols)}, rows={type(rows)}",
            }
            await self._send_message(websocket, error_msg)
            return

        if cols < MIN_TERMINAL_COLS or cols > MAX_TERMINAL_COLS:
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": f"Invalid cols value: {cols}",
            }
            await self._send_message(websocket, error_msg)
            return

        if rows < MIN_TERMINAL_ROWS or rows > MAX_TERMINAL_ROWS:
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": f"Invalid rows value: {rows}",
            }
            await self._send_message(websocket, error_msg)
            return

        try:
            await self.session_manager.resize_session(session_id, cols, rows)
        except Exception as e:
            logger.error(f"Error resizing session {session_id}: {e}")
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": f"Failed to resize session: {str(e)}",
            }
            await self._send_message(websocket, error_msg)

    async def _handle_close_session(
        self,
        websocket: WebSocket,
        connection_id: str,
        client_ip: str,
        msg: CloseSessionMessage,
    ) -> None:
        session_id = msg.get("sessionId")
        if not session_id:
            return

        await self.session_manager.close_session(session_id)
        if connection_id in self.websocket_sessions:
            self.websocket_sessions[connection_id].discard(session_id)

        self.session_last_activity.pop(session_id, None)
        self.session_input_totals.pop(session_id, None)

        response: SessionClosedMessage = {
            "type": "session_closed",
            "sessionId": session_id,
        }
        await self._send_message(websocket, response)

    async def _check_idle_timeouts(self, connection_id: str, websocket: WebSocket) -> None:
        while True:
            await asyncio.sleep(60)
            current_time = time.time()
            sessions_to_close = []

            if connection_id not in self.websocket_sessions:
                break

            for session_id in list(self.websocket_sessions[connection_id]):
                last_activity = self.session_last_activity.get(session_id, current_time)
                if current_time - last_activity > SESSION_IDLE_TIMEOUT:
                    sessions_to_close.append(session_id)

            for session_id in sessions_to_close:
                logger.info(f"Session {session_id} idle timeout, closing")
                error_msg: ErrorMessage = {
                    "type": "error",
                    "sessionId": session_id,
                    "error": "Session idle timeout (30 minutes). Closing connection.",
                }
                await self._send_message(websocket, error_msg)
                await self.session_manager.close_session(session_id)
                self.websocket_sessions[connection_id].discard(session_id)
                self.session_last_activity.pop(session_id, None)
                self.session_input_totals.pop(session_id, None)

    async def handle_websocket(self, websocket: WebSocket, client_ip: str) -> None:
        await websocket.accept()
        logger.info(f"WebSocket connection accepted from {client_ip}")

        connection_id = str(uuid.uuid4())
        user_agent = websocket.headers.get("user-agent", "unknown")
        timeout_task = None

        try:
            await self.rate_limiter.check_connection_limit(client_ip)
            self.rate_limiter.track_connection(connection_id, client_ip, user_agent)
            self.websocket_sessions[connection_id] = set()

            timeout_task = asyncio.create_task(self._check_idle_timeouts(connection_id, websocket))

            while True:
                try:
                    data = await websocket.receive_text()

                    if len(data.encode("utf-8")) > MAX_WEBSOCKET_MESSAGE_SIZE:
                        logger.warning(f"WebSocket message too large: {len(data.encode('utf-8'))} bytes")
                        error_msg: ErrorMessage = {
                            "type": "error",
                            "sessionId": "",
                            "error": "Message too large. Maximum size is 64KB.",
                        }
                        await self._send_message(websocket, error_msg)
                        continue

                    try:
                        msg_dict = json.loads(data)
                        if not isinstance(msg_dict, dict) or "type" not in msg_dict:
                            continue

                        msg_type = msg_dict.get("type")
                        msg: ClientMessage = msg_dict  # type: ignore

                        if msg_type == "create_session":
                            await self._handle_create_session(websocket, connection_id, client_ip, msg)
                        elif msg_type == "input":
                            await self._handle_input(websocket, connection_id, client_ip, msg)
                        elif msg_type == "resize":
                            await self._handle_resize(websocket, connection_id, client_ip, msg)
                        elif msg_type == "close_session":
                            await self._handle_close_session(websocket, connection_id, client_ip, msg)
                        else:
                            logger.warning(f"Unknown message type: {msg_type}")

                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON message: {data[:100]}")

                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected")
                    break
                except Exception as e:
                    logger.error(f"Error handling WebSocket message: {e}", exc_info=True)
                    break

            logger.info("WebSocket connection closed")

        except Exception as e:
            logger.error(f"Error in handle_websocket: {e}", exc_info=True)
            try:
                await websocket.close(code=1011, reason=str(e))
            except Exception:
                pass
        finally:
            self.rate_limiter.untrack_connection(connection_id)

            if connection_id in self.websocket_sessions:
                for session_id in list(self.websocket_sessions[connection_id]):
                    await self.session_manager.close_session(session_id)
                    self.session_last_activity.pop(session_id, None)
                    self.session_input_totals.pop(session_id, None)
                del self.websocket_sessions[connection_id]

            if timeout_task:
                try:
                    timeout_task.cancel()
                    try:
                        await timeout_task
                    except asyncio.CancelledError:
                        pass
                except Exception:
                    pass
