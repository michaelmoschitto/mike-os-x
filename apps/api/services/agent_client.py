from __future__ import annotations

import json
import logging
from typing import Any
from urllib.parse import urlparse, urlunparse

import httpx
import websockets
from websockets.asyncio.client import ClientConnection

from services.agent_auth import (
    SIGNATURE_HEADER,
    TIMESTAMP_HEADER,
    sign_request,
)
from services.message_protocol import ServerMessage

logger = logging.getLogger(__name__)


class AgentClient:
    def __init__(self, base_url: str, token: str, timeout: float = 30.0) -> None:
        if not base_url:
            raise ValueError("TERMINAL_AGENT_URL is required")
        if not token or len(token) < 32:
            raise ValueError("TERMINAL_AGENT_TOKEN must be at least 32 characters")

        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout
        self._client = httpx.AsyncClient(timeout=timeout, follow_redirects=True)

    async def aclose(self) -> None:
        await self._client.aclose()

    def _auth_headers(self, method: str, path: str, body: bytes = b"") -> dict[str, str]:
        timestamp, signature = sign_request(self.token, method, path, body)
        return {
            TIMESTAMP_HEADER: timestamp,
            SIGNATURE_HEADER: signature,
            "content-type": "application/json",
        }

    async def request(
        self,
        method: str,
        path: str,
        json_body: dict[str, Any] | None = None,
    ) -> Any:
        body = b""
        if json_body is not None:
            body = json.dumps(json_body).encode("utf-8")

        response = await self._client.request(
            method=method,
            url=f"{self.base_url}{path}",
            content=body,
            headers=self._auth_headers(method, path, body),
        )
        response.raise_for_status()
        if not response.content:
            return None
        return response.json()

    async def get_health(self) -> dict[str, Any]:
        return await self.request("GET", "/health")

    async def get_status(self) -> dict[str, Any]:
        return await self.request("GET", "/v1/status")

    async def cleanup_sessions(self) -> dict[str, Any]:
        return await self.request("POST", "/v1/admin/cleanup-sessions")

    async def reset(self) -> dict[str, Any]:
        return await self.request("POST", "/v1/admin/reset")

    async def restart(self) -> dict[str, Any]:
        return await self.request("POST", "/v1/admin/restart")

    async def reset_workspace(self) -> dict[str, Any]:
        return await self.request("POST", "/v1/admin/reset-workspace")

    async def get_stats(self) -> dict[str, Any]:
        return await self.request("GET", "/v1/admin/stats")

    async def get_logs(self) -> dict[str, Any]:
        return await self.request("GET", "/v1/admin/logs")

    def session_ws_url(self, session_id: str) -> tuple[str, dict[str, str]]:
        parsed = urlparse(self.base_url)
        scheme = "wss" if parsed.scheme == "https" else "ws"
        path = f"/v1/sessions/{session_id}"
        timestamp, signature = sign_request(self.token, "GET", path, b"")
        url = urlunparse((scheme, parsed.netloc, path, "", "", ""))
        headers = {
            TIMESTAMP_HEADER: timestamp,
            SIGNATURE_HEADER: signature,
        }
        return url, headers

    async def open_session(self, session_id: str) -> ClientConnection:
        url, headers = self.session_ws_url(session_id)
        websocket = await websockets.connect(
            url,
            open_timeout=self.timeout,
            additional_headers=headers,
        )
        raw = await websocket.recv()
        message = json.loads(raw)
        if message.get("type") != "session_created":
            await websocket.close()
            raise RuntimeError(message.get("error", "Failed to create agent session"))
        return websocket

    async def send_session_message(
        self, websocket: ClientConnection, message: dict[str, Any]
    ) -> None:
        await websocket.send(json.dumps(message))

    async def read_session_message(self, websocket: ClientConnection) -> ServerMessage:
        raw = await websocket.recv()
        return json.loads(raw)  # type: ignore[return-value]
