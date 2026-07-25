# mike-os-x

Mikes portfolio site (themed after OS X 2000)

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

### Terminal connection

The browser connects to `wss://api.os.mikemoschitto.com/ws/terminal`. The Railway
API then connects to the EC2 Docker daemon on port `2376` with mutual TLS. The
API health check depends on that Docker connection, so an unhealthy EC2 instance
can make the WebSocket appear to be a frontend failure.

Production Docker credentials are Railway variables, not local `.env` values:

- `DOCKER_HOST`
- `DOCKER_TLS_VERIFY`
- `DOCKER_CA_CERT`
- `DOCKER_CLIENT_CERT`
- `DOCKER_CLIENT_KEY`

### Recovering the production terminal

1. In AWS EC2, confirm `mike-os-x-terminal-host` is running and all status checks
   pass. If fewer than all checks pass, reboot the instance before rotating
   credentials. Stop/start only if rebooting does not restore instance
   reachability; the terminal Elastic IP must remain associated.
2. Confirm ports `22` and `2376` are reachable through the terminal security
   group.
3. In GitHub Actions, run **Rotate Docker TLS** with `force_rotation` enabled.
   The workflow resolves the current Elastic IP, waits for healthy EC2 status,
   generates a matching certificate, transitions Docker and Railway through a
   dual-CA trust window, and verifies the production API.
4. Verify:

   ```bash
   curl --fail https://api.os.mikemoschitto.com/health
   curl --fail https://api.os.mikemoschitto.com/api/terminal/status
   ```

5. Open the terminal at `https://os.mikemoschitto.com` and confirm that input
   and output work.

The rotation workflow runs monthly and rotates only when the server certificate
is missing, has fewer than 30 days remaining, or does not cover the current
Elastic IP. Manual runs force rotation by default. Normal infrastructure
deployments use the same checks and no longer replace a current CA
unconditionally.

If Docker TLS verification fails during rotation, the workflow restores the
previous server certificate while retaining dual CA trust. EC2 backups are
stored as `/etc/docker/certs-backup-<UTC timestamp>`. If Railway health fails
after its variables are updated, fix EC2 reachability first and rerun the
workflow with forced rotation rather than uploading only one side of the
certificate pair.

For a manual client-certificate upload after generating a complete matching
server/client set:

```bash
./scripts/upload-certs-to-railway.sh \
  /path/to/client-certs \
  tcp://<terminal-elastic-ip>:2376
```
