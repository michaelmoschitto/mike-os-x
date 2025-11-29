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
   - `EC2_SSH_KEY` (your private SSH key)
   - `EC2_SSH_PUBLIC_KEY` (your public SSH key)

2. **Deploy everything:**
   - **Automatic**: Push changes to `main` (workflow runs automatically)
   - **Manual**: Go to Actions → "Deploy Infrastructure and Terminal" → Run workflow
   - Workflow handles everything: EC2, TLS, terminal deployment

3. **Download TLS certs:**
   - Download client certificates from workflow artifacts
   - Upload to Railway API service volume at `/app/certs`

4. **Configure Railway:**
   - Add Web, API, and Redis services
   - Set environment variables (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))

5. **Future terminal updates:**
   - Create a GitHub release (auto-deploys terminal container)

## Local Development

```bash
# Start all services locally
bun run dev

# View logs
bun run logs

# Stop services
bun run down
```
