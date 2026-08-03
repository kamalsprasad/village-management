---
title: 'Story 5.9: Module Management and Configuration'
type: feature
created: '2026-08-03'
status: done
baseline_revision: '0c7d60cdfcd547c78238a45b7c0d7b23774c0635'
final_revision: 'be491b7edc8811c86e70b47e148585e1829c2f74'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/implementation-artifacts/dashboard-widget-pattern.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-7-vendors-suppliers-management-module.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-4-cloud-storage-shared-folders-and-module-based-access.md'
warnings:
  - oversized
---

<intent-contract>

## Intent

**Problem:** Optional MVP modules (Farm, School, Vendors) need a single, admin-controlled enable/disable mechanism. The current system has both a `vendors_enabled` boolean and a `modules_enabled` string array, leading to fragmented gating. Farm and School routes/sections are not yet gated by a module toggle, and there is no central UI for administrators to manage optional modules.

**Approach:** Generalize module toggling around `village_settings.modules_enabled` as the canonical source of truth. Add per-module boolean getters, route guards, main navigation gates, a dedicated `/admin/modules` management page, a reusable module-selection component, and adjust seed/defaults. Keep `vendors_enabled` as a legacy fallback only.

## Boundaries & Constraints

**Always:**

- `modules_enabled` is the canonical source of truth for which modules are active.
- Core modules (residents, households, dashboard, finance, inventory, calendar, storage) are always enabled and read-only on the management page.
- Optional MVP modules are exactly `farm`, `school`, and `vendors` (Guests, Equipment, Energy are deferred and must not appear).
- Disabling a module only hides UI (navigation, routes, dashboard widgets); no data is deleted and all foreign-key relationships remain valid.
- All UI strings are hardcoded English; no i18n.
- All new/modified pages use Vue 3 `<script setup>` syntax and Quasar components.
- All pages are SSR-safe (`isClient` guard before client-only store/composable calls).

**Block If:**

- A requirement appears to add Guests, Equipment, or Energy to the optional module list.
- A new third-party dependency is required.
- Existing module data needs migration or deletion (it does not; this is greenfield).

**Never:**

- Implement the full Start Fresh wizard (Story 5.11). 5.9 only produces a reusable module-selection UI piece.
- Add new permissions or Appwrite tables.
- Remove the `vendors_enabled` column from `setup-appwrite.js` (keep as read-only fallback).
- Add any i18n or emojis.

## I/O & Edge-Case Matrix

| Scenario                        | Input / State                                                                       | Expected Output / Behavior                                                                                                  | Error Handling                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Load admin page                 | User is System Admin, settings loaded                                               | Core modules shown read-only; Optional modules shown toggleable with current state                                          | Redirect to `/` if not admin                                       |
| Enable a module                 | Toggle switched on, Save clicked                                                    | `modules_enabled` updated via `settingsStore.updateSettings`; UI reflects immediately; routes/navigation/widgets appear     | Notify error if update fails                                       |
| Disable a module                | Toggle switched off, Save clicked                                                   | Confirmation dialog with data-preservation message; on confirm, `modules_enabled` updated; navigation/widgets/routes hidden | Dependency warning shown (non-blocking); on cancel, toggle reverts |
| Direct route to disabled module | `to.meta.requiresSetting = 'farmEnabled'` and `settingsStore.farmEnabled === false` | Router guard redirects to `/`                                                                                               | None                                                               |
| Non-admin access                | User without `*` permission navigates to `/admin/modules`                           | `requiresPermission: '*'` blocks access; router guard redirects to `/unauthorized`                                          | None                                                               |
| SSR render                      | Server renders with settings not loaded                                             | `isClient` guards suppress navigation/widget rendering; no hydration error                                                  | None                                                               |
| Legacy fallback                 | `modules_enabled` is missing and `vendors_enabled` is true                          | `settingsStore.vendorsEnabled` returns true                                                                                 | None                                                               |

</intent-contract>

## Code Map

