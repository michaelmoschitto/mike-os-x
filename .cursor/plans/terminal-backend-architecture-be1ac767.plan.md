<!-- be1ac767-c8fc-44a9-a2f4-25c867be3354 734aa8ba-c54f-401a-9362-c07afac01046 -->
# Secure Collaborative Terminal Backend

## Architecture Analysis

### Strengths

- **Simplicity**: Single shared container eliminates complex session management
- **Collaboration**: Multiple users can see each other's work in real-time (Replit-style)
- **Security**: Complete isolation via Docker - users can't reach host or backend
- **Persistence**: Files survive container restarts and user sessions
- **Admin Control**: Easy to reset/restart entire environment

### Security Model

- **Container Isolation**: Terminal container has zero access to host, backend, or network
- **Resource Limits**: CPU/memory caps prevent resource exhaustion
- **Filesystem Isolation**: Read-only system files + writable workspace only
- **Capability Dropping**: Even with root, can't do privileged operations
- **Network Isolation**: No internet access eliminates external attack vectors
- **Backend Separation**: Backend runs in separate container with Docker socket access only

### Potential Challenges & Solutions

1. **Challenge**: Users could fill disk with large files

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **Solution**: 5GB volume limit + monitor disk usage + admin reset capability

2. **Challenge**: Users could crash container with fork bombs or resource abuse

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **Solution**: Resource limits (CPU/memory) + auto-restart on crash

3. **Challenge**: Malicious users could delete others' files

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **Solution**: This is by design (collaborative), but admin can reset anytime

4. **Challenge**: Poor UX if container is just empty Ubuntu

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - **Solution**: Pre-install common tools, languages, and proper shell configuration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│                    WebSocket: /ws/terminal                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ WebSocket over HTTPS
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Backend (FastAPI Container)                     │
│  - WebSocket handler                                         │
│  - Admin API (auth required)                                │
│  - Rate limiting (Redis)                                     │
│  - Container health monitoring                               │
│  - Docker socket access                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Docker API
                      │
┌─────────────────────▼───────────────────────────────────────┐
│           Terminal Container (Ubuntu 22.04)                  │
│  - Shared by all users                                       │
│  - Persistent /workspace volume                              │
│  - Pre-installed tools (git, vim, node, python, etc.)       │
│  - Proper shell (bash with nice PS1)                        │
│  - NO network access                                         │
│  - NO host filesystem access                                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Redis Container                           │
│  - Rate limiting state                                       │
│  - Connection tracking                                       │
│  - Admin API key storage (optional)                          │
└──────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend Terminal Window

**Component**: `apps/web/src/components/apps/Terminal/TerminalWindow.tsx`

**Features**:

- `xterm.js` for terminal emulation (industry standard)
- `xterm-addon-fit` for responsive sizing
- `xterm-addon-web-links` for clickable links (if we add network later)
- WebSocket connection to `/ws/terminal`
- Handle terminal resize on window resize
- Send keystrokes to backend
- Receive and render output
- Connection status indicator
- Aqua-styled terminal (pinstripe background, Aqua chrome)

**User Experience**:

- Opens like any other app window
- Looks authentic (Aqua styling)
- Terminal prompt shows current directory
- Supports colors, ANSI codes
- Smooth typing with no lag (low-latency WebSocket)

### 2. Backend API (FastAPI)

**Project Setup** (`apps/api/`):

```
apps/api/
├── pyproject.toml              # UV project config
├── uv.lock                     # UV lock file
├── .python-version             # Python version (3.11+)
├── main.py                     # FastAPI app, routes
├── services/
│   ├── container_manager.py   # Terminal container lifecycle
│   ├── terminal_bridge.py     # WebSocket ↔ Docker exec bridge
│   └── rate_limiter.py        # Redis-based rate limiting
├── middleware/
│   ├── auth.py                # Admin API authentication
│   └── cors.py                # CORS configuration
├── models/
│   └── responses.py           # Pydantic response models
├── config/
│   └── settings.py            # Environment variables, config
├── tests/
│   ├── test_api.py            # API endpoint tests
│   ├── test_security.py       # Container security tests
│   └── test_integration.py    # End-to-end tests
├── Dockerfile                 # Backend container image
├── requirements.txt           # Generated by uv
└── README.md                  # Setup instructions
```

**Dependencies** (via UV):

