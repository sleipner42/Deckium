#!/bin/bash
set -e

mkdir -p /app/data

if [ ! -w /app/data ]; then
    echo "Error: /app/data is not writable by current user"
    ls -la /app/data
    exit 1
fi

echo "Starting FastAPI application..."
exec "$@" 