| Layer                         | New / Modified Files                           | Purpose                                                                                                                                                                                                                                       |
| ----------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data model / defaults**     | `server/scripts/setup-appwrite.js`             | Keep `modules_enabled` string array and `vendors_enabled` boolean.                                                                                                                                                                            |
|                               | `server/scripts/seed-village-settings.js`      | Default `modules_enabled` includes all core + farm, school, vendors.                                                                                                                                                                          |
| **State**                     | `src/stores/settings-store.js`                 | Add `farmEnabled`, `schoolEnabled` getters; update `vendorsEnabled` to check `modules_enabled` first, falling back to legacy `vendors_enabled`. Add `toggleModule` helper to add/remove a key from `modules_enabled` before `updateSettings`. |
| **Reusable module selection** | `src/components/admin/ModuleSelectionGrid.vue` | `v-model` array of enabled keys; accepts `readOnly` and `warnDependencies` props; reusable in `/admin/modules` and Story 5.11's Start Fresh wizard.                                                                                           |
|                               | `src/utils/module-registry.js`                 | Static registry of all modules (key, label, description, icon, isCore, isOptional, configureRoute, dependencies, requiredBy).                                                                                                                 |
| **Module management page**    | `src/pages/admin/ModulesPage.vue`              | Lists Core and Optional modules; batch toggles with Save Changes; dependency warnings; Configure buttons link to module settings pages.                                                                                                       |
| **Routing**                   | `src/router/routes.js`                         | Add `/admin/modules` route (requiresAuth, requiresPermission: '\*').                                                                                                                                                                          |
|                               | `src/modules/farm/router.js`                   | Add `requiresSetting: 'farmEnabled'` to all farm routes.                                                                                                                                                                                      |
|                               | `src/modules/school/router.js`                 | Add `requiresSetting: 'schoolEnabled'` to all school routes.                                                                                                                                                                                  |
|                               | `src/modules/vendors/router.js`                | Already has `requiresSetting: 'vendorsEnabled'` (no change, or verify after store getter update).                                                                                                                                             |
| **Navigation**                | `src/layouts/MainLayout.vue`                   | Gate Agriculture section on `settingsStore.farmEnabled`; School on `settingsStore.schoolEnabled`; Vendors on `settingsStore.vendorsEnabled` (in addition to permissions). Add `Module Management` link under Administration.                  |
| **Dashboard**                 | `src/pages/dashboard/DashboardPage.vue`        | Keep Vendors widget gate on `vendorsEnabled`; ensure any Farm/School dashboard widgets are gated on `farmEnabled`/`schoolEnabled` (no new widgets needed unless existing ones are present).                                                   |
| **Settings page**             | `src/pages/settings/VillageSettingsPage.vue`   | Remove the editable `modules_enabled` q-select (or make it read-only with a link to `/admin/modules`) so it does not conflict with the new admin page. Update `moduleOptions` to include `vendors` only for display if kept.                  |
| **Documentation**             | `DATABASE_SCHEMA.md`                           | Confirm `modules_enabled` string array and `vendors_enabled` boolean are current.                                                                                                                                                             |

## Tasks & Acceptance

**Execution:**

