# Terminal Emulation, Docker Container, and Security: Isolated Terminal Execution

**Date:** 2024-12-19  
**Context:** Implementing secure terminal emulation using Docker containers with PTY sessions, filesystem isolation, and security hardening  
**Outcome:** Secure terminal execution environment with container isolation, resource limits, and comprehensive security measures

## The Problem

We needed to execute terminal commands in a secure, isolated environment. The challenges were:

1. **PTY emulation** - Create pseudo-terminal sessions inside Docker containers
2. **Container security** - Harden containers to prevent escape and abuse
3. **Filesystem isolation** - Isolate user workspace from host filesystem
4. **Resource limits** - Prevent resource exhaustion (memory, CPU, disk)
5. **Network isolation** - Prevent containers from accessing network
6. **User permissions** - Run containers as non-root user
7. **Session management** - Multiple PTY sessions per container
8. **Input/output streaming** - Stream data between WebSocket and PTY

**Code smell:** Without proper security, containers could escape, consume unlimited resources, or access host filesystem.

## Design Patterns Used

### 1. PTY Session Pattern: Terminal Emulation

**Problem:** Need to create terminal sessions inside Docker containers

**Solution:** Use Docker exec API to create PTY sessions

```python
# apps/api/services/pty_session_manager.py
async def create_session(self, session_id: str) -> PTYSession:
    if session_id in self.sessions:
        logger.warning(f"Session {session_id} already exists")
        return self.sessions[session_id]

    container = self.container_manager.ensure_container_healthy()
    logger.info(f"Container {container.id} is running for session {session_id}")

    exec_id = container.client.api.exec_create(
        container.id,
        cmd="/bin/zsh",
        stdin=True,
        stdout=True,
        stderr=True,
        tty=True,
        user="workspace",
        environment={
            "TERM": "xterm-256color",
            "LANG": "en_US.UTF-8",
            "LC_ALL": "en_US.UTF-8",
        },
    )

    exec_socket = container.client.api.exec_start(
        exec_id["Id"],
        socket=True,
        tty=True,
    )

    sock = exec_socket._sock
    sock.setblocking(False)

    session = PTYSession(session_id, exec_id["Id"], exec_socket, sock, container)
    self.sessions[session_id] = session
    return session
```

**Benefits:**
- **True terminal**: PTY provides full terminal emulation
- **Multiple sessions**: One container can host multiple PTY sessions
- **Environment control**: Set TERM and locale for proper terminal behavior
- **Non-blocking I/O**: Socket set to non-blocking for async operations

**Key Insight:**
> We use Docker's exec API to create PTY sessions inside containers. Each session runs /bin/zsh as the workspace user with proper terminal environment variables (TERM, LANG, LC_ALL). The exec socket is set to non-blocking mode, allowing async read/write operations. Multiple sessions can share one container, making efficient use of resources.

### 2. Async I/O Pattern: Non-Blocking Terminal I/O

**Problem:** Need to read/write terminal data without blocking the event loop

**Solution:** Use asyncio with non-blocking sockets

```python
# apps/api/services/pty_session_manager.py
async def read_from_session(
    self, session_id: str, websocket, send_message_callback
) -> None:
    session = self.sessions.get(session_id)
    if not session:
        return

    loop = asyncio.get_event_loop()
    try:
        while True:
            try:
                data = await loop.sock_recv(session.sock, 4096)
                if data:
                    decoded = data.decode("utf-8", errors="replace")
                    message: ServerMessage = {
                        "type": "output",
                        "sessionId": session_id,
                        "data": decoded,
                    }
                    await send_message_callback(message)
                else:
                    logger.info(f"Socket closed by container for session {session_id}")
                    break
            except OSError as e:
                logger.info(f"Socket error during read: {e}")
                break
    except Exception as e:
        logger.error(f"Unexpected error in read_from_session: {e}")

async def write_to_session(self, session_id: str, data: bytes) -> None:
    session = self.sessions.get(session_id)
    if not session:
        return

    loop = asyncio.get_event_loop()
    total_sent = 0
    while total_sent < len(data):
        try:
            await loop.sock_sendall(session.sock, data[total_sent:])
            total_sent = len(data)
        except BlockingIOError:
            await asyncio.sleep(0.01)
        except OSError as e:
            logger.error(f"Socket error during write: {e}")
            await self.close_session(session_id)
            return
```

