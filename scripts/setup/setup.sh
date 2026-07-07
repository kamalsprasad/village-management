#!/usr/bin/env bash
#
# Village Management System - Linux/macOS Setup Wizard
#
# This script sets up the local development environment for the Village
# Management System, including Appwrite backend selection, .env generation,
# database setup, role seeding, and dev server startup.
#
# Usage: ./scripts/setup/setup.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_step() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# Platform detection
PLATFORM="$(uname -s)"
if [[ "$PLATFORM" != "Linux" && "$PLATFORM" != "Darwin" ]]; then
  log_error "This script is for Linux and macOS only."
  exit 1
fi

cd "$ROOT_DIR"

# ── Helpers ───────────────────────────────────────────────────────────────────

has_command() {
  command -v "$1" >/dev/null 2>&1
}

get_node_version() {
  node --version 2>/dev/null | sed 's/v//'
}

version_ge() {
  # Returns 0 if $1 >= $2 (both x.y.z)
  local a1 a2 a3 b1 b2 b3
  IFS=. read -r a1 a2 a3 <<< "$1"
  IFS=. read -r b1 b2 b3 <<< "$2"
  [ "${a1:-0}" -ge "${b1:-0}" ] || return 1
  [ "${a1:-0}" -gt "${b1:-0}" ] && return 0
  [ "${a2:-0}" -ge "${b2:-0}" ] || return 1
  [ "${a2:-0}" -gt "${b2:-0}" ] && return 0
  [ "${a3:-0}" -ge "${b3:-0}" ]
}

install_npm_global() {
  local pkg="$1"
  local cmd="$2"
  if has_command "$cmd"; then
    log_success "$pkg is already installed."
    return 0
  fi
  log_info "Installing $pkg globally..."
  if has_command yarn; then
    yarn global add "$pkg" || npm install -g "$pkg"
  else
    npm install -g "$pkg"
  fi
  log_success "$pkg installed."
}

wait_for_url() {
  local url="$1"
  local max_attempts="${2:-30}"
  local attempt=0
  log_info "Waiting for $url to become reachable..."
  while [[ $attempt -lt $max_attempts ]]; do
    if curl -fsS "$url" >/dev/null 2>&1 || wget -qO- "$url" >/dev/null 2>&1; then
      log_success "$url is reachable."
      return 0
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
  done
  echo
  log_error "$url did not become reachable within $((max_attempts * 2)) seconds."
  return 1
}

# ── Phase 1: Prerequisites ───────────────────────────────────────────────────

log_step "Checking prerequisites"

if ! has_command node; then
  log_error "Node.js is not installed."
  echo
  echo "Please install Node.js v20 LTS or newer:"
  echo "  - macOS/Linux: https://nodejs.org/en/download/"
  echo "  - or use a version manager: nvm (https://github.com/nvm-sh/nvm)"
  exit 1
fi

NODE_VERSION="$(get_node_version)"
if ! version_ge "$NODE_VERSION" "20.0.0"; then
  log_error "Node.js v${NODE_VERSION} is too old. Node.js v20+ is required."
  exit 1
fi
log_success "Node.js v${NODE_VERSION} found."

if ! has_command git; then
  log_error "Git is not installed. Please install Git: https://git-scm.com/downloads"
  exit 1
fi
log_success "Git found."

# Determine package manager
if [[ -f "yarn.lock" ]] && has_command yarn; then
  PKG_MANAGER="yarn"
  PKG_INSTALL="yarn install"
  PKG_RUN="yarn"
elif [[ -f "package-lock.json" ]] && has_command npm; then
  PKG_MANAGER="npm"
  PKG_INSTALL="npm install"
  PKG_RUN="npm run"
else
  if has_command yarn; then
    PKG_MANAGER="yarn"
    PKG_INSTALL="yarn install"
    PKG_RUN="yarn"
  else
    PKG_MANAGER="npm"
    PKG_INSTALL="npm install"
    PKG_RUN="npm run"
  fi
fi
log_info "Using package manager: $PKG_MANAGER"

# ── Phase 2: Self-hosted Appwrite check (if requested later) ──────────────────
# The backend choice is handled by configure-env.js. We ask a quick confirmation
# here so Docker can be checked before long-running setup steps.

log_step "Appwrite backend"

echo "Do you want to set up:"
echo "  1) Appwrite Cloud (recommended - no Docker needed)"
echo "  2) Self-hosted Appwrite via Docker"
read -rp "Enter choice [1]: " BACKEND_CHOICE
BACKEND_CHOICE="${BACKEND_CHOICE:-1}"

