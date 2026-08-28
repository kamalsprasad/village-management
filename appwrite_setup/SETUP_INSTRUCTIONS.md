# Appwrite Database Setup - Quick Instructions

## Option 1: Automated Setup (Recommended) ⚡

The fastest way to set up your Appwrite database:

### Step 1: Create API Key

1. Go to [Appwrite Console](https://cloud.appwrite.io)
2. Select your project
3. Navigate to **Settings** → **API Keys**
4. Click **"Create API Key"**
5. Configure:
   - **Name:** `Database Setup`
   - **Scopes:** **Check all scopes** — the setup script creates tables, columns, indexes, buckets, and teams, so it requires full administrative scopes
6. Click **"Create"**
7. **Copy the API key** (you won't see it again!)

### Step 2: Add API Key to server/.env

Create `server/.env` (the setup scripts read from `server/.env`, not the root `.env`):

```bash
# server/.env (no VITE_ prefix)
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id-here
APPWRITE_API_KEY=your_api_key_here
APPWRITE_DATABASE_ID=villageDB
```

### Step 3: Run Setup Script

```bash
npm run setup:appwrite
```

### Step 4: Verify

1. Start your dev server: `npm run dev`
2. Visit: `http://localhost:9000/appwrite-test`
3. Click **"Test TablesDB Access"**
4. You should see: ✅ TablesDB Access Successful!

---

## What Gets Created?

The setup process creates:

### Tables (28)

- **Core:** users, residents, households, roles, village_settings
- **Farm:** soil_types, plots, crops, plantings, harvests, harvest_entries, farm_sales, farm_alerts
- **Finance:** finance_categories, funding_sources, loans, inventory, finance_transactions, transaction_links
- **Loan Mgmt:** repayment_schedule, loan_payments
- **School:** school_classes, learners, test_scores, teacher_assignments, learner_attendance, interventions, intervention_notes, school_long_term_goals, school_academic_terms, school_calendar_events, school_period_slots, class_timetable_entries
- **Calendar:** village_events
- **Storage:** file_metadata (buckets: personal_files, shared_files)
- **Notifications:** notifications, notification_reads
- **Admin:** audit_logs

### Columns (150+)

- All required fields with proper types
- Relationships across all modules
- Timestamps (created_at, updated_at)

### Indexes (25+)

- Across all 28 tables for optimal query performance

### Storage Buckets (2)

- `personal_files` — per-user personal file storage
- `shared_files` — module-based shared folders

### Permissions

- Read/Write access for authenticated users
- Table-level permissions (not document-level)

### Teams

- `village_administrators` team created automatically

---

## Troubleshooting

### "APPWRITE_API_KEY not found"

- Make sure you added the API key to `server/.env` (not the root `.env`)
- The setup scripts read from `server/.env` with non-prefixed keys (`APPWRITE_*`)
- Restart your terminal/IDE after updating `server/.env`

### "Database 'villageDB' not found"

- Create the database in Appwrite Console first
- Go to **Databases** → **Create Database**
- Use ID: `villageDB`

### "Collection already exists"

- This is normal if you're re-running the script
- The script will skip existing tables and continue

### "Attribute creation failed"

- Wait a few seconds and try again
- Appwrite processes attributes asynchronously
- The script includes automatic retry logic

---

## Need Help?

- 📖 [Full Setup Guide](./README.md)
- 📚 [Quick Reference](./QUICK_REFERENCE.md)
- 🐛 [Report Issues](https://github.com/kamalsprasad/village-management/issues)
