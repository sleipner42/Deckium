#!/bin/bash

# Stop existing containers
docker stop deckium-fuse-test deckium-gui-test 2>/dev/null || true

echo "Building simple GUI+FUSE image based on working gui-docker..."
docker build -f test-gui-fuse-simple.dockerfile -t deckium-simple-test .

echo "Starting container..."
docker run -d --rm \
  --privileged \
  --device /dev/fuse \
  -v "/home/elias/Documents/kraftpo-ng/app/release/build/Deckium-1.0.0.AppImage:/home/dockerUser/Deckium.AppImage:ro" \
  -p 5901:5901 \
  --name deckium-simple-test \
  deckium-simple-test

echo ""
echo "Container started!"
echo "Access via web browser: http://localhost:5901/?password=123456"
echo "Or VNC client: localhost:5900 (password: 123456)"
echo ""
echo "In the desktop:"
echo "1. Right-click → DockerCustom → Xterm"
echo "2. Run: chmod +x Deckium.AppImage && ./Deckium.AppImage"
echo ""
echo "To stop: docker stop deckium-simple-test"