- [x] `server/scripts/seed-village-settings.js` -- Update default `modules_enabled` to `['residents','households','dashboard','finance','inventory','calendar','storage','farm','school','vendors']` so new deployments have all MVP modules enabled. -- Establishes canonical default.
- [x] `src/stores/settings-store.js` -- Add `farmEnabled` and `schoolEnabled` getters returning `state.settings?.modules_enabled?.includes('farm'/'school') ?? true`. Update `vendorsEnabled` getter to first check `modules_enabled` for `'vendors'`, falling back to `state.settings?.vendors_enabled ?? true`. -- Provides per-module reactive state used by guards, layout, and dashboard.
- [x] `src/stores/settings-store.js` -- Add `toggleModule(moduleKey)` helper that adds or removes the key from a cloned `modules_enabled` array and returns the modified array, or add `updateModulesEnabled(enabledKeys)` action to call `updateSettings({ modules_enabled: enabledKeys })`. -- Encapsulates batch toggle logic.
- [x] `src/utils/module-registry.js` -- Create registry with core modules (`residents`, `households`, `dashboard`, `finance`, `inventory`, `calendar`, `storage`) and optional modules (`farm`, `school`, `vendors`), each with `key`, `label`, `description`, `icon`, `isCore`, `isOptional`, `configureRoute`, `dependencies`, and `requiredBy`. -- Single source for labels and dependency graph.
- [x] `src/components/admin/ModuleSelectionGrid.vue` -- Build reusable component: props `modelValue` (array of enabled keys), `readOnly` (default false), and optional `showWarnings` (default true); emits `update:modelValue`; displays cards with module icon, name, description, status toggle (only for optional modules), and Configure button (when `configureRoute` is set). Compute dependency warnings using `requiredBy` list. -- Reusable in `/admin/modules` and Story 5.11 wizard.
- [x] `src/pages/admin/ModulesPage.vue` -- Create page with header, loading state, Core Modules section (read-only cards), Optional Modules section (toggleable cards), dependency warning banner per toggle, batch `Save Changes` button calling `settingsStore.updateSettings({ modules_enabled: selected })`, and Cancel/Reset button. Wrap with SSR `isClient` guard. -- Satisfies AC 2 and 7.
- [x] `src/layouts/MainLayout.vue` -- Add `Module Management` navigation item under Administration section linking to `/admin/modules`. Gate Agriculture section on `settingsStore.farmEnabled`, School on `settingsStore.schoolEnabled`, Vendors on `settingsStore.vendorsEnabled` in addition to existing `isClient` and permission checks. -- Satisfies AC 1, 3, and 4.
- [x] `src/router/routes.js` -- Add `/admin/modules` route under MainLayout with `meta: { requiresAuth: true, requiresPermission: '*' }`. -- Admin-only route.
- [x] `src/modules/farm/router.js` -- Add `meta.requiresSetting: 'farmEnabled'` to every route object. -- Blocks direct navigation when disabled.
- [x] `src/modules/school/router.js` -- Add `meta.requiresSetting: 'schoolEnabled'` to every route object. -- Blocks direct navigation when disabled.
- [x] `src/modules/vendors/router.js` -- Verify `meta.requiresSetting: 'vendorsEnabled'` is still present on all routes (no functional change expected). -- Continuity from Story 5.7.
- [x] `src/pages/settings/VillageSettingsPage.vue` -- Remove the editable `modules_enabled` q-select from the form (or replace with a read-only chip list and a "Manage Modules" link to `/admin/modules`). Ensure `formData.modules_enabled` is no longer sent to `updateSettings` when saving other settings. -- Prevents conflicting module toggle UIs.
- [x] `src/pages/dashboard/DashboardPage.vue` -- Ensure existing Vendors widget gate uses `settingsStore.vendorsEnabled` (already does). If Farm/School widgets are added later, they must use `settingsStore.farmEnabled`/`schoolEnabled`. -- Satisfies AC 3/4 for widgets.
- [x] `DATABASE_SCHEMA.md` -- Confirm `modules_enabled` and `vendors_enabled` columns are documented; no new tables. -- Keeps schema doc in sync.
- [x] `docs/sprint-status.yaml` -- Update `5-9-module-management-and-configuration` from `in_progress` to `done` after verification. -- Final status tracking.

**Acceptance Criteria:**

- **Given** a System Administrator is logged in, **when** they open the main navigation, **then** the Administration section contains a "Module Management" item linking to `/admin/modules`.
- **Given** the user navigates to `/admin/modules`, **when** the page loads, **then** Core Modules are shown as read-only and always enabled, and Optional Modules are shown as toggleable cards with name, description, current status, a toggle switch, and a "Configure" button where a settings page exists.
- **Given** an optional module is enabled, **when** a user with the relevant permission views the app, **then** the module's main navigation section appears, its routes are accessible, and any dashboard widgets become visible.
- **Given** an optional module is disabled, **when** an admin toggles it off and saves, **then** a confirmation dialog explaining that data is preserved is shown; after confirmation the navigation section and routes are hidden/inaccessible and dashboard widgets are hidden.
- **Given** an admin disables a module that other enabled modules depend on, **when** the toggle is switched, **then** an informational warning is shown (e.g., Farm auto-events for Calendar; Vendors used by Farm sales and Finance expenses), but the disabling action is not blocked.
- **Given** the Start Fresh wizard will be built in Story 5.11, **when** 5.9 is complete, **then** a reusable module-selection component (`ModuleSelectionGrid` or composable) exists that accepts a `v-model` array and can be dropped into the wizard without rework.
- **Given** an admin changes module toggles, **when** they click Save Changes, **then** `village_settings.modules_enabled` is updated via `settingsStore.updateSettings`; the settings store reloads; and the UI immediately reflects the new enabled state.

## Spec Change Log