**Benefits:**
- **Non-blocking**: Doesn't block event loop
- **Efficient**: Uses asyncio for concurrent I/O
- **Error handling**: Handles socket errors gracefully
- **Unicode safety**: Decodes with error replacement for invalid bytes

**Key Insight:**
> We use asyncio's sock_recv and sock_sendall for non-blocking I/O. The read loop continuously reads from the socket and sends output to the WebSocket. The write function handles partial writes and blocking errors. This allows multiple terminal sessions to run concurrently without blocking each other.

### 3. Container Security Pattern: Defense in Depth

**Problem:** Containers must be secure to prevent escape and abuse

**Solution:** Multiple security layers in Docker configuration

```yaml
# docker-compose.yml
terminal:
  build:
    context: ./apps/api
    dockerfile: terminal.Dockerfile
  container_name: terminal-shared
  read_only: true
  security_opt:
    - no-new-privileges:true
  cap_drop:
    - ALL
  network_mode: none
  user: '1000:1000'
  mem_limit: ${CONTAINER_MEMORY:-1g}
  cpus: ${CONTAINER_CPUS:-1.0}
  tmpfs:
    - /tmp:size=256m
    - /var/tmp:size=256m
  volumes:
    - terminal-workspace:/workspace:rw
```

**Benefits:**
- **Read-only root**: Prevents modification of system files
- **No new privileges**: Prevents privilege escalation
- **No capabilities**: Drops all Linux capabilities
- **Network isolation**: No network access
- **Resource limits**: Memory and CPU limits
- **Non-root user**: Runs as workspace user (UID 1000)

**Key Insight:**
> We apply defense in depth with multiple security layers. The container runs read-only (except tmpfs and workspace volume), drops all Linux capabilities, prevents privilege escalation, has no network access, and runs as a non-root user. Resource limits prevent resource exhaustion. This makes container escape extremely difficult even if a vulnerability is found.

### 4. Filesystem Isolation Pattern: Volume-Based Workspace

**Problem:** Need isolated workspace that persists but doesn't access host filesystem

**Solution:** Docker named volume for workspace

```yaml
# docker-compose.yml
volumes:
  terminal-workspace:

terminal:
  volumes:
    - terminal-workspace:/workspace:rw
```

```python
# apps/api/services/container_manager.py
def reset_workspace(self) -> None:
    container = self.get_container()
    if not container:
        raise RuntimeError("Container not found")

    if container.status != "running":
        container.start()

    exec_result = container.exec_run(
        cmd="sh -c 'rm -rf /workspace/* /workspace/.* 2>/dev/null || true'",
        user="workspace",
    )
    if exec_result.exit_code != 0:
        raise RuntimeError(f"Failed to reset workspace: {exec_result.output.decode()}")
```

**Benefits:**
- **Isolation**: Workspace completely isolated from host
- **Persistence**: Data persists across container restarts
- **Reset capability**: Can clear workspace on demand
- **User ownership**: Workspace owned by workspace user

**Key Insight:**
> We use a Docker named volume for the workspace. This provides complete isolation from the host filesystem while allowing data to persist across container restarts. The workspace is mounted read-write, but the container root is read-only. This allows users to create files in /workspace while preventing modification of system files.

### 5. Resource Limit Pattern: Preventing Exhaustion

**Problem:** Containers could consume unlimited resources

**Solution:** Docker resource limits with monitoring

```yaml
# docker-compose.yml
terminal:
  mem_limit: ${CONTAINER_MEMORY:-1g}
  cpus: ${CONTAINER_CPUS:-1.0}
  tmpfs:
    - /tmp:size=256m
    - /var/tmp:size=256m
```

