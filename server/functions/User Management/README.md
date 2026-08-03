# User Management (Story 5.12)

Appwrite Function that performs all server-side, admin-driven user
management operations that the Appwrite client SDK cannot do on behalf of
another user: creating accounts, updating Auth profile fields, and soft
deactivating/reactivating accounts. It also keeps the `village_administrators`
team membership in sync with the System Administrator role and writes an
`audit_logs` row for every mutation.

## Actions

The function dispatches on `body.action`:

- `createUser` — create an Appwrite Auth user, insert a `users` row
  (`active: true`), join `village_administrators` if the System
  Administrator role is assigned, write an audit log.
- `updateUser` — update Auth email/name, update the `users` row, sync
  `village_administrators` membership, write an audit log.
- `deactivateUser` — reject self-deactivation and last-System-Administrator
  deactivation; otherwise set `active: false`, delete all sessions, remove
  from `village_administrators` if applicable, write an audit log.
- `reactivateUser` — set `active: true`, re-add to `village_administrators`
  if the user holds the System Administrator role, write an audit log.

All actions return `{ success, userId?, error? }`.

## Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Execute Access    | `role:users`  |
| Timeout (Seconds) | 30            |

## Environment Variables

| Variable              | Description                                |
| ---------------------- | ------------------------------------------- |
| `APPWRITE_ENDPOINT`    | Appwrite API endpoint                       |
| `APPWRITE_PROJECT_ID`  | Appwrite project ID                         |
| `APPWRITE_API_KEY`     | Admin-scope API key (users/teams/database)  |

See `appwrite_setup/FUNCTION_DEPLOYMENT.md` for full deployment instructions.