- Added `modules` prop to `ModuleSelectionGrid` so callers can render a filtered list (e.g., core only / optional only). Default is the full registry, preserving drop-in reuse for Story 5.11.
- Implemented `updateModulesEnabled(enabledKeys)` in `settings-store.js` instead of calling `updateSettings({ modules_enabled: enabledKeys })` directly. This helper sends only the required scalar validation fields plus `modules_enabled` and then calls `updateSettings`. Required because `updateSettings` validates required village fields and would otherwise fail on a partial payload, and because it prevents unrelated relationship/datetime fields from being reprocessed.
- Updated `settings-store.js` `updateSettings` to conditionally normalize `established_date` and `council_member_ids` only when those keys are present in the payload, preventing module-only updates from accidentally reprocessing unrelated relationship/datetime fields.
- Review (2026-08-03): `src/boot/router-guards.js` now ensures settings are loaded and adds an SSR guard before evaluating `requiresSetting`.
- Review (2026-08-03): `farmEnabled`/`schoolEnabled` getters now default to `false` when `modules_enabled` is missing, making optional modules fail-closed.
- Review (2026-08-03): `module-registry.js` dependency graph corrected: `farm.requiredBy=['calendar']`, `vendors.requiredBy=['farm','finance']`, `farm.dependencies=['vendors']`; Finance/Calendar/School `requiredBy` cleared to avoid circular/misleading warnings.

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 5 (2 high, 2 medium, 1 low)
- defer: 3 (all low)
- reject: 2 (all low)
- addressed_findings:
  - `[high] [patch] Router guard did not load settings or guard SSR before evaluating requiresSetting; added SSR guard and on-demand loadSettings in src/boot/router-guards.js.`
  - `[high] [patch] farmEnabled/schoolEnabled defaulted to true when modules_enabled was missing; changed to false for fail-closed behavior.`
  - `[medium] [patch] updateModulesEnabled accepted arbitrary arrays and merged the full settings row; rewrote it to validate keys, preserve unknown/deferred keys, enforce core modules, and only send required scalar fields plus modules_enabled.`
  - `[medium] [patch] module-registry.js dependency graph had a circular requiredBy (Farm <-> Vendors) and incorrect Finance requiredBy; corrected to farm.requiredBy=['calendar'], vendors.requiredBy=['farm','finance'], and documented farm.dependencies=['vendors'].`
  - `[medium] [patch] ModulesPage filtered modules_enabled on load, dropping unknown/deferred keys and distorting hasChanges; now clones the full array so unknown keys are preserved through the v-model.`
  - `[low] [defer] Configure buttons for disabled optional modules are still clickable; acceptable because the router guard redirects away from the disabled settings page.`
  - `[low] [defer] No Farm/School dashboard widgets currently exist to gate; this is not a 5.9 deliverable and the gating pattern is established.`
  - `[low] [defer] Legacy vendors_enabled flag may drift from modules_enabled for pre-existing deployments; spec explicitly keeps vendors_enabled as a read-only fallback and modules_enabled as canonical.`
  - `[low] [reject] Dependency warning persists for any disabled module (not only the one just toggled); this matches the informational "currently disabled" warning and is acceptable.`
  - `[low] [reject] ModulesPage currentModules computed was flagged as missing isClient guard; the template only evaluates it inside the client-only v-else branch, so no SSR issue exists.`

## Design Notes

**Module toggle canonical model**
`modules_enabled` is a string array in `village_settings`. For each optional module, a derived getter in `settings-store.js` returns `true` when the key is present. `vendorsEnabled` additionally falls back to the legacy `vendors_enabled` boolean for deployments created before 5.9.

**Batch vs. immediate saves**
The `/admin/modules` page keeps a local `selectedModules` array and applies all changes with a single "Save Changes" button. This avoids multiple Appwrite writes and lets the user preview dependency warnings before committing.

**Dependency warnings**
`module-registry.js` defines `dependencies` (what this module needs) and `requiredBy` (which modules rely on this one). For MVP: Farm auto-events feed Calendar (`farm.requiredBy=['calendar']`); Vendors are selectable in Farm sales and Finance expenses (`vendors.requiredBy=['farm','finance']`); Farm needs Vendors for buyer selection (`farm.dependencies=['vendors']`). Warnings are computed at toggle time in `ModuleSelectionGrid` by intersecting `requiredBy` with currently enabled keys. Warnings are informational; the save action is not blocked.

**SSR safety**
All layout gating and dashboard widget rendering continue to use `isClient` guards. The new `ModulesPage` uses `isClient` for any client-only store operations, matching existing patterns. The `router-guards.js` `requiresSetting` check also guards SSR by allowing navigation on the server and loading settings on the client before evaluating the toggle.

