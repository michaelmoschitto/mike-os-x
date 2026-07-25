from __future__ import annotations

import logging

from fastapi import HTTPException, Request, WebSocket, status

from services.agent_auth import (
    SIGNATURE_HEADER,
    TIMESTAMP_HEADER,
    verify_request,
)

logger = logging.getLogger(__name__)


def build_require_agent_auth(token: str):
    async def require_agent_auth(request: Request) -> None:
        if request.url.path == "/health":
            return

        # Agent control endpoints never accept request bodies.
        if not verify_request(
            token=token,
            method=request.method,
            path=request.url.path,
            timestamp=request.headers.get(TIMESTAMP_HEADER),
            signature=request.headers.get(SIGNATURE_HEADER),
            body=b"",
        ):
            logger.warning(
                "Rejected unauthenticated agent HTTP request to %s", request.url.path
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
            )

    return require_agent_auth


async def authorize_websocket(websocket: WebSocket, token: str) -> bool:
    path = websocket.url.path
    timestamp = websocket.headers.get(TIMESTAMP_HEADER) or websocket.query_params.get("ts")
    signature = websocket.headers.get(SIGNATURE_HEADER) or websocket.query_params.get("sig")

    authorized = verify_request(
        token=token,
        method="GET",
        path=path,
        timestamp=timestamp,
        signature=signature,
        body=b"",
    )
    if not authorized:
        logger.warning("Rejected unauthenticated agent WebSocket to %s", path)
        await websocket.close(code=1008, reason="Unauthorized")
        return False
    return True
