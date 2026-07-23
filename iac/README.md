# Terminal Host Infrastructure

Pulumi configuration for the isolated EC2 host that runs the public terminal container.

 ## Prerequisites

 - Pulumi CLI (>= v3): https://www.pulumi.com/docs/get-started/install/
 - Node.js (>= 14): https://nodejs.org/
 - AWS credentials configured (e.g., via `aws configure` or environment variables)

 ## Getting Started

1. Configure the required values:

   ```shell
   pulumi config set sshPublicKey 'ssh-ed25519 ...'
   pulumi config set sshIngressCidr '203.0.113.10/32'
   pulumi config set dockerIngressCidr '203.0.113.20/32'
   ```

 2. Preview and deploy your infrastructure:

   ```shell
    pulumi preview
    pulumi up
    ```

 3. When you're finished, tear down your stack:

   ```shell
    pulumi destroy
    pulumi stack rm
    ```

 ## Project Layout

 - `Pulumi.yaml` — Pulumi project and template metadata
- `index.ts` — EC2 instance, Elastic IP, and restricted security group
 - `package.json` — Node.js dependencies
 - `tsconfig.json` — TypeScript compiler options

 ## Configuration

| Key | Description | Default |
| --- | --- | --- |
| `aws:region` | AWS deployment region | `us-east-1` |
| `sshPublicKey` | Public key for EC2 administration | Required |
| `sshIngressCidr` | Restricted IPv4 CIDR allowed to reach SSH | Required |
| `dockerIngressCidr` | Restricted IPv4 CIDR allowed to reach Docker TLS | Required |

 Use `pulumi config set <key> <value>` to customize configuration.

 ## Getting Help

 If you encounter any issues or have suggestions, please open an issue in this repository.