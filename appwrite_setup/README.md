# Appwrite Database Setup Guide

**Complete step-by-step guide for configuring the Village Management System database in Appwrite**

This guide assumes **zero prior knowledge** of Appwrite. Follow each step carefully in the exact order shown.

---

## Quick Start: Automated Setup (Recommended)

**The fastest way to set up your database is using our automated setup script:**

```bash
npm run setup:appwrite
```

This script will automatically:

- ✅ Create all 28 tables across all modules (Core, Farm, Finance, School, Calendar, Storage, Notifications)
- ✅ Create 150+ columns with correct types and constraints
- ✅ Create 25+ indexes for optimal query performance
- ✅ Create 2 storage buckets (personal_files, shared_files)
- ✅ Configure permissions for authenticated users
- ✅ Create the `village_administrators` team

### Prerequisites for Automated Setup

1. **Create an API Key in Appwrite Console:**
   - Go to your Appwrite project
   - Navigate to **Settings** → **API Keys**
   - Click **"Create API Key"**
   - Name: `Database Setup`
   - Scopes: **Check all scopes** — the setup script creates tables, columns, indexes, buckets, and teams, so it requires full administrative scopes
   - Click **"Create"**
   - Copy the API key

2. **Add API Key to `server/.env` file:**

   ```bash
   # server/.env (no VITE_ prefix — server scripts read this directly)
   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your-project-id-here
   APPWRITE_API_KEY=your_api_key_here
   APPWRITE_DATABASE_ID=villageDB
   ```

3. **Run the setup script:**

   ```bash
   npm run setup:appwrite
   ```

4. **Verify setup:**
   - Visit `/appwrite-test` in your application
   - Click "Test TablesDB Access"
   - You should see a success message

---

## Manual Setup (Alternative — Outdated)

> ⚠️ **The manual setup instructions below are outdated.** They cover only the
> original 4 core tables (users, residents, households, roles). The system now
> has 28 tables across all modules. The automated script (`npm run setup:appwrite`)
> is the recommended and maintained path. These instructions are kept for
> reference only and may not reflect the current schema. For the authoritative
> schema, see [`server/appwrite.config.json`](../server/appwrite.config.json).

If you prefer to set up the database manually or want to understand the structure better, follow the detailed steps below.

### Table of Contents

