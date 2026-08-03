---
title: 'Story 5.12: User Management - CRUD Operations'
type: feature
created: '2026-08-03'
status: done
baseline_revision: '1e71a52e4e69d452d9264e9c041b8483341da231'
final_revision: '336a144b82ef8d4d1940a92af0be095009ba2e5c'
review_loop_iteration: 1
followup_review_recommended: true
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-14-authentication-completeness-password-change-and-reset.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-9-module-management-and-configuration.md'
warnings:
  - oversized
---

<intent-contract>

## Intent

**Problem:** The User Management page (`/admin/users`) is read-only and has a stale "Role editing will be available in Epic 2" description. System Administrators cannot create accounts, edit user details, or soft-deactivate users, so all account lifecycle tasks require manual Appwrite console access.

**Approach:** Add admin-driven user CRUD to `UsersPage`: an "Add User" button, Add/Edit User dialog, active/deactivated status filter, and row actions. Implement the server-side operations (Auth user creation, `users` table sync, `village_administrators` team sync, session invalidation, audit logging) in a new Appwrite Function called from a dedicated `users-store.js`. Add an `active` column to the `users` table and an `audit_logs` table. Block login for deactivated users with a defense-in-depth check in `auth-store.js`.

## Boundaries & Constraints

**Always:**

- Use the existing `*` (System Administrator) route guard on `/admin/users`; use the existing `isAdmin` computed for button visibility.
- Reuse `ResidentSearchInput.vue` for the optional `resident_id` link and `ChangePasswordDialog.vue`'s password validation pattern (min 8 chars, visibility toggle, `maxlength="265"`).
- All new/modified components use Vue 3 `<script setup>`, Quasar components, and SSR-safe `isClient` guards before client-only Appwrite calls.
- All server-side user management flows go through the new Appwrite Function using `node-appwrite` with an admin-scope API key.
- Write an `audit_logs` row for every `createUser`, `updateUser`, `deactivateUser`, and `reactivateUser` action from the server function.
- Hardcoded English strings only; no emojis.

**Block If:**

- A new third-party dependency is required.
- An acceptance criterion conflicts with the PRD, architecture, or UX spec.

**Never:**

- Implement self-service signup or email verification (out of scope per PRD FR-19).
- Implement the 5.13 "Manage Roles" dialog; the row action must be a disabled placeholder only.
- Hard-delete users; deactivation must be soft (`active=false`).
- Grant `create("any")`/`update("any")`/`delete("any")` on `audit_logs`; it must remain admin-read + service-write only.

## I/O & Edge-Case Matrix

| Scenario                            | Input / State                                                                      | Expected Output / Behavior                                                                                                                       | Error Handling                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Add user success                    | Admin submits valid name, email, password ≥8 chars, role_ids, optional resident_id | Server creates Auth user, inserts `users` row with `active=true`, joins `village_administrators` if System Admin role assigned, writes audit log | `notifySuccess`; dialog closes; table refreshes                            |
| Add user weak password              | Password < 8 chars                                                                 | Submit blocked client-side                                                                                                                       | Inline validation "Password must be at least 8 characters"; no API call    |
| Add user duplicate email            | Email already exists in Appwrite Auth                                              | Server `users.create` rejects                                                                                                                    | `notifyError` with Appwrite message; form stays open                       |
| Edit user success                   | Admin changes name, email, roles, and/or resident_id                               | Server updates Auth email/name, updates `users` row, syncs `village_administrators` membership, writes audit log                                 | `notifySuccess`; table refreshes                                           |
| Edit user removes System Admin role | role_ids no longer contains System Admin role                                      | Server removes user from `village_administrators` team                                                                                           | User loses admin route access on next navigation/session check             |
| Deactivate user success             | Target is not self and not last active System Admin                                | Server sets `active=false`, deletes all sessions, removes from admin team if applicable, writes audit log                                        | `notifySuccess`; table refreshes; user is immediately logged out elsewhere |
| Deactivate self                     | Target `$id === authStore.user.$id`                                                | Client disables button; server rejects if called anyway                                                                                          | Tooltip "You cannot deactivate your own account"                           |
| Deactivate last System Admin        | Target is the only remaining active user with System Admin role                    | Client disables button with tooltip; server rejects                                                                                              | Server returns error "Cannot deactivate the last System Administrator"     |
| Reactivate user success             | Target previously deactivated                                                      | Server sets `active=true`, re-adds to `village_administrators` if System Admin role held, writes audit log                                       | `notifySuccess`; table refreshes                                           |
| Deactivated user login              | User enters valid credentials but `users.active === false`                         | `account.deleteSession('current')`; login fails with "Your account has been deactivated"                                                         | No successful session created                                              |
| Missing users row on login          | Auth user exists but no `users` table row                                          | Allow login with console warning                                                                                                                 | Do not block due to data inconsistency                                     |

