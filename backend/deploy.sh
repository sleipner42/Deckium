#!/bin/bash

set -e

GITHUB_USERNAME=${1:-""}
GITHUB_TOKEN=${2:-""}

if [ -z "$GITHUB_USERNAME" ] || [ -z "$GITHUB_TOKEN" ]; then
    echo "Usage: ./deploy.sh <github_username> <github_token>"
    echo "Or set GITHUB_USERNAME and GITHUB_TOKEN environment variables"
    exit 1
fi

echo "Logging into GitHub Container Registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin

echo "Setting GITHUB_REPOSITORY environment variable..."
export GITHUB_REPOSITORY="kristoffer/keynotai2"

echo "Pulling latest backend image..."
docker compose pull backend

echo "Starting backend service..."
docker compose up -d backend

echo "Cleaning up old images..."
docker system prune -f

echo "Deployment completed successfully!"
echo "Backend is running on port 8123"

echo "Checking service status..."
docker compose ps backend

echo "Recent logs:"
docker compose logs --tail=20 backend 