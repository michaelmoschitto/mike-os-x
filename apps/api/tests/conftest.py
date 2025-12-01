import os

import docker
import pytest
import redis
from httpx import AsyncClient

# Set required environment variables for tests before importing settings
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key")

from config.settings import settings
from main import app


@pytest.fixture
def docker_client() -> docker.DockerClient:
    return docker.DockerClient(base_url=settings.docker_host)


@pytest.fixture
def redis_client() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)


@pytest.fixture
async def api_client() -> AsyncClient:
    from httpx import ASGITransport

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