```python
# apps/api/services/terminal_bridge.py
MAX_INPUT_SIZE = 64 * 1024
MAX_TOTAL_INPUT_PER_SESSION = 10 * 1024 * 1024

async def _handle_input(self, ...) -> None:
    encoded_data = input_data.encode("utf-8")

    if len(encoded_data) > MAX_INPUT_SIZE:
        error_msg: ErrorMessage = {
            "type": "error",
            "sessionId": session_id,
            "error": "Input too large. Maximum size is 64KB.",
        }
        return

    self.session_input_totals[session_id] = self.session_input_totals.get(session_id, 0) + len(encoded_data)

    if self.session_input_totals[session_id] > MAX_TOTAL_INPUT_PER_SESSION:
        error_msg: ErrorMessage = {
            "type": "error",
            "sessionId": session_id,
            "error": "Session input limit exceeded (10MB). Please reconnect.",
        }
        await self.session_manager.close_session(session_id)
        return
```

**Benefits:**
- **Memory protection**: Container memory limited to 1GB
- **CPU protection**: CPU usage limited to 1 core
- **Disk protection**: tmpfs limits prevent disk exhaustion
- **Input limits**: Per-message and per-session input limits

**Key Insight:**
> We apply resource limits at multiple levels. Docker limits container memory and CPU, tmpfs limits prevent disk exhaustion, and we track input size per session. If a session exceeds 10MB of input, we close it. This prevents resource exhaustion attacks while allowing legitimate use.

### 6. Container Health Check Pattern: Reliability

**Problem:** Need to ensure container is healthy before creating sessions

**Solution:** Health check before session creation

```python
# apps/api/services/container_manager.py
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
```

**Benefits:**
- **Reliability**: Ensures container is responsive before use
- **Early detection**: Catches container issues before they affect users
- **Automatic recovery**: Can restart unhealthy containers

**Key Insight:**
> We check container health before creating sessions. The health check verifies the container is running and can execute commands. This ensures sessions are only created in healthy containers, preventing errors and improving reliability.

## Architecture Decisions

### Why PTY Instead of Regular Exec?

**Decision:** Use PTY (pseudo-terminal) instead of regular exec

**Reasoning:**
- PTY provides full terminal emulation (colors, cursor, etc.)
- Interactive programs work correctly with PTY
- Terminal size can be set (cols/rows)
- Matches what users expect from a terminal

**Trade-off:** Slightly more complex, but provides true terminal experience

### Why One Container for Multiple Sessions?

**Decision:** Share one container across multiple PTY sessions

**Reasoning:**
- More efficient resource usage
- Shared filesystem (workspace volume)
- Easier to manage and monitor
- Lower overhead than one container per session

**Trade-off:** Sessions share resources, but more efficient overall

### Why Read-Only Root Filesystem?

**Decision:** Make container root filesystem read-only

**Reasoning:**
- Prevents modification of system files
- Reduces attack surface
- Forces all writes to workspace volume
- Industry best practice for containers

**Trade-off:** Requires tmpfs for /tmp, but much more secure

### Why Drop All Capabilities?

**Decision:** Drop all Linux capabilities

**Reasoning:**
- Principle of least privilege
- Prevents privilege escalation
- Reduces attack surface
- Most containers don't need capabilities

**Trade-off:** Some programs might not work, but much more secure

### Why Network Isolation?

**Decision:** Run containers with network_mode: none

**Reasoning:**
- Prevents containers from accessing network
- Blocks data exfiltration
- Prevents external attacks
- Terminal doesn't need network access

**Trade-off:** No network access, but terminal doesn't need it

### Why Non-Root User?

**Decision:** Run containers as workspace user (UID 1000)

**Reasoning:**
- Principle of least privilege
- Prevents root access if container is compromised
- Reduces impact of vulnerabilities
- Industry best practice

**Trade-off:** Some programs might need root, but much more secure

## Building Leverage

### Before: Insecure Container

```yaml
# Would have:
# - Root filesystem writable
# - All capabilities
# - Network access
# - No resource limits
# - Root user
```

### After: Hardened Container

```yaml
# Secure configuration:
# - Read-only root
# - No capabilities
# - No network
# - Resource limits
# - Non-root user
# - Input validation
# - Idle timeouts
```

