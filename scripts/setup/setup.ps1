# Village Management System - Windows Setup Wizard (PowerShell)
#
# This script sets up the local development environment for the Village
# Management System, including Appwrite backend selection, .env generation,
# database setup, role seeding, and dev server startup.
#
# This script is normally invoked by windows.bat with -ExecutionPolicy Bypass.
#

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $RootDir

# Logging helpers
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

function Test-Command($cmd) {
  return [bool](Get-Command -Name $cmd -ErrorAction SilentlyContinue)
}

function Get-NodeVersion {
  return (node --version).Trim().TrimStart('v')
}

function Install-NpmGlobal($package, $command) {
  if (Test-Command $command) {
    Write-Ok "$package is already installed."
    return
  }
  Write-Info "Installing $package globally..."
  npm install -g $package
  Write-Ok "$package installed."
}

function Wait-ForUrl($url, $maxAttempts = 30) {
  Write-Info "Waiting for $url to become reachable..."
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
      if ($response.StatusCode -eq 200) {
        Write-Ok "$url is reachable."
        return
      }
    }
    catch {
      # ignore
    }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
  }
  Write-Host
  throw "$url did not become reachable within $((maxAttempts * 2)) seconds."
}

# ── Phase 1: Prerequisites ───────────────────────────────────────────────────

Write-Step "Checking prerequisites"

if (-not (Test-Command "node")) {
  Write-Error "Node.js is not installed."
  Write-Host ""
  Write-Host "Please install Node.js v20 LTS or newer:"
  Write-Host "  https://nodejs.org/en/download/"
  exit 1
}

$NodeVersion = [System.Version](Get-NodeVersion)
if ($NodeVersion -lt [System.Version]"20.0.0") {
  Write-Error "Node.js v$NodeVersion is too old. Node.js v20+ is required."
  exit 1
}
Write-Ok "Node.js v$NodeVersion found."

if (-not (Test-Command "git")) {
  Write-Error "Git is not installed. Please install Git: https://git-scm.com/downloads"
  exit 1
}
Write-Ok "Git found."

# Determine package manager
if ((Test-Path "yarn.lock") -and (Test-Command "yarn")) {
  $PkgManager = "yarn"
  $PkgInstall = "yarn install"
  $PkgRun = "yarn"
}
elseif ((Test-Path "package-lock.json") -and (Test-Command "npm")) {
  $PkgManager = "npm"
  $PkgInstall = "npm install"
  $PkgRun = "npm run"
}
else {
  if (Test-Command "yarn") {
    $PkgManager = "yarn"
    $PkgInstall = "yarn install"
    $PkgRun = "yarn"
  }
  else {
    $PkgManager = "npm"
    $PkgInstall = "npm install"
    $PkgRun = "npm run"
  }
}
Write-Info "Using package manager: $PkgManager"

# ── Phase 2: Appwrite backend choice ───────────────────────────────────────────

Write-Step "Appwrite backend"

Write-Host "Do you want to set up:"
Write-Host "  1) Appwrite Cloud (recommended - no Docker needed)"
Write-Host "  2) Self-hosted Appwrite via Docker"
$BackendChoice = Read-Host "Enter choice [1]"
if ([string]::IsNullOrWhiteSpace($BackendChoice)) { $BackendChoice = "1" }

$SelfHosted = $false
if ($BackendChoice -eq "2") {
  $SelfHosted = $true

  if (-not (Test-Command "docker")) {
    Write-Error "Docker is not installed. Docker Desktop is required for self-hosted Appwrite."
    Write-Host ""
    Write-Host "Install Docker Desktop first:"
    Write-Host "  https://docs.docker.com/desktop/install/windows-install/"
    exit 1
  }
  Write-Ok "Docker found."

  try {
    docker info | Out-Null
    Write-Ok "Docker is running."
  }
  catch {
    Write-Error "Docker is installed but not running. Please start Docker Desktop and try again."
    exit 1
  }

  Write-Warn "Self-hosted Appwrite requires a few manual steps in the Docker install wizard."
  Read-Host "Press Enter to run the Appwrite Docker install command, or Ctrl+C to cancel..."

  docker run -it --rm `
    --volume /var/run/docker.sock:/var/run/docker.sock `
    --volume "${pwd}\appwrite:/usr/src/code/appwrite:rw" `
    --entrypoint="install" `
    appwrite/appwrite:1.8.1

  Write-Info "Waiting for Appwrite to start at http://localhost/v1..."
  try {
    Wait-ForUrl "http://localhost/v1" 30
  }
  catch {
    Write-Warn "Appwrite may not be ready yet. You can continue and check manually."
  }

  Write-Host ""
  Write-Info "Next steps in the Appwrite Console at http://localhost:"
  Write-Host "  1. Create an admin account."
  Write-Host "  2. Create a new project (note the Project ID)."
  Write-Host "  3. Go to Settings -> API Keys and create a key with Database and Users scopes."
}
else {
  Write-Info "Using Appwrite Cloud."
  Write-Host ""
  Write-Host "Before continuing, please create an Appwrite Cloud account and project:"
  Write-Host "  https://cloud.appwrite.io"
  Write-Host ""
  Write-Host "Then create an API key:"
  Write-Host "  Settings -> API Keys -> Create API Key"
  Write-Host "  Scopes: Database (all), Users (read)"
}

