#!/bin/sh
set -e

echo "🧠 Starting Brain service..."

# Skip video setup for now - focus on core brain functionality
# Video/trailer generation can be done on host machine

# Export video container path (empty = disabled)
export VIDEO_CONTAINER_PATH=""

# Start the brain server
exec node dist/index.js