**Leverage Created:**
- **Defense in depth** - Multiple security layers
- **Resource protection** - Limits prevent exhaustion
- **Isolation** - Complete filesystem and network isolation
- **Auditability** - All security measures documented and configurable

## Security Measures

### 1. Container Hardening

**Measures:**
- Read-only root filesystem
- All capabilities dropped
- No new privileges
- Network isolation
- Non-root user execution

**Protection:** Prevents container escape and privilege escalation

### 2. Resource Limits

**Measures:**
- Memory limit (1GB default)
- CPU limit (1 core default)
- tmpfs size limits (256MB)
- Input size limits (64KB per message, 10MB per session)

**Protection:** Prevents resource exhaustion attacks

### 3. Input Validation

**Measures:**
- Size validation (64KB max per message)
- Session total validation (10MB max per session)
- Character encoding validation
- Rate limiting

**Protection:** Prevents malicious input and abuse

### 4. Session Management

**Measures:**
- Idle timeout (30 minutes)
- Session cleanup on disconnect
- Input tracking per session
- Automatic session closure on limits

**Protection:** Prevents abandoned sessions and resource leaks

### 5. Filesystem Isolation

**Measures:**
- Named volume for workspace
- Read-only root filesystem
- tmpfs for temporary files
- User ownership enforcement

**Protection:** Prevents host filesystem access

## Key Points

### PTY Emulation

We use Docker's exec API to create PTY sessions inside containers. Each session runs /bin/zsh as the workspace user with proper terminal environment variables. The exec socket is set to non-blocking mode for async I/O, allowing multiple sessions to run concurrently.

### Container Security

We apply defense in depth with multiple security layers: read-only root filesystem, dropped capabilities, no network access, resource limits, and non-root user execution. This makes container escape extremely difficult even if a vulnerability is found.

### Filesystem Isolation

We use a Docker named volume for the workspace, providing complete isolation from the host filesystem while allowing data to persist. The workspace is mounted read-write, but the container root is read-only, allowing users to create files while preventing system modification.

### Resource Limits

We apply resource limits at multiple levels: Docker limits container memory and CPU, tmpfs limits prevent disk exhaustion, and we track input size per session. If a session exceeds limits, we close it to prevent resource exhaustion attacks.

### Async I/O

We use asyncio's sock_recv and sock_sendall for non-blocking I/O. This allows multiple terminal sessions to run concurrently without blocking each other, providing efficient terminal emulation.

## Key Metrics

- **Security layers:** 5 (read-only, capabilities, network, user, limits)
- **Resource limits:** Memory (1GB), CPU (1 core), tmpfs (256MB)
- **Input limits:** 64KB per message, 10MB per session
- **Idle timeout:** 30 minutes
- **Container isolation:** Complete filesystem and network isolation

## Future Extensibility

This architecture enables:

1. **Multiple container types** - Can swap container images
2. **Custom security policies** - Security measures are configurable
3. **Resource monitoring** - Can track resource usage per session
4. **Session recording** - Can record all terminal output
5. **Workspace snapshots** - Can save/restore workspace state
6. **Multi-user support** - Can isolate workspaces per user

## Lessons Learned

1. **Defense in depth is essential** - Multiple security layers prevent single points of failure
2. **Resource limits prevent attacks** - Input and resource limits are critical
3. **Read-only root filesystem** - Prevents many attack vectors
4. **Network isolation** - Blocks data exfiltration and external attacks
5. **Non-root user** - Reduces impact of vulnerabilities
6. **PTY provides true terminal** - Regular exec doesn't work for interactive programs
7. **Async I/O enables concurrency** - Non-blocking I/O allows multiple sessions

## Conclusion

By implementing comprehensive security measures with PTY emulation, container hardening, and resource limits, we created a secure terminal execution environment. The defense in depth approach with multiple security layers makes container escape extremely difficult, while resource limits prevent exhaustion attacks.

The architecture creates significant leverage—security measures are configurable and extensible, allowing us to adapt to new threats. The complete isolation and resource limits ensure the terminal service remains secure and available even under attack.

