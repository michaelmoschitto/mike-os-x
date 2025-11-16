import pytest
import docker

from config.settings import settings
from services.container_manager import ContainerManager


@pytest.fixture
def container_manager() -> ContainerManager:
    return ContainerManager()


def test_container_has_no_network(container_manager: ContainerManager) -> None:
    container = container_manager.get_container()
    if not container:
        pytest.skip("Container not running")

    exec_result = container.exec_run("curl -I https://google.com", user="workspace")
    assert exec_result.exit_code != 0


def test_container_read_only_root(container_manager: ContainerManager) -> None:
    container = container_manager.get_container()
    if not container:
        pytest.skip("Container not running")

    exec_result = container.exec_run("touch /bin/test", user="workspace")
    assert exec_result.exit_code != 0


def test_container_workspace_writable(container_manager: ContainerManager) -> None:
    container = container_manager.get_container()
    if not container:
        pytest.skip("Container not running")

    exec_result = container.exec_run("touch /workspace/test.txt", user="workspace")
    assert exec_result.exit_code == 0

    exec_result = container.exec_run("rm /workspace/test.txt", user="workspace")
    assert exec_result.exit_code == 0


def test_non_root_user(container_manager: ContainerManager) -> None:
    container = container_manager.get_container()
    if not container:
        pytest.skip("Container not running")

    exec_result = container.exec_run("whoami", user="workspace")
    assert exec_result.exit_code == 0
    assert "workspace" in exec_result.output.decode("utf-8")

