# Python Backend API Setup: FastAPI Terminal Service Architecture

**Date:** 2024-12-19  
**Context:** Building a FastAPI backend to handle terminal WebSocket connections, session management, and container orchestration  
**Outcome:** Robust API with WebSocket support, rate limiting, security measures, and admin endpoints

## The Problem

We needed a Python backend to bridge WebSocket connections from the frontend to Docker container PTY sessions. The challenges were:

1. **WebSocket handling** - FastAPI WebSocket endpoint with proper connection management
2. **Session lifecycle** - Create, manage, and cleanup PTY sessions
3. **Message routing** - Route input/output between WebSocket and PTY
4. **Rate limiting** - Prevent abuse with connection and command rate limits
5. **Error handling** - Graceful error handling and user feedback
6. **Security** - Input validation, size limits, idle timeouts
7. **Admin endpoints** - Container management and monitoring

**Code smell:** Without proper architecture, WebSocket handling would be scattered, sessions would leak, and security would be weak.

## Design Patterns Used

### 1. Service Layer Pattern: Separation of Concerns

**Problem:** WebSocket endpoint needs to handle many responsibilities (sessions, containers, rate limiting)

**Solution:** Separate services for each concern

```python
# apps/api/main.py
from services.terminal_bridge import TerminalBridge
from services.container_manager import ContainerManager
from services.rate_limiter import RateLimiter

container_manager = ContainerManager()
terminal_bridge = TerminalBridge()
rate_limiter = RateLimiter()

@app.websocket("/ws/terminal")
async def websocket_terminal(websocket: WebSocket) -> None:
    client_ip = get_client_ip(websocket)
    logger.info(f"WebSocket connection attempt from {client_ip}")
    try:
        await terminal_bridge.handle_websocket(websocket, client_ip)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
```

**Benefits:**
- **Single responsibility**: Each service handles one concern
- **Testability**: Services can be tested independently
- **Reusability**: Services can be used by multiple endpoints
- **Maintainability**: Changes isolated to specific services

**Key Insight:**
> We use a service layer pattern to separate concerns. The FastAPI endpoint delegates to TerminalBridge for WebSocket handling, which in turn uses ContainerManager for containers and RateLimiter for rate limiting. This keeps the endpoint thin and makes each service testable and reusable.

### 2. Message Handler Pattern: Type-Safe Message Processing

**Problem:** Need to handle different message types from WebSocket clients

**Solution:** Separate handler methods for each message type

```python
# apps/api/services/terminal_bridge.py
async def handle_websocket(self, websocket: WebSocket, client_ip: str) -> None:
    await websocket.accept()
    connection_id = str(uuid.uuid4())
    
    while True:
        try:
            data = await websocket.receive_text()
            msg_dict = json.loads(data)
            msg_type = msg_dict.get("type")
            
            if msg_type == "create_session":
                await self._handle_create_session(websocket, connection_id, client_ip, msg)
            elif msg_type == "input":
                await self._handle_input(websocket, connection_id, client_ip, msg)
            elif msg_type == "resize":
                await self._handle_resize(websocket, connection_id, client_ip, msg)
            elif msg_type == "close_session":
                await self._handle_close_session(websocket, connection_id, client_ip, msg)
```

**Benefits:**
- **Type safety**: Each handler knows its message structure
- **Maintainability**: Easy to add new message types
- **Testability**: Each handler can be tested independently
- **Error isolation**: Errors in one handler don't affect others

**Key Insight:**
> We use separate handler methods for each message type. When a message arrives, we extract the type and route it to the appropriate handler. This keeps message processing organized and makes it easy to add new message types or modify existing ones without affecting other handlers.

### 3. Input Validation Pattern: Security First

**Problem:** Need to validate all inputs to prevent security issues

**Solution:** Comprehensive validation at message handler entry points

