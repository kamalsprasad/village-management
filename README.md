# Sustainable Model Village Management System

An open-source web platform designed to transform rural African villages from memory-based, trial-and-error operations into data-driven, systematically managed communities.

Built for the Katete District model village in Zambia's Eastern Province, this system provides integrated management infrastructure for agricultural performance, educational outcomes, financial sustainability, and community development progress.

## Features

- **Core Modules:** Residents, Households, Finance, Inventory, Calendar, Storage
- **Optional Modules:** Farm Management, School Administration, Guest Programs, Equipment Tracking, Vendor Management, Energy Monitoring
- **Offline-First:** 2-day offline buffer with automatic sync
- **Role-Based Access:** 11 distinct user roles with granular permissions
- **Mobile-Responsive:** Optimized for desktop, tablet, and mobile devices

## Tech Stack

- **Frontend:** Quasar Framework v2 (Vue 3 + Vite + SSR)
- **Backend:** Appwrite v21.2.1 (Auth, Database, Storage, Functions)
- **State Management:** Pinia
- **Offline Sync:** IndexedDB + Dexie.js
- **Charts:** Chart.js v4.5.1
- **Calendar:** vue-cal v5

## Prerequisites

- Node.js >= 20 LTS
- Yarn >= 1.21.1 or npm >= 6.13.4
- Appwrite account (cloud or self-hosted)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/kamalsprasad/village-management.git
cd village-management
```

### 2. Install dependencies

```bash
yarn
# or
npm install
```

### 3. Configure Appwrite

1. Create an Appwrite project at [cloud.appwrite.io](https://cloud.appwrite.io) or your self-hosted instance
2. Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

3. Update `.env` with your Appwrite credentials:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id-here
```

**Note:** Environment variables must be prefixed with `VITE_` for Vite to expose them to the client.

### 4. Start the development server

```bash
quasar dev -m ssr
```

The application will be available at `http://localhost:9100` (or the next available port).

## Development

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
