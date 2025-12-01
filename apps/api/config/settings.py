import base64
import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def setup_docker_certs_from_env() -> str | None:
    """Decode base64 Docker TLS certs from env vars and write to /tmp/docker-certs."""
    ca_b64 = os.getenv("DOCKER_CA_CERT")
    cert_b64 = os.getenv("DOCKER_CLIENT_CERT")
    key_b64 = os.getenv("DOCKER_CLIENT_KEY")

    if not all([ca_b64, cert_b64, key_b64]):
        return None

    cert_dir = Path("/tmp/docker-certs")
    cert_dir.mkdir(parents=True, exist_ok=True)

    try:
        (cert_dir / "ca.pem").write_bytes(base64.b64decode(ca_b64))
        (cert_dir / "cert.pem").write_bytes(base64.b64decode(cert_b64))
        (cert_dir / "key.pem").write_bytes(base64.b64decode(key_b64))
        (cert_dir / "key.pem").chmod(0o600)
        return str(cert_dir)
    except Exception:
        return None


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


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(get_env_file()) if get_env_file() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Docker - respects DOCKER_HOST env var, falls back to auto-detection
    docker_host: str = Field(default_factory=get_default_docker_host)
    docker_tls_verify: bool = Field(default=False)
    docker_cert_path: str = Field(default="")

    def model_post_init(self, __context) -> None:
        # If certs provided via base64 env vars, decode and use them
        if not self.docker_cert_path or not Path(self.docker_cert_path).exists():
            if decoded_path := setup_docker_certs_from_env():
                object.__setattr__(self, "docker_cert_path", decoded_path)
                object.__setattr__(self, "docker_tls_verify", True)

    terminal_container_name: str = Field(default="terminal-shared")
    terminal_volume_name: str = Field(default="terminal-workspace")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")

    # Security
    admin_api_key: str = Field(default="")
    cors_origins: str = Field(default="http://localhost:3000,http://localhost:5173")

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        is_production = (
            os.getenv("ENVIRONMENT", "").lower() == "production"
            or os.getenv("NODE_ENV", "").lower() == "production"
        )
        if is_production and not self.admin_api_key:
            raise ValueError(
                "ADMIN_API_KEY must be set in production environment. "
                "Please set the ADMIN_API_KEY environment variable."
            )

    # Rate Limiting (per IP address)
    rate_limit_connections: int = Field(
        default=5
    )  # Max WebSocket connections per IP (allows reconnection attempts)
    rate_limit_commands: int = Field(default=100)  # Max commands per minute per IP

    # Container Resources
    container_memory: str = Field(default="1g")
    container_cpus: float = Field(default=1.0)
    container_disk: str = Field(default="5g")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
