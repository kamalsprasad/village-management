---
title: 'Story 5.13: Role Assignment and Permissions Management UI'
type: feature
created: '2026-08-04'
status: done
baseline_revision: '962331473295d511e10ca97f049afce4ae077dee'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-12-user-management-crud-operations.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-9-module-management-and-configuration.md'
warnings:
  - oversized
---

<intent-contract>

## Intent

**Problem:** The UsersPage "Manage Roles" row action is a disabled placeholder, there is no way to view a user's effective permission set, and there is no `/admin/roles` page — System Administrators cannot assign roles or inspect the role/permission matrix from the UI. Additionally, `seed-roles.js` skips existing role rows, so re-running the seeder never syncs updated `permissions`/`storage_quota` into already-seeded deployments (debt carried from 5.2/5.3/5.4/5.7).

**Approach:** Enable the "Manage Roles" row action on UsersPage and wire it to a new `ManageRolesDialog.vue` (multi-select of seeded roles + effective-permissions preview, saving via the existing 5.12 `usersStore.updateUser`). Add a "View Permissions" row action opening a read-only `ViewPermissionsDialog.vue`. Add a new read-only `/admin/roles` page (`RolesPage.vue`) listing all roles with name/category/permission count/storage quota/assigned user count and an expandable per-role permission matrix. Add the `/admin/roles` route (System Administrator only) and a nav entry. Convert `seed-roles.js` from skip-on-existing to upsert (update `permissions`/`storage_quota`/`category` on existing rows). No new tables, columns, server functions, audit enum values, permissions, or dependencies.

## Boundaries & Constraints

**Always:**

- Reuse the 5.12 `users-store.js` `fetchRoles`/`fetchUsers`/`updateUser` actions; do NOT create a `roles-store.js`. Compute assigned-user-count client-side from `usersStore.users` (count rows whose `role_ids` includes the role `$id`).
- Reuse `getAllUserPermissions` from `src/utils/permissions.js` for the effective-permission union (Manage Roles preview and View Permissions dialog). Do NOT reinvent permission-union logic.
- Reuse `formatQuota` from `src/modules/storage/utils/format-storage.js` for the Storage Quota column, converting the role's GB value to bytes (`role.storage_quota === -1 ? -1 : role.storage_quota * 1024 ** 3`) since `formatQuota` expects bytes and treats `-1` as Unlimited.
- The new `/admin/roles` route uses `requiresPermission: '*'` (System Administrator only), matching `/admin/users` and `/admin/modules`. No new permissions.
- All new/modified components use Vue 3 `<script setup>`, Quasar components, and SSR-safe `isClient` guards before client-only Appwrite calls (follow `ModulesPage.vue`/`UsersPage.vue` patterns).
- Role changes reuse the 5.12 `updateUser` server function action, which already writes an `audit_logs` row with `action: 'user_update'` and a `changes_json` before/after snapshot including the `role_ids` diff. No new audit enum value.
- Hardcoded English strings only; no emojis; no vue-i18n.

**Block If:**

- A new third-party dependency is required.
- An acceptance criterion conflicts with the PRD, architecture, or UX spec.

**Never:**

- Create new Appwrite infrastructure (tables, columns, server functions, audit enum values, `.env` variables, `FUNCTION_DEPLOYMENT.md` changes).
- Create/edit/delete roles from the `/admin/roles` UI (custom roles are post-MVP; the roles page is read-only for MVP).
- Add a new `user_role_update` audit enum value — reuse `user_update` (the `changes_json` already captures the role diff).
- Break or remove the 5.12 Add/Edit/Deactivate/Reactivate flows or the accepted admin password-reset feature in `UserFormDialog.vue` (commit `f47fc6c`).
- Change the canonical seeded role definitions (names, categories, permissions, quotas) in `seed-roles.js` — only the skip→upsert behavior changes.
- Reinvent role-fetching logic or duplicate team-sync/audit logic in the client (that lives in the server function).

## I/O & Edge-Case Matrix

