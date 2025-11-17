import logging

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from middleware.auth import verify_admin_key
from middleware.cors import setup_cors
from models.responses import (
    AdminStatsResponse,
    HealthResponse,
    TerminalStatusResponse,
)
from services.container_manager import ContainerManager
from services.rate_limiter import RateLimiter
from services.terminal_bridge import TerminalBridge

load_dotenv(override=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Terminal API", version="0.1.0")

setup_cors(app)

container_manager = ContainerManager()
terminal_bridge = TerminalBridge()
rate_limiter = RateLimiter()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    status_info = container_manager.get_container_status()
    return HealthResponse(
        status="healthy",
        container_status=status_info.get("status"),
    )


@app.get("/api/terminal/status", response_model=TerminalStatusResponse)
async def terminal_status() -> TerminalStatusResponse:
    status_info = container_manager.get_container_status()
    return TerminalStatusResponse(
        status=status_info["status"],
        container_id=status_info.get("container_id"),
        running=status_info["running"],
    )


def get_client_ip(websocket: WebSocket) -> str:
    x_forwarded_for = websocket.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    if websocket.client:
        return websocket.client.host
    return "unknown"


@app.websocket("/ws/terminal")
async def websocket_terminal(websocket: WebSocket) -> None:
    client_ip = get_client_ip(websocket)
    logger.info(f"WebSocket connection attempt from {client_ip}")
    try:
        await terminal_bridge.handle_websocket(websocket, client_ip)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason=str(e))
        except Exception:
            pass


@app.post("/api/admin/terminal/reset")
async def admin_reset(admin_key: str = Depends(verify_admin_key)) -> JSONResponse:
    container_manager.reset_container()
    return JSONResponse(content={"message": "Terminal container reset successfully"})


@app.post("/api/admin/terminal/restart")
async def admin_restart(admin_key: str = Depends(verify_admin_key)) -> JSONResponse:
    container_manager.restart_container()
    return JSONResponse(content={"message": "Terminal container restarted successfully"})


@app.get("/api/admin/terminal/stats", response_model=AdminStatsResponse)
async def admin_stats(admin_key: str = Depends(verify_admin_key)) -> AdminStatsResponse:
    container = container_manager.get_container()
    if not container:
        raise ValueError("Container not found")

    stats = container.stats(stream=False)
    active_connections = rate_limiter.get_active_connections_count()

    memory_usage = stats.get("memory_stats", {}).get("usage", 0)
    cpu_delta = stats.get("cpu_stats", {}).get("cpu_usage", {}).get("total_usage", 0)
    system_cpu = stats.get("cpu_stats", {}).get("system_cpu_usage", 0)
    cpu_percent = (cpu_delta / system_cpu * 100) if system_cpu > 0 else 0.0

    return AdminStatsResponse(
        container_id=container.id,
        memory_usage=f"{memory_usage / 1024 / 1024:.2f} MB",
        cpu_usage=cpu_percent,
        disk_usage="N/A",
        active_connections=active_connections,
    )


@app.get("/api/admin/terminal/logs")
async def admin_logs(admin_key: str = Depends(verify_admin_key)) -> JSONResponse:
    container = container_manager.get_container()
    if not container:
        raise ValueError("Container not found")

    logs = container.logs(tail=100).decode("utf-8", errors="replace")
    return JSONResponse(content={"logs": logs})
