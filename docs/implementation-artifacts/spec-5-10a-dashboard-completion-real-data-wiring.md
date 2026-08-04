---
title: 'Story 5.10a: Dashboard Completion — Real Data Wiring and Widget Finalization'
type: feature
created: '2026-08-04'
status: done
review_loop_iteration: 0
baseline_revision: '84a43e569fd9f6a209581f600c39ff3fdce18f88'
final_revision: '6faacb02eea96b75ba1e0e552f092a821f87074f'
followup_review_recommended: false
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-11-start-fresh-production-setup-wizard.md'
  - '{project-root}/docs/implementation-artifacts/dashboard-widget-pattern.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** `DashboardPage.vue` still assigns placeholder data from `src/utils/placeholder-data.js` to `QuickStatsWidget` and `RecentActivityWidget`, so the main dashboard does not reflect real village data. Additionally, `QuickStatsWidget` currently exposes only one finance figure (balance), while Story 5.10 AC1 expects at least two finance-related stats.

**Approach:** Replace the placeholder assignments with parallel, permission-gated, real API calls using existing Pinia stores and direct `tables.listRows` queries. Add minimal new stat cards to `QuickStatsWidget` so it can show real income and expense totals alongside the existing balance card. Leave all other dashboard widgets untouched, but verify they already consume real data.

## Boundaries & Constraints

**Always:**

- Reuse only existing Appwrite tables (`households`, `residents`, `finance_transactions`, `harvests`, `farm_sales`, `learners`, `village_events`, `village_settings`) and existing Pinia stores/services.
- No new Appwrite tables, columns, server functions, permissions, `.env` variables, or routes.
- All `tables.listRows` calls run client-side only, inside `onMounted` or a composable `onMounted`, following the existing `isClient` SSR-safety pattern.
- Gate every module-specific QuickStats block and RecentActivity fetch with `hasPermission('<module>:read')` and, for optional modules, `settingsStore.*Enabled`.
- Use `Promise.all` for independent fetches; do not serialize counts, summary, and activity fetches.
- Keep hardcoded English strings only; no emojis; no `vue-i18n`.
- Do not delete `src/utils/placeholder-data.js`; only remove its imports from `DashboardPage.vue`.

**Block If:**

- A required third-party dependency would need to be added.
- An existing store lacks a needed read method and adding it would require a new store rather than a method on the existing store.

**Never:**

- Implement navigation polish, notifications, help/docs, UX polish, performance/mobile audit, or system health monitoring (those are 5.10b–5.10e / post-MVP).
- Add Guests, Equipment, or Energy module data or toggles.
- Modify dashboard widgets other than `QuickStatsWidget` and `DashboardPage.vue` (unless a widget is found to still use hardcoded/placeholder data, in which case wire it in this story).

## I/O & Edge-Case Matrix

| Scenario                                                | Input / State                                       | Expected Output / Behavior                                                                                                                         | Error Handling    |
| ------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Admin loads dashboard                                   | All permissions, all modules enabled                | QuickStats shows real households, residents, income, expenses, balance; RecentActivity shows up to 8 real items across all modules                 | No error expected |
| Resident loads dashboard                                | No `finance:read`, no `farm:read`, no `school:read` | QuickStats shows households and residents only; RecentActivity shows households, residents, and calendar events only                               | No error expected |
| Finance manager loads dashboard                         | `finance:read` only                                 | QuickStats shows households, residents, income, expenses, balance; RecentActivity includes finance transactions plus households/residents/calendar | No error expected |
| Empty village (no records)                              | All permissions, no rows in any table               | QuickStats shows 0 for all counts and 0.00 for finance; RecentActivity shows empty state                                                           | No error expected |
| One fetch fails (e.g., farm harvests permission denied) | Network or permission error on a single query       | Other fetches still resolve; failed module contributes no stats/activity; widgets show empty/loading state, page does not crash                    | Logged to console |
| SSR render                                              | Server-side execution                               | No Appwrite calls made; widgets render loading/empty states until hydration                                                                        | No error expected |

</intent-contract>

## Code Map

- `src/pages/dashboard/DashboardPage.vue` -- Remove placeholder imports; replace the two placeholder assignments with calls to `useDashboardData()` composable.
- `src/composables/useDashboardData.js` (NEW) -- Returns `{ quickStats, recentActivity, loading, error, load }`. Fetches real counts, finance summary, and recent activity inside an `onMounted` hook with isolated try/catch per module.
- `src/components/dashboard/QuickStatsWidget.vue` -- Add "Total Income" and "Total Expenses" stat cards gated on `stats.finance`; keep the existing "Balance" card.
- `src/components/dashboard/RecentActivityWidget.vue` -- Unchanged; receives real activity array.
- `src/utils/placeholder-data.js` -- Kept unchanged (other pages may still import it).
- `docs/implementation-artifacts/deferred-work.md` -- Append note that Story 5.10 AC8 (System Health Monitoring) is deferred to post-MVP.

