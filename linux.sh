#!/usr/bin/env bash
#
# Village Management System - Linux Launcher
#
# Double-click or run: ./linux.sh
# If you get "Permission denied", run:  chmod +x linux.sh
#
# On first run (or if node_modules/.env are missing), this runs the full
# setup wizard. On subsequent runs it starts the dev server directly.
#

set -euo pipefail

# Keep the terminal open on error so double-click users can see what went wrong
cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo ""
    echo "[ERROR] Script exited with code $exit_code. Check the output above."
    echo "Press Enter to close..."
    read -r
  fi
}
trap cleanup EXIT

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

# Load Linuxbrew if it exists
if ! command -v brew >/dev/null 2>&1; then
  if [[ -d "/home/linuxbrew/.linuxbrew" ]]; then
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
  elif [[ -f "$HOME/.linuxbrew/bin/brew" ]]; then
    eval "$("$HOME/.linuxbrew/bin/brew" shellenv)"
  fi
fi

echo "============================================================"
echo "  Village Management System  |  Linux"
echo "============================================================"

# Detect whether setup is needed
if [[ ! -d "node_modules" || ! -f ".env" || ! -f "server/.env" ]]; then
  echo ""
  echo "First-time setup detected. Running setup wizard..."
  echo ""
  if [[ ! -f "$SCRIPT_DIR/scripts/setup/setup.sh" ]]; then
    echo "[ERROR] Setup script not found: scripts/setup/setup.sh"
    echo "Please ensure the repository was cloned completely."
    exit 1
  fi
  bash "$SCRIPT_DIR/scripts/setup/setup.sh"
  exit $?
fi

echo ""
echo "Environment already configured. Pushing Appwrite functions..."
cd server
appwrite push functions || echo "[WARN] Failed to push Appwrite functions. Continuing..."
cd ..

echo ""
echo "Starting dev server..."
echo "The app will be available at http://localhost:9100"
echo "Press Ctrl+C to stop."
echo ""

if command -v yarn >/dev/null 2>&1 && [[ -f "yarn.lock" ]]; then
  yarn quasar dev -m ssr
else
  npx quasar dev -m ssr
fi
