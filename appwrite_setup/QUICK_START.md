# Quick Start: Deploy Appwrite Functions

This is a condensed version of the full deployment guide. For detailed instructions, see `FUNCTION_DEPLOYMENT.md`.

## Prerequisites

- Appwrite Console access
- Your `server/.env` file configured with Appwrite credentials
- Appwrite CLI installed: `npm install -g appwrite-cli@16.0.0`

## Quick Steps

### 1. Create API Key (2 minutes)

1. Appwrite Console → Settings → API Keys → **Add API Key**
2. Name: `Server Functions API Key`
3. Scopes: **Check all scopes** (functions need users, databases, tables, teams, and storage access)
4. Click **Create** and **copy the key immediately**

### 2. Deploy All Functions via CLI (5 minutes)

The project includes 6 server functions with definitions in `server/appwrite.config.json`:

| Function ID          | Name                 |
| -------------------- | -------------------- |
| `checkUsersExist`    | Check Users Exist    |
| `wipeAllData`        | Wipe All Data        |
| `seedAllData`        | Seed All Data        |
| `storageUsageReport` | Storage Usage Report |
| `userManagement`     | User Management      |
| `createNotification` | Create Notification  |

```bash
cd server/
appwrite login
appwrite push functions
```

When prompted which functions to deploy, press **`a`** (select all) then **`Enter`**.

### 3. Set Environment Variables (per function)

> ⚠️ **Important**: These environment variables must be configured **in the Appwrite Console** under each function's Settings tab — not in your local `.env` file. Functions run in isolated containers and cannot access your local environment.

In each function's **Settings** tab, add these environment variables:

| Variable               | Appwrite Cloud                 | Self-Hosted                      |
| ---------------------- | ------------------------------ | -------------------------------- |
| `APPWRITE_ENDPOINT`    | `https://cloud.appwrite.io/v1` | `http://host.docker.internal/v1` |
| `APPWRITE_PROJECT_ID`  | Your project ID                | Your project ID                  |
| `APPWRITE_API_KEY`     | API key from Step 1            | API key from Step 1              |
| `APPWRITE_DATABASE_ID` | `villageDB`                    | `villageDB`                      |

> 💡 **Self-hosted users**: Use `host.docker.internal` instead of `localhost`. Function containers cannot reach the host machine via `localhost` — it refers to the container itself.

> Note: Some functions also have per-function `vars` (e.g. `TABLE_USERS`, `TABLE_ROLES`) which `appwrite push` deploys automatically from `appwrite.config.json`.

### 4. Update Your .env File (30 seconds)

Add all function IDs to your root `.env` file:

```env
VITE_APPWRITE_FUNCTION_CHECK_USERS=checkUsersExist
VITE_APPWRITE_FUNCTION_WIPE_DATA=wipeAllData
VITE_APPWRITE_FUNCTION_SEED_DATA=seedAllData
VITE_APPWRITE_FUNCTION_STORAGE_REPORT=storageUsageReport
VITE_APPWRITE_FUNCTION_USER_MANAGEMENT=userManagement
VITE_APPWRITE_FUNCTION_CREATE_NOTIFICATION=createNotification
```

### 5. Test (1 minute)

1. Clear browser localStorage: `localStorage.clear()`
2. Refresh your app
3. Should show appropriate form (admin creation or login)

## Verification Checklist

- [ ] API key created with all scopes
- [ ] All 6 functions deployed via `appwrite push functions`
- [ ] Environment variables set in each function's settings in Appwrite Console
- [ ] All functions show status "Ready"
- [ ] Function IDs added to root `.env` file
- [ ] App tested and working correctly

## Troubleshooting

**Function returns error 500**
→ Check API key has all required scopes and environment variables are correct in the Appwrite Console

**"Permission denied" error**
→ Check the function's Execute Access settings in the Appwrite Console

**Client can't call function**
→ Verify function IDs in `.env` match the actual function IDs in the Appwrite Console

## Total Time: ~10 minutes

Once deployed, the function will securely check for existing users without exposing sensitive data to the client.

---

For detailed troubleshooting and security notes, see `FUNCTION_DEPLOYMENT.md`.
