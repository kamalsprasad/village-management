# Sustainable Model Village Management System

An open-source web platform designed to transform rural African villages from memory-based, trial-and-error operations into data-driven, systematically managed communities.

Built for the Katete District model village in Zambia's Eastern Province, this system provides integrated management infrastructure for agricultural performance, educational outcomes, financial sustainability, and community development progress.

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
- ☐ 2.6 - Inventory Module: Core Inventory Management
- ☐ 2.7 - Inventory Module: Automatic Inventory from Finance Purchases
- ☐ 2.8 - Financial Reports: Basic Reports Suite
- ☐ 2.9 - Finance Dashboard: Comprehensive Financial Overview

### Epic 3: Farm Management and Agricultural Tracking

**Goal:** Enable systematic farm management from seed purchase through harvest to sale, with profitability analysis.

- ☐ 3.1 - Farm Module: Plot Management
- ☐ 3.2 - Farm Module: Crops Database and Management
- ☐ 3.3 - Farm Module: Planting Records with Seed Inventory and Labor Tracking
- ☐ 3.4 - Farm Module: Planting Status Tracking and Lifecycle Management
- ☐ 3.5 - Farm Module: Harvest Recording (Single Day and Multi-Day Aggregate)
- ☐ 3.6 - Farm Module: Continuous Picking Harvests for Perennial Crops
- ☐ 3.7 - Farm Module: Automatic Inventory Creation on Harvest Completion
- ☐ 3.8 - Farm Module: Sales Recording with Finance and Inventory Integration
- ☐ 3.9 - Farm Module: Profitability Analysis and ROI Calculation
- ☐ 3.10 - Farm Module: Yield Analysis and Trend Reporting
- ☐ 3.11 - Farm Module: Agronomic Insights and Recommendations

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

**Progress Summary:** 14 of 51 MVP features completed (27%)

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
