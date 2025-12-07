# mike-os-x

Mikes portfolio site (themed after OS X 2000, of course)

## Project Structure

- `/apps/web` - Mac OS X themed portfolio (React + Vite)
- `/apps/api` - Python backend
- `/blog` - Jekyll blog
- `/docs` - Documentation and learning notes
- `/iac` - Pulumi IAC

## Deployment

This project uses a hybrid architecture:

- **Railway**: Web frontend, API backend, Redis (auto-deploys on push)
- **AWS EC2**: Terminal container (Docker-in-Docker, deploys on GitHub release)
