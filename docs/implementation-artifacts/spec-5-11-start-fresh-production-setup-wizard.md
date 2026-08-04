---
title: 'Story 5.11: Start Fresh Production Setup Wizard'
type: feature
created: '2026-08-04'
status: in-review
baseline_revision: 'd1018561d154e0b4bb89dcb3bb36d5223b56846c'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-9-module-management-and-configuration.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-12-user-management-crud-operations.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-13-role-assignment-and-permissions-management-ui.md'
warnings:
  - multiple-goals
  - oversized
---

<intent-contract>

## Intent

**Problem:** `SetupWizard.vue`'s "Start Fresh with Real Data" card is a disabled "Coming in future update" placeholder, so a production deployment has no in-app path to configure a real village from an empty database. Separately, `updateUser` has no last-System-Administrator guard on `role_ids` changes (only `deactivateUser` does), so an admin can lock the system out via role edits.

**Approach:** Enable the Start Fresh card on `SetupWizard.vue` and add a new `StartFreshWizard.vue` component (rendered inline, no new route) implementing a 5-step `q-stepper`: Village Profile → Admin User → Village Head → Module Selection → First Household. Each step reuses existing store actions (`settingsStore.createSettings`/`updateSettings`/`updateModulesEnabled`, `usersStore.createUser`/`fetchRoles`, `householdsStore.createHousehold`, `authStore.user`). On completion, redirect to `/`. Add empty-state CTA banners to the dashboard and the Households/Residents/Finance list pages respecting household-before-resident ordering. Add a last-System-Administrator guard to `updateUser` mirroring `deactivateUser`'s existing guard.

## Boundaries & Constraints

**Always:**

- No new Appwrite tables, columns, server functions, audit enum values, permissions, or `.env` variables.
- `StartFreshWizard.vue` is a new component rendered conditionally inside `SetupWizard.vue` (toggled by a local ref) — no new `/setup/*` route. `SetupWizard.vue` remains the card-chooser.
- Reuse `settingsStore.createSettings` (no `settings_root` row exists — post-wipe or brand-new deploy) vs `settingsStore.updateSettings` (row already exists) based on `settingsStore.settings` after `loadSettings()`. Never call `createSettings` when a row exists (it would 409).
- `settingsStore.createSettings` requires a `council_members` array on its input (it unconditionally calls `.map()` on it) — the wizard must always pass `council_members: []`.
- Step 1 defaults: `default_currency: 'ZMW'`, `currency_symbol: 'K'`, `timezone: 'Africa/Lusaka'`, `country_code: 'ZM'` (displayed as "Zambia" — there is no separate `country` column), `country_phone_code: '+260'`, `yield_unit: 'kg_per_hectare'`, `lending_enabled: false`, `is_using_sample_data: false`, `modules_enabled` seeded with `[...CORE_MODULE_KEYS]` at creation time (Step 4 later overwrites with the full selection). All fields are user-overridable inputs, not hardcoded.
- Step 3 resolves the Village Head role id via `usersStore.fetchRoles()` then finding `roles.find(r => r.name === 'Village Head')` (exact seeded name from `server/scripts/seed-roles.js:189`).
- Step 4 uses `ModuleSelectionGrid.vue` with optional modules restricted to exactly `farm`, `school`, `vendors` (already enforced by `OPTIONAL_MODULE_KEYS` in `src/utils/module-registry.js` — do not pass a custom `modules` prop that adds others).
- All new/modified components use Vue 3 `<script setup>`, Quasar components, and SSR-safe `isClient` guards before client-only Appwrite/store calls.
- Hardcoded English strings only; no emojis; no vue-i18n.
- The last-admin guard added to `updateUser` mirrors `deactivateUser`'s shape exactly: reuse the existing `roleIdsIncludeSystemAdmin` and `countOtherActiveSystemAdmins` helpers already in `server/functions/User Management/src/main.js`; no new helper duplication.

**Block If:**

