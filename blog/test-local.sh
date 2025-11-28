#!/bin/bash

# Test Jekyll blog locally using Docker
# Uses older stable Jekyll image to avoid sass-embedded "Broken pipe" issues

set -e

cd "$(dirname "$0")"

# Use Jekyll 4.2.2 which uses sassc instead of sass-embedded (more stable in Docker)
JEKYLL_IMAGE="jekyll/jekyll:4.2.2"

if ! docker image inspect "$JEKYLL_IMAGE" >/dev/null 2>&1; then
  echo "📥 Pulling Jekyll image (this only happens once)..."
  docker pull "$JEKYLL_IMAGE"
fi

echo ""
echo "🚀 Starting Jekyll server..."
echo "   Blog available at: http://localhost:4000"
echo "   Press Ctrl+C to stop"
echo ""

# Use named volume for bundle cache (persists across runs)
docker run --rm \
  --volume="$PWD:/srv/jekyll" \
  --volume="jekyll-bundle-cache:/usr/local/bundle" \
  -p 4000:4000 \
  -p 35729:35729 \
  "$JEKYLL_IMAGE" \
  jekyll serve --host 0.0.0.0 --port 4000 --force_polling
