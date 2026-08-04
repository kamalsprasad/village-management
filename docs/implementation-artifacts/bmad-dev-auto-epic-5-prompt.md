# /bmad-dev-auto Prompt — Epic 5 Remaining Stories (5.11 → 5.10)

> **Usage:** Copy everything below the `---` line into a fresh `/bmad-dev-auto` invocation.
> **Adapting for subsequent iterations:** Change ONLY the three sections marked
> `<<< CHANGE PER ITERATION >>>` — (1) Current Iteration Target, (2) Story X.Y Specifics,
> (3) Review invariants. Everything else is campaign-level context that stays constant.
> The MVP dependency order in "Epic 5 MVP Scope" tells you which story is next after each
> completion; the previous story's spec `## Auto Run Result → Next Iteration` section
> also points to the next target with its slug.

---

You are running bmad-dev-auto for the Sustainable Model Village Management System (village-app). This invocation processes EXACTLY ONE story this iteration and HALT cleanly so the next iteration can pick up the next story.

## Current Iteration Target <<< CHANGE PER ITERATION >>>

Epic: 5 — "Village Calendar, Storage, Optional Modules, and User Management"
Story to implement THIS iteration: 5.11 — Start Fresh Production Setup Wizard
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-11-start-fresh-production-setup-wizard.md

If the spec file already exists with status `draft`, resume it. If it exists with any other status, do NOT overwrite — HALT with blocking condition `spec already in progress/done; user decision required`.

## Epic 5 MVP Scope (do NOT implement deferred stories)

MVP stories, in dependency order (stories marked ✅ are done; ← THIS ITERATION marks the current target):

1. ✅ 5.1 Village Calendar - Global Calendar with Category Filtering (deps: Epic 1) — DONE 2026-07-28
2. ✅ 5.2 Village Calendar - Role-Based Event Creation and Editing (deps: 5.1) — DONE 2026-07-29
3. ✅ 5.3 Cloud Storage - Role-Based Storage Quotas and Personal Folders (deps: 1.10) — DONE 2026-07-30
4. ✅ 5.4 Cloud Storage - Shared Folders and Module-Based Access (deps: 5.3) — DONE 2026-07-31
5. ✅ 5.7 Vendors/Suppliers Management Module (deps: 2.2, 2.3, 3.8 — all done) — DONE 2026-08-01
6. ✅ 5.9 Module Management and Configuration (deps: all MVP previous) — DONE 2026-08-03
7. ✅ 5.14 Authentication Completeness - Password Change and Reset (deps: 1.3, 1.11) — DONE 2026-08-03
8. ✅ 5.12 User Management - CRUD Operations (deps: 1.4, 1.11) — DONE 2026-08-03
9. ✅ 5.13 Role Assignment and Permissions Management UI (deps: 5.12) — DONE 2026-08-04
10. 5.11 Start Fresh Production Setup Wizard (deps: 5.9, 5.12) ← THIS ITERATION
11. 5.10 System Completion - Final Dashboard Integration and Production Setup (deps: all MVP previous)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11.

## Story 5.11 Specifics <<< CHANGE PER ITERATION >>>

Intent: Deliver the Start Fresh Production Setup Wizard for MVP. Enable the SetupWizard "Start Fresh with Real Data" card (currently a disabled "Coming in future update" placeholder) and launch a 5-step wizard: (1) Village Profile (name, location, established date, currency, timezone, country — Zambia defaults: ZMW, Africa/Lusaka, Zambia), (2) Admin User (confirm the already-logged-in first admin read-only — no second admin creation), (3) Village Head (create a second user with the Village Head role, or skip if same as admin), (4) Module Selection (core modules always enabled; optional MVP modules Farm/School/Vendors toggleable — matches Story 5.9 AC7), (5) First Household. Step 1 saves to `village_settings` with `is_using_sample_data = false`. On completion, redirect to the dashboard with empty-state guidance. The sample-mode "Start Fresh - Wipe All Data" path (Story 1.9 AC8) already redirects to `/setup` (`SampleDataBanner.vue` → `router.push('/setup')`); 5.11 ensures that route now offers this wizard. The wizard is skippable per step with Back/Next and a "Step X of 5" progress indicator.