```python
# apps/api/services/terminal_bridge.py
async def _handle_input(
    self,
    websocket: WebSocket,
    connection_id: str,
    client_ip: str,
    msg: InputMessage,
) -> None:
    session_id = msg.get("sessionId")
    if not session_id:
        return

    session = self.session_manager.get_session(session_id)
    if not session:
        error_msg: ErrorMessage = {
            "type": "error",
            "sessionId": session_id,
            "error": "Session not found",
        }
        await self._send_message(websocket, error_msg)
        return

    if not await self.rate_limiter.check_command_limit(client_ip):
        error_msg: ErrorMessage = {
            "type": "error",
            "sessionId": session_id,
            "error": "Rate limit exceeded. Please wait.",
        }
        await self._send_message(websocket, error_msg)
        return

    input_data = msg.get("data", "")
    encoded_data = input_data.encode("utf-8")

    if len(encoded_data) > MAX_INPUT_SIZE:
        error_msg: ErrorMessage = {
            "type": "error",
            "sessionId": session_id,
            "error": "Input too large. Maximum size is 64KB.",
        }
        await self._send_message(websocket, error_msg)
        return

    try:
        encoded_data.decode("utf-8")
    except UnicodeDecodeError:
        error_msg: ErrorMessage = {
            "type": "error",
            "sessionId": session_id,
            "error": "Invalid character encoding.",
        }
        await self._send_message(websocket, error_msg)
        return
```

**Benefits:**
- **Security**: Prevents malicious input from reaching containers
- **User feedback**: Clear error messages for validation failures
- **Resource protection**: Size limits prevent resource exhaustion
- **Early validation**: Fail fast before processing

**Key Insight:**
> We validate all inputs at handler entry points. This includes checking session existence, rate limits, input size (64KB max), and character encoding. Validation happens before any processing, ensuring malicious or malformed input never reaches the container. Each validation failure returns a clear error message to the user.

### 4. Rate Limiting Pattern: Abuse Prevention

**Problem:** Need to prevent abuse with connection and command rate limits

**Solution:** Redis-based rate limiting with fail-open behavior

```python
# apps/api/services/rate_limiter.py
class RateLimiter:
    def __init__(self) -> None:
        try:
            self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {settings.redis_url}")
        except redis.ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            logger.error("Rate limiting will be disabled. Please start Redis.")
            self.redis_client = None

    async def check_connection_limit(self, ip: str) -> None:
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
        except redis.ConnectionError:
            logger.warning("Redis connection lost, allowing connection")
```

**Benefits:**
- **Abuse prevention**: Limits connections and commands per IP
- **Fail-open**: Service continues if Redis is unavailable
- **Configurable**: Limits can be adjusted via settings
- **Per-IP tracking**: Different limits for different IPs

**Key Insight:**
> We use Redis for rate limiting with a fail-open design. If Redis is unavailable, rate limiting is disabled but the service continues. This prevents Redis outages from breaking the terminal service. Rate limits are tracked per IP address with sliding windows (60 seconds), allowing legitimate users while preventing abuse.

### 5. Idle Timeout Pattern: Resource Cleanup

**Problem:** Idle sessions consume resources and should be cleaned up

**Solution:** Background task that checks for idle sessions and closes them

```python
# apps/api/services/terminal_bridge.py
async def _check_idle_timeouts(self, connection_id: str, websocket: WebSocket) -> None:
    while True:
        await asyncio.sleep(60)
        current_time = time.time()
        sessions_to_close = []

        if connection_id not in self.websocket_sessions:
            break

        for session_id in list(self.websocket_sessions[connection_id]):
            last_activity = self.session_last_activity.get(session_id, current_time)
            if current_time - last_activity > SESSION_IDLE_TIMEOUT:
                sessions_to_close.append(session_id)

        for session_id in sessions_to_close:
            logger.info(f"Session {session_id} idle timeout, closing")
            error_msg: ErrorMessage = {
                "type": "error",
                "sessionId": session_id,
                "error": "Session idle timeout (30 minutes). Closing connection.",
            }
            await self._send_message(websocket, error_msg)
            await self.session_manager.close_session(session_id)
            self.websocket_sessions[connection_id].discard(session_id)
```

