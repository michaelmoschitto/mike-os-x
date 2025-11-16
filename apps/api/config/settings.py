import os
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_default_docker_host() -> str:
    if docker_host := os.getenv("DOCKER_HOST"):
        return docker_host
    
    home = Path.home()
    docker_sock = home / ".docker" / "run" / "docker.sock"
    if docker_sock.exists():
        return f"unix://{docker_sock}"
    return "unix:///var/run/docker.sock"


def get_env_file() -> str:
    current_dir = Path(__file__).parent.parent
    env_local = current_dir / ".env.local"
    env_file = current_dir / ".env"
    if env_local.exists():
        return str(env_local)
    if env_file.exists():
        return str(env_file)
    return str(env_local)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=get_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Docker - respects DOCKER_HOST env var, falls back to auto-detection
    docker_host: str = Field(default_factory=get_default_docker_host)
    terminal_container_name: str = Field(default="terminal-shared")
    terminal_volume_name: str = Field(default="terminal-workspace")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")

    # Security
    admin_api_key: str = Field(default="")
    cors_origins: str = Field(default="http://localhost:3000,http://localhost:5173")

    # Rate Limiting
    rate_limit_connections: int = Field(default=10)
    rate_limit_commands: int = Field(default=1000)

    # Container Resources
    container_memory: str = Field(default="1g")
    container_cpus: float = Field(default=1.0)
    container_disk: str = Field(default="5g")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()

