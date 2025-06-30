#!/bin/bash

echo "Testing with bandi13/gui-docker directly..."

docker run -it --rm \
  -v "/home/elias/Documents/kraftpo-ng/app/release/build/Deckium-1.0.0.AppImage:/tmp/Deckium.AppImage:ro" \
  -p 8080:8080 \
  --name deckium-simple-test \
  bandi13/gui-docker:latest

echo "Open http://localhost:8080 in your browser to access the desktop"