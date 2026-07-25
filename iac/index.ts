import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

// release bump: 9

const config = new pulumi.Config();
const sshPublicKey = config.get('sshPublicKey') || '';
const agentHostname = config.get('agentHostname') || 'agent.os.mikemoschitto.com';

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
  owners: ['099720109477'],
});

const sshKey = new aws.ec2.KeyPair('terminal-host-key', {
  keyName: 'mike-os-x-terminal-key',
  publicKey: sshPublicKey,
});

const ssmRole = new aws.iam.Role('terminal-host-ssm-role', {
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'ec2.amazonaws.com' },
        Action: 'sts:AssumeRole',
      },
    ],
  }),
  tags: {
    Name: 'mike-os-x-terminal-ssm-role',
    Project: 'mike-os-x',
  },
});

new aws.iam.RolePolicyAttachment('terminal-host-ssm-core', {
  role: ssmRole.name,
  policyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
});

const instanceProfile = new aws.iam.InstanceProfile('terminal-host-profile', {
  role: ssmRole.name,
  tags: {
    Name: 'mike-os-x-terminal-profile',
    Project: 'mike-os-x',
  },
});

const securityGroup = new aws.ec2.SecurityGroup('terminal-host-sg', {
  description: 'Security group for mike-os-x terminal host',
  ingress: [
    {
      description: 'HTTP for ACME and redirects',
      fromPort: 80,
      toPort: 80,
      protocol: 'tcp',
      cidrBlocks: ['0.0.0.0/0'],
    },
    {
      description: 'HTTPS for authenticated terminal agent',
      fromPort: 443,
      toPort: 443,
      protocol: 'tcp',
      cidrBlocks: ['0.0.0.0/0'],
    },
    {
      description: 'Temporary Docker TLS rollback path',
      fromPort: 2376,
      toPort: 2376,
      protocol: 'tcp',
      cidrBlocks: ['0.0.0.0/0'],
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

const userData = `#!/bin/bash
set -e

# Register with Systems Manager before slower package upgrades. This makes the
# host manageable even if later bootstrap steps take several minutes.
if ! command -v snap >/dev/null 2>&1; then
  apt-get update
  apt-get install -y snapd
fi

if ! snap list amazon-ssm-agent >/dev/null 2>&1; then
  snap install amazon-ssm-agent --classic
fi

systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service

apt-get update
apt-get upgrade -y

curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

mkdir -p /home/ubuntu/mike-os-x
chown -R ubuntu:ubuntu /home/ubuntu/mike-os-x

apt-get install -y git curl wget

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

cat > /etc/docker/daemon.json <<'DOCKER_EOF'
{
  "hosts": ["unix:///var/run/docker.sock"]
}
DOCKER_EOF

mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/override.conf <<'OVERRIDE_EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd
OVERRIDE_EOF

systemctl daemon-reload
systemctl enable docker
systemctl restart docker
sleep 5

sudo -u ubuntu git clone https://github.com/michaelmoschitto/mike-os-x.git /home/ubuntu/mike-os-x || echo "Repository clone failed - will need to clone manually"

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

echo "EC2 bootstrap complete. Docker is local-only; deploy the terminal agent over HTTPS via SSM."
`;

const instance = new aws.ec2.Instance('terminal-host', {
  instanceType: 't3.micro',
  ami: ubuntu.then((ami) => ami.id),
  keyName: sshKey.keyName,
  iamInstanceProfile: instanceProfile.name,
  vpcSecurityGroupIds: [securityGroup.id],
  userData,
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

const eip = new aws.ec2.Eip('terminal-host-eip', {
  instance: instance.id,
  tags: {
    Name: 'mike-os-x-terminal-eip',
    Project: 'mike-os-x',
  },
});

export const instanceId = instance.id;
export const publicIp = eip.publicIp;
export const publicDns = eip.publicDns;
export const agentHostnameExport = agentHostname;
export const agentUrl = pulumi.interpolate`https://${agentHostname}`;
export const ssmConnectHint = pulumi.interpolate`aws ssm start-session --target ${instance.id}`;
