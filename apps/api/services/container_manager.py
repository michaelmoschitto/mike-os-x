import logging
import os

import docker
from docker.errors import DockerException, NotFound
from docker.models.containers import Container

from config.settings import settings

logger = logging.getLogger(__name__)


class ContainerManager:
    def __init__(self) -> None:
        docker_host = settings.docker_host

        # Configure TLS if connecting to remote Docker daemon
        tls_config = None
        if settings.docker_tls_verify and settings.docker_cert_path:
            cert_path = settings.docker_cert_path
            ca_cert = os.path.join(cert_path, "ca.pem")
            client_cert = os.path.join(cert_path, "cert.pem")
            client_key = os.path.join(cert_path, "key.pem")

            if all(os.path.exists(f) for f in [ca_cert, client_cert, client_key]):
                tls_config = docker.tls.TLSConfig(
                    client_cert=(client_cert, client_key),
                    ca_cert=ca_cert,
                    verify=True,
                )
                logger.info(f"Using TLS for Docker connection to {docker_host}")
            else:
                logger.warning(
                    f"TLS enabled but certificates not found in {cert_path}. "
                    "Falling back to non-TLS connection."
                )

        if docker_host.startswith("unix://"):
            socket_path = docker_host.replace("unix://", "")
            if not os.path.exists(socket_path):
                raise RuntimeError(
                    f"Docker socket not found at {socket_path}\n"
                    "Docker Desktop may not be running or the socket path is incorrect.\n"
                    "Please ensure Docker Desktop is running and try again."
                )

        try:
            self.client = docker.DockerClient(base_url=docker_host, tls=tls_config)
            self.client.ping()
            logger.info(f"Successfully connected to Docker at {docker_host}")
        except FileNotFoundError as e:
            raise RuntimeError(
                f"Docker socket not found: {docker_host}\n"
                "Docker Desktop may not be running.\n"
                "Please start Docker Desktop and try again."
            ) from e
        except (DockerException, ConnectionError) as e:
            raise RuntimeError(
                f"Cannot connect to Docker daemon at {docker_host}.\n"
                "Please ensure Docker is running and accessible.\n"
                f"Error: {e}"
            ) from e
        except Exception as e:
            raise RuntimeError(
                f"Unexpected error connecting to Docker: {e}\n"
                "Please ensure Docker is running and try again."
            ) from e

        self.container_name = settings.terminal_container_name
        self.volume_name = settings.terminal_volume_name

    def get_container(self) -> Container | None:
        if getattr(self, "client", None) is None:
            return None

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

    def reset_workspace(self) -> None:
        container = self.get_container()
        if not container:
            raise RuntimeError(
                f"Terminal container '{self.container_name}' not found. "
                "Please ensure docker-compose services are running: bun run dev"
            )

        if container.status != "running":
            container.start()

        exec_result = container.exec_run(
            cmd="sh -c 'rm -rf /workspace/* /workspace/.* 2>/dev/null || true'",
            user="workspace",
        )
        if exec_result.exit_code != 0:
            raise RuntimeError(
                f"Failed to reset workspace: {exec_result.output.decode('utf-8', errors='replace')}"
            )

    def check_container_health(self) -> bool:
        container = self.get_container()
        if not container:
            return False

        if container.status != "running":
            return False

        try:
            container.reload()
            exec_result = container.exec_run(
                cmd="echo 'healthcheck'",
                timeout=2,
            )
            return exec_result.exit_code == 0
        except Exception as e:
            logger.debug(f"Health check failed: {e}")
            return False

    def ensure_container_healthy(self) -> Container:
        container = self.ensure_container_running()
        return container
