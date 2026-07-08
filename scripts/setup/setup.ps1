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

function Test-WslInstalled {
  if (-not (Test-Command "wsl")) {
    return $false
  }
  try {
    $feature = Get-WindowsOptionalFeature -Online -FeatureName "Microsoft-Windows-Subsystem-Linux" -ErrorAction Stop
    return ($feature -and $feature.State -eq "Enabled")
  }
  catch {
    # Fallback if Get-WindowsOptionalFeature is not available or fails
    return $true
  }
}

function Get-NodeVersion {
  return (node --version).Trim().TrimStart('v')
}

function Refresh-Env {
  Write-Info "Refreshing environment path from registry..."
  $sysPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$sysPath;$userPath"
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

# Check Node.js
$needsNode = $false
if (-not (Test-Command "node")) {
  Write-Warn "Node.js is not installed."
  $needsNode = $true
} else {
  $NodeVersion = [System.Version](Get-NodeVersion)
  if ($NodeVersion -lt [System.Version]"20.0.0") {
    Write-Warn "Node.js v$NodeVersion is too old. Node.js v20+ is required."
    $needsNode = $true
  } else {
    Write-Ok "Node.js v$NodeVersion found."
  }
}

if ($needsNode) {
  if (Test-Command "winget") {
    Write-Host "Would you like to install/upgrade Node.js v20 LTS automatically using winget? [Y/n]"
    $choice = Read-Host
    if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "y" -or $choice -eq "Y") {
      Write-Info "Installing Node.js LTS via winget... (This might prompt for UAC/Admin permission)"
      Start-Process winget -ArgumentList "install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements" -NoNewWindow -Wait
      Refresh-Env
      if (Test-Command "node") {
        $NodeVersion = [System.Version](Get-NodeVersion)
        Write-Ok "Node.js v$NodeVersion installed successfully."
      } else {
        Write-Error "Node.js was installed but still not found in PATH. You might need to restart your terminal."
        exit 1
      }
    } else {
      Write-Error "Node.js setup declined. Cannot proceed without Node.js v20+."
      exit 1
    }
  } else {
    Write-Error "Node.js v20+ is required, and winget is not available for auto-installation."
    Write-Host "Please install Node.js manually: https://nodejs.org/en/download/"
    exit 1
  }
}

# Check Git
if (-not (Test-Command "git")) {
  Write-Warn "Git is not installed."
  if (Test-Command "winget") {
    Write-Host "Would you like to install Git automatically using winget? [Y/n]"
    $choice = Read-Host
    if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "y" -or $choice -eq "Y") {
      Write-Info "Installing Git via winget... (This might prompt for UAC/Admin permission)"
      Start-Process winget -ArgumentList "install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements" -NoNewWindow -Wait
      Refresh-Env
      if (Test-Command "git") {
        Write-Ok "Git installed successfully."
      } else {
        Write-Error "Git was installed but still not found in PATH. You might need to restart your terminal."
        exit 1
      }
    } else {
      Write-Error "Git setup declined. Cannot proceed without Git."
      exit 1
    }
  } else {
    Write-Error "Git is required, and winget is not available for auto-installation."
    Write-Host "Please install Git manually: https://git-scm.com/downloads"
    exit 1
  }
} else {
  Write-Ok "Git found."
}

# Check Yarn
if (-not (Test-Command "yarn")) {
  Write-Info "Yarn is not installed. Installing Yarn globally..."
  if (Test-Command "npm") {
    npm install -g yarn
    Refresh-Env
    if (Test-Command "yarn") {
      Write-Ok "Yarn installed successfully."
    } else {
      Write-Warn "Yarn installation succeeded but it's not immediately available in PATH. Setup will continue."
    }
  } else {
    Write-Warn "npm is not available to install yarn. Setup will continue."
  }
} else {
  Write-Ok "Yarn found."
}

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
    Write-Warn "Docker is not installed. Docker Desktop is required for self-hosted Appwrite."
    if (Test-Command "winget") {
      Write-Host "Would you like to install Docker Desktop automatically using winget? [Y/n]"
      $choice = Read-Host
      if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "y" -or $choice -eq "Y") {
        # Check and install WSL if not installed
        if (-not (Test-WslInstalled)) {
          Write-Info "WSL (Windows Subsystem for Linux) is not installed or enabled. Installing WSL first..."
          Write-Warn "Note: WSL installation will require a system reboot."
          Start-Process wsl -ArgumentList "--install" -NoNewWindow -Wait
          Write-Ok "WSL installation triggered."
        } else {
          Write-Ok "WSL is already installed."
        }

        Write-Info "Installing Docker Desktop via winget... (This might prompt for UAC/Admin permission)"
        Write-Warn "Note: This will enable virtualization features and requires a system reboot."
        Start-Process winget -ArgumentList "install --id Docker.DockerDesktop -e --silent --accept-source-agreements --accept-package-agreements" -NoNewWindow -Wait
        
        # Configure RunOnce registry key to auto-continue setup after reboot
        try {
          Write-Info "Configuring automatic setup continuation after reboot..."
          Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce" -Name "VillageManagementSetup" -Value "cmd.exe /c `"$RootDir\windows.bat`""
          Write-Ok "Automatic continuation configured successfully."
        }
        catch {
          Write-Warn "Failed to configure automatic continuation: $_"
        }
        
        Write-Ok "Docker Desktop installation triggered."
        Write-Warn "IMPORTANT: You MUST reboot your computer for virtualization and Docker service to initialize properly."
        Write-Host "The script will automatically resume setup once you reboot and log in."
        Write-Host "Would you like to reboot your computer now? [y/N]"
        $rebootChoice = Read-Host
        if ($rebootChoice -eq "y" -or $rebootChoice -eq "Y") {
          Write-Info "Restarting computer..."
          Restart-Computer
        } else {
          Write-Host "Please manually restart your PC to complete setup."
          pause
        }
        exit 0
      } else {
        Write-Error "Docker setup declined. Cannot proceed with self-hosted Appwrite."
        exit 1
      }
    } else {
      Write-Error "Docker is not installed and winget is not available for auto-installation."
      Write-Host "Please install Docker Desktop manually:"
      Write-Host "  https://docs.docker.com/desktop/install/windows-install/"
      exit 1
    }
  }
  Write-Ok "Docker found."

  $dockerRunning = $false
  while (-not $dockerRunning) {
    try {
      docker info 2>&1 | Out-Null
      $dockerRunning = $true
      Write-Ok "Docker is running."
    }
    catch {
      Write-Warn "Docker is installed but not running. Please make sure Docker Desktop is running."
      Write-Host "If Docker Desktop has just been installed or is starting up, please open it manually and wait for it to initialize."
      $retry = Read-Host "Press Enter to retry checking Docker status, or Ctrl+C to cancel..."
    }
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

Write-Info "Creating required team: village_administrators..."
appwrite teams create --teamId village_administrators --name "Administrators" 2>$null

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
