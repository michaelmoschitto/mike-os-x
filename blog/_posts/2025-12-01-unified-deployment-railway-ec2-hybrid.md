---
layout: post
title: '2 Platforms: How We Unified Railway and EC2 Deployments'
date: 2025-12-01
author: Michael Moschitto
tags: Infrastructure/DevOps
---

I was sitting in a coffee shop last month, trying to deploy a terminal emulator feature to production, when I realized something: I'd spent more time fighting with deployment infrastructure than I had building the actual feature. That's when this needed fixing.

The project is a Mac OS X portfolio site that includes a working Linux terminal in the browser. The web frontend and API worked great on Railway. Fast deployments, automatic SSL, zero complaints. But the terminal needed something Railway couldn't give: access to the Docker socket.

## The Problem

Terminal sessions run in isolated Docker containers. The system needs to spin up containers, execute commands, stream PTY output back and forth. All the things that require direct access to Docker's API. Railway's container platform doesn't expose the Docker socket. It's not a bug; it's by design. They're running your containers, not giving you access to run more containers inside.

The choice was: abandon the terminal feature, rebuild everything somewhere else, or use Railway for what it's good at and run the terminal container on infrastructure we control.

We picked door number three.

## The Hybrid Solution

The architecture is straightforward:

1. Railway hosts the web frontend and API backend. Stateless services that scale nicely.
2. AWS EC2 hosts the terminal container. A single t3.micro instance running Docker with TLS enabled.
3. The API on Railway talks to Docker on EC2 over a secure TLS connection with mutual certificate authentication.
4. GitHub Actions orchestrates everything. One CI/CD system that deploys both pieces.

The terminal container lives on EC2 because it needs the Docker socket. The API lives on Railway because it doesn't. Simple as that.

## How It Works: One Git Push, Three Deployments

When you push code to main, three things happen in parallel.

**First, CI runs tests on every push and pull request.** The backend tests start Docker services (Redis and the terminal container), then run unit tests and integration tests. The frontend tests run TypeScript checks, the linter, and build the React app. A separate job builds both Docker images to verify they compile. Fast feedback. Tests pass, code moves forward. Tests fail, nothing deploys.

**Second, infrastructure deploys when you change IaC code.** This workflow only runs when you change Pulumi files, Dockerfiles, or docker-compose configurations. It provisions the EC2 instance with Pulumi (creating the t3.micro instance, security groups, and elastic IP), generates TLS certificates, configures the Docker daemon on EC2, uploads client certificates to Railway as base64-encoded environment variables, and finally deploys the terminal container by SSHing to EC2.

**Third, Railway auto-deploys on every push to main.** Railway watches the GitHub repo. When code changes hit main, the web service rebuilds using the Dockerfile at the repo root (nginx serving static React build) and the API service rebuilds using the FastAPI Dockerfile. No GitHub Action needed. Railway handles it. They're good at this part. The API service already has the Docker TLS environment variables from the infrastructure workflow, so it connects to EC2 and manages terminal containers remotely.

**And one more thing: the blog deploys to GitHub Pages when content changes.** When you change anything in the blog directory, GitHub Actions builds it with Jekyll and deploys to GitHub Pages. Even this blog post you're reading right now was deployed from the same monorepo.

A tiny slice of the CI configuration that ties this together:

```yaml
# .github/workflows/ci.yml
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - run: uv run pytest -q
```

## The Infrastructure as Code

The EC2 setup is defined in TypeScript using Pulumi. A security group allows SSH and Docker TLS traffic. A t3.micro instance runs Ubuntu 22.04. An elastic IP provides stable addressing. The user data script installs Docker on first boot. The GitHub Action handles the rest: TLS configuration and container deployment.

Pulumi provisions everything: security groups, EC2 instances, elastic IPs. The GitHub Action then generates certificates, configures Docker, and deploys containers. Infrastructure as code means destroying and recreating the entire EC2 setup takes eight minutes with identical configuration. No tribal knowledge required.

A minimal view of the Pulumi stack:

```ts
// iac/index.ts
const securityGroup = new aws.ec2.SecurityGroup('terminal-host-sg', {
  ingress: [
    { fromPort: 22, toPort: 22, protocol: 'tcp', cidrBlocks: ['0.0.0.0/0'] },
    { fromPort: 2376, toPort: 2376, protocol: 'tcp', cidrBlocks: ['0.0.0.0/0'] },
  ],
});

const instance = new aws.ec2.Instance('terminal-host', {
  instanceType: 't3.micro',
  userData: `#!/bin/bash
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker ubuntu
  `,
});
```