| Scenario                                   | Input / State                                                                | Expected Output / Behavior                                                                                                                                                                                                   | Error Handling                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Manage Roles — open                        | Admin clicks "Manage Roles" on a user row                                    | `ManageRolesDialog` opens showing the user's name, a `q-select` multi-select pre-selected with the user's current `role_ids`, and a "View Effective Permissions" expandable preview of the union via `getAllUserPermissions` | No error expected                                                      |
| Manage Roles — save                        | Admin changes selection and clicks Save                                      | `usersStore.updateUser(userId, { role_ids: selectedIds, actorUserId })` runs; server updates `users.role_ids`, syncs `village_administrators` membership, writes `audit_logs` (`user_update` with role diff)                 | `notifySuccess`; dialog closes; UsersPage table refreshes via `@saved` |
| Manage Roles — save fails                  | Server returns `{ success: false, error }`                                   | Dialog stays open                                                                                                                                                                                                            | `notifyError(result.error)`; selection preserved                       |
| Manage Roles — no change                   | Admin opens dialog, selection equals current `role_ids`, clicks Save         | `updateUser` still called (idempotent); server writes audit log with empty role diff                                                                                                                                         | `notifySuccess`; table refreshes                                       |
| View Permissions — open                    | Admin clicks "View Permissions" on a user row                                | `ViewPermissionsDialog` opens read-only showing the user's assigned role chips and the effective permission union grouped/sorted by module                                                                                   | No error expected                                                      |
| View Permissions — user with no roles      | Target user `role_ids` is empty                                              | Dialog shows "No roles assigned" and an empty permissions list                                                                                                                                                               | No error expected                                                      |
| RolesPage — load                           | Admin navigates to `/admin/roles`                                            | `fetchRoles()` and `fetchUsers()` run (guarded by `isClient`); role table renders Name, Category, Permissions (count), Storage Quota, Assigned Users (count)                                                                 | Loading spinner while fetching; error banner with Retry on failure     |
| RolesPage — expand role                    | Admin clicks "View Permissions" row expansion                                | Per-role permission list renders, grouped by module (e.g. `farm:` → `farm:read`, `farm:write`), read-only                                                                                                                    | No error expected                                                      |
| RolesPage — System Administrator role      | Role with `permissions: ['*']`                                               | Permissions count shows `1`; expansion shows "All permissions (wildcard `*`)"                                                                                                                                                | No error expected                                                      |
| RolesPage — assigned user count            | `usersStore.users` contains N users whose `role_ids` includes the role `$id` | Assigned Users column shows N                                                                                                                                                                                                | Count is approximate above 500 users (deferred 5.12 cap)               |
| seed-roles — re-run on existing deployment | `seed-roles.js` run against a project that already has role rows             | Existing roles matched by `name` are UPDATED (`permissions`/`storage_quota`/`category`); new roles are CREATED; logs distinguish "Updated" vs "Created"                                                                      | Idempotent; no data loss                                               |
| seed-roles — fresh deployment              | No existing role rows                                                        | All roles created via `createRow`                                                                                                                                                                                            | No error expected                                                      |

</intent-contract>

## Code Map