- `fastapi[standard]` - Web framework with WebSocket support
- `docker` - Docker Python SDK
- `redis` - Redis client for rate limiting
- `pydantic` - Data validation
- `pydantic-settings` - Settings management
- `pytest` - Testing
- `pytest-asyncio` - Async tests
- `httpx` - HTTP client for tests
- `mypy` - Type checking
- `ruff` - Linting (included with `uv format`)

**Environment Variables** (`apps/api/.env`):

```bash
# Docker
DOCKER_HOST=unix:///var/run/docker.sock
TERMINAL_CONTAINER_NAME=terminal-shared
TERMINAL_VOLUME_NAME=terminal-workspace

# Redis
REDIS_URL=redis://redis:6379/0

# Security
ADMIN_API_KEY=<strong-random-key>
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_CONNECTIONS=10      # connections per IP per minute
RATE_LIMIT_COMMANDS=1000       # commands per connection per hour

# Container Resources
CONTAINER_MEMORY=1g
CONTAINER_CPUS=1.0
CONTAINER_DISK=5g
```

**API Endpoints**:

**Public**:

- `WS /ws/terminal` - WebSocket for terminal I/O
- `GET /health` - Health check
- `GET /api/terminal/status` - Container status (running/stopped)

**Admin** (requires `X-Admin-Key` header):

- `POST /api/admin/terminal/reset` - Wipe filesystem and recreate container
- `POST /api/admin/terminal/restart` - Restart container (keep files)
- `GET /api/admin/terminal/stats` - Resource usage stats
- `GET /api/admin/terminal/logs` - Container logs (last 100 lines)

### 3. Terminal Container Configuration

**Custom Dockerfile** (`apps/api/terminal.Dockerfile`):

```dockerfile
FROM ubuntu:22.04

# Install common tools and languages
RUN apt-get update && apt-get install -y \
    bash \
    zsh \
    git \
    vim \
    nano \
    curl \
    wget \
    htop \
    tree \
    jq \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash -u 1000 workspace

# Setup workspace directory
RUN mkdir -p /workspace && chown workspace:workspace /workspace
WORKDIR /workspace

# Create nice bash prompt
RUN echo 'export PS1="\[\033[01;32m\]\u@terminal\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /home/workspace/.bashrc

# Default command (keeps container running)
CMD ["tail", "-f", "/dev/null"]
```

**Container Creation** (from backend):

```python
docker.containers.run(
    "terminal-ubuntu:latest",
    name="terminal-shared",
    detach=True,
    auto_remove=False,
    restart_policy={"Name": "unless-stopped"},
    
    # Security constraints
    read_only=True,
    security_opt=["no-new-privileges:true"],
    cap_drop=["ALL"],
    network_mode="none",
    user="1000:1000",
    
    # Resources
    mem_limit="1g",
    cpu_quota=100000,  # 1.0 CPU
    
    # Filesystem
    tmpfs={
        "/tmp": "size=256m",
        "/var/tmp": "size=256m",
    },
    volumes={
        "terminal-workspace": {
            "bind": "/workspace",
            "mode": "rw"
        }
    },
)
```

**Why This Works**:

- `--read-only`: System files can't be modified, but `/workspace` volume is writable
- `--cap-drop=ALL`: Even if someone gets root, they can't do privileged operations
- `--network none`: No internet = can't download malware or attack external systems
- `--user 1000:1000`: Non-root user by default
- Resource limits: Prevent DoS attacks
- Pre-installed tools: Great UX out of the box

### 4. Redis Integration

**Purpose**:

- Rate limiting state (track connections per IP)
- Connection metadata (active connections, last activity)
- Admin operations log (who reset/restarted when)

**Schema**:

```
# Rate limiting
ratelimit:connections:{ip} → count (expires in 60s)
ratelimit:commands:{connection_id} → count (expires in 1h)

# Active connections
connections:active → set of connection IDs
connection:{id}:metadata → {ip, user_agent, connected_at}

# Admin log
admin:log → list of admin operations with timestamps
```

### 5. WebSocket Bridge

**Flow**:

1. User connects to `/ws/terminal`
2. Backend checks rate limit (Redis)
3. Backend ensures terminal container is running
4. Backend creates new exec session: `docker exec -it terminal-shared /bin/bash`
5. Backend bridges WebSocket ↔ exec stream (bidirectional)
6. User types → WebSocket → Backend → Container stdin
7. Container stdout/stderr → Backend → WebSocket → User
8. Handle terminal resize (send SIGWINCH to container)
9. On disconnect: Close exec session, keep container running

