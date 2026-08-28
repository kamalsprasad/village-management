# Appwrite Setup Quick Reference

**Fast lookup guide for Appwrite Tables schemas and configurations**

> **Note:** The schema has grown well beyond the 4 original tables shown below.
> The automated setup script (`npm run setup:appwrite`) now creates **28 tables**,
> **150+ columns**, **25+ indexes**, and **2 storage buckets** across all modules
> (Core, Farm, Finance, School, Calendar, Storage, Notifications). The full
> authoritative schema is in [`server/appwrite.config.json`](../server/appwrite.config.json).
> The 4-table reference below covers only the original core tables; for the
> complete schema, run the setup script or consult the config file.

---

## Database Configuration

- **Database ID:** `villageDB`
- **Database Name:** Village Database

---

## Tables Overview

The full system has 28 tables. The 4 core tables are documented below; the rest
are created automatically by `npm run setup:appwrite`.

| Table ID     | Table Name | Purpose                        | Columns Count |
| ------------ | ---------- | ------------------------------ | ------------- |
| `users`      | Users      | Authentication & profiles      | 4             |
| `residents`  | Residents  | Village resident data          | 8             |
| `households` | Households | Household information          | 5             |
| `roles`      | Roles      | Role definitions & permissions | 5             |

**Full table list** (created by the setup script):

- **Core:** users, residents, households, roles, village_settings
- **Farm:** soil_types, plots, crops, plantings, harvests, harvest_entries, farm_sales, farm_alerts
- **Finance:** finance_categories, funding_sources, loans, inventory, finance_transactions, transaction_links
- **Loan Mgmt:** repayment_schedule, loan_payments
- **School:** school_classes, learners, test_scores, teacher_assignments, learner_attendance, interventions, intervention_notes, school_long_term_goals, school_academic_terms, school_calendar_events, school_period_slots, class_timetable_entries
- **Calendar:** village_events
- **Storage:** file_metadata (buckets: personal_files, shared_files)
- **Notifications:** notifications, notification_reads
- **Admin:** audit_logs

---

## Table Schemas (Core Tables)

### 1. Users Table

| Column       | Type     | Size | Required | Notes           |
| ------------ | -------- | ---- | -------- | --------------- |
| `email`      | String   | 255  | ✅       | Unique, indexed |
| `name`       | String   | 255  | ✅       | Full name       |
| `created_at` | DateTime | -    | ✅       | Auto-generated  |
| `updated_at` | DateTime | -    | ✅       | Auto-updated    |

**Indexes:**

- `email_unique_index` (Unique on `email`)

---

### 2. Residents Table

| Column         | Type     | Size | Required | Array | Notes               |
| -------------- | -------- | ---- | -------- | ----- | ------------------- |
| `name`         | String   | 255  | ✅       | ❌    | Resident full name  |
| `dob`          | DateTime | -    | ❌       | ❌    | Date of birth       |
| `gender`       | Enum     | -    | ❌       | ❌    | Male, Female, Other |
| `contact`      | String   | 100  | ❌       | ❌    | Phone/email         |
| `household_id` | String   | 36   | ❌       | ❌    | FK to households    |
| `role_ids`     | String   | 36   | ❌       | ✅    | Array of role IDs   |
| `created_at`   | DateTime | -    | ✅       | ❌    | Auto-generated      |
| `updated_at`   | DateTime | -    | ✅       | ❌    | Auto-updated        |

**Indexes:**

- `household_id_index` (Key on `household_id`)
- `role_ids_index` (Key on `role_ids`)

**Relationships:**

- `household_id` → `households.$id` (many-to-one)

---

### 3. Households Table

| Column             | Type     | Size | Required | Notes            |
| ------------------ | -------- | ---- | -------- | ---------------- |
| `name`             | String   | 255  | ✅       | Household name   |
| `head_resident_id` | String   | 36   | ❌       | FK to residents  |
| `address`          | String   | 500  | ❌       | Physical address |
| `created_at`       | DateTime | -    | ✅       | Auto-generated   |
| `updated_at`       | DateTime | -    | ✅       | Auto-updated     |