Read-Host "Press Enter when you have your Project ID and API Key ready..."

# ── Phase 3: Install tools and dependencies ───────────────────────────────────

Write-Step "Installing global tools"
Install-NpmGlobal "@quasar/cli" "quasar"
Install-NpmGlobal "appwrite-cli" "appwrite"

Write-Step "Installing project dependencies"
Invoke-Expression $PkgInstall
if (-not $?) {
  Write-Error "Dependency installation failed."
  exit 1
}
Write-Ok "Project dependencies installed."

# ── Phase 4: Environment configuration ────────────────────────────────────────

Write-Step "Configuring environment files"

if ((Test-Path ".env") -and (Test-Path "server\.env")) {
  $Overwrite = Read-Host "Existing .env and server\.env files found. Overwrite? [y/N]"
  if ($Overwrite -ne "y" -and $Overwrite -ne "Y") {
    Write-Info "Skipping environment configuration."
  }
  else {
    node "$ScriptDir\configure-env.js"
  }
}
else {
  node "$ScriptDir\configure-env.js"
}

Write-Ok "Environment files configured."

# ── Phase 5: Database setup and seeding ───────────────────────────────────────

Write-Step "Setting up Appwrite database"
Invoke-Expression "$PkgRun setup:appwrite"
if (-not $?) {
  Write-Error "Database setup failed."
  exit 1
}
Write-Ok "Database setup complete."

Write-Step "Seeding default roles"
Invoke-Expression "$PkgRun seed:roles"
if (-not $?) {
  Write-Error "Role seeding failed."
  exit 1
}
Write-Ok "Roles seeded."

$SeedExtra = Read-Host "Seed sample/farm data (crops, soil types, village settings)? [y/N]"
if ($SeedExtra -eq "y" -or $SeedExtra -eq "Y") {
  Write-Step "Seeding additional data"
  if (Test-Path "server\scripts\seed-crops.js") { Invoke-Expression "$PkgRun seed:crops" }
  if (Test-Path "server\scripts\seed-soil-types.js") { Invoke-Expression "$PkgRun seed:soil-types" }
  if (Test-Path "server\scripts\seed-village-settings.js") { Invoke-Expression "$PkgRun seed:settings" }
  if (Test-Path "server\scripts\seed-finance-categories.js") { Invoke-Expression "$PkgRun seed:finance-categories" }
  if (Test-Path "server\scripts\seed-funding-sources.js") { Invoke-Expression "$PkgRun seed:funding-sources" }
  Write-Ok "Additional data seeded."
}

# ── Phase 6: Function deployment ──────────────────────────────────────────────

Write-Step "Deploying Appwrite functions"

Set-Location "$RootDir\server"

Write-Info "Logging in to Appwrite CLI (interactive)..."
appwrite login

$projectId = (Get-Content "$RootDir\.env" | Where-Object { $_ -match '^VITE_APPWRITE_PROJECT_ID=' }) -replace '^VITE_APPWRITE_PROJECT_ID=', '' | Select-Object -First 1
Write-Info "Initializing project with ID: $projectId"
appwrite init project --project-id $projectId 2>$null
if (-not $?) { Write-Warn "Project init step skipped or failed; continuing..." }

Write-Info "Pushing functions (this will build and deploy checkUsersExist, wipeAllData, seedAllData)..."
appwrite push functions
if (-not $?) {
  Write-Warn "Function deployment encountered an issue. You can deploy manually later."
  Write-Host "  cd server\"
  Write-Host "  appwrite login"
  Write-Host "  appwrite push functions"
}

Set-Location $RootDir

Write-Host ""
Write-Warn "Important: set the following environment variables in the Appwrite Console for each deployed function:"
Write-Host "  Functions -> [Function] -> Settings -> Environment Variables"
Write-Host ""
if ($SelfHosted) {
  Write-Host "  APPWRITE_ENDPOINT=http://host.docker.internal/v1"
}
else {
  Write-Host "  APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1"
}
Write-Host "  APPWRITE_PROJECT_ID=<your-project-id>"
Write-Host "  APPWRITE_API_KEY=<your-api-key>"
Write-Host ""

Read-Host "Press Enter after you have set the function environment variables in the Appwrite Console..."

# ── Phase 7: Start development server ─────────────────────────────────────────

Write-Step "Starting development server"
Write-Info "The app will open at http://localhost:9100"
Write-Info "Press Ctrl+C to stop."

if ($PkgManager -eq "yarn") {
  yarn quasar dev -m ssr
}
else {
  npx quasar dev -m ssr
}