**Key Implementation** (`services/terminal_bridge.py`):

```python
async def handle_terminal_websocket(websocket: WebSocket, container):
    # Create exec session with PTY
    exec_id = container.client.api.exec_create(
        container.id,
        cmd="/bin/bash",
        stdin=True,
        stdout=True,
        stderr=True,
        tty=True,
        user="workspace"
    )
    
    exec_socket = container.client.api.exec_start(
        exec_id,
        socket=True,
        tty=True
    )
    
    # Bridge WebSocket ↔ exec socket
    # (bidirectional async streaming)
```

### 6. Development Setup

**Monorepo Structure**:

```
/
├── apps/
│   ├── web/          # Frontend (existing)
│   └── api/          # Backend (new)
├── docker-compose.yml
├── docker-compose.dev.yml
├── package.json      # Root scripts
└── README.md
```

**Updated `package.json`** (root):

```json
{
  "scripts": {
    "dev": "docker-compose -f docker-compose.dev.yml up",
    "dev:web": "bun --cwd apps/web dev",
    "dev:api": "cd apps/api && uv run fastapi dev main.py",
    "build": "bun run build:web",
    "build:web": "bun --cwd apps/web build",
    "build:api": "cd apps/api && docker build -t api:latest .",
    "test:api": "cd apps/api && uv run pytest",
    "format:api": "cd apps/api && uv format",
    "type-check:api": "cd apps/api && uv run mypy ."
  }
}
```

**Docker Compose Dev** (`docker-compose.dev.yml`):

```yaml
version: '3.8'

services:
  # Frontend (Vite dev server)
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
    ports:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - "3000:3000"
    volumes:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - ./apps/web:/app
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - /app/node_modules
    environment:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - VITE_API_URL=http://localhost:8000
    command: bun run dev

  # Backend (FastAPI)
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - "8000:8000"
    volumes:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - ./apps/api:/app
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - /var/run/docker.sock:/var/run/docker.sock  # Docker socket access
    environment:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - DOCKER_HOST=unix:///var/run/docker.sock
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - REDIS_URL=redis://redis:6379/0
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - ADMIN_API_KEY=dev-admin-key-123
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - CORS_ORIGINS=http://localhost:3000
    depends_on:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - redis
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  # Redis
  redis:
    image: redis:7-alpine
    ports:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - "6379:6379"
    volumes:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         - redis-data:/data

  # Terminal container (managed by API, but defined here for docker-compose)
  # This will be created dynamically by the backend
  # Including here just for reference/documentation

volumes:
  redis-data:
  terminal-workspace:  # Persistent terminal filesystem
```

**Python Setup** (`apps/api/`):

```bash
# Initialize UV project
cd apps/api
uv init
uv venv

# Install dependencies
uv add fastapi[standard] docker redis pydantic pydantic-settings
uv add --dev pytest pytest-asyncio httpx mypy ruff

# Setup mypy
cat > mypy.ini << EOF
[mypy]
python_version = 3.11
strict = True
warn_return_any = True
warn_unused_configs = True
EOF
```

**Backend Dockerfile** (`apps/api/Dockerfile`):

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy project files
COPY pyproject.toml uv.lock ./
COPY . .

# Install dependencies
RUN uv sync --frozen

# Expose port
EXPOSE 8000

# Run with UV
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 7. Testing Strategy

**Container Security Tests** (`tests/test_security.py`):

```python
def test_container_has_no_network():
    # Try to curl google.com, should fail
    
def test_container_cannot_access_host():
    # Try to read /etc/hosts from host, should fail
    
def test_container_read_only_root():
    # Try to write to /bin/bash, should fail
    
def test_container_workspace_writable():
    # Create file in /workspace, should succeed
    
def test_resource_limits_enforced():
    # Try to allocate 2GB memory (limit is 1GB), should fail
    
def test_no_privileged_operations():
    # Try to mount filesystem, should fail
```

**API Tests** (`tests/test_api.py`):

```python
async def test_websocket_connection():
    # Connect to /ws/terminal, send command, verify output
    
async def test_rate_limiting():
    # Make 11 connections in 1 minute, 11th should be rejected
    
async def test_admin_reset_requires_auth():
    # Call /api/admin/terminal/reset without key, should 401
    
async def test_admin_reset_wipes_files():
    # Create file, reset, verify file is gone
```

