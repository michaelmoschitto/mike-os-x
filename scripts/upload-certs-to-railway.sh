#!/usr/bin/env bash
set -euo pipefail

CERTS_DIR="${1:-$HOME/Downloads/docker-tls-client-certs}"
DOCKER_HOST_VALUE="${2:-${DOCKER_HOST:-}}"
RAILWAY_SERVICE="${RAILWAY_SERVICE:-@mike-os-x/api}"
MIN_VALID_DAYS="${MIN_VALID_DAYS:-30}"

for file in ca.pem cert.pem key.pem; do
    if [[ ! -f "$CERTS_DIR/$file" ]]; then
        echo "Missing certificate file: $CERTS_DIR/$file" >&2
        exit 1
    fi
done

if ! command -v railway >/dev/null 2>&1; then
    echo "Railway CLI is required. Install it with: brew install railway" >&2
    exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
    echo "Railway authentication is required. Run: railway login" >&2
    exit 1
fi

MIN_VALID_SECONDS=$((MIN_VALID_DAYS * 24 * 60 * 60))
openssl verify -CAfile "$CERTS_DIR/ca.pem" "$CERTS_DIR/cert.pem"
openssl x509 -checkend "$MIN_VALID_SECONDS" -noout -in "$CERTS_DIR/ca.pem"
openssl x509 -checkend "$MIN_VALID_SECONDS" -noout -in "$CERTS_DIR/cert.pem"

CLIENT_KEY_HASH="$(openssl pkey -in "$CERTS_DIR/key.pem" -pubout 2>/dev/null | openssl sha256)"
CLIENT_CERT_HASH="$(openssl x509 -in "$CERTS_DIR/cert.pem" -pubkey -noout | openssl sha256)"
if [[ "$CLIENT_KEY_HASH" != "$CLIENT_CERT_HASH" ]]; then
    echo "Client certificate and private key do not match" >&2
    exit 1
fi

DOCKER_CA_CERT="$(base64 < "$CERTS_DIR/ca.pem" | tr -d '\n')"
DOCKER_CLIENT_CERT="$(base64 < "$CERTS_DIR/cert.pem" | tr -d '\n')"
DOCKER_CLIENT_KEY="$(base64 < "$CERTS_DIR/key.pem" | tr -d '\n')"

railway_args=(
    variables
    --service "$RAILWAY_SERVICE"
    --set "DOCKER_CA_CERT=$DOCKER_CA_CERT"
    --set "DOCKER_CLIENT_CERT=$DOCKER_CLIENT_CERT"
    --set "DOCKER_CLIENT_KEY=$DOCKER_CLIENT_KEY"
    --set "DOCKER_TLS_VERIFY=1"
)

if [[ -n "$DOCKER_HOST_VALUE" ]]; then
    railway_args+=(--set "DOCKER_HOST=$DOCKER_HOST_VALUE")
fi

railway "${railway_args[@]}"
echo "Validated and uploaded Docker TLS variables to Railway service $RAILWAY_SERVICE"

