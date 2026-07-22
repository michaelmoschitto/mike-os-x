# Railway Deployment Guide

⚠️ **Important**: See [railway-infrastructure-setup.md](./railway-infrastructure-setup.md) for detailed information about:
- What can/cannot be done with `railway.toml` files
- Railway's infrastructure-as-code limitations
- Step-by-step manual setup instructions
- Config file vs dashboard comparison

## Overview

Deploy the portfolio site with:

- **Domain**: mikemoschitto.com (Cloudflare Registrar) ✅ Purchased
- **Blog**: blog.mikemoschitto.com (GitHub Pages - free) ✅ Deployed
- **Main App**: os.mikemoschitto.com (Railway - React/Vite)
- **API + Redis + Terminal**: Railway (Python FastAPI)

## Phase 1: Domain Purchase & DNS Setup ✅ COMPLETED

### 1.1 Domain Purchase ✅

- ✅ Purchased mikemoschitto.com at Cloudflare Registrar

### 1.2 DNS Records Configuration

In Cloudflare DNS dashboard, add these records:

**For GitHub Pages (blog subdomain):** ✅

- Type: `CNAME`
- Name: `blog`
- Target: `MichaelMoschitto.github.io`
- Proxy: Off (gray cloud) - GitHub Pages requires direct DNS

**For Railway (main app subdomain):**

- Type: `CNAME`
- Name: `os`
- Target: `[railway-generated-domain].up.railway.app` (get from Railway after deployment)
- Proxy: On (orange cloud) - enables Cloudflare CDN + DDoS protection

**For Railway API (optional custom domain):**

- Type: `CNAME`
- Name: `api` (optional, if you want api.mikemoschitto.com)
- Target: `[railway-api-domain].up.railway.app`
- Proxy: On (orange cloud)

## Phase 2: GitHub Pages Blog Setup ✅ COMPLETED

### 2.1 Domain Configuration ✅

- ✅ Updated `blog/CNAME` to `blog.mikemoschitto.com`
- ✅ Updated `blog/_config.yml` URL to `https://blog.mikemoschitto.com`

### 2.2 GitHub Actions Workflow ✅

- ✅ Updated workflow to trigger on push to main (blog/\*\* paths)
- ✅ Updated to latest action versions (configure-pages@v5, upload-pages-artifact@v4, deploy-pages@v4)
- ✅ Enabled bundler cache

### 2.3 GitHub Pages Configuration ✅

- ✅ Custom domain configured: `blog.mikemoschitto.com`
- ✅ HTTPS enforced
- ✅ Blog is live and deploying automatically

## Phase 3: Railway Main App Deployment (React Frontend)

### 3.0 Infrastructure as Code (Config Files)

This project uses Railway's [Config as Code](https://docs.railway.com/guides/config-as-code) feature:

- **`railway.toml`** (root) - Web service configuration
- **`apps/api/railway.toml`** - API service configuration
- **Redis** - Managed service (no config file needed)
- **Terminal Container** - Managed by API service (not a separate Railway service)

These config files define build and deployment settings. When you create services in Railway, you can point them to these config files in the service settings.

### 3.1 Create Railway Project

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your `mike-os-x` repository
5. Railway will detect the Dockerfile in the root

### 3.2 Create Web Service

1. Railway should auto-detect the root `Dockerfile`
2. If not, click "New" → "GitHub Repo" → Select your repo
3. Railway will use the root `Dockerfile` which builds the React app
4. Service will be named something like "mike-os-x" - rename it to "web" for clarity
5. **Configure Config File**: In service Settings → General, set **Config File Path** to `/railway.toml` (or leave empty to auto-detect)

### 3.3 Configure Web Service Settings

- **Root Directory**: Leave as root (`.`)
- **Dockerfile Path**: `Dockerfile` (root level)
- **Port**: Railway will auto-detect port 80 from Dockerfile
- **Build Command**: Handled by Dockerfile (bun install + build)
- **Start Command**: Handled by Dockerfile (nginx)

### 3.3.1 Enable Auto-Deployment

