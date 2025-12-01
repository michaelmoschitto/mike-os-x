import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

// release bump: 3

// Configuration
const config = new pulumi.Config();
const sshPublicKey = config.get('sshPublicKey') || ''; // Will be set via pulumi config

// Get the latest Ubuntu 22.04 AMI
const ubuntu = aws.ec2.getAmi({
  mostRecent: true,
  filters: [
    {
      name: 'name',
      values: ['ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*'],
    },
    {
      name: 'virtualization-type',
      values: ['hvm'],
    },
  ],
  owners: ['099720109477'], // Canonical
});

const sshKey = new aws.ec2.KeyPair('terminal-host-key', {
  keyName: 'mike-os-x-terminal-key',
  publicKey: sshPublicKey,
});

// Security group for the terminal host
const securityGroup = new aws.ec2.SecurityGroup('terminal-host-sg', {
  description: 'Security group for mike-os-x terminal host',
  ingress: [
    {
      description: 'SSH',
      fromPort: 22,
      toPort: 22,
      protocol: 'tcp',
      cidrBlocks: ['0.0.0.0/0'], // Consider restricting this to your IP
    },
    {
      description: 'Docker TLS',
      fromPort: 2376,
      toPort: 2376,
      protocol: 'tcp',
      cidrBlocks: ['0.0.0.0/0'], // Railway will connect here
    },
  ],
  egress: [
    {
      description: 'All outbound traffic',
      fromPort: 0,
      toPort: 0,
      protocol: '-1',
      cidrBlocks: ['0.0.0.0/0'],
    },
  ],
  tags: {
    Name: 'mike-os-x-terminal-sg',
    Project: 'mike-os-x',
  },
});

// User data script to install Docker and configure on first boot
const userData = `#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Create directories for Docker TLS certs and app
mkdir -p /etc/docker/certs
mkdir -p /home/ubuntu/mike-os-x

# Set ownership
chown -R ubuntu:ubuntu /home/ubuntu/mike-os-x

# Install git and other utilities
apt-get install -y git curl wget

# Install Docker Compose (standalone)
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Configure Docker daemon to listen on both Unix socket and TCP
# Note: TLS will be configured after certificates are generated
cat > /etc/docker/daemon.json <<'DOCKER_EOF'
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"]
}
DOCKER_EOF

# Create systemd override to remove -H flag (conflicts with daemon.json hosts)
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/override.conf <<'OVERRIDE_EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd
OVERRIDE_EOF

# Enable and start Docker service
systemctl daemon-reload
systemctl enable docker
systemctl start docker

# Wait for Docker to be ready
sleep 5

# Clone repository (will fail if no access, but that's okay - can be done manually)
sudo -u ubuntu git clone https://github.com/michaelmoschitto/mike-os-x.git /home/ubuntu/mike-os-x || echo "Repository clone failed - will need to clone manually or use SSH keys"

# Set up log rotation for Docker
cat > /etc/logrotate.d/docker-containers <<'LOGROTATE_EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
LOGROTATE_EOF

echo "EC2 bootstrap complete. Docker is running on Unix socket and TCP (without TLS)."
echo "Next: Upload TLS certificates to /etc/docker/certs/ and update daemon.json with TLS config."
`;

// EC2 instance for terminal host
const instance = new aws.ec2.Instance('terminal-host', {
  instanceType: 't3.micro',
  ami: ubuntu.then((ami) => ami.id),
  keyName: sshKey.keyName,
  vpcSecurityGroupIds: [securityGroup.id],

  userData: userData,

  rootBlockDevice: {
    volumeSize: 8,
    volumeType: 'gp3',
    deleteOnTermination: true,
  },

  tags: {
    Name: 'mike-os-x-terminal-host',
    Project: 'mike-os-x',
    Purpose: 'terminal-container',
  },

  monitoring: false,
});

// Elastic IP for stable address
const eip = new aws.ec2.Eip('terminal-host-eip', {
  instance: instance.id,
  tags: {
    Name: 'mike-os-x-terminal-eip',
    Project: 'mike-os-x',
  },
});

// Outputs
export const instanceId = instance.id;
export const publicIp = eip.publicIp;
export const publicDns = eip.publicDns;
export const sshCommand = pulumi.interpolate`ssh -i ~/.ssh/mike-os-x-terminal ubuntu@${eip.publicIp}`;
export const dockerHost = pulumi.interpolate`tcp://${eip.publicIp}:2376`;