- `server/scripts/seed-roles.js` -- Role seeder; convert the `continue` skip (lines 318-320) into an `updateRow` upsert that overwrites `permissions`/`storage_quota`/`category` on existing role rows matched by `name`. Keep the `createRow` path for new roles. Update the file-header NOTE that currently claims re-running won't update existing rows.
- `src/router/routes.js` -- Add a new `/admin/roles` route under the MainLayout children, sibling to `/admin/users` and `/admin/modules`, with `meta: { requiresAuth: true, requiresPermission: '*' }`, lazy-importing `pages/admin/RolesPage.vue`.
- `src/layouts/MainLayout.vue` -- Add a "Roles & Permissions" `q-item` nav entry inside the Administration `q-expansion-item` (visible via `hasPermission('*')`), placed after "User Management" and before "Module Management", routing to `/admin/roles` with a `shield`/`verified_user` icon.
- `src/pages/admin/RolesPage.vue` -- NEW read-only roles page. Header "Roles & Permissions" with a "Custom role creation is deferred to post-MVP" banner. `q-table` of roles with columns: Name, Category, Permissions (count = `role.permissions.length`), Storage Quota (`formatQuota`), Assigned Users (count from `usersStore.users`). Expandable row ("View Permissions") showing that role's permissions grouped by module. SSR-safe `onMounted` fetch via `usersStore.fetchRoles()` + `usersStore.fetchUsers()`. No create/edit/delete buttons.
- `src/components/admin/ManageRolesDialog.vue` -- NEW dialog. Shows target user name; `q-select` multiple `use-chips` of all seeded roles (option-value `$id`, option-label `name`) pre-selected with current `role_ids`; expandable "View Effective Permissions" section showing the union of the currently-selected roles' permissions via `getAllUserPermissions` (live-updates as selection changes), grouped by module; Save calls `usersStore.updateUser(userId, { role_ids, actorUserId: authStore.currentUser?.$id })`; Cancel/Save buttons. Emits `saved` on success.
- `src/components/admin/ViewPermissionsDialog.vue` -- NEW read-only dialog. Shows target user name, assigned role chips (reuse `getRoleColor` color map), and the effective permission union via `getAllUserPermissions` grouped by module. No Save button — only a Close button.
- `src/pages/admin/UsersPage.vue` -- ENABLE the "Manage Roles" row action (remove `disable` + the "Available in a future update" tooltip) and wire it to `ManageRolesDialog`; ADD a "View Permissions" row action (`visibility` icon) wired to `ViewPermissionsDialog`. Add the two dialogs to the template with `v-model` + `:user` + `:roles`/`:all-users` props and `@saved` (Manage Roles only). Do NOT touch the Add/Edit/Deactivate flows.

## Tasks & Acceptance

**Execution:**

