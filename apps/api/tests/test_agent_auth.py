import time

from services.agent_auth import sign_request, verify_request


def test_sign_and_verify_round_trip() -> None:
    token = "a" * 32
    timestamp, signature = sign_request(token, "GET", "/v1/status")
    assert verify_request(
        token=token,
        method="GET",
        path="/v1/status",
        timestamp=timestamp,
        signature=signature,
    )


def test_verify_rejects_wrong_token() -> None:
    token = "a" * 32
    timestamp, signature = sign_request(token, "POST", "/v1/admin/reset")
    assert not verify_request(
        token="b" * 32,
        method="POST",
        path="/v1/admin/reset",
        timestamp=timestamp,
        signature=signature,
    )


def test_verify_rejects_stale_timestamp() -> None:
    token = "a" * 32
    stale = int(time.time()) - 120
    timestamp, signature = sign_request(
        token, "GET", "/v1/status", timestamp=stale
    )
    assert not verify_request(
        token=token,
        method="GET",
        path="/v1/status",
        timestamp=timestamp,
        signature=signature,
    )


def test_verify_rejects_path_mismatch() -> None:
    token = "a" * 32
    timestamp, signature = sign_request(token, "GET", "/v1/status")
    assert not verify_request(
        token=token,
        method="GET",
        path="/v1/admin/logs",
        timestamp=timestamp,
        signature=signature,
    )