**Integration Tests** (`tests/test_integration.py`):

```python
async def test_full_terminal_session():
    # Connect, run 'ls', 'mkdir test', 'cd test', 'pwd'
    # Verify all commands work
    
async def test_multiple_concurrent_users():
    # Open 5 WebSocket connections
    # Each runs different command
    # Verify all work simultaneously
```

### 8. User Experience Features

**Pre-installed Tools** (in terminal container):

- **Shell**: bash (with nice colored prompt)
- **Editors**: vim, nano
- **Version Control**: git
- **Languages**: Python 3, Node.js, npm
- **Utilities**: curl, wget, jq, tree, htop
- **Build Tools**: make, gcc (optional, adds size)

**Terminal Features** (xterm.js):

- Full ANSI color support
- Cursor positioning
- Terminal resize
- Copy/paste (Ctrl+C/Ctrl+V in terminal)
- Scrollback history
- Text selection

**UX Enhancements**:

- Welcome message on first connection
- Show "Other users connected: N" (track via Redis)
- Connection status indicator (green dot = connected)
- Auto-reconnect on disconnect
- Terminal persists when window is closed (can reopen later)

### 9. Security Hardening

**Defense in Depth**:

1. **Container Isolation**: No network, read-only root, dropped capabilities
2. **Resource Limits**: CPU/memory caps prevent DoS
3. **Rate Limiting**: Prevent abuse via Redis-tracked limits
4. **Admin Auth**: Strong API key for admin endpoints
5. **CORS**: Only allow frontend domain
6. **WSS**: WebSocket over HTTPS in production
7. **No Docker Socket Exposure**: Only backend has access, never frontend
8. **Minimal Attack Surface**: Terminal container has minimal services running

**Monitoring**:

- Log all admin operations
- Log rate limit violations
- Alert on container crashes
- Monitor disk usage (warn at 80%, auto-reset at 95%)

### 10. Production Deployment (Railway)

**Services**:

1. **Frontend**: Existing Nginx container (no changes)
2. **Backend**: FastAPI container with Docker socket access
3. **Redis**: Railway Redis addon or container
4. **Terminal Container**: Managed by backend (not a Railway service)

**Railway Configuration**:

- Backend needs Docker-in-Docker or socket mount
- Set all environment variables
- Enable

### To-dos

- [ ] Initialize Python backend project in apps/api/ using UV (uv init, uv venv, install deps)
- [ ] Create FastAPI app in main.py with health endpoint, CORS middleware, and settings management
- [ ] Setup Redis connection and basic rate limiting service using redis-py
- [ ] Create terminal.Dockerfile with Ubuntu 22.04, pre-installed tools (git, vim, node, python), and non-root user setup
- [ ] Implement container_manager.py service to create/ensure terminal container with all security constraints (read-only root, no network, dropped caps, resource limits)
- [ ] Implement terminal_bridge.py to create WebSocket bridge between client and Docker exec session (bidirectional streaming, PTY support)
- [ ] Create WebSocket endpoint /ws/terminal that uses terminal_bridge to connect users to shared container
- [ ] Implement Redis-based rate limiting middleware (connections per IP, commands per connection)
- [ ] Implement admin endpoints (reset, restart, stats, logs) with API key authentication
- [ ] Create production Dockerfile for FastAPI backend with UV and all dependencies
- [ ] Create docker-compose.dev.yml with web, api, redis, and volume configuration for local development
- [ ] Add dev, build, test, and format scripts for API to root package.json
- [ ] Write comprehensive tests (security tests, API tests, integration tests) using pytest
- [ ] Install xterm.js and addons (fit, web-links) in frontend package.json
- [ ] Create TerminalWindow component in apps/web/src/components/apps/Terminal/ with xterm.js integration and Aqua styling
- [ ] Implement WebSocket client in TerminalWindow to connect to backend /ws/terminal and handle terminal I/O
- [ ] Add 'terminal' type to Window interface, update Desktop.tsx to render TerminalWindow, add terminal icon to Dock
- [ ] Test complete flow locally: 1) Build terminal image: docker build -f apps/api/terminal.Dockerfile -t terminal-ubuntu:latest apps/api 2) Start services: docker-compose -f docker-compose.dev.yml up 3) Open terminal in browser, run commands, verify collaboration
- [ ] Configure Railway deployment: 1) Add Railway config files 2) Set environment variables 3) Configure Docker socket access 4) Add Redis addon 5) Deploy and test