This story is primarily a **UI + routing + reuse** story. It adds NO new Appwrite tables, NO new columns, NO new audit enum values, NO new permissions, and NO new server function. It REUSES: `settingsStore.createSettings`/`updateSettings`/`updateModulesEnabled` (Step 1 + Step 4), `usersStore.createUser`/`fetchRoles` (Step 3 Village Head — reuses the 5.12 User Management server function), `householdsStore.createHousehold` (Step 5), and `authStore` (Step 2 confirm admin). It also adds empty-state CTAs to the dashboard and the Residents/Households/Finance list pages (AC9/AC10).

**ONE server-function hardening task is INCLUDED (user decision 2026-08-04):** Add a last-System-Administrator guard to the 5.12 `updateUser` action in `server/functions/User Management/src/main.js`. When `role_ids` changes would REMOVE a role containing the `*` (System Administrator) permission from the target user, count other active users who still hold a `*` role; if zero, return `{ success: false, error: 'Cannot remove the last System Administrator' }`. Mirror the existing `deactivateUser` guard (lines ~379-390). This closes the HIGH-severity deferred item from the 5.13 review (see `deferred-work.md` "Deferred from: code review of story-5.13"). This is a code change to an EXISTING function action — it creates NO new table/column/enum/function and NO new `.env` variable. The User Management function must be redeployed after the change (note this in the spec's verification section; do NOT edit `FUNCTION_DEPLOYMENT.md` unless a deployment step is genuinely missing).

ACs (from docs/epics.md Story 5.11 — treat as authoritative):

1. SetupWizard "Start Fresh with Real Data" card is enabled (no longer disabled/"coming soon").
2. Selecting "Start Fresh" launches a multi-step wizard: (1) Village Profile, (2) Admin User, (3) Village Head (or "same as admin" skip), (4) Module Selection, (5) First Household.
3. Step 1 Village Profile: name, location, established date, currency, timezone — saved to village_settings with `is_using_sample_data = false`. Defaults pre-filled for Zambia (currency: ZMW — Zambian Kwacha, timezone: Africa/Lusaka, country: Zambia); user can override.
4. Step 2 Admin User: the already-logged-in first admin is confirmed/used; no second admin creation required (first admin created via CreateAdminForm at /auth).
5. Step 3 Village Head: create a second user with Village Head role, or skip if same as admin.
6. Step 4 Module Selection: core modules always enabled; optional MVP modules (Farm, School, Vendors) toggleable — matches Story 5.9 AC7.
7. Step 5 First Household: create first household record so residents can be added next.
8. Wizard is skippable per step with "Back"/"Next"; progress indicator shows "Step X of 5".
9. On completion: redirect to dashboard with empty-state guidance ("Add your first household", "Record your first transaction").
10. Empty-state guidance: list pages show contextual CTAs when no records exist, respecting the household-before-resident ordering (Story 1.7 AC4) — dashboard prompts household creation first; once a household exists, prompts shift to adding residents.
11. "Start Fresh - Wipe All Data" path (from sample mode) returns to this wizard (Cross-ref: Story 1.9 AC8 — the wipe action in sample-data mode routes here once this story is implemented).

Prerequisites confirmed done: Story 5.9 (Module Management — `done` in `docs/sprint-status.yaml`), Story 5.12 (User CRUD — `done`; `usersStore.createUser`/`fetchRoles` available). Story 5.13 (`done`) and 5.14 (`done`) are also complete. 5.11 has NO hard dependency on any unfinished Epic 5 story (per `docs/planning-artifacts/sprint-change-proposal-2026-07-28.md` recommended order: 5.14 → 5.12 → 5.13 → 5.11; 5.14, 5.12, and 5.13 are all DONE). No spec file exists yet for 5.11.

**No new Appwrite infrastructure (reuse-only, like 5.13):**

- `village_settings` table already exists. The settings row id is `settings_root` (`settingsStore.updateSettings` updates `rowId: 'settings_root'`). IMPORTANT: `wipeAllData` (`server/functions/wipeAllData/src/main.js` line 52 + `deleteTable` at ~211) DROPS the entire `village_settings` table, so after a wipe + `appwrite push` schema recreate there is NO `settings_root` row. Step 1 must therefore CREATE the settings row via `settingsStore.createSettings` (which exists for first-run) when no settings row exists, and include `is_using_sample_data: false`. If a settings row already exists (edge case: admin re-enters `/setup` manually with existing settings), use `settingsStore.updateSettings`. Detect via `settingsStore.settings` existence after `loadSettings()`. The spec MUST make this create-vs-update decision explicit.
- `users` and `roles` tables already exist. Step 3 Village Head creation REUSES `usersStore.createUser({ name, email, password, role_ids: [villageHeadRoleId] })` — the 5.12 User Management server function creates the Appwrite account with admin scope, inserts the `users` row, syncs teams, and writes an audit log. Do NOT add a new function action. Fetch the Village Head role id from `usersStore.fetchRoles()` (the `roles` state already holds seeded roles; identify Village Head by name — confirm the exact seeded name in `server/scripts/seed-roles.js`).
- `households` table already exists. Step 5 REUSES `householdsStore.createHousehold({ name, household_type, construction_date })`. Do NOT duplicate household-creation logic.
- Module toggle (Step 4) REUSES `settingsStore.updateModulesEnabled(enabledKeys)` and the `CORE_MODULE_KEYS`/`OPTIONAL_MODULE_KEYS` constants from 5.9. Optional MVP modules ONLY: Farm, School, Vendors. Do NOT include Guests/Equipment/Energy (deferred). Match `ModulesPage.vue` patterns.
- The `wipeAllData` function needs NO change for 5.11 — `SampleDataBanner.vue` already redirects to `/setup` on success. 5.11 only ensures `/setup` now offers the Start Fresh wizard. Confirm no gap; add a task only if one is found.
- The last-System-Admin guard is a code change to the EXISTING `updateUser` action in the EXISTING User Management function — NO new function, NO new enum value, NO new table/column.

**Routing — `/setup` route (AC1, AC11):**

- `src/router/routes.js` already has `/setup` (name `setup`, `requiresAuth: true`, `isSetupWizard: true`, no layout — `SetupWizard.vue` renders its own `q-layout`). 5.11 adds NO new route. The spec MUST verify the router guard admits the post-wipe "no settings row" state (the `isSetupWizard` flag is intended to allow access during first-run; confirm the guard does not bounce the user away when `settingsStore.settings` is empty/null). If the guard currently requires settings to exist, that is a gap the spec must fix — do NOT HALT, fix it as part of 5.11.

**Empty-state CTAs (AC9/AC10) — scope decision (user-approved 2026-08-04):**

All empty-state CTAs are INCLUDED in 5.11 (dashboard + Residents/Households/Finance list pages). Because this spans multiple pages alongside the wizard and the server-function guard, set `warnings: [multiple-goals]` in the spec frontmatter and proceed — they are genuinely inseparable from the wizard's "on completion" experience. The empty states must respect the household-before-resident ordering (Story 1.7 AC4):

- Dashboard (no households): "Welcome! Start by adding your first household." (CTA → Households page)
- Dashboard (household exists, no residents): "Add your first resident to your household." (CTA → Residents page)
- Residents list (empty, no households): "Please create at least one household before adding residents." (primary CTA → Households page)
- Residents list (empty, household exists): "No residents yet. Add your first resident." (primary CTA → add resident)
- Households list (empty): "No households yet. Add your first household." (primary CTA → add household)
- Finance (empty): "No transactions recorded. Record your first income or expense." (CTA → record transaction)
  Reuse each list page's existing empty-state slot/pattern (check `HouseholdsListPage.vue`, `ResidentsListPage.vue`, finance list pages for existing `q-banner`/empty-state markup before adding). Do NOT reinvent layout.

Continuity context from prior work (load the 5.12 spec for the User Management function/store patterns, the 5.9 spec for the module-toggle/settings-store patterns, and the 5.13 spec for the roles-store reuse + the last-admin deferred item, plus the files below):

- `src/pages/setup/SetupWizard.vue` — the current first-run page. Renders two cards: "Explore with Sample Data" (enabled, calls the seedAllData function) and "Start Fresh with Real Data" (DISABLED — `<q-card class="... disabled-card">` with a "Coming in future update" `q-chip` and a `disable`d "Start Fresh" `q-btn`; `selectOption('fresh')` is a no-op `return`). 5.11 must ENABLE the Start Fresh card and wire its button to launch the new multi-step wizard. RECOMMEND a NEW `src/components/setup/StartFreshWizard.vue` (or `src/pages/setup/StartFreshWizardPage.vue`) that the card routes into, keeping `SetupWizard.vue` as the card-chooser — match the existing Quasar styling (`setup-card`, gradient background). Do NOT remove or break the "Load Sample Data" flow.
- `src/stores/settings-store.js` — has `settings` state, `loadSettings()`, `createSettings(initialSettings)` (for first-run — use after wipe), `updateSettings(updates)` (updates `rowId: 'settings_root'`, validates `village_name`/`default_currency`/`currency_symbol`/`timezone`/`country_code`/`country_phone_code` required), `updateModulesEnabled(enabledKeys)` (5.9 — sends `modules_enabled` plus required scalars, core always on), `wipeAllData(onPhaseChange)`, `isUsingSampleData` getter, `modulesEnabled` getter, `countryCode` getter (default 'ZM'). Step 1 reuses `createSettings`/`updateSettings`; Step 4 reuses `updateModulesEnabled`. Note `updateSettings` requires `currency_symbol` and `country_phone_code` — the wizard must supply these (derive symbol from currency, default phone code from country — check existing VillageConfigurationPage patterns for the mapping).
- `src/stores/users-store.js` — from 5.12. Has `users`/`roles` state, `fetchRoles()`, `createUser(payload)` (calls User Management function `createUser` action — admin-scope Appwrite account creation + `users` row + team sync + audit log), `systemAdminRole` getter. Step 3 reuses `createUser` with the Village Head role id. Do NOT duplicate user-creation logic.
- `src/stores/households-store.js` — `createHousehold(householdData)` creates a `households` row (`name`, `household_type`, `construction_date`, `bedrooms`, `bathrooms`, `notes`, `head_resident_id`). Step 5 reuses it. Note it calls `fetchHouseholds` + a success notify after create — acceptable for the wizard.
- `src/stores/auth-store.js` — the current logged-in user (`authStore.user`). Step 2 displays this user's name/email read-only as the confirmed admin. No write.
- `src/components/layout/SampleDataBanner.vue` — the sample-mode banner with "Start Fresh - Wipe All Data" button → `WipeDataDialog` → on success `router.push('/setup')` (line 65). AC11 is already satisfied at the redirect level; 5.11 only ensures `/setup` offers the Start Fresh wizard. No change expected here — confirm.
- `src/components/auth/CreateAdminForm.vue` — first admin creation at `/auth` (reference only; 5.11 does NOT recreate the admin — Step 2 confirms the existing one).
- `src/router/routes.js` — `/setup` route (see "Routing" above). No new route for 5.11.
- `server/functions/User Management/src/main.js` — the `updateUser` action (~lines 243-346) and `deactivateUser` action (~lines 379-390, which HAS the last-admin guard). 5.11 ADDS the last-System-Admin guard to `updateUser` when `role_ids` changes remove a `*` role — mirror `deactivateUser`'s guard shape (count other active users with a `*` role; block if zero). No new enum/table/column. Function must be redeployed.
- `server/functions/wipeAllData/src/main.js` — wipes `village_settings` via `deleteTable` (line 52, ~211). No change for 5.11; reference for the "no settings row after wipe" create-vs-update decision.
- `server/scripts/seed-roles.js` — reference for the exact seeded Village Head role name (Step 3 needs its `$id` from `usersStore.roles`). The seeder is now upsert-capable (5.13).
- `src/pages/admin/ModulesPage.vue` — from 5.9. Reference for the module-toggle UI pattern (core disabled, optional toggleable) and `CORE_MODULE_KEYS`/`OPTIONAL_MODULE_KEYS` usage. Step 4 mirrors this.
- `src/pages/dashboard/DashboardPage.vue` + `src/pages/households/HouseholdsListPage.vue` + `src/pages/residents/ResidentsListPage.vue` + finance list pages — targets for the AC9/AC10 empty-state CTAs. Read each before adding to match existing empty-state markup.
- `docs/ux-specification.md` §"Flow 3: First-Time Setup Wizard" + "Start Fresh Path Detailed Steps (Story 5.11 — added 2026-07-28)" (lines ~620-754) — the authoritative UX layout: welcome cards, 5 step screens, sample-mode banner, and the empty-state guidance wording. Follow this layout and wording exactly.

Key design decisions for the spec to resolve:

- **Wizard component structure (DECIDED — user-approved 2026-08-04):** Build a NEW `src/components/setup/StartFreshWizard.vue` (or `src/pages/setup/StartFreshWizardPage.vue`) for the 5-step flow, launched from the enabled Start Fresh card on `SetupWizard.vue`. Keep `SetupWizard.vue` as the card-chooser. Use a Quasar `q-stepper` (or equivalent) for "Step X of 5" progress + Back/Next (AC8). Each step is a focused form section.
- **Step 1 create-vs-update:** After `settingsStore.loadSettings()`, if `settingsStore.settings` is null/empty (post-wipe first-run), call `createSettings({ village_name, address, established_date, default_currency, currency_symbol, timezone, country_code, country_phone_code, is_using_sample_data: false, modules_enabled: [...CORE_MODULE_KEYS], lending_enabled: false })`. If settings already exist, call `updateSettings` with the same fields. Zambia defaults: currency `ZMW`, symbol `K`, timezone `Africa/Lusaka`, country_code `ZM`, country `Zambia`, phone code `+260` — verify exact values against existing `VillageConfigurationPage`/settings defaults. The spec MUST state which path runs when.
- **Step 2 Admin User:** Read-only display of `authStore.user.name` + `authStore.user.email` with a "Next" button. No write, no form. (AC4)
- **Step 3 Village Head:** Radio choice: "I am the Village Head" (skip — no action) OR "Create a different Village Head user" (form: name, email, initial password). On create, call `usersStore.createUser({ name, email, password, role_ids: [villageHeadRoleId] })` where `villageHeadRoleId` is resolved from `usersStore.roles` (fetch via `fetchRoles()` on wizard mount). Reuse the 5.12 server-side creation (admin scope, team sync, audit log). Do NOT duplicate. (AC5)
- **Step 4 Module Selection:** Core modules listed disabled/greyed (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules as toggleable checkboxes: Farm, School, Vendors ONLY. On wizard completion (or on Next), call `settingsStore.updateModulesEnabled([...coreKeys, ...selectedOptionalKeys])`. Match `ModulesPage.vue`. Note: "You can enable/disable modules later in Settings". (AC6)
- **Step 5 First Household:** Form: household name (required), type, construction date. On save, call `householdsStore.createHousehold({ name, household_type, construction_date })`. This is the wizard's final write. (AC7)
- **Completion (AC9):** After Step 5 succeeds, set `is_using_sample_data: false` is already persisted in Step 1; redirect to `/` (dashboard). The dashboard + list pages render the empty-state CTAs per AC10 (see above). Ensure `settingsStore.loadSettings()` is refreshed so the sample-data banner does NOT appear.
- **AC11 (wipe → wizard):** `SampleDataBanner.vue` already does `router.push('/setup')` after a successful wipe. 5.11 only needs `/setup` to present the Start Fresh wizard (which it will, once the card is enabled). Verify the post-wipe state (no `settings_root` row) is handled by the Step 1 create-path and that the `/setup` route guard admits it. No change to `SampleDataBanner.vue` or `wipeAllData` expected.
- **Last-System-Admin guard (server function):** In `updateUser`, when the incoming `role_ids` removes a role that has `permissions` including `*` (compared against the target user's current roles), query active users (excluding the target) whose `role_ids` include a `*` role; if the count is 0, return `{ success: false, error: 'Cannot remove the last System Administrator' }` (HTTP 400). Mirror `deactivateUser`'s guard (~lines 379-390). This protects both `ManageRolesDialog` (5.13) and `UserFormDialog` edit mode (5.12). No new audit enum value — the blocked attempt simply fails (no row change, no audit row). The spec MUST include a task for this + a verification note that the function is redeployed.
- **i18n / emojis:** none (hardcoded English, no emojis) — consistent with project convention. The existing `SampleDataBanner.vue` uses one emoji (🏷️) in its text — do NOT add new emojis; leave existing ones untouched.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.11 ACs and Epic 5 story list (also Story 1.9 AC8 cross-ref for the wipe→wizard routing, and Story 1.7 AC4 for household-before-resident ordering)
- docs/PRD.md — FR-19 (User Management: admin-created accounts; no self-service signup; first admin via CreateAdminForm); village settings model; module model
- docs/architecture.md — village_settings, users/roles RBAC, households, first-run/setup conventions, `audit_logs` (§11.5)
- docs/ux-specification.md — §"Flow 3: First-Time Setup Wizard" + "Start Fresh Path Detailed Steps (Story 5.11 — added 2026-07-28)" (lines ~620-754): welcome cards, 5 step screens, sample-mode banner, empty-state guidance wording. Follow this layout exactly.
- docs/implementation-artifacts/spec-5-12-user-management-crud-operations.md — 5.12 spec (PRIMARY continuity context: `usersStore.createUser`/`fetchRoles`, the User Management function `createUser`/`updateUser`/`deactivateUser` actions, the `deactivateUser` last-admin guard shape to mirror, `audit_logs`)
- docs/implementation-artifacts/spec-5-9-module-management-and-configuration.md — 5.9 spec (settings-store `updateModulesEnabled`, `CORE_MODULE_KEYS`/`OPTIONAL_MODULE_KEYS`, `ModulesPage.vue` toggle pattern — reference for Step 4)
- docs/implementation-artifacts/spec-5-13-role-assignment-and-permissions-management-ui.md — 5.13 spec (roles-store reuse via `usersStore.fetchRoles`/`roles`; the last-System-Admin deferred item in its `## Auto Run Result` / `## Review Triage Log` — 5.11 closes it)
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules)
- docs/implementation-artifacts/deferred-work.md — carry-forward items including the i18n deferral decision, the 5.12 deferred items (dir-name space, 500-user cap), and the 5.13 last-System-Admin guard item NOW OWNED BY 5.11
- docs/planning-artifacts/sprint-change-proposal-2026-07-28.md — confirms recommended implementation order (5.14 → 5.12 → 5.13 → 5.11) and 5.11's deps (5.9, 5.12)

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('<module>:read')`, `hasPermission('<module>:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.11 introduces NO new permissions; the wizard runs as the already-authenticated first admin (the `/setup` route already requires auth). Module toggles reuse the 5.9 module system.
- Dashboard widgets: follow docs/implementation-artifacts/dashboard-widget-pattern.md exactly.
- No new dependencies without verifying they're already in package.json. If a new dep is truly required, HALT with blocking condition `new dependency required: <name> — user approval needed`.
- Match existing code style in src/pages/, src/stores/, src/composables/, src/services/, src/modules/. Read neighboring modules (e.g. src/modules/school/, src/modules/farm/, src/modules/calendar/, src/modules/storage/, src/pages/setup/, src/pages/admin/) before scaffolding.
- i18n: NOT implemented in this project. vue-i18n is NOT installed. All UI strings are hardcoded English, matching existing modules (Epics 1–4 and Stories 5.1–5.14). This is a user-approved decision (2026-07-28); i18n is deferred to post-MVP — see docs/implementation-artifacts/deferred-work.md. Do NOT add vue-i18n. Do NOT use $t() or useI18n(). Write hardcoded English strings consistent with existing modules.
- No emojis in code or UI unless an existing module already uses them (do not remove existing ones).

## Strict Readiness Standard (HALT on any violation)

Before leaving step-02 (plan), the spec MUST satisfy the "Ready for Development" standard from SKILL.md:

- Actionable: every task has a file path and specific action.
- Logical: tasks ordered by dependency.
- Testable: all ACs in Given/When/Then form.
- Complete: no placeholders or TBDs.
- Sufficient: no unresolved requirement/acceptance/dependency/implementation gaps.
- Coherent: no internal contradictions.

HALT with status `blocked` and a precise blocking condition if ANY of these occur:

- A story AC cannot be translated into concrete tasks because a requirement is ambiguous or contradictory between epics.md / PRD.md / ux-specification.md / architecture.md.
- A prerequisite story is not actually `done` (verify against docs/sprint-status.yaml, not against docs/bmm-workflow-status.md which is stale).
- The working tree is dirty or the current branch is an obvious mismatch for Epic 5 work.
- A new third-party dependency is required.
- An AC requires functionality that belongs to a deferred story (5.5/5.6/5.8) or a not-yet-built story — split the work cleanly and exclude the forward-dep portion; if the AC cannot be satisfied without it, HALT.
- The intent resolves to multiple independently shippable goals that cannot be scoped into one spec — set `warnings: [multiple-goals]` in frontmatter and proceed only if they're genuinely inseparable; otherwise HALT. (5.11 sets `warnings: [multiple-goals]` per the user-approved scope: wizard + empty-state CTAs across pages + last-admin guard — these are genuinely inseparable from the wizard's completion experience.)

Do NOT invent requirements. Do NOT pull scope from other stories into this iteration. Do NOT implement features that belong to a later story in the dependency order.

## Implementation Discipline (step-03)

- Follow the spec's task list in order. Do not reorder.
- Reuse existing composables, stores, services, and RBAC utilities. Do not duplicate.
- Vue 3 `<script setup>` only. No Options API. No `this`.
- SSR-safe: any Appwrite TablesDB/Functions access must be guarded for SSR; follow the `isClient` pattern used in existing pages (e.g. FarmDashboardPage.vue, LearnersListPage.vue, SetupWizard.vue). The SetupWizard is a no-layout page rendering its own `q-layout`; client-only Appwrite calls in the wizard steps must still be `isClient`-guarded.
- Quasar components for all UI primitives (q-stepper, q-input, q-select, q-date, q-btn, q-dialog, q-chip, q-banner, q-radio, q-checkbox, etc.). No raw HTML controls.
- 5.11 creates NO new Appwrite infrastructure (no new tables, no new columns, no new server function, no new audit enum values, no new permissions, no new `.env` variables). It reuses `village_settings`, `users`, `roles`, `households`, the User Management function (`createUser` + a guard added to `updateUser`), the `wipeAllData` function (no change), and the `seedAllData` function (no change). The only new frontend artifacts are: the enabled Start Fresh card on `SetupWizard.vue`, a NEW `StartFreshWizard.vue` (or page), and the empty-state CTA additions on the dashboard + Residents/Households/Finance list pages. The only server change is the last-admin guard inside the existing `updateUser` action. The spec MUST include tasks for all of these.
- Pinia stores follow the existing options-store pattern. 5.11 REUSES `settingsStore` (`createSettings`/`updateSettings`/`updateModulesEnabled`/`loadSettings`), `usersStore` (`createUser`/`fetchRoles`), `householdsStore` (`createHousehold`), and `authStore` — do NOT create new stores. No `auth-store.js` changes are required for 5.11.
- Date handling: all dates stored as ISO 8601 in Appwrite; the wizard's `established_date` and household `construction_date` must be normalized via the existing `settingsStore`/`householdsStore` date handling (both already convert `YYYY-MM-DD` → ISO). Display via `src/utils/dateUtils.js` with `settingsStore.timezone`.
- Permission checks: 5.11 introduces NO new permissions. The wizard runs as the authenticated first admin on `/setup` (already `requiresAuth`). The module toggles reuse the 5.9 system. No new `requiresPermission` meta values.
- `wipeAllData` function (`server/functions/wipeAllData/src/main.js`) — no change needed for 5.11 (it already wipes all TablesDB tables and `SampleDataBanner.vue` already redirects to `/setup`). The spec should confirm no gap exists but does NOT need a task unless one is found.
- The last-admin guard: modify the existing `updateUser` action in `server/functions/User Management/src/main.js` — do NOT create a new function or a new audit enum value. Mirror `deactivateUser`'s guard. Note the redeployment in verification.
- No emojis in code or UI unless an existing module already uses them (do not remove existing ones).

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.11 <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.11:

- The SetupWizard "Start Fresh with Real Data" card is ENABLED (no longer the disabled "Coming in future update" placeholder) and launches the new multi-step wizard (AC1). The "Load Sample Data" flow is NOT broken.
- The wizard has exactly 5 steps in order: Village Profile → Admin User → Village Head → Module Selection → First Household (AC2). A "Step X of 5" progress indicator + Back/Next are present and Back is disabled on step 1 (AC8).
- Step 1 saves to `village_settings` with `is_using_sample_data: false` (AC3). Zambia defaults are pre-filled (currency ZMW, timezone Africa/Lusaka, country Zambia) and overridable. The create-vs-update path is correct: `createSettings` when no `settings_root` row exists (post-wipe), `updateSettings` when it does.
- Step 2 displays the already-logged-in admin (`authStore.user`) read-only with no creation form (AC4).
- Step 3 either skips ("I am the Village Head") or creates a Village Head user via `usersStore.createUser` with the Village Head role id from `usersStore.roles` (AC5). No duplicate user-creation logic.
- Step 4 lists core modules always-enabled/disabled and optional MVP modules (Farm, School, Vendors ONLY — NOT Guests/Equipment/Energy) toggleable, matching 5.9 AC7, and persists via `settingsStore.updateModulesEnabled` (AC6).
- Step 5 creates the first household via `householdsStore.createHousehold` (AC7).
- On completion the wizard redirects to the dashboard (AC9) and `settingsStore` is refreshed so the sample-data banner does NOT appear (because `is_using_sample_data` is now false).
- Empty-state CTAs are present on the dashboard and Residents/Households/Finance list pages per AC10, respecting household-before-resident ordering (1.7 AC4): dashboard prompts household first, then residents once a household exists; residents list (no households) directs to Households page; households list (empty) has add-household CTA; finance (empty) has record-transaction CTA.
- The sample-mode "Start Fresh - Wipe All Data" path returns to this wizard (AC11): `SampleDataBanner.vue` already redirects to `/setup`; verify `/setup` now presents the Start Fresh wizard and that the post-wipe "no settings row" state is handled (Step 1 create-path + route guard admits it).
- The `/setup` route guard admits the post-wipe state (no `settings_root` row) — if it currently bounces users when settings are missing, that gap is fixed as part of 5.11.
- The last-System-Admin guard is added to the `updateUser` action: when `role_ids` changes remove a `*` role and no other active user holds a `*` role, the update is blocked with a clear error. It mirrors `deactivateUser`'s guard. NO new table/column/enum/function is created. The function redeployment is noted in verification. Both `ManageRolesDialog` (5.13) and `UserFormDialog` edit mode (5.12) are covered by this guard.
- NO new Appwrite infrastructure is created: no new tables, no new columns, no new server function, no new audit enum values, no new permissions, no new `.env` variables. 5.11 is UI + routing + reuse + one guard on an existing function action.
- NO new stores are created — `settingsStore`/`usersStore`/`householdsStore`/`authStore` are reused.
- NO new permissions are introduced; the wizard runs on the existing authenticated `/setup` route.
- All new wizard components are SSR-safe (`isClient` guard before client-only `tables`/`functions` calls, matching `SetupWizard.vue`) and use Quasar components + `<script setup>`.
- The 5.12 Add/Edit/Deactivate/Reactivate flows, the 5.13 Manage Roles / View Permissions / `/admin/roles` page, the 5.14 password flows, and the 5.9 module management are NOT broken.

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Generalizes the basic `vendors_enabled` flag from 5.7 into the full module toggle system. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog (current password, new password, confirm). Calls `Account.updatePassword`. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` gains "Add User" button (System Admin only). Add User form: name, email, initial password, role multi-select, optional resident_id link. Requires server-side Appwrite Function for admin-scope user creation (client SDK cannot create users on behalf of admin — use node-appwrite with admin key). Soft-deactivate (active=false, blocks login). Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog (multi-select of seeded roles, updates `users.role_ids`). "View Permissions" shows effective permission union. New `/admin/roles` page: role list with name, category, permission count, storage quota, assigned user count. Permission matrix (expandable role × permission grid). Read-only for MVP. Role changes audit-logged. `seed-roles.js` made upsert-capable. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile (Zambia defaults: ZMW, Africa/Lusaka) → Admin User (confirm existing) → Village Head (create or skip) → Module Selection (Farm/School/Vendors toggleable) → First Household. Sets `is_using_sample_data = false` (create-settings path after wipe). Empty-state CTAs on dashboard and list pages (household-before-resident ordering). "Start Fresh - Wipe All Data" from sample mode routes here (already redirects to `/setup`). Plus: last-System-Admin guard added to the 5.12 `updateUser` server function (closes the 5.13 deferred HIGH item). Deps: 5.9, 5.12.

**5.10 (System Completion):** Final dashboard integration (role-based widgets, <2s load). Navigation polish (breadcrumbs, quick search, active highlighting). Notifications system (bell icon, count badge, panel, filter, mark as read). UX polish (loading states, error handling, success confirmations, accessibility). Performance (<3s on 3G, lazy loading, caching). Mobile responsiveness (320px+, 44px touch targets). Help/docs (help icon, tooltips, user guide, FAQ). System health monitoring (Admin: DB size, storage usage, active users, error logs). Final testing checklist. Dep: ALL MVP previous stories in all epics.
