#!/usr/bin/env bash
#
# Village Management System - macOS Launcher
#
# Double-click or run: ./mac.sh
#
# On first run (or if node_modules/.env are missing), this runs the full
# setup wizard. On subsequent runs it starts the dev server directly.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[ERROR] This script is for macOS. Please run ./linux.sh on Linux." >&2
  exit 1
fi

echo "============================================================"
echo "  Village Management System  |  macOS"
echo "============================================================"

# Detect whether setup is needed
if [[ ! -d "node_modules" || ! -f ".env" || ! -f "server/.env" ]]; then
  echo ""
  echo "First-time setup detected. Running setup wizard..."
  echo ""
  bash "$SCRIPT_DIR/scripts/setup/setup.sh"
  exit $?
fi

echo ""
echo "Environment already configured. Starting dev server..."
echo "The app will open at http://localhost:9100"
echo "Press Ctrl+C to stop."
echo ""

if command -v yarn >/dev/null 2>&1 && [[ -f "yarn.lock" ]]; then
  yarn quasar dev -m ssr
else
  npx quasar dev -m ssr
fi
