#!/usr/bin/env bash
#
# Village Management System - Linux Launcher
#
# Double-click or run: ./linux.sh
#
# On first run (or if node_modules/.env are missing), this runs the full
# setup wizard. On subsequent runs it starts the dev server directly.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "[ERROR] This script is for Linux. Please run ./mac.sh on macOS." >&2
  exit 1
fi

# Load NVM if it exists
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  export NVM_DIR="$HOME/.nvm"
  \. "$NVM_DIR/nvm.sh"
fi

echo "============================================================"
echo "  Village Management System  |  Linux"
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
