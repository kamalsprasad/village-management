---
title: 'Story 5.10b: Navigation Polish — Breadcrumbs and Quick Search'
type: 'feature'
created: '2026-08-04'
status: 'done'
review_loop_iteration: 0
baseline_revision: '933b6e07e8ceaf94ddaab68e624732c90dc03c82'
final_revision: '3152db1c088e11a4c6a843d36751eb260dfadc50'
followup_review_recommended: true
post_finalization_patches:
  - revision: '3152db1c088e11a4c6a843d36751eb260dfadc50'
    date: '2026-08-05'
    summary: 'Post-finalization fix for the global search box. Corrected a defective learner search (the `learners` table has no `first_name`/`last_name` columns — it links to `residents` via `resident_id`), fixed the finance result secondary text field, and resolved header-search focus/UX issues. See Review Triage Log §"2026-08-05 — Post-finalization patch".'
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-10a-dashboard-completion-real-data-wiring.md'
warnings: [oversized]
---

<intent-contract>

## Intent

**Problem:** `MainLayout.vue` has no breadcrumb trail, no quick search, and its `q-expansion-item` nav sections do not auto-expand on detail-page reload (hiding the active item). It also contains one dead nav link (`/communications`, no matching route/page/permission exists). ~22 detail/form/create/edit pages use ad-hoc `router.back()`/fixed-route "Back" buttons instead of a structured trail.

**Approach:** Add a reusable `Breadcrumbs.vue` component driven by `route.meta.breadcrumb` (static Module/List ancestors) plus a page-supplied dynamic `current` leaf label; replace all ad-hoc Back buttons on detail/form/create/edit pages with it. Add a header quick-search input backed by a new `useGlobalSearch.js` composable (same `Query.startsWith` + `Promise.allSettled` + stale-token pattern as `ResidentSearchInput.vue`) that searches permitted tables and matches nav items. Add a route watcher in `MainLayout.vue` to auto-expand the nav section containing the active route, and remove the dead Communications link.

## Boundaries & Constraints

**Always:**

- Reuse existing tables/stores/RBAC only: no new Appwrite tables, columns, server functions, permissions, `.env` vars, or routes.
- All `tables.listRows` calls in `useGlobalSearch.js` run client-side only, guarded by an `isClient` check; the header search input renders during SSR but fires no queries.
- Gate every quick-search module by `hasPermission('<module>:read')` and, for optional modules, `settingsStore.farmEnabled` / `schoolEnabled` / `vendorsEnabled`.
- Use `Promise.allSettled` for quick-search fetches; a failed module query must not crash the dropdown or block other modules.
- Route `meta.breadcrumb` supplies static ancestor segments (`{ label, to }[]`); each page supplies the dynamic leaf via a `current` prop/computed, with a generic fallback (e.g. "Household") until the record loads, so SSR output is not broken.
- Quasar components only (`QBreadcrumbs`, `QBreadcrumbsEl`, `QInput`, `QMenu`, `QList`, `QItem`, `QBtn`); Vue 3 `<script setup>`; hardcoded English strings; no emojis.
- Do not force-collapse `expandedSections` entries unrelated to the current route; only expand the matching one.

**Block If:**

- A required third-party dependency would need to be added.

**Never:**

- Implement notifications, help/docs, UX/performance/mobile audit, or system health monitoring (5.10c–5.10e / post-MVP).
- Add Guests, Equipment, or Energy nav items or search results.
- Restructure the nav IA beyond removing the confirmed-dead `/communications` link.

## I/O & Edge-Case Matrix

