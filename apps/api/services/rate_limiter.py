import logging
import time
from collections import defaultdict, deque
from urllib.parse import urlsplit

import redis
from fastapi import HTTPException, status

from config.settings import settings

logger = logging.getLogger(__name__)

MAX_LOCAL_BUCKETS = 10_000


class RateLimiter:
    def __init__(self) -> None:
        self.local_events: dict[str, deque[float]] = defaultdict(deque)
        self.last_local_cleanup = time.monotonic()
        redis_host = urlsplit(settings.redis_url).hostname or "configured host"

        try:
            self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {redis_host}")
        except redis.RedisError as e:
            logger.error(f"Failed to connect to Redis at {redis_host}: {e}")
            logger.warning("Redis unavailable; using in-process rate limits")
            self.redis_client = None

    def _check_local_limit(self, key: str, limit: int) -> bool:
        now = time.monotonic()
        window_start = now - 60

        if now - self.last_local_cleanup >= 60:
            for existing_key, existing_events in list(self.local_events.items()):
                while existing_events and existing_events[0] <= window_start:
                    existing_events.popleft()
                if not existing_events:
                    del self.local_events[existing_key]
            self.last_local_cleanup = now

        if key not in self.local_events and len(self.local_events) >= MAX_LOCAL_BUCKETS:
            logger.warning("Local rate-limit bucket capacity reached")
            return False

        events = self.local_events[key]

        while events and events[0] <= window_start:
            events.popleft()

        if len(events) >= limit:
            return False

        events.append(now)
        return True

    async def check_connection_limit(self, ip: str) -> None:
        if not self._check_local_limit(
            f"connections:{ip}", settings.rate_limit_connections
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many connections. Please try again later.",
            )

        if not self.redis_client:
            return

        try:
            key = f"ratelimit:connections:{ip}"
            count = self.redis_client.incr(key)
            if count == 1:
                self.redis_client.expire(key, 60)

            if count > settings.rate_limit_connections:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many connections. Please try again later.",
                )
        except redis.RedisError:
            logger.warning("Redis connection lost; enforcing in-process connection limit")

    async def check_command_limit(self, ip: str) -> bool:
        if not self._check_local_limit(
            f"commands:{ip}", settings.rate_limit_commands
        ):
            return False

        if not self.redis_client:
            return True

        try:
            key = f"ratelimit:commands:{ip}"
            count = self.redis_client.incr(key)
            if count == 1:
                self.redis_client.expire(key, 60)

            return count <= settings.rate_limit_commands
        except redis.RedisError:
            logger.warning("Redis connection lost; enforcing in-process command limit")
            return True

    def track_connection(self, connection_id: str, ip: str, user_agent: str) -> None:
        if not self.redis_client:
            return

        try:
            self.redis_client.sadd("connections:active", connection_id)
            self.redis_client.hset(
                f"connection:{connection_id}:metadata",
                mapping={
                    "ip": ip,
                    "user_agent": user_agent,
                    "connected_at": str(int(time.time())),
                },
            )
        except redis.RedisError:
            logger.warning("Redis connection lost during connection tracking")

    def untrack_connection(self, connection_id: str) -> None:
        if not self.redis_client:
            return

        try:
            self.redis_client.srem("connections:active", connection_id)
            self.redis_client.delete(f"connection:{connection_id}:metadata")
        except redis.RedisError:
            logger.warning("Redis connection lost during connection untracking")

    def get_active_connections_count(self) -> int:
        if not self.redis_client:
            return 0

        try:
            return self.redis_client.scard("connections:active")
        except redis.RedisError:
            logger.warning("Redis connection lost during connection count")
            return 0