## Tasks & Acceptance

**Execution:**

- [x] `src/composables/useDashboardData.js` -- Create the composable.
  - Import `ref`, `onMounted` from `vue`; `Query` from `appwrite`; `tables` from `src/boot/appwrite`; `useAuthStore`, `useSettingsStore`; `useFinanceStore`; `usePermissions`.
  - Export `useDashboardData()` returning `{ quickStats, recentActivity, loading, error, load }`.
  - `onMounted`: set `loading.value = true`, wait 300 ms for hydration safety, then `await Promise.all([fetchQuickStats(), fetchRecentActivity()])`, each wrapped in its own try/catch so one failure does not block the other. Set `loading.value = false`.
  - `fetchQuickStats()`:
    - Household count: `tables.listRows({ databaseId, tableId: import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS, queries: [Query.limit(1)] })`; use `.total`.
    - Resident count: same pattern with `VITE_APPWRITE_TABLE_RESIDENTS`.
    - If `hasPermission('finance:read')`, call `financeStore.fetchSummary()` and map `totalIncome`, `totalExpenses`, `netBalance` into `quickStats.value.finance = { monthlyIncome: totalIncome, monthlyExpenses: totalExpenses, balance: netBalance, currency: settingsStore.defaultCurrency, trend: 'flat', change: '—' }`.
    - Set `quickStats.value.households` and `quickStats.value.residents` objects with `total`, `trend: 'flat'`, `change: '—'`.
  - `fetchRecentActivity()`:
    - For each permitted module, run an independent `tables.listRows` with `Query.orderDesc('$createdAt')` and `Query.limit(3)`, map rows to `{ id, type, icon, color, timestamp, module, title, description, user }`, and collect into a single array.
    - Gate each module: households (`households:read`), residents (`residents:read`), finance (`finance:read`), farm harvests + farm sales (`farm:read` AND `settingsStore.farmEnabled`), school learners (`school:read` AND `settingsStore.schoolEnabled`), calendar events (all authenticated users, no permission gate).
    - Merge all activity arrays, sort by `timestamp` descending, slice to 8, assign to `recentActivity.value`.
- [x] `src/pages/dashboard/DashboardPage.vue` -- Wire the composable.
  - Remove imports of `quickStats as placeholderStats` and `recentActivity as placeholderActivity` from `src/utils/placeholder-data`.
  - Import `useDashboardData` from `src/composables/useDashboardData`.
  - Replace `const quickStats = ref(null); const recentActivity = ref([]);` with `const dashboard = useDashboardData();`.
  - Bind widgets: `:stats="dashboard.quickStats"`, `:activities="dashboard.recentActivity"`, `:loading="dashboard.loading"`.
  - Keep the 5.11 empty-state guidance count logic and the existing `calendarStore.fetchAllEvents()` call unchanged.
- [x] `src/components/dashboard/QuickStatsWidget.vue` -- Extend finance display.
  - Inside the existing `v-if="stats.finance"` block, add two new stat-card columns for "Total Income" (`formatCurrency(stats.finance.monthlyIncome, stats.finance.currency)`) and "Total Expenses" (`formatCurrency(stats.finance.monthlyExpenses, stats.finance.currency)`), with `trending_up`/`positive` and `trending_down`/`negative` icons respectively.
  - Keep the existing "Balance" card; change its label from "Monthly Balance" to "Balance" so the all-time figure from `financeStore.fetchSummary` is not mislabeled.
  - Use the existing `stat-card` markup, `formatCurrency`, and trend helpers.
- [x] Verify existing widgets consume real data -- Confirm `CommunityOverviewWidget.vue`, `HouseholdsWidget.vue`, `FinanceSummaryWidget.vue`, `VendorsSummaryWidget.vue`, and `UpcomingEventsWidget.vue` already call real stores/APIs and contain no hardcoded placeholder data. If any placeholder data is found, wire it to an existing store method in this story.
- [x] `docs/implementation-artifacts/deferred-work.md` -- Append a new entry under a heading "Deferred from: Story 5.10a planning (2026-08-04)" stating that AC8 (System Health Monitoring) is deferred to post-MVP; admin page showing DB size, storage usage, active users, and error logs requires a new server function and is out of MVP scope.

**Acceptance Criteria:**

- **Given** an authenticated user loads the dashboard, **when** data fetches complete, **then** `QuickStatsWidget` displays real household count, real resident count, and (for users with `finance:read`) real total income, total expenses, and balance.
- **Given** a user without `finance:read`, **when** the dashboard loads, **then** `QuickStatsWidget` does not display any finance stat cards.
- **Given** a user without `farm:read` or with the Farm module disabled, **when** the dashboard loads, **then** no farm-specific stats or recent activity are shown.
- **Given** recent records exist in any permitted module, **when** the dashboard loads, **then** `RecentActivityWidget` displays up to 8 real items, each with a title, description, timestamp, module icon, and module label.
- **Given** any single dashboard data fetch fails, **when** the dashboard loads, **then** the page does not crash, the failure is logged, and the affected widget shows its loading or empty state while other widgets render normally.
- **Given** the dashboard renders server-side, **when** HTML is generated, **then** no Appwrite `tables.listRows` calls are executed and no client-only data leaks into the SSR output.
- **Given** a normal network connection, **when** the dashboard loads, **then** time from mount to rendered data is under 2 seconds because independent fetches run in parallel.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 during review loops. -->

