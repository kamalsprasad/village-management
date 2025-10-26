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
   - **Scopes:** Check **Database** (all permissions)
6. Click **"Create"**
7. **Copy the API key** (you won't see it again!)

### Step 2: Add API Key to .env

Open your `.env` file and add:

```bash
APPWRITE_API_KEY=your_api_key_here
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

## Option 2: Manual Setup 📝

If you prefer manual setup or the automated script fails, follow the detailed guide:

👉 [Complete Manual Setup Guide](./README.md#manual-setup-alternative)

---

## What Gets Created?

The setup process creates:

### Tables (4)
- **users** - Authentication & user profiles
- **residents** - Village resident information
- **households** - Household data
- **roles** - Role definitions & permissions

### Columns (22 total)
- All required fields with proper types
- Relationships (household_id, head_resident_id, role_ids)
- Timestamps (created_at, updated_at)

### Indexes (4)
- Email unique index (users)
- Household ID index (residents)
- Role IDs index (residents)
- Head resident ID index (households)

### Permissions
- Read/Write access for authenticated users
- Collection-level permissions (not document-level)

---

## Troubleshooting

### "APPWRITE_API_KEY not found"
- Make sure you added the API key to your `.env` file
- Restart your terminal/IDE after updating `.env`

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
- 🐛 [Report Issues](https://github.com/your-repo/issues)
