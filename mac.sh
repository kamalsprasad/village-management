#!/usr/bin/env bash
#
# Village Management System - macOS Launcher
#
# Double-click or run: ./mac.sh
# If you get "Permission denied", run:  chmod +x mac.sh
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

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[ERROR] This script is for macOS. Please run ./linux.sh on Linux." >&2
  exit 1
fi

# Load Homebrew if it exists but is not in PATH
if ! command -v brew >/dev/null 2>&1; then
  if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -f "/usr/local/bin/brew" ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi

# Load NVM if it exists
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  export NVM_DIR="$HOME/.nvm"
  \. "$NVM_DIR/nvm.sh"
fi

echo "============================================================"
echo "  Village Management System  |  macOS"
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
echo "Environment already configured. Starting dev server..."
echo "The app will be available at http://localhost:9100"
echo "Press Ctrl+C to stop."
echo ""

if command -v yarn >/dev/null 2>&1 && [[ -f "yarn.lock" ]]; then
  yarn quasar dev -m ssr
else
  npx quasar dev -m ssr
fi
