# Appwrite Function Deployment Guide

## Function: Check Users Exist

This function checks if any users exist in the Appwrite authentication system. It's required for the first-time setup flow in the Village Management System.

---

## Prerequisites

1. **Appwrite Console Access**: You must have access to your Appwrite project console
2. **API Key**: An API key with `users.read` scope (we'll create this in the steps below)
3. **Function Code**: Located at `server/functions/checkUsersExist.js`

---

## Deployment Steps

### Step 1: Create an API Key with Users Read Scope

1. Open your Appwrite Console
2. Navigate to your project
3. Go to **Settings** → **API Keys**
4. Click **Add API Key**
5. Configure the API key:
   - **Name**: `Server Functions API Key`
   - **Expiration**: Never (or set a long expiration)
   - **Scopes**: Check the following:
     - ✅ `users.read` (under Users section)
6. Click **Create**
7. **IMPORTANT**: Copy the API key immediately - it will only be shown once!
8. Save this key securely

### Step 2: Create the Function in Appwrite Console

1. In Appwrite Console, navigate to **Functions**
2. Click **Add Function**
3. Configure the function:
   - **Name**: `Check Users Exist`
   - **Function ID**: `checkUsersExist` (or auto-generate)
   - **Runtime**: `Node.js 18.0` (or latest available)
   - **Execute Access**: Add `role:guest` (this allows unauthenticated users to call it)
   - **Events**: Leave empty (this is not an event-triggered function)
   - **Schedule**: Leave empty (this is not a scheduled function)
   - **Timeout**: 15 seconds (default is fine)

4. Click **Create**

### Step 3: Configure Environment Variables

> ⚠️ **Important**: These environment variables must be configured **in the Appwrite Console** under the function's Settings tab — not in your local `.env` file. Functions run in isolated containers and cannot access your local environment.

1. In the function details page, go to the **Settings** tab
2. Scroll to **Environment Variables**
3. Add the following variables:

   | Variable Name         | Appwrite Cloud                    | Self-Hosted                       |
   | --------------------- | --------------------------------- | --------------------------------- |
   | `APPWRITE_ENDPOINT`   | `https://cloud.appwrite.io/v1`    | `http://host.docker.internal/v1`  |
   | `APPWRITE_PROJECT_ID` | Your project ID (from console)    | Your project ID (from console)    |
   | `APPWRITE_API_KEY`    | The API key you created in Step 1 | The API key you created in Step 1 |

   > 💡 **Self-hosted users**: Use `host.docker.internal` instead of `localhost`. Function containers cannot reach the host machine via `localhost` — it refers to the container itself. Alternatively, use your machine's actual IP address (e.g., `http://192.168.1.x/v1`).

4. Click **Update** to save

### Step 4: Deploy the Function Code

#### Option A: Using Appwrite CLI (Recommended)

1. Install Appwrite CLI if not already installed:

   ```bash
   npm install -g appwrite-cli@16.0.0
   ```

2. Login to Appwrite:

   ```bash
   appwrite login
   ```

3. Initialize your project (if not already done):

   ```bash
   appwrite init project
   ```

4. Deploy the function:

   ```bash
   appwrite push function
   ```

   - Select the `checkUsersExist` function
   - Point to the `server/functions/checkUsersExist.js` file

#### Option B: Manual Upload via Console

1. In the function details page, go to the **Deployments** tab
2. Click **Create Deployment**
3. Configure the deployment:
   - **Entrypoint**: `checkUsersExist.js`
   - **Code**: Upload the `server/functions/checkUsersExist.js` file
   - **Activate deployment after build**: ✅ Check this
4. Click **Create**
5. Wait for the build to complete (status will change to "Ready")

### Step 5: Set Execute Permissions

1. In the function details page, go to the **Settings** tab
2. Scroll to **Execute Access**
3. Click **Add Role**
4. Select `role:guest` from the dropdown
5. Click **Update**

**Why `role:guest`?** This allows unauthenticated users (guests) to execute the function, which is necessary for checking if users exist before anyone has logged in.

### Step 6: Get the Function ID

1. In the function details page, note the **Function ID** (shown at the top)
2. You'll need this ID to call the function from the client-side code
3. The Function ID should look something like: `6543210abcdef123456789`

### Step 7: Update Client-Side Code

1. Open `src/boot/appwrite.js`
2. Add the Function ID as an environment variable in `.env`:

   ```env
   VITE_APPWRITE_FUNCTION_CHECK_USERS=your-function-id-here
   ```

3. The client code in `src/stores/auth-store.js` will automatically use this function

---

## Testing the Function

### Test in Appwrite Console

1. Go to the function details page
2. Click the **Execute** tab
3. Click **Execute Now**
4. Check the **Logs** tab to see the execution result
5. You should see a response like:
   ```json
   {
     "success": true,
     "userExists": false,
     "message": "No users found - first time setup required"
   }
   ```

### Test from Client Application

1. Clear your browser's localStorage: `localStorage.clear()`
2. Refresh the application
3. The app should call the function and show the appropriate form (admin creation or login)
4. Check the browser console for any errors

---

## Troubleshooting

### Function Returns Error 500

- **Check API Key**: Ensure the API key has `users.read` scope
- **Check Environment Variables**: Verify all three environment variables are set correctly
- **Check Logs**: View the function logs in the Appwrite Console for detailed error messages

### Function Returns "Permission Denied"

- **Check Execute Access**: Ensure `role:guest` is added to Execute Access
- **Check API Key Scopes**: Verify the API key has the correct permissions

### Client Cannot Call Function

- **Check Function ID**: Ensure the Function ID in `.env` matches the actual function ID
- **Check Network**: Open browser DevTools → Network tab to see if the request is being made
- **Check CORS**: Ensure your Appwrite project allows requests from your app's domain

### Function Times Out

- **Increase Timeout**: In function settings, increase the timeout value
- **Check Appwrite Service**: Ensure the Appwrite service is running and accessible

---

## Security Notes

1. **API Key Security**:
   - Never commit the API key to version control
   - Store it securely in Appwrite's environment variables
   - Rotate the key periodically

2. **Function Permissions**:
   - The function only has `users.read` permission - it cannot create, modify, or delete users
   - The function only returns a boolean (whether users exist), not user data

3. **Rate Limiting**:
   - Consider implementing rate limiting if needed
   - Appwrite has built-in rate limiting for functions

---

## Maintenance

### Updating the Function

1. Modify `server/functions/checkUsersExist.js`
2. Redeploy using CLI or manual upload
3. The new deployment will automatically activate

### Monitoring

1. Regularly check the **Logs** tab in Appwrite Console
2. Monitor execution count and errors
3. Set up alerts if needed (via Appwrite webhooks)

---

## Additional Resources

- [Appwrite Functions Documentation](https://appwrite.io/docs/products/functions)
- [Appwrite CLI Documentation](https://appwrite.io/docs/tooling/command-line/installation)
- [Appwrite Node.js SDK](https://appwrite.io/docs/sdks#server)

---

## Function: Wipe All Data

This function atomically wipes all village data (residents, households, settings) when a user wants to start fresh after exploring with sample data.

### Security

- **Server-side permission verification**: The function verifies that the calling user has System Administrator permission (`*`) before executing any deletions.
- **User ID verification**: The caller must provide their user ID, which is verified against the users table and their assigned roles.

### Deployment Steps

#### Step 1: Create the Function in Appwrite Console

1. In Appwrite Console, navigate to **Functions**
2. Click **Add Function**
3. Configure the function:
   - **Name**: `Wipe All Data`
   - **Function ID**: `wipeAllData` (or auto-generate)
   - **Runtime**: `Node.js 18.0` (or latest available)
   - **Execute Access**: Add `role:users` (only authenticated users can call it)
   - **Events**: Leave empty
   - **Schedule**: Leave empty
   - **Timeout**: 60 seconds (data deletion may take time)

4. Click **Create**

#### Step 2: Configure Environment Variables

1. In the function details page, go to the **Settings** tab
2. Scroll to **Environment Variables**
3. Add the following variables:

   | Variable Name            | Value                             |
   | ------------------------ | --------------------------------- |
   | `DATABASE_ID`            | `villageDB` (or your database ID) |
   | `TABLE_RESIDENTS`        | `residents`                       |
   | `TABLE_HOUSEHOLDS`       | `households`                      |
   | `TABLE_VILLAGE_SETTINGS` | `village_settings`                |
   | `TABLE_USERS`            | `users`                           |
   | `TABLE_ROLES`            | `roles`                           |

4. Click **Update** to save

**Note**: `APPWRITE_FUNCTION_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID`, and `APPWRITE_FUNCTION_API_KEY` are automatically provided by Appwrite.

#### Step 3: Deploy the Function Code

##### Option A: Using Appwrite CLI (Recommended)

1. Navigate to the function directory:

   ```bash
   cd server/functions/wipeAllData
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Deploy using Appwrite CLI:
   ```bash
   appwrite push function
   ```

##### Option B: Manual Upload via Console

1. In the function details page, go to the **Deployments** tab
2. Click **Create Deployment**
3. Configure the deployment:
   - **Entrypoint**: `src/main.js`
   - **Code**: Upload the entire `server/functions/wipeAllData` folder as a zip
   - **Activate deployment after build**: ✅ Check this
4. Click **Create**
5. Wait for the build to complete

#### Step 4: Set Execute Permissions

1. In the function details page, go to the **Settings** tab
2. Scroll to **Execute Access**
3. Click **Add Role**
4. Select `role:users` from the dropdown
5. Click **Update**

**Why `role:users`?** Only authenticated users should be able to call this function. The function itself verifies System Administrator permission.

#### Step 5: Update Client-Side Code

1. Add the Function ID to your `.env` file:

   ```env
   VITE_APPWRITE_FUNCTION_WIPE_DATA=your-function-id-here
   ```

2. The client code in `src/stores/settings-store.js` will use this function

### Testing the Function

1. Log in as a System Administrator
2. Navigate to any page with the sample data banner
3. Click "Start Fresh - Wipe All Data"
4. Type "DELETE EVERYTHING" in the confirmation dialog
5. Click "Wipe All Data"
6. You should be redirected to the setup wizard

### What Gets Deleted

- All resident records
- All household records
- Village settings (`settings_root` document)

### What Is Preserved

- User accounts (Appwrite Auth)
- User profiles (users table)
- Roles and permissions (roles table)

---

## Function: User Management

This function performs all admin-driven user CRUD operations (Story 5.12)
that the Appwrite client SDK cannot perform on behalf of another user:
creating Auth accounts, updating Auth email/name, and soft
deactivating/reactivating accounts. It keeps `village_administrators` team
membership in sync with the System Administrator role and writes an
`audit_logs` row for every mutation.

### Security

- Only authenticated users can call this function (`role:users`); the
  System Administrator route guard on `/admin/users` is the primary access
  control on the client, and every mutation is written to `audit_logs` for
  traceability.
- The function never hard-deletes a user; deactivation only flips
  `users.active` to `false` and invalidates sessions.

### Deployment Steps

#### Step 1: Create an API Key with the Required Scopes

1. Open your Appwrite Console → **Settings** → **API Keys** → **Add API Key**
2. Configure the API key:
   - **Name**: `User Management Function API Key` (or reuse an existing
     admin-scope key)
   - **Expiration**: Never (or a long expiration)
   - **Scopes**: Check the following:
     - ✅ `users.read`
     - ✅ `users.write`
     - ✅ `teams.read`
     - ✅ `teams.write`
     - ✅ `databases.read`
     - ✅ `databases.write`
     - ✅ `tables.read`
     - ✅ `tables.write`
     - ✅ `rows.read`
     - ✅ `rows.write`
3. Click **Create** and copy the key immediately.

#### Step 2: Create the Function in Appwrite Console

1. In Appwrite Console, navigate to **Functions** → **Add Function**
2. Configure the function:
   - **Name**: `User Management`
   - **Function ID**: `userManagement` (or auto-generate; must match
     `VITE_APPWRITE_FUNCTION_USER_MANAGEMENT` in `.env`)
   - **Runtime**: `Node.js 18.0` (or latest available)
   - **Execute Access**: Add `role:users` (only authenticated users can call
     it — the client only exposes this to System Administrators via the
     `/admin/users` route guard)
   - **Events / Schedule**: Leave empty
   - **Timeout**: 30 seconds
3. Click **Create**

#### Step 3: Configure Environment Variables

> ⚠️ Configure these **in the Appwrite Console** under the function's
> Settings tab, not in your local `.env` file.

| Variable Name         | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| `APPWRITE_ENDPOINT`   | `https://cloud.appwrite.io/v1` (or your self-hosted endpoint) |
| `APPWRITE_PROJECT_ID` | Your project ID                                               |
| `APPWRITE_API_KEY`    | The API key created in Step 1                                 |
| `DATABASE_ID`         | `villageDB` (or your database ID)                             |
| `TABLE_USERS`         | `users`                                                       |
| `TABLE_ROLES`         | `roles`                                                       |
| `TABLE_AUDIT_LOGS`    | `audit_logs`                                                  |

#### Step 4: Deploy the Function Code

##### Option A: Using Appwrite CLI (Recommended)

```bash
cd "server/functions/User Management"
npm install
appwrite push function
```

Select the `userManagement` function and confirm the entrypoint is
`src/main.js`.

##### Option B: Manual Upload via Console

1. In the function details page, go to the **Deployments** tab
2. Click **Create Deployment**
3. Configure the deployment:
   - **Entrypoint**: `src/main.js`
   - **Code**: Upload the entire `server/functions/User Management` folder
     as a zip
   - **Activate deployment after build**: ✅ Check this
4. Click **Create** and wait for the build to complete

#### Step 5: Set Execute Permissions

1. In the function details page, go to the **Settings** tab
2. Scroll to **Execute Access** → **Add Role** → select `role:users` →
   **Update**

#### Step 6: Update Client-Side Code

1. Add the Function ID to your `.env` file:

   ```env
   VITE_APPWRITE_FUNCTION_USER_MANAGEMENT=your-function-id-here
   ```

2. `src/stores/users-store.js` will use this function for all
   create/update/deactivate/reactivate actions.

### Testing the Function

1. Log in as a System Administrator and open `/admin/users`
2. Click **Add User**, fill in the form, and submit
3. Confirm the new user appears in the table and, if given the System
   Administrator role, in the `village_administrators` team in the Appwrite
   console
4. Deactivate the user and confirm they cannot log in
5. Check the `audit_logs` table in the Appwrite console for a row per
   action

---

**Last Updated**: 2025-11-25  
**Function Version**: 1.0.0  
**Compatible with**: Appwrite 1.4+
