#!/bin/bash
set -e

# Upload Docker TLS certificates to Railway as base64 environment variables
# Usage: ./scripts/upload-certs-to-railway.sh [certs-directory]
#
# Default certs directory: ~/Downloads/docker-tls-client-certs

CERTS_DIR="${1:-$HOME/Downloads/docker-tls-client-certs}"

echo "📁 Looking for certificates in: $CERTS_DIR"

# Check if certs exist
if [[ ! -f "$CERTS_DIR/ca.pem" ]] || [[ ! -f "$CERTS_DIR/cert.pem" ]] || [[ ! -f "$CERTS_DIR/key.pem" ]]; then
    echo "❌ Error: Certificate files not found in $CERTS_DIR"
    echo ""
    echo "Expected files:"
    echo "  - $CERTS_DIR/ca.pem"
    echo "  - $CERTS_DIR/cert.pem"
    echo "  - $CERTS_DIR/key.pem"
    echo ""
    echo "Download the 'docker-tls-client-certs' artifact from the GitHub Actions workflow"
    echo "and extract it, then run:"
    echo ""
    echo "  ./scripts/upload-certs-to-railway.sh /path/to/extracted/certs"
    exit 1
fi

# Check Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not installed. Install with: brew install railway"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Run: railway login"
    exit 1
fi

echo "🔐 Encoding certificates..."

DOCKER_CA_CERT=$(base64 < "$CERTS_DIR/ca.pem" | tr -d '\n')
DOCKER_CLIENT_CERT=$(base64 < "$CERTS_DIR/cert.pem" | tr -d '\n')
DOCKER_CLIENT_KEY=$(base64 < "$CERTS_DIR/key.pem" | tr -d '\n')

echo "📤 Uploading to Railway..."


# Set all variables at once (triggers single redeploy)
if [[ -n "$RAILWAY_PROJECT_ID" ]]; then
    echo "Using project ID: $RAILWAY_PROJECT_ID"
    railway variables \
        --set "DOCKER_CA_CERT=$DOCKER_CA_CERT" \
        --set "DOCKER_CLIENT_CERT=$DOCKER_CLIENT_CERT" \
        --set "DOCKER_CLIENT_KEY=$DOCKER_CLIENT_KEY"
elif [[ -n "$RAILWAY_PROJECT" ]]; then
    echo "Using project flag: $RAILWAY_PROJECT"
    railway --project "$RAILWAY_PROJECT" variables \
        --set "DOCKER_CA_CERT=$DOCKER_CA_CERT" \
        --set "DOCKER_CLIENT_CERT=$DOCKER_CLIENT_CERT" \
        --set "DOCKER_CLIENT_KEY=$DOCKER_CLIENT_KEY"
else
    echo "Using linked project (run 'railway link' if not already linked)"
    railway variables \
        --set "DOCKER_CA_CERT=$DOCKER_CA_CERT" \
        --set "DOCKER_CLIENT_CERT=$DOCKER_CLIENT_CERT" \
        --set "DOCKER_CLIENT_KEY=$DOCKER_CLIENT_KEY"
fi

echo "  ✅ DOCKER_CA_CERT set"
echo "  ✅ DOCKER_CLIENT_CERT set"
echo "  ✅ DOCKER_CLIENT_KEY set"

echo ""
echo "🎉 All certificates uploaded successfully!"
echo ""
echo "Railway will automatically redeploy. Check the deployment logs for:"
echo "  'Using TLS for Docker connection'"

