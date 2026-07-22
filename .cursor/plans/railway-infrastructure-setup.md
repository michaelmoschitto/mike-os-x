# Railway Infrastructure Setup Guide

## Understanding Railway's Infrastructure as Code Limitations

Railway's `railway.toml` is **service-level configuration only**. Unlike Terraform/CDK, Railway does not support:
- ❌ Programmatic service creation
- ❌ Database provisioning via config files
- ❌ Service linking via code
- ❌ Project-level infrastructure definition

**Railway does not have a Terraform provider or equivalent IaC tool.**

---

## Your Architecture

```
┌─────────────────────────────────────────────┐
│ Railway Project: mike-os-x                  │
├─────────────────────────────────────────────┤
│                                             │
│  📦 Web Service (React + Nginx)             │
│     └── railway.toml (root)                 │
│                                             │
│  📦 API Service (Python FastAPI)            │
│     └── apps/api/railway.toml               │
│     └── Manages terminal containers via     │
│         Docker socket (runtime, not Railway)│
│                                             │
│  📦 Redis Service (Managed Database)        │
│     └── NO config file - manual dashboard   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## What Can Be Done with `railway.toml` Files

### ✅ Web Service (`railway.toml` at root)
- Build configuration (Dockerfile)
- Deploy commands
- Health checks
- Restart policies

### ✅ API Service (`apps/api/railway.toml`)
- Build configuration (Dockerfile)
- Deploy commands
- Health checks
- Restart policies

### ❌ Redis Service
- **Cannot** be provisioned via config file
- **Cannot** be configured via code
- **Must** be created manually in dashboard

### ❌ Terminal Container
- **Not a Railway service** - it's managed by the API at runtime
- API creates/destroys terminal containers via Docker socket
- No Railway configuration needed

---

## Manual Setup Required in Railway Dashboard

### 1. Create Project
- ✋ **Manual**: Create new Railway project
- ✋ **Manual**: Connect GitHub repository

### 2. Create Web Service
- ✋ **Manual**: Add service → GitHub Repo
- ✋ **Manual**: Set root directory to `.` (root)
- ✅ **Auto**: Railway detects `railway.toml` and `Dockerfile`
- ✋ **Manual**: Set environment variables:
  - `NODE_ENV=production`
  - `VITE_API_URL=https://[api-domain]` (after API is deployed)
- ✋ **Manual**: Add custom domain `os.mikemoschitto.com`

### 3. Create API Service
- ✋ **Manual**: Add service → GitHub Repo
- ✋ **Manual**: Set root directory to `apps/api`
- ✅ **Auto**: Railway detects `apps/api/railway.toml` and `Dockerfile`
- ✋ **Manual**: Set environment variables (see list below)
- ✋ **Manual**: Add custom domain `api.mikemoschitto.com` (optional)

### 4. Create Redis Service
- ✋ **Manual**: Add Database → Redis
- ✅ **Auto**: Railway provisions managed Redis
- ✅ **Auto**: Railway creates `REDIS_URL` environment variable

### 5. Link Services
- ✋ **Manual**: In API service → Variables → Reference `Redis.REDIS_URL`

### 6. Terminal Container
- ✅ **Auto**: API service manages terminal container at runtime
- ✅ **Auto**: No Railway configuration needed
- ⚠️ **Note**: API needs Docker socket access (Railway provides this)

---

## Environment Variables (Manual Setup)

### Web Service Variables
```
NODE_ENV=production
VITE_API_URL=https://[api-service-domain].up.railway.app
```

### API Service Variables (Required)
```
REDIS_URL=${{Redis.REDIS_URL}}  # Reference from Redis service
ADMIN_API_KEY=[generate with: openssl rand -hex 32]
CORS_ORIGINS=https://os.mikemoschitto.com
ENVIRONMENT=production
```

