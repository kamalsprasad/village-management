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

# Setup session state for continuation after reboot
$StateFile = Join-Path $RootDir ".setup-state.json"
$State = $null
if (Test-Path $StateFile) {
  try {
    $State = Get-Content $StateFile | ConvertFrom-Json
    Write-Info "Found existing setup state. Resuming setup session..."
  }
  catch {
    Write-Warn "Could not read setup state: $_"
  }
}

function Write-ActionRequired {
  param([string[]]$Lines)
  $border = "*" * 64
  Write-Host ""
  Write-Host $border -ForegroundColor Yellow
  Write-Host "*  ACTION REQUIRED                                            *" -ForegroundColor Yellow
  Write-Host $border -ForegroundColor Yellow
  foreach ($line in $Lines) {
    Write-Host "  $line" -ForegroundColor White
  }
  Write-Host $border -ForegroundColor Yellow
  Write-Host ""
}

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
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
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
  throw "$url did not become reachable within $(($maxAttempts * 2)) seconds."
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

$BackendChoice = $null
if ($State -and $State.BackendChoice) {
  $BackendChoice = $State.BackendChoice
  Write-Info "Resuming setup with backend choice: $BackendChoice"
} else {
  Write-Host "Do you want to set up:"
  Write-Host "  1) Appwrite Cloud (recommended - no Docker needed)"
  Write-Host "  2) Self-hosted Appwrite via Docker"
  $BackendChoice = Read-Host "Enter choice [1]"
  if ([string]::IsNullOrWhiteSpace($BackendChoice)) { $BackendChoice = "1" }
}

