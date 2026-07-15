# Quick Start: Deploy checkUsersExist Function

This is a condensed version of the full deployment guide. For detailed instructions, see `FUNCTION_DEPLOYMENT.md`.

## Prerequisites

- Appwrite Console access
- Your `.env` file configured with Appwrite credentials

## Quick Steps

### 1. Create API Key (2 minutes)

1. Appwrite Console → Settings → API Keys → **Add API Key**
2. Name: `Server Functions API Key`
3. Scopes: ✅ `users.read`
4. Click **Create** and **copy the key immediately**

### 2. Create Function (3 minutes)

1. Appwrite Console → Functions → **Add Function**
2. Configure:
   - **Name**: `Check Users Exist`
   - **Function ID**: `checkUsersExist` (or auto-generate)
   - **Runtime**: `Node.js 18.0`
   - **Execute Access**: Add `role:guest`
3. Click **Create**

### 3. Set Environment Variables (1 minute)

> ⚠️ **Important**: These environment variables must be configured **in the Appwrite Console** under the function's Settings tab — not in your local `.env` file. Functions run in isolated containers and cannot access your local environment.

In the function's **Settings** tab, add these environment variables:

| Variable              | Appwrite Cloud                 | Self-Hosted                      |
| --------------------- | ------------------------------ | -------------------------------- |
| `APPWRITE_ENDPOINT`   | `https://cloud.appwrite.io/v1` | `http://host.docker.internal/v1` |
| `APPWRITE_PROJECT_ID` | Your project ID                | Your project ID                  |
| `APPWRITE_API_KEY`    | API key from Step 1            | API key from Step 1              |

> 💡 **Self-hosted users**: Use `host.docker.internal` instead of `localhost`. Function containers cannot reach the host machine via `localhost` — it refers to the container itself.

### 4. Deploy Function Code (2 minutes)

**Option A: Manual Upload (Easier)**

1. Function details → **Deployments** tab → **Create Deployment**
2. Entrypoint: `checkUsersExist.js`
3. Upload: `server/functions/checkUsersExist.js`
4. ✅ Check "Activate deployment after build"
5. Click **Create** and wait for build to complete

**Option B: Using CLI**

```bash
npm install -g appwrite-cli@16.0.0
appwrite login
appwrite deploy function
```

### 5. Get Function ID (30 seconds)

1. Copy the **Function ID** from the function details page (top of page)
2. It looks like: `6543210abcdef123456789`

### 6. Update Your .env File (30 seconds)

Add this line to your `.env` file:

```env
VITE_APPWRITE_FUNCTION_CHECK_USERS=<function-id-from-step-5>
```

### 7. Test (1 minute)

1. Clear browser localStorage: `localStorage.clear()`
2. Refresh your app
3. Should show appropriate form (admin creation or login)

## Verification Checklist

- [ ] API key created with `users.read` scope
- [ ] Function created with `role:guest` execute access
- [ ] Environment variables set in function settings
- [ ] Function code deployed and status is "Ready"
- [ ] Function ID added to `.env` file
- [ ] App tested and working correctly

## Troubleshooting

**Function returns error 500**
→ Check API key has `users.read` scope and environment variables are correct

**"Permission denied" error**
→ Ensure `role:guest` is added to Execute Access in function settings

**Client can't call function**
→ Verify function ID in `.env` matches the actual function ID

## Total Time: ~10 minutes

Once deployed, the function will securely check for existing users without exposing sensitive data to the client.

---

For detailed troubleshooting and security notes, see `FUNCTION_DEPLOYMENT.md`.