### 2026-08-04 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 6 (medium 1, low 5)
- defer: 0
- reject: 0
- addressed_findings:
  - [medium] [patch] Removed redundant 300ms page-level hydration delay in `src/pages/dashboard/DashboardPage.vue` so the dashboard does not wait twice for hydration.
  - [low] [patch] Added defensive `(response.rows || [])` guards in all RecentActivity fetchers to prevent crashes if Appwrite returns a response without a `rows` array.
  - [low] [patch] Converted activity timestamps to `Date` objects with an epoch fallback and added an `id`-based secondary sort key for deterministic ordering when timestamps tie.
  - [low] [patch] Added a fallback for finance transaction type so non-income rows are always treated as expenses (avoids undefined icon/color/title).
  - [low] [patch] Added default values (`0`) when destructuring `financeStore.summary` totals.
  - [low] [patch] Renamed QuickStats finance keys from `monthlyIncome`/`monthlyExpenses` to `totalIncome`/`totalExpenses` and updated `QuickStatsWidget.vue` to match the actual all-time totals returned by `financeStore.fetchSummary()`.

## Design Notes

- **Count strategy:** Household and resident counts use `Query.limit(1)` + `.total` to avoid fetching large record sets, matching the 5.11 empty-state guidance pattern in `DashboardPage.vue`.
- **Finance totals:** `financeStore.fetchSummary()` already fetches completed transactions and computes `totalIncome`, `totalExpenses`, and `netBalance`. Reusing it avoids writing a new aggregation or server function. The returned totals are all-time; the QuickStats labels are updated to "Total Income", "Total Expenses", and "Balance" to match.
- **Recent activity strategy:** Direct `tables.listRows` per module is used because most stores do not expose a "most recent N unfiltered" method. Each module fetch is capped at 3 rows; results are merged, sorted by `$createdAt`, and sliced to 8. Descriptions are kept simple (e.g., amounts, quantities) so no extra relation lookups are required.
- **SSR safety:** The composable performs all API work inside `onMounted`, which only executes on the client during SSR hydration. The page-level `isClient` ref remains available for template gating but is not used to guard the composable itself.
- **Failure isolation:** Each module fetch is wrapped so a single failing query cannot reject the whole `Promise.all`. Failed modules simply contribute no data.

## Verification

**Commands:**

- `npm run lint` -- expected: no new ESLint errors in `src/pages/dashboard/DashboardPage.vue`, `src/composables/useDashboardData.js`, or `src/components/dashboard/QuickStatsWidget.vue`.
- `npm run build` -- expected: build completes without errors (SSR build will not execute Appwrite calls because they are inside `onMounted`).

**Manual checks:**

- Open the dashboard as System Administrator: QuickStats shows households, residents, income, expenses, balance; RecentActivity shows items from finance, farm, school, calendar, households, and residents.
- Open the dashboard as a Resident role: QuickStats shows households and residents only; RecentActivity shows households, residents, and calendar events only.
- Throttle network to "Fast 3G" in DevTools and reload: time from mount to visible data should remain under 2 seconds.
- Check that `src/utils/placeholder-data.js` still exists and is not imported by `DashboardPage.vue`.

## Auto Run Result

- **Status:** done
- **Summary:** Replaced placeholder dashboard data with real, permission-gated Appwrite fetches. Added a `useDashboardData` composable that loads household/resident counts, finance totals, and recent activity from existing tables/stores. Extended `QuickStatsWidget` to show separate Total Income and Total Expense cards. Verified existing dashboard widgets already consume real data; left them unchanged. Documented the AC8 System Health Monitoring deferral.
- **Files changed:**
  - `src/composables/useDashboardData.js` (new) — dashboard data fetching composable.
  - `src/pages/dashboard/DashboardPage.vue` — wires composable, removes placeholder imports.
  - `src/components/dashboard/QuickStatsWidget.vue` — adds Total Income/Total Expense cards.
  - `docs/implementation-artifacts/deferred-work.md` — defers 5.10 AC8 to post-MVP.
  - `docs/implementation-artifacts/spec-5-10a-dashboard-completion-real-data-wiring.md` — this spec.
- **Review findings:** 6 patches applied (all low/medium consequence); no intent gaps or bad-spec issues.
- **Verification performed:** `npm run lint` passed; `npm run build` succeeded.
- **Next iteration target:** 5.10b Navigation Polish — Breadcrumbs and Quick Search.