1. In Railway project → **Settings** tab
2. Scroll to **"GitHub"** section
3. Verify **"Auto-Deploy"** is enabled (should be ON by default)
4. Check **"Branch"** is set to `main` (or your default branch)
5. Railway will automatically deploy on every push to the selected branch

**Note**: If auto-deploy is disabled:

- Toggle **"Auto-Deploy"** to ON
- Select the branch (usually `main`)
- Save changes
- Railway will now deploy automatically on push

### 3.4 Set Environment Variables for Web Service

Add these environment variables in Railway service settings:

- `NODE_ENV=production`
- `VITE_API_URL=https://[api-service-name].up.railway.app` (will set after API is deployed)
  - **Note**: Set this after API service is created - use the Railway-generated domain or custom domain
  - **Important**: Must include `https://` protocol

### 3.5 Configure Custom Domain for Web

1. In Railway web service → Settings → Domains
2. Click "Add Domain"
3. Enter: `os.mikemoschitto.com`
4. Railway will provide a DNS target (CNAME record)
5. Add CNAME record in Cloudflare:
   - Type: `CNAME`
   - Name: `os`
   - Target: `[railway-provided-domain].up.railway.app`
   - Proxy: On (orange cloud) - optional, enables CDN
6. Railway will auto-provision SSL certificate

## Phase 4: Railway API Deployment (Python Backend + Terminal Container)

### 4.1 Add Redis Service

1. In Railway project, click "New" → "Database" → "Add Redis"
2. Railway will create a managed Redis instance
3. Note the Redis connection URL (format: `redis://default:[password]@[host]:[port]`)
4. Railway automatically creates a `REDIS_URL` environment variable

### 4.2 Create API Service

1. In Railway project, click "New" → "GitHub Repo" → Select your repo
2. Configure the service:
   - **Root Directory**: `apps/api`
   - **Dockerfile Path**: `Dockerfile` (in apps/api directory)
   - **Port**: Railway will auto-detect port 8000 from Dockerfile
   - **Config File Path**: `/apps/api/railway.toml` (or leave empty to auto-detect)
3. Rename service to "api" for clarity

### 4.3 Configure API Service Settings

- Railway will automatically:
  - Mount Docker socket at `/var/run/docker.sock` (for terminal container management)
  - Provide Docker-in-Docker capability
- **Build Command**: Handled by Dockerfile (uv sync)
- **Start Command**: Handled by Dockerfile (uvicorn)

### 4.3.1 Enable Auto-Deployment for API

1. In Railway API service → **Settings** tab
2. Scroll to **"GitHub"** section
3. Verify **"Auto-Deploy"** is enabled (should be ON by default)
4. Check **"Branch"** is set to `main` (or your default branch)
5. Both web and API services will auto-deploy on push to main

### 4.4 Set Environment Variables for API Service

Add these in Railway API service settings (from `apps/api/config/settings.py`):

**Required:**

- `REDIS_URL`: Use the Redis service's `REDIS_URL` variable (Railway auto-provides this if services are linked)
  - Or manually: `${{Redis.REDIS_URL}}` (Railway template variable)
- `ADMIN_API_KEY`: Generate a secure random key (e.g., `openssl rand -hex 32`)
- `CORS_ORIGINS`: `https://os.mikemoschitto.com` (update after web domain is configured)
- `ENVIRONMENT`: `production`

**Optional (with defaults):**

- `DOCKER_HOST`: `unix:///var/run/docker.sock` (Railway default, usually not needed)
- `TERMINAL_CONTAINER_NAME`: `terminal-shared` (default)
- `TERMINAL_VOLUME_NAME`: `terminal-workspace` (default)
- `RATE_LIMIT_CONNECTIONS`: `5` (default)
- `RATE_LIMIT_COMMANDS`: `100` (default)
- `CONTAINER_MEMORY`: `1g` (default)
- `CONTAINER_CPUS`: `1.0` (default)
- `CONTAINER_DISK`: `5g` (default)

### 4.5 Link Services (Redis to API)