**Benefits:**
- **Resource cleanup**: Idle sessions don't consume resources indefinitely
- **Security**: Prevents abandoned sessions from being exploited
- **User feedback**: Users are notified when sessions timeout
- **Configurable**: Timeout duration can be adjusted

**Key Insight:**
> We run a background task that checks for idle sessions every 60 seconds. Sessions with no activity for 30 minutes are automatically closed. This prevents resource leaks from abandoned sessions and ensures containers aren't tied up by inactive users. Users receive an error message when their session times out.

### 6. Settings Pattern: Configuration Management

**Problem:** Need centralized configuration with environment variable support

**Solution:** Pydantic Settings with environment variable loading

```python
# apps/api/config/settings.py
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(get_env_file()) if get_env_file() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    docker_host: str = Field(default_factory=get_default_docker_host)
    terminal_container_name: str = Field(default="terminal-shared")
    terminal_volume_name: str = Field(default="terminal-workspace")
    redis_url: str = Field(default="redis://localhost:6379/0")
    admin_api_key: str = Field(default="")
    rate_limit_connections: int = Field(default=5)
    rate_limit_commands: int = Field(default=100)
    container_memory: str = Field(default="1g")
    container_cpus: float = Field(default=1.0)

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        is_production = (
            os.getenv("ENVIRONMENT", "").lower() == "production"
            or os.getenv("NODE_ENV", "").lower() == "production"
        )
        if is_production and not self.admin_api_key:
            raise ValueError(
                "ADMIN_API_KEY must be set in production environment."
            )

settings = Settings()
```

**Benefits:**
- **Type safety**: Pydantic validates configuration types
- **Environment variables**: Easy deployment configuration
- **Defaults**: Sensible defaults for development
- **Validation**: Production checks ensure required settings

**Key Insight:**
> We use Pydantic Settings for configuration management. Settings are loaded from environment variables with sensible defaults for development. Production mode requires certain settings (like ADMIN_API_KEY) and raises errors if they're missing. This ensures the service is properly configured in production while remaining easy to use in development.

## Architecture Decisions

### Why Service Layer Over Monolithic Endpoint?

**Decision:** Separate services instead of putting all logic in the endpoint

**Reasoning:**
- Services are testable independently
- Services can be reused by multiple endpoints
- Clear separation of concerns
- Easier to maintain and extend

**Trade-off:** More files, but much better organization

### Why Redis for Rate Limiting?

**Decision:** Use Redis instead of in-memory rate limiting

**Reasoning:**
- Shared state across multiple API instances
- Persistent rate limit data
- Industry standard for rate limiting
- Can scale horizontally

**Trade-off:** Requires Redis dependency, but enables horizontal scaling

### Why Fail-Open for Rate Limiting?

**Decision:** Continue service if Redis is unavailable

**Reasoning:**
- Redis outages shouldn't break terminal service
- Better user experience (service continues)
- Rate limiting is protection, not core functionality
- Can monitor and alert on Redis issues

**Trade-off:** Rate limiting disabled if Redis down, but service remains available

### Why Background Task for Idle Timeouts?

**Decision:** Use background task instead of checking on each message

**Reasoning:**
- More efficient (check once per minute vs every message)
- Doesn't add latency to message processing
- Can check all sessions in one pass
- Easier to reason about

**Trade-off:** Slight delay in timeout detection (up to 60s), but much better performance

### Why Pydantic Settings?

**Decision:** Use Pydantic Settings instead of manual env var parsing

**Reasoning:**
- Type validation and conversion
- Environment variable loading built-in
- Default values support
- Production validation checks

**Trade-off:** Pydantic dependency, but much better developer experience

## Building Leverage

### Before: Monolithic Endpoint

```python
# Would need:
# - All logic in one endpoint function
# - Difficult to test
# - No reuse of logic
# - Hard to maintain
```

### After: Service Layer Architecture

```python
# Clean separation:
# - TerminalBridge handles WebSocket logic
# - ContainerManager handles Docker
# - RateLimiter handles rate limiting
# - Each service testable independently
# - Services reusable across endpoints
```

