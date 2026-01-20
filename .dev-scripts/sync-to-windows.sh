#!/bin/bash

# Sync code from Ubuntu to Windows machine
# Usage: ./sync-to-windows.sh [windows-host]

WINDOWS_HOST=${1:-"windows-dev"}  # Default hostname
WINDOWS_PATH="/c/dev/ats-chd-tools"

echo "📦 Syncing to Windows machine: $WINDOWS_HOST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Sync excluding build artifacts and dependencies
rsync -av --progress \
  --exclude 'node_modules/' \
  --exclude 'target/' \
  --exclude 'dist/' \
  --exclude '.git/' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  . "$WINDOWS_HOST:$WINDOWS_PATH/"

echo ""
echo "✅ Sync complete!"
echo ""
echo "Next steps on Windows:"
echo "  1. cd $WINDOWS_PATH"
echo "  2. npm install  (if package.json changed)"
echo "  3. npm run tauri:build"