</intent-contract>

## Code Map

- `server/scripts/setup-appwrite.js` -- add `active` boolean column to `users` schema; add new `audit_logs` table with admin-read-only permissions.
- `.env.example` -- add `VITE_APPWRITE_FUNCTION_USER_MANAGEMENT` function ID variable.
- `appwrite_setup/FUNCTION_DEPLOYMENT.md` -- add deployment section for the new User Management function (env vars, scopes, CLI/manual deploy steps).
- `server/functions/User Management/src/main.js` -- new Appwrite Function handling `createUser`, `updateUser`, `deactivateUser`, `reactivateUser`, team sync, and audit logging.
- `src/stores/users-store.js` -- new Pinia store for admin user-management actions, wrapping `functions.createExecution(VITE_APPWRITE_FUNCTION_USER_MANAGEMENT)` and table queries.
- `src/stores/auth-store.js` -- add `active` check in `login` and `checkSession` to reject deactivated users.
- `src/pages/admin/UsersPage.vue` -- add "Add User" button, status filter, search, actions column, status column; wire dialogs and `users-store`.
- `src/components/admin/UserFormDialog.vue` -- new Add/Edit User dialog (name, email, password, role multi-select, resident search input).
- `src/components/admin/DeactivateUserDialog.vue` -- new Deactivate/Reactivate confirmation dialog with self/last-admin guard tooltips.

## Tasks & Acceptance

**Execution:**