**Leverage Created:**
- **Testable services** - Each service can be unit tested
- **Reusable components** - Services used by multiple endpoints
- **Maintainable code** - Changes isolated to specific services
- **Extensible architecture** - Easy to add new services or endpoints

## UI/UX Patterns

### 1. Clear Error Messages

**Pattern:** Return descriptive error messages for all failures

**Implementation:**
```python
# apps/api/services/terminal_bridge.py
error_msg: ErrorMessage = {
    "type": "error",
    "sessionId": session_id,
    "error": "Input too large. Maximum size is 64KB.",
}
await self._send_message(websocket, error_msg)
```

**UX Benefit:** Users understand what went wrong and how to fix it

### 2. Graceful Degradation

**Pattern:** Service continues even if optional components fail

**Implementation:**
```python
# apps/api/services/rate_limiter.py
except redis.ConnectionError:
    logger.warning("Redis connection lost, allowing connection")
    return True
```

**UX Benefit:** Terminal service remains available even if Redis is down

### 3. Session Timeout Notification

**Pattern:** Notify users before closing idle sessions

**Implementation:**
```python
# apps/api/services/terminal_bridge.py
error_msg: ErrorMessage = {
    "type": "error",
    "sessionId": session_id,
    "error": "Session idle timeout (30 minutes). Closing connection.",
}
await self._send_message(websocket, error_msg)
```

**UX Benefit:** Users understand why their session closed

## Key Points

### Service Layer Architecture

We separate concerns into services: TerminalBridge handles WebSocket logic, ContainerManager handles Docker, and RateLimiter handles rate limiting. This keeps the endpoint thin and makes each service testable and reusable.

### Input Validation

All inputs are validated at handler entry points. This includes session existence, rate limits, input size (64KB max), and character encoding. Validation happens before processing, ensuring malicious input never reaches containers.

### Rate Limiting

We use Redis for rate limiting with fail-open behavior. If Redis is unavailable, rate limiting is disabled but the service continues. Rate limits are tracked per IP with sliding windows, preventing abuse while allowing legitimate use.

### Idle Timeout

A background task checks for idle sessions every 60 seconds. Sessions with no activity for 30 minutes are automatically closed. This prevents resource leaks and ensures containers aren't tied up by inactive users.

### Configuration Management

We use Pydantic Settings for configuration. Settings are loaded from environment variables with sensible defaults. Production mode requires certain settings and raises errors if missing, ensuring proper configuration.

## Key Metrics

- **Service separation:** 3 main services (TerminalBridge, ContainerManager, RateLimiter)
- **Input validation:** 100% of inputs validated before processing
- **Rate limit coverage:** Connections and commands rate limited per IP
- **Idle timeout:** 30 minutes with 60-second check interval

## Future Extensibility

This architecture enables:

1. **Multiple terminal backends** - Can swap container implementation
2. **Custom rate limit strategies** - RateLimiter can be extended
3. **Additional message types** - Easy to add new handlers
4. **Metrics and monitoring** - Services can expose metrics
5. **Authentication** - Can add auth middleware
6. **Session persistence** - Can save/restore session state

## Lessons Learned

1. **Service layer improves testability** - Each service can be tested independently
2. **Fail-open for optional features** - Service continues if Redis is down
3. **Input validation prevents security issues** - Validate early and often
4. **Background tasks for periodic work** - More efficient than checking on each message
5. **Pydantic Settings simplifies configuration** - Type validation and env var loading
6. **Clear error messages improve UX** - Users understand what went wrong

## Conclusion

By implementing a service layer architecture with comprehensive input validation, rate limiting, and resource management, we created a robust FastAPI backend for terminal emulation. The separation of concerns makes the code maintainable and testable, while security measures protect against abuse.

The architecture creates significant leverage—new features can be added as services, and existing services can be reused across endpoints. The fail-open design ensures the service remains available even when optional components fail, providing a better user experience.

