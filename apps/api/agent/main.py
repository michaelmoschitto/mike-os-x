from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from typing import Any

# Agent boots without browser CORS requirements; set a local default before API settings load.
os.environ.setdefault("CORS_ORIGINS", "http://localhost")

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from agent.auth import authorize_websocket, build_require_agent_auth
from agent.settings import settings as agent_settings
from config import settings as config_settings
from models.responses import AdminStatsResponse, HealthResponse, TerminalStatusResponse
from services.container_manager import ContainerManager
from services.message_protocol import (
    ClientMessage,
    ErrorMessage,
    ServerMessage,
    SessionClosedMessage,
    SessionCreatedMessage,
)
from services.pty_session_manager import PTYSessionManager

# Share one settings object so Docker managers use the agent configuration.
config_settings.settings = agent_settings  # type: ignore[assignment]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_WEBSOCKET_MESSAGE_SIZE = 64 * 1024
MAX_INPUT_SIZE = 64 * 1024
MAX_TOTAL_INPUT_PER_SESSION = 10 * 1024 * 1024
SESSION_IDLE_TIMEOUT = 30 * 60
MAX_SESSION_ID_LENGTH = 128

app = FastAPI(title="Terminal Agent", version="0.1.0")
require_agent_auth = build_require_agent_auth(agent_settings.terminal_agent_token)

container_manager = ContainerManager()
session_manager = PTYSessionManager(container_manager)
session_last_activity: dict[str, float] = {}
session_input_totals: dict[str, int] = {}


@app.on_event("startup")
async def cleanup_orphaned_terminal_sessions() -> None:
    await asyncio.to_thread(container_manager.remove_all_session_containers)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    status_info = container_manager.get_container_status()
    terminal_status = status_info.get("status", "unknown")
    terminal_available = bool(status_info.get("running", False))
    if not terminal_available:
        raise RuntimeError(f"Terminal container not available: {terminal_status}")
    return HealthResponse(
        status="healthy",
        terminal_available=True,
        terminal_status=str(terminal_status),
        container_status=str(terminal_status),
    )


@app.get("/v1/status", response_model=TerminalStatusResponse, dependencies=[Depends(require_agent_auth)])
async def status() -> TerminalStatusResponse:
    status_info = container_manager.get_container_status()
    return TerminalStatusResponse(
        status=str(status_info["status"]),
        container_id=status_info.get("container_id"),  # type: ignore[arg-type]
        running=bool(status_info["running"]),
    )


@app.post("/v1/admin/cleanup-sessions", dependencies=[Depends(require_agent_auth)])
async def cleanup_sessions() -> JSONResponse:
    await session_manager.close_all_sessions()
    removed = await asyncio.to_thread(container_manager.remove_all_session_containers)
    return JSONResponse(content={"removed": removed})


@app.post("/v1/admin/reset", dependencies=[Depends(require_agent_auth)])
async def admin_reset() -> JSONResponse:
    await session_manager.close_all_sessions()
    await asyncio.to_thread(container_manager.reset_container)
    return JSONResponse(content={"message": "Terminal sessions reset successfully"})


@app.post("/v1/admin/restart", dependencies=[Depends(require_agent_auth)])
async def admin_restart() -> JSONResponse:
    await session_manager.close_all_sessions()
    await asyncio.to_thread(container_manager.restart_container)
    return JSONResponse(
        content={"message": "Terminal sessions closed and template restarted successfully"}
    )


@app.post("/v1/admin/reset-workspace", dependencies=[Depends(require_agent_auth)])
async def admin_reset_workspace() -> JSONResponse:
    await session_manager.close_all_sessions()
    await asyncio.to_thread(container_manager.reset_workspace)
    return JSONResponse(content={"message": "Terminal sessions reset successfully"})


@app.get("/v1/admin/stats", response_model=AdminStatsResponse, dependencies=[Depends(require_agent_auth)])
async def admin_stats() -> AdminStatsResponse:
    session_containers = await asyncio.to_thread(container_manager.get_session_containers)
    stats = await asyncio.gather(
        *(asyncio.to_thread(container.stats, stream=False) for container in session_containers)
    )
    memory_usage = sum(stat.get("memory_stats", {}).get("usage", 0) for stat in stats)
    cpu_total = sum(
        stat.get("cpu_stats", {}).get("cpu_usage", {}).get("total_usage", 0) for stat in stats
    )
    system_cpu_total = sum(stat.get("cpu_stats", {}).get("system_cpu_usage", 0) for stat in stats)
    cpu_usage = (cpu_total / system_cpu_total * 100) if system_cpu_total else 0.0
    return AdminStatsResponse(
        container_id=f"{len(session_containers)} isolated session containers",
        memory_usage=f"{memory_usage / 1024 / 1024:.2f} MB",
        cpu_usage=cpu_usage,
        disk_usage=f"{agent_settings.container_disk} per session",
        active_connections=len(session_manager.sessions),
    )


