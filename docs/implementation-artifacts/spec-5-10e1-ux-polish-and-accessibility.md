---
title: 'Story 5.10e1: UX Polish and Accessibility'
type: 'feature'
created: '2026-08-11'
status: 'done'
baseline_revision: '2acced52dcffda941122a85c8d37893ee50d28a7'
final_revision: '6f251e7a3e8489a80a442bfd90ecfbaedb99ea44'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: ['oversized']
deferred:
  - summary: >-
      FarmDashboardPage.vue's clickable module-navigation cards have no `role="button"`, `tabindex="0"`,
      or keyboard event handlers, making them unreachable/unusable for keyboard-only users.
    evidence: |-
      Surfaced incidentally by the Blind Hunter review pass while auditing MainLayout.vue/FarmDashboardPage.vue
      changes; the clickable cards are pre-existing markup untouched by this story's enumerated 4e fix list
      (which targeted icon-only `q-btn`s specifically, not clickable `q-card`/div elements). Not caused by this
      diff. Owning story: 5.10e3 (Mobile Responsiveness — AC6) per user decision 2026-08-11; the 44px touch-target
      audit and clickable-card keyboard a11y are both interaction-surface concerns that fit 5.10e3's scope.
    location: >-
      src/modules/farm/pages/FarmDashboardPage.vue:892-907
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Across the MVP surface (Epics 1-5), pages have inconsistent heading hierarchy, uneven loading-state coverage, silent/ad-hoc error handling, inconsistent success-notification format, and accessibility gaps (icon-only buttons without `aria-label`, low-contrast banner text, no live-region on the notifications badge) — plus two accessibility regressions carried forward from 5.10b (generic `Breadcrumbs.vue` back-button aria-label, `no-focus no-refocus` on the quick-search `q-menu` reducing keyboard reachability).

**Approach:** Audit-and-fix pass, reusing only existing primitives (`useErrorHandler`, Quasar `Notify`/`q-skeleton`/`q-spinner`/`q-banner`), standardizing outliers to each area's existing dominant pattern (no new shared components — none of the 4c/4b extraction thresholds are met), fixing a capped, enumerated set of files per sub-AC (4a-4f), and fixing the two 5.10b-deferred a11y items.

## Boundaries & Constraints

**Always:** Reuse `useErrorHandler().notifyError/notifySuccess` (bottom position, verb-first past-tense message) as the standardized success/error notification call. Reuse the existing best-in-class error-banner pattern (`q-banner class="bg-negative text-white" rounded` + avatar `error` icon + action slot `Retry` button that re-invokes the page's fetch function) for pages getting an error state added/fixed. Reuse the existing dominant loading pattern per page family (`q-skeleton` for list/dashboard pages that already use it; a `loading` ref + `q-inner-loading`/`q-spinner-dots` for pages using that family's existing convention) — do not introduce a third loading idiom. All new/changed markup uses Quasar components only, `<script setup>`, no Options API. Every icon-only `q-btn` fix adds a concise, action-specific `aria-label` (e.g. "Edit household", not just "Edit"). The `Breadcrumbs.vue` fix derives the aria-label from `props.current`/`props.items`, never hardcodes per-page strings inside the shared component. The quick-search keyboard-nav fix preserves `no-focus no-refocus` on the `q-menu` (keeps typing fluent) and adds arrow-key/Enter/Escape handling via a `highlightedIndex` ref on the input's `@keydown`, not by removing the existing focus-steal fix.

**Block If:** None encountered — no ambiguity required a human decision to proceed with the bounded fix sets below.

**Never:** No new Appwrite tables/functions/permissions/.env vars/stores/pages/routes. No extraction of a shared `ErrorBanner.vue`/`LoadingState.vue` (repetition does not clear the >8-page bar — fixes are in-place). No 44px touch-target changes (5.10e3). No removal of the `useDashboardData.js` 300ms `setTimeout` (5.10e2). No fix to the systemic `bg-info text-white` contrast issue (~1.8:1, fails 4.5:1) — it is the _dominant_ pattern across 10+ files (`DashboardPage.vue`, `HouseholdsListPage.vue`, `ResidentsListPage.vue`, `VillageSettingsPage.vue`, `RolesPage.vue`, `FinanceTransactionsPage.vue`, `AddFundingDialog.vue`, `TeachersListPage.vue`, etc.) and re-theming or re-coloring it app-wide is a high-blast-radius design decision, not a bounded in-place fix; it is recorded in Design Notes and appended to `deferred-work.md` for a user decision, not fixed here. No fix to the 3 security/realtime items re-deferred to post-MVP (2026-08-11). No change to `notification_reads`/realtime/at-risk-cache behavior (5.10c deferred items).

## I/O & Edge-Case Matrix

