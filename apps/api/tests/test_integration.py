import pytest
from starlette.testclient import TestClient

from main import app


@pytest.fixture
def test_client():
    return TestClient(app)


def test_websocket_connection(test_client: TestClient) -> None:
    with test_client.websocket_connect("/ws/terminal") as ws:
        ws.send_text("echo 'hello'\n")
        response = ws.receive_text()
        assert "hello" in response.lower() or "workspace" in response.lower()


def test_websocket_multiple_commands(test_client: TestClient) -> None:
    with test_client.websocket_connect("/ws/terminal") as ws:
        ws.send_text("pwd\n")
        response1 = ""
        max_attempts = 10
        for _ in range(max_attempts):
            try:
                chunk = ws.receive_text()
                response1 += chunk
                if "/workspace" in response1:
                    break
            except Exception:
                if response1:
                    break
                raise
        assert "/workspace" in response1 or "workspace" in response1.lower()

        ws.send_text("ls\n")
        response2 = ws.receive_text()
        assert isinstance(response2, str)
