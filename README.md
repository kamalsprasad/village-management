# Sustainable Model Village Management System

An open-source web platform to transform rural African villages from memory-based operations into data-driven, systematically managed communities. Built for the Katete District model village in Zambia.

## Requirements

Install these required tools before proceeding:

- **Docker Desktop** - For self-hosted Appwrite ([docker.com](https://www.docker.com/products/docker-desktop/))
- **Node.js** (v20 LTS+) - JavaScript runtime ([nodejs.org](https://nodejs.org/))
- **Git** - Version control ([git-scm.com](https://git-scm.com/downloads))
- **Yarn** (recommended) or npm - `npm install -g yarn`
- **Quasar CLI** - `npm install -g @quasar/cli`
- **Appwrite CLI** (optional) - `npm install -g appwrite-cli`

**Appwrite Account:** [cloud.appwrite.io](https://cloud.appwrite.io) (free tier) or self-hosted via Docker (instructions below).

## Features

- **Core:** Residents, Households, Finance, Inventory, Calendar, Storage
- **Optional:** Farm Management, School Administration, Guest Programs, Equipment Tracking, Vendor Management, Energy Monitoring
- **Offline-First:** 2-day offline buffer with automatic sync
- **Role-Based:** 11 user roles with granular permissions
- **Mobile-Responsive:** Desktop, tablet, and mobile optimized

## Installation

### 1. Set Up Appwrite

This project uses [Appwrite](https://appwrite.io) as its backend.

**Quick path:** Use [Appwrite Cloud](https://cloud.appwrite.io) (skip to Step 2)

**Self-hosted:** Requires Docker. See [Docker install docs](https://docs.docker.com/get-docker/) then run:

```bash
# Windows (PowerShell)
docker run -it --rm `\`
    --volume /var/run/docker.sock:/var/run/docker.sock `\`
    --volume "${pwd}/appwrite:/usr/src/code/appwrite:rw" `\`
    --entrypoint="install" `\`
    appwrite/appwrite:1.8.1

# macOS/Linux
docker run -it --rm \\
    --volume /var/run/docker.sock:/var/run/docker.sock \\
    --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \\
    --entrypoint="install" \\
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
| 🔄 Next     | School     | Student registration, grades, attendance _(not started)_                |
| ⏳ Planned  | Calendar   | Events, resource bookings                                               |
| ⏳ Planned  | Storage    | Documents, media, forms                                                 |

**Recently shipped:** Farm sales recording with finance integration, ROI/profitability reports, yield trends & agronomic alerts.

See [ROADMAP.md](ROADMAP.md) for full epic-by-epic breakdown.

## Sample Data

The setup wizard offers **"Explore with Sample Data"** to load the Katete Model Village dataset (6 households, 20+ residents, 3 council members).

**Wipe sample data:** Click "Start Fresh" in the banner, type `DELETE EVERYTHING`, confirm. (Admin only.)