- [x] `server/scripts/setup-appwrite.js` -- Add `active` boolean column to `tableSchemas.users.columns` (`type: 'boolean'`, `default: true`, `required: true`). Add `audit_logs` entry to `tableSchemas` with `permissions: [Permission.read(Role.team('village_administrators'))]`, `rowSecurity: false`, and columns: `actor_user_id` (manyToOne→users), `action` (enum `user_create`/`user_update`/`user_deactivate`/`user_reactivate`), `target_user_id` (manyToOne→users), `changes_json` (string size 2000), `created_at` (datetime required). -- Schema foundation for soft-deactivation and tamper-resistant audit history.
- [x] `.env.example` -- Add `VITE_APPWRITE_FUNCTION_USER_MANAGEMENT=userManagement` with a comment explaining it identifies the server-side User Management function. -- Client knows which function to invoke.
- [x] `appwrite_setup/FUNCTION_DEPLOYMENT.md` -- Add "Function: User Management" section covering: required API-key scopes (`users.read`, `users.write`, `teams.read`, `teams.write`, `databases.read`, `databases.write`, `tables.read`, `tables.write`, `rows.read`, `rows.write`), function execute access `role:users`, environment variables (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`), deploy command `appwrite push function` (entrypoint `src/main.js`) or manual zip upload, and client `.env` update. -- Operations can deploy the new function.
- [x] `server/functions/User Management/src/main.js` -- Create the new function following the `Check Users Exist` structure. On every request, verify the caller is a System Administrator by reading `req.headers['x-appwrite-user-id']`, fetching the caller's `users` row with roles, and confirming a role grants `*`. Reject with 403 if not. Parse `body.action` and derive `actorUserId` from the verified caller (ignore any client-supplied value). Implement `createUser` (validate → `users.create` → `tables.createRow` with `role_ids`/`resident_id`/`active=true` → conditionally `teams.createMembership` for `village_administrators` if System Admin role assigned → audit log), `updateUser` (validate → `users.updateEmail`/`updateName` → `tables.updateRow` → sync admin team membership add/remove → audit log), `deactivateUser` (reject if `userId === actorUserId`; paginate through all users and count other active System Admins, treating `active !== false` as active, rejecting if zero → `tables.updateRow({active:false})` → `users.deleteSessions(userId)` → remove from admin team → audit log), `reactivateUser` (`tables.updateRow({active:true})` → re-add to admin team if System Admin role → audit log). Keep audit `changes_json` under the 2000-char column limit without producing invalid JSON. All actions return `{ success, userId?, error? }`. -- Server-side enforcement of AC3–AC7, AC9, AC10, AC11.
- [x] `server/functions/wipeAllData/src/main.js` -- Add `'audit_logs'` to `TABLES_TO_WIPE` so sample-data wipe removes audit history; preserve `users` and `roles` as already filtered. -- Start-fresh flow remains consistent.
- [x] `src/stores/users-store.js` -- Create options-store with `useErrorHandler`; state `users`, `roles`, `isLoading`, `error`; actions `fetchUsers()`, `fetchRoles()`, `createUser(payload)`, `updateUser(userId, payload)`, `deactivateUser(userId)`, `reactivateUser(userId)` returning `{ success, error }` by calling `functions.createExecution(import.meta.env.VITE_APPWRITE_FUNCTION_USER_MANAGEMENT, JSON.stringify({ action, actorUserId, ...payload }))` and parsing `responseBody`. -- Admin user management API surface for the UI.
- [x] `src/stores/auth-store.js` -- After `account.get()` in `login()`, `checkSession()`, and `fetchUser()`, fetch the matching `users` table row and, if `userProfile.active === false`, call `account.deleteSession({ sessionId: 'current' })`, clear store state, and return `{ success: false, error: 'Your account has been deactivated. Please contact a System Administrator.' }` (login) or `false` (`checkSession`/`fetchUser`). Treat a missing profile as active with a console warning; fail closed (return false) for non-404 read errors so a transient Appwrite failure does not let a deactivated user in. -- Defense-in-depth login blocking for AC6.
- [x] `src/pages/admin/UsersPage.vue` -- Remove stale description on line 6. Add header "Add User" button (visible via existing `isAdmin`/route guard). Add filter bar: search by name/email and status `q-select` (Active / Deactivated / All). Add Status column and Actions column. Actions: "Edit" opens `UserFormDialog` in edit mode; "Manage Roles" disabled with tooltip "Available in a future update"; "Deactivate"/"Reactivate" opens `DeactivateUserDialog`. Fetch users and roles via `users-store` in `onMounted` guarded by `isClient`. -- UI for AC1, AC8, stale-cleanup, and 5.13 placeholder.
- [x] `src/components/admin/UserFormDialog.vue` -- New dialog using `q-form` with name, email, password (required when adding, hidden when editing, min 8 chars, visibility toggle), role multi-select (`q-select` with chips from seeded roles), optional `ResidentSearchInput`, Save/Cancel. On save call `users-store.createUser` or `users-store.updateUser`, show result, close and emit `saved` on success. -- Add/Edit form for AC2, AC5.
- [x] `src/components/admin/DeactivateUserDialog.vue` -- New confirmation dialog. Show user name and action (Deactivate/Reactivate). Disable Confirm with tooltip if target is current user ("You cannot deactivate your own account") or if deactivating the last active System Administrator ("At least one System Administrator must remain active"). Call `users-store.deactivateUser` or `users-store.reactivateUser`. -- Confirmation UX and client-side guards for AC6, AC7, AC9, AC10.

**Acceptance Criteria:**

- Given a System Administrator is on `/admin/users`, when the page loads, then an "Add User" button is visible and the stale "Role editing will be available in Epic 2" description is gone.
- Given the "Add User" dialog is open, when the admin fills name, email, password ≥8 chars, selects one or more roles, and optionally links a resident, then a new Auth user and `users` table row are created with `active=true`, and the user is added to `village_administrators` only if the System Administrator role is selected.
- Given an existing user row, when the admin edits name, email, roles, or resident link, then the Appwrite Auth user, `users` table row, and `village_administrators` team membership are updated accordingly.
- Given a user is active, when the admin deactivates them and they are not the current user and not the last active System Administrator, then `users.active` becomes `false`, all their sessions are invalidated, and they are removed from `village_administrators` if applicable.
- Given a deactivated user, when the admin reactivates them, then `users.active` becomes `true` and they are re-added to `village_administrators` if they hold the System Administrator role.
- Given the UsersPage filter, when the admin selects "Active", "Deactivated", or "All", then the table only shows rows matching that status.
- Given the admin attempts to deactivate their own account, when viewing the actions menu, then the Deactivate action is disabled with a self-lockout tooltip.
- Given the admin attempts to deactivate the last active System Administrator, when viewing the actions menu, then the Deactivate action is disabled with a last-admin tooltip.
- Given every create/update/deactivate/reactivate operation, when it completes successfully, then a row in `audit_logs` records the actor, target, action, and JSON changes.
- Given a deactivated user tries to log in, when they submit valid credentials, then the session is immediately deleted and they see a clear deactivation message instead of being logged in.
- Given the `audit_logs` table exists, when a non-admin or unauthenticated client tries to create/update/delete rows, then Appwrite rejects the operation.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on EVERY review pass. -->

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 13 (high 5, medium 4, low 4)
- defer: 2 (low 2)
- reject: 0
- addressed_findings:
  - `[high] [patch]` Added server-side System Administrator verification to the User Management function using `req.headers['x-appwrite-user-id']` and a role `*` permission check.
  - `[high] [patch]` Changed `functions.createExecution` in `src/stores/users-store.js` to the object-style call required by appwrite ^21.5.0.
  - `[high] [patch]` Bumped the server function's `node-appwrite` dependency from `^14.1.0` to `^21.1.0`.
  - `[high] [patch]` Corrected Appwrite API-key scope names in `appwrite_setup/FUNCTION_DEPLOYMENT.md` and the spec (`databases.*` instead of `database.*`, plus `tables.*` and `rows.*`).
  - `[high] [patch]` Derived the audit-log `actor_user_id` from the server-verified caller identity; the function ignores any client-supplied actor value.
  - `[medium] [patch]` Updated the last-System-Administrator guard to paginate through all users and to treat `active !== false` as active (covers pre-existing rows with `active = null`).
  - `[medium] [patch]` Made `isUserProfileActive` in `auth-store.js` fail closed on non-404 read errors.
  - `[medium] [patch]` Added the `active` deactivation check to `authStore.fetchUser`.
  - `[medium] [patch]` Added `type="button"` to the UserFormDialog Cancel button so it does not submit the form.
  - `[low] [patch]` Replaced unsafe `JSON.stringify(...).slice(0, 2000)` audit-log truncation with a helper that guarantees valid JSON output.
  - `[low] [patch]` Updated `server/scripts/setup-appwrite.js` console summary from 25 to 26 tables.
  - `[low] [patch]` Tightened the email validation regex in `UserFormDialog.vue`.
  - `[low] [defer]` Function directory name contains a space (`User Management`), which can complicate shell/CLI usage; revisit if it causes deployment friction.
  - `[low] [defer]` `users-store.js` fetches users with `Query.limit(500)`; add pagination for deployments with more than 500 users.

## Design Notes

### Server function structure

The function follows the established `Check Users Exist` pattern: node-appwrite `Client` initialized with `setKey(req.headers['x-appwrite-key'] || process.env.APPWRITE_API_KEY)`, then `Users` and `Teams` SDKs plus `TablesDB` for table rows. Dispatch on `body.action`. All responses are JSON objects with `{ success, error }` so `users-store.js` can parse them consistently.

### Server-side caller authorization

Before dispatching any action, the function reads `req.headers['x-appwrite-user-id']`, fetches that user's `users` row with populated roles, and confirms at least one assigned role has the `*` permission. This mirrors the `wipeAllData` function's server-side RBAC check and prevents a non-admin authenticated user from invoking the function directly. The audit log records this verified caller ID, not any value from the request body.

### Team membership sync

- Add to `village_administrators`: `teams.createMembership({ teamId: 'village_administrators', userId, email, name, roles: ['admin'] })`.
- Remove from `village_administrators`: `teams.listMemberships('village_administrators')`, find membership where `userId` matches, then `teams.deleteMembership({ teamId, membershipId })`.

### Last-System-Administrator guard

1. Fetch the role row where `name === 'System Administrator'`.
2. Paginate through all `users` table rows. Treat any row with `active !== false` as active (matches the client UI and tolerates pre-existing rows before the `active` column was added).
3. Count those whose `role_ids` includes the System Administrator role ID, excluding the target user.
4. If the count is zero, return `{ success: false, error: 'Cannot deactivate the last System Administrator' }`.

### Audit log shape

`tables.createRow` in `audit_logs` with:

- `actor_user_id`: the server-verified caller user ID (read from `req.headers['x-appwrite-user-id']` after admin verification), relationship to users
- `action`: enum string
- `target_user_id`: affected user ID
- `changes_json`: JSON string of `{ before, after }` snapshot, kept within the 2000-char column limit without producing invalid JSON
- `created_at`: `new Date().toISOString()`

### Auth-store active check

In `login()` after `const user = await account.get();`, do:

```js
const profile = await tables.getRow({ databaseId, tableId: usersCollectionId, rowId: user.$id });
if (profile && profile.active === false) {
  await account.deleteSession({ sessionId: 'current' });
  this.user = null;
  this.isLoggedIn = false;
  this.userRoles = [];
  return {
    success: false,
    error: 'Your account has been deactivated. Please contact a System Administrator.',
  };
}
```

Apply the same check at the top of `checkSession()` after `account.get()`; on failure clear state and return `false`.

## Verification

**Commands:**

- `npm run lint` -- expected: no new lint errors in modified/added files.
- `npm run build` (or `quasar build`) -- expected: build completes without errors.
- `node server/scripts/setup-appwrite.js` on a fresh or existing deployment -- expected: `users.active` column and `audit_logs` table are created idempotently without data loss.

**Manual checks:**

- Open `/admin/users` as a System Administrator; confirm "Add User" button, status filter, and row actions render.
- Create a user with the System Administrator role and verify they appear in the `village_administrators` team in the Appwrite console.
- Deactivate the user, then attempt to log in as that user; confirm the deactivation message and that no session persists.
- Check the `audit_logs` collection in the Appwrite console; confirm rows exist for create/update/deactivate/reactivate with actor/target/changes.

## Auto Run Result

**Status:** done

**Summary:** Implemented Story 5.12 (User Management CRUD Operations) end-to-end. Added the `users.active` boolean column and the `audit_logs` table to `setup-appwrite.js`, created a new server-side Appwrite Function at `server/functions/User Management/src/main.js` for admin-scope user create/update/deactivate/reactivate with team sync and audit logging, added `src/stores/users-store.js`, wired `src/pages/admin/UsersPage.vue` with Add/Edit/Deactivate/Reactivate UI, added defense-in-depth `active` checks in `src/stores/auth-store.js`, and updated deployment docs and `.env.example`.

**Files changed:**

- `server/scripts/setup-appwrite.js` — `users.active` column and new `audit_logs` table.
- `.env.example` — `VITE_APPWRITE_FUNCTION_USER_MANAGEMENT`.
- `appwrite_setup/FUNCTION_DEPLOYMENT.md` — User Management function deployment guide with correct scopes.
- `server/functions/User Management/` — new function package, README, and `src/main.js`.
- `server/functions/wipeAllData/src/main.js` — include `audit_logs` in wipe list.
- `src/stores/users-store.js` — new Pinia store wrapping the User Management function.
- `src/stores/auth-store.js` — `active` checks in `login`, `checkSession`, and `fetchUser`.
- `src/pages/admin/UsersPage.vue` — Add User button, status/search filters, actions column, disabled Manage Roles placeholder.
- `src/components/admin/UserFormDialog.vue` — Add/Edit user form.
- `src/components/admin/DeactivateUserDialog.vue` — Deactivate/Reactivate confirmation with self/last-admin guards.

**Review findings:** 13 patches applied (5 high, 4 medium, 4 low); 2 items deferred. See `## Review Triage Log` for details.

**Verification:**

- `npm run lint` — passed, no errors.
- `npm run build` — passed, SPA build succeeded.

**Residual risks:**

- The new Appwrite Function and schema changes must be deployed against a live Appwrite project (`appwrite push function`, `node server/scripts/setup-appwrite.js`).
- Two low-severity items were deferred: the `server/functions/User Management/` directory name contains a space, and `users-store.js` fetches up to 500 users without pagination.
- A follow-up independent review is recommended because the pass included high-severity security and SDK-correctness fixes.