**Indexes:**

- `head_resident_id_index` (Key on `head_resident_id`)

**Relationships:**

- `head_resident_id` → `residents.$id` (one-to-one)

---

### 4. Roles Table

| Column          | Type     | Size | Required | Array | Notes                       |
| --------------- | -------- | ---- | -------- | ----- | --------------------------- |
| `name`          | String   | 100  | ✅       | ❌    | Role name (unique)          |
| `permissions`   | String   | 100  | ❌       | ✅    | Array of permission strings |
| `storage_quota` | Integer  | -    | ❌       | ❌    | Storage in GB (default: 2)  |
| `created_at`    | DateTime | -    | ✅       | ❌    | Auto-generated              |
| `updated_at`    | DateTime | -    | ✅       | ❌    | Auto-updated                |

**Constraints:**

- `storage_quota`: Min: 0, Max: 1000, Default: 2

---

## Permissions Configuration

### All Tables

**Read Access:**

- ✅ Users (any authenticated user)

**Create Access:**

- ✅ Users (any authenticated user)

**Update Access:**

- ✅ Users (any authenticated user)

**Delete Access:**

- ✅ Users (any authenticated user)

**Note:** These are basic permissions. In production, restrict write access to Admin and Village Head roles only.

---

## Indexes Summary

| Table      | Index Name               | Type   | Column(s)        | Order |
| ---------- | ------------------------ | ------ | ---------------- | ----- |
| users      | `email_unique_index`     | Unique | email            | -     |
| residents  | `household_id_index`     | Key    | household_id     | ASC   |
| residents  | `role_ids_index`         | Key    | role_ids         | ASC   |
| households | `head_resident_id_index` | Key    | head_resident_id | ASC   |

> The full system has 25+ indexes across all 28 tables. Run `npm run setup:appwrite`
> to create them automatically, or see `server/appwrite.config.json` for the
> complete list.

---

## Relationships Diagram

```
┌─────────────┐
│    roles    │
│             │
│ - name      │
│ - permissions│
│ - storage_  │
│   quota     │
└─────────────┘
       ▲
       │
       │ role_ids (array)
       │
┌──────┴──────┐         household_id        ┌─────────────┐
│  residents  │────────────────────────────▶│ households  │
│             │                              │             │
│ - name      │                              │ - name      │
│ - dob       │                              │ - address   │
│ - gender    │◀────────────────────────────│ - head_     │
│ - contact   │    head_resident_id          │   resident_ │
│ - household_│                              │   id        │
│   id        │                              │             │
│ - role_ids  │                              │             │
└─────────────┘                              └─────────────┘
       ▲
       │
       │ (linked via auth)
       │
┌─────────────┐
│    users    │
│             │
│ - email     │
│ - name      │
└─────────────┘
```

---

## Sample Data

### Sample Role

```json
{
  "name": "Admin",
  "permissions": ["read:all", "write:all", "delete:all"],
  "storage_quota": 0,
  "created_at": "2025-10-25T10:00:00.000Z",
  "updated_at": "2025-10-25T10:00:00.000Z"
}
```

### Sample Household

```json
{
  "name": "Doe Family",
  "head_resident_id": "resident_id_here",
  "address": "123 Village Road, Katete District",
  "created_at": "2025-10-25T10:00:00.000Z",
  "updated_at": "2025-10-25T10:00:00.000Z"
}
```

### Sample Resident

```json
{
  "name": "John Doe",
  "dob": "1980-01-15T00:00:00.000Z",
  "gender": "Male",
  "contact": "+260 123 456 789",
  "household_id": "household_id_here",
  "role_ids": ["role_id_1", "role_id_2"],
  "created_at": "2025-10-25T10:00:00.000Z",
  "updated_at": "2025-10-25T10:00:00.000Z"
}
```