- A new third-party dependency is required.
- An acceptance criterion conflicts with the PRD, architecture, or UX spec.

**Never:**

- Create a second admin account in Step 2 (it only displays `authStore.user.name`/`email` read-only).
- Add Guests/Equipment/Energy to the Step 4 optional module list.
- Duplicate user-creation, module-toggle, or household-creation logic that already lives in the reused stores/functions.
- Modify `wipeAllData` (`server/functions/wipeAllData/src/main.js`) or `SampleDataBanner.vue` — both already redirect to `/setup` correctly.
- Change the seeded role definitions in `seed-roles.js`.

## I/O & Edge-Case Matrix

| Scenario                                          | Input / State                                                                                                            | Expected Output / Behavior                                                                                                                                      | Error Handling                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Start Fresh — card click                          | Admin clicks "Start Fresh with Real Data" on `/setup`                                                                    | `SetupWizard.vue` swaps to `StartFreshWizard.vue`; "Load Sample Data" flow unaffected                                                                           | No error expected                                                                        |
| Step 1 — no settings row (post-wipe or brand-new) | `settingsStore.loadSettings()` returns `isFirstRun: true`                                                                | `createSettings({ ...formFields, council_members: [], modules_enabled: [...CORE_MODULE_KEYS], is_using_sample_data: false, lending_enabled: false })` is called | `notifyError` from the store on failure; stepper stays on Step 1                         |
| Step 1 — settings row exists (re-entry)           | `settingsStore.settings` is non-null                                                                                     | `updateSettings({ ...formFields, is_using_sample_data: false })` is called instead                                                                              | Same as above                                                                            |
| Step 3 — skip                                     | Admin selects "I am the Village Head"                                                                                    | No `createUser` call; wizard proceeds to Step 4                                                                                                                 | No error expected                                                                        |
| Step 3 — create Village Head                      | Admin fills name/email/password, clicks Next                                                                             | `usersStore.createUser({ name, email, password, role_ids: [villageHeadRoleId] })`; Village Head role id resolved from `usersStore.roles`                        | `notifyError(result.error)` from `_callUserManagementFunction`; stepper stays on Step 3  |
| Step 4 — save modules                             | Admin toggles Farm/School/Vendors, clicks Next                                                                           | `settingsStore.updateModulesEnabled([...CORE_MODULE_KEYS, ...selectedOptional])`                                                                                | Error notified by the store; stepper stays on Step 4                                     |
| Step 5 — create household                         | Admin fills name (required), type, construction date, clicks Finish                                                      | `householdsStore.createHousehold({ name, household_type, construction_date })`; then `router.push('/')`                                                         | Error notified by the store; stepper stays on Step 5                                     |
| Completion                                        | Step 5 succeeds                                                                                                          | `settingsStore.loadSettings()` is refreshed before redirect so the sample-data banner does not appear (`is_using_sample_data` is `false`)                       | N/A                                                                                      |
| Post-wipe re-entry to `/setup`                    | `settingsStore.isFirstRun === true` after `wipeAllData`                                                                  | Router guard in `router-guards.js` already admits `/setup` because `isFirstRun` is `true` (verified — no guard change needed)                                   | N/A                                                                                      |
| Last-admin guard — blocked                        | `updateUser` called with `role_ids` that drop the only System Administrator's `*` role and no other active user holds it | Returns `{ success: false, error: 'Cannot remove the last System Administrator' }`; no row mutation, no audit log written                                       | `ManageRolesDialog`/`UserFormDialog` show the error via `notifyError`; dialog stays open |
| Last-admin guard — allowed                        | Same, but another active user still holds the System Administrator role                                                  | `updateUser` proceeds normally (existing behavior unchanged)                                                                                                    | N/A                                                                                      |

</intent-contract>

## Code Map

