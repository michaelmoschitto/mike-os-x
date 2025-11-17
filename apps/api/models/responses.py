from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    container_status: str | None = None


class TerminalStatusResponse(BaseModel):
    status: str
    container_id: str | None = None
    running: bool


class AdminStatsResponse(BaseModel):
    container_id: str
    memory_usage: str
    cpu_usage: float
    disk_usage: str
    active_connections: int
