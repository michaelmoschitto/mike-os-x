import pytest
import docker
import redis
from httpx import AsyncClient

from main import app
from config.settings import settings


@pytest.fixture
def docker_client() -> docker.DockerClient:
    return docker.DockerClient(base_url=settings.docker_host)


@pytest.fixture
def redis_client() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)


@pytest.fixture
async def api_client() -> AsyncClient:
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