### API Service Variables (Optional - have defaults)
```
DOCKER_HOST=unix:///var/run/docker.sock
TERMINAL_CONTAINER_NAME=terminal-shared
TERMINAL_VOLUME_NAME=terminal-workspace
RATE_LIMIT_CONNECTIONS=5
RATE_LIMIT_COMMANDS=100
CONTAINER_MEMORY=1g
CONTAINER_CPUS=1.0
CONTAINER_DISK=5g
```

---

## Step-by-Step Manual Deployment

### Step 1: Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway and select `mike-os-x` repository

### Step 2: Add Redis Service
1. In project → Click "+ New"
2. Select "Database" → "Add Redis"
3. Railway provisions managed Redis
4. Note the generated `REDIS_URL` variable

### Step 3: Create API Service
1. In project → Click "+ New"
2. Select "GitHub Repo" → Choose `mike-os-x`
3. Configure service:
   - Name: `api`
   - Root Directory: `apps/api`
   - Config File: Railway should auto-detect `railway.toml`
4. Set environment variables (see list above)
5. Link Redis: Add variable `REDIS_URL` → Reference `${{Redis.REDIS_URL}}`
6. Deploy should start automatically

### Step 4: Create Web Service
1. In project → Click "+ New"
2. Select "GitHub Repo" → Choose `mike-os-x`
3. Configure service:
   - Name: `web`
   - Root Directory: `.` (leave empty or set to root)
   - Config File: Railway should auto-detect `railway.toml`
4. Set environment variables:
   - `NODE_ENV=production`
   - `VITE_API_URL=https://[api-domain].up.railway.app` (get from API service)
5. Deploy should start automatically

### Step 5: Configure Custom Domains
1. Web service → Settings → Networking → Add Domain
   - Enter: `os.mikemoschitto.com`
   - Copy CNAME target
   - Add to Cloudflare DNS
2. API service → Settings → Networking → Add Domain (optional)
   - Enter: `api.mikemoschitto.com`
   - Copy CNAME target
   - Add to Cloudflare DNS

### Step 6: Enable Auto-Deploy
1. Each service → Settings → GitHub
2. Verify "Auto-Deploy" is ON
3. Set branch to `main`

---

## What railway.toml Files Provide

Even though you can't provision infrastructure via code, `railway.toml` files still provide value:

### Benefits
✅ Build configuration versioned in git
✅ Deploy settings documented in code
✅ Consistent deployments across environments
✅ Override dashboard settings
✅ Easy to replicate services

### Limitations
❌ Can't create services programmatically
❌ Can't provision databases
❌ Can't set environment variables
❌ Can't configure networking/domains
❌ Project-level config not supported

---

## Alternative: Railway CLI

Railway has a CLI that can help with some automation:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy a service
railway up
```

However, the CLI still requires manual dashboard setup for:
- Database provisioning
- Service linking
- Environment variables
- Custom domains

---

## Summary: Config File vs Manual

| Task | Config File | Manual Dashboard |
|------|-------------|------------------|
| Define Dockerfile | ✅ | ❌ |
| Set build commands | ✅ | ❌ |
| Set start commands | ✅ | ❌ |
| Health checks | ✅ | ❌ |
| Restart policies | ✅ | ❌ |
| Create services | ❌ | ✅ |
| Provision databases | ❌ | ✅ |
| Set env variables | ❌ | ✅ |
| Link services | ❌ | ✅ |
| Configure domains | ❌ | ✅ |
| Enable auto-deploy | ❌ | ✅ |

---

## Recommendation

1. ✅ Use `railway.toml` files for service configuration (we've already created these)
2. ✅ Document manual setup steps (this guide)
3. ✅ Use Railway CLI for deployments (optional)
4. ⚠️ Accept that full IaC like Terraform is not available on Railway
5. 💡 Consider Railway Templates if you need to replicate this setup (but templates are also semi-manual)

If you absolutely need full infrastructure-as-code, consider:
- AWS ECS + Terraform
- Google Cloud Run + Terraform
- Kubernetes + Helm charts
- Pulumi (multi-cloud IaC)

But Railway's tradeoff is: **simpler platform, less IaC control**.

