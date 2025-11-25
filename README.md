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

## Database Schema

The Village Management System uses Appwrite's TablesDB for data storage with a normalized schema design. All tables use ID-based relationships to prevent data duplication and maintain referential integrity.

### Core Tables

#### users

Stores authentication and user account information.

| Column       | Type     | Constraints                 | Description                           |
| ------------ | -------- | --------------------------- | ------------------------------------- |
| `id`         | string   | Primary Key, Auto-generated | Unique user identifier                |
| `email`      | string   | Required, Unique, Indexed   | User email address for authentication |
| `name`       | string   | Required                    | User's display name                   |
| `created_at` | datetime | Auto-generated              | Account creation timestamp            |
| `updated_at` | datetime | Auto-updated                | Last modification timestamp           |

#### residents

Stores comprehensive resident profile information with multi-role support.

| Column         | Type     | Constraints                          | Description                                 |
| -------------- | -------- | ------------------------------------ | ------------------------------------------- |
| `id`           | string   | Primary Key, Auto-generated          | Unique resident identifier                  |
| `name`         | string   | Required                             | Resident's full name                        |
| `dob`          | datetime | Optional                             | Date of birth                               |
| `gender`       | string   | Optional, Enum: Male/Female/Other    | Gender identity                             |
| `contact`      | string   | Optional                             | Contact information (phone/email)           |
| `household_id` | string   | Foreign Key → households.id, Indexed | Reference to household                      |
| `role_ids`     | string[] | Indexed                              | Array of role IDs for multi-role assignment |
| `created_at`   | datetime | Auto-generated                       | Record creation timestamp                   |
| `updated_at`   | datetime | Auto-updated                         | Last modification timestamp                 |

#### households

Stores household information and composition.

| Column             | Type     | Constraints                         | Description                  |
| ------------------ | -------- | ----------------------------------- | ---------------------------- |
| `id`               | string   | Primary Key, Auto-generated         | Unique household identifier  |
| `name`             | string   | Required                            | Household name or identifier |
| `head_resident_id` | string   | Foreign Key → residents.id, Indexed | Reference to household head  |
| `address`          | string   | Optional                            | Physical address or location |
| `created_at`       | datetime | Auto-generated                      | Record creation timestamp    |
| `updated_at`       | datetime | Auto-updated                        | Last modification timestamp  |

#### roles

Stores role definitions with permissions and storage quotas for RBAC.

| Column          | Type     | Constraints                 | Description                                    |
| --------------- | -------- | --------------------------- | ---------------------------------------------- |
| `id`            | string   | Primary Key, Auto-generated | Unique role identifier                         |
| `name`          | string   | Required, Unique            | Role name (e.g., Admin, Village Head, Teacher) |
| `permissions`   | string[] | Required                    | Array of permission strings                    |
| `storage_quota` | integer  | Required                    | Storage quota in GB                            |
| `created_at`    | datetime | Auto-generated              | Record creation timestamp                      |
| `updated_at`    | datetime | Auto-updated                | Last modification timestamp                    |

### Relationships

The database uses a normalized schema with ID-based relationships:

- **residents → households**: Many-to-one relationship via `residents.household_id` referencing `households.id`
- **households → residents**: One-to-many relationship via `households.head_resident_id` referencing `residents.id`
- **residents → roles**: Many-to-many relationship via `residents.role_ids` array containing role IDs

### Indexes

Indexes are created on frequently queried fields to optimize performance:

| Table        | Column             | Purpose                                 |
| ------------ | ------------------ | --------------------------------------- |
| `users`      | `email`            | Fast user lookup during authentication  |
| `residents`  | `household_id`     | Efficient household member queries      |
| `residents`  | `role_ids`         | Role-based filtering and access control |
| `households` | `head_resident_id` | Quick household head lookups            |

### Permissions

Table-level permissions are configured for role-based access control:

- **Read Access**: All authenticated users can read data from all tables
- **Write Access**: Only users with Admin or Village Head roles can create, update, or delete records
- **Row-Level Permissions**: Future enhancement for user-specific data access

### Example Queries

#### List all residents in a household

```javascript
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';

const householdResidents = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'residents',
  queries: [Query.equal('household_id', 'household_123')],
});
```

#### Get household with head resident details

```javascript
// First, get the household
const household = await tables.getRow({
  databaseId: 'villageDB',
  tableId: 'households',
  rowId: 'household_123',
});

// Then, get the head resident
const headResident = await tables.getRow({
  databaseId: 'villageDB',
  tableId: 'residents',
  rowId: household.head_resident_id,
});
```

#### Find all residents with a specific role

```javascript
const teachers = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'residents',
  queries: [Query.search('role_ids', 'teacher_role_id')],
});
```

#### Create a new resident

```javascript
const newResident = await tables.createRow({
  databaseId: 'villageDB',
  tableId: 'residents',
  rowId: 'unique()',
  data: {
    name: 'John Doe',
    dob: '1990-01-15',
    gender: 'Male',
    contact: '+260-97-123-4567',
    household_id: 'household_123',
    role_ids: ['resident_role_id'],
  },
});
```

### Database Setup

For detailed instructions on setting up the Appwrite database, see [appwrite_setup/README.md](appwrite_setup/README.md).

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
