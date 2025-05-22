#!/bin/bash
set -e

mkdir -p /app/data

echo "Starting FastAPI application..."
exec "$@" 