**Reusable selection component**
`ModuleSelectionGrid.vue` is intentionally decoupled from route state: it only requires a `v-model:modules` (or `v-model`) array. Story 5.11 can import it and bind a local array, then persist the result when the wizard finishes.

**VillageSettingsPage conflict resolution**
The existing editable `modules_enabled` q-select is removed so there is exactly one place to toggle modules. To avoid breaking unrelated settings edits, `formData` no longer sends `modules_enabled` to `updateSettings`; only the new `/admin/modules` page writes this field.

## Verification

**Commands:**

- `npx quasar build` -- expected: production build succeeds with no new lint/type errors.
- `npx quasar dev` -- expected: app starts; navigate to `/admin/modules` and verify Core/Optional module lists.

**Manual checks:**

- Log in as System Admin; confirm "Module Management" appears in Administration drawer.
- On `/admin/modules`, confirm Core modules cannot be toggled; Optional modules can.
- Disable Farm; confirm Agriculture drawer section disappears and direct `/farm/dashboard` redirects to `/`.
- Re-enable Farm; confirm section returns.
- Disable Vendors with Farm and Finance still enabled; confirm a warning about Farm sales / Finance expenses appears and the action completes.
- Confirm Village Settings page no longer has an editable module selector.
- Confirm `server/scripts/seed-village-settings.js` default `modules_enabled` includes `farm`, `school`, and `vendors`.

## Auto Run Result

**Summary:** Implemented Story 5.9 — a central `/admin/modules` management page, reusable `ModuleSelectionGrid` component, `module-registry.js` dependency graph, updated `settings-store` with `farmEnabled`/`schoolEnabled`/`vendorsEnabled` getters and `updateModulesEnabled`, gated optional module routes and navigation, and removed the conflicting editable `modules_enabled` control from `VillageSettingsPage`.

**Files changed:**

- `server/scripts/seed-village-settings.js` — default `modules_enabled` now includes all core + optional MVP modules.
- `src/stores/settings-store.js` — added `farmEnabled`/`schoolEnabled` getters, updated `vendorsEnabled` fallback, added `updateModulesEnabled` with validation.
- `src/utils/module-registry.js` — new static module registry and dependency graph.
- `src/components/admin/ModuleSelectionGrid.vue` — new reusable v-model module selection grid.
- `src/pages/admin/ModulesPage.vue` — new `/admin/modules` page.
- `src/layouts/MainLayout.vue` — added Module Management nav link, gated Agriculture/School/Vendors sections.
- `src/router/routes.js` — added `/admin/modules` route.
- `src/modules/farm/router.js` — added `requiresSetting: 'farmEnabled'` to all routes.
- `src/modules/school/router.js` — added `requiresSetting: 'schoolEnabled'` to all routes.
- `src/modules/vendors/router.js` — no change (already gated by `vendorsEnabled`).
- `src/pages/settings/VillageSettingsPage.vue` — replaced editable modules q-select with read-only chips + link to `/admin/modules`.
- `src/boot/router-guards.js` — added SSR guard and on-demand settings load for `requiresSetting`.
- `docs/implementation-artifacts/spec-5-9-module-management-and-configuration.md` — produced and verified.
- `docs/sprint-status.yaml` — marked `5-9-module-management-and-configuration: done`.

**Review findings breakdown:** 2 high patches (router guard SSR/load, fail-closed defaults), 3 medium patches (dependency graph, `updateModulesEnabled` validation, ModulesPage key preservation), 3 low deferrals, 2 low rejects.

**Follow-up review recommended:** false. The implementation was repaired to address the critical SSR and validation findings identified in the adversarial/edge-case review; remaining items are low-severity UX or future-story concerns.

**Verification performed:**

- `npm run lint` — passed (exit code 0).
- `npx quasar build` — passed (exit code 0, SPA compiled successfully).
- `npx quasar dev` — started successfully on http://localhost:9001.

**Residual risks:**

- No runtime Farm/School dashboard widgets currently exist, so widget gating for those modules is only proven by pattern (VendorsSummaryWidget) and will be exercised when future stories add widgets.
- Direct `requiresSetting` route guards on the server skip the check; client-side redirect after hydration handles disabled modules, which may cause a brief flash if a user deep-links to a disabled module URL.
