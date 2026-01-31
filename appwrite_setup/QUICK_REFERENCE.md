<<<<<<< C:/Users/Kamal/OneDrive/App Development/Village/village-app/appwrite_setup/QUICK_REFERENCE.md
# Appwrite Setup Quick Reference

**Fast lookup guide for Appwrite Tables schemas and configurations**

---

## Database Configuration

- **Database ID:** `villageDB`
- **Database Name:** Village Database

---

## Tables Overview

| Table ID     | Table Name | Purpose                        | Columns Count |
| ------------ | ---------- | ------------------------------ | ------------- |
| `users`      | Users      | Authentication & profiles      | 4             |
| `residents`  | Residents  | Village resident data          | 8             |
| `households` | Households | Household information          | 5             |
| `roles`      | Roles      | Role definitions & permissions | 5             |

---

## Table Schemas

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

Required in `.env` file:

```env
VITE_APPWRITE_ENDPOINT=http://your-server-ip/v1
VITE_APPWRITE_PROJECT_ID=your-project-id-here
```

---

## Testing URLs

- **Test Page:** `http://localhost:9100/appwrite-test`
- **Appwrite Console:** `http://your-server-ip` (self-hosted) or `https://cloud.appwrite.io`

---

## Checklist

Use this checklist to verify setup completion:

### Tables Created

- [ ] users table with 4 columns
- [ ] residents table with 8 columns
- [ ] households table with 5 columns
- [ ] roles table with 5 columns

### Indexes Created

- [ ] email_unique_index on users.email
- [ ] household_id_index on residents.household_id
- [ ] role_ids_index on residents.role_ids
- [ ] head_resident_id_index on households.head_resident_id

### Permissions Configured

- [ ] users table permissions set
- [ ] residents table permissions set
- [ ] households table permissions set
- [ ] roles table permissions set

### Verification

- [ ] Connection test passes
- [ ] Database access test passes
- [ ] Test tables created successfully
- [ ] Relationship queries work

---

**Quick Reference Complete!** Use this as a fast lookup while developing.
=======
# Appwrite Setup Quick Reference

**Fast lookup guide for Appwrite Tables schemas and configurations**

---

## Database Configuration

- **Database ID:** `villageDB`
- **Database Name:** Village Database

---

## Tables Overview

| Table ID     | Table Name | Purpose                        | Columns Count |
| ------------ | ---------- | ------------------------------ | ------------- |
| `users`      | Users      | Authentication & profiles      | 4             |
| `residents`  | Residents  | Village resident data          | 8             |
| `households` | Households | Household information          | 5             |
| `roles`      | Roles      | Role definitions & permissions | 5             |

---

## Table Schemas

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

### Client-Side (in `.env` file)

```env
VITE_APPWRITE_ENDPOINT=http://your-server-ip/v1
VITE_APPWRITE_PROJECT_ID=your-project-id-here
VITE_APPWRITE_FUNCTION_CHECK_USERS=your-function-id-here
VITE_APPWRITE_FUNCTION_WIPE_DATA=your-function-id-here
```

### Appwrite Functions (in Appwrite Console)

> ⚠️ **Important**: Function environment variables must be set **in the Appwrite Console** under each function's Settings tab. Functions run in isolated containers and cannot access your local `.env` file.

| Variable              | Appwrite Cloud                 | Self-Hosted                      |
| --------------------- | ------------------------------ | -------------------------------- |
| `APPWRITE_ENDPOINT`   | `https://cloud.appwrite.io/v1` | `http://host.docker.internal/v1` |
| `APPWRITE_PROJECT_ID` | Your project ID                | Your project ID                  |
| `APPWRITE_API_KEY`    | API key with required scopes   | API key with required scopes     |

> 💡 **Self-hosted users**: Use `host.docker.internal` instead of `localhost`. Function containers cannot reach the host machine via `localhost`.

---

## Testing URLs

- **Test Page:** `http://localhost:9100/appwrite-test`
- **Appwrite Console:** `http://your-server-ip` (self-hosted) or `https://cloud.appwrite.io`

---

## Checklist

Use this checklist to verify setup completion:

### Tables Created

- [ ] users table with 4 columns
- [ ] residents table with 8 columns
- [ ] households table with 5 columns
- [ ] roles table with 5 columns

### Indexes Created

- [ ] email_unique_index on users.email
- [ ] household_id_index on residents.household_id
- [ ] role_ids_index on residents.role_ids
- [ ] head_resident_id_index on households.head_resident_id

### Permissions Configured

- [ ] users table permissions set
- [ ] residents table permissions set
- [ ] households table permissions set
- [ ] roles table permissions set

### Verification

- [ ] Connection test passes
- [ ] Database access test passes
- [ ] Test tables created successfully
- [ ] Relationship queries work

---

**Quick Reference Complete!** Use this as a fast lookup while developing.
>>>>>>> C:/Users/Kamal/.windsurf/worktrees/village-app/village-app-144a73c9/appwrite_setup/QUICK_REFERENCE.md
