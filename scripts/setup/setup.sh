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

action_required() {
  local border="****************************************************************"
  echo ""
  echo -e "${YELLOW}${border}${NC}"
  echo -e "${YELLOW}*  ACTION REQUIRED                                            *${NC}"
  echo -e "${YELLOW}${border}${NC}"
  while [[ $# -gt 0 ]]; do
    echo -e "  $1"
    shift
  done
  echo -e "${YELLOW}${border}${NC}"
  echo ""
}

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

refresh_brew_path() {
  if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -f "/usr/local/bin/brew" ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
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

install_node() {
  if [[ "$PLATFORM" == "Darwin" ]]; then
    log_info "Attempting to install/upgrade Node.js via Homebrew..."
    refresh_brew_path
    if ! has_command brew; then
      log_warn "Homebrew is not installed/configured."
      read -rp "Would you like to install Homebrew automatically? [Y/n]: " CONFIRM_BREW
      CONFIRM_BREW="${CONFIRM_BREW:-y}"
      if [[ "$CONFIRM_BREW" =~ ^[Yy]$ ]]; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        refresh_brew_path
      else
        log_error "Homebrew not installed. Cannot proceed with automatic Node.js setup."
        return 1
      fi
    fi
    if has_command brew; then
      log_info "Running: brew install node"
      brew install node
      return 0
    fi
  elif [[ "$PLATFORM" == "Linux" ]]; then
    log_info "Attempting to install/upgrade Node.js via system package manager..."
    if has_command apt-get; then
      log_warn "This requires sudo privileges."
      read -rp "Run sudo apt-get update and install nodejs? [Y/n]: " CONFIRM_APT
      CONFIRM_APT="${CONFIRM_APT:-y}"
      if [[ "$CONFIRM_APT" =~ ^[Yy]$ ]]; then
        log_info "Adding NodeSource repository for Node.js v20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        return 0
      fi
    elif has_command dnf; then
      log_warn "This requires sudo privileges."
      read -rp "Run sudo dnf install nodejs? [Y/n]: " CONFIRM_DNF
      CONFIRM_DNF="${CONFIRM_DNF:-y}"
      if [[ "$CONFIRM_DNF" =~ ^[Yy]$ ]]; then
        sudo dnf module enable nodejs:20 -y || true
        sudo dnf install -y nodejs
        return 0
      fi
    elif has_command pacman; then
      log_warn "This requires sudo privileges."
      read -rp "Run sudo pacman -S nodejs npm? [Y/n]: " CONFIRM_PAC
      CONFIRM_PAC="${CONFIRM_PAC:-y}"
      if [[ "$CONFIRM_PAC" =~ ^[Yy]$ ]]; then
        sudo pacman -S --noconfirm nodejs npm
        return 0
      fi
    fi
  fi
  return 1
}

install_node_nvm() {
  log_info "Attempting to install Node.js via NVM (Node Version Manager) in user space..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash || return 1
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
  return 0
}

NEEDS_NODE=0
if ! has_command node; then
  log_warn "Node.js is not installed."
  NEEDS_NODE=1
else
  NODE_VERSION="$(get_node_version)"
  if ! version_ge "$NODE_VERSION" "20.0.0"; then
    log_warn "Node.js v${NODE_VERSION} is too old. Node.js v20+ is required."
    NEEDS_NODE=1
  fi
fi

if [[ "$NEEDS_NODE" == "1" ]]; then
  if install_node || install_node_nvm; then
    hash -r
    refresh_brew_path
    if has_command node && version_ge "$(get_node_version)" "20.0.0"; then
      log_success "Node.js v$(get_node_version) found/installed."
    else
      log_error "Node.js was installed but is still not available or too old. Please restart your shell and try again."
      exit 1
    fi
  else
    log_error "Failed to install Node.js. Please install Node.js v20+ manually."
    exit 1
  fi
fi

# Check Git
install_git() {
  if [[ "$PLATFORM" == "Darwin" ]]; then
    log_info "Installing Git via Homebrew..."
    refresh_brew_path
    if has_command brew; then
      brew install git
      return 0
    fi
  elif [[ "$PLATFORM" == "Linux" ]]; then
    log_info "Installing Git via system package manager..."
    if has_command apt-get; then
      sudo apt-get install -y git && return 0
    elif has_command dnf; then
      sudo dnf install -y git && return 0
    elif has_command pacman; then
      sudo pacman -S --noconfirm git && return 0
    fi
  fi
  return 1
}

if ! has_command git; then
  log_warn "Git is not installed."
  read -rp "Would you like to install Git automatically? [Y/n]: " CONFIRM_GIT
  CONFIRM_GIT="${CONFIRM_GIT:-y}"
  if [[ "$CONFIRM_GIT" =~ ^[Yy]$ ]]; then
    if install_git; then
      hash -r
      if has_command git; then
        log_success "Git installed successfully."
      else
        log_error "Git was installed but is still not available. Please restart your shell and try again."
        exit 1
      fi
    else
      log_error "Failed to install Git automatically. Please install it manually: https://git-scm.com/downloads"
      exit 1
    fi
  else
    log_error "Git is required to proceed. Setup aborted."
    exit 1
  fi
else
  log_success "Git found."
fi

# Check Yarn
if ! has_command yarn; then
  log_info "Yarn is not installed. Installing Yarn globally..."
  if has_command npm; then
    npm install -g yarn || sudo npm install -g yarn || true
    hash -r
    if has_command yarn; then
      log_success "Yarn installed successfully."
    else
      log_warn "Yarn installation succeeded but it is not in the current shell path. Setup will continue using npm."
    fi
  else
    log_warn "npm is not available to install Yarn. Setup will continue."
  fi
else
  log_success "Yarn found."
fi

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
    log_warn "Docker is not installed. Docker Desktop/Engine is required for self-hosted Appwrite."
    read -rp "Would you like to install Docker automatically? [Y/n]: " CONFIRM_DOCKER
    CONFIRM_DOCKER="${CONFIRM_DOCKER:-y}"
    if [[ "$CONFIRM_DOCKER" =~ ^[Yy]$ ]]; then
      if [[ "$PLATFORM" == "Darwin" ]]; then
        refresh_brew_path
        if has_command brew; then
          log_info "Installing Docker Desktop via Homebrew Cask..."
          brew install --cask docker
          log_success "Docker Desktop has been installed. Please open Docker Desktop from Applications to start the daemon."
          read -rp "Press Enter once Docker Desktop is running..."
        else
          log_error "Homebrew is not available. Please install Docker manually."
          exit 1
        fi
      elif [[ "$PLATFORM" == "Linux" ]]; then
        log_info "Installing Docker via package manager..."
        if has_command apt-get; then
          sudo apt-get update
          sudo apt-get install -y docker.io docker-compose
        elif has_command dnf; then
          sudo dnf install -y docker docker-compose
        elif has_command pacman; then
          sudo pacman -S --noconfirm docker docker-compose
        else
          log_error "Unsupported package manager. Please install Docker manually: https://docs.docker.com/engine/install/"
          exit 1
        fi
        
        # Start and enable docker service
        log_info "Starting and enabling Docker service..."
        sudo systemctl start docker || true
        sudo systemctl enable docker || true
        
        # Add current user to docker group
        log_info "Adding $USER to the docker group..."
        sudo usermod -aG docker "$USER" || true
        log_success "Docker installed successfully."
        log_warn "To run docker without sudo, you may need to run 'newgrp docker' or log out and log back in."
      fi
    else
      log_error "Docker installation declined. Cannot proceed with self-hosted Appwrite."
      exit 1
    fi
  fi
  log_success "Docker found."

  # Check if Docker is running (with timeout to avoid hanging during "Docker starting" phase)
  docker_ready=0
  if timeout 5 docker info >/dev/null 2>&1; then
    docker_ready=1
  fi

  if [[ "$docker_ready" == "0" ]]; then
    log_info "Docker Desktop is not running. Attempting to start it..."

    # Try to auto-launch Docker Desktop
    if [[ "$PLATFORM" == "Darwin" ]]; then
      if [[ -d "/Applications/Docker.app" ]]; then
        open -a Docker
        log_info "Docker Desktop launched. Waiting for it to become ready (this can take 30-90 seconds)..."
      else
        log_warn "Could not find Docker Desktop. Please start it manually."
      fi
    else
      # On Linux, try starting the docker service
      if has_command systemctl; then
        sudo systemctl start docker 2>/dev/null || true
        log_info "Docker service start requested. Waiting for it to become ready..."
      else
        log_warn "Please start Docker manually."
      fi
    fi

    max_wait=120
    elapsed=0
    interval=5
    while [[ $elapsed -lt $max_wait ]]; do
      sleep $interval
      elapsed=$((elapsed + interval))
      printf "\r  Waiting... %ds / %ds" "$elapsed" "$max_wait"

      if timeout 10 docker info >/dev/null 2>&1; then
        docker_ready=1
        break
      fi
    done
    echo ""

    if [[ "$docker_ready" == "0" ]]; then
      log_error "Docker did not become ready within $max_wait seconds."
      echo "  Troubleshooting tips:"
      if [[ "$PLATFORM" == "Darwin" ]]; then
        echo "    - Click the Docker icon in the menu bar and choose 'Restart'"
        echo "    - If it stays on 'Docker starting...', quit Docker Desktop and reopen it"
      else
        echo "    - Run: sudo systemctl restart docker"
      fi
      echo "    - Then re-run this script"
      exit 1
    fi
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

  log_info "Waiting for Appwrite to start at http://localhost..."
  if wait_for_url "http://localhost" 30; then
    log_success "Appwrite appears to be running."
  else
    log_warn "Appwrite may not be ready yet. You can continue and check manually."
  fi

  action_required \
    "Complete these steps in the Appwrite Console (http://localhost):" \
    "" \
    "  1. Create an admin account (first-time only)" \
    "  2. Create a new project and set the Project ID to something like 'village-management'" \
    "  3. Go to Settings -> View API Keys -> Create API Key" \
    "  4. Create a new database. Go to Databases -> Create Database. Set Database ID to something like 'villageDB' " \
    "     Scopes needed: Select all", \
    "", \
    "You will need the Project ID, Database ID and API Key in the next step."
else
  SELF_HOSTED=0
  log_info "Using Appwrite Cloud."

  action_required \
    "Complete these steps at https://cloud.appwrite.io:" \
    "" \
    "  1. Create an Appwrite Cloud account (if you don't have one)" \
    "  2. Create a new project and set the Project ID to something like 'village-management'" \
    "  3. Go to Settings -> View API Keys -> Create API Key" \
    "  4. Create a new database. Go to Databases -> Create Database. Set Database ID to something like 'villageDB' " \
    "     Scopes needed: Select all", \
    "", \
    "You will need the Project ID, Database ID and API Key in the next step."
fi

read -rp "Press Enter when you have your Project ID, Database ID and API Key ready..."

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
    VILLAGE_BACKEND=$( [[ "$SELF_HOSTED" == "1" ]] && echo "self-hosted" || echo "cloud" ) node "$SCRIPT_DIR/configure-env.js"
  fi
else
  VILLAGE_BACKEND=$( [[ "$SELF_HOSTED" == "1" ]] && echo "self-hosted" || echo "cloud" ) node "$SCRIPT_DIR/configure-env.js"
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
LOGIN_CMD="appwrite login"
if [[ "$SELF_HOSTED" == "1" ]]; then
  LOGIN_CMD="appwrite login --endpoint http://localhost/v1"
fi
LOGIN_SUCCESS=0
for attempt in 1 2 3; do
  if $LOGIN_CMD; then
    LOGIN_SUCCESS=1
    break
  fi
  if [[ "$attempt" -lt 3 ]]; then
    log_warn "Login attempt $attempt of 3 failed. Retrying..."
  fi
done
if [[ "$LOGIN_SUCCESS" -ne 1 ]]; then
  log_error "Appwrite CLI login failed after 3 attempts. You can retry manually later with: $LOGIN_CMD"
  exit 1
fi

PROJECT_ID=$(grep -E '^VITE_APPWRITE_PROJECT_ID=' "$ROOT_DIR/.env" | cut -d= -f2- | head -n1)
log_info "Initializing project with ID: $PROJECT_ID"
if appwrite init project --project-id "$PROJECT_ID" 2>/dev/null || true; then
  log_info "Project initialized."
fi

log_info "Creating required team: village_administrators..."
appwrite teams create --teamId village_administrators --name "Administrators" 2>/dev/null || true

log_info "Pushing functions (this will build and deploy checkUsersExist, wipeAllData, seedAllData)..."
appwrite push functions || {
  log_warn "Function deployment encountered an issue. You can deploy manually later."
  echo "  cd server/"
  echo "  appwrite login"
  echo "  appwrite push functions"
}

cd "$ROOT_DIR"

if [[ "$SELF_HOSTED" == "1" ]]; then
  ENDPOINT_VALUE="http://host.docker.internal/v1"
else
  ENDPOINT_VALUE="https://cloud.appwrite.io/v1"
fi

action_required \
  "Set environment variables for EACH deployed function:" \
  "" \
  "  In the Appwrite Console, navigate to:" \
  "    Functions -> [Function] -> Settings -> Environment Variables" \
  "" \
  "  Add these three variables to each function:" \
  "" \
  "    APPWRITE_ENDPOINT=$ENDPOINT_VALUE" \
  "    APPWRITE_PROJECT_ID=<your-project-id>" \
  "    APPWRITE_API_KEY=<your-api-key>"

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
