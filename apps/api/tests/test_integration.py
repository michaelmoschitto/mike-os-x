import json

import pytest
from starlette.testclient import TestClient

from main import app


@pytest.fixture
def test_client():
    return TestClient(app)


def test_websocket_connection(test_client: TestClient) -> None:
    with test_client.websocket_connect("/ws/terminal") as ws:
        session_id = "test-session-1"

        create_session_msg = json.dumps(
            {
                "type": "create_session",
                "sessionId": session_id,
            }
        )
        ws.send_text(create_session_msg)

        session_created = ws.receive_text()
        session_created_data = json.loads(session_created)
        assert session_created_data["type"] == "session_created"
        assert session_created_data["sessionId"] == session_id

        input_msg = json.dumps(
            {
                "type": "input",
                "sessionId": session_id,
                "data": "echo 'hello'\n",
            }
        )
        ws.send_text(input_msg)

        max_attempts = 10
        response = ""
        for _ in range(max_attempts):
            try:
                chunk = ws.receive_text()
                chunk_data = json.loads(chunk)
                if chunk_data.get("type") == "output" and chunk_data.get("sessionId") == session_id:
                    response += chunk_data.get("data", "")
                    if "hello" in response.lower():
                        break
            except json.JSONDecodeError:
                continue
            except Exception:
                if response:
                    break
                raise

        assert "hello" in response.lower() or "workspace" in response.lower()


def test_websocket_multiple_commands(test_client: TestClient) -> None:
    with test_client.websocket_connect("/ws/terminal") as ws:
        session_id = "test-session-2"

        create_session_msg = json.dumps(
            {
                "type": "create_session",
                "sessionId": session_id,
            }
        )
        ws.send_text(create_session_msg)

        session_created = ws.receive_text()
        session_created_data = json.loads(session_created)
        assert session_created_data["type"] == "session_created"

        pwd_msg = json.dumps(
            {
                "type": "input",
                "sessionId": session_id,
                "data": "pwd\n",
            }
        )
        ws.send_text(pwd_msg)

        response1 = ""
        max_attempts = 10
        for _ in range(max_attempts):
            try:
                chunk = ws.receive_text()
                chunk_data = json.loads(chunk)
                if chunk_data.get("type") == "output" and chunk_data.get("sessionId") == session_id:
                    response1 += chunk_data.get("data", "")
                    if "/workspace" in response1:
                        break
            except json.JSONDecodeError:
                continue
            except Exception:
                if response1:
                    break
                raise

        assert "/workspace" in response1 or "workspace" in response1.lower()

        ls_msg = json.dumps(
            {
                "type": "input",
                "sessionId": session_id,
                "data": "ls\n",
            }
        )
        ws.send_text(ls_msg)

        response2 = ""
        max_attempts = 10
        for _ in range(max_attempts):
            try:
                chunk = ws.receive_text()
                chunk_data = json.loads(chunk)
                if chunk_data.get("type") == "output" and chunk_data.get("sessionId") == session_id:
                    response2 += chunk_data.get("data", "")
                    if response2:
                        break
            except json.JSONDecodeError:
                continue
            except Exception:
                if response2:
                    break
                raise

        assert isinstance(response2, str)
        assert len(response2) > 0
