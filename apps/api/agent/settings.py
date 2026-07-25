from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_env_file() -> Path | None:
    current_dir = Path(__file__).parent.parent
    env_local = current_dir / ".env.local"
    env_file = current_dir / ".env"
    if env_local.exists():
        return env_local
    if env_file.exists():
        return env_file
    return None


def load_environment() -> None:
    env_file = get_env_file()
    if env_file:
        load_dotenv(dotenv_path=env_file, override=False)
    else:
        load_dotenv(override=False)


load_environment()


def get_default_docker_host() -> str:
    if docker_host := os.getenv("DOCKER_HOST"):
        return docker_host

    home = Path.home()
    docker_sock = home / ".docker" / "run" / "docker.sock"
    if docker_sock.exists():
        return f"unix://{docker_sock}"
    return "unix:///var/run/docker.sock"


class AgentSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(get_env_file()) if get_env_file() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    docker_host: str = Field(default_factory=get_default_docker_host)
    docker_tls_verify: bool = Field(default=False)
    docker_cert_path: str = Field(default="")

    terminal_container_name: str = Field(default="terminal-shared")
    terminal_volume_name: str = Field(default="terminal-workspace")

    terminal_agent_token: str = Field(default="")

    container_memory: str = Field(default="256m")
    container_cpus: float = Field(default=0.5)
    container_pids: int = Field(default=128)
    container_disk: str = Field(default="64m")
    max_terminal_sessions: int = Field(default=2, ge=1)
    max_sessions_per_connection: int = Field(default=1, ge=1)

    # Unused by the agent path, but ContainerManager reads settings from the API module.
    cors_origins: str = Field(default="http://localhost")
    admin_api_key: str = Field(default="")
    redis_url: str = Field(default="redis://localhost:6379/0")
    rate_limit_connections: int = Field(default=50)
    rate_limit_commands: int = Field(default=5000)

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        if not self.terminal_agent_token or len(self.terminal_agent_token) < 32:
            raise ValueError(
                "TERMINAL_AGENT_TOKEN must be set to a high-entropy secret "
                "(at least 32 characters)."
            )


logger = logging.getLogger(__name__)
settings = AgentSettings()