- `src/pages/setup/SetupWizard.vue` -- Enable the Start Fresh card; add a local `showStartFresh` ref that swaps in `StartFreshWizard.vue`.
- `src/components/setup/StartFreshWizard.vue` (NEW) -- The 5-step `q-stepper` wizard component.
- `server/functions/User Management/src/main.js` -- Add last-System-Administrator guard inside `updateUser` (~line 267, right after `wasSystemAdmin` is computed).
- `src/pages/dashboard/DashboardPage.vue` -- Add empty-state guidance banner (household-before-resident ordering).
- `src/pages/households/HouseholdsListPage.vue` -- Add empty-state banner replacing the table when `pagination.total === 0`.
- `src/pages/residents/ResidentsListPage.vue` -- Add empty-state banner (household-gated wording) when `residentsStore.pagination.total === 0`.
- `src/modules/finance/pages/FinanceTransactionsPage.vue` -- Add empty-state banner when `financeStore.pagination.total === 0`.
- `docs/sprint-status.yaml` -- Flip `5-11-start-fresh-production-setup-wizard` to `done` after verification.
- Reused, unmodified: `src/stores/settings-store.js` (`createSettings`/`updateSettings`/`updateModulesEnabled`/`loadSettings`), `src/stores/users-store.js` (`createUser`/`fetchRoles`), `src/stores/households-store.js` (`createHousehold`), `src/stores/auth-store.js` (`user`), `src/utils/module-registry.js` (`CORE_MODULE_KEYS`/`OPTIONAL_MODULE_KEYS`), `src/components/admin/ModuleSelectionGrid.vue`, `src/boot/router-guards.js` (verified — no gap).

## Tasks & Acceptance

**Execution:**

