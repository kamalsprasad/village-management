# Village Management System

An open-source web platform to transform independent communities from memory-based operations into data-driven, systematically managed operations.

## Background

While serving as a Peace Corps Volunteer in rural Zambia, I observed that many rural villages lack proper record keeping systems, mostly for their agricultural operations. This leads to great uncertainties in ROI (return on investment) calculations, since farmers don't see the cost of inputs (seed costs, fertilizer, any hired labor, etc.) compared to their yields and the revenue generated from their harvests.

Having a background in software development, I wanted to create a solution that would help such communities transition from memory-based operations to data-driven, systematically managed communities. I expanded the idea of village management to include not just agricultural operations, but also community services, education, healthcare, and other aspects of village life.

## Live Demo

**[https://village.ideacollab.app](https://village.ideacollab.app)**

| Field    | Value               |
| -------- | ------------------- |
| Email    | `brian@village.app` |
| Password | `Village_app2026`   |

> The demo runs on sample data for the Katete Model Village. Data will be reset periodically.

## Screenshots

<table>
  <tr>
    <td align="center">
      <a href="screenshots/farm_dashboard.jpg" target="_blank"><img src="screenshots/farm_dashboard.jpg" width="280" alt="Farm Dashboard"/></a><br/>
      <sub><b>Farm Dashboard</b></sub>
    </td>
    <td align="center">
      <a href="screenshots/farm_sales.jpg" target="_blank"><img src="screenshots/farm_sales.jpg" width="280" alt="Farm Sales"/></a><br/>
      <sub><b>Farm Sales</b></sub>
    </td>
    <td align="center">
      <a href="screenshots/finance_transactions.jpg" target="_blank"><img src="screenshots/finance_transactions.jpg" width="280" alt="Finance Transactions"/></a><br/>
      <sub><b>Finance Transactions</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="screenshots/households.jpg" target="_blank"><img src="screenshots/households.jpg" width="280" alt="Households"/></a><br/>
      <sub><b>Households</b></sub>
    </td>
    <td align="center">
      <a href="screenshots/inventory_manage.jpg" target="_blank"><img src="screenshots/inventory_manage.jpg" width="280" alt="Inventory Management"/></a><br/>
      <sub><b>Inventory Management</b></sub>
    </td>
    <td align="center">
      <a href="screenshots/residents.jpg" target="_blank"><img src="screenshots/residents.jpg" width="280" alt="Residents"/></a><br/>
      <sub><b>Residents</b></sub>
    </td>
  </tr>
</table>

## Requirements

Install these required tools before proceeding:

- **Node.js** (v20 LTS+) - JavaScript runtime ([nodejs.org](https://nodejs.org/))
- **Git** - Version control ([git-scm.com](https://git-scm.com/downloads))
- **Yarn** (recommended) or npm - `npm install -g yarn`
- **Docker Desktop** - Only required for self-hosted Appwrite ([docker.com](https://www.docker.com/products/docker-desktop/))

The automated setup scripts below will install **Quasar CLI** and **Appwrite CLI** globally if they are not already present. If you prefer the manual route, install them with:

```bash
npm install -g @quasar/cli appwrite-cli@16.0.0
```

**Appwrite Account:** [cloud.appwrite.io](https://cloud.appwrite.io) (free tier) or self-hosted via Docker (instructions below).

## Features

- **Core:** Residents, Households, Finance, Inventory, Calendar, Storage
- **Optional:** Farm Management, School Administration, Guest Programs, Equipment Tracking, Vendor Management, Energy Monitoring
- **Offline-First:** 2-day offline buffer with automatic sync
- **Role-Based:** 11 user roles with granular permissions
- **Mobile-Responsive:** Desktop, tablet, and mobile optimized

## Installation

### Video Walkthrough

A step-by-step video guide covering the complete setup process:

[![Setup Walkthrough](https://img.youtube.com/vi/chT54P2n3b8/0.jpg)](https://youtu.be/chT54P2n3b8?si=jVTQt02akGSYxHOY)

### Quick Start (Automated)

The easiest way to get started is with the one-command launcher for your platform. On first run it will:

- Check that Node.js, Git, and (for self-hosted) Docker are installed
- Install Quasar CLI and Appwrite CLI if missing
- Install project dependencies
- Prompt you to choose **Appwrite Cloud** or **self-hosted**
- Create `.env` and `server/.env` with your credentials
- Run the database setup and seed default roles
- Guide you through deploying Appwrite functions
- Start the development server at `http://localhost:9100`

**Run the launcher for your OS:**

```bash
# Linux
./linux.sh

# macOS
./mac.sh
```

```batch
# Windows (double-click or run in Command Prompt)
windows.bat
```

#### 💡 Tips for a Smooth Automated Setup

To ensure the setup script runs without issues, keep these key steps and OS-specific instructions in mind:

##### 🔑 1. User Privileges & System Elevation (OS-Specific)

- **Linux (Ubuntu/Debian/Fedora/Arch)**: The automated setup installs system dependencies (Docker, Node.js, Git) and must be run with root privileges. Run the script as:
  ```bash
  sudo ./linux.sh
  ```
- **Windows**: The launcher will automatically request Administrator elevation. You will see a Windows User Account Control (UAC) prompt; please click **Yes** to allow the PowerShell installer to proceed.
- **macOS**: The launcher can be run with standard privileges. Homebrew or npm will request sudo elevation in the terminal if needed.

##### 🔄 2. WSL & Docker Desktop Reboot (Windows-Specific)

- If WSL (Windows Subsystem for Linux) or Docker Desktop are not already installed on your system, the script will install them using `winget`.
- > [!WARNING]
  > **Mandatory Reboot Required**: Once WSL/Docker installation finishes, Windows requires a system restart. The script will save its current setup state and add a `RunOnce` registry key to automatically resume the setup script in a command window when you log back in. Please be patient after the reboot, as it may take some time to resume.

##### 🐳 3. Self-Hosted Appwrite & Docker (All Platforms)

- If choosing **Self-hosted Appwrite** (Option 2):
  - **Daemon Status**: Docker must be running. The setup script attempts to start Docker Desktop (Windows/macOS) or the Docker service (Linux) and waits up to 2 minutes for it to be ready.
  - **Docker Login**: If a Docker Desktop login window pops up, you can safely **ignore or close** it; it is not required for the setup.
  - **Linux Docker permissions**: If you get a permission denied error connecting to the Docker daemon on Linux, ensure your user is added to the `docker` group. Run `newgrp docker` or re-run with `sudo ./linux.sh`.
  - **Appwrite Installation**: Accept the defaults for all prompts (just press **Enter**) during the Appwrite Docker installation.

##### 🕸️ 4. Appwrite Console Project Configuration (All Platforms)

The setup script will open the Appwrite Console in your browser. You must manually complete the following:

1. **Create an account** (if first-time) and log in.
2. **Create a project** (e.g., ID: `village-management`).
3. **Create a database** (e.g., ID: `villageDB`).
4. **Create an API Key**: Go to **Settings** → **API Keys** → **Create API Key**.
   - > [!IMPORTANT]
     - **CRITICAL API SCOPES**: You **must check all scopes** when creating the API Key. The setup and database seeding scripts require full administrative scopes to configure the tables, default roles, and users.
5. Copy the Project ID, Database ID, and API Key to input into the script's terminal prompt.

##### 🔧 5. Function Global Variables (All Platforms)

In the Appwrite Console, navigate to **Settings** (gear icon on bottom left of the Appwrite sidebar) → **Global Variables** and add the following four variables. This enables the serverless functions to access the backend database:

- `APPWRITE_ENDPOINT`: `https://cloud.appwrite.io/v1` (Cloud) or `http://host.docker.internal/v1` (Self-hosted Windows/macOS) or the gateway IP (Self-hosted Linux).
- `APPWRITE_PROJECT_ID`: Your Appwrite project ID.
- `APPWRITE_API_KEY`: The API Key you generated with **all scopes**.
- `APPWRITE_DATABASE_ID`: Your database ID (default: `villageDB`).

##### 💻 6. Interactive Terminal Prompts (All Platforms)

During the script execution, pay close attention to these prompts:

- **Appwrite CLI Login**: You will see an interactive prompt `appwrite login`. Enter the email and password you used to register on the Appwrite Console.
- **Appwrite Push Functions**: When prompted which functions to deploy:
  1. Press **`a`** (to select all functions).
  2. Press **`Enter`**.
  3. Respond **`y`** (yes) to any subsequent settings deployment prompts.

##### 🛡️ 7. Initial Admin Account Creation (All Platforms)

- At the final step, the script will run `create-admin.js` in your terminal. You must provide:
  - A valid email address.
  - A display name (defaults to "System Administrator").
  - A password (minimum 8 characters, UPPERCASE, lowercase characters and a number).
- This creates the initial account in Appwrite Auth, assigns the System Administrator database role, and adds the user to the `village_administrators` team. Use these credentials to log in to the dev server.

---

For the manual step-by-step setup, continue with the sections below.

### 1. Set Up Appwrite

This project uses [Appwrite](https://appwrite.io) as its backend.

**Quick path:** Use [Appwrite Cloud](https://cloud.appwrite.io) (skip to Step 2)

**Self-hosted:** Requires Docker. See [Docker install docs](https://docs.docker.com/get-docker/) then run:

```bash
# Windows (PowerShell)
docker run -it --rm `
    --volume /var/run/docker.sock:/var/run/docker.sock `
    --volume "${pwd}/appwrite:/usr/src/code/appwrite:rw" `
    --entrypoint="install" `
    appwrite/appwrite:1.8.1

# macOS/Linux
docker run -it --rm \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
    --entrypoint="install" \
    appwrite/appwrite:1.8.1
```

**Prompts:** HTTP port (Enter for 80), HTTPS port (Enter for 443), hostname (`localhost`).

Once finished, Appwrite runs at `http://localhost` (or your chosen port). Create an admin account and project. Save the **Project ID**.

### 2. Clone and Install

```bash
git clone https://github.com/kamalsprasad/village-management.git
cd village-management
yarn  # or npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update your credentials:

```bash
cp .env.example .env
```

```env
# Appwrite Cloud (recommended):
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1

# Self-hosted:
# VITE_APPWRITE_ENDPOINT=http://localhost/v1

VITE_APPWRITE_PROJECT_ID=your-project-id-here
```

**Note:** Variables need `VITE_` prefix for Vite to expose them to the client.

### 4. Create API Key

1. In Appwrite Console, go to **Settings** → **API Keys**
2. Click **"Create API Key"**, name it `Database Setup & Functions`
3. Select scopes: **Database** (all), **Users** (read)
4. Copy the key and add to `.env`:

```env
VITE_APPWRITE_API_KEY=your-api-key-here
```

### 5. Set Up Database

```bash
npm run setup:appwrite
```

Creates all tables, columns, indexes, and permissions. For manual setup, see [appwrite_setup/README.md](appwrite_setup/README.md).

### 5.5 Seed Roles

```bash
npm run seed:roles
```

Creates default roles (Admin, Farmer, Extension Officer, etc.) in the database. This is necessary for a smooth OOBE (Out of the Box) user experience.

### 6. Deploy Functions

Two server functions are required.

**Via Appwrite CLI** (config included at `server/appwrite.config.json`):

```bash
cd server/
appwrite login
appwrite push functions
```

Select both functions when prompted.

**Configure function environment variables** in Appwrite Console (**Functions** → [Function] → **Settings**):

- `APPWRITE_ENDPOINT` (`http://host.docker.internal/v1` for self-hosted, or cloud endpoint)
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`

**Note:** Set function env vars in the Appwrite Console, not `.env`. Functions run in isolated containers.

**Update `.env` with Function IDs:**

```env
VITE_APPWRITE_FUNCTION_CHECK_USERS=checkUsersExist
VITE_APPWRITE_FUNCTION_WIPE_DATA=wipeAllData
```

For manual deployment, see [appwrite_setup/QUICK_START.md](appwrite_setup/QUICK_START.md).

### 7. Start Development Server

```bash
quasar dev -m ssr
```

Opens at `http://localhost:9100`.

---

## Database Schema

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for table definitions, relationships, indexes, and example queries.

## Tech Stack

- **Frontend:** Quasar Framework v2 (Vue 3 + Vite + SSR)
- **Backend:** Appwrite v21.2.1 (Auth, Database, Storage, Functions)
- **State Management:** Pinia
- **Offline Sync:** IndexedDB + Dexie.js
- **Charts:** Chart.js v4.5.1
- **Calendar:** vue-cal v5

## Roadmap

**35 of 50 MVP features complete (70%)**

| Status      | Epic       | Highlights                                                              |
| ----------- | ---------- | ----------------------------------------------------------------------- |
| ✅ Complete | Foundation | Auth, RBAC, Households, Residents, Dashboard                            |
| ✅ Complete | Finance    | Income/expense tracking, lending, reports                               |
| ✅ Complete | Inventory  | Core inventory, auto-stock from purchases                               |
| ✅ Complete | Farm       | Plot management, planting→harvest→sales, profitability & yield analysis |
| ✅ Complete | School     | Student registration, grades, attendance                                |
| 🔄 Next     | Calendar   | Events, resource bookings _(not started)_                               |
| ⏳ Planned  | Storage    | Documents, media, forms                                                 |

**Recently shipped:** Farm sales recording with finance integration, ROI/profitability reports, yield trends & agronomic alerts.

See [ROADMAP.md](ROADMAP.md) for full epic-by-epic breakdown.

## Sample Data

The setup wizard offers **"Explore with Sample Data"** to load the Katete Model Village dataset (6 households, 20+ residents, 3 council members).

**Wipe sample data:** Click "Start Fresh" in the banner, type `DELETE EVERYTHING`, confirm. (Admin only.) You'll need to manually create "Village Administrator" team with team id "village_administrators" in Appwrite Auth console and add the admin user (created at setup) to this team.

## Contributing

Code contributions, questions, and bug reports are welcome! Please follow the project's coding standards and submit pull requests through GitHub.

## If you'd like to financially support this project. :)

<a class="bmc-button" target="_blank" href="https://www.buymeacoffee.com/ksp"><img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="Buy me a Book"><span style="margin-left:5px;font-size:28px !important;">Buy me a coffee.</span></a>

## AI Usage

This project is being built with the help of AI assistants. The following AI tools were used:

- **[WindSurf](https://www.windsurf.com/)** - AI-powered code editor for development and debugging
- **[BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD)** - AI-powered coding methodology for development and debugging
