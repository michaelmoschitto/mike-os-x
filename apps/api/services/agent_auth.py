import hashlib
import hmac
import time
from typing import Final

SIGNATURE_HEADER: Final = "x-terminal-agent-signature"
TIMESTAMP_HEADER: Final = "x-terminal-agent-timestamp"
MAX_CLOCK_SKEW_SECONDS: Final = 60


def build_signature_payload(
    timestamp: str,
    method: str,
    path: str,
    body: bytes = b"",
) -> bytes:
    body_hash = hashlib.sha256(body).hexdigest()
    return f"{timestamp}.{method.upper()}.{path}.{body_hash}".encode()


def sign_request(
    token: str,
    method: str,
    path: str,
    body: bytes = b"",
    timestamp: int | None = None,
) -> tuple[str, str]:
    ts = str(timestamp if timestamp is not None else int(time.time()))
    payload = build_signature_payload(ts, method, path, body)
    signature = hmac.new(
        token.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return ts, signature


def verify_request(
    token: str,
    method: str,
    path: str,
    timestamp: str | None,
    signature: str | None,
    body: bytes = b"",
    now: int | None = None,
) -> bool:
    if not token or not timestamp or not signature:
        return False

    try:
        request_time = int(timestamp)
    except ValueError:
        return False

    current_time = now if now is not None else int(time.time())
    if abs(current_time - request_time) > MAX_CLOCK_SKEW_SECONDS:
        return False

    expected = hmac.new(
        token.encode(),
        build_signature_payload(timestamp, method, path, body),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
