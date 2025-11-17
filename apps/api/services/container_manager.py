import os

import docker
from docker.errors import DockerException, NotFound
from docker.models.containers import Container
from docker.errors import NotFound, DockerException

from config.settings import settings


class ContainerManager:
    def __init__(self) -> None:
        docker_host = settings.docker_host

        if docker_host.startswith("unix://"):
            socket_path = docker_host.replace("unix://", "")
            if not os.path.exists(socket_path):
                raise RuntimeError(
                    f"Docker socket not found at {socket_path}\n"
                    "Docker Desktop may not be running or the socket path is incorrect.\n"
                    "Please ensure Docker Desktop is running and try again."
                )

        try:
            self.client = docker.DockerClient(base_url=docker_host)
            self.client.ping()
        except FileNotFoundError as e:
            raise RuntimeError(
                f"Docker socket not found: {docker_host}\n"
                "Docker Desktop may not be running.\n"
                "Please start Docker Desktop and try again."
            ) from e
        except (DockerException, ConnectionError) as e:
            raise RuntimeError(
                "Cannot connect to Docker Desktop.\n"
                "Please ensure Docker Desktop is running and try again.\n"
                f"Error: {e}"
            ) from e
        except Exception as e:
            raise RuntimeError(
                f"Unexpected error connecting to Docker: {e}\n"
                "Please ensure Docker Desktop is running and try again."
            ) from e

        self.container_name = settings.terminal_container_name
        self.volume_name = settings.terminal_volume_name

    def get_container(self) -> Container | None:
        try:
            return self.client.containers.get(self.container_name)
        except NotFound:
            return None

    def ensure_container_running(self) -> Container:
        container = self.get_container()
        if not container:
            raise RuntimeError(
                f"Terminal container '{self.container_name}' not found. "
                "Please ensure docker-compose services are running: bun run dev"
            )
        if container.status != "running":
            container.start()
        return container

    def restart_container(self) -> Container:
        container = self.get_container()
        if not container:
            raise RuntimeError(
                f"Terminal container '{self.container_name}' not found. "
                "Please ensure docker-compose services are running: bun run dev"
            )
        container.restart()
        return container

    def reset_container(self) -> None:
        container = self.get_container()
        if container:
            container.stop()
            container.remove()

        try:
            volume = self.client.volumes.get(self.volume_name)
            volume.remove()
        except NotFound:
            pass

    def get_container_status(self) -> dict[str, str | bool | None]:
        container = self.get_container()
        if not container:
            return {"status": "not_found", "running": False, "container_id": None}

        return {
            "status": container.status,
            "running": container.status == "running",
            "container_id": container.id,
        }
