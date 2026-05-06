# Sustainable Model Village Management System

An open-source web platform designed to transform rural African villages from memory-based, trial-and-error operations into data-driven, systematically managed communities.

Built for the Katete District model village in Zambia's Eastern Province, this system provides integrated management infrastructure for agricultural performance, educational outcomes, financial sustainability, and community development progress.

## Requirements

Before installing and running the Village Management System, ensure you have the following tools installed on your computer:

### Essential Tools

- **Docker Desktop** - Required for self-hosting Appwrite backend (if not using Appwrite Cloud)
  - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
  - Verify with: `docker --version`

- **Node.js** (v20 LTS or later) - JavaScript runtime for the application
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify with: `node --version`

- **Git** - Version control for cloning the repository
  - Download from [git-scm.com](https://git-scm.com/downloads)
  - Verify with: `git --version`

### Package Managers

Choose one of the following (Yarn recommended):

- **Yarn** (v1.21.1 or later) - Fast, reliable package manager
  - Install with: `npm install -g yarn`
  - Verify with: `yarn --version`

- **npm** (v6.13.4 or later) - Comes bundled with Node.js
  - Verify with: `npm --version`

### Command Line Tools

- **Terminal** (Windows: PowerShell or Command Prompt; macOS/Linux: Terminal)
- Basic familiarity with command line operations (navigating directories, running commands)

### Development CLI Tools

- **Quasar CLI** - Required for building and running the Quasar application
  - Install with: `npm install -g @quasar/cli`
  - Verify with: `quasar --version`

- **Appwrite CLI** (Optional) - For managing Appwrite projects from the command line
  - Install with: `npm install -g appwrite-cli`
  - Verify with: `appwrite --version`
  - Useful for: deploying functions, managing databases, and automating Appwrite tasks

### Appwrite Account

- **Appwrite Cloud account** (free tier available) at [cloud.appwrite.io](https://cloud.appwrite.io)
  - OR
- **Self-hosted Appwrite** via Docker (installation instructions below)

> **Note:** All tools listed above are free and open-source. Installation instructions for Docker and Appwrite are provided in the Installation section below.

## Features

- **Core Modules:** Residents, Households, Finance, Inventory, Calendar, Storage
- **Optional Modules:** Farm Management, School Administration, Guest Programs, Equipment Tracking, Vendor Management, Energy Monitoring
- **Offline-First:** 2-day offline buffer with automatic sync
- **Role-Based Access:** 11 distinct user roles with granular permissions
- **Mobile-Responsive:** Optimized for desktop, tablet, and mobile devices

## Roadmap

This roadmap tracks the implementation status of all MVP features organized by epic. Features marked with ✅ are complete, while ☐ indicates work remaining.

### Epic 1: Foundation and Core Infrastructure

**Goal:** Establish technical foundation and core modules that all other functionality depends on.

- ✅ 1.1 - Project Setup and Quasar Appwrite Integration
- ✅ 1.2 - Appwrite Project Structure and Database Schema
- ✅ 1.3 - Authentication System with Email/Password
- ✅ 1.4 - Role-Based Access Control (RBAC) Foundation
- ✅ 1.5 - Dashboard Framework and Layout
- ✅ 1.6 - Households Management CRUD Operations
- ✅ 1.7 - Residents Management CRUD Operations
- ✅ 1.8 - Village Configuration and Default Settings
- ✅ 1.9 - Sample Data Mode (Katete Model Village Seed Data)
- ✅ 1.10 - Dashboard Widgets (Residents and Households Summary)
- ✅ 1.11 - User Profile and Storage Quota Display

### Epic 2: Financial Management and Inventory Tracking

**Goal:** Enable comprehensive financial tracking across all village operations with integrated inventory management.

- ✅ 2.1 - Finance Module: Income Transaction Recording
- ✅ 2.2 - Finance Module: Expense Transaction Recording
- ✅ 2.3 - Finance Module: Admin-Configurable Categories
- ✅ 2.4 - Finance Module: Funding Source Tracking for Donor Accountability
- ✅ 2.5 - Village Lending: Loan Management
- ✅ 2.6 - Inventory Module: Core Inventory Management
- ✅ 2.7 - Inventory Module: Automatic Inventory from Finance Purchases
- ✅ 2.8 - Financial Reports: Basic Reports Suite
- ✅ 2.9 - Finance Dashboard: Comprehensive Financial Overview

### Epic 3: Farm Management and Agricultural Tracking

**Goal:** Enable systematic farm management from seed purchase through harvest to sale, with profitability analysis.

- ✅ 3.1 - Farm Module: Plot Management
- ✅ 3.2 - Farm Module: Crops Database and Management
- ✅ 3.3 - Farm Module: Planting Records with Seed Inventory and Labor Tracking
- ✅ 3.4 - Farm Module: Planting Status Tracking and Lifecycle Management
- ✅ 3.5 - Farm Module: Harvest Recording (Single Day and Multi-Day Aggregate)
- ✅ 3.6 - Farm Module: Continuous Picking Harvests for Perennial Crops
- ✅ 3.7 - Farm Module: Automatic Inventory Creation on Harvest Completion
- ✅ 3.8 - Farm Module: Sales Recording with Finance and Inventory Integration
- ✅ 3.9 - Farm Module: Profitability Analysis and ROI Calculation
- ✅ 3.10 - Farm Module: Yield Analysis, Trend Reporting, and Agronomic Alerts (combined with 3.11)

### Epic 4: School Management and Educational Accountability

**Goal:** Enable systematic tracking of learner performance and teacher effectiveness.

- ☐ 4.1 - School Module: Student Registration and Grade Tracking
- ☐ 4.2 - School Module: Class Scheduling and Attendance
- ☐ 4.3 - School Module: Assessment and Reporting
- ☐ 4.4 - School Module: Parent Engagement Portal
- ☐ 4.5 - School Module: Teacher Performance and Development
- ☐ 4.6 - School Module: Student Support and Intervention Tracking
- ☐ 4.7 - School Module: Extracurricular Program Management
- ☐ 4.8 - School Module: Resource Library and Document Management
- ☐ 4.9 - School Module: Community Service Tracking
- ☐ 4.10 - School Module: Education Analytics Dashboard

### Epic 5: Village Calendar, Storage, and Optional Modules

**Goal:** Complete the integrated village management platform with shared calendar, cloud storage, and optional modules.

- ☐ 5.1 - Calendar Module: Community Events Scheduling
- ☐ 5.2 - Calendar Module: Resource Bookings and Availability
- ☐ 5.3 - Storage Module: Document Versioning and Access Control
- ☐ 5.4 - Storage Module: Photo and Media Archive
- ☐ 5.5 - Storage Module: Forms and Template Management
- ☐ 5.6 - Communications Module: Announcements and Alerts
- ☐ 5.7 - Communications Module: Feedback and Surveys
- ☐ 5.8 - Analytics Module: Impact Metrics Dashboard
- ☐ 5.9 - Optional Module: Village Marketplace
- ☐ 5.10 - Optional Module: External Integrations and Open APIs

**Progress Summary:** 35 of 50 MVP features completed (70%)

## Tech Stack

- **Frontend:** Quasar Framework v2 (Vue 3 + Vite + SSR)
- **Backend:** Appwrite v21.2.1 (Auth, Database, Storage, Functions)
- **State Management:** Pinia
- **Offline Sync:** IndexedDB + Dexie.js
- **Charts:** Chart.js v4.5.1
- **Calendar:** vue-cal v5

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for self-hosted Appwrite)
- Node.js >= 20 LTS
- Yarn >= 1.21.1 or npm >= 6.13.4
- Appwrite account (cloud or self-hosted)

## Installation

### 1. Install Docker and Appwrite (Self-Hosted)

This project uses [Appwrite](https://appwrite.io) as its backend. You can use Appwrite Cloud or run it locally with Docker. The steps below cover self-hosting.

#### Install Docker

Docker is required to run Appwrite locally.

**Windows:**

1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
2. Run the installer and follow the prompts (keep defaults).
3. Restart your computer if prompted.
4. Open a terminal and verify Docker is running:

```bash
docker --version
```

You should see something like `Docker version 27.x.x`.

**macOS:**

1. Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/).
2. Open the `.dmg` file and drag Docker to your Applications folder.
3. Launch Docker from Applications and wait for it to start (whale icon in menu bar).
4. Verify in terminal:

```bash
docker --version
```

**Linux (Ubuntu/Debian):**

```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io docker-compose-plugin

# Start Docker and enable on boot
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to the docker group (avoids needing sudo)
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker --version
```

#### Install Appwrite

Once Docker is running, install Appwrite with a single command:

**Windows (PowerShell):**

```powershell
docker run -it --rm `
    --volume /var/run/docker.sock:/var/run/docker.sock `
    --volume "${pwd}/appwrite:/usr/src/code/appwrite:rw" `
    --entrypoint="install" `
    appwrite/appwrite:1.8.1
```

**macOS / Linux:**

```bash
docker run -it --rm \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
    --entrypoint="install" \
    appwrite/appwrite:1.8.1
```

During installation you'll be asked a few questions:

- **HTTP port:** Press Enter to accept the default (`80`), or choose another port (e.g., `8080`).
- **HTTPS port:** Press Enter to accept the default (`443`), or choose another port.
- **Hostname:** Enter `localhost` for local development.

Once installation finishes, Appwrite will be running. Open your browser and go to:

```
http://localhost    (or http://localhost:8080 if you chose port 8080)
```

Create your first admin account, then create a new **Project** — you'll need the Project ID for the next steps.

> **Tip:** To stop Appwrite later, navigate to the `appwrite` folder that was created and run `docker compose down`. To start it again, run `docker compose up -d` from that same folder.

### 2. Clone the repository

```bash
git clone https://github.com/kamalsprasad/village-management.git
cd village-management
```

### 3. Install dependencies

```bash
yarn
# or
npm install
```

### 4. Configure Appwrite

1. If you haven't already, create an Appwrite project (either at [cloud.appwrite.io](https://cloud.appwrite.io) or your local self-hosted instance from Step 1).
2. Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

3. Update `.env` with your Appwrite credentials:

```env
# For Appwrite Cloud:
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1

# For local self-hosted Appwrite (default port):
# VITE_APPWRITE_ENDPOINT=http://localhost/v1

VITE_APPWRITE_PROJECT_ID=your-project-id-here
```

**Note:** Environment variables must be prefixed with `VITE_` for Vite to expose them to the client.

### 5. Create Appwrite API Key

You need an API key for database setup and function deployment.

1. In the Appwrite Console, navigate to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name it `Database Setup & Functions`
4. Select scopes:
   - ✅ **Database** (all permissions)
   - ✅ **Users** (read permission for functions)
5. Click **"Create"** and copy the API key immediately
6. Add it to your `.env` file:

```env
VITE_APPWRITE_API_KEY=your-api-key-here
```

### 6. Set up the Database

The application requires database tables, columns, indexes, and permissions. You can set this up automatically.

**Automated Setup (Recommended):**

```bash
npm run setup:appwrite
```

This script will:

- ✅ Create all tables (users, residents, households, roles, inventory, etc.)
- ✅ Create all columns with correct types and constraints
- ✅ Create indexes for optimal query performance
- ✅ Configure permissions for authenticated users

**Manual Setup:**

If you prefer manual setup or encounter issues, see `appwrite_setup/README.md` for detailed step-by-step instructions.

### 7. Deploy Appwrite Functions (Required)

The application requires two server-side functions to be deployed in Appwrite.

#### Using Appwrite CLI (Recommended)

The easiest way to deploy functions is using the Appwrite CLI. The repository already includes `server/appwrite.config.json`, so you can skip initialization.

1. **Login to Appwrite:**

```bash
appwrite login
```

Follow the prompts to authenticate with your Appwrite account.

2. **Deploy the functions:**

```bash
# Deploy Appwrite Cloud functions
cd server/
appwrite push functions
```

You should see a prompt asking which functions to deploy. Select both functions.
Select "y" when prompted if you want to deploy both functions.

4. **Set Function Environment Variables:**

After deployment, set environment variables for each function in the Appwrite Console:

- Navigate to **Functions** → Select function → **Settings** tab
- Add the following environment variables:
  - `APPWRITE_ENDPOINT` (use `http://host.docker.internal/v1` for self-hosted, or your cloud endpoint)
  - `APPWRITE_PROJECT_ID` (your project ID)
  - `APPWRITE_API_KEY` (the API key from Step 5)

5. **Update .env with Function IDs:**

After deployment, copy the Function IDs from the Appwrite Console and add to your `.env`:

```env
VITE_APPWRITE_FUNCTION_CHECK_USERS=checkUsersExist
VITE_APPWRITE_FUNCTION_WIPE_DATA=wipeAllData
```

#### Manual Deployment (Alternative)

If you prefer manual deployment via the Appwrite Console, see `appwrite_setup/QUICK_START.md` for detailed step-by-step instructions.

> **Note:** Function environment variables must be configured in the Appwrite Console under each function's Settings tab — not in your local `.env` file. Functions run in isolated containers.

### 8. Start the development server

```bash
quasar dev -m ssr
```

The application will be available at `http://localhost:9100` (or the next available port).

## Database Schema

For detailed database schema documentation, including table definitions, relationships, indexes, permissions, and example queries, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## Sample Data Mode

The Village Management System includes a **Sample Data Mode** that allows you to explore the platform with realistic demonstration data before committing to production use.

### First-Time Setup

When you first run the application (with no existing settings), you'll be presented with a setup wizard offering two options:

1. **Explore with Sample Data** (Recommended) - Loads the Katete Model Village dataset
2. **Start Fresh with Real Data** - Coming in a future update

### Katete Model Village Dataset

The sample data includes:

- **6 Households**: Various types (SingleFamily, MultiFamily, Dormitory, AdminBuilding, GuestHouse)
- **20+ Residents**: Realistic Zambian names from families including Banda, Phiri, Mwale, Tembo, Zulu, and Mulenga
- **3 Council Members**: Village Head, Deputy Village Head, and Finance Manager
- **Village Configuration**: Pre-configured settings for Katete District, Eastern Province, Zambia

### Sample Data Banner

When using sample data, a persistent yellow banner appears at the top of all pages indicating you're in **Sample Data Mode**. This banner includes a "Start Fresh - Wipe All Data" button to reset the system.

### Wiping Sample Data

To start fresh:

1. Click "Start Fresh - Wipe All Data" in the banner
2. Type "DELETE EVERYTHING" exactly in the confirmation dialog
3. Click "Wipe All Data"
4. You'll be redirected to the setup wizard

**Note:** Only System Administrators can wipe data. The wipe operation is verified server-side.

### Developer Seed Script

For development and testing, you can also seed sample data via command line:

```bash
npm run seed:sample
```

This creates the same Katete Model Village dataset as the client-side seeding.