## Building the Terminal Container: Security First

The terminal container isn't just a shell. It's a security-hardened environment that runs untrusted user code.

The Dockerfile installs a full Ubuntu environment with bash, zsh, git, vim, Python, Node, and development tools. It creates a non-root user (UID 1000) with workspace as the home directory. Oh My Zsh, zsh-autosuggestions, zsh-syntax-highlighting, and fzf make the terminal feel like a real development environment. The entrypoint script copies these tools into the workspace on first run.

The security constraints in docker-compose are where it gets interesting. The filesystem is read-only. The container drops all Linux capabilities. It can't escalate privileges. Network mode is set to none, so it can't make outbound connections. It runs as a non-root user. Memory is limited to 1GB, CPU to 1.0 cores. Only /tmp, /var/tmp (via tmpfs), and /workspace (via Docker volume) are writable.

If someone tries to break out of the container, they hit these walls. It's defense in depth. Read-only filesystem means they can't modify system files. No capabilities means they can't escalate to root. No network means they can't exfiltrate data or download malware. Resource limits prevent DoS attacks.

Here are the key constraints in docker-compose:

```yaml
# apps/api/docker-compose.terminal.yml
services:
  terminal:
    build:
      context: .
      dockerfile: terminal.Dockerfile
    container_name: terminal-shared
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop: ['ALL']
    network_mode: none
    user: '1000:1000'
    mem_limit: 1g
    cpus: 1.0
    tmpfs:
      - /tmp:size=256m
      - /var/tmp:size=256m
    volumes:
      - terminal-workspace:/workspace:rw
```

## The Docker TLS Certificate Dance

Railway's API service needs to connect to EC2's Docker daemon over the internet. Opening port 2376 to the world without authentication isn't an option. That's where mutual TLS comes in.

Docker's TLS mode requires both sides to authenticate. The server (EC2 Docker daemon) must prove it's the real server. The client (Railway API) must prove it's authorized to connect. Without client certificates, anyone with the EC2 IP could connect. With mutual TLS, you need both the server cert (proves it's our EC2 instance) and the client cert (proves Railway is authorized).

The certificate generation process starts with creating a certificate authority. This is the root CA. Then a server certificate is generated, signed by the CA, with the EC2 IP address included in the Subject Alternative Name field. Then a client certificate is generated, signed by the CA, for Railway to use. The server certificates are installed on EC2 so the Docker daemon can prove its identity. The client certificates are uploaded to Railway, base64-encoded as environment variables.

The Subject Alternative Name entry is critical. If the EC2 IP isn't in the server certificate's SAN field, Docker will reject the connection even if the cert is valid. This was learned the hard way.

Railway stores environment variables as strings, so the certificates are base64-encoded before uploading. The API service decodes them at runtime and uses them to authenticate to EC2's Docker daemon.

The Docker daemon configuration file tells Docker to listen on both the Unix socket (for local access) and TCP port 2376 (for remote access). It enables TLS and TLS verification, pointing to the CA cert, server cert, and server key. After restarting Docker with this configuration, the daemon enforces mutual TLS. No valid client cert, no connection.

## The Monorepo Advantage

Having everything in one repository creates leverage. One codebase, three deployment paths. Railway auto-deploys web and API when code changes. The infrastructure workflow deploys to EC2 when IaC changes. The blog workflow deploys to GitHub Pages when blog content changes.

The benefits compound. Consistent tooling across all services. Same GitHub Actions, same Docker, same git workflow. Unified CI/CD where all tests run in one place and all deployments are visible in one UI. Code sharing between services. Infrastructure code, deployment scripts, and documentation all live together. Single source of truth. No "where did we configure that?" moments.

Even this blog post you're reading lives in the same repository as the code it describes. When I update the deployment workflow, I can update the blog post in the same commit.

## Before and After

Before unifying the pipeline, deploying meant manual EC2 setup with AWS console clicking. Docker TLS certificates were generated locally and uploaded via scp. Environment variables were copy-pasted into the Railway dashboard. There was no clear deployment process documentation. Deploying terminal changes required SSH, docker-compose up, crossed fingers. The blog was deployed manually with jekyll build and git push to the gh-pages branch. Total time to deploy all pieces: around two hours, if you remembered all the steps.

