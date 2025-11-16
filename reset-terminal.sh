#!/bin/bash
# Quick terminal container reset script

echo "🔥 Stopping and removing terminal container..."
docker stop terminal-shared 2>/dev/null || true
docker rm terminal-shared 2>/dev/null || true

echo "🗑️  Removing terminal volume..."
docker volume rm terminal-workspace 2>/dev/null || true

echo "✅ Terminal reset complete! The container will be recreated on next connection."

