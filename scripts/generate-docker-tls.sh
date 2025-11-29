#!/bin/bash
set -e

# Generate Docker TLS certificates for secure remote Docker daemon access
# Usage: ./scripts/generate-docker-tls.sh <EC2_IP_OR_HOSTNAME>

if [ -z "$1" ]; then
    echo "Usage: $0 <EC2_IP_OR_HOSTNAME>"
    echo "Example: $0 54.123.45.67"
    exit 1
fi

EC2_HOST="$1"
CERTS_DIR="$(pwd)/certs"
DAEMON_DIR="$CERTS_DIR/daemon"
CLIENT_DIR="$CERTS_DIR/client"

echo "Generating Docker TLS certificates for $EC2_HOST..."

# Create directories
mkdir -p "$DAEMON_DIR" "$CLIENT_DIR"

# Generate CA private key
openssl genrsa -out "$CERTS_DIR/ca-key.pem" 4096

# Generate CA certificate
openssl req -new -x509 -days 365 -key "$CERTS_DIR/ca-key.pem" \
    -sha256 -out "$CERTS_DIR/ca.pem" \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=docker-ca"

# Generate server private key
openssl genrsa -out "$DAEMON_DIR/server-key.pem" 4096

# Generate server certificate signing request
openssl req -subj "/C=US/ST=State/L=City/O=Organization/CN=$EC2_HOST" \
    -sha256 -new -key "$DAEMON_DIR/server-key.pem" \
    -out "$DAEMON_DIR/server.csr"

# Create server certificate extensions
echo "subjectAltName = IP:$EC2_HOST,DNS:$EC2_HOST,DNS:localhost,IP:127.0.0.1,IP:::1" > "$DAEMON_DIR/server-extfile.cnf"
echo "extendedKeyUsage = serverAuth" >> "$DAEMON_DIR/server-extfile.cnf"

# Generate server certificate
openssl x509 -req -days 365 -sha256 \
    -in "$DAEMON_DIR/server.csr" \
    -CA "$CERTS_DIR/ca.pem" \
    -CAkey "$CERTS_DIR/ca-key.pem" \
    -CAcreateserial \
    -out "$DAEMON_DIR/server-cert.pem" \
    -extfile "$DAEMON_DIR/server-extfile.cnf"

# Generate client private key
openssl genrsa -out "$CLIENT_DIR/key.pem" 4096

# Generate client certificate signing request
openssl req -subj "/C=US/ST=State/L=City/O=Organization/CN=client" \
    -new -key "$CLIENT_DIR/key.pem" \
    -out "$CLIENT_DIR/client.csr"

# Create client certificate extensions
echo "extendedKeyUsage = clientAuth" > "$CLIENT_DIR/client-extfile.cnf"

# Generate client certificate
openssl x509 -req -days 365 -sha256 \
    -in "$CLIENT_DIR/client.csr" \
    -CA "$CERTS_DIR/ca.pem" \
    -CAkey "$CERTS_DIR/ca-key.pem" \
    -CAcreateserial \
    -out "$CLIENT_DIR/cert.pem" \
    -extfile "$CLIENT_DIR/client-extfile.cnf"

# Set proper permissions
chmod 600 "$CERTS_DIR/ca-key.pem" "$DAEMON_DIR/server-key.pem" "$CLIENT_DIR/key.pem"
chmod 644 "$CERTS_DIR/ca.pem" "$DAEMON_DIR/server-cert.pem" "$CLIENT_DIR/cert.pem"

# Clean up temporary files
rm -f "$DAEMON_DIR/server.csr" "$DAEMON_DIR/server-extfile.cnf" \
      "$CLIENT_DIR/client.csr" "$CLIENT_DIR/client-extfile.cnf" \
      "$CERTS_DIR/ca.srl"

echo ""
echo "✅ TLS certificates generated successfully!"
echo ""
echo "Server certificates (for EC2):"
echo "  - $DAEMON_DIR/ca.pem"
echo "  - $DAEMON_DIR/server-cert.pem"
echo "  - $DAEMON_DIR/server-key.pem"
echo ""
echo "Client certificates (for Railway API):"
echo "  - $CLIENT_DIR/ca.pem (copy of $CERTS_DIR/ca.pem)"
echo "  - $CLIENT_DIR/cert.pem"
echo "  - $CLIENT_DIR/key.pem"
echo ""
echo "Next steps:"
echo "1. Copy server certs to EC2: scp -r $DAEMON_DIR/* ubuntu@$EC2_HOST:/etc/docker/certs/"
echo "2. Upload client certs to Railway (see docs/DEPLOYMENT.md)"
echo "3. Configure Docker daemon on EC2 (see scripts/setup-ec2.sh)"

