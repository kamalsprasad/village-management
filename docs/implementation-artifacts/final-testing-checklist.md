# Final Testing Checklist — MVP Sign-Off (Story 5.10 AC9)

Manual QA checklist for closing Story 5.10 AC9. This is the authoritative, sole
final-testing checklist for the MVP. It supersedes `docs/testing.md` (which
covered only Stories 1.4 and 1.8 as early-epic planning artifacts) for
system-wide MVP sign-off purposes; `docs/testing.md` is left unmodified and
may still be useful as historical/detailed reference for those two stories.

Every item below is a manual verification step (`- [ ]`) to be performed by a
human tester against a running instance of the app. No automated test
infrastructure exists in this repository (see §9i) — this document is how
Epic 5 is signed off for MVP release.

**Scope boundary:** This checklist covers only shipped MVP functionality.
It intentionally excludes: Guests (Story 5.5), Equipment (Story 5.6), Energy
(Story 5.8), School stories 4.9–4.11 (peer review, self/head-teacher
evaluation, collaborative teaching practices) — all deferred to post-MVP —
and Story 5.10 AC8 (System Health Monitoring), also deferred (see §9h).

---

## Table of Contents

- [9a. MVP User Journeys by Module](#9a-mvp-user-journeys-by-module)
  - [Households & Residents](#households--residents)
  - [Finance](#finance)
  - [Lending](#lending)
  - [Inventory](#inventory)
  - [Farm](#farm-optional-module)
  - [School](#school-optional-module)
  - [Vendors](#vendors-optional-module)
  - [Village Calendar](#village-calendar)
  - [Cloud Storage](#cloud-storage)
  - [Dashboard](#dashboard)
  - [Navigation, Search, Breadcrumbs](#navigation-search-breadcrumbs)
  - [Notifications](#notifications)
  - [Help & Documentation](#help--documentation)
  - [Village Settings](#village-settings)
  - [Module Management](#module-management)
  - [User Management](#user-management)
  - [Roles & Permissions](#roles--permissions)
  - [Authentication](#authentication)
  - [Profile](#profile)
  - [Start Fresh Production Setup Wizard](#start-fresh-production-setup-wizard)
- [9b. RBAC Matrix](#9b-rbac-matrix)
- [9c. Data-Integrity Invariants](#9c-data-integrity-invariants)
- [9d. Integrations Smoke Tests](#9d-integrations-smoke-tests)
- [9e. Sample-Data Lifecycle](#9e-sample-data-lifecycle)
- [9f. Mobile Responsiveness (320px)](#9f-mobile-responsiveness-320px)
- [9g. Performance (3G / Lazy Loading / Caching)](#9g-performance-3g--lazy-loading--caching)
- [9h. AC8 Deferral — System Health Monitoring (expanded)](#9h-ac8-deferral--system-health-monitoring-expanded)
- [9i. Post-MVP Automated Testing Epic](#9i-post-mvp-automated-testing-epic)

---

## 9a. MVP User Journeys by Module

Journeys are derived from `src/router/routes.js`, `src/modules/*/router.js`,
and the page files under `src/pages/` and `src/modules/*/pages/`. Each
journey lists the primary role(s) to test with, key steps, and expected
result.

### Households & Residents

Routes: `/households`, `/households/:id` (`src/router/routes.js:89-105`);
`/residents`, `/residents/:id` (`:106-122`). Permissions: `households:read`/
`write`, `residents:read`/`write`.

- [ ] **List households** — As Village Head (`households:read`), open `/households`. Table loads with real data; pagination works.
- [ ] **Create household** — As System Administrator, click "Add Household" (`src/pages/households/HouseholdsListPage.vue`), fill required `name` + type, save. New row appears in the list.
- [ ] **View household detail** — Click a household row; `/households/:id` shows breadcrumb "Households / `<name>`" and occupant residents list.
- [ ] **Edit household** — Edit the household's fields from the detail page; changes persist and reflect in the list.
- [ ] **Delete household with occupants blocked** — Attempt to delete a household that has residents; verify the delete is rejected with the message "Cannot delete household. It has N occupant(s). Please reassign or remove residents first." (`src/stores/households-store.js:302-306`).
- [ ] **Delete empty household** — Delete a household with zero residents; it is removed from the list.
- [ ] **List residents** — As a role with `residents:read`, open `/residents`; table loads with household names resolved.
- [ ] **Create resident** — Add a resident linked to an existing household; new resident appears under that household on the household detail page.
- [ ] **View/edit resident detail** — Open `/residents/:id` (breadcrumb "Residents / `<name>`"), edit fields, save, confirm persistence.
- [ ] **Search households/residents via quick search** — Use the header search box (§ Navigation) to find a resident by name and jump to their detail page.

### Finance

Routes: `/finance` → redirect `/finance/dashboard`, `/finance/transactions`,
`/finance/funding/:id`, `/finance/reports` (`src/modules/finance/router.js`).
Permission: `finance:read`/`write`; core module (always visible).

- [ ] **Finance dashboard** — As Finance Manager, open `/finance/dashboard`; income/expense/balance widgets and charts render with real totals.
- [ ] **Record income transaction** — On `/finance/transactions`, click "Record Income", fill category/amount/funding source, save; transaction appears in the table and dashboard totals update.
- [ ] **Record expense transaction** — Click "Record Expense", optionally tag as an inventory purchase; confirm a matching `inventory` row is auto-created (see §9c invariant "Finance expense → Inventory auto-creation").
- [ ] **Vendor dropdown integration** — When recording an expense, select a vendor from the Vendor picker; the transaction links to that vendor and appears in the vendor's transaction history (`/vendors/:id`).
- [ ] **Funding source detail** — Navigate to a funding source via `/finance/funding/:id` (breadcrumb "Finance / `<name>`"); allocated/spent totals are correct.
- [ ] **Financial reports** — Open `/finance/reports`, generate a report (e.g. Income vs Expense); chart renders (verifies the lazy-loaded chart.js chunk, see §9g).
- [ ] **Empty-state** — On a freshly-wiped village with zero transactions, `/finance/transactions` shows the "No transactions recorded" banner with a "Record Income/Expense" CTA gated on `finance:write` (`src/modules/finance/pages/FinanceTransactionsPage.vue`, added in Story 5.11).
- [ ] **RBAC** — As a role without `finance:read` (e.g. Learner), confirm Finance nav items are hidden and `/finance/dashboard` redirects to `/unauthorized`.

### Lending

Route: `/lending` (index → `AllLoansPage`), `/lending/create`, `/lending/:id`,
`/lending/reports` (`src/modules/lending/router.js`). Permission:
`lending:read`/`write`; gated by `requiresSetting: 'lendingEnabled'`.

- [ ] **Toggle lending on** — As System Administrator, enable "Lending" via `VillageSettingsPage.vue` (`lending_enabled`); `/lending` becomes reachable.
- [ ] **Create loan** — `/lending/create` (breadcrumb "Lending"); fill borrower/amount/terms, save; loan appears in `/lending` list and a repayment schedule is generated.
- [ ] **Loan detail & repayment** — Open `/lending/:id` (breadcrumb "Lending"); record a repayment; loan balance/repayment schedule updates.
- [ ] **Lending disabled** — Turn `lending_enabled` off; confirm `/lending` redirects away and the nav item disappears.

### Inventory

Routes: `/inventory`, `/inventory/add`, `/inventory/:id`, `/inventory/:id/edit`
(`src/router/routes.js:158-192`). Permission: `inventory:read`/`write`; core
module.

- [ ] **List inventory** — Open `/inventory`; items show current quantity, unit, source.
- [ ] **Manual add** — Click "Add Inventory Item" (tooltip: "Add a new inventory item to track stock."), create an item, confirm it appears in the list.
- [ ] **Auto-created from Finance** — Tag a Finance expense as an "Equipment"/inventory-eligible category and confirm a matching inventory row appears with `source: finance` (or equivalent) linkage.
- [ ] **Auto-created from Farm harvest** — Complete a harvest on a planting and confirm a farm-produce inventory row is created/updated (§9c).
- [ ] **Stock adjustment** — Adjust stock up/down on an item; quantity updates and the change is reflected on the detail page.
- [ ] **Detail/edit breadcrumbs** — `/inventory/:id` and `/inventory/:id/edit` both show breadcrumb "Inventory".
- [ ] **Farm sale decrements stock** — Record a Farm sale against a farm-produce inventory item; confirm quantity decreases by the sold amount and cannot go negative (§9c).
- [ ] **Empty-state** — On a wiped village, verify the earlier household/resident empty-state ordering doesn't block Inventory usage (inventory has no ordering dependency).

### Farm (optional module)

Routes under `src/modules/farm/router.js`: dashboard, plots (list/add/detail/
edit), crops (list/add/detail/edit), plantings (list/detail/create/edit),
harvests list, sales (list/detail), reports, alerts, settings. Permission:
`farm:read`/`write`/`admin`/`planting:write`; gated by `requiresSetting:
'farmEnabled'`.

- [ ] **Module enabled precondition** — Confirm Farm nav section only appears when `farmEnabled` is true (Module Management); `farm/*` routes redirect otherwise.
- [ ] **Farm dashboard** — `/farm/dashboard`; module-navigation cards, alerts widget, profitability card all render with real data.
- [ ] **Keyboard navigation on dashboard cards** — Tab to a module card on `/farm/dashboard`; press Enter or Space; confirm navigation occurs and a visible focus outline is shown (`src/modules/farm/pages/FarmDashboardPage.vue`, fixed in 5.10e3).
- [ ] **Plot CRUD** — Add a plot (`/farm/plots/add`), view/edit it (`/farm/plots/:id`, `/farm/plots/:id/edit`); breadcrumbs read "Farm / Plots / `<name>`".
- [ ] **Crop database CRUD** — Add/view/edit a crop (`farm:admin` required for add/edit); breadcrumb "Farm / Crop Database".
- [ ] **Create planting** — From a plot detail page, create a planting (`/farm/plots/:id/plantings/new`); it appears on `/farm/plantings`.
- [ ] **Planting lifecycle** — Edit a planting's status through its lifecycle stages (`/farm/plantings/:id/edit`); confirm status transitions are respected and reflected on the detail page.
- [ ] **Record harvest** — From a planting detail page, record a harvest entry (single-day or multi-day/continuous-picking for perennial crops); confirm the harvest and its entries save and inventory updates.
- [ ] **Record sale** — From `RecordSaleDialog.vue`, sell farm-produce inventory to a vendor or external buyer; confirm inventory decrements, a Finance income transaction is created, and a `farm_sales` row links both (§9c). Test the dialog at 320px (§9f).
- [ ] **Sale detail** — `/farm/sales/:id` shows the linked finance transaction and inventory item; breadcrumb "Farm / Farm Sales".
- [ ] **Profitability & yield reports** — `/farm/reports`; ROI/profitability and yield-trend charts render (lazy-loaded chart.js).
- [ ] **Farm alerts** — `/farm/alerts`; upcoming/overdue harvest, low-inventory, underperforming-yield, and crop-failure alerts render; confirm a notification is created for a Farm-role user the first time a given alert fires, and NOT duplicated on a second visit in the same session (§9c, §Notifications).
- [ ] **Farm settings** — `/farm/settings` (`farm:write`); adjust configurable thresholds/yield unit; changes persist.
- [ ] **RBAC** — As Crop Manager (`farm:planting:write`, no `farm:write`), confirm plot create/edit is blocked but planting actions work.

### School (optional module)

Routes under `src/modules/school/router.js`: dashboard, learners (list/
enroll/detail/edit), classes (list/detail/record-scores/performance),
teachers, calendar, at-risk learners, interventions (list/create/detail/
edit), settings hub + sub-pages (terms, calendar events, bell schedules,
timetable templates, long-term goals), educational goals. Permission:
`school:read`/`write`/`admin`; gated by `requiresSetting: 'schoolEnabled'`.

- [ ] **Module enabled precondition** — Confirm School nav only appears when `schoolEnabled` is true.
- [ ] **School dashboard** — `/school/dashboard`; at-risk widget, my-interventions widget, progress-to-goal widget render.
- [ ] **Enroll learner** — `/school/learners/enroll` (breadcrumb "School / Learners") enrolls a resident as a learner; appears on `/school/learners`.
- [ ] **Learner detail/edit** — `/school/learners/:id`, `/school/learners/:id/edit`; edit grade/class; changes persist.
- [ ] **Record test scores** — `/school/classes/:id/record` bulk-enters scores for a grade; scores appear on `/school/classes/:id` and `/school/classes/:id/performance`.
- [ ] **Record attendance** — Bulk-enter attendance for a class; confirm at-risk computation reacts (see below).
- [ ] **At-risk identification** — Set a learner's attendance below 90% (`AT_RISK_THRESHOLDS.ATTENDANCE`, `src/modules/school/utils/at-risk-utils.js:22-25`) or a subject score below 50%, or overall average below 60%; confirm they appear on `/school/at-risk-learners` with the correct severity, and a notification fires once (dedup verified on repeat, §9c/Notifications).
- [ ] **Create intervention** — From an at-risk learner, create an intervention (`/school/interventions/create`, breadcrumb "School / Interventions"); log progress notes; view on `/school/interventions/:id`.
- [ ] **School calendar** — `/school/calendar`; class schedules/terms render using bell-schedule and timetable data.
- [ ] **Academic terms / calendar events / bell schedules / timetable templates settings** — Each settings sub-page (`school:admin`) allows configuring terms, holiday events, bell schedule slots, and timetable templates; changes propagate to `SchoolCalendarPage.vue` and `ClassDetailPage.vue`.
- [ ] **Educational goals** — `/school/educational-goals` shows progress toward the 90%-in-90th-percentile long-term goal; `/school/settings/long-term-goals` (`school:admin`) lets an admin adjust the benchmark threshold.
- [ ] **Learner progress report export** — From `LearnerDetailPage.vue`/`LearnersListPage.vue`, export a PDF progress report (single and bulk); confirm PDF downloads (JSZip/jsPDF integration, §9d).
- [ ] **RBAC** — As Teacher (`school:read`/`write`, no `school:admin`), confirm settings sub-pages are blocked but learner/attendance/score entry works.

### Vendors (optional module)

Routes: `/vendors`, `/vendors/add`, `/vendors/:id`, `/vendors/:id/edit`
(`src/modules/vendors/router.js`). Permission: `vendors:read`/`write`; gated
by `requiresSetting: 'vendorsEnabled'`.

- [ ] **Module enabled precondition** — Confirm Vendors nav only appears when `vendorsEnabled` is true.
- [ ] **Add vendor** — `/vendors/add` (tooltip: "Register a new supplier or buyer."); create a vendor marked Supplier, Buyer, or Both; confirm a `vendor_created` notification is delivered to Finance Manager/farm roles (§Notifications).
- [ ] **Vendor detail & transaction history** — `/vendors/:id`; confirm linked Finance expenses and Farm sales both appear in the vendor's transaction history with correct running totals.
- [ ] **Vendor picker integration — Farm sale** — When recording a Farm sale, select the vendor as buyer; confirm it appears on the vendor's history.
- [ ] **Vendor picker integration — Finance expense** — When recording a Finance expense, select the vendor as payee; confirm it appears on the vendor's history.
- [ ] **Edit vendor** — `/vendors/:id/edit`; update vendor type/contact info; changes persist.
- [ ] **Dashboard widget** — Confirm the Vendors summary widget on the main dashboard shows real vendor counts/recent activity.

### Village Calendar

Route: `/calendar` (`src/modules/calendar/router.js`). Core module,
`requiresAuth` only (no permission gate for viewing).

- [ ] **View calendar** — Any authenticated user opens `/calendar`; month/week/day/agenda views all render.
- [ ] **Category filtering** — Toggle category checkboxes (School, Farm, Village, Guests, Equipment, Energy, Other) with Show All/Hide All; filtered events update. Confirm Guests/Equipment/Energy remain selectable as color-coded labels only (no data behind them, per MVP scope).
- [ ] **Create event (role-scoped)** — As Events Coordinator or System Administrator, create an event in any category; as a Farm Manager/Head Teacher/Village Head (roles with `calendar:write`), create an event and confirm role-appropriate category restriction if applicable.
- [ ] **Edit/delete own event** — Edit and delete an event you created; a delete confirmation dialog appears.
- [ ] **System-generated events** — Confirm upcoming Farm harvest events appear on the calendar automatically with a "System Generated" badge and are not user-deletable in the same way as manual events.
- [ ] **RBAC** — As a role without `calendar:write` (e.g. Learner), confirm event creation controls are hidden but the calendar itself is still viewable.

### Cloud Storage

Routes: `/storage`, `/storage/shared` (`src/modules/storage/router.js`).
Core module. Permission: `storage:read`; per-shared-folder gates
(`storage:finance:read`, etc.).

- [ ] **Personal files — upload** — Drag-and-drop a file on `/storage`; upload progress shows; file appears in "My Files" with correct owner-only visibility.
- [ ] **Quota enforcement** — As a low-quota role (e.g. Learner, 1 GB; Guest tier 0.5 GB fallback), attempt to exceed quota; upload is blocked with a clear quota-exceeded error; the usage bar shows a warning above 90%.
- [ ] **Personal file privacy** — Confirm another user cannot see/download a different user's personal file (permissions set at upload time).
- [ ] **Shared folders — role-based access** — As Finance Manager, upload to the Finance shared folder; as a role with only `storage:finance:read`, confirm read-only access (no upload/delete).
- [ ] **Village Documents / Admin Only folders** — Confirm Admin Only is restricted to System Administrator; Village Documents is writable by roles with `storage:village-docs:write` (Council Member, Village Head, Deputy Village Head).
- [ ] **Storage settings (admin)** — `/admin/storage`; System Administrator views all users' usage, adjusts an individual quota override (tooltip: "Override this user's storage quota in GB..."), and runs a storage usage report.
- [ ] **Rename/move/delete** — Rename and delete a personal file; confirm usage totals update accordingly.

### Dashboard

Route: `/` (`src/router/routes.js:44-51`).

- [ ] **Real data widgets** — As System Administrator, confirm QuickStats shows real household/resident counts and (with `finance:read`) Total Income, Total Expenses, and Balance cards (`src/components/dashboard/QuickStatsWidget.vue`).
- [ ] **Permission-gated stats** — As a Resident role (no `finance:read`/`farm:read`/`school:read`), confirm QuickStats shows only households/residents, and Recent Activity shows only households/residents/calendar items.
- [ ] **Recent activity** — Confirm up to 8 real recent-activity items render across permitted modules with title/description/timestamp/module icon.
- [ ] **Module widgets** — Confirm `CommunityOverviewWidget`, `HouseholdsWidget`, `FinanceSummaryWidget`, `VendorsSummaryWidget`, `UpcomingEventsWidget`, `InventoryStockWidget` (chart), and Farm/School dashboard widgets (when those modules are enabled) all render real data.
- [ ] **Empty-state guidance** — On a freshly wiped village, confirm the dashboard shows "Start by adding your first household" (0 households) then "Add your first resident" (households > 0, residents = 0), in that order.
- [ ] **Single fetch failure isolation** — Simulate one module's fetch failing (e.g. temporarily revoke a permission mid-session); confirm other widgets still render and the page does not crash.

### Navigation, Search, Breadcrumbs

`src/layouts/MainLayout.vue`, `src/components/layout/Breadcrumbs.vue`,
`src/composables/useGlobalSearch.js`.

- [ ] **Auto-expand active nav section** — Deep-link directly to a detail page (e.g. `/farm/plots/abc123`); confirm the matching nav section (Agriculture) auto-expands and the correct sub-item highlights.
- [ ] **Breadcrumbs on desktop** — On a detail/form page, confirm the breadcrumb trail (e.g. "Farm / Plots / `<name>`") renders and each ancestor is a working link.
- [ ] **Breadcrumbs on mobile** — At `xs` width, confirm only a back arrow renders (no trail) and it navigates to the correct ancestor route.
- [ ] **No dead links** — Confirm no nav item targets `/communications` and no Guests/Equipment/Energy nav labels appear anywhere.
- [ ] **Quick search — permitted module** — Type a matching term (≥2 chars) for a module you have `:read` on (e.g. a plot name with `farm:read`); confirm a grouped result appears and navigates correctly.
- [ ] **Quick search — unpermitted module** — Type a term matching data in a module you lack `:read` for; confirm no group for that module renders.
- [ ] **Quick search — nav item match** — Type "vendor"; confirm a "Pages" group with the Vendors nav item appears (if `vendors:read` + module enabled).
- [ ] **Quick search — keyboard navigation** — With results open, use Arrow Up/Down to highlight results and Enter to navigate, Escape to close (added in 5.10e1).
- [ ] **Quick search — one module fails** — Confirm other groups still populate if one module's query fails (no crash, no visible error).

### Notifications

`src/layouts/MainLayout.vue` bell, `src/stores/notifications-store.js`,
`src/components/layout/NotificationPanel.vue`.

- [ ] **Bell badge** — Log in as a Farm/School/Finance role; confirm the bell shows an unread-count badge when applicable notifications exist.
- [ ] **At-risk learner trigger** — Flag a learner at-risk (see School journeys); confirm School Administrator/Head Teacher/Teacher accounts receive a notification, but a Learner-only account does not.
- [ ] **Farm alert trigger** — Trigger a farm alert (visit `/farm/alerts` with qualifying data); confirm Farm Manager/Crop Manager/Village Head/Deputy Village Head receive it.
- [ ] **Vendor-created trigger** — Create a vendor; confirm Finance Manager/Farm Manager/Crop Manager/Village Head/Deputy Village Head receive it.
- [ ] **Dedup** — Trigger the same farm alert or at-risk condition twice in the same session; confirm only one notification entry exists (no duplicate).
- [ ] **Mark as read / mark all read** — Click a notification to mark it read and navigate to its link; use "Mark all read"; confirm badge count updates correctly and a double-click on an already-read item is a no-op.
- [ ] **Realtime update** — With two browser sessions (or one + a manual trigger), confirm a new notification appears live without a manual refresh (realtime subscription), or within 30s via the polling fallback if realtime is unavailable.
- [ ] **Filter by type** — Use the notification panel's type filter to narrow to one notification type; confirm the list filters correctly and "All" restores the full list.
- [ ] **Mobile panel** — At `xs` width, confirm the bell opens a full-width dialog instead of a menu, and stays visible alongside the help icon and user avatar with no header overflow.

### Help & Documentation

Route: `/help` (`src/router/routes.js:139-145`).

- [ ] **Help menu** — Click the header help icon; on desktop a menu opens with User Guide / FAQ / About; on `xs` a dialog opens with the same three items.
- [ ] **User Guide** — Navigate to `/help`; confirm the Getting Started card plus all 11 module sections render.
- [ ] **Module-disabled note** — Disable Farm (or School/Vendors) via Module Management, revisit `/help`; confirm that section shows "This module is not enabled. Ask a System Administrator to enable it in Module Management." instead of instructions.
- [ ] **FAQ** — Navigate to `/help?tab=faq` (or click "FAQ" in the help menu); confirm all 5 categories and their Q&A entries render, and each `q-expansion-item` expands/collapses independently.
- [ ] **Tooltips** — Hover the 20 enumerated tooltip targets (bell, quick-search, 7 nav-section headers, 7 primary "Add"/"Record" buttons, 3 complex settings fields — see `spec-5-10d-help-and-documentation.md` Code Map) and confirm each shows its exact specified text.

### Village Settings

Route: `/settings/village` (`src/router/routes.js:123-131`). Permission:
`settings:read` (view, all users); `settings:write` (edit, admin only).

- [ ] **Read-only view** — As a non-admin role, confirm settings render read-only with no Edit button.
- [ ] **Edit as admin** — As System Administrator, edit village name/currency/timezone/council members; confirm the change reflects immediately in the header and dashboard.
- [ ] **Currency/timezone propagation** — Change currency symbol/timezone; confirm `formatCurrency`/`formatDateTime` output updates across Finance and other date-displaying pages.
- [ ] **Council member management** — Add, edit, and delete a council member with confirmation.

### Module Management

Route: `/admin/modules` (`src/router/routes.js:73-80`). Permission: `*`
(System Administrator only).

- [ ] **Toggle optional module off** — Disable Farm; confirm the Farm nav section disappears, `/farm/*` routes redirect, and dashboard Farm widgets disappear — but underlying Farm data is preserved (re-enable and confirm data is intact).
- [ ] **Dependency warning** — Attempt to disable Vendors while Farm (which depends on it, `src/utils/module-registry.js:97`) is enabled; confirm a dependency warning is shown.
- [ ] **Core modules immutable** — Confirm core modules (Residents, Households, Dashboard, Finance, Inventory, Calendar, Storage) have no disable control.

### User Management

Route: `/admin/users` (`src/router/routes.js:57-64`). Permission: `*`.

- [ ] **Add user** — Create a new user with name/email/password (≥8 chars)/role(s); confirm the Auth account, `users` row (`active=true`), and `village_administrators` team membership (only if System Administrator role assigned) are all created, and an audit log row is written.
- [ ] **Edit user** — Change a user's name/email/roles/linked resident; confirm Auth + `users` row + team membership all update.
- [ ] **Deactivate user** — Deactivate an active, non-self, non-last-admin user; confirm `active=false`, all sessions invalidated (they are logged out elsewhere), removed from admin team if applicable, and login is blocked with "Your account has been deactivated."
- [ ] **Self-deactivation blocked** — Attempt to deactivate your own account; confirm the button is disabled with tooltip "You cannot deactivate your own account" (`src/components/admin/DeactivateUserDialog.vue:116-118`), and a direct server call is also rejected.
- [ ] **Last-admin deactivation blocked** — Attempt to deactivate the only remaining active System Administrator; confirm it's blocked client-side (tooltip) and server-side ("Cannot deactivate the last System Administrator", `server/functions/User Management/src/main.js:401-409`).
- [ ] **Reactivate user** — Reactivate a deactivated user; confirm `active=true` and admin-team re-add if applicable, and they can log in again.
- [ ] **Status filter & search** — Filter the Users table by Active/Deactivated/All and search by name/email.
- [ ] **Admin password reset** — Use the admin-initiated "Reset Password" action in the edit dialog (accepted post-5.12 scope addition, see `deferred-work.md` "Deferred from: code review of spec-5-12" entry); confirm it works and writes a `user_password_reset` audit entry.

### Roles & Permissions

Route: `/admin/roles` (`src/router/routes.js:81-88`, added Story 5.13).
Permission: `*`.

- [ ] **Roles list** — Confirm all 13 seeded roles render with Name, Category, Permissions count, Storage Quota, Assigned Users count.
- [ ] **Expand permission matrix** — Expand a role row (e.g. Farm Manager); confirm its permissions render grouped by module (e.g. `farm:` → read, write).
- [ ] **Wildcard role** — Expand System Administrator; confirm it shows "All permissions (wildcard `*`)" rather than an empty/miscounted list.
- [ ] **Manage Roles dialog** — From `/admin/users`, click "Manage Roles" on a user; change their role selection, view the live "Effective Permissions" preview, and Save; confirm `updateUser` runs and the table refreshes.
- [ ] **Manage Roles — last-admin guard** — Attempt to remove the System Administrator role from the last admin via this dialog; confirm it is rejected with "Cannot remove the last System Administrator" (this dialog reuses `updateUser`, guarded since Story 5.11).
- [ ] **View Permissions dialog** — Click "View Permissions" on a user with no roles; confirm "No roles assigned" and an empty permission list; on a user with roles, confirm the correct grouped union renders.
- [ ] **Read-only enforcement** — Confirm there is no create/edit/delete-role control anywhere on `/admin/roles` (custom roles deferred to post-MVP).

### Authentication

Routes: `/auth`, `/auth/reset-password` (`src/router/routes.js:12-21`).

- [ ] **Login** — Valid credentials log in and land on `/` (or `/setup` on first run).
- [ ] **Invalid credentials** — Wrong password shows an inline error; no session created.
- [ ] **Deactivated-user login block** — Attempt login as a deactivated user; confirm rejection with "Your account has been deactivated. Please contact a System Administrator."
- [ ] **Change password** — From `/profile`, open Change Password, submit a correct current password + valid new password; confirm success and the session remains valid (no forced re-login).
- [ ] **Change password — wrong current password** — Confirm an inline/API error and the dialog stays open.
- [ ] **Forgot password** — From the login form, click "Forgot password?", submit an email; confirm a generic success message (does not reveal account existence) and (with real SMTP/Appwrite recovery configured) an email arrives.
- [ ] **Reset password — valid link** — Follow `/auth/reset-password?userId=...&secret=...`, submit a new password; confirm success and redirect to `/auth`.
- [ ] **Reset password — missing/invalid token** — Visit `/auth/reset-password` with no query params; confirm a clear "invalid or expired" banner instead of a broken form.
- [ ] **Route guards** — Unauthenticated access to `/` redirects to `/auth`; non-admin access to `/admin/users`/`/admin/roles`/`/admin/modules`/`/admin/storage` redirects to `/unauthorized`.

### Profile

Route: `/profile` (`src/router/routes.js:132-138`).

- [ ] **View profile** — Confirm name, email, roles, and storage usage/quota display correctly.
- [ ] **Change password button enabled** — Confirm the previously-disabled "Change Password" button now opens a working dialog (no stale "Epic 2" tooltip).
- [ ] **Linked resident** — If the account is linked to a resident record, confirm that link is shown/navigable.

### Start Fresh Production Setup Wizard

`src/pages/setup/SetupWizard.vue`, `src/components/setup/StartFreshWizard.vue`,
route `/setup` (`src/router/routes.js:29-38`).

- [ ] **Card visible** — On `/setup` (first run or post-wipe), confirm "Start Fresh with Real Data" is enabled (no longer "Coming in future update") alongside "Load Sample Data".
- [ ] **5-step wizard** — Click Start Fresh; confirm Village Profile → Admin User → Village Head → Module Selection → First Household, each showing "Step X of 5", Back disabled only on step 1.
- [ ] **Step 1 — new deployment** — With no `village_settings` row, submit Step 1; confirm `createSettings` runs with Zambia defaults (ZMW, Africa/Lusaka, ZM, +260) unless overridden, and `is_using_sample_data: false`.
- [ ] **Step 1 — re-entry** — With an existing settings row (e.g. after a partial run), confirm `updateSettings` is called instead (no 409 error).
- [ ] **Step 2** — Confirm the current admin's name/email display read-only (no second admin account created here).
- [ ] **Step 3 — skip** — Select "I am the Village Head"; confirm no new user is created.
- [ ] **Step 3 — create Village Head** — Create a new Village Head user; confirm they receive exactly the Village Head role.
- [ ] **Step 4 — module selection** — Toggle Farm/School/Vendors; confirm only these three optional modules are offered (no Guests/Equipment/Energy) and `updateModulesEnabled` is called with core + selected optional keys.
- [ ] **Step 5 — first household** — Create the first household; confirm redirect to `/` afterward with `is_using_sample_data: false` (no sample-data banner).
- [ ] **Post-wipe re-entry** — After running "Start Fresh — Wipe All Data" from the sample-data banner, confirm `/setup` is reachable again (`isFirstRun` true) and the wizard restarts cleanly.

---

## 9b. RBAC Matrix

Source: `server/scripts/seed-roles.js` (13 seeded roles), `src/utils/
permissions.js` (`hasPermission`/`hasAnyPermission`/`hasAllPermissions`/
`getUserStorageQuota`/`getAllUserPermissions`), `src/composables/
usePermissions.js`, `src/router/routes.js` + module routers (`meta.
requiresPermission`).

**13 seeded roles** (`server/scripts/seed-roles.js:71-295`): System
Administrator (`*`), Council Member, Farm Manager, Crop Manager, School
Administrator, Head Teacher, Teacher, Finance Manager, Village Head, Village
Resident, Deputy Village Head, Events Coordinator, Learner. (Guest role is
commented out / not currently seeded — `seed-roles.js:289-294` — do not test
against a live "Guest" account.)

For each role below, verify: (1) route guard behavior at the listed
permission-gated route, (2) in-page conditional rendering (buttons/sections
hidden when the permission is absent), (3) nav item visibility in
`MainLayout.vue`.

- [ ] **System Administrator (`*`)** — Confirm access to every route including `/admin/users`, `/admin/roles`, `/admin/modules`, `/admin/storage`; confirm `hasPermission` returns `true` for an arbitrary/unknown permission string via the wildcard (`src/utils/permissions.js:69-71`).
- [ ] **Council Member** — Confirm access to Residents/Households (read), Reports, Vendors (read), Storage (incl. finance/farm/school read + village-docs write); confirm Finance/Farm/School write and admin routes are blocked.
- [ ] **Farm Manager** — Confirm `farm:read`/`write`, `inventory:read`, `calendar:write`, `vendors:read`, `notifications:read`/`write`; confirm Farm plot/crop/planting/sale actions work but Finance/School/Admin routes are blocked.
- [ ] **Crop Manager** — Confirm `farm:read` + `farm:planting:write` (not full `farm:write`) restricts plot/crop create/edit but allows planting management.
- [ ] **School Administrator** — Confirm `school:read`/`write`/`admin` grants access to all School settings sub-pages; confirm Finance/Farm/Admin routes are blocked.
- [ ] **Head Teacher** — Same as School Administrator plus `calendar:write`; confirm calendar event creation works.
- [ ] **Teacher** — Confirm `school:read`/`write` (no `school:admin`) blocks settings sub-pages but allows attendance/score entry.
- [ ] **Finance Manager** — Confirm `finance:read`/`write`, `inventory:read`/`write`, `funding:write`, `vendors:read`/`write`; confirm Farm/School/Admin routes are blocked.
- [ ] **Village Head** — Confirm broad read access (residents, households, finance, inventory, farm, reports, vendors) plus `calendar:write` and storage grants; confirm write access to Farm/Finance/School data itself is NOT granted (read-only oversight role).
- [ ] **Village Resident** — Confirm only `profile:read`/`write`, `storage:read`/`write`, `notifications:read`; confirm Households/Residents/Finance/etc. nav items are all hidden and their routes redirect to `/unauthorized`.
- [ ] **Deputy Village Head** — Same as Village Head minus `calendar:write`; confirm calendar event creation is blocked for this role while broad read access still works.
- [ ] **Events Coordinator** — Confirm `calendar:read`/`write` plus limited `residents:read`/`households:read`; confirm this role can create calendar events in any category (per epic-5-context.md's Events Coordinator exception) but cannot access Finance/Farm/School.
- [ ] **Learner** — Confirm `school:read`, `profile:read`/`write`, `notifications:read`/`write`; confirm at-risk/intervention pages requiring `school:write`/`admin` are blocked, but the learner's own `/profile` and School dashboard (read) work.
- [ ] **Multi-role union** — Assign a user two roles (e.g. Farm Manager + Village Resident); confirm their effective permission set is the union of both (`getAllUserPermissions`, `src/utils/permissions.js:181-195`) and `hasPermission` returns `true` for a permission granted by either role.
- [ ] **Wildcard pattern match** — For a role with a `module:*`-style permission (none currently seeded, but verify via `hasPermission`'s pattern-matching logic, `permissions.js:79-86`, using a temporary test role if needed) that `module:read` and `module:write` both resolve `true` while a different module's permission resolves `false`.
- [ ] **Route guard — permission denied** — As a role lacking a route's `requiresPermission`, navigate directly to that route's URL; confirm redirect to `/unauthorized` (not a blank page or crash).
- [ ] **Roles page cross-check** — Open `/admin/roles`, expand each of the 13 roles, and cross-check the displayed permission list against `seed-roles.js`'s `defaultRoles` array for that role name — confirm no drift between the seeded permissions and what the UI displays.
- [ ] **Self-deactivate guard** — Covered in §User Management: attempting self-deactivation is blocked both client- and server-side.
- [ ] **Last-admin guard** — Covered in §User Management and §Roles & Permissions: both `deactivateUser` and `updateUser` (role removal) block removing the last active System Administrator (`server/functions/User Management/src/main.js:280-292,394-409`).
- [ ] **Module-toggle nav hiding** — With Farm/School/Vendors each individually disabled via `/admin/modules`, confirm for a role that otherwise has the relevant permission (e.g. Farm Manager with Farm disabled) that the nav section disappears and the module's routes are unreachable, even though the role's permission itself is unaffected (module toggle is independent of RBAC).

---

## 9c. Data-Integrity Invariants

Each invariant below has been traced to its enforcing code. Reproduce the
scenario and confirm the expected result holds.

- [ ] **1. Household deletion blocked while occupied** — `src/stores/households-store.js:302-306` (`deleteHousehold`). Attempt to delete a household with ≥1 resident; confirm rejection with an occupant-count message; deletion succeeds only at 0 residents.
- [ ] **2. Resident must reference an existing household** — `src/pages/residents/*Form*` + `residents-store.js` create/update. Attempt to save a resident with no household selected where the field is required; confirm client-side validation blocks submission.
- [ ] **3. Farm harvest → Inventory auto-upsert** — `src/modules/farm/stores/farm-store.js` (harvest-entry creation flow, ~line 1119-1141): after the first harvest entry is created, `inventoryStore.createOrUpdateFarmProduceFromHarvest` is called; if it fails, the harvest and entry rows are rolled back (`_rollbackEntryRow`/`_rollbackHarvestRow`). Reproduce a harvest entry and confirm a matching inventory row is created/incremented; simulate an inventory failure (e.g. temporarily invalid data) and confirm the harvest row does not persist orphaned.
- [ ] **4. Farm sale — inventory decrement + finance + farm_sales linkage** — `src/modules/farm/stores/farm-store.js:2753-2871` (`recordSale`). Confirm: (a) inventory cannot be sold below available quantity (`qty > available` rejected), (b) a successful sale decrements inventory, creates a Finance income transaction, and creates a `farm_sales` row referencing both `inventory_item_id` and `finance_transaction_id`; (c) simulate a finance-transaction failure mid-sale and confirm the inventory adjustment is rolled back (best-effort rollback logic immediately following `recordSale` in `farm-store.js`).
- [ ] **5. Finance expense → Inventory auto-creation** — Tag a Finance expense with an inventory-eligible category; confirm a corresponding `inventory` row is created, linked back to the source transaction (Story 2.7).
- [ ] **6. Loan repayment updates loan/repayment-schedule state** — `src/modules/lending/stores/lendingStore.js`. Record a loan repayment; confirm the loan's outstanding balance decreases and the corresponding `repayment_schedule`/`loan_payments` rows update consistently (no double-counting on repeat visits).
- [ ] **7. Vendor transaction history aggregation is accurate** — `src/modules/vendors/stores/vendors-store.js` `fetchVendorHistory` (Finance + Farm sales union). Confirm totals shown on `VendorDetailPage.vue` match the sum of the underlying Finance/Farm rows (noting the deferred `Query.limit(100)` per-source cap — flag if a vendor has >100 records on either side, per `deferred-work.md` "Deferred from: code review of spec-5-7").
- [ ] **8. At-risk thresholds are applied consistently** — `src/modules/school/utils/at-risk-utils.js:22-26` (`AT_RISK_THRESHOLDS`: attendance < 90% high, any subject < 50% high, overall < 60% medium; ANY one criterion triggers at-risk; a learner with zero records is never at-risk). Construct a learner just above/below each threshold and confirm correct at-risk/non-at-risk classification and severity.
- [ ] **9. At-risk grace period** — `src/modules/school/utils/at-risk-utils.js:29` (`GRACE_PERIOD_SCHOOL_DAYS = 5`). Confirm a learner is not flagged at-risk within the first 5 school days of a term even if their early attendance/scores would otherwise qualify.
- [ ] **10. Notification dedup key** — `server/functions/createNotification/src/main.js` (dedup by `type` + `related_entity_type` + `related_entity_id`, deterministic row ID). Trigger the same at-risk/farm-alert condition twice; confirm only one `notifications` row exists.
- [ ] **11. Notification targeting is server-derived, not client-supplied** — `server/functions/createNotification/src/main.js` `TYPE_CONFIG`. Attempt (via direct function invocation, e.g. with a REST client) to pass a custom `target_roles`; confirm the function ignores it and uses its own hardcoded targeting, and rejects an unknown `type` (400) or an unauthorized caller (403).
- [ ] **12. Last-System-Administrator guard (deactivate)** — `server/functions/User Management/src/main.js:394-409` (`countOtherActiveSystemAdmins`). Confirm deactivating the sole active System Administrator is rejected.
- [ ] **13. Last-System-Administrator guard (role removal)** — `server/functions/User Management/src/main.js:275-292`. Confirm removing the System Administrator role from the last admin via role edit (`updateUser`) is rejected identically to the deactivate guard.
- [ ] **14. Self-deactivation guard** — `server/functions/User Management/src/main.js` `deactivateUser` (`userId === actorUserId` check) + `src/components/admin/DeactivateUserDialog.vue:116-118` (client mirror). Confirm both layers reject self-deactivation.
- [ ] **15. Deactivated-user login block (defense-in-depth)** — `src/stores/auth-store.js` `login`/`checkSession`/`fetchUser` (`userProfile.active === false` → session deleted, login rejected). Confirm a deactivated user's existing session is also invalidated server-side (`users.deleteSessions`) so they're logged out of any other open tab/device.
- [ ] **16. Storage quota enforcement at upload time** — `src/utils/permissions.js:131-174` (`getUserStorageQuota`, per-user override precedence over role quota) + `src/stores/personal-files-store.js`/`shared-files-store.js` `uploadFiles`. Confirm a batch upload exceeding remaining quota is rejected with a clear error and no partial/orphaned file is left counting against quota beyond what actually uploaded.
- [ ] **17. Household-before-resident empty-state ordering** — `src/pages/dashboard/DashboardPage.vue`, `src/pages/residents/ResidentsListPage.vue` (Story 5.11). Confirm the Residents empty-state banner prompts "create a household first" when zero households exist, never offering to add a resident before a household exists.
- [ ] **18. Sample-data wipe is complete and ordered (FK-safe)** — `server/functions/wipeAllData/src/main.js:22-60` (`TABLES_TO_WIPE`, children-before-parents order). Run a wipe and confirm no table listed is left with orphaned rows and no FK-related deletion error occurs across the 5-pass retry loop.

---

## 9d. Integrations Smoke Tests

- [ ] **Appwrite Database** — Perform a create/read/update/delete on at least one row in a core table (e.g. a household) via the UI; confirm it round-trips correctly and appears identically after a full page reload.
- [ ] **Appwrite Auth** — Log in, log out, and log back in; confirm session persistence across a page refresh and correct session termination on logout (full-page reload clears state, see §9g).
- [ ] **Appwrite Storage** — Upload and download a personal file and a shared-folder file; confirm both buckets (`personal_files`, `shared_files`) work with file-level security (a user cannot fetch another user's personal file by guessing its ID).
- [ ] **Appwrite Functions** — Exercise `User Management` (create/update/deactivate/reactivate a user), `createNotification` (indirectly via an at-risk/farm-alert/vendor-created trigger), and `wipeAllData`/`seedAllData` (via Start Fresh / Load Sample Data); confirm each returns a success response and produces the expected side effects.
- [ ] **Appwrite Realtime** — With the notification bell open, trigger a notification from another session/tab; confirm it appears live without a manual refresh; then simulate a subscribe failure (e.g. block websockets in DevTools) and confirm the 30s polling fallback still delivers the update.
- [ ] **Chart.js** — Load `/finance/reports`, generate a chart, and load the Dashboard's `InventoryStockWidget`; confirm both render correctly and that chart.js loads via a dynamic, on-demand chunk (Network tab shows a separate `chart-*.js` request, not bundled into the page's own chunk — see §9g).
- [ ] **vue-cal** — Load `/calendar` and `/school/calendar`; confirm month/week/day/agenda views render without console errors and category color-coding is correct.
- [ ] **date-fns-tz** — Change the village timezone in Village Settings; confirm dates/times across Finance transactions, Farm harvest dates, and notification "time ago" labels all reflect the new timezone consistently.
- [ ] **Pinia caching** — Navigate to `/households`, away, and back with the same page/limit; confirm (via Network tab) no duplicate `tables.listRows` fetch fires on the second visit, but a filter change or CUD action does trigger a fresh fetch (see §9g for the full list of cache-guarded stores).
- [ ] **Quasar responsive grid** — Resize the browser from desktop to `xs` width on the Dashboard, `/households`, and a Farm detail page; confirm the `q-grid`/`q-card` layouts reflow without horizontal scrollbars appearing unexpectedly.

---

## 9e. Sample-Data Lifecycle

Seed scripts: `server/scripts/seed-roles.js`, `seed-soil-types.js`,
`seed-crops.js`, `seed-finance-categories.js`, `seed-funding-sources.js`,
`seed-village-settings.js`, `seed-sample-data.js`; `package.json` scripts
`setup:appwrite`, `seed:roles`, `seed:soil-types`, `seed:crops`,
`seed:settings`, `seed:sample`, `diagnose:schema`, `rebuild:inventory`. The
in-app "Load Sample Data" flow additionally invokes the `seedAllData`
Appwrite Function (`server/functions/seedAllData/src/main.js`), which seeds
households/residents, vendors, finance, farm, school, village settings,
calendar events, bell schedules, and notifications (5 sample rows across all
3 trigger types, `seedNotifications`, `:3277-3361`).

- [ ] **Fresh backend setup** — Run `npm run setup:appwrite`, `npm run seed:roles` against a scratch Appwrite project; confirm all tables/buckets/teams/functions are created without error and all 13 roles are seeded.
- [ ] **Load Sample Data (in-app)** — From `/setup`, click "Load Sample Data"; confirm the `seedAllData` function runs end-to-end (households/residents, vendors, finance, farm, school, calendar, village settings, notifications) and the app redirects to `/` with data populated across every enabled module.
- [ ] **Sample-data banner** — Confirm the sample-data banner is visible at the top of the app whenever `village_settings.is_using_sample_data === true`, and hidden otherwise.
- [ ] **Wipe routing** — Click "Start Fresh — Wipe All Data" on the banner; confirm `wipeAllData` runs, all `TABLES_TO_WIPE` tables are emptied (verify a few, e.g. `households`, `finance_transactions`, `learners`, `village_events`, `audit_logs`), and the app redirects into `/setup` with `isFirstRun` true.
- [ ] **Start Fresh wizard completion** — Complete the Start Fresh wizard (see §9a journey) after a wipe; confirm `is_using_sample_data` becomes `false` and the sample-data banner no longer appears.
- [ ] **Empty-state CTAs post-wipe** — Immediately after wipe + wizard completion (with zero households/residents/transactions until the wizard's own household-creation step is skipped or more data is added), confirm the Dashboard, Households, Residents, and Finance Transactions empty-state banners all appear correctly and respect household-before-resident ordering.
- [ ] **Re-seeding after wipe** — From a freshly wiped, real-data village, navigate back to `/setup` (if reachable) and confirm "Load Sample Data" can still repopulate the database cleanly (no leftover orphaned rows/files from the prior wipe causing duplicate-key or quota errors).
- [ ] **Storage cleanup on wipe** — Confirm `wipeAllData` also purges files from the `personal_files`/`shared_files` Storage buckets (per its own doc comment) so re-seeding does not leave orphan files counting against quotas.

---

## 9f. Mobile Responsiveness (320px)

Absorbed from Story 5.10e3 (`spec-5-10e3-mobile-responsiveness.md`). Use
Chrome DevTools mobile emulation set to a 320px-wide viewport (or an actual
low-end device) for all items below.

**Global rules to verify** (`src/css/app.scss`, `@media (max-width: 599px)`):

- [ ] Every `q-dialog`'s `q-card` renders at ≤95vw with no horizontal overflow or clipped content, even for dialogs with inline `min-width` styles.
- [ ] Every dense round icon-only button (`.q-btn--dense.q-btn--round`) has a minimum 44px × 44px hit area.

**Enumerated 20+ dialog/touch-target checks** (representative set; confirm
each opens cleanly at 320px with no overflow and all buttons ≥44px):

- [ ] `ResidentForm.vue` dialog
- [ ] `HouseholdForm.vue` dialog
- [ ] `RecordSaleDialog.vue` (`src/modules/farm/components/RecordSaleDialog.vue` — scoped 599px override)
- [ ] `HarvestEntryDialog.vue` (`src/modules/farm/components/HarvestEntryDialog.vue` — scoped 599px override)
- [ ] `UserFormDialog.vue` (Add/Edit User)
- [ ] `DeactivateUserDialog.vue`
- [ ] `ManageRolesDialog.vue`
- [ ] `ViewPermissionsDialog.vue`
- [ ] `ChangePasswordDialog.vue`
- [ ] `ForgotPasswordDialog.vue`
- [ ] `AddFundingDialog.vue`
- [ ] `CreateInterventionPage.vue`'s embedded forms/dialogs
- [ ] `TimetableCellEditor.vue` popup (Clear button — `size="xs"` removed)
- [ ] `EnrollLearnerPage.vue` form
- [ ] Notification panel dialog (`xs` mode)
- [ ] Help menu dialog (`xs` mode)
- [ ] Quick-search results panel at 320px
- [ ] Vendor add/edit form (`VendorFormPage.vue`)
- [ ] Plot/Crop add/edit forms
- [ ] Farm Alerts page action buttons (`FarmAlertsPage.vue` — `size="xs"` removed)
- [ ] Calendar event creation/edit dialog
- [ ] Storage upload dialog / drag-and-drop area

**No-wrap row fixes:**

- [ ] `FinanceTransactionsPage.vue` — transaction type cell (chip + inventory link) wraps instead of overflowing at 320px (`:164-189`).
- [ ] `TeachersListPage.vue` — teacher name + avatar row wraps instead of overflowing at 320px (`:67`).
- [ ] `InventoryDetailPage.vue` — alert title/message row wraps instead of overflowing at 320px (`:351`).

**Keyboard accessibility:**

- [ ] `FarmDashboardPage.vue` module-navigation cards — Tab to a card, confirm a visible focus outline, and Enter/Space navigates to the card's route (`:217-238`).

**Header/panel viewport checks:**

- [ ] `MainLayout.vue` help menu (`q-list`, line ~148) stays within `max-width: 90vw` at 320px.
- [ ] `MainLayout.vue` user menu (`q-list`, line ~177) stays within `max-width: 90vw` at 320px.
- [ ] At 320px, the header shows hamburger, help icon, notification bell, and user avatar all visible with no overflow (quick-search input hidden via its `gt-xs` class, as designed).

**Residual risk (documented, not required to pass for MVP sign-off):** Manual
interactive 320px verification had not been performed in an actual browser
session as of the 5.10e3 Auto Run Result — this checklist is the first pass
at exercising it. Flag and log any newly discovered overflow/touch-target
issue to `deferred-work.md` rather than blocking sign-off on a cosmetic
finding, unless it blocks a core MVP journey.

---

## 9g. Performance (3G / Lazy Loading / Caching)

Absorbed from Story 5.10e2 (`spec-5-10e2-performance-optimization.md`). Use
Chrome DevTools Network tab, throttling preset "Slow 3G" (~400KB/s, ~400ms
RTT), Application tab "clear cache and hard reload" before each page load.

**3G time-to-interactive checks** (target: under 3 seconds per Story 5.10
AC5; calculated estimates from the 5.10e2 build report were ~1.95–1.97s for
all 6 key pages — confirm these hold in an actual interactive session):

- [ ] Dashboard (`/`) loads and becomes interactive in under 3s on Slow 3G.
- [ ] Households list (`/households`) loads and becomes interactive in under 3s.
- [ ] Residents list (`/residents`) loads and becomes interactive in under 3s.
- [ ] Finance transactions (`/finance/transactions`) loads and becomes interactive in under 3s.
- [ ] Farm dashboard (`/farm/dashboard`) loads and becomes interactive in under 3s.
- [ ] School dashboard (`/school/dashboard`) loads and becomes interactive in under 3s.

**On-demand chart.js chunk loading:**

- [ ] Load `/finance/reports` fresh (hard reload); confirm chart.js is NOT present in `FinanceReportsPage-*.js`'s own network request but loads via a separate `chart-*.js` chunk only when a report/chart is actually generated.
- [ ] Load the Dashboard fresh; confirm `InventoryStockWidget`'s chart similarly loads chart.js via a separate on-demand chunk, not bundled into the dashboard's own chunk.

**Route lazy-loading:**

- [ ] Confirm (via Network tab, navigating between several distinct routes) that each route's page component loads as its own separate chunk on first visit, not all up-front at initial app load (all 24 direct routes + module sub-routes already use `component: () => import(...)`, verified in `src/router/routes.js`/module routers).

**Pinia cache guards** (confirm via Network tab — no duplicate `tables.listRows` fetch on revisit with unchanged parameters):

- [ ] `households-store.js` `fetchHouseholds` — revisit `/households` with the same page/limit; no new fetch. Create/edit/delete a household; confirm the list DOES refetch (force bypass).
- [ ] `residents-store.js` `fetchResidents` — same pattern; additionally confirm changing the search/household filter DOES trigger a fresh fetch (cache invalidated on filter change).
- [ ] `inventory-store.js` `fetchItems` — same pattern; confirm `setFilters`/`clearFilters` invalidate the cache.
- [ ] `finance-store.js` `fetchCategories`/`fetchFundingSources` — revisit a page that calls these twice in one session (e.g. Finance Reports then Transactions); confirm only one network fetch each per session unless a category/funding-source CUD action occurs.
- [ ] Reference-only (already correct pre-5.10e2, spot-check no regression): `vendors-store.js` (`vendorsLoaded`), `farm-store.js` (`plotsLoaded`/`cropsLoaded`), `class-store.js` (`classesLoaded`), `learner-store.js` (`learnersLoaded`), `calendar-store.js` (`loaded`).

**Full-page-reload-on-logout state clearing:**

- [ ] Log in as User A, load several pages (populating various Pinia store caches), then log out and log in as User B; confirm no stale data from User A's session (e.g. cached household list, notification list, quick-search results) leaks into User B's view. If the app does a full page reload on logout, confirm this happens; if it does not, confirm all relevant store caches are explicitly reset on logout.
- [ ] Confirm the Dashboard's `useDashboardData.js` `load()` no longer has an artificial delay before its fetches begin (the 300ms `setTimeout` was removed in 5.10e2) — the loading state should begin resolving immediately, not after a fixed pause.

---

## 9h. AC8 Deferral — System Health Monitoring (expanded)

Story 5.10 AC8 (System Health Monitoring) is confirmed deferred to post-MVP.
This section expands the original one-paragraph deferral recorded during
Story 5.10a planning (`deferred-work.md`, "Deferred from: Story 5.10a
planning (2026-08-04)") with a proposed implementation shape, per this
story's Tasks & Acceptance requirement. **Not implemented in MVP; no code
changes were made for AC8.**

### Proposed scope

An admin-only page (e.g. `/admin/system-health`, `SystemHealthPage.vue`,
gated `requiresPermission: '*'`, added to the Administration nav section)
showing:

- **Database size** — total row counts and approximate storage size per
  table (or aggregate), since Appwrite does not expose this to client SDKs.
- **Storage usage** — aggregate bucket usage across `personal_files` and
  `shared_files` (extending the existing per-user storage-usage-report
  pattern from Story 5.4's `storageUsageReport` function,
  `server/functions/storageUsageReport/src/main.js`, to a village-wide
  summary).
- **Active user counts** — count of `users` rows with `active: true`, and
  ideally a "sessions in the last 24h" metric (Appwrite Auth session data is
  not directly queryable by row filters, so this would need either an
  Appwrite Function using an admin API key against the Users API, or a
  lightweight "last_seen_at" column updated on session checks).
- **Error logs** — a way to surface recent server-function failures (e.g.
  `createNotification`, `User Management`, `wipeAllData`/`seedAllData`
  execution failures). Appwrite Functions execution logs are accessible via
  the Appwrite Console/API but not currently surfaced in-app.

### Required server functions / data sources

- A new Appwrite Function (e.g. `getSystemHealth`), admin-only (mirroring the
  `x-appwrite-user-id` caller-verification pattern already used in
  `server/functions/User Management/src/main.js` and `server/functions/
createNotification/src/main.js`), using an admin-scope API key to:
  - Query Appwrite's project-level Database/Storage/Functions metrics APIs
    (not exposed to the client SDK) for size/usage figures.
  - Aggregate `users` table row counts (active vs. inactive) via
    `tablesDB.listRows` with `Query.limit(1)` + `.total` (same pattern as
    `useDashboardData.js`'s household/resident counts).
  - Optionally list recent Appwrite Functions executions (via
    `functions.listExecutions`) for the functions this project defines
    (`userManagement`, `createNotification`, `wipeAllData`, `seedAllData`,
    `storageUsageReport`, `checkUsersExist`) to surface recent failures.
- No new Appwrite tables are strictly required if all data is derived
  live from existing tables + the Appwrite Management/Server APIs; a
  `system_health_snapshots` table could optionally be added later for
  historical trending, but that is an enhancement, not a requirement.

### Data sources (existing, reusable)

- `users` table (`active` column, Story 5.12) for active-user counts.
- `file_metadata` table + `personal_files`/`shared_files` buckets (Story
  5.3/5.4) for storage usage aggregation.
- `audit_logs` table (Story 5.12) as a partial proxy for recent
  administrative activity, though it does not capture function-execution
  errors.
- Appwrite's own Functions execution history (via the Management API, not
  currently wrapped by any function in this codebase).

### Effort estimate

**T-shirt size: M (Medium).** Rationale: requires one new admin-scoped
server function with several distinct Appwrite Management/Server-API calls
(not just `tablesDB`/`storage` client-equivalent operations already used
elsewhere), one new admin-only page + nav entry, and decisions about what
"error logs" concretely means for a village-scale single-tenant deployment
(most likely: Appwrite Functions execution history, since there is no
existing in-app error-logging table). Not Large, because it reuses the
existing caller-verification and dashboard-card UI patterns rather than
introducing new architecture; not Small, because Appwrite Management-API
access from a Function requires new SDK surface not yet used by any
existing function in this codebase (`node-appwrite`'s project/database
management client, distinct from the `TablesDB`/`Storage` clients already
used).

**Owning story:** post-MVP admin/observability epic (unchanged from the
original 5.10a deferral).

---

## 9i. Post-MVP Automated Testing Epic

Per the Epic 5 planning decision recorded in `deferred-work.md` ("Deferred
from: Epic 5 planning — 5.10e split and post-MVP testing epic (user decision
2026-08-11)"), AC9's "final testing checklist" requirement is satisfied for
MVP by this manual document. Full automated test infrastructure is deferred
to a new post-MVP epic, documented here.

### Scope

- **Unit tests (Vitest):** Pure utility/composable functions with no Vue
  component context — e.g. `src/utils/permissions.js` (`hasPermission`,
  `hasAnyPermission`, `hasAllPermissions`, `getUserStorageQuota`,
  `getAllUserPermissions`), `src/modules/school/utils/at-risk-utils.js`,
  `src/modules/school/utils/school-utils.js`, `src/utils/module-registry.js`,
  `src/modules/storage/utils/format-storage.js`, date/currency formatting
  helpers in `settings-store.js`. `docs/testing.md`'s Story 1.4 unit-test
  suite (§ `hasPermission`/`hasAnyPermission`/`hasAllPermissions`/
  `getUserStorageQuota`/`getAllUserPermissions`) is a ready-made starting
  spec for this work — those exact test cases can be lifted almost verbatim
  into real Vitest suites.
- **Component/store tests (Vitest + Vue Test Utils + a mocked Appwrite SDK):**
  Pinia store actions (e.g. `households-store.js`, `residents-store.js`,
  `finance-store.js`, `farm-store.js`, `notifications-store.js`,
  `users-store.js`) and key components (`PermissionGuard`, `Breadcrumbs`,
  form dialogs). `docs/testing.md`'s Story 1.4/1.8 integration-test suites
  (`auth-store.js`, `settings-store.js`, `UsersPage.vue`,
  `VillageSettingsPage.vue`) are directly reusable specs.
- **E2E tests (Cypress or Playwright):** Full user journeys per §9a of this
  checklist (login → CRUD → RBAC redirect → logout), the RBAC route-guard
  matrix from §9b, and the sample-data lifecycle from §9e. This checklist's
  journey list is the natural E2E test-case backlog.
- **CI integration:** Run lint + unit + component tests on every PR;
  optionally run a subset of E2E smoke tests against a scratch Appwrite
  project.

### Rationale

The project currently has zero test infrastructure: `package.json`'s `test`
script is a placeholder (`"echo \"No test specified\" && exit 0"`), no
`vitest`/`@vue/test-utils`/`cypress`/`@playwright/test` dependency exists,
and no `*.test.js`/`*.spec.js` file exists anywhere under `src/` or
`server/`. Every Epic 5 story's Verification section has relied on
`npm run lint` + `npm run build` + manual QA, and numerous `deferred-work.md`
entries across Stories 5.3, 5.4, 5.7, 5.12 explicitly note "No automated
test coverage... the project has no existing unit-test infrastructure...
Owning story: post-MVP testing initiative." Standing up a full test harness
(framework choice, mocking strategy for the Appwrite SDK, CI pipeline,
initial coverage baseline) is large, cross-cutting scope that does not fit
inside any single feature story and warrants its own epic.

### Effort estimate

**T-shirt size: XL (Extra Large) for the full epic; L for a minimal viable
first story (Vitest unit tests only, no E2E).** Rationale: the codebase has
~40+ Pinia stores/composables, 71 page files, and zero existing test
scaffolding — even a "thin slice" first story (Vitest setup + one store's
tests + CI wiring) is a multi-day effort, and full coverage (unit +
component + E2E across all MVP modules) is a multi-sprint initiative
comparable in scope to Epic 5 itself.

### Dependencies

- **§9a (MVP User Journeys)** of this checklist — the direct source backlog
  for E2E test cases; each `- [ ]` journey item maps to a candidate Cypress/
  Playwright test.
- **§9b (RBAC Matrix)** of this checklist — the direct source backlog for
  the permission-guard and role-based-rendering test suite; each role/
  permission combination is a candidate unit test against
  `src/utils/permissions.js` plus an E2E route-guard test.
- No dependency on §9c–9h; those sections are manual-verification-only and
  do not block the automated-testing epic's kickoff.

### Owning story

None yet created — this is a new post-MVP epic stub. A future planning pass
should create `epic-N: Automated Testing Infrastructure` (or similar) with
stories roughly following the Scope bullets above (Vitest setup + utils,
store/component tests, E2E harness + critical-path suite, CI integration).

---

## Sign-Off

**Story 5.10e4 completion criterion:** This manual checklist document itself is
complete, scoped to MVP, and ready for a human QA pass. The act of _authoring_
this checklist (sections 9a–9i) is what closes Story 5.10e4 and Epic 5; the
subsequent _execution_ of the checkboxes is the manual QA pass that signs off
MVP release readiness and may surface new deferred items, but it is not a
prerequisite for marking this doc-only story done.

- [ ] All applicable checkboxes above have been exercised against a running
      instance of the app (dev build minimum; a production build spot-check
      is recommended for §9g).
- [ ] Any failures found during this pass have been triaged: fixed
      immediately (if trivial and in-scope), or logged to
      `docs/implementation-artifacts/deferred-work.md` with a clear owning
      story (if out-of-scope for this checklist story or non-blocking).
- [ ] No checkbox item above references a deferred module (5.5 Guests, 5.6
      Equipment, 5.8 Energy, 4.9–4.11) or the AC8 implementation itself
      (only its deferral is documented, in §9h).
- [ ] Manual QA pass performed by: ******\*\*******\_\_\_******\*\*******
- [ ] Date of manual QA pass: ******\*\*******\_\_\_******\*\*******
- [ ] Remaining deferred work from the QA pass recorded in `docs/implementation-artifacts/deferred-work.md` with owning stories.