### Sample User

```json
{
  "email": "john.doe@village.org",
  "name": "John Doe",
  "created_at": "2025-10-25T10:00:00.000Z",
  "updated_at": "2025-10-25T10:00:00.000Z"
}
```

---

## Common Queries

### Query Residents by Household

```javascript
import { tables, Query } from 'src/boot/appwrite';

const householdResidents = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'residents',
  queries: [Query.equal('household_id', householdId)],
});
```

### Query Residents by Role

```javascript
const adminResidents = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'residents',
  queries: [Query.equal('role_ids', roleId)],
});
```

### Get Household with Head Resident

```javascript
// First, get the household row
const household = await tables.getRow({
  databaseId: 'villageDB',
  tableId: 'households',
  rowId: householdId,
});

// Then, get the head resident row
const headResident = await tables.getRow({
  databaseId: 'villageDB',
  tableId: 'residents',
  rowId: household.head_resident_id,
});
```

### Find User by Email

```javascript
const users = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'users',
  queries: [Query.equal('email', 'john.doe@village.org')],
});
```

---

## Environment Variables

### Client-Side (in root `.env` file, `VITE_`-prefixed)

```env
VITE_APPWRITE_ENDPOINT=http://your-server-ip/v1
VITE_APPWRITE_PROJECT_ID=your-project-id-here
VITE_APPWRITE_DATABASE_ID=villageDB
VITE_APPWRITE_FUNCTION_CHECK_USERS=checkUsersExist
VITE_APPWRITE_FUNCTION_WIPE_DATA=wipeAllData
VITE_APPWRITE_FUNCTION_SEED_DATA=seedAllData
VITE_APPWRITE_FUNCTION_STORAGE_REPORT=storageUsageReport
VITE_APPWRITE_FUNCTION_USER_MANAGEMENT=userManagement
VITE_APPWRITE_FUNCTION_CREATE_NOTIFICATION=createNotification
```

### Server-Side (in `server/.env`, no `VITE_` prefix)

The setup scripts (`npm run setup:appwrite`, `npm run seed:roles`) read from
`server/.env`:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id-here
APPWRITE_API_KEY=your-api-key-here
APPWRITE_DATABASE_ID=villageDB
```

### Appwrite Functions (in Appwrite Console)

> ⚠️ **Important**: Function environment variables must be set **in the Appwrite Console** under each function's Settings tab. Functions run in isolated containers and cannot access your local `.env` file.

| Variable               | Appwrite Cloud                 | Self-Hosted                      |
| ---------------------- | ------------------------------ | -------------------------------- |
| `APPWRITE_ENDPOINT`    | `https://cloud.appwrite.io/v1` | `http://host.docker.internal/v1` |
| `APPWRITE_PROJECT_ID`  | Your project ID                | Your project ID                  |
| `APPWRITE_API_KEY`     | API key with all scopes        | API key with all scopes          |
| `APPWRITE_DATABASE_ID` | `villageDB`                    | `villageDB`                      |

> 💡 **Self-hosted users**: Use `host.docker.internal` instead of `localhost`. Function containers cannot reach the host machine via `localhost`.

---

## Testing URLs

- **Test Page:** `http://localhost:9000/appwrite-test`
- **Appwrite Console:** `http://your-server-ip` (self-hosted) or `https://cloud.appwrite.io`

---

## Checklist

Use this checklist to verify setup completion:

### Tables Created

- [ ] All 28 tables created (run `npm run setup:appwrite` and check the summary)

### Indexes Created

- [ ] 25+ indexes created across all tables (automated by setup script)

### Permissions Configured

- [ ] Table permissions set (automated by setup script)
- [ ] Storage buckets created (personal_files, shared_files)

### Verification

- [ ] Connection test passes
- [ ] Database access test passes
- [ ] Test tables created successfully
- [ ] Relationship queries work

---

**Quick Reference Complete!** Use this as a fast lookup while developing.