| Scenario                                                  | Input / State                                                                                             | Expected Output / Behavior                                                                                                                                                                           | Error Handling                                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Quick-search keyboard nav                                 | User types in header search box, results `q-menu` opens (`no-focus no-refocus`), user presses `ArrowDown` | Focus stays in the input (no focus-steal); a `highlightedIndex` ref advances to the next flattened result row and applies a `highlighted` visual class to it                                         | If no results are open, arrow keys are no-ops                                                     |
| Quick-search keyboard nav                                 | Highlighted result exists, user presses `Enter`                                                           | `onResultClick` fires for the highlighted result exactly as a mouse click would (navigates, closes menu)                                                                                             | If nothing is highlighted, `Enter` is a no-op (default input behavior)                            |
| Quick-search keyboard nav                                 | Results menu open, user presses `Escape`                                                                  | Menu closes (`searchMenuOpen = false`), focus remains in the input                                                                                                                                   | No error case                                                                                     |
| Breadcrumbs back button                                   | Mobile viewport (`xs`), `items` has at least one entry with a `label`                                     | Back button gets `aria-label="Back to {items[items.length - 1].label}"`                                                                                                                              | If `items` is empty, falls back to `aria-label="Back"` (current generic behavior preserved)       |
| Loading-state fix (e.g. `VendorsListPage.vue`)            | Page mounts, `vendorsStore.fetchVendors()` is in flight                                                   | Standardized loading indicator (matching that page family's dominant pattern) is visible until the fetch resolves or rejects                                                                         | On rejection, the page's error state (per 4c) takes over from the loading state                   |
| Error-handling fix (e.g. `farm-store.js` `fetchPlots`)    | `tables.listRows` rejects                                                                                 | Store catch block calls `errorHandler.notifyError(...)` in addition to returning `{ success: false }` (no duplicate `console.error`+`notifyError` if only one already exists — do not double-notify) | Caller's existing retry affordance (if present) or a page-level error banner surfaces the failure |
| Success-notification fix (e.g. `PlotFormPage.vue` create) | Plot create succeeds                                                                                      | `useErrorHandler().notifySuccess('Plot created successfully')` fires (bottom position) instead of ad-hoc `$q.notify({ position: 'top' })`                                                            | N/A — create failure path already handled separately                                              |

</intent-contract>

## Code Map

- `src/composables/useErrorHandler.js` -- canonical `notifyError`/`notifySuccess` (Notify, position `bottom`, verb-first messages) — reuse target for all 4c/4d fixes; no changes needed to the composable itself.
- `src/pages/households/HouseholdsListPage.vue` -- best-in-class q-skeleton loading pattern (:24-31); heading missing `text-h5` (:7); 4 icon-only buttons missing aria-label (view/edit/delete/pagination, :91-167).
- `src/pages/residents/ResidentsListPage.vue` -- same icon-only button pattern as Households (view/edit/delete/pagination, :192-266) — mirror the Households fix.
- `src/modules/finance/pages/FinanceReportsPage.vue` -- heading missing `text-h5` (:7); already-correct `bg-warning text-dark` banner pattern (:520,633) — reference for the 4e contrast fix elsewhere.
- `src/pages/dashboard/DashboardPage.vue` -- outlier `text-h4` welcome heading (:5); silent `console.error`-only catch for guidance counts (:172); reference `useDashboardData.js` composable for the underlying fetches.
- `src/composables/useDashboardData.js` -- 10 catch blocks (:50,65,83,131,157,185,213,236,265,289) that `console.error` only, no user feedback — each isolated per-module fetch (by design, per 5.10a), so the fix adds a single non-blocking `notifyError` without breaking the "one failure doesn't break the dashboard" isolation.
- `src/pages/inventory/InventoryListPage.vue` -- missing loading state during `onMounted` fetch (:185-187); ad-hoc `$q.notify` (no position, defaults 'top') for CSV export (:309-312).
- `src/modules/farm/stores/farm-store.js` -- 5 catch blocks (`fetchPlots` :353, `fetchPlot` :371, `createPlot` :390, `fetchCrops` :514, `fetchPlantings` :614, `fetchHarvests` :864) that `console.error` only, no `notifyError` — fix adds `errorHandler.notifyError(...)` to each.
- `src/modules/farm/pages/FarmDashboardPage.vue`, `CropsListPage.vue`, `PlantingsListPage.vue`, `SalesListPage.vue` -- missing loading indicator during their `onMounted` parallel-fetch blocks (:374-381, :363-367, :294-306, :311-326 respectively).
- `src/modules/farm/pages/PlotsListPage.vue` -- 3 icon-only buttons (view/edit/delete, :104-117) missing aria-label; delete success uses ad-hoc `$q.notify({ position: 'top' })` (:305-309).
- `src/modules/farm/pages/PlotFormPage.vue` -- create/update success both use ad-hoc `$q.notify({ position: 'top' })` (:93-97, :103-107).
- `src/modules/farm/pages/CropFormPage.vue` -- create success uses ad-hoc `$q.notify` with no position (:112-115).
- `src/modules/farm/pages/PlantingDetailPage.vue` -- 2 ad-hoc `$q.notify({ position: 'top' })` for harvest start/complete with non-verb-first messages (:1129-1133, :1262-1268).
- `src/modules/farm/pages/CreatePlantingPage.vue` -- error state uses `console.error` instead of `notifyError` (:392-393); success uses ad-hoc `$q.notify({ position: 'top' })` (:402-406).
- `src/modules/farm/components/RecentSalesWidget.vue`, `TopCropsWidget.vue`, `PlotProfitabilityCard.vue` -- refresh icon-only `q-btn` missing aria-label (:19, :19, :17 respectively).
- `src/modules/school/pages/LearnersListPage.vue` -- 2 icon-only buttons (view/edit, :111-131) missing aria-label; missing loading indicator during `onMounted` (implied by ClassesListPage pattern below).
- `src/modules/school/pages/ClassesListPage.vue` -- `onMounted` (:276-281) runs 4 sequential fetches but template loading state only covers `classStore.isLoading` (:53-56) — doesn't cover the full sequence.
- `src/modules/school/pages/LongTermGoalsSettingsPage.vue` -- back-navigation icon-only `q-btn` missing aria-label (:11).
- `src/modules/vendors/pages/VendorsListPage.vue` -- missing loading indicator during `onMounted` fetch (:190-192).
- `src/modules/lending/pages/AllLoansPage.vue` -- missing loading indicator during `onMounted` fetch (:194-197).
- `src/modules/calendar/pages/CalendarPage.vue` -- `onMounted` (:480-483) loading coverage gap — existing `calendarStore.loading && !calendarStore.loaded` guard (:96-99) needs verification/tightening.
- `src/modules/finance/pages/FinanceTransactionsPage.vue` -- inventory-link icon-only `q-btn` missing aria-label (:174-187); ad-hoc `$q.notify` (no position) for funding-added success (:884-887).
- `src/modules/finance/pages/FinanceDashboardPage.vue` -- best-in-class error-banner-with-retry pattern (:42-50, `refresh()`) — reference for 4c standardization elsewhere; ad-hoc `$q.notify` for export success (:211-214).
- `src/pages/settings/VillageSettingsPage.vue` -- 5 catch blocks using direct `$q.notify({ type: 'negative' })` instead of `useErrorHandler` (:651,731,793,940,976); 2 success calls with inconsistent message format (no "successfully" suffix, :649,974).
- `src/pages/inventory/InventoryFormPage.vue` -- ad-hoc `$q.notify` (no position) for create/update success (:306-309).
- `src/pages/inventory/InventoryDetailPage.vue` -- ad-hoc `$q.notify` for sale-recorded success (:611-614), message doesn't follow verb-first format.
- `src/layouts/MainLayout.vue` -- notification badge (:101-103) has no `aria-live`/`role="status"`; logout success uses ad-hoc `$q.notify({ position: 'top' })` (:1032-1036); notification-subscribe-failure catch (:965) is `console.error`-only; quick-search `q-input`/`q-menu` (:22-88) is the 4f keyboard-nav fix target; `searchTerm`/`groupedResults`/`onSearchInput`/`onResultClick` script-block wiring (script section, not shown in template excerpt) is where the `highlightedIndex` state and `@keydown` handler are added.
- `src/composables/useGlobalSearch.js` -- `groupedResults` (object keyed by group name → array of `{id,label,secondary,icon,to}`) is the data the keyboard-nav fix flattens into a linear list for arrow-key traversal; no changes needed here — the flattening/highlight state lives in `MainLayout.vue`'s script block that consumes this composable.
- `src/components/layout/Breadcrumbs.vue` -- generic `aria-label="Back"` on the mobile back button (:23-32) — 4f fix target; `handleBack()` (:59-66) already computes the same target the aria-label needs to describe.
- `src/pages/help/HelpPage.vue` (:146,172,200), `src/modules/school/pages/RecordScoresPage.vue` (:67), `src/modules/school/pages/BellSchedulesSettingsPage.vue` (:423), `src/components/residents/ResidentForm.vue` (:8) -- 6 `bg-warning text-white` instances (contrast ~1.4:1, fails 4.5:1) where the dominant/correct `bg-warning text-dark` pattern (already used in 8+ other files, e.g. `FinanceReportsPage.vue:520,633`, `AtRiskLearnersPage.vue:52`, `CreatePlantingPage.vue:40`) should be applied instead — bounded, in-place contrast fix (not a theme change).
- `src/css/quasar.variables.scss` -- READ-ONLY reference for the contrast audit (`$warning: #f2c037`, `$info: #31ccec`, etc.) — no changes here (theme-color change is out of scope, see Never).

## Tasks & Acceptance

**Execution:**

_4a — Consistent UI (3 fixes):_

- `src/pages/households/HouseholdsListPage.vue:7` -- add `text-h5` class to the `<h4>` page title -- matches the dominant page-title pattern (10/13 sampled pages use `text-h5`).
- `src/modules/finance/pages/FinanceReportsPage.vue:7` -- add `text-h5` class to the `<h4>` page title -- same rationale.
- `src/pages/dashboard/DashboardPage.vue:5` -- change `text-h4` to `text-h5` on the welcome heading -- Dashboard is the only page using `text-h4` for its title; align with the dominant convention.

_4b — Loading states (9 fixes, standardizing to each page-family's existing dominant pattern — `q-skeleton` for list pages that already use it elsewhere, a `loading`/`isLoading` ref + `q-inner-loading`/`q-spinner-dots` for farm pages matching `PlotsListPage.vue`'s existing pattern):_

- `src/pages/inventory/InventoryListPage.vue:185-187` -- add a `loading` ref set around the `onMounted` fetch and a `q-skeleton` block in the template (matching `HouseholdsListPage.vue:24-31`) -- currently renders stats/table immediately with no indicator.
- `src/modules/farm/pages/FarmDashboardPage.vue:374-381` -- add a `loading` ref around the `Promise.all(loaders)` call and a `q-inner-loading`/`q-spinner-dots` block (matching `PlotsListPage.vue:59-63`) -- currently renders widgets immediately.
- `src/modules/farm/pages/CropsListPage.vue:363-367` -- wire the existing `farmStore.isCropsLoading` template block (:72-76) to also cover the initial `onMounted` fetch, or add an equivalent `loading` ref -- currently only triggers on subsequent q-table refreshes, not first load.
- `src/modules/farm/pages/PlantingsListPage.vue:294-306` -- add a `loading` ref around the 3 sequential fetches and a `q-inner-loading` block -- currently renders filters/table immediately.
- `src/modules/farm/pages/SalesListPage.vue:311-326` -- add a `loading` ref around `Promise.all(loaders)` and a `q-inner-loading` block -- currently renders summary cards/table immediately.
- `src/modules/school/pages/ClassesListPage.vue:276-281` -- wrap the 4 sequential fetches in a single `loading` ref (in addition to the existing `classStore.isLoading` check at :53-56) so the loading indicator covers the full onMounted sequence.
- `src/modules/vendors/pages/VendorsListPage.vue:190-192` -- add a `loading` ref around `vendorsStore.fetchVendors()` and a `q-skeleton` block (matching `HouseholdsListPage.vue`) -- currently renders immediately.
- `src/modules/lending/pages/AllLoansPage.vue:194-197` -- add a `loading` ref around both fetches and a `q-skeleton` block -- currently renders immediately.
- `src/modules/calendar/pages/CalendarPage.vue:480-483` -- verify/tighten the existing `calendarStore.loading && !calendarStore.loaded` guard (:96-99) so it visibly covers the `onMounted` fetch window (add a `q-inner-loading` block if the current guard doesn't render one already).

_4c — Error handling (8 fixes, standardizing to the `FinanceDashboardPage.vue:42-50` retry-banner pattern for page-level fetches, and adding `errorHandler.notifyError(...)` to store-level catch blocks that currently only `console.error`):_

- `src/pages/dashboard/DashboardPage.vue:172` -- keep the existing `console.error` (dashboard fetches are intentionally isolated per 5.10a) but add a single non-blocking `errorHandler.notifyError('Some dashboard data could not be loaded.')` so the failure isn't fully silent.
- `src/composables/useDashboardData.js:50,65,83,131,157,185,213,236,265,289` -- same treatment as above: keep the isolated `console.error` per module, add one shared `notifyError` call per catch block using a short module-specific message (e.g. `'Household stats could not be loaded.'`) — do not let one module's notify block another module's fetch.
- `src/modules/farm/stores/farm-store.js:353-354,371-372,390-391,514-515,614-615,864-865` -- add `errorHandler.notifyError(...)` to each of the 6 catch blocks (fetchPlots/fetchPlot/createPlot/fetchCrops/fetchPlantings/fetchHarvests) -- currently `console.error`-only, no user feedback.
- `src/modules/farm/pages/CreatePlantingPage.vue:392-393` -- replace the bare `console.error` with `errorHandler.handleError(error, 'Failed to load data')` (keep the existing `loadError` ref/banner UI, which already matches the retry-banner pattern) -- currently silent beyond the visible banner text.
- `src/pages/settings/VillageSettingsPage.vue:651,731,793,940,976` -- replace the 5 direct `$q.notify({ type: 'negative', ... })` calls with `errorHandler.notifyError(...)` -- standardizes to the composable instead of ad-hoc Notify calls.
- `src/layouts/MainLayout.vue:965` -- keep the existing polling fallback behavior, add a one-time `errorHandler.notifyError('Live notifications unavailable; refreshing periodically instead.')` so the silent realtime-subscribe failure is surfaced once.
- `src/modules/lending/stores/lendingStore.js:85-86` -- remove the redundant `console.error` (keep `errorHandler.notifyError`) -- de-duplicates without losing user feedback.
- `src/stores/notifications-store.js:108-110` -- remove the redundant `console.error` (keep `this.error` state + `errorHandler.notifyError`) -- de-duplicates.

_4d — Success confirmations (10 fixes, standardizing all to `useErrorHandler().notifySuccess(message)` with a verb-first past-tense message and default `position: 'bottom'`):_

- `src/modules/farm/pages/PlotFormPage.vue:93-97,103-107` -- replace both `$q.notify({ position: 'top' })` calls with `notifySuccess('Plot created successfully')` / `notifySuccess('Plot updated successfully')`.
- `src/modules/farm/pages/PlotsListPage.vue:305-309` -- replace `$q.notify({ position: 'top' })` with `notifySuccess('Plot deleted successfully')`.
- `src/modules/farm/pages/CropFormPage.vue:112-115` -- replace `$q.notify(...)` with `notifySuccess('Crop created successfully')`.
- `src/modules/farm/pages/PlantingDetailPage.vue:1129-1133,1262-1268` -- replace both `$q.notify({ position: 'top' })` calls with `notifySuccess('Harvest started successfully')` / `notifySuccess('Harvest completed successfully. You can now record the next harvest.')`.
- `src/modules/farm/pages/CreatePlantingPage.vue:402-406` -- replace `$q.notify({ position: 'top' })` with `notifySuccess(...)` using the same message content, verb-first.
- `src/pages/inventory/InventoryFormPage.vue:306-309` -- replace `$q.notify(...)` with `notifySuccess(...)`, same message.
- `src/pages/inventory/InventoryDetailPage.vue:611-614` -- replace `$q.notify(...)` with `notifySuccess('Sale recorded successfully')` (drop the inline transaction details from the toast; they remain visible in the resulting UI).
- `src/layouts/MainLayout.vue:1032-1036` -- replace `$q.notify({ position: 'top' })` with `notifySuccess('Logged out successfully')` (default bottom position).
- `src/modules/finance/pages/FinanceDashboardPage.vue:211-214` -- replace `$q.notify(...)` with `notifySuccess('Dashboard exported successfully')`.
- `src/modules/finance/pages/FinanceTransactionsPage.vue:884-887` -- replace `$q.notify(...)` with `notifySuccess('Funding added successfully')`.
- `src/pages/settings/VillageSettingsPage.vue:649,974` -- replace `$q.notify({ message: 'Council member saved.' })` / `'Council member removed.'` with `notifySuccess('Council member saved successfully')` / `notifySuccess('Council member removed successfully')`.

_4e — Accessibility (17 fixes, cap 15-20; prioritizing icon-only aria-labels, then the badge live-region, then the bounded contrast fix):_

- `src/pages/households/HouseholdsListPage.vue:91-101,103-114,115-126,152-159,160-167` -- add `aria-label="View household"` / `"Edit household"` / `"Delete household"` / `"Previous page"` / `"Next page"` to the 5 icon-only buttons.
- `src/pages/residents/ResidentsListPage.vue:192-202,203-214,215-226,251-258,259-266` -- add `aria-label="View resident"` / `"Edit resident"` / `"Delete resident"` / `"Previous page"` / `"Next page"` to the 5 icon-only buttons.
- `src/modules/farm/pages/PlotsListPage.vue:104,107,110-117` -- add `aria-label="View plot"` / `"Edit plot"` / `"Delete plot"`.
- `src/modules/school/pages/LearnersListPage.vue:111-120,121-131` -- add `aria-label="View learner"` / `"Edit learner"`.
- `src/modules/school/pages/LongTermGoalsSettingsPage.vue:11` -- add `aria-label="Back to School Settings"`.
- `src/modules/finance/pages/FinanceTransactionsPage.vue:174-187` -- add `aria-label="View linked inventory item"`.
- `src/modules/farm/components/RecentSalesWidget.vue:19`, `TopCropsWidget.vue:19`, `PlotProfitabilityCard.vue:17` -- add `aria-label="Refresh"` to each of the 3 refresh buttons.
- `src/layouts/MainLayout.vue:101-103` -- add `role="status"` and `aria-live="polite"` to the notification `q-badge` (or a visually-hidden sibling span announcing "N unread notifications") so unread-count changes are announced to screen readers.
- `src/pages/help/HelpPage.vue:146,172,200`, `src/modules/school/pages/RecordScoresPage.vue:67`, `src/modules/school/pages/BellSchedulesSettingsPage.vue:423`, `src/components/residents/ResidentForm.vue:8` -- change `bg-warning text-white` to `bg-warning text-dark` (6 instances) -- applies the already-dominant, already-correct `text-dark` pattern (used in 8+ other files) to these outliers; contrast improves from ~1.4:1 (fail) to a passing ratio. This is a bounded, in-place class fix, not a theme-color change.

_Deferred-work bookkeeping (1 fix):_

- `docs/implementation-artifacts/deferred-work.md` -- append a new entry documenting the systemic `bg-info text-white` contrast issue (~1.8:1, 10+ files) as owned by a future post-MVP theming pass / user-directed follow-up -- and mark the two 5.10b-deferred a11y items (Breadcrumbs back-button, quick-search keyboard nav) as resolved by this story once the 4f tasks below land.

_4f — Deferred a11y fixes from 5.10b (2 fixes):_

- `src/components/layout/Breadcrumbs.vue:23-32` -- compute a `backAriaLabel` ref: `props.items.length ? `Back to ${props.items[props.items.length - 1].label}` : 'Back'`, and bind it to the mobile back button's `:aria-label` (replacing the hardcoded `aria-label="Back"`) -- restores destination-specific labeling per page context, generically (no per-page hardcoding inside the shared component).
- `src/layouts/MainLayout.vue` (script block near `searchTerm`/`groupedResults`/`onResultClick`) -- add a `highlightedIndex` ref, a computed flattened list of all `groupedResults` rows (in display order), and an `@keydown` handler on the quick-search `q-input` for `ArrowDown`/`ArrowUp` (move `highlightedIndex`), `Enter` (invoke `onResultClick` for the highlighted row), and `Escape` (close the menu); bind a `highlighted` class to the corresponding `q-item` in the template (:69-83) based on `highlightedIndex`. Keep `no-focus no-refocus` on the `q-menu` unchanged (:45) — this fix restores keyboard result-selection without moving DOM focus off the input, so the `3152db1` focus-steal fix is preserved.

**Acceptance Criteria:**

- Given the `HouseholdsListPage`/`ResidentsListPage`/`PlotsListPage`/`LearnersListPage` view/edit/delete icon buttons, when a screen reader user tabs to one, then it announces a specific action name (e.g. "Edit household button"), not just "button".
- Given `InventoryListPage`/`FarmDashboardPage`/`CropsListPage`/`PlantingsListPage`/`SalesListPage`/`ClassesListPage`/`VendorsListPage`/`AllLoansPage`/`CalendarPage` on a slow connection, when the page mounts and its fetch is in flight, then a loading indicator is visible and clears once data arrives or an error occurs (never a blank/empty-looking screen during fetch).
- Given `farm-store.js`'s `fetchPlots`/`fetchPlot`/`createPlot`/`fetchCrops`/`fetchPlantings`/`fetchHarvests` reject, when the error propagates, then the user sees a `notifyError` toast in addition to the existing `console.error`/return-value handling.
- Given any of the 10 enumerated CUD success paths (plot create/update/delete, crop create, harvest start/complete, planting record, inventory create/update, sale record, logout, dashboard export, funding add, council member save/remove), when the action succeeds, then a single `notifySuccess` toast fires at the default `bottom` position with a verb-first past-tense message — no ad-hoc `$q.notify` with `position: 'top'` remains at any of the enumerated call sites.
- Given the header quick-search results are open, when the user presses `ArrowDown`/`ArrowUp` then `Enter`, then the highlighted result navigates exactly as a mouse click would, and the search input never loses focus while typing (the `no-focus no-refocus` fix from `3152db1` is unaffected).
- Given a mobile viewport on any page using `Breadcrumbs.vue`, when the back button is focused by a screen reader, then it announces "Back to {destination label}" rather than the generic "Back".
- Given the notifications bell badge count changes (a new notification arrives), when a screen reader user has focus elsewhere on the page, then the change is announced via the added live region.
- Given the 6 enumerated `bg-warning text-white` banners, when rendered, then their text renders as `text-dark` (passing ≥4.5:1 contrast) instead of `text-white` (~1.4:1).
- Given `HouseholdsListPage.vue`, `FinanceReportsPage.vue`, and `DashboardPage.vue` page-title headings, when rendered, then all three use the `text-h5` convention (no lingering unstyled `<h4>` or outlier `text-h4`).

## Review Triage Log

### 2026-08-11 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 1 (medium 1, medium Nmedium=1, low 0)
- defer: 1 (medium 1, low 0)
- reject: 19
- addressed_findings:
  - `[medium]` `[patch]` `docs/implementation-artifacts/deferred-work.md:172-173` had a malformed entry (`source*spec` instead of `source_spec`, and a broken `\_dominant*` escape) from the implementation pass's append — corrected to `source_spec` and `dominant`, matching every other entry's format in the file.

### 2026-08-11 — Post-finalization patches (commits `26779c6`, `6f251e7`)

Two follow-up commits landed after the spec was marked `done`, extending the 4a (Consistent UI) work beyond the original 3-fix enumeration. Recorded here per the established 5.10b/5.10c/5.10d post-finalization-patch convention. `final_revision` set to `6f251e7`.

- `[low]` `[patch]` `26779c6` — "Standardize page-header markup across all pages." Extended the 4a heading-hierarchy fix from the 3 enumerated pages (HouseholdsListPage, FinanceReportsPage, DashboardPage) to ALL 65 pages under `src/pages/**` and `src/modules/*/pages/**`, collapsing 6+ ad-hoc combinations of heading tag (h1/h4/h5/div), size class (text-h4/text-h5/none), weight, and subtitle markup to one canonical pattern: `<h4 class="text-h5 q-my-none">{Title}</h4>` + `<p class="text-grey-7 q-mb-none">{Subtitle}</p>`. Also removed the one inline icon in a page title (FarmSettingsPage.vue's tune icon). This is a scope expansion of 4a (3 → 65 pages) but aligns with the spec's intent (consistency) and the dominant pattern the spec identified. No script/store/route/permission changes; lint and build pass. Section/card headings, dialog titles, and stat-card numbers untouched.
- `[low]` `[patch]` `6f251e7` — "fix: page margins." Adjusted page margins on 9 pages (FinanceReportsPage, FinanceTransactionsPage, FinanceSettingsPage, HelpPage, HouseholdDetailPage, HouseholdsListPage, ResidentDetailPage, ResidentsListPage, VillageSettingsPage) to align with the standardized header pattern from `26779c6`. No functional changes; lint and build pass.

## Design Notes

- **Rejected extraction:** no shared `ErrorBanner.vue`/`LoadingState.vue` component is introduced. `src/components/` has no existing error/loading component, and the fix set above touches ≤10 files per sub-AC with page-specific fetch functions to wire into a retry action — below the >8-page-with-_identical_ pattern bar that would justify extraction, and the retry target differs per page (different fetch function each time), so a shared component would need a prop-drilled callback anyway with little savings over the in-place fix.
- **`bg-info text-white` contrast (Never list item, not fixed here):** the audit found `$info` (`#31ccec`) against white text is ≈1.8:1, well under 4.5:1, and is the _dominant_ pattern for info banners across 10+ files. Unlike the bounded `bg-warning text-white` fix (6 outlier instances correctable by adopting the already-dominant `text-dark` elsewhere), fixing `bg-info` banners app-wide is a systemic, high-blast-radius visual change (every info banner in the app) that the workflow's design-decision guidance flags as requiring explicit user sign-off before changing. This is appended to `docs/implementation-artifacts/deferred-work.md` as a new deferred item owned by a future post-MVP theming pass (or a user-directed follow-up), not implemented in 5.10e1.
- **Button-variant "inconsistencies" rejected:** the initial audit flagged several `q-btn` variant differences (e.g. `outline` on "Browse Produce"/"Refresh" buttons, `flat color="white"` on banner action buttons) as inconsistent against a naive "dominant variant" count. On inspection these reflect a legitimate primary-vs-secondary-action semantic (primary Add/Create/Save = solid; secondary/navigational/refresh actions = `outline`/`flat`; banner action buttons = `flat` to sit on a colored banner background) rather than genuine inconsistency, so they are excluded from the 4a fix list to avoid pointless churn.
- **`q-page padding` vs `q-pa-md` rejected:** pages using the `padding` boolean prop on `<q-page>` (e.g. `InventoryListPage.vue`, `VendorsListPage.vue`) produce equivalent visual spacing to pages using an inner `<div class="q-pa-md">`; both are valid, already-idiomatic Quasar approaches, so no fix is applied for this.

## Verification

**Commands:**

- `npm run lint` -- expected: no new lint errors introduced by the edits above.
- `npm run build` -- expected: production build succeeds (SSR-safe, no new Appwrite/window/document calls at module scope).

**Manual checks (if no CLI):**

- Load each of the 9 pages in the 4b fix list on a throttled connection (DevTools "Slow 3G") and confirm a loading indicator appears before data renders.
- Trigger each of the 10 CUD actions in the 4d fix list and confirm a single bottom-position `positive` toast appears with a verb-first message.
- Tab through `HouseholdsListPage`/`ResidentsListPage`/`PlotsListPage` action columns with a keyboard and confirm each icon button announces its specific label (via browser accessibility inspector or screen reader).
- Open the header quick-search, type 2+ characters, press `ArrowDown`/`ArrowUp`/`Enter`/`Escape`, and confirm keyboard selection works while the input never loses focus mid-typing.
- Resize to mobile width on a page using `Breadcrumbs.vue` and confirm the back button's accessible name includes the destination.

## Auto Run Result

**Summary:** Implemented the full 4a-4f + deferred-work-bookkeeping fix set from Tasks & Acceptance: 3 heading-hierarchy fixes, 9 loading-state additions (CalendarPage.vue needed no change — its existing guard already covers the fetch window), 8 error-handling standardizations, 10 success-notification standardizations, 17 accessibility fixes (icon-only aria-labels, notification-badge live region, bounded `bg-warning` contrast fix), and the 2 deferred 5.10b a11y fixes (Breadcrumbs back-button aria-label, quick-search keyboard navigation). Appended a `deferred-work.md` entry flagging the systemic `bg-info text-white` contrast issue for a future user-directed pass, and marked the two 5.10b-deferred a11y items resolved.

**Files changed** (36 files, one-line description each):

- `docs/implementation-artifacts/deferred-work.md` — appended the `bg-info` contrast deferral + 5.10b-deferred-items-resolved entries (patched once for a formatting typo, see Review Triage Log).
- `src/components/layout/Breadcrumbs.vue` — destination-specific `backAriaLabel` computed, replacing the generic hardcoded label.
- `src/components/residents/ResidentForm.vue` — `bg-warning text-white` → `text-dark` contrast fix.
- `src/composables/useDashboardData.js` — added non-blocking `notifyError` to 10 isolated per-module catch blocks.
- `src/layouts/MainLayout.vue` — quick-search keyboard nav (`highlightedIndex`, `flattenedResults`, `@keydown`), notification-badge live region, logout success standardized, realtime-subscribe-failure notified once.
- `src/modules/farm/components/PlotProfitabilityCard.vue`, `RecentSalesWidget.vue`, `TopCropsWidget.vue` — refresh button `aria-label="Refresh"`.
- `src/modules/farm/pages/CreatePlantingPage.vue` — error/success standardized to `useErrorHandler`.
- `src/modules/farm/pages/CropFormPage.vue` — success standardized to `notifySuccess`.
- `src/modules/farm/pages/CropsListPage.vue`, `PlantingsListPage.vue`, `SalesListPage.vue`, `FarmDashboardPage.vue` — added loading-state coverage for `onMounted` fetches.
- `src/modules/farm/pages/PlantingDetailPage.vue` — 2 success notifications standardized.
- `src/modules/farm/pages/PlotFormPage.vue`, `PlotsListPage.vue` — success notifications standardized; `PlotsListPage.vue` also got 3 icon-only aria-labels.
- `src/modules/farm/stores/farm-store.js` — added `notifyError` to 6 catch blocks.
- `src/modules/finance/pages/FinanceDashboardPage.vue` — export success standardized.
- `src/modules/finance/pages/FinanceReportsPage.vue` — heading hierarchy fix.
- `src/modules/finance/pages/FinanceTransactionsPage.vue` — funding-added success standardized; inventory-link button aria-label.
- `src/modules/lending/pages/AllLoansPage.vue` — loading-state coverage added.
- `src/modules/lending/stores/lendingStore.js` — de-duplicated redundant `console.error`.
- `src/modules/school/pages/BellSchedulesSettingsPage.vue`, `RecordScoresPage.vue` — contrast fix.
- `src/modules/school/pages/ClassesListPage.vue` — loading-state coverage widened.
- `src/modules/school/pages/LearnersListPage.vue` — 2 icon-only aria-labels.
- `src/modules/school/pages/LongTermGoalsSettingsPage.vue` — back-button aria-label.
- `src/modules/vendors/pages/VendorsListPage.vue` — loading-state coverage added.
- `src/pages/dashboard/DashboardPage.vue` — heading fix; non-blocking `notifyError` on guidance-count catch.
- `src/pages/help/HelpPage.vue` — 3 contrast fixes.
- `src/pages/households/HouseholdsListPage.vue`, `src/pages/residents/ResidentsListPage.vue` — heading fix (Households only) + 5 icon-only aria-labels each.
- `src/pages/inventory/InventoryDetailPage.vue`, `InventoryFormPage.vue` — success notifications standardized.
- `src/pages/inventory/InventoryListPage.vue` — loading-state coverage added.
- `src/pages/settings/VillageSettingsPage.vue` — 5 catch blocks standardized to `notifyError`; 2 success messages reformatted.
- `src/stores/notifications-store.js` — de-duplicated redundant `console.error`.

**Review findings breakdown:** 1 patch applied (medium severity — corrected a malformed `deferred-work.md` entry, `source*spec`/`\_dominant*` → `source_spec`/`dominant`), 1 deferred (medium — pre-existing `FarmDashboardPage.vue` clickable module-nav cards lack keyboard accessibility; not caused by this diff, out of the enumerated 4e scope), 19 rejected (all either already matched the spec's explicit instructions on re-inspection, were unreachable given existing data invariants — e.g. `groupedResults`/`flattenedResults` are always non-null, `unreadCount` is always a number, the module-level `useErrorHandler()` call matches the pre-existing dominant pattern already used in 18+ other Pinia stores — or exceeded the spec's deliberately capped scope). Verification Gap review found no gaps. Intent Alignment audit's two claimed divergences (CalendarPage.vue "omission", InventoryFormPage.vue error-path "inconsistency") were both checked against the actual code and spec text and found to be non-issues: `CalendarPage.vue`'s existing loading guard already satisfies the spec's conditional instruction, and `InventoryFormPage.vue`'s error path was never in the 4c enumeration.

**Follow-up review recommendation:** `false` — this pass's only patched finding was medium severity (score: 3×1 medium = 3, below the 5 threshold; no high-severity patch).

**Verification performed:** `npm run lint` (pass, before and after the patch), `npm run build` (pass — production SPA build succeeded, no new errors/warnings). Manual UI checks were not exercised in this pass (no automated test infrastructure exists in this repository per `package.json`'s placeholder `test` script — consistent with all prior Epic 5 stories); the spec's Verification section's manual checks (throttled-network loading states, keyboard nav on the 3 list pages, quick-search arrow-key/Enter/Escape behavior, mobile breadcrumb back-button label) are recommended for a human to spot-check post-merge.

**Residual risks:** No automated tests cover the new keyboard-nav logic or the standardized notification calls (matches the project's pre-existing no-test-infrastructure state, not a regression introduced here). The deferred `FarmDashboardPage.vue` keyboard-accessibility gap and the deferred systemic `bg-info text-white` contrast issue remain open for a future story/user decision.
