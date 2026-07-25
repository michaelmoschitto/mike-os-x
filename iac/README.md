# Terminal Host Infrastructure

Pulumi configuration for the isolated EC2 host that runs the terminal sandbox and authenticated terminal agent.

## Prerequisites

- Pulumi CLI (>= v3)
- Bun
- AWS credentials configured

## Getting Started

1. Configure the required values:

   ```shell
   pulumi config set sshPublicKey 'ssh-ed25519 ...'
   pulumi config set agentHostname 'agent.os.mikemoschitto.com'
   ```

2. Preview and deploy:

   ```shell
   pulumi preview
   pulumi up
   ```

3. Point `agentHostname` DNS at the Elastic IP, then deploy the agent stack with GitHub Actions.

## Security model

- Security group allows only TCP/80 and TCP/443
- Docker listens only on the local Unix socket
- Railway connects to the agent over HTTPS with HMAC-signed requests
- Instance management uses AWS Systems Manager (no public SSH ingress)

## Configuration

| Key | Description | Default |
| --- | --- | --- |
| `aws:region` | AWS deployment region | `us-east-1` |
| `sshPublicKey` | Public key retained for break-glass AMI/console recovery | Required |
| `agentHostname` | Public hostname for the terminal agent TLS certificate | `agent.os.mikemoschitto.com` |
