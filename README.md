# mike-os-x

Mikes portfolio site (themed after OS X 2000, of course)

## Project Structure

- `/apps/web` - Mac OS X themed portfolio (React + Vite)
- `/apps/api` - Python backend for terminal emulation
- `/blog` - Jekyll blog
- `/docs` - Documentation and learning notes
- `/iac` - Pulumi infrastructure-as-code for AWS EC2

## Deployment

This project uses a hybrid architecture:

- **Railway**: Web frontend, API backend, Redis (auto-deploys on push)
- **AWS EC2**: Terminal container (Docker-in-Docker, deploys on GitHub release)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full setup guide.

### Quick Start

1. **Set GitHub Secrets:**
   - `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
   - `PULUMI_PASSPHRASE` (passphrase for Pulumi secrets)
   - `EC2_SSH_KEY` (your private SSH key)
   - `EC2_SSH_PUBLIC_KEY` (your public SSH key, or provide in workflow input)
   - `PULUMI_STACK` (optional, defaults to "default")

2. **Deploy infrastructure:**
   - **Automatic**: Push changes to `main` that affect `iac/**` (workflow runs automatically)
   - **Manual**: Go to Actions → "Deploy Infrastructure" → Run workflow
   - Workflow creates EC2 instance and outputs the IP address

3. **Generate TLS certificates (manual):**
   - Get EC2 IP from workflow summary
   - Run: `./scripts/generate-docker-tls.sh <EC2_IP>`
   - Upload server certs to EC2 and configure Docker TLS (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))
   - Upload client certs to Railway API service volume at `/app/certs`

4. **Configure Railway:**
   - Add Web, API, and Redis services
   - Set environment variables (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))

5. **Deploy terminal container:**
   - **Automatic**: Create a GitHub release (auto-deploys terminal container)
   - **Manual**: Go to Actions → "Deploy Terminal Container" → Run workflow

## Local Development

```bash
# Start all services locally
bun run dev

# View logs
bun run logs

# Stop services
bun run down
```
