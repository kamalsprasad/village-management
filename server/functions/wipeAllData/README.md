# Wipe All Data - Appwrite Cloud Function

This function atomically wipes all village data from the database. It is used when a user wants to start fresh after exploring with sample data.

## Security

- **Server-side permission verification**: The function verifies that the calling user has System Administrator permission (`*`) before executing any deletions.
- **User ID verification**: The caller must provide their user ID, which is verified against the users table and their assigned roles.

## Request

**Method:** POST (via `functions.createExecution()`)

**Body:**

```json
{
  "userId": "user-id-here"
}
```

## Response

**Success:**

```json
{
  "success": true,
  "message": "All data wiped successfully",
  "deletedResidents": 20,
  "deletedHouseholds": 6
}
```

**Error (Permission Denied):**

```json
{
  "success": false,
  "error": "Only System Administrators can wipe data"
}
```

## Environment Variables

The function uses these environment variables (automatically provided by Appwrite):

- `APPWRITE_FUNCTION_ENDPOINT` - Appwrite API endpoint
- `APPWRITE_FUNCTION_PROJECT_ID` - Project ID
- `APPWRITE_FUNCTION_API_KEY` - API key with database permissions

Custom environment variables (set in Appwrite Console):

- `DATABASE_ID` - Database ID (default: `villageDB`)
- `TABLE_RESIDENTS` - Residents table ID (default: `residents`)
- `TABLE_HOUSEHOLDS` - Households table ID (default: `households`)
- `TABLE_VILLAGE_SETTINGS` - Settings table ID (default: `village_settings`)
- `TABLE_USERS` - Users table ID (default: `users`)
- `TABLE_ROLES` - Roles table ID (default: `roles`)

## Deployment

See `appwrite_setup/FUNCTION_DEPLOYMENT.md` for deployment instructions.

## What Gets Deleted

1. **All residents** - Every record in the residents table
2. **All households** - Every record in the households table
3. **Village settings** - The `settings_root` document (triggers first-run state)

## What Is Preserved

- User accounts (Appwrite Auth)
- User profiles (users table)
- Roles and permissions (roles table)