- [x] `server/scripts/seed-roles.js` -- Replace the `if (existingRole) { console.log(...already exists...); continue; }` block (lines 318-321) with an upsert: when a role exists by `name`, call `tables.updateRow({ databaseId, tableId: rolesTableId, rowId: existingRole.$id, data: { permissions: role.permissions, storage_quota: role.storage_quota, category: role.category } })` and log `Updated role: <name>`; otherwise keep the existing `createRow` path logging `Created role: <name>`. Track `updatedCount` alongside `seededCount` and print both in the summary. Update the file-header NOTE block (lines 63-67) to state the seeder is now upsert-capable and re-running syncs `permissions`/`storage_quota`/`category` on existing roles. -- Closes the seed-roles upsert debt owned by 5.13 (from 5.2/5.3/5.4/5.7); idempotent re-runs keep role permissions in sync with the codebase.
- [x] `src/router/routes.js` -- Add a new child route `{ path: 'admin/roles', component: () => import('pages/admin/RolesPage.vue'), meta: { requiresAuth: true, requiresPermission: '*' } }` placed immediately after the `admin/modules` route entry. -- AC4 routing for the read-only roles page; System Administrator only.
- [x] `src/layouts/MainLayout.vue` -- Inside the Administration `q-expansion-item`, add a `q-item` (clickable, `to="/admin/roles"`, `class="nav-sub-item"`, `active-class="nav-sub-item--active"`) with a `verified_user` (or `shield`) icon and label "Roles & Permissions", placed after the "User Management" item and before the "Module Management" item. -- AC4 navigation entry under the admin/settings group.
- [x] `src/pages/admin/RolesPage.vue` -- Create the new read-only page using `<script setup>`. Template: header "Roles & Permissions" + a `q-banner` (info, rounded) reading "Custom role creation is deferred to post-MVP. Roles are seeded via script."; loading spinner (`!isClient || isLoading`); error banner with Retry; `q-card` containing a `q-table` (`row-key="$id"`, `:rows="usersStore.roles"`, `:columns`, `:pagination`) with columns Name (`name`), Category (`category`), Permissions (`permissions.length`), Storage Quota (formatted via `formatQuota(role.storage_quota === -1 ? -1 : role.storage_quota * 1024 ** 3)`), Assigned Users (computed count). Use the `body-cell-permissions`/`body-cell-storage_quota`/`body-cell-assigned_users` slots. Add an expandable row (`q-tr` with `v-if="props.expand"` + `q-td` colspan) triggered by a "View Permissions" `q-btn` in an Actions slot, rendering the role's permissions grouped by module (build a `{ module: [actions] }` map from `permission.split(':')`, sort modules and actions). For the System Administrator role (`permissions` includes `*`), show "All permissions (wildcard \*)" instead of a grouped list. Compute assigned-user-count via a `computed` that maps each role `$id` to `usersStore.users.filter(u => Array.isArray(u.role_ids) && u.role_ids.some(rid => (typeof rid === 'object' ? rid.$id : rid) === role.$id)).length`. `onMounted`: set `isClient = true`, `await Promise.all([usersStore.fetchRoles(), usersStore.fetchUsers()])`. No create/edit/delete controls. -- AC4, AC5, AC6.
- [x] `src/components/admin/ManageRolesDialog.vue` -- Create the new dialog using `<script setup>`. Props: `modelValue` (Boolean), `user` (Object), `roles` (Array). Emits: `update:modelValue`, `saved`. Use `useAuthStore` for `currentUser?.$id` and `useUsersStore` for `updateUser`; `useErrorHandler` for `notifySuccess`/`notifyError`. State: `selectedRoleIds` (ref array), `loading` (ref), `showEffectivePermissions` (ref bool). `watch([() => props.modelValue, () => props.user])`: when open and `user` present, set `selectedRoleIds` to `extractRoleIds(props.user.role_ids)` (handle both ID-string and populated-object forms, mirroring `UserFormDialog.vue`'s `extractRoleIds`). Computed `selectedRoleObjects` = `selectedRoleIds.value.map(id => roles.find(r => r.$id === id)).filter(Boolean)`; `effectivePermissions` = `getAllUserPermissions(selectedRoleObjects.value)`; `groupedPermissions` = group by module prefix. Template: `q-dialog` + `q-card` (max-width 600px); header "Manage Roles — <user.name>"; `q-select` (multiple, `use-chips`, `emit-value`, `map-options`, `option-value="$id"`, `option-label="name"`, `:options="roles"`, label "Assigned Roles", rule "Select at least one role"); expandable "View Effective Permissions" `q-expansion-item` rendering `groupedPermissions` (or "All permissions (wildcard _)" if `_`present); Save/Cancel buttons. On Save:`loading = true`; `result = await usersStore.updateUser(props.user.$id, { role_ids: selectedRoleIds.value, actorUserId: authStore.currentUser?.$id })`; on success `notifySuccess('Roles updated successfully.')`, emit `update:modelValue(false)`, emit `saved`; on failure `notifyError(result.error || 'Failed to update roles')`; `loading = false`in finally. -- AC1, AC2, AC7 (audit via reused`updateUser`).
- [x] `src/components/admin/ViewPermissionsDialog.vue` -- Create the new read-only dialog using `<script setup>`. Props: `modelValue` (Boolean), `user` (Object), `roles` (Array). Emits: `update:modelValue`. Computed `userRoleObjects` = resolve `user.role_ids` to role objects (handle both ID-string and populated-object forms); `effectivePermissions` = `getAllUserPermissions(userRoleObjects.value)`; `groupedPermissions` = group by module prefix. Template: `q-dialog` + `q-card` (max-width 600px); header "Effective Permissions — <user.name>"; role chips (reuse a local `getRoleColor` map matching `UsersPage.vue`); if no roles, show "No roles assigned"; render `groupedPermissions` (or "All permissions (wildcard _)" if `_` present) as a read-only grouped list; a single "Close" button. No Save button, no write path. -- AC3.
- [x] `src/pages/admin/UsersPage.vue` -- In the `body-cell-actions` template slot, REPLACE the disabled "Manage Roles" placeholder (`<span><q-btn ... disable></q-btn><q-tooltip>Available in a future update</q-tooltip></span>`) with an enabled `q-btn` (flat, dense, round, icon `admin_panel_settings`, color `primary`, `@click="openManageRolesDialog(props.row)"`) with tooltip "Manage Roles". ADD a new `q-btn` (flat, dense, round, icon `visibility`, color `info`, `@click="openViewPermissionsDialog(props.row)"`) with tooltip "View Permissions". Add `showManageRolesDialog` and `showViewPermissionsDialog` refs. Add `openManageRolesDialog(user)` and `openViewPermissionsDialog(user)` functions that set `selectedUser` and toggle the respective ref. Add `<ManageRolesDialog v-model="showManageRolesDialog" :user="selectedUser" :roles="usersStore.roles" @saved="fetchAll" />` and `<ViewPermissionsDialog v-model="showViewPermissionsDialog" :user="selectedUser" :roles="usersStore.roles" />` to the template (after `DeactivateUserDialog`). Import both components. Do NOT modify the Add/Edit/Deactivate/Reactivate handlers or the `UserFormDialog`/`DeactivateUserDialog` wiring. -- AC1, AC3.

**Acceptance Criteria:**

- Given a System Administrator is on `/admin/users`, when they click the "Manage Roles" row action on a user, then the `ManageRolesDialog` opens showing the user's name, a multi-select of all seeded roles pre-selected with the user's current `role_ids`, and a "View Effective Permissions" preview of the union.
- Given the Manage Roles dialog is open, when the admin changes the role selection and clicks Save, then `usersStore.updateUser(userId, { role_ids })` is called, the server updates `users.role_ids`, syncs `village_administrators` membership, and writes an `audit_logs` row with `action: 'user_update'` and the `role_ids` before/after diff in `changes_json`.
- Given a System Administrator is on `/admin/users`, when they click the "View Permissions" row action on a user, then a read-only `ViewPermissionsDialog` opens showing the user's assigned role chips and the effective permission union (grouped by module) with no Save button.
- Given a System Administrator navigates to `/admin/roles`, then a read-only roles page renders listing all roles with columns Name, Category, Permissions (count), Storage Quota, and Assigned Users (count), and a "Custom role creation is deferred to post-MVP" banner is visible.
- Given the `/admin/roles` page is loaded, when the admin clicks "View Permissions" on a role row, then an expandable section shows that role's permissions grouped by module (or "All permissions (wildcard \*)" for the System Administrator role), read-only.
- Given the `/admin/roles` page, there are no create/edit/delete role controls, and the route is gated by `requiresPermission: '*'` (System Administrator only).
- Given a role change is saved via the Manage Roles dialog, when the server processes the `updateUser` action, then an `audit_logs` row is written with `action: 'user_update'` (no new audit enum value) and the `role_ids` diff captured in `changes_json`.
- Given `seed-roles.js` is re-run on a deployment that already has role rows, when a role already exists by `name`, then its `permissions`/`storage_quota`/`category` are updated to match the seeder's canonical definition (and new roles are still created), and the run is idempotent.
- Given the 5.12 UsersPage flows (Add/Edit/Deactivate/Reactivate) and the admin password-reset feature in `UserFormDialog.vue`, when 5.13 is implemented, then those flows remain functional and unchanged.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on EVERY review pass. -->

### 2026-08-04 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 1 (high 1)
- reject: 14 (medium 2, low 4, low 8)
- addressed_findings:
  - none
- deferred_findings:
  - `[high]` `[defer]` No last-System-Administrator guard on role removal via `updateUser`: the 5.12 `updateUser` server function has no last-admin check for `role_ids` changes (only `deactivateUser` does). An admin could remove the System Administrator role from the only remaining admin via ManageRolesDialog (or via the pre-existing 5.12 UserFormDialog edit-mode role multi-select), locking the system out of the admin UI. This is a pre-existing gap from 5.12 (UserFormDialog edit mode also calls `updateUser` with `role_ids`), surfaced incidentally by 5.13's new UI — not caused by 5.13. Deferred to `deferred-work.md` for focused attention.
- rejected_findings (summary):
  - SSR-safety gap in dialogs: dialogs render only when open (client-only); no Appwrite calls during SSR render.
  - Assigned-user-count above 500 users: explicitly documented as accepted MVP behavior in the spec I/O matrix (deferred 5.12 cap).
  - ViewPermissionsDialog `v-close-popup` vs emit: idiomatic Quasar pattern; both patterns valid.
  - ManageRolesDialog "Select at least one role" validation: mirrors 5.12 UserFormDialog's identical rule.
  - seed-roles.js no `failedCount` in summary: consistent with pre-existing `createRow` error handling.
  - Edge cases (undefined in role_ids, rapid Save race, mixed role_ids format, storage_quota null/negative/non-numeric, name case collision, empty defaultRoles, null existingRoles.rows): unrealistic for Appwrite schema-constrained data, handled by existing Quasar `:loading`/`:disable` patterns, consistent with established code, or graceful degradation.

## Design Notes

**Permission grouping helper (shared inline logic):** Both `ManageRolesDialog` and `ViewPermissionsDialog` (and the `RolesPage` expansion) need to render a permission list grouped by module. Implement a small local function in each component (avoid a new shared util file to keep the change surface minimal):

```js
function groupPermissionsByModule(permissions) {
  if (!permissions || permissions.length === 0) return [];
  if (permissions.includes('*')) return null; // caller renders "All permissions (wildcard *)"
  const map = new Map();
  for (const p of permissions) {
    const [module, action] = p.split(':');
    if (!map.has(module)) map.set(module, []);
    map.get(module).push(action || p);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([module, actions]) => ({ module, actions: actions.sort() }));
}
```

A `null` return means "wildcard present — render the All permissions string".

**Assigned-user-count resolution:** `usersStore.users` rows may carry `role_ids` as either an array of ID strings or an array of populated role objects (the `fetchUsers` query uses `Query.select(['*', 'role_ids.*'])`). Normalize each entry with `(typeof rid === 'object' ? rid.$id : rid)` before comparing to `role.$id`, mirroring `UsersPage.vue`'s `withRoleObjects` handling.

**Storage quota formatting:** `role.storage_quota` is stored in GB (per `seed-roles.js`). `formatQuota` expects bytes and treats `-1` as Unlimited. Convert: `formatQuota(role.storage_quota === -1 ? -1 : role.storage_quota * 1024 ** 3)`.

**Audit logging confirmation:** The 5.12 `updateUser` server function (`server/functions/User Management/src/main.js` lines 243-342) already writes an `audit_logs` row with `action: 'user_update'` and a `before`/`after` snapshot that includes `role_ids`. 5.13 introduces NO new audit enum value — a role-only change is recorded as `user_update` with the role diff in `changes_json`. This is by design (avoids a schema + function change for no functional gain).

**Seed-roles upsert scope:** Only the skip branch (lines 318-321) changes. The canonical `defaultRoles` array (names, categories, permissions, quotas) is unchanged. No data migration is required (greenfield project); the change only ensures future re-runs keep role rows in sync with the codebase.

## Verification

**Commands:**

- `npm run lint` -- expected: no new lint errors in modified/added files.
- `npm run build` (or `quasar build`) -- expected: SPA build completes without errors.
- `node server/scripts/seed-roles.js` (against a configured Appwrite project) -- expected: existing roles log "Updated role: <name>", new roles log "Created role: <name>", summary prints both counts; re-running produces the same result (idempotent).

**Manual checks:**

- Open `/admin/users` as a System Administrator; confirm the "Manage Roles" row action is enabled (no longer greyed out) and opens `ManageRolesDialog` pre-selected with the user's current roles; change roles, Save, and confirm the table refreshes and an `audit_logs` row with `action: 'user_update'` and the `role_ids` diff appears in the Appwrite console.
- Confirm the "View Permissions" row action opens a read-only dialog with the user's role chips and grouped effective permissions (no Save button).
- Navigate to `/admin/roles`; confirm the role table renders all columns, the "Custom role creation is deferred to post-MVP" banner is visible, expanding a role shows its grouped permissions, the System Administrator role shows "All permissions (wildcard \*)", and the Assigned Users count matches the UsersPage.
- Confirm `/admin/roles` is inaccessible to non-System-Administrator users (route guard redirects to `/unauthorized`).
- Confirm the 5.12 Add/Edit/Deactivate/Reactivate flows and the admin password-reset in `UserFormDialog.vue` still work.

## Auto Run Result

**Status:** done

**Summary:** Implemented Story 5.13 (Role Assignment and Permissions Management UI) end-to-end. Enabled the UsersPage "Manage Roles" row action and wired it to a new `ManageRolesDialog.vue` (multi-select of seeded roles + effective-permissions preview, saving via the reused 5.12 `usersStore.updateUser` action). Added a "View Permissions" row action opening a read-only `ViewPermissionsDialog.vue`. Created a new read-only `/admin/roles` page (`RolesPage.vue`) with a role table (Name, Category, Permissions count, Storage Quota, Assigned Users count) and an expandable per-role permission matrix grouped by module. Added the `/admin/roles` route (`requiresPermission: '*'`) and a nav entry under Administration. Converted `seed-roles.js` from skip-on-existing to upsert (updateRow on existing roles matched by name). No new tables, columns, server functions, audit enum values, permissions, or dependencies.

**Files changed:**

- `server/scripts/seed-roles.js` — skip-on-existing converted to `updateRow` upsert (updates `permissions`/`storage_quota`/`category` on existing roles); summary now prints both seeded and updated counts; header NOTE updated.
- `src/router/routes.js` — new `/admin/roles` route with `requiresPermission: '*'`.
- `src/layouts/MainLayout.vue` — "Roles & Permissions" nav entry under Administration (after User Management, before Module Management).
- `src/pages/admin/RolesPage.vue` — new read-only roles page with role table + expandable per-role permission matrix + "Custom role creation is deferred to post-MVP" banner.
- `src/components/admin/ManageRolesDialog.vue` — new dialog: role multi-select pre-selected with current role_ids + "View Effective Permissions" preview + Save via `usersStore.updateUser`.
- `src/components/admin/ViewPermissionsDialog.vue` — new read-only dialog: role chips + effective permission union grouped by module, Close button only.
- `src/pages/admin/UsersPage.vue` — enabled "Manage Roles" row action + added "View Permissions" row action + wired both dialogs. 5.12 flows untouched.

**Review findings:** 0 patches applied, 0 bad_spec, 0 intent_gap, 1 item deferred (high — last-System-Admin role-removal guard gap in 5.12 `updateUser`, pre-existing from 5.12, surfaced by 5.13), 14 rejected. See `## Review Triage Log` for details.

**Verification:**

- `npm run lint` — passed (exit 0, no errors).
- `npm run build` — passed (SPA build succeeded, exit 0).
- `node server/scripts/seed-roles.js` — not run against a live Appwrite project in this session (requires configured `.env` + running Appwrite); logic verified by code inspection (upsert branch calls `tables.updateRow` with `permissions`/`storage_quota`/`category`; create branch unchanged; idempotent by design).

**Residual risks:**

- The seed-roles upsert and the full UI flows (Manage Roles save, View Permissions, RolesPage) must be exercised against a live Appwrite project to confirm end-to-end behavior (audit log row, team sync, role row updates).
- One high-severity deferred item: the 5.12 `updateUser` server function has no last-System-Administrator guard for `role_ids` changes — an admin can remove the System Admin role from the only remaining admin, locking the system out of the admin UI. This is pre-existing from 5.12 (UserFormDialog edit mode has the same gap) and is documented in `deferred-work.md` for a post-MVP hardening pass.
- `followup_review_recommended: false` — the final review pass made no review-driven code changes (0 patches, 0 bad_spec); the only actionable finding is a pre-existing deferred item. An independent follow-up review is not warranted for 5.13's own changes.
