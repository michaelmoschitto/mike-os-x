from __future__ import annotations

import asyncio
import logging
from typing import Any

from websockets.asyncio.client import ClientConnection
from websockets.exceptions import ConnectionClosed

from services.agent_client import AgentClient
from services.message_protocol import ServerMessage

logger = logging.getLogger(__name__)


class AgentPTYSession:
    def __init__(self, session_id: str, websocket: ClientConnection) -> None:
        self.session_id = session_id
        self.websocket = websocket
        self.read_task: asyncio.Task | None = None
        self.write_task: asyncio.Task | None = None

    def close(self) -> None:
        current_task = asyncio.current_task()
        if self.read_task and self.read_task is not current_task:
            self.read_task.cancel()
        if self.write_task and self.write_task is not current_task:
            self.write_task.cancel()


class AgentContainerManager:
    """HTTP-backed stand-in for ContainerManager used by the Railway API."""

    def __init__(self, client: AgentClient) -> None:
        self.client = client

    async def get_container_status(self) -> dict[str, Any]:
        return await self.client.get_status()

    async def remove_all_session_containers(self) -> int:
        payload = await self.client.cleanup_sessions()
        return int(payload.get("removed", 0))

    async def reset_container(self) -> None:
        await self.client.reset()

    async def restart_container(self) -> None:
        await self.client.restart()

    async def reset_workspace(self) -> None:
        await self.client.reset_workspace()

    async def get_stats(self) -> dict[str, Any]:
        return await self.client.get_stats()

    async def get_logs(self) -> dict[str, Any]:
        return await self.client.get_logs()


class AgentPTYSessionManager:
    def __init__(self, client: AgentClient) -> None:
        self.client = client
        self.sessions: dict[str, AgentPTYSession] = {}

    async def create_session(self, session_id: str) -> AgentPTYSession:
        if session_id in self.sessions:
            return self.sessions[session_id]

        websocket = await self.client.open_session(session_id)
        session = AgentPTYSession(session_id, websocket)
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> AgentPTYSession | None:
        return self.sessions.get(session_id)

    async def close_session(self, session_id: str) -> None:
        session = self.sessions.pop(session_id, None)
        if not session:
            return

        try:
            await self.client.send_session_message(
                session.websocket,
                {"type": "close_session", "sessionId": session_id},
            )
        except Exception:
            pass

        try:
            await session.websocket.close()
        except Exception:
            pass

        session.close()
        logger.info("Closed agent-backed session %s", session_id)

    async def resize_session(self, session_id: str, cols: int, rows: int) -> None:
        session = self.sessions.get(session_id)
        if not session:
            return
        await self.client.send_session_message(
            session.websocket,
            {"type": "resize", "sessionId": session_id, "cols": cols, "rows": rows},
        )

    async def write_to_session(self, session_id: str, data: bytes) -> None:
        session = self.sessions.get(session_id)
        if not session:
            return
        await self.client.send_session_message(
            session.websocket,
            {
                "type": "input",
                "sessionId": session_id,
                "data": data.decode("utf-8", errors="replace"),
            },
        )

    async def read_from_session(
        self,
        session_id: str,
        websocket,
        send_message_callback,
    ) -> None:
        session = self.sessions.get(session_id)
        if not session:
            return

        try:
            while True:
                message: ServerMessage = await self.client.read_session_message(
                    session.websocket
                )
                msg_type = message.get("type")
                if msg_type == "output":
                    await send_message_callback(message)
                elif msg_type == "session_closed":
                    break
                elif msg_type == "error":
                    await send_message_callback(message)
                else:
                    logger.debug("Ignoring agent message type %s", msg_type)
        except ConnectionClosed:
            logger.info("Agent WebSocket closed for session %s", session_id)
        except Exception as e:
            logger.error("Error reading agent session %s: %s", session_id, e)
        finally:
            await self.close_session(session_id)

    async def close_all_sessions(self) -> None:
        for session_id in list(self.sessions.keys()):
            await self.close_session(session_id)