@app.get("/v1/admin/logs", dependencies=[Depends(require_agent_auth)])
async def admin_logs() -> JSONResponse:
    session_containers = await asyncio.to_thread(container_manager.get_session_containers)
    logs = "\n\n".join(
        f"=== {container.name} ===\n"
        f"{(await asyncio.to_thread(container.logs, tail=100)).decode('utf-8', errors='replace')}"
        for container in session_containers
    )
    return JSONResponse(content={"logs": logs})


async def _send(websocket: WebSocket, message: ServerMessage) -> None:
    await websocket.send_text(json.dumps(message))


async def _send_error(websocket: WebSocket, session_id: str, error: str) -> None:
    message: ErrorMessage = {"type": "error", "sessionId": session_id, "error": error}
    await _send(websocket, message)


@app.websocket("/v1/sessions/{session_id}")
async def session_socket(websocket: WebSocket, session_id: str) -> None:
    if not await authorize_websocket(websocket, agent_settings.terminal_agent_token):
        return

    await websocket.accept()

    if not isinstance(session_id, str) or not session_id or len(session_id) > MAX_SESSION_ID_LENGTH:
        await _send_error(websocket, session_id, "Invalid sessionId")
        await websocket.close(code=1008)
        return

    if session_id in session_manager.sessions:
        await _send_error(websocket, session_id, "Session already exists")
        await websocket.close(code=1008)
        return

    if len(session_manager.sessions) >= agent_settings.max_terminal_sessions:
        await _send_error(websocket, session_id, "Terminal capacity reached. Please try again later.")
        await websocket.close(code=1008)
        return

    read_task: asyncio.Task | None = None
    try:
        session = await session_manager.create_session(session_id)
        session_last_activity[session_id] = time.time()
        session_input_totals[session_id] = 0

        created: SessionCreatedMessage = {
            "type": "session_created",
            "sessionId": session_id,
        }
        await _send(websocket, created)

        async def forward_output(message: ServerMessage) -> None:
            await _send(websocket, message)

        async def read_loop() -> None:
            try:
                await session_manager.read_from_session(session_id, websocket, forward_output)
            finally:
                closed: SessionClosedMessage = {
                    "type": "session_closed",
                    "sessionId": session_id,
                }
                try:
                    await _send(websocket, closed)
                except Exception:
                    pass

        read_task = asyncio.create_task(read_loop())
        session.read_task = read_task

        while True:
            raw = await websocket.receive_text()
            if len(raw.encode("utf-8")) > MAX_WEBSOCKET_MESSAGE_SIZE:
                await _send_error(websocket, session_id, "Message too large. Maximum size is 64KB.")
                continue

            try:
                msg_dict: dict[str, Any] = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if not isinstance(msg_dict, dict) or "type" not in msg_dict:
                continue

            msg_type = msg_dict.get("type")
            msg: ClientMessage = msg_dict  # type: ignore[assignment]
            session_last_activity[session_id] = time.time()

            if msg_type == "input":
                input_data = msg.get("data", "")  # type: ignore[attr-defined]
                if not input_data:
                    continue
                encoded = str(input_data).encode("utf-8")
                if len(encoded) > MAX_INPUT_SIZE:
                    await _send_error(websocket, session_id, "Input too large. Maximum size is 64KB.")
                    continue
                session_input_totals[session_id] = session_input_totals.get(session_id, 0) + len(
                    encoded
                )
                if session_input_totals[session_id] > MAX_TOTAL_INPUT_PER_SESSION:
                    await _send_error(
                        websocket,
                        session_id,
                        "Session input limit exceeded (10MB). Please reconnect.",
                    )
                    break
                await session_manager.write_to_session(session_id, encoded)
            elif msg_type == "resize":
                cols = msg.get("cols", 80)  # type: ignore[attr-defined]
                rows = msg.get("rows", 24)  # type: ignore[attr-defined]
                if not isinstance(cols, int) or not isinstance(rows, int):
                    await _send_error(websocket, session_id, "Invalid resize dimensions")
                    continue
                if cols < 1 or cols > 1000 or rows < 1 or rows > 1000:
                    await _send_error(websocket, session_id, "Invalid resize dimensions")
                    continue
                await session_manager.resize_session(session_id, cols, rows)
            elif msg_type == "close_session":
                break
            else:
                logger.warning("Unknown agent message type: %s", msg_type)

    except WebSocketDisconnect:
        logger.info("Agent session WebSocket disconnected for %s", session_id)
    except Exception as e:
        logger.error("Agent session error for %s: %s", session_id, e, exc_info=True)
        try:
            await _send_error(websocket, session_id, f"Failed to manage session: {e}")
        except Exception:
            pass
    finally:
        if read_task:
            read_task.cancel()
            try:
                await read_task
            except asyncio.CancelledError:
                pass
        await session_manager.close_session(session_id)
        session_last_activity.pop(session_id, None)
        session_input_totals.pop(session_id, None)
        try:
            await websocket.close()
        except Exception:
            pass