1. [Prerequisites](#prerequisites)
2. [Accessing Appwrite Console](#accessing-appwrite-console)
3. [Creating Tables](#creating-tables)
4. [Configuring Relationships](#configuring-relationships)
5. [Creating Indexes](#creating-indexes)
6. [Setting Permissions](#setting-permissions)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Appwrite project created (Project name: "Village Project")
- ✅ Database created (Database ID: "villageDB")
- ✅ `.env` file updated with your project ID
- ✅ Application running (`quasar dev -m ssr`)

---

## Accessing Appwrite Console

### Step 1: Log into Appwrite

1. Open your web browser
2. Navigate to your Appwrite instance:
   - **Self-hosted:** `http://your-server-ip` or `http://localhost` (if running locally)
   - **Cloud:** `https://cloud.appwrite.io`
3. Enter your email and password
4. Click **"Sign In"**

### Step 2: Select Your Project

1. After logging in, you'll see a list of projects
2. Click on **"Village Project"** (or your project name)
3. You should now see the project dashboard

### Step 3: Navigate to Databases

1. In the left sidebar, click **"Databases"**
2. You should see your database **"villageDB"**
3. Click on **"villageDB"** to open it
4. You're now ready to create tables!

---

## Creating Tables

We need to create **4 tables**: `users`, `residents`, `households`, and `roles`.

### Table 1: Users

**Purpose:** Stores user authentication and profile data.

#### Step 1: Create the Table

1. Click the **"Create table"** button (top right)
2. Enter **Table ID:** `users`
3. Enter **Table Name:** `Users`
4. Click **"Create"**

#### Step 2: Add Columns

Now we'll add columns to the users table.

**Column 1: email**

1. Click **"Create column"** button
2. Select type: **"String"**
3. Enter Key: `email`
4. Enter Size: `255`
5. Check ✅ **"Required"**
6. Click **"Create"**

**Column 2: name**

1. Click **"Create column"** button
2. Select type: **"String"**
3. Enter Key: `name`
4. Enter Size: `255`
5. Check ✅ **"Required"**
6. Click **"Create"**

**Column 3: created_at**

1. Click **"Create column"** button
2. Select type: **"DateTime"**
3. Enter Key: `created_at`
4. Check ✅ **"Required"**
5. Click **"Create"**

**Column 4: updated_at**

1. Click **"Create column"** button
2. Select type: **"DateTime"**
3. Enter Key: `updated_at`
4. Check ✅ **"Required"**
5. Click **"Create"**

✅ **Users table complete!** You should now have 4 columns defined.

---

### Table 2: Residents

**Purpose:** Stores village resident profiles and household relationships.

#### Step 1: Create the Table

1. Go back to the database view (click "villageDB" in breadcrumb)
2. Click **"Create table"** button
3. Enter Table ID: `residents`
4. Enter Table Name: `Residents`
5. Click **"Create"**

#### Step 2: Add Columns

**Column 1: name**

1. Click **"Create column"** button
2. Select type: **"String"**
3. Enter Key: `name`
4. Enter Size: `255`
5. Check ✅ **"Required"**
6. Click **"Create"**

**Column 2: dob** (Date of Birth)

1. Click **"Create column"** button
2. Select type: **"DateTime"**
3. Enter Key: `dob`
4. Leave "Required" unchecked (optional field)
5. Click **"Create"**

**Column 3: gender**

1. Click **"Create column"** button
2. Select type: **"Enum"**
3. Enter Key: `gender`
4. Enter Elements (one per line):
   ```
   Male
   Female
   Other
   ```
5. Enter Default value: `Other`
6. Leave "Required" unchecked
7. Click **"Create"**

**Column 4: contact**

1. Click **"Create column"** button
2. Select type: **"String"**
3. Enter Key: `contact`
4. Enter Size: `100`
5. Leave "Required" unchecked
6. Click **"Create"**

**Column 5: household_id** (Relationship - we'll configure this later)

1. Click **"Create column"** button
2. Select type: **"String"**
3. Enter Key: `household_id`
4. Enter Size: `36`
5. Leave "Required" unchecked
6. Click **"Create"**

**Column 6: role_ids** (Array of role IDs)

1. Click **"Create column"** button
2. Select type: **"String"** (we'll use array format)
3. Check ✅ **"Array"**
4. Enter Key: `role_ids`
5. Enter Size: `36`
6. Leave "Required" unchecked
7. Click **"Create"**

**Column 7: created_at**

1. Click **"Create column"** button
2. Select type: **"DateTime"**
3. Enter Key: `created_at`
4. Check ✅ **"Required"**
5. Click **"Create"**

**Column 8: updated_at**

1. Click **"Create column"** button
2. Select type: **"DateTime"**
3. Enter Key: `updated_at`
4. Check ✅ **"Required"**
5. Click **"Create"**

✅ **Residents table complete!** You should now have 8 columns defined.

---

### Table 3: Households

**Purpose:** Stores household information and head resident relationships.

#### Step 1: Create the Table

1. Go back to the database view (click "villageDB" in breadcrumb)
2. Click **"Create table"** button
3. Enter Table ID: `households`
4. Enter Table Name: `Households`
5. Click **"Create"**

#### Step 2: Add Columns

**Column 1: name**

1. Click **"Create column"** button
2. Select type: **"String"**
3. Enter Key: `name`
4. Enter Size: `255`
5. Check ✅ **"Required"**
6. Click **"Create"**

**Column 2: head_resident_id** (Relationship - we'll configure this later)

1. Click **"Create column"** button
2. Select type: **"String"**
3. Enter Key: `head_resident_id`
4. Enter Size: `36`
5. Leave "Required" unchecked
6. Click **"Create"**

**Column 3: address**

1. Click **"Create column"** button
2. Select type: **"String"**
3. Enter Key: `address`
4. Enter Size: `500`
5. Leave "Required" unchecked
6. Click **"Create"**

**Column 4: created_at**

1. Click **"Create column"** button
2. Select type: **"DateTime"**
3. Enter Key: `created_at`
4. Check ✅ **"Required"**
5. Click **"Create"**

**Column 5: updated_at**

1. Click **"Create column"** button
2. Select type: **"DateTime"**
3. Enter Key: `updated_at`
4. Check ✅ **"Required"**
5. Click **"Create"**

✅ **Households table complete!** You should now have 5 columns defined.

---

### Table 4: Roles

**Purpose:** Stores role definitions with permissions and storage quotas.

#### Step 1: Create the Table

1. Go back to the database view (click "villageDB" in breadcrumb)
2. Click **"Create table"** button
3. Enter Table ID: `roles`
4. Enter Table Name: `Roles`
5. Click **"Create"**

#### Step 2: Add Columns

**Column 1: name**

1. Click **"Create column"** button
2. Select type: **"String"**
3. Enter Key: `name`
4. Enter Size: `100`
5. Check ✅ **"Required"**
6. Click **"Create"**

**Column 2: permissions** (Array of permission strings)

1. Click **"Create column"** button
2. Select type: **"String"**
3. Check ✅ **"Array"**
4. Enter Key: `permissions`
5. Enter Size: `100`
6. Leave "Required" unchecked
7. Click **"Create"**

**Column 3: storage_quota** (in GB)

1. Click **"Create column"** button
2. Select type: **"Integer"**
3. Enter Key: `storage_quota`
4. Enter Min: `0`
5. Enter Max: `1000`
6. Enter Default: `2`
7. Leave "Required" unchecked
8. Click **"Create"**

**Column 4: created_at**

1. Click **"Create column"** button
2. Select type: **"DateTime"**
3. Enter Key: `created_at`
4. Check ✅ **"Required"**
5. Click **"Create"**

**Column 5: updated_at**

1. Click **"Create column"** button
2. Select type: **"DateTime"**
3. Enter Key: `updated_at`
4. Check ✅ **"Required"**
5. Click **"Create"**

✅ **Roles table complete!** You should now have 5 columns defined.

---

## Configuring Relationships

Relationships in Appwrite Tables define how tables are linked together. We have two main relationships:

1. **Residents → Households** (many-to-one: many residents belong to one household)
2. **Households → Residents** (one-to-one: one household has one head resident)

**Note:** In Appwrite, relationships are typically managed through the column IDs we already created (`household_id`, `head_resident_id`). The application code will handle joining data when needed.

### Verification

To verify relationships work:

1. Create a test household row
2. Note its row ID
3. Create a test resident row
4. Set the resident's `household_id` to the household's row ID
5. Query residents by `household_id` to verify the relationship

---

## Creating Indexes

Indexes improve query performance. We'll create indexes on fields that are frequently searched.

### Index 1: Residents by Household ID

1. Open the **"residents"** table
2. Click the **"Indexes"** tab
3. Click **"Create index"** button
4. Enter Index Key: `idx_residents_household_id`
5. Select Type: **"Key"**
6. Select Columns: **"household_id"**
7. Select Order: **"ASC"** (ascending)
8. Click **"Create"**

### Index 2: Residents by Role IDs

1. Still in the **"residents"** table
2. Click **"Create index"** button
3. Enter Index Key: `idx_residents_role_ids`
4. Select Type: **"Key"**
5. Select Columns: **"role_ids"**
6. Select Order: **"ASC"**
7. Click **"Create"**

### Index 3: Households by Head Resident ID

1. Open the **"households"** table
2. Click the **"Indexes"** tab
3. Click **"Create index"** button
4. Enter Index Key: `idx_households_head_resident_id`
5. Select Type: **"Key"**
6. Select Columns: **"head_resident_id"**
7. Select Order: **"ASC"**
8. Click **"Create"**

### Index 4: Users by Email (Unique)

1. Open the **"users"** table
2. Click the **"Indexes"** tab
3. Click **"Create index"** button
4. Enter Index Key: `idx_users_email_unique`
5. Select Type: **"Unique"**
6. Select Columns: **"email"**
7. Click **"Create"**

✅ **All indexes created!**

---

## Setting Permissions

Permissions control who can read and write data. We'll set up basic permissions for authenticated users.

### Understanding Permission Roles

- **Any:** Anyone (including unauthenticated users)
- **Users:** Any authenticated user
- **User:[USER_ID]:** Specific user only
- **Team:[TEAM_ID]:** Members of a specific team

### Table Permissions Setup

For each table (`users`, `residents`, `households`, `roles`):

#### Step 1: Open Table Settings

1. Open the table (e.g., "users")
2. Click the **"Settings"** tab
3. Scroll to **"Permissions"** section

#### Step 2: Configure Read Permissions

1. Click **"Add a role"** under "Read access"
2. Select **"Users"** (any authenticated user)
3. Click **"Add"**

#### Step 3: Configure Write Permissions

For now, we'll allow all authenticated users to write. Later, you can restrict this to specific roles.

1. Click **"Add a role"** under "Create access"
2. Select **"Users"**
3. Click **"Add"**

4. Repeat for **"Update access"**:
   - Click **"Add a role"**
   - Select **"Users"**
   - Click **"Add"**

5. Repeat for **"Delete access"**:
   - Click **"Add a role"**
   - Select **"Users"**
   - Click **"Add"**

#### Step 4: Save Changes

1. Scroll to bottom
2. Click **"Update"** button

**Repeat these steps for all 4 tables:**

- ✅ users
- ✅ residents
- ✅ households
- ✅ roles

### RBAC Table Permission Matrix (Story 1.4)

To satisfy Story 1.4 Acceptance Criterion 7, apply these table-level rules once the core RBAC roles exist. Use the **Advanced permissions** dialog in Appwrite to assign each role explicitly.

| Table        | Read Access                        | Create Access                      | Update Access                      | Delete Access                      |
| ------------ | ---------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------- |
| `users`      | System Administrator               | System Administrator               | System Administrator               | System Administrator               |
| `residents`  | System Administrator, Village Head | System Administrator, Village Head | System Administrator, Village Head | System Administrator, Village Head |
| `households` | System Administrator, Village Head | System Administrator, Village Head | System Administrator, Village Head | System Administrator, Village Head |
| `roles`      | System Administrator (read-only)   | System Administrator               | System Administrator               | System Administrator               |

**How to apply:**

1. Open the table → **Settings** → **Permissions**.
2. Remove broad `Users` entries if present (from initial setup).
3. Add each role under the appropriate access type (`Read`, `Create`, `Update`, `Delete`).
4. Click **Update** to save.

> 💡 Tip: Keep the initial "Users" read permission in non-production environments if you still need anonymous testing. For production, restrict access to the roles above to enforce RBAC.

### Advanced Permissions (Optional - for later)

For production, you'll want to restrict write access to specific roles:

- **Admin role:** Full access to all tables
- **Village Head role:** Read/write access to residents, households
- **Regular users:** Read-only access

This will be configured in Story 1.3 when we implement authentication and role-based access control.

---

## Verification

### Step 1: Test Connection

1. Start your development server: `quasar dev -m ssr`
2. Open browser to: `http://localhost:9000`
3. Click **"Appwrite Test"** in the navigation menu
4. Click **"Test Connection"** button
5. ✅ You should see "Connected Successfully!"

### Step 2: Test TablesDB Access

1. On the same test page, click **"Test TablesDB Access"** button
2. ✅ You should see "TablesDB Access Successful!"
3. ✅ You should see the selected table's rows listed

### Step 3: Create Test Rows

Let's create a test household row and resident row to verify everything works.

#### Create Test Household

1. In Appwrite console, open **"households"** table
2. Click **"Create row"** button
3. Fill in the columns:
   - **name:** "Test Household"
   - **address:** "123 Village Road"
   - **created_at:** Click calendar icon, select today's date
   - **updated_at:** Click calendar icon, select today's date
4. Click **"Create"**
5. **Copy the Row ID** (you'll need this next)

#### Create Test Resident

1. Open **"residents"** table
2. Click **"Create row"** button
3. Fill in the columns:
   - **name:** "John Doe"
   - **dob:** Select a date of birth
   - **gender:** Select "Male"
   - **contact:** "+260 123 456 789"
   - **household_id:** Paste the household Row ID you copied
   - **role_ids:** Leave empty for now
   - **created_at:** Select today's date
   - **updated_at:** Select today's date
4. Click **"Create"**

#### Verify Relationship

1. Go back to **"residents"** table
2. Click **"Filters"** button (three sliders icon)
3. Add filter:
   - Column: **household_id**
   - Operator: **Equal**
   - Value: Paste the household ID
4. Click **"Apply"**
5. **You should see "John Doe" in the results!**

---

## Troubleshooting

### Problem: "Failed to connect to Appwrite"

**Solution:**

1. Check your `.env` file has correct values:
   ```
   VITE_APPWRITE_ENDPOINT=http://your-server-ip/v1
   VITE_APPWRITE_PROJECT_ID=your-project-id
   VITE_APPWRITE_DATABASE_ID=villageDB
   ```
   Also check `server/.env` has the non-prefixed equivalents
   (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`,
   `APPWRITE_DATABASE_ID`).
2. Restart your development server: `quasar dev -m ssr`
3. Verify Appwrite server is running

### Problem: "Database not found"

**Solution:**

1. Verify database ID is exactly `villageDB` (case-sensitive)
2. Check database exists in Appwrite console
3. Verify you're in the correct project

### Problem: "Table not found"

**Solution:**

1. Verify table IDs are exactly: `users`, `residents`, `households`, `roles` (case-sensitive)
2. Check tables exist in the database
3. Refresh the Appwrite console page

### Problem: "Permission denied"

**Solution:**

1. Verify you're logged into Appwrite
2. Check table permissions allow "Users" to read/write
3. Try logging out and back in

### Problem: "Index creation failed"

**Solution:**

1. Verify the column exists before creating index
2. Check index key name is unique
3. Ensure column type supports indexing

---

## Next Steps

After completing this setup:

1. **Seed default roles:** `npm run seed:roles`
2. **Deploy Appwrite functions:** See [FUNCTION_DEPLOYMENT.md](./FUNCTION_DEPLOYMENT.md)
3. **Create the initial admin account:** `npm run create:admin`
4. **Start the development server:** `quasar dev -m ssr` (opens at `http://localhost:9000`)

---

## Quick Reference

### Table schema summary (see `appwrite_setup/QUICK_REFERENCE.md`)

- 28 tables across Core, Farm, Finance, School, Calendar, Storage, Notifications, and Admin modules

### Database ID

- `villageDB`

### Test Page URL

- `http://localhost:9000/appwrite-test`

---

**Setup Complete!** 🎉

Your Appwrite database is now configured and ready for the Village Management System.
