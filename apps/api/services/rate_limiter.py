import logging
import time
import redis
from fastapi import HTTPException, WebSocket, status

from config.settings import settings

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self) -> None:
        try:
            self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {settings.redis_url}")
        except redis.ConnectionError as e:
            logger.error(f"Failed to connect to Redis at {settings.redis_url}: {e}")
            logger.error("Rate limiting will be disabled. Please start Redis.")
            self.redis_client = None

    async def check_connection_limit(self, ip: str) -> None:
        if not self.redis_client:
            logger.warning("Redis not available, skipping connection rate limit check")
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
        except redis.ConnectionError:
            logger.warning("Redis connection lost during rate limit check, allowing connection")

    async def check_command_limit(self, connection_id: str) -> bool:
        if not self.redis_client:
            return True
        
        try:
            key = f"ratelimit:commands:{connection_id}"
            count = self.redis_client.incr(key)
            if count == 1:
                self.redis_client.expire(key, 3600)

            return count <= settings.rate_limit_commands
        except redis.ConnectionError:
            logger.warning("Redis connection lost during command rate limit check, allowing command")
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
        except redis.ConnectionError:
            logger.warning("Redis connection lost during connection tracking")

    def untrack_connection(self, connection_id: str) -> None:
        if not self.redis_client:
            return
        
        try:
            self.redis_client.srem("connections:active", connection_id)
            self.redis_client.delete(f"connection:{connection_id}:metadata")
        except redis.ConnectionError:
            logger.warning("Redis connection lost during connection untracking")

    def get_active_connections_count(self) -> int:
        if not self.redis_client:
            return 0
        
        try:
            return self.redis_client.scard("connections:active")
        except redis.ConnectionError:
            logger.warning("Redis connection lost during connection count")
            return 0

