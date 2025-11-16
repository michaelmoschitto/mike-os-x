import asyncio
import json
import logging
import uuid
from fastapi import WebSocket, WebSocketDisconnect

from services.container_manager import ContainerManager
from services.rate_limiter import RateLimiter
from services.pty_session_manager import PTYSessionManager
from services.message_protocol import ClientMessage, ServerMessage

logger = logging.getLogger(__name__)


class TerminalBridge:
    def __init__(self) -> None:
        self.container_manager = ContainerManager()
        self.rate_limiter = RateLimiter()
        self.session_manager = PTYSessionManager(self.container_manager)

    async def handle_websocket(self, websocket: WebSocket, client_ip: str) -> None:
        await self.rate_limiter.check_connection_limit(client_ip)

        await websocket.accept()
        logger.info(f"WebSocket connection accepted from {client_ip}")

        connection_id = str(uuid.uuid4())
        user_agent = websocket.headers.get("user-agent", "unknown")
        self.rate_limiter.track_connection(connection_id, client_ip, user_agent)

        active_sessions: dict[str, asyncio.Task] = {}

        async def send_message(message: ServerMessage) -> None:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message: {e}")

        try:
            while True:
                try:
                    data = await websocket.receive_text()

                    try:
                        msg: ClientMessage = json.loads(data)
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON message: {data}")
                        continue

                    msg_type = msg.get("type")
                    session_id = msg.get("sessionId", "")

                    if msg_type == "create_session":
                        if not session_id:
                            logger.warning("create_session message missing sessionId")
                            continue

                        if session_id in active_sessions:
                            logger.warning(f"Session {session_id} already exists")
                            await send_message({
                                "type": "session_created",
                                "sessionId": session_id,
                            })
                            continue

                        try:
                            session = await self.session_manager.create_session(session_id)
                            await send_message({
                                "type": "session_created",
                                "sessionId": session_id,
                            })

                            async def read_task() -> None:
                                try:
                                    await self.session_manager.read_from_session(
                                        session_id, websocket, send_message
                                    )
                                except Exception as e:
                                    logger.error(f"Read task error for {session_id}: {e}")
                                finally:
                                    await self.session_manager.close_session(session_id)
                                    active_sessions.pop(session_id, None)
                                    await send_message({
                                        "type": "session_closed",
                                        "sessionId": session_id,
                                    })

                            task = asyncio.create_task(read_task())
                            active_sessions[session_id] = task
                            logger.info(f"Created and started read task for session {session_id}")

                        except Exception as e:
                            logger.error(f"Error creating session {session_id}: {e}")
                            await send_message({
                                "type": "error",
                                "sessionId": session_id,
                                "error": str(e),
                            })

                    elif msg_type == "input":
                        if not session_id:
                            logger.warning("input message missing sessionId")
                            continue

                        if not await self.rate_limiter.check_command_limit(connection_id):
                            await send_message({
                                "type": "error",
                                "sessionId": session_id,
                                "error": "Rate limit exceeded. Please wait.",
                            })
                            continue

                        input_data = msg.get("data", "")
                        if input_data:
                            await self.session_manager.write_to_session(
                                session_id, input_data.encode()
                            )

                    elif msg_type == "resize":
                        if not session_id:
                            logger.warning("resize message missing sessionId")
                            continue

                        cols = msg.get("cols", 80)
                        rows = msg.get("rows", 24)
                        await self.session_manager.resize_session(session_id, cols, rows)

                    elif msg_type == "close_session":
                        if not session_id:
                            logger.warning("close_session message missing sessionId")
                            continue

                        task = active_sessions.pop(session_id, None)
                        if task:
                            task.cancel()
                            try:
                                await task
                            except asyncio.CancelledError:
                                pass

                        await self.session_manager.close_session(session_id)
                        await send_message({
                            "type": "session_closed",
                            "sessionId": session_id,
                        })

                    else:
                        logger.warning(f"Unknown message type: {msg_type}")

                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected")
                    break
                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)

        except Exception as e:
            logger.error(f"Error in handle_websocket: {e}", exc_info=True)
            try:
                await websocket.close(code=1011, reason=str(e))
            except Exception:
                pass
        finally:
            for task in active_sessions.values():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            for session_id in list(active_sessions.keys()):
                await self.session_manager.close_session(session_id)

            self.rate_limiter.untrack_connection(connection_id)
            logger.info("WebSocket connection closed and cleaned up")
