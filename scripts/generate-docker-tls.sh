#!/usr/bin/env bash
set -euo pipefail

EC2_HOST="${1:-}"
CERTS_DIR="${2:-$(pwd)/certs}"
VALID_DAYS="${3:-365}"
MIN_VALID_DAYS="${MIN_VALID_DAYS:-30}"

if [[ -z "$EC2_HOST" ]]; then
    echo "Usage: $0 <EC2_IP_OR_HOSTNAME> [output-directory] [valid-days]" >&2
    exit 1
fi

if ! [[ "$VALID_DAYS" =~ ^[0-9]+$ ]] || (( VALID_DAYS <= MIN_VALID_DAYS )); then
    echo "valid-days must be an integer greater than $MIN_VALID_DAYS" >&2
    exit 1
fi

DAEMON_DIR="$CERTS_DIR/daemon"
CLIENT_DIR="$CERTS_DIR/client"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

rm -rf "$DAEMON_DIR" "$CLIENT_DIR"
rm -f "$CERTS_DIR/ca.pem" "$CERTS_DIR/ca-key.pem" "$CERTS_DIR/ca.srl"
mkdir -p "$DAEMON_DIR" "$CLIENT_DIR"

if [[ "$EC2_HOST" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || [[ "$EC2_HOST" == *:* ]]; then
    HOST_SAN="IP:$EC2_HOST"
else
    HOST_SAN="DNS:$EC2_HOST"
fi

openssl genrsa -out "$CERTS_DIR/ca-key.pem" 4096
openssl req -new -x509 -days "$VALID_DAYS" \
    -key "$CERTS_DIR/ca-key.pem" \
    -sha256 \
    -out "$CERTS_DIR/ca.pem" \
    -subj "/C=US/O=Mike OS X/CN=mike-os-x-docker-ca"

openssl genrsa -out "$DAEMON_DIR/server-key.pem" 4096
openssl req -new -sha256 \
    -key "$DAEMON_DIR/server-key.pem" \
    -out "$TEMP_DIR/server.csr" \
    -subj "/C=US/O=Mike OS X/CN=$EC2_HOST"
cat > "$TEMP_DIR/server-extfile.cnf" <<EOF
subjectAltName = $HOST_SAN,DNS:localhost,IP:127.0.0.1,IP:::1
extendedKeyUsage = serverAuth
EOF
openssl x509 -req -days "$VALID_DAYS" -sha256 \
    -in "$TEMP_DIR/server.csr" \
    -CA "$CERTS_DIR/ca.pem" \
    -CAkey "$CERTS_DIR/ca-key.pem" \
    -CAcreateserial \
    -out "$DAEMON_DIR/server-cert.pem" \
    -extfile "$TEMP_DIR/server-extfile.cnf"

openssl genrsa -out "$CLIENT_DIR/key.pem" 4096
openssl req -new -sha256 \
    -key "$CLIENT_DIR/key.pem" \
    -out "$TEMP_DIR/client.csr" \
    -subj "/C=US/O=Mike OS X/CN=railway-terminal-api"
echo "extendedKeyUsage = clientAuth" > "$TEMP_DIR/client-extfile.cnf"
openssl x509 -req -days "$VALID_DAYS" -sha256 \
    -in "$TEMP_DIR/client.csr" \
    -CA "$CERTS_DIR/ca.pem" \
    -CAkey "$CERTS_DIR/ca-key.pem" \
    -CAcreateserial \
    -out "$CLIENT_DIR/cert.pem" \
    -extfile "$TEMP_DIR/client-extfile.cnf"

cp "$CERTS_DIR/ca.pem" "$DAEMON_DIR/ca.pem"
cp "$CERTS_DIR/ca.pem" "$CLIENT_DIR/ca.pem"

chmod 600 "$CERTS_DIR/ca-key.pem" "$DAEMON_DIR/server-key.pem" "$CLIENT_DIR/key.pem"
chmod 644 "$CERTS_DIR/ca.pem" "$DAEMON_DIR/ca.pem" "$DAEMON_DIR/server-cert.pem" \
    "$CLIENT_DIR/ca.pem" "$CLIENT_DIR/cert.pem"

MIN_VALID_SECONDS=$((MIN_VALID_DAYS * 24 * 60 * 60))
openssl verify -CAfile "$CERTS_DIR/ca.pem" "$DAEMON_DIR/server-cert.pem" "$CLIENT_DIR/cert.pem"
openssl x509 -checkend "$MIN_VALID_SECONDS" -noout -in "$DAEMON_DIR/server-cert.pem"
openssl x509 -checkend "$MIN_VALID_SECONDS" -noout -in "$CLIENT_DIR/cert.pem"

SERVER_KEY_HASH="$(openssl pkey -in "$DAEMON_DIR/server-key.pem" -pubout 2>/dev/null | openssl sha256)"
SERVER_CERT_HASH="$(openssl x509 -in "$DAEMON_DIR/server-cert.pem" -pubkey -noout | openssl sha256)"
CLIENT_KEY_HASH="$(openssl pkey -in "$CLIENT_DIR/key.pem" -pubout 2>/dev/null | openssl sha256)"
CLIENT_CERT_HASH="$(openssl x509 -in "$CLIENT_DIR/cert.pem" -pubkey -noout | openssl sha256)"

if [[ "$SERVER_KEY_HASH" != "$SERVER_CERT_HASH" || "$CLIENT_KEY_HASH" != "$CLIENT_CERT_HASH" ]]; then
    echo "Generated certificate and private key do not match" >&2
    exit 1
fi

echo "Generated and validated Docker TLS certificates for $EC2_HOST in $CERTS_DIR"
openssl x509 -in "$DAEMON_DIR/server-cert.pem" -noout -subject -dates -ext subjectAltName