After unifying the pipeline, you push to main and walk away. GitHub Actions handles EC2 provisioning, cert generation, Docker configuration, and Railway updates. All infrastructure is code-reviewed and version-controlled. Clear workflow visibility in GitHub Actions UI. Deploying terminal changes: push code, Action builds and deploys. Blog auto-deploys when content changes. Total time to deploy all pieces: eight minutes automated.

Quantified wins: Setup time dropped from 2 hours to 8 minutes, a 93% reduction. Manual steps went from 15+ to zero. Configuration drift went from a constant problem to impossible, since everything's in code. Deployment confidence went from medium to high. Tests pass means safe to deploy. Blog deployment went from manual to automatic, one less thing to remember.

## What This Unlocks

Rebuilding the EC2 instance from scratch (region change, instance type upgrade, whatever) takes eight minutes. Run pulumi destroy and pulumi up. It's back with identical configuration. No tribal knowledge required.

Want to add another service that needs Docker socket access? Add it to the docker-compose file. The deploy workflow already knows what to do.

The terminal container is disposable. If it gets wedged, the API can kill it and start a fresh one. Infrastructure as code means recovery is pulumi up instead of "remember how we configured that one time."

All credentials live in GitHub Secrets, never in plaintext config. TLS certificates are generated per deployment with proper SAN entries. Docker daemon enforces mutual TLS. If someone gets the EC2 IP, they can't do anything without the client certs.

When the deployment workflow is updated, the blog post can be updated in the same commit. The blog auto-deploys. No separate deployment process to remember.

## Lessons Learned

- Use platforms for their strengths. Railway is excellent for stateless web/API; EC2 is appropriate when privileged access is required. Fighting platform limits is costly; aligning with them is faster and safer.
- Automate the fragile parts first. TLS certificates (especially SAN values) are the easiest place to make mistakes. The first time the SAN was missing, an hour disappeared into a “mysterious TLS error.” Automation eliminated that entire class of failure.
- Defense in depth matters for untrusted code. Read‑only filesystems, dropped capabilities, no network, and resource limits turn “oops” into “contained.” These guardrails paid for themselves immediately.
- One repo creates leverage. Workflows, infra, and the blog live together; one commit can update code and the explanation that documents the change.
- Tests before deploy is non‑negotiable. Fast feedback keeps changes small and issues local. If tests fail, deployments don’t proceed—simple rule, big win.

## Trade-offs

Added complexity: Two platforms instead of one (Railway plus EC2). TLS certificate management adds CA, server certs, and client certs to the mix. Infrastructure as code (Pulumi) adds another tool to learn. More moving parts means more things that can break.

What this gets in return: Platform flexibility. Use each platform for what it's good at. Security through mutual TLS and hardened containers. Automation where one push deploys everything. Reliability through infrastructure as code with no configuration drift.

Moving everything to AWS (ECS, EKS, whatever) would be "simpler" in the sense of one platform, but Railway's excellent developer experience for the web and API would be lost. And there'd be more AWS infrastructure to manage.

Abandoning the terminal feature would be simpler, but then there'd be no terminal in the portfolio.

The middle path: use Railway for what it's good at, use EC2 for what Railway can't do. It's more complex than either extreme, but it's the right amount of complexity for the need.

## Closing thoughts

The guiding idea is simple: let each platform do what it does best. Railway handles stateless web and API work, and EC2 hosts the one service that needs privileged access. The result is less to manage than moving everything to AWS, and more flexibility than going all in on Railway, with one pipeline that deploys both consistently.

Simple ideas, taken seriously, compound. This setup means the next feature, whether it fits on Railway or needs EC2, already has a path to production. There is no starting from zero, only building on working foundations.

Because the blog lives in the same repository, updates to the deployment workflow and the write up ship together. One commit keeps everything in sync.

---

**Want to see the code?** Check out [the GitHub repo](https://github.com/michaelmoschitto/mike-os-x). The .github/workflows directory has all the CI/CD workflows. The iac directory has the Pulumi infrastructure code.

**Questions or improvements?** I'm always learning. If you've solved this differently or see a better approach, I'd love to hear about it.