| Scenario                                | Input / State                                    | Expected Output / Behavior                                                                                    | Error Handling              |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Detail page loaded directly (deep link) | User navigates to `/farm/plots/abc123`           | `Agriculture` section auto-expands, `Plots` item highlighted, breadcrumb shows Farm → Plots → `<plot name>`   | No error expected           |
| Record still loading                    | Detail page mounted, record fetch pending        | Breadcrumb leaf shows generic fallback (e.g. "Plot") until data arrives, then updates                         | No error expected           |
| Quick search, permitted module          | User with `farm:read` types "maize" (≥2 chars)   | Dropdown shows a "Farm" group with matching plots                                                             | No error expected           |
| Quick search, unpermitted module        | User without `finance:read` types a finance term | No "Finance" group is rendered (header hidden, zero results)                                                  | No error expected           |
| Quick search, one module query fails    | Network/permission error on one table            | Other groups still render; failed module contributes nothing                                                  | Logged to console, no crash |
| Quick search, nav item match            | User types "vendor"                              | A "Pages" group shows the "Vendors" nav item, navigating to `/vendors` on click                               | No error expected           |
| Quick search, below min length          | User types 1 character                           | No queries fire; dropdown shows a "type at least 2 characters" hint                                           | No error expected           |
| SSR render                              | Server-side execution                            | Search input renders; no `tables.listRows` calls execute                                                      | No error expected           |
| Mobile viewport                         | `$q.screen.lt.md` on a detail page               | Breadcrumb renders only a back button (navigates to the nearest ancestor's route, or `router.back()` if none) | No error expected           |

</intent-contract>

## Code Map

- `src/components/layout/Breadcrumbs.vue` (NEW) -- Reusable breadcrumb; props `items: {label,to}[]` (ancestors) and `current: string` (leaf); responsive desktop/tablet/mobile rendering.
- `src/composables/useGlobalSearch.js` (NEW) -- `Query.startsWith` + `Promise.allSettled` + stale-token search across permitted tables and nav items; returns `{ searchTerm, groupedResults, loading, search, isClient }`.
- `src/layouts/MainLayout.vue` -- Add header search `q-input` + `q-menu` results dropdown wired to `useGlobalSearch`; add `watch(route)` to auto-expand the active `expandedSections` key; remove the dead `/communications` nav item and drop `'communications:read'` from the Services section's `hasAnyPermission` gate.
- `src/router/routes.js` -- Add `meta.breadcrumb` to `/households/:id`, `/residents/:id`, `/inventory/:id`, `/inventory/add`, `/inventory/:id/edit`.
- `src/modules/finance/router.js` -- Add `meta.breadcrumb` to `finance/funding/:id`.
- `src/modules/lending/router.js` -- Add `meta.breadcrumb` to `lending/:id`, `lending/create`.
- `src/modules/farm/router.js` -- Add `meta.breadcrumb` to `farm/plots/:id`, `farm/plots/add`, `farm/plots/:id/edit`, `farm/plantings/:id`, `farm/plantings/:id/edit`, `farm/plots/:id/plantings/new`, `farm/crops/:id`, `farm/crops/add`, `farm/crops/:id/edit`, `farm/sales/:id`.
- `src/modules/school/router.js` -- Add `meta.breadcrumb` to `school/learners/:id`, `school/learners/enroll`, `school/learners/:id/edit`, `school/classes/:id`, `school/interventions/:id`, `school/interventions/create`, `school/interventions/:id/edit`.
- `src/modules/vendors/router.js` -- Add `meta.breadcrumb` to `vendors/:id`, `vendors/add`, `vendors/:id/edit`.
- Detail/form/create/edit pages (replace ad-hoc Back button with `<Breadcrumbs :items="breadcrumbItems" :current="currentLabel" />`):
  `src/pages/households/HouseholdDetailPage.vue`, `src/pages/residents/ResidentDetailPage.vue`, `src/pages/inventory/InventoryDetailPage.vue`, `src/pages/inventory/InventoryFormPage.vue`, `src/modules/finance/pages/FundingSourceDetailPage.vue`, `src/modules/lending/pages/LoanDetailPage.vue`, `src/modules/lending/pages/CreateLoanPage.vue`, `src/modules/farm/pages/PlotDetailPage.vue`, `src/modules/farm/pages/PlotFormPage.vue`, `src/modules/farm/pages/PlantingDetailPage.vue`, `src/modules/farm/pages/PlantingEditPage.vue`, `src/modules/farm/pages/CreatePlantingPage.vue`, `src/modules/farm/pages/CropDetailPage.vue`, `src/modules/farm/pages/CropFormPage.vue`, `src/modules/farm/pages/SaleDetailPage.vue`, `src/modules/school/pages/LearnerDetailPage.vue`, `src/modules/school/pages/EnrollLearnerPage.vue`, `src/modules/school/pages/ClassDetailPage.vue`, `src/modules/school/pages/InterventionDetailPage.vue`, `src/modules/school/pages/CreateInterventionPage.vue`, `src/modules/vendors/pages/VendorDetailPage.vue`, `src/modules/vendors/pages/VendorFormPage.vue`.
- Out of scope (verified, left unchanged): `ResetPasswordPage.vue`, `TimetableTemplatesPage.vue`, `SchoolSettingsPage.vue`, `SchoolCalendarPage.vue`, `RecordScoresPage.vue`, `LongTermGoalsSettingsPage.vue`, `EducationalGoalsPage.vue`, `ClassPerformancePage.vue`, `CalendarEventsSettingsPage.vue`, `BellSchedulesSettingsPage.vue`, `AcademicTermsSettingsPage.vue`, `FarmAlertsPage.vue`, `FarmReportsPage.vue`, `FarmSettingsPage.vue`, `UnauthorizedPage.vue` — these are settings hubs, reports/alerts landing pages, or error pages, not record-scoped detail/form/create/edit pages per sub-AC 2a's enumeration; their existing Back buttons stay as-is.

## Tasks & Acceptance

**Execution:**

- [x] `src/components/layout/Breadcrumbs.vue` -- Create component. Props: `items` (Array of `{label, to}`, default `[]`), `current` (String, required). Uses `useQuasar()` for `$q.screen`. Desktop (`$q.screen.gt.md`): render `<q-breadcrumbs>` with a `<q-breadcrumbs-el :key :label :to>` per `items` entry, then a final `<q-breadcrumbs-el :label="current">` (no `to`, non-clickable). Tablet (`$q.screen.md`): same but only render `items.slice(-1)` plus `current` (last 2 levels). Mobile (`$q.screen.lt.md`): render only `<q-btn flat round dense icon="arrow_back" aria-label="Back" @click="handleBack" />`; `handleBack` navigates to `items[items.length - 1]?.to` if present, else calls `router.back()`.
- [x] `src/composables/useGlobalSearch.js` -- Create composable following the `ResidentSearchInput.vue` pattern (`Query.startsWith`, `activeSearchToken` staleness guard, `Promise.allSettled`, `MIN_SEARCH_LENGTH = 2`, `MAX_RESULTS = 5` per module). Import `tables` from `src/boot/appwrite`, `Query` from `appwrite`, `usePermissions`, `useSettingsStore`. `isClient` ref set `true` in `onMounted`. Export `search(term)`, `groupedResults` (ref, object keyed by group label → array of `{ id, label, secondary, icon, to }`), `loading`, `searchTerm`. Query set (table id / field / group label / gate):
  - `households` (env `VITE_APPWRITE_TABLE_HOUSEHOLDS`) on `name` → group "Households", gated `hasPermission('households:read')`, `to: '/households/' + row.$id`, icon `home`.
  - `residents` (env `VITE_APPWRITE_TABLE_RESIDENTS`) on `first_name` and `last_name` (merge + de-dupe by `$id`) → group "Residents", gated `hasPermission('residents:read')`, `to: '/residents/' + row.$id`, icon `person`.
  - `finance_transactions` (hardcoded id, matches `finance-store.js`) on `description` → group "Finance", gated `hasPermission('finance:read')`, `to: '/finance/transactions'` (no per-transaction detail route exists), icon `receipt_long`.
  - `plots` (hardcoded id, matches `farm-store.js`) on `name` → group "Farm", gated `hasPermission('farm:read') && settingsStore.farmEnabled`, `to: '/farm/plots/' + row.$id`, icon `grass`.
  - `learners` (hardcoded id, matches `useDashboardData.js`) on `first_name` and `last_name` (merge + de-dupe) → group "School", gated `hasPermission('school:read') && settingsStore.schoolEnabled`, `to: '/school/learners/' + row.$id`, icon `school`.
  - `vendors` (hardcoded id, matches `vendors-store.js`) on `name` → group "Vendors", gated `hasPermission('vendors:read') && settingsStore.vendorsEnabled`, `to: '/vendors/' + row.$id`, icon `store`.
  - `inventory` (env `VITE_APPWRITE_TABLE_INVENTORY`, fallback `'inventory'`) on `item_name` → group "Inventory", gated `hasPermission('inventory:read')`, `to: '/inventory/' + row.$id`, icon `inventory_2`.
  - `village_events` (env `VITE_APPWRITE_TABLE_VILLAGE_EVENTS`, fallback `'village_events'`) on `title` → group "Calendar", no permission gate (matches the always-visible Calendar nav item), `to: '/calendar'` (no per-event detail route exists), icon `event`.
  - Nav items: a local `NAV_ITEMS` array (label, to, requiredPermission, requiredSetting) mirroring `MainLayout.vue`'s visible items; case-insensitive `includes` match against `searchTerm`, filtered by the same permission/setting gates → group "Pages", icon `link`.
  - `search(term)`: if `!isClient.value` return; trim; if `< MIN_SEARCH_LENGTH` clear `groupedResults` and return; bump `activeSearchToken`; set `loading.value = true`; run all gated queries via `Promise.allSettled`; on each settled promise check `token === activeSearchToken` before writing into `groupedResults` (skip rejected ones); build the "Pages" group synchronously (no query); after all settle, drop any group with 0 results; set `loading.value = false` only if `token === activeSearchToken`.
- [x] `src/layouts/MainLayout.vue` -- Header search: add a `q-input` (`dense outlined clearable`, `debounce="300"`, icon `search`, placeholder "Search...", `v-model="searchTerm"`, `@update:model-value="search"`) between the version `<div>` (line ~19) and the user profile `q-btn` (line ~21); wrap it and a `q-menu` (`fit`, `no-parent-event`, `v-model="searchMenuOpen"`) showing a `q-list` grouped by `groupedResults` keys — each group renders a `q-item-label header` (group name) followed by its result `q-item`s (`clickable`, icon avatar, `label`/`secondary`), `@click` on a result navigates via `router.push(result.to)` and closes the menu; render a "Type at least 2 characters" hint when `searchTerm.length < 2` and a "No results" item when search ran but all groups are empty; hide on `xs` via `class="gt-xs"` if width is constrained. Call `useGlobalSearch()` in `<script setup>`.
  - Active-section auto-expand: add `const route = useRoute();` (`import { useRoute } from 'vue-router'` alongside the existing `useRouter` import) and a route-prefix → `expandedSections` key map: `{'/households':'community','/residents':'community','/finance':'finance','/inventory':'finance','/lending':'finance','/vendors':'vendors','/farm':'agriculture','/school':'school','/calendar':'services','/storage':'services','/admin':'administration','/settings':'administration'}`. Add `watch(() => route.path, (path) => { const match = Object.entries(prefixMap).find(([prefix]) => path.startsWith(prefix)); if (match) expandedSections[match[1]] = true; }, { immediate: true })`.
  - Clean-menu fix: delete the `/communications` `q-item` block (lines ~566-579) entirely; change the Services section's `v-if` from `hasAnyPermission(['calendar:read', 'communications:read', 'storage:read'])` to `hasAnyPermission(['calendar:read', 'storage:read'])`.
- [x] `src/router/routes.js` -- Add `meta.breadcrumb: [{ label: 'Households', to: '/households' }]` to `/households/:id`; `[{ label: 'Residents', to: '/residents' }]` to `/residents/:id`; `[{ label: 'Inventory', to: '/inventory' }]` to `/inventory/:id`, `/inventory/add`, `/inventory/:id/edit`.
- [x] `src/modules/finance/router.js` -- Add `meta.breadcrumb: [{ label: 'Finance', to: '/finance/dashboard' }]` to `finance/funding/:id`.
- [x] `src/modules/lending/router.js` -- Add `meta.breadcrumb: [{ label: 'Lending', to: '/lending' }]` to `lending/:id` and `lending/create`.
- [x] `src/modules/farm/router.js` -- Add `meta.breadcrumb: [{ label: 'Farm', to: '/farm/dashboard' }, { label: 'Plots', to: '/farm/plots' }]` to `farm/plots/:id`, `farm/plots/add`, `farm/plots/:id/edit`, and `farm/plots/:id/plantings/new`; `[{ label: 'Farm', to: '/farm/dashboard' }, { label: 'Plantings', to: '/farm/plantings' }]` to `farm/plantings/:id` and `farm/plantings/:id/edit`; `[{ label: 'Farm', to: '/farm/dashboard' }, { label: 'Crop Database', to: '/farm/crops' }]` to `farm/crops/:id`, `farm/crops/add`, `farm/crops/:id/edit`; `[{ label: 'Farm', to: '/farm/dashboard' }, { label: 'Farm Sales', to: '/farm/sales' }]` to `farm/sales/:id`.
- [x] `src/modules/school/router.js` -- Add `meta.breadcrumb: [{ label: 'School', to: '/school/dashboard' }, { label: 'Learners', to: '/school/learners' }]` to `school/learners/:id`, `school/learners/enroll`, `school/learners/:id/edit`; `[{ label: 'School', to: '/school/dashboard' }, { label: 'Classes', to: '/school/classes' }]` to `school/classes/:id`; `[{ label: 'School', to: '/school/dashboard' }, { label: 'Interventions', to: '/school/interventions' }]` to `school/interventions/:id`, `school/interventions/create`, `school/interventions/:id/edit`.
- [x] `src/modules/vendors/router.js` -- Add `meta.breadcrumb: [{ label: 'Vendors', to: '/vendors' }]` to `vendors/:id`, `vendors/add`, `vendors/:id/edit`.
- [x] Update each page listed in Code Map to import `useRoute`, compute `breadcrumbItems` (`route.meta.breadcrumb || []`, or that array plus one dynamic ancestor for `CreatePlantingPage.vue` — see Design Notes) and `currentLabel` (dynamic leaf with a generic fallback string per Design Notes table), then replace the existing ad-hoc `<q-btn icon="arrow_back" ...>` with `<Breadcrumbs :items="breadcrumbItems" :current="currentLabel" />`. Keep each page's existing `goBack`/`backTarget` helper only if still used elsewhere on the page (e.g. a Cancel button); otherwise remove it once the Breadcrumbs component's own back handling supersedes it.

**Acceptance Criteria:**

- **Given** a user with `farm:read` opens `/farm/plots/:id` directly, **when** the page mounts, **then** the `Agriculture` section is expanded, the `Plots` sidebar item is highlighted, and the breadcrumb reads "Farm / Plots / `<plot name>`" on desktop.
- **Given** the same page on a mobile viewport, **when** it renders, **then** only a back arrow button is shown (no breadcrumb trail), and clicking it navigates to `/farm/plots`.
- **Given** a user expands the `Finance` section manually then navigates to `/farm/dashboard`, **when** the route changes, **then** `Agriculture` expands and `Finance` remains in whatever state the user last left it (not force-collapsed).
- **Given** any authenticated user, **when** they inspect the nav drawer, **then** no item targets `/communications` and no Guests/Equipment/Energy labels appear.
- **Given** a user with `vendors:read` types "ven" in the header search, **when** results return, **then** a "Vendors" group and/or a "Pages" group (matching the "Vendors" nav label) render, and clicking a vendor result navigates to `/vendors/:id`.
- **Given** a user without `finance:read`, **when** they search a term matching a finance transaction description, **then** no "Finance" group appears in the dropdown.
- **Given** one search module's query rejects (e.g. permission error), **when** results are rendered, **then** the other groups still populate and no error is shown to the user.
- **Given** the app renders server-side, **when** HTML is generated, **then** no `tables.listRows` call executes from `useGlobalSearch.js`.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on EVERY review pass, including loopbacks and blocked exits. -->

### 2026-08-04 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 9 (high 1, medium 4, low 4)
- defer: 1 (low)
- reject: 7
- addressed_findings:
  - [high] [patch] `src/layouts/MainLayout.vue`: header search menu template read `searchTerm.length` directly; clicking the `clearable` input's clear icon sets the model to `null`, which would throw on render. Guarded with `(searchTerm || '').length`.
  - [medium] [patch] `src/layouts/MainLayout.vue`: `onSearchInput` only opened the results menu at `>= 2` characters, so the "type at least 2 characters" hint (required by the I/O matrix) was unreachable dead code. Menu now opens at `>= 1` character.
  - [medium] [patch] `src/composables/useGlobalSearch.js`: `activeSearchToken` was not advanced on the sub-minimum-length early return, so an in-flight longer-term request could repopulate `groupedResults` after the user shortened/cleared the input. Token is now incremented unconditionally at the top of `search()`.
  - [medium] [patch] `src/layouts/MainLayout.vue`: result list used `:key="result.id"`, which is only unique per Appwrite table; two different tables sharing a coincidental `$id` string would collide. Keys are now namespaced with the group name (`` `${groupName}-${result.id}` ``).
  - [medium] [patch] `src/modules/farm/pages/PlantingDetailPage.vue`: the removed ad-hoc `goBack()` navigated to the specific parent plot (falling back to the Plantings list only if unloaded); the plain `route.meta.breadcrumb` breadcrumb lost that context, so mobile/back-icon navigation always landed on the flat Plantings list. Restored the plot as a dynamic ancestor segment, mirroring the nested-ancestor pattern already used by `CreatePlantingPage.vue`.
  - [low] [patch] `src/layouts/MainLayout.vue`: header search input had no accessible name (`placeholder` only). Added `aria-label="Search"`.
  - [low] [patch] `src/composables/useGlobalSearch.js`: the "Pages" nav-item search group was uncapped, unlike every table-backed group (`MAX_RESULTS = 5`). Capped it to `MAX_RESULTS` for consistency.
  - [low] [patch] `src/layouts/MainLayout.vue`: `sectionPrefixMap` matching used a bare `path.startsWith(prefix)`, which could theoretically auto-expand the wrong section for a future route sharing a string prefix (e.g. `/farmx` vs `/farm`). Tightened to exact match or `${prefix}/` boundary.
  - [low] [patch] `src/layouts/MainLayout.vue`: the results dropdown did not reopen on refocusing the search input after an outside click closed it, even with a qualifying cached term. Added an `onSearchFocus` handler that reopens the menu when `searchTerm.length >= 1`.
  - [low] [defer] Replacing ad-hoc Back buttons with `Breadcrumbs.vue` dropped several pages' destination-specific back-button tooltips/aria-labels in favor of the component's generic `aria-label="Back"`. Not required by this story's ACs; logged to `deferred-work.md` for the 5.10e accessibility audit.
  - [reject] Diff-inspection artifact (`.diff_5_10b.txt` UTF-16 encoding) was a review-tooling byproduct, not a code issue; file deleted, never committed.
  - [reject] `searchCalendar` has no `hasPermission('calendar:read')` gate. No such permission exists anywhere in `src/utils/permissions.js`, and the Calendar nav item/route itself has no permission gate — gating quick search would regress it below the app's own established Calendar-is-open-to-all-authenticated-users pattern (and the spec's own Task list explicitly specified this exemption). Behavior is correct as implemented.
  - [reject] `CreatePlantingPage.vue`'s nested dynamic ancestor differs from the ~21 other pages' plain `route.meta.breadcrumb` usage. This is the spec's explicitly documented, intentional exception (Design Notes: "Nested dynamic ancestor (`CreatePlantingPage.vue` only)"), not an inconsistency.
  - [reject] `LoanDetailPage.vue` diff contains incidental Prettier/ESLint reformatting beyond the Back-button swap (attribute wrapping, trailing commas, switch-statement formatting). Cosmetic only, no functional or user-facing impact; reverting would risk re-introducing lint violations.
  - [reject] `Breadcrumbs.vue`'s internal `defineOptions({ name: 'PageBreadcrumbs' })` differs from the file name / import alias `Breadcrumbs`. Intentional, documented workaround for ESLint's `vue/multi-word-component-names` rule; harmless (Vue's internal `name` option does not affect external usage or the `<Breadcrumbs>` tag).
  - [reject] `queryTable()` in `useGlobalSearch.js` has no `isClient` guard of its own. Redundant: its only call site (`search()`) already gates on `isClient` before any query runs; adding a second guard is unnecessary defensive duplication.
  - [reject] `SaleDetailPage.vue`'s removed `goBack()` used a `window.history.length > 1` check before falling back to `/farm/sales`. The deterministic parent-route navigation is the spec's explicitly documented design choice (Design Notes: "Mobile back target") and matches how most other converted pages already behaved (fixed `to`, not history-dependent); not a regression.

### 2026-08-05 — Post-finalization patch (commit `3152db1`)

Applied AFTER the spec was marked `done` at `eb2a67d`. These fixes corrected real defects in the merged implementation that the step-04 review pass did not catch (the review verified code shape, lint, and build — not live Appwrite queries against the real schema). `final_revision` bumped to `3152db1`.

- [high] [patch] `src/composables/useGlobalSearch.js` `searchLearners`: the original implementation queried the `learners` table on `first_name`/`last_name`, but the `learners` table has NO name columns — it links to `residents` via `resident_id` (see `src/modules/school/stores/learner-store.js` `buildResidentFullName` + enrichment at lines 121-172, and `LearnerForm.vue` which resolves names via the resident relation). The merged `eb2a67d` learner search was therefore broken (queried non-existent columns). Fixed by first matching `residents` by `first_name`/`last_name` (pool of 25 to avoid missing enrolled learners hidden behind non-learner resident matches), then looking up which of those residents have a `learners` row via `Query.equal('resident_id', residentIds)`, and resolving the display name from the resident. This supersedes the Code Map / Tasks learner bullet (which described the original broken approach) and the prompt file's "learners by `first_name`/`last_name`" guidance.
- [medium] [patch] `src/composables/useGlobalSearch.js` `searchFinance`: the original secondary text read `row.amount`, which is absent on funding-source rows. Fixed to `row.amount_funded ?? row.amount ?? 0`, formatted as ZMW currency via `Intl.NumberFormat('en-ZM')`, and appended a `formatDate(row.date)` segment. Supersedes the Tasks finance bullet's `row.amount` reference.
- [medium] [patch] `src/layouts/MainLayout.vue` header search: the `q-menu` could steal focus from the input on open, disrupting typing. Added `no-focus no-refocus` to the `q-menu` and restyled the input (`bg-color="white"`, `color="dark"`, `input-class="text-dark"`, fixed `width: 260px`) for legibility against the header background. NOTE: `no-focus no-refocus` may affect keyboard navigability of the results dropdown — logged for the 5.10e accessibility audit.
- [reject] No spec-level intent gap or bad-spec loopback: the original spec's I/O matrix and ACs describe learner/finance search generically ("a 'School' group with matching plots"/"matching plots") and remain valid; only the implementation's field assumptions were wrong. The Code Map / Tasks bullets that named the specific (incorrect) columns are now superseded by this patch entry per the append-only audit-trail convention.

## Design Notes

- **Breadcrumb API:** every page computes `breadcrumbItems` (ancestors) and `currentLabel` (leaf) itself; `Breadcrumbs.vue` never reads the route directly, keeping it a pure, testable presentation component. Dynamic leaf fallbacks (used until the record loads): Household→"Household", Resident→"Resident", Inventory item→"Item" (edit: "Edit Item"), Funding source→"Funding Source", Loan→"Loan", Plot→"Plot" (edit: "Edit Plot"), Planting→"Planting" (edit: "Edit Planting"), Crop→"Crop" (edit: "Edit Crop"), Sale→"Sale", Learner→"Learner" (edit: "Edit Learner"), Class→"Class", Intervention→"Intervention" (edit: "Edit Intervention"), Vendor→"Vendor" (edit: "Edit Vendor"). Create-mode pages use a static leaf ("Add Plot", "Add Crop", "Add Vendor", "New Loan", "Enroll Learner", "New Intervention", "Record New Planting") with no fallback needed.
- **Nested dynamic ancestor (`CreatePlantingPage.vue` only):** its route (`farm/plots/:id/plantings/new`) is nested under a specific plot, so `breadcrumbItems` = `[...(route.meta.breadcrumb || []), { label: plot.value?.name || 'Plot', to: '/farm/plots/' + route.params.id }]` and `currentLabel = 'Record New Planting'`.
- **Mobile back target:** uses the last `items` entry's `to` (deterministic parent route) rather than blind `router.back()`, matching how most existing Back buttons already navigate (fixed parent route) rather than relying on browser history; `router.back()` is only the fallback when `items` is empty.
- **Quick search navigation limits:** `finance_transactions` and `village_events` have no per-record detail route in this app, so their results link to the list/module page (`/finance/transactions`, `/calendar`) rather than a specific record — acceptable since 5.10b adds no new routes.
- **Dead-link fix scope:** `/communications` has no route, no page, and no `communications:read` permission anywhere in `src/utils/permissions.js` — it is vestigial, not a deferred-module placeholder (unlike Guests/Equipment/Energy, which are intentionally kept). Removing it is the correct minimal "clean menu" fix.
- **Interventions nav omission verified intentional:** `/school/interventions` has no sidebar entry but is reachable via `SchoolDashboardPage.vue`'s quick link and `MyInterventionsWidget.vue`; this is existing contextual navigation, not a bug — no change made.

## Verification

**Commands:**

- `npm run lint` -- expected: no new ESLint errors in any file listed in the Code Map.
- `npm run build` -- expected: build completes without errors; SSR build makes no Appwrite calls from `useGlobalSearch.js`.

**Manual checks:**

- Reload `/farm/plots/:id`, `/school/learners/:id`, `/vendors/:id` directly (simulating a fresh page load): confirm the correct nav section is expanded and the item highlighted.
- Resize the browser to mobile width on a detail page: confirm only a back button renders and it navigates to the correct list.
- Type a 1-character then a 2+-character term in the header search as System Administrator: confirm no query fires for 1 character, and multiple groups populate for 2+.
- Log in as a Resident-only role and repeat the search: confirm only permitted groups (if any) and "Pages" (permission-filtered) appear.
- Confirm `/communications` no longer appears anywhere in the rendered nav drawer.

## Auto Run Result

- **Status:** done
- **Summary:** Added a reusable `Breadcrumbs.vue` component and `useGlobalSearch.js` composable, wired a header quick-search box with grouped, permission-gated results into `MainLayout.vue`, added a route watcher that auto-expands the nav section matching the active route, removed the dead `/communications` nav link, added `meta.breadcrumb` to every detail/form/create/edit route in scope, and replaced the ad-hoc Back buttons on all 22 spec-listed pages with the new component. A review pass found and fixed 9 real issues (a potential render crash on clearing the search input, a dead "type at least 2 characters" hint, a stale-result race, duplicate Vue keys across search groups, a lost plot-context back-target on `PlantingDetailPage`, a missing search-input `aria-label`, an uncapped "Pages" search group, an overly-loose nav-section prefix match, and a menu-reopen-on-focus gap); one low-severity accessibility item (lost per-page back-button tooltips) was deferred to the 5.10e accessibility audit.
- **Files changed:**
  - `src/components/layout/Breadcrumbs.vue` (new) — responsive breadcrumb/back-button component.
  - `src/composables/useGlobalSearch.js` (new) — permission-gated, SSR-safe global quick-search composable.
  - `src/layouts/MainLayout.vue` — header search input + grouped results dropdown, active-section auto-expand watcher, dead `/communications` link removal.
  - `src/router/routes.js`, `src/modules/finance/router.js`, `src/modules/lending/router.js`, `src/modules/farm/router.js`, `src/modules/school/router.js`, `src/modules/vendors/router.js` — added `meta.breadcrumb` to in-scope routes.
  - 22 detail/form/create/edit pages (see Code Map) — replaced ad-hoc Back buttons with `<Breadcrumbs>`.
  - `docs/implementation-artifacts/deferred-work.md` — logged the lost back-button-tooltip accessibility item for 5.10e.
  - `docs/implementation-artifacts/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md` — this spec.
- **Review findings:** 9 patches applied (1 high, 4 medium, 4 low); 1 low-severity item deferred to 5.10e; 7 findings rejected as either already-correct-per-spec design decisions, cosmetic formatting noise, or unnecessary defensive duplication (see Review Triage Log for full reasoning per item); 0 intent gaps; 0 bad-spec loopbacks.
- **Verification performed:** `npm run lint` passed (both before and after the review-pass patches); `npm run build` (SPA) succeeded (both passes); a third-party reviewer subagent additionally ran `npx quasar build -m ssr` successfully. Manual code inspection confirmed the `isClient` SSR guard, `Promise.allSettled` failure isolation, and permission/setting gating on every quick-search module.
- **Residual risks:** The `finance_transactions` and `village_events` quick-search results link to their list/module page rather than a specific record (no per-record detail route exists for either); this is a known, spec-documented limitation, not a defect. The Loan/Sale detail leaf labels use borrower/buyer name rather than a formal loan/sale number since neither entity has one in this schema.
- **Post-finalization patch (2026-08-05, commit `3152db1`):** After this spec was marked `done` at `eb2a67d`, a follow-up fix corrected three real defects the step-04 review did not catch: (1) the learner quick-search queried the `learners` table on `first_name`/`last_name` columns that do not exist on that table (it joins to `residents` via `resident_id`) — reworked to search residents first then resolve learner rows; (2) the finance result secondary text used `row.amount` (absent on funding-source rows) — fixed to `amount_funded ?? amount` with ZMW currency + date formatting; (3) the header search `q-menu` stole focus from the input — added `no-focus no-refocus` + restyling. `final_revision` bumped to `3152db1`. See Review Triage Log §"2026-08-05 — Post-finalization patch" for full detail. The `no-focus no-refocus` menu attribute may affect keyboard navigability and is logged for the 5.10e accessibility audit.