- [x] `src/components/setup/StartFreshWizard.vue` -- Create the component: `q-stepper` (vertical or horizontal, `flat bordered`, `animated`) with 5 `q-step` panels titled "Village Profile", "Admin User", "Village Head", "Module Selection", "First Household"; each step shows a "Step X of 5" caption; Back is disabled on step 1; each Next validates the current step's form before advancing. Step 1: `q-input` for name/address, `q-input type="date"` (or `q-date` popup) for established date, `q-select` for currency (default ZMW)/timezone (default Africa/Lusaka, reuse the option list style from `VillageSettingsPage.vue`)/country (default Zambia/ZM), a note "Defaults are set for Zambia. Adjust if your village is elsewhere." On Next: call `settingsStore.loadSettings()`; if `settingsStore.settings` is falsy, call `createSettings({ village_name, address, established_date, default_currency, currency_symbol, timezone, country_code, country_phone_code, council_members: [], modules_enabled: [...CORE_MODULE_KEYS], vendors_enabled: true, yield_unit: 'kg_per_hectare', is_using_sample_data: false, lending_enabled: false })`; else call `updateSettings({ village_name, address, established_date, default_currency, currency_symbol, timezone, country_code, country_phone_code, is_using_sample_data: false })`. -- Satisfies AC3.
- [x] `src/components/setup/StartFreshWizard.vue` -- Step 2: render `authStore.user.name` and `authStore.user.email` read-only (no form, no inputs); "Next" advances. -- Satisfies AC4.
- [x] `src/components/setup/StartFreshWizard.vue` -- Step 3: `q-option-group` (radio) with "I am the Village Head" (default) and "Create a different Village Head user"; when the second option is selected, show name/email/password `q-input`s (mirror validation rules from `UserFormDialog.vue`: name required, valid email, password min 8 chars). On mount, call `usersStore.fetchRoles()` once and resolve `villageHeadRoleId = usersStore.roles.find(r => r.name === 'Village Head')?.$id`. On Next when creating: call `usersStore.createUser({ name, email, password, role_ids: [villageHeadRoleId] })`; on `result.success === false`, show `notifyError(result.error)` and stay on the step. -- Satisfies AC5.
- [x] `src/components/setup/StartFreshWizard.vue` -- Step 4: render `<ModuleSelectionGrid v-model="enabledModules" />` (default `modelValue` seeded from `settingsStore.modulesEnabled`, or `[...CORE_MODULE_KEYS]` if empty); a note "You can enable/disable modules later in Settings". On Next: call `settingsStore.updateModulesEnabled(enabledModules)`. -- Satisfies AC6.
- [x] `src/components/setup/StartFreshWizard.vue` -- Step 5: `q-input` for household name (required), `q-select` for `household_type` (reuse the same type options as `HouseholdForm.vue`), `q-input type="date"` for construction date (optional). On "Finish": call `householdsStore.createHousehold({ name, household_type, construction_date })`; on success, call `settingsStore.loadSettings()` (refresh so `isUsingSampleData` is false) then `router.push('/')`. -- Satisfies AC7 and AC9.
- [x] `src/pages/setup/SetupWizard.vue` -- Remove `disabled-card`/"Coming in future update" chip/disabled button from the Start Fresh card; wire its click (and the card's `@click`) to set `showStartFresh.value = true`; when `showStartFresh` is true, render `<StartFreshWizard />` instead of the two option cards; keep the sample-data card and `handleLoadSampleData` untouched. -- Satisfies AC1 and AC2.
- [x] `server/functions/User Management/src/main.js` -- In `updateUser`, immediately after `const wasSystemAdmin = await roleIdsIncludeSystemAdmin(tablesDB, beforeRoleIds);`, add: if `Array.isArray(roleIds) && wasSystemAdmin`, compute `isSystemAdminAfter = await roleIdsIncludeSystemAdmin(tablesDB, roleIds)`; if `!isSystemAdminAfter`, call `countOtherActiveSystemAdmins(tablesDB, userId)` and if it returns `0`, `return { success: false, error: 'Cannot remove the last System Administrator' }` before any mutation (`users.updateEmail`/`updateName`/`tablesDB.updateRow` must not run). -- Closes the 5.13 deferred HIGH item; satisfies the last-admin-guard requirement.
- [x] `src/pages/dashboard/DashboardPage.vue` -- In `onMounted` (after `isClient.value = true`), fetch `households` count (`tables.listRows` with `Query.limit(1)` on `VITE_APPWRITE_TABLE_HOUSEHOLDS`, read `.total`) into a `householdCount` ref; if `> 0`, also fetch `residents` count the same way into `residentCount`. In the template, above the widgets grid, show a `q-banner` "Welcome! Start by adding your first household." with a CTA `q-btn` `to="/households"` when `householdCount === 0`, else a `q-banner` "Add your first resident to your household." with a CTA `q-btn` `to="/residents"` when `householdCount > 0 && residentCount === 0`. -- Satisfies AC10 (dashboard).
- [x] `src/pages/households/HouseholdsListPage.vue` -- When `!householdsStore.isLoading && householdsStore.pagination.total === 0`, render a `q-banner` "No households yet. Add your first household." in place of the `q-table` card, with a CTA `q-btn` (gated on `hasPermission('households:write')`) that sets `showAddDialog = true`. -- Satisfies AC10 (households list).
- [x] `src/pages/residents/ResidentsListPage.vue` -- When `!residentsStore.isLoading && residentsStore.pagination.total === 0`, render a `q-banner` in place of the `q-table` card: if `householdsStore.pagination.total === 0`, text "Please create at least one household before adding residents." with a CTA `q-btn` `to="/households"`; else "No residents yet. Add your first resident." with a CTA `q-btn` (gated on `hasPermission('residents:write')`) that sets `showAddDialog = true`. -- Satisfies AC10 (residents list, household-before-resident ordering).
- [x] `src/modules/finance/pages/FinanceTransactionsPage.vue` -- When `!financeStore.isLoading && financeStore.pagination.total === 0`, render a `q-banner` "No transactions recorded. Record your first income or expense." in place of the transactions table, with a CTA `q-btn` (gated on `hasPermission('finance:write')`) that calls `openAddDialog('income')`. -- Satisfies AC10 (finance list).
- [x] `docs/sprint-status.yaml` -- Update `5-11-start-fresh-production-setup-wizard` from `backlog` to `done` after verification. -- Final status tracking.

**Acceptance Criteria:**

- **Given** an admin on `/setup`, **when** they click "Start Fresh with Real Data", **then** the 5-step wizard renders in place of the two cards and the "Load Sample Data" card/flow is unaffected.
- **Given** the wizard is open, **when** the admin progresses through steps, **then** they occur in the order Village Profile → Admin User → Village Head → Module Selection → First Household, each showing "Step X of 5", with Back disabled only on step 1.
- **Given** Step 1 is submitted with no existing `settings_root` row, **when** Next is clicked, **then** `village_settings` is created with `is_using_sample_data: false` and the Zambia defaults are used unless overridden.
- **Given** Step 1 is submitted when a `settings_root` row already exists, **when** Next is clicked, **then** `updateSettings` is called instead of `createSettings` and `is_using_sample_data` is set to `false`.
- **Given** Step 3, **when** the admin selects "I am the Village Head", **then** no user is created and no error occurs.
- **Given** Step 3, **when** the admin creates a Village Head user, **then** `usersStore.createUser` is called with `role_ids` containing only the Village Head role id resolved from `usersStore.roles`.
- **Given** Step 4, **when** the admin toggles Farm/School/Vendors and proceeds, **then** `settingsStore.updateModulesEnabled` is called with the core keys plus exactly the selected optional keys, and no deferred module keys (Guests/Equipment/Energy) are ever presented or sent.
- **Given** Step 5 succeeds, **when** the wizard finishes, **then** the app redirects to `/` and the sample-data banner does not render (because `is_using_sample_data` is `false`).
- **Given** the wipe-data flow completes (`SampleDataBanner.vue` → `router.push('/setup')`), **when** the user lands on `/setup`, **then** the Start Fresh card is available and Step 1 correctly takes the `createSettings` path (no `settings_root` row after wipe).
- **Given** a System Administrator attempts to remove their own or another user's last System Administrator role via `ManageRolesDialog` or `UserFormDialog` edit mode, **when** `updateUser` runs, **then** the request is rejected with `'Cannot remove the last System Administrator'` and no data changes.
- **Given** the dashboard, households list, residents list, and finance list are empty, **when** a user views them, **then** each shows the exact empty-state wording and CTA specified in the UX spec, respecting household-before-resident ordering.

## Review Triage Log

### 2026-08-04 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 3 (medium 3)
- defer: 4 (low 4)
- reject: 21
- addressed_findings:
  - `[medium]` `[patch]` Step 3 (Village Head creation) proceeded with `role_ids: []` when the "Village Head" role could not be resolved from `usersStore.roles`, silently creating a user with zero permissions. Fixed: `onStep3Next` now blocks with `notifyError` and returns before calling `createUser` when `villageHeadRoleId.value` is falsy.
  - `[medium]` `[patch]` The dashboard empty-state CTA buttons ("Add Household"/"Add Resident") were not gated by `hasPermission`, unlike the equivalent CTAs added to the Households/Residents/Finance list pages in this same story. Fixed: both buttons now require `isClient && hasPermission('households:write')` / `hasPermission('residents:write')` respectively, matching the sibling pages.
  - `[medium]` `[patch]` `StartFreshWizard.vue` had no way to exit back to the SetupWizard card chooser once opened (browser Back would leave `/setup` entirely rather than returning to the card view). Fixed: added a "Cancel" button that emits `cancel`; `SetupWizard.vue` now listens via `@cancel="showStartFresh = false"`.
  - Deferred (low, pre-existing or out-of-scope; logged as 4 entries to `deferred-work.md` under "Deferred from: code review of story-5.11"): `country_phone_code` `maxLength: 4` in `settings-store.js`/`setup-appwrite.js` is too restrictive for some international codes (pre-existing); currency/phone code fields only check presence, not ISO/dialing-code format (matches equally lenient pre-existing `VillageSettingsPage.vue` validation); the last-System-Administrator guard (both the new one and the pre-existing `deactivateUser` one it mirrors) has an inherent TOCTOU race with no row-locking available; `/setup` has no `requiresPermission` check restricting it to System Administrators (pre-existing `SetupWizard.vue` behavior, not introduced by 5.11).
  - Rejected (not real defects — false positives from reviewer misreading, intentional/consistent with existing patterns and spec-mandated mirroring, or cosmetic/no-consequence enhancements with no AC basis): `createSettings` "crash" on `council_members: []` (`.map()` on an empty array is safe, no crash); residents empty-state banner "race condition" (households are fetched and awaited before residents in `onMounted`, not after — no race exists); password field `maxlength="265"` (intentionally mirrors the exact value already used in `UserFormDialog.vue`); Finance banner offering only "Record Income" (matches the spec's explicit task); `StartFreshWizard.vue` missing an `isClient` SSR guard (the component only ever mounts client-side, behind a user click — never SSR-rendered); timezone "not IANA-validated" (it's a closed `q-select` dropdown, not freeform text, and reuses `VillageSettingsPage.vue`'s exact list per the spec); no duplicate-email pre-check (relies on the server function's existing validation, matching `UserFormDialog.vue`'s convention); "wizard state corruption on failure" (each step already `return`s early on `!result.success`, before advancing `currentStep`); dashboard guidance banner "information leak" (matches the pre-existing `HouseholdsWidget.vue` pattern, which also fetches counts with no permission check); SSR hydration mismatch for the guidance banner (the `isClient` guard is precisely what prevents this); password complexity not enforced (spec-mandated mirroring of `UserFormDialog.vue`'s exact rule); no error-recovery-path indication (matches the app-wide `notifyError`-and-stay-on-step convention); village name "XSS vulnerability" (Vue template interpolation auto-escapes; no `v-html` is used); no "undo" after wizard completion (not meaningful for a one-time setup wizard by design); `ModuleSelectionGrid` dependency warnings suppressed during the wizard (deliberate first-run UX choice, no pre-existing dependent data to warn about); no date-range validation on `established_date`/`construction_date` (cosmetic, no AC basis); household name has no `maxlength` (cosmetic, no AC basis); no loading indicator while `fetchRoles()` resolves on Step 3 mount (sub-second fetch, imperceptible); wizard step progress not persisted across a page refresh (out of scope, no AC basis); no confirmation dialog before the final "Finish" action (out of scope, no AC basis); partial module-update failure handling (already returns early on failure, matching every other step).

## Design Notes

`StartFreshWizard.vue` is rendered inline inside `SetupWizard.vue` (no new route) to avoid interacting with the `/setup` router guard's first-run logic (`router-guards.js:51`), which would otherwise redirect away from `/setup` mid-wizard once Step 1 creates the settings row and flips `isFirstRun` to `false`. Because step navigation within the wizard is a local `q-stepper` state change (not a Vue Router navigation), the guard never re-evaluates until the final `router.push('/')`.

`countOtherActiveSystemAdmins` and `roleIdsIncludeSystemAdmin` (both already defined at the bottom of `server/functions/User Management/src/main.js`) are async and take `tablesDB` as their first argument — call them with `await` inside `updateUser`, matching the pattern already used for `deactivateUser`.

## Verification

**Commands:**

- `npm run lint` -- expected: no new lint errors in modified/added files.
- `npm run build` -- expected: production build succeeds (catches SSR/import errors in the new wizard component).

**Manual checks (if no CLI):**

- Deploy the updated `server/functions/User Management/src/main.js` (the function must be redeployed for the guard to take effect — no code-only fix is live until redeployed).
- On a fresh/wiped database, walk through: `/setup` → Start Fresh → all 5 steps → confirm `village_settings.is_using_sample_data === false` in Appwrite console and dashboard shows no sample-data banner.
- Confirm empty-state banners appear/disappear correctly by creating a household then a resident and observing the dashboard/lists update.
- Attempt to remove the last System Administrator's role via `ManageRolesDialog` and confirm the blocked error message.