$SelfHosted = $false
if ($BackendChoice -eq "2") {
  $SelfHosted = $true

  if (-not (Test-Command "docker")) {
    Write-Warn "Docker is not installed. Docker Desktop is required for self-hosted Appwrite."
    if (Test-Command "winget") {
      $AttemptedDocker = ($State -and $State.Step -eq "DockerInstall")
      $choice = "y"
      if (-not $AttemptedDocker) {
        Write-Host "Would you like to install Docker Desktop automatically using winget? [Y/n]"
        $choice = Read-Host
      }
      if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "y" -or $choice -eq "Y") {
        # Save state before installing Docker / WSL / rebooting
        try {
          $SaveState = @{
            BackendChoice = "2"
            Step = "DockerInstall"
          }
          $SaveState | ConvertTo-Json | Out-File -FilePath $StateFile -Encoding utf8
          Write-Ok "Setup state saved."
        }
        catch {
          Write-Warn "Failed to save setup state: $_"
        }

        # Check and install WSL if not installed
        if (-not (Test-WslInstalled)) {
          Write-Info "WSL (Windows Subsystem for Linux) is not installed or enabled. Installing WSL first..."
          Write-Warn "Note: WSL installation will require a system reboot."
          Start-Process wsl -ArgumentList "--install --no-distribution" -NoNewWindow -Wait
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

  # Try to auto-launch Docker Desktop if it's not running
  $dockerRunning = $false
  try {
    $job = Start-Job -ScriptBlock { docker info 2>&1 | Out-Null }
    if (Wait-Job $job -Timeout 5) {
      if ($job.State -eq "Completed") { $dockerRunning = $true }
    }
    Remove-Job $job -Force -ErrorAction SilentlyContinue
  }
  catch {}

  if (-not $dockerRunning) {
    Write-Info "Docker Desktop is not running. Attempting to start it..."
    $dockerExe = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerExe) {
      Start-Process $dockerExe
      Write-Info "Docker Desktop launched. Waiting for it to become ready (this can take 30-90 seconds)..."
      Write-Info "If you see an option to login into Docker, you can skip it, it is not required for this application."
    } else {
      Write-Warn "Could not find Docker Desktop executable. Please start Docker Desktop manually."
    }

    $maxWaitSecs = 120
    $elapsed = 0
    $interval = 5
    while ($elapsed -lt $maxWaitSecs) {
      Start-Sleep -Seconds $interval
      $elapsed += $interval
      Write-Host -NoNewline "`r  Waiting... ${elapsed}s / ${maxWaitSecs}s"

      try {
        $job = Start-Job -ScriptBlock { docker info 2>&1 | Out-Null }
        if (Wait-Job $job -Timeout 10) {
          if ($job.State -eq "Completed" -and $job.ChildJobs[0].Error.Count -eq 0) {
            $dockerRunning = $true
          }
        }
        Remove-Job $job -Force -ErrorAction SilentlyContinue
      }
      catch {}

      if ($dockerRunning) { break }
    }
    Write-Host ""

    if (-not $dockerRunning) {
      Write-Error "Docker Desktop did not become ready within $maxWaitSecs seconds."
      Write-Host "  Troubleshooting tips:"
      Write-Host "    - Right-click the Docker icon in the system tray and choose 'Restart Docker Desktop'"
      Write-Host "    - If it stays on 'Docker starting...', quit Docker Desktop and reopen it"
      Write-Host "    - Then re-run this script"
      exit 1
    }
  }
  Write-Ok "Docker is running."

  Write-Warn "Self-hosted Appwrite requires a few manual steps in the Docker install wizard."
  Write-Info "If you see a WSL window, you can close it. You can also close the Docker Desktop window."
  Write-Info "You can press enter for all the Appwrite questions to use default settings."
  Read-Host "Press Enter to run the Appwrite Docker install command, or Ctrl+C to cancel..."

  docker run -it --rm `
    --volume /var/run/docker.sock:/var/run/docker.sock `
    --volume "${pwd}\appwrite:/usr/src/code/appwrite:rw" `
    --entrypoint="install" `
    appwrite/appwrite:1.8.1

  Write-Info "Waiting for Appwrite to start at http://localhost..."
  try {
    Wait-ForUrl "http://localhost" 30
  }
  catch {
    Write-Warn "Appwrite may not be ready yet. You can continue and check manually."
  }

  Write-Info "Opening Appwrite Console at http://localhost in your browser..."
  try { Start-Process "http://localhost" } catch {}

  Write-ActionRequired @(
    "Complete these steps in the Appwrite Console (http://localhost):",
    "",
    "  1. Create an admin account (first-time only) by clicking on the 'Sign up' button.",
    "  2. Create a new project and set the Project ID to something like 'village-management'",
    "  3. Go to Settings -> View API Keys -> Create API Key",
    "  4. Create a new database. Go to Databases -> Create Database. Set Database ID to something like 'villageDB' "
    "     Scopes needed: Select all",
    "",
    "You will need the Project ID, Database ID and API Key in the next step."
  )
}
else {
  Write-Info "Using Appwrite Cloud."
  Write-Info "Opening Appwrite Cloud Console in your browser..."
  try { Start-Process "https://cloud.appwrite.io" } catch {}

  Write-ActionRequired @(
    "Complete these steps at https://cloud.appwrite.io:",
    "",
    "  1. Create an Appwrite Cloud account (if you don't have one)",
    "  2. Create a new project and set the Project ID to something like 'village-management'",
    "  3. Go to Settings -> View API Keys -> Create API Key",
    "  4. Create a new database. Go to Databases -> Create Database. Set Database ID to something like 'villageDB' "
    "     Scopes needed: Select all",
    "",
    "You will need the Project ID, Database ID and API Key in the next step."
  )
}

Read-Host "Press Enter when you have your Project ID, Database ID and API Key ready..."

# ── Phase 3: Install tools and dependencies ───────────────────────────────────

Write-Step "Installing global tools"
Install-NpmGlobal "@quasar/cli" "quasar"

# Check and install correct version of Appwrite CLI
$needsAppwrite = $true
if (Test-Command "appwrite") {
  $versionOutput = & appwrite -v 2>$null | Out-String
  if ($versionOutput -match "appwrite version ([\d\.]+)") {
    $currentVersion = $Matches[1]
    if ($currentVersion -eq "16.0.0") {
      Write-Ok "appwrite-cli@16.0.0 is already installed."
      $needsAppwrite = $false
    } else {
      Write-Warn "Found appwrite-cli version $currentVersion, but version 16.0.0 is required."
    }
  } else {
    Write-Warn "Could not detect appwrite-cli version."
  }
}

if ($needsAppwrite) {
  Write-Info "Installing appwrite-cli@16.0.0 globally..."
  npm install -g appwrite-cli@16.0.0
  Write-Ok "appwrite-cli@16.0.0 installed."
}

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
    $env:VILLAGE_BACKEND = if ($SelfHosted) { "self-hosted" } else { "cloud" }
    node "$ScriptDir\configure-env.js"
  }
}
else {
  $env:VILLAGE_BACKEND = if ($SelfHosted) { "self-hosted" } else { "cloud" }
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

$loginCmd = if ($SelfHosted) { "appwrite login --endpoint http://localhost/v1" } else { "appwrite login" }
Write-Info "Logging in to Appwrite CLI (interactive)..."
$loginSuccess = $false
for ($attempt = 1; $attempt -le 3; $attempt++) {
  Invoke-Expression $loginCmd
  if ($?) {
    $loginSuccess = $true
    break
  }
  if ($attempt -lt 3) {
    Write-Warn "Login attempt $attempt of 3 failed. Retrying..."
  }
}
if (-not $loginSuccess) {
  Write-Error "Appwrite CLI login failed after 3 attempts. You can retry manually later with: appwrite login"
  exit 1
}

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
  Write-Host "  cd server"
  Write-Host "  appwrite login"
  Write-Host "  appwrite push functions"
}

Set-Location $RootDir

$endpointValue = if ($SelfHosted) { "http://host.docker.internal/v1" } else { "https://cloud.appwrite.io/v1" }

Write-ActionRequired @(
  "Set environment variables for EACH deployed function:",
  "",
  "  In the Appwrite Console, navigate to:",
  "    Functions -> [Function] -> Settings -> Environment Variables",
  "",
  "  Add these three variables to each function:",
  "",
  "    APPWRITE_ENDPOINT=$endpointValue",
  "    APPWRITE_PROJECT_ID=<your-project-id>",
  "    APPWRITE_API_KEY=<your-api-key>"
)

Read-Host "Press Enter after you have set the function environment variables in the Appwrite Console..."

# Clean up setup state file
if (Test-Path $StateFile) {
  Remove-Item $StateFile -Force -ErrorAction SilentlyContinue
}

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