1. In Railway API service → Settings → Variables
2. Add `REDIS_URL` and reference Redis service:
   - Click "Reference Variable"
   - Select Redis service
   - Select `REDIS_URL`
   - This creates: `${{Redis.REDIS_URL}}`

### 4.6 Terminal Container Management

- The API service manages the terminal container via Docker socket
- Railway provides Docker-in-Docker, so the API can create/manage containers
- The terminal container is created dynamically by the API (not a separate Railway service)
- Terminal container uses the same Docker socket that Railway provides

### 4.7 Configure API Domain (Optional)

**Option A: Use Railway-generated domain (simpler)**

- API will be at: `[api-service-name].up.railway.app`
- Update `VITE_API_URL` in web service to this domain
- Update `CORS_ORIGINS` in API service to include web domain

**Option B: Custom subdomain (if desired)**

- In Railway API service → Settings → Domains
- Add custom domain: `api.mikemoschitto.com`
- Add CNAME record in Cloudflare:
  - Type: `CNAME`
  - Name: `api`
  - Target: `[railway-api-domain].up.railway.app`
  - Proxy: On (orange cloud) - optional
- Update `VITE_API_URL` and `CORS_ORIGINS` accordingly

## Phase 5: Connect Frontend to Backend

### 5.1 Update Web Service Environment Variables

After API service is deployed:

1. Get the API service URL from Railway (either Railway-generated or custom domain)
2. In Railway web service → Settings → Variables
3. Update `VITE_API_URL`:
   - If using Railway domain: `https://[api-service-name].up.railway.app`
   - If using custom domain: `https://api.mikemoschitto.com`
   - **Important**: Must include `https://` protocol
4. Redeploy web service (Railway will rebuild with new env var)

### 5.2 Update API CORS Configuration

1. In Railway API service → Settings → Variables
2. Update `CORS_ORIGINS` to include:
   - `https://os.mikemoschitto.com` (web app domain)
   - Add any other origins that need access (comma-separated)
3. Redeploy API service

### 5.3 WebSocket Connection

The WebSocket manager at `apps/web/src/stores/useWebSocketManager.ts` already handles:

- Automatic protocol detection (ws/wss based on page protocol)
- Uses `VITE_API_URL` if set, otherwise falls back to same host
- Production builds will use the `VITE_API_URL` environment variable

**Note**: Since `VITE_API_URL` is a build-time variable, you'll need to rebuild the web service after setting it.

## Phase 6: DNS Configuration & Verification

### 6.1 DNS Records in Cloudflare

Add these CNAME records in Cloudflare DNS dashboard:

**Blog (GitHub Pages):** ✅

- Type: `CNAME`
- Name: `blog`
- Target: `MichaelMoschitto.github.io`
- Proxy: Off (gray cloud) - GitHub Pages requires direct DNS

**Main App (Railway Web):**

- Type: `CNAME`
- Name: `os`
- Target: `[railway-web-domain].up.railway.app` (from Railway)
- Proxy: On (orange cloud) - optional, enables CDN

**API (Railway API - if using custom domain):**

- Type: `CNAME`
- Name: `api` (optional)
- Target: `[railway-api-domain].up.railway.app` (from Railway)
- Proxy: On (orange cloud) - optional

### 6.2 DNS Propagation Check

- Use `dig blog.mikemoschitto.com` or online DNS checker
- Verify all CNAME records resolve correctly
- Wait 5-15 minutes for propagation

### 6.3 SSL Certificate Verification

- GitHub Pages: Automatic (may take a few minutes after DNS)
- Railway: Automatic (usually instant after DNS)
- Verify HTTPS works on all domains

## Phase 7: Testing & Verification

### 7.1 Blog Testing ✅

- ✅ Blog is live at `https://blog.mikemoschitto.com`
- ✅ HTTPS working
- ✅ Auto-deploys on push to main

### 7.2 Main App Testing

- Test main app at `https://os.mikemoschitto.com`
- Verify React app loads correctly
- Check that static assets load (CSS, JS, images)

### 7.3 API Connectivity Testing