if [[ "$BACKEND_CHOICE" == "2" ]]; then
  SELF_HOSTED=1
  if ! has_command docker; then
    log_error "Docker is not installed. Docker Desktop is required for self-hosted Appwrite."
    echo
    echo "Install Docker Desktop first:"
    echo "  - macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo "  - Linux: https://docs.docker.com/desktop/install/linux/"
    exit 1
  fi
  log_success "Docker found."

  # Check if Docker is running
  if ! docker info >/dev/null 2>&1; then
    log_error "Docker is installed but not running. Please start Docker Desktop and try again."
    exit 1
  fi
  log_success "Docker is running."

  log_warn "Self-hosted Appwrite requires a few manual steps in the Docker install wizard."
  read -rp "Press Enter to run the Appwrite Docker install command, or Ctrl+C to cancel..."

  if [[ "$PLATFORM" == "Linux" ]]; then
    docker run -it --rm \
      --volume /var/run/docker.sock:/var/run/docker.sock \
      --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
      --entrypoint="install" \
      appwrite/appwrite:1.8.1
  else
    docker run -it --rm \
      --volume /var/run/docker.sock:/var/run/docker.sock \
      --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
      --entrypoint="install" \
      appwrite/appwrite:1.8.1
  fi

  log_info "Waiting for Appwrite to start at http://localhost/v1..."
  if wait_for_url "http://localhost/v1" 30; then
    log_success "Appwrite appears to be running."
  else
    log_warn "Appwrite may not be ready yet. You can continue and check manually."
  fi

  echo
  log_info "Next steps in the Appwrite Console at http://localhost:"
  echo "  1. Create an admin account."
  echo "  2. Create a new project (note the Project ID)."
  echo "  3. Go to Settings -> API Keys and create a key with Database and Users scopes."
else
  SELF_HOSTED=0
  log_info "Using Appwrite Cloud."
  echo
  echo "Before continuing, please create an Appwrite Cloud account and project:"
  echo "  https://cloud.appwrite.io"
  echo
  echo "Then create an API key:"
  echo "  Settings -> API Keys -> Create API Key"
  echo "  Scopes: Database (all), Users (read)"
fi

read -rp "Press Enter when you have your Project ID and API Key ready..."

# ── Phase 3: Install tools and dependencies ───────────────────────────────────

log_step "Installing global tools"
install_npm_global "@quasar/cli" "quasar"
install_npm_global "appwrite-cli" "appwrite"

log_step "Installing project dependencies"
$PKG_INSTALL
log_success "Project dependencies installed."

# ── Phase 4: Environment configuration ────────────────────────────────────────

log_step "Configuring environment files"

if [[ -f ".env" && -f "server/.env" ]]; then
  read -rp "Existing .env and server/.env files found. Overwrite? [y/N]: " OVERWRITE
  OVERWRITE_LOWER=$(echo "$OVERWRITE" | tr '[:upper:]' '[:lower:]')
  if [[ "$OVERWRITE_LOWER" != "y" ]]; then
    log_info "Skipping environment configuration."
  else
    node "$SCRIPT_DIR/configure-env.js"
  fi
else
  node "$SCRIPT_DIR/configure-env.js"
fi

log_success "Environment files configured."

# ── Phase 5: Database setup and seeding ───────────────────────────────────────

log_step "Setting up Appwrite database"
$PKG_RUN setup:appwrite
log_success "Database setup complete."

log_step "Seeding default roles"
$PKG_RUN seed:roles
log_success "Roles seeded."

read -rp "Seed sample/farm data (crops, soil types, village settings)? [y/N]: " SEED_EXTRA
SEED_EXTRA_LOWER=$(echo "$SEED_EXTRA" | tr '[:upper:]' '[:lower:]')
if [[ "$SEED_EXTRA_LOWER" == "y" ]]; then
  log_step "Seeding additional data"
  [[ -f "server/scripts/seed-crops.js" ]] && $PKG_RUN seed:crops || true
  [[ -f "server/scripts/seed-soil-types.js" ]] && $PKG_RUN seed:soil-types || true
  [[ -f "server/scripts/seed-village-settings.js" ]] && $PKG_RUN seed:settings || true
  [[ -f "server/scripts/seed-finance-categories.js" ]] && $PKG_RUN seed:finance-categories || true
  [[ -f "server/scripts/seed-funding-sources.js" ]] && $PKG_RUN seed:funding-sources || true
  log_success "Additional data seeded."
fi

# ── Phase 6: Function deployment ────────────────────────────────────────────

log_step "Deploying Appwrite functions"

cd "$ROOT_DIR/server"

log_info "Logging in to Appwrite CLI (interactive)..."
appwrite login || true

PROJECT_ID=$(grep -E '^VITE_APPWRITE_PROJECT_ID=' "$ROOT_DIR/.env" | cut -d= -f2- | head -n1)
log_info "Initializing project with ID: $PROJECT_ID"
if appwrite init project --project-id "$PROJECT_ID" 2>/dev/null || true; then
  log_info "Project initialized."
fi

log_info "Pushing functions (this will build and deploy checkUsersExist, wipeAllData, seedAllData)..."
appwrite push functions || {
  log_warn "Function deployment encountered an issue. You can deploy manually later."
  echo "  cd server/"
  echo "  appwrite login"
  echo "  appwrite push functions"
}

cd "$ROOT_DIR"

echo
log_warn "Important: set the following environment variables in the Appwrite Console for each deployed function:"
echo "  Functions -> [Function] -> Settings -> Environment Variables"
echo
if [[ "$SELF_HOSTED" == "1" ]]; then
  echo "  APPWRITE_ENDPOINT=http://host.docker.internal/v1"
else
  echo "  APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1"
fi
echo "  APPWRITE_PROJECT_ID=<your-project-id>"
echo "  APPWRITE_API_KEY=<your-api-key>"
echo

read -rp "Press Enter after you have set the function environment variables in the Appwrite Console..."

# ── Phase 7: Start development server ─────────────────────────────────────────

log_step "Starting development server"
log_info "The app will open at http://localhost:9100"
log_info "Press Ctrl+C to stop."

if [[ "$PKG_MANAGER" == "yarn" ]]; then
  yarn quasar dev -m ssr
else
  npx quasar dev -m ssr
fi