- Open browser DevTools → Network tab
- Check for API requests to backend
- Verify no CORS errors
- Test API health endpoint: `https://[api-domain]/health`

### 7.4 WebSocket Terminal Testing

- Navigate to terminal app in React frontend
- Verify WebSocket connection establishes (check DevTools → Network → WS)
- Test terminal commands
- Verify terminal container is created/managed by API

### 7.5 End-to-End Testing

- Test full user flow: open app → use terminal → verify data persistence
- Check Redis connectivity (API should connect to Redis)
- Verify terminal container lifecycle (create, use, cleanup)

## Cost Breakdown

- **Domain (Cloudflare)**: ~$8-10/year ✅ Purchased
- **GitHub Pages**: Free ✅ Blog deployed
- **Cloudflare DNS**: Free ✅ Configured
- **Railway**: Pay-as-you-go (estimated)
  - Web service (React app): ~$5-10/month (minimal usage, static site)
  - API service (Python/FastAPI): ~$5-20/month (depends on usage, Docker-in-Docker)
  - Redis service: ~$5-10/month (Railway managed Redis)
  - **Total Railway estimate**: $15-40/month (scales with usage)
  - Railway offers $5/month credit, so first month may be free/cheap

## Railway Deployment Order

**Recommended deployment sequence:**

1. ✅ Blog deployed to GitHub Pages
2. Create Railway project and add Redis service
3. Deploy API service (needs Redis)
4. Deploy Web service (needs API URL)
5. Configure custom domains
6. Update environment variables with actual domains
7. Test end-to-end

## Important Notes

### Railway-Specific Considerations

- **Config as Code**: Infrastructure is defined in `railway.toml` files (see [Railway Config as Code docs](https://docs.railway.com/guides/config-as-code))
  - Root `railway.toml` defines web service configuration
  - `apps/api/railway.toml` defines API service configuration
  - Config files override dashboard settings
- **Docker-in-Docker**: Railway provides Docker socket access, allowing API to manage terminal containers
- **Service Linking**: Use Railway's variable references (`${{Service.VARIABLE}}`) to link services
- **Build Context**: Web service uses root directory, API service uses `apps/api` directory
- **Port Configuration**: Railway auto-detects ports from Dockerfile EXPOSE directives
- **SSL Certificates**: Railway automatically provisions SSL via Let's Encrypt

### Domain Strategy

- **Blog**: `blog.mikemoschitto.com` (GitHub Pages) ✅
- **Main App**: `os.mikemoschitto.com` (Railway Web service)
- **API**: Either Railway-generated domain OR `api.mikemoschitto.com` (optional custom domain)

### Environment Variables

- **VITE_API_URL**: Must be set at build time (Railway rebuilds on env var changes)
- **CORS_ORIGINS**: Must include the web app domain (comma-separated if multiple)
- **ADMIN_API_KEY**: Required in production (API will fail to start without it)

### Cloudflare Proxy

- **Blog**: Proxy OFF (gray cloud) - GitHub Pages requirement
- **Web/API**: Proxy ON (orange cloud) - Optional, enables CDN + DDoS protection
  - May add slight latency but provides caching and protection
  - Can toggle off if needed for WebSocket connections

### Terminal Container Architecture

- Terminal container is **not** a separate Railway service
- API service creates/manages terminal containers via Docker socket
- Containers are ephemeral and managed by the API's container manager
- Redis stores session state, not container state

## Files Reference

- **Web Dockerfile**: Root `Dockerfile` - builds React app with Bun, serves with nginx
- **API Dockerfile**: `apps/api/Dockerfile` - Python FastAPI with uv
- **Railway Config Files**:
  - `railway.toml` (root) - Web service build/deploy configuration
  - `apps/api/railway.toml` - API service build/deploy configuration
- **API Settings**: `apps/api/config/settings.py` - all environment variables documented
- **WebSocket Manager**: `apps/web/src/stores/useWebSocketManager.ts` - handles API connection
- **Nginx Config**: `nginx.conf` - SPA routing and static asset caching
