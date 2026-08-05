# Deferred Work

Items deferred during code reviews. Revisit before closing their parent story or as prep for the next sprint.

---

## Deferred from: code review of story-4.4 (2026-06-20)

- `useErrorHandler()` called at module scope in Pinia stores — anti-pattern, but pre-existing across all stores; only becomes a problem if the composable is refactored to use Vue component context. [`period-slots-store.js:28`]
- Concurrent `slot_number` assignment race condition — two simultaneous admins saving a slot at the same time can create duplicate slot_number values. Only relevant if multi-user concurrent editing is introduced. [`BellSchedulesSettingsPage.vue:664-666`]
- `reorderSlots` and `copySchedule` use `Promise.all` with no rollback — a partial Appwrite failure leaves DB in an inconsistent state. Deferred because Appwrite has no transaction API; a retry + refetch pattern would mitigate. [`period-slots-store.js:307`, `period-slots-store.js:380`]
- Overlap detection warns only on same start-time, not on overlapping time ranges — full overlap check would improve schedule validity but the spec explicitly allows unusual schedules. Consider for Story 4.5 timetable validation. [`BellSchedulesSettingsPage.vue:650-661`]
- Timeline legend colour swatches have no `aria-label` — accessibility polish item. [`DailyScheduleTimeline.vue:101-113`]
- "All Days" chip label is hardcoded — no functional impact, cosmetic. [`DailyScheduleTimeline.vue:165`]
- Delete confirmation dialog does not check for timetable references (Story 4.5 concern) — intentional, documented in code comment. [`BellSchedulesSettingsPage.vue:14`]

## Deferred from: code review of story-4.7 (2026-06-25)

- `computeScorePercent` divides by zero if `max_score` is 0 or null — pre-existing issue in `school-utils.js` used by this story, not introduced here. [`at-risk-utils.js:100` via `school-utils.js`]
- `countSchoolDaysBetween` could infinite-loop if `addDaysToDateStr` returns an empty string — pre-existing in `calendar-events-store.js` and outside this story's scope. [`calendar-events-store.js:132-144`]
- `toDateStrInTimezone` returns `isoString.slice(0, 10)` on parse failure, which may return garbage — pre-existing utility behavior. [`dateUtils.js:115-124`]
- `eventsBetween` was specified for finding the covering closed event in `ClassDetailPage.vue`, but the manual `find()` achieves the same result. Consider switching to `eventsBetween` for consistency. [`ClassDetailPage.vue:768-774`]
- No term name/start date in the grace period banner on `ClassDetailPage.vue` — fix together with the corresponding patch finding if desired. [`ClassDetailPage.vue:582-589`]

## Deferred from: code review of story-4.8 (2026-07-01)

- No empty state when `learnerStore.activeLearners` is empty in CreateInterventionPage — pre-existing pattern across all school pages that use `activeLearners`. [`CreateInterventionPage.vue:264-269`]
- Seed log message wording differs from spec — cosmetic, data is correct (2 plans + 5 notes), only the log format differs from AC15's suggested wording. [`seedAllData/src/main.js:2053`]
- InterventionSummaryCard "Duration" shows end date, not "days since start or days until end" — minor UX deviation from AC7. Information is present, just formatted differently. [`InterventionSummaryCard.vue:108-111`]
- MyInterventionsWidget not immediately below At-Risk widget — minor layout deviation from AC13. Widget is still below the At-Risk widget, just not immediately after it. [`SchoolDashboardPage.vue:76-79`]

---

## Deferred from: code review of story-4.12 (2026-07-03)

- Server-side validation for baseline <= target -- Appwrite doesn't easily support row-level constraints; client validation is in place. [school-goals-store.js:137-173]
- Type coercion validation for Appwrite numeric strings -- schema enforces double/integer types server-side. [school-goals-store.js:216-218]
- PDF large dataset pagination -- autoTable handles page breaks automatically; low risk for MVP scale. [ReportExportService.js:755-823]
- Timezone handling for currentYear -- new Date().getFullYear() is browser-local; academic year is a coarse unit and this matches existing codebase pattern. [school-goals-store.js:214]
- Stale closure / periodic refresh in ProgressToGoalWidget -- dashboard widget pattern; 60s cache TTL is acceptable for non-real-time data. [ProgressToGoalWidget.vue:122-124]
- computeScorePercent null/string handling -- pre-existing function used across the school module; null score_value -> 0 is acceptable. [school-utils.js:13-16]
- Module-level useErrorHandler() call -- works because Notify.create is callable outside setup, but unconventional; matches pattern in other stores. [school-goals-store.js:40]

## Deferred from: code review of spec-5-1-village-calendar-global-calendar (2026-07-28)

- source_spec: `spec-5-1-village-calendar-global-calendar.md`
  summary: Calendar page and agenda list have no keyboard/arrow-key navigation for events.
  evidence: ux-specification.md rates arrow-key navigation of tables/lists/calendar as High priority, but no existing module implements it and vue-cal provides none out of the box — a project-wide accessibility gap, not specific to this story. Owning story: post-MVP accessibility pass.

## Deferred from: Epic 5 planning (2026-07-28) — user decision

- **Project-wide i18n deferred to post-MVP.** PRD NFR-4 / architecture.md §12 require externalized strings via `vue-i18n@9`, but no i18n setup exists (`vue-i18n` not in package.json, no `src/i18n/`, all Epics 1–4 UI hardcoded English). User decision on 2026-07-28: Epic 5 stories follow the existing hardcoded-English codebase style; i18n bootstrap (boot file, `src/i18n/en-US/`, string extraction across all modules) is a post-MVP effort. Owning story: post-MVP (no MVP story owns it).

## Deferred from: code review of spec-5-2-village-calendar-role-based-event-creation-and-editing (2026-07-28)

- source_spec: `spec-5-2-village-calendar-role-based-event-creation-and-editing.md`
  summary: Authorization for village_events (role-scoped categories, creator-only edit/delete, calendar:write gate) is enforced client-side only; the table uses the platform-wide `read/create/update/delete("any")` permissions with rowSecurity off, and `created_by` is client-supplied.
  evidence: setup-appwrite.js:69 shared `permissions` var (platform-wide TODO acknowledges the debt); calendar-store.js CUD actions now include defense-in-depth guards, but true server-side enforcement needs Appwrite per-row permissions or a server-side Function — an architectural decision affecting all tables, not just this story. Owning story: post-MVP security hardening (or Story 5.10 system completion).
- source_spec: `spec-5-2-village-calendar-role-based-event-creation-and-editing.md`
  summary: seed-roles.js skips existing roles, so existing deployments never receive the new `calendar:write` grants for Farm Manager, Head Teacher, and Village Head.
  evidence: seed-roles.js:212-215 `continue` on existing roles (spec explicitly forbade changing seeder behavior); the three role rows must be updated via the Appwrite console or an upsert migration on existing deployments. Owning story: Story 5.13 (Role Assignment and Permissions Management UI) or an ops runbook.
- source_spec: `spec-5-2-village-calendar-role-based-event-creation-and-editing.md`
  summary: village_events fetch is capped at Query.limit(500) with no pagination; beyond 500 rows, newer events silently never load (oldest 500 kept due to orderAsc('start_date')).
  evidence: calendar-store.js fetchUserEvents mirrors the pre-existing school calendar-events-store pattern; village_events is unbounded user-generated content (recurring series accelerate accumulation). Owning story: post-MVP (same fix should cover school_calendar_events).
- source_spec: `spec-5-2-village-calendar-role-based-event-creation-and-editing.md`
  summary: formatDateInTimezone parses 'YYYY-MM-DD' strings via `new Date()` as UTC midnight, rendering one day back in timezones behind UTC (harmless for Africa/Lusaka, UTC+2).
  evidence: pre-existing 5.1/dateUtils behavior surfaced again by this story's added date display surface (CalendarPage.vue formatDate/formatAgendaDate). Owning story: post-MVP date-utils hardening.

## Deferred from: code review of story-4.13 (2026-07-03)

- Ephemeral teacher comments -- comments are intentionally NOT persisted in the database. This keeps the MVP schema clean and avoids database bloating. [LearnerDetailPage.vue:830-845, LearnersListPage.vue:260-275]
- JSZip dynamic import fallback -- if JSZip dynamic load fails, bulk generation gracefully falls back to sequential individual PDF downloads with a 350ms delay. [ReportExportService.js:1010-1035]

## Deferred from: code review of spec-5-3-cloud-storage-role-based-storage-quotas-and-personal-folders (2026-07-30)

- source_spec: `spec-5-3-cloud-storage-role-based-storage-quotas-and-personal-folders.md`
  summary: `file_metadata` row-level permissions and owner_id filtering harden privacy, but Appwrite table-level permissions still default to `create("any")` for every other table; a project-wide server-side security review (Functions or per-table row security) is needed before multi-tenant deployment.
  evidence: setup-appwrite.js:89 shared `permissions` variable still applies `read/create/update/delete("any")` to all other tables, matching the platform-wide TODO already present for every story. Fixing it here in isolation would not address the same issue on every other module.
- source_spec: `spec-5-3-cloud-storage-role-based-storage-quotas-and-personal-folders.md`
  summary: seed-roles.js skips existing roles, so existing deployments never receive Story 5.3 `storage_quota` updates or `storage:read`/`storage:write` grants.
  evidence: seed-roles.js:274 `continue` on existing roles (same pre-existing pattern as Story 5.2); affected rows must be updated via the Appwrite console or an upsert migration. Owning story: Story 5.13 (Role Assignment and Permissions Management UI) or an ops runbook.
- source_spec: `spec-5-3-cloud-storage-role-based-storage-quotas-and-personal-folders.md`
  summary: `fetchFiles` is capped at `Query.limit(500)` with no pagination; beyond 500 personal files, newer files silently never load.
  evidence: personal-files-store.js:90 `Query.limit(500)` with no cursor/offset follow-up; this mirrors the deferred 5.2 calendar-events-store pattern. Owning story: post-MVP storage hardening.
- source_spec: `spec-5-3-cloud-storage-role-based-storage-quotas-and-personal-folders.md`
  summary: No automated test coverage for `useFileUpload`, `personal-files-store`, or `format-storage`; quota arithmetic, batch-abort, rename/move guards, and path validation are only covered by lint/build and manual QA.
  evidence: No `*.test.js`/`*.spec.js` files added under `src/`; the project has no existing unit-test infrastructure for stores/composables. Owning story: post-MVP testing initiative.

## Deferred from: code review of spec-5-4-cloud-storage-shared-folders-and-module-based-access (2026-07-30)

- source_spec: `spec-5-4-cloud-storage-shared-folders-and-module-based-access.md`
  summary: Batch upload quota pre-checks (`personal-files-store.uploadFiles`, `shared-files-store.uploadFiles`) sum the whole batch against usage captured before the loop starts, so per-file usage increments earlier in the same batch are not re-subtracted from the remaining allowance if a later file in the batch is retried after a partial failure.
  evidence: This is the pre-existing Story 5.3 `uploadFiles` pattern (`personal-files-store.js`), mirrored (not introduced) by the new `shared-files-store.uploadFiles` and `shareToFolder`; already-accepted behavior for personal uploads, now duplicated for shared uploads. Owning story: post-MVP storage hardening (fix both call sites together).
- source_spec: `spec-5-4-cloud-storage-shared-folders-and-module-based-access.md`
  summary: seed-roles.js skips existing roles, so existing deployments never receive the new Story 5.4 `storage:finance:*`/`storage:farm:*`/`storage:school:*`/`storage:village-docs:write` grants.
  evidence: seed-roles.js `continue` on existing roles (same pre-existing pattern as Stories 5.2/5.3); affected role rows must be updated via the Appwrite console or an upsert migration. Owning story: Story 5.13 (Role Assignment and Permissions Management UI) or an ops runbook.
- source_spec: `spec-5-4-cloud-storage-shared-folders-and-module-based-access.md`
  summary: `storageUsageReport`'s `file_metadata` pagination loop has no timeout/rate-limit backoff; a very large table could approach the function's 60s timeout.
  evidence: server/functions/storageUsageReport/src/main.js pages in batches of 100 with no elapsed-time guard; acceptable at current village-scale row counts. Owning story: post-MVP storage/scale hardening.
- source_spec: `spec-5-4-cloud-storage-shared-folders-and-module-based-access.md`
  summary: No automated test coverage for `shared-files-store`, `shareToFolder`, `getSharedFolderPermissions`, or `storageUsageReport`; covered only by lint/build and manual QA.
  evidence: No `*.test.js`/`*.spec.js` files added under `src/` or `server/functions/`; the project has no existing unit-test infrastructure for stores/composables/functions. Owning story: post-MVP testing initiative.

## Deferred from: code review of spec-5-7-vendors-suppliers-management-module (2026-08-02)

- source_spec: `spec-5-7-vendors-suppliers-management-module.md`
  summary: seed-roles.js skips existing roles, so existing deployments never receive the new `vendors:read`/`vendors:write` grants for Finance Manager, Village Head, Deputy Village Head, Council Member, Farm Manager, and Crop Manager.
  evidence: seed-roles.js `continue` on existing roles (same pre-existing pattern as Stories 5.2/5.3/5.4); affected role rows must be updated via the Appwrite console or an upsert migration. Owning story: Story 5.13 (Role Assignment and Permissions Management UI) or an ops runbook.
- source_spec: `spec-5-7-vendors-suppliers-management-module.md`
  summary: `vendors` table uses the platform-wide shared `permissions` var (read/create/update/delete("any")), so vendor row-level security is not enforced server-side; any authenticated user can read/write all vendor rows regardless of role.
  evidence: setup-appwrite.js `vendors` table reuses the shared `permissions` constant � same architectural debt acknowledged for every prior module. Owning story: post-MVP security hardening (or Story 5.10 system completion).
- source_spec: `spec-5-7-vendors-suppliers-management-module.md`
  summary: `fetchVendors` is capped at `Query.limit(200)` with no pagination; beyond 200 vendors, additional rows silently never load.
  evidence: vendors-store.js:107 `Query.limit(200)` with no cursor/offset follow-up; mirrors the deferred 5.2/5.3 list-pagination pattern. Owning story: post-MVP pagination pass.
- source_spec: `spec-5-7-vendors-suppliers-management-module.md`
  summary: `fetchVendorHistory` caps each side (finance/farm_sales) at `Query.limit(100)` with no pagination; a vendor with >100 finance expenses or >100 farm sales will show an incomplete history and under-counted totals.
  evidence: vendors-store.js:308/318 `Query.limit(100)` per source with no cursor follow-up; totals on VendorDetailPage are derived from this capped list. Owning story: post-MVP pagination pass.
- source_spec: `spec-5-7-vendors-suppliers-management-module.md`
  summary: No automated test coverage for `vendors-store`, `VendorPicker`, `vendor-utils`, or the finance/farm integration changes; covered only by lint/build and manual QA.
  evidence: No `*.test.js`/`*.spec.js` files added under `src/`; the project has no existing unit-test infrastructure for stores/composables. Owning story: post-MVP testing initiative.

## Deferred from: code review of spec-5-14-authentication-completeness-password-change-and-reset (2026-08-03)

- source_spec: `spec-5-14-authentication-completeness-password-change-and-reset.md`
  summary: `ChangePasswordDialog.vue` allows a user to "change" their password to the same value as their current password with no client-side warning.
  evidence: No inline rule compares `form.newPassword` against `form.currentPassword`; behavior on a no-op change is left entirely to whatever Appwrite decides to do. Low impact — not a correctness or security issue, just a missed UX nicety. Owning story: post-MVP auth UX polish.
- source_spec: `spec-5-14-authentication-completeness-password-change-and-reset.md`
  summary: The single-use recovery `userId`/`secret` query params remain visible in the browser URL/history after `/auth/reset-password` is used (success or failure), instead of being cleared via `router.replace`.
  evidence: `ResetPasswordPage.vue` never removes the query string after `resetPassword` resolves. Low impact since Appwrite invalidates the token server-side after first use, but still avoidable browser-history hygiene debt. Owning story: post-MVP auth hardening.
- source_spec: `spec-5-14-authentication-completeness-password-change-and-reset.md`
  summary: No client-side cooldown/throttle on repeated "Send Reset Link" or "Change Password" submissions beyond the existing loading-state button disable; rapid resubmission relies entirely on Appwrite's server-side rate limiting.
  evidence: `ForgotPasswordDialog.vue`/`ChangePasswordDialog.vue` only guard against double-submit via the `loading` ref during an in-flight request, not a post-response cooldown. Minor UX/abuse-surface gap on an unauthenticated-reachable endpoint (`requestPasswordReset`). Owning story: post-MVP auth hardening.
- source_spec: `spec-5-14-authentication-completeness-password-change-and-reset.md`
  summary: Password-visibility toggle icons (`<q-icon class="cursor-pointer" @click="...">`) in `ChangePasswordDialog.vue` and `ResetPasswordPage.vue` have no `role`, `tabindex`, or `aria-label`, making them unreachable via keyboard and unannounced to screen readers.
  evidence: This mirrors the pre-existing pattern already in `LoginForm.vue` prior to this story (not introduced here), now propagated to two more surfaces. A fix should address all instances of the pattern at once. Owning story: post-MVP accessibility pass.

## Deferred from: code review of spec-5-12-user-management-crud-operations (2026-08-03)

- source_spec: `spec-5-12-user-management-crud-operations.md`
  summary: The `server/functions/User Management/` directory name contains a space, which can complicate shell/CLI usage and some deployment tooling.
  evidence: `server/functions/User Management/` — matches the `Check Users Exist` naming pattern but spaces in paths are friction-prone for `appwrite push function` and shell scripts. Owning story: post-MVP rename pass (rename alongside `Check Users Exist` for consistency).
- source_spec: `spec-5-12-user-management-crud-operations.md`
  summary: `users-store.js` fetches users with `Query.limit(500)` and no cursor/offset pagination; beyond 500 users, additional rows silently never load.
  evidence: `users-store.js` `fetchUsers` mirrors the deferred 5.2/5.3/5.7 list-pagination pattern. Owning story: post-MVP pagination pass (fix all capped list stores together).
- source_spec: `spec-5-12-user-management-crud-operations.md`
  summary: An admin-initiated password reset feature (`resetUserPassword` action) was added in commit `f47fc6c` AFTER the 5.12 spec was marked done. It is wired into `UserFormDialog.vue` (edit mode) and the User Management function, with a 5th audit enum value `user_password_reset` in `setup-appwrite.js`. This is NOT in the 5.12 or 5.13 ACs in `epics.md` — it is an accepted scope addition.
  evidence: `server/functions/User Management/src/main.js:486` (`resetUserPassword`), `src/stores/users-store.js:174`, `src/components/admin/UserFormDialog.vue:263`, `server/scripts/setup-appwrite.js:1805` (enum). The 5.12 spec's audit-enum list (4 values) is now out of sync with the code (5 values). User decision 2026-08-04: accept and document; do not revert. Owning story: none (delivered); spec drift noted for 5.13 continuity.

## Deferred from: code review of story-5.13 (2026-08-04)

- source_spec: `docs/implementation-artifacts/spec-5-13-role-assignment-and-permissions-management-ui.md`
  summary: The 5.12 `updateUser` server function has no last-System-Administrator guard for `role_ids` changes — an admin can remove the System Administrator role from the only remaining admin (via ManageRolesDialog or the pre-existing UserFormDialog edit-mode role multi-select), locking the system out of the admin UI. The 5.12 `deactivateUser` action has this guard, but `updateUser` does not.
  evidence: `server/functions/User Management/src/main.js:243-346` (`updateUser` — no last-admin check on role changes; `deactivateUser` at lines 379-390 does check). Both `src/components/admin/ManageRolesDialog.vue:178` (5.13) and `src/components/admin/UserFormDialog.vue:286` (5.12 edit mode) call `usersStore.updateUser` with `role_ids` and can trigger this. Pre-existing from 5.12, surfaced incidentally by 5.13's new UI. User decision 2026-08-04: pick up in Story 5.11 (Start Fresh Production Setup Wizard) — add a last-active-System-Admin check to the `updateUser` server function when `role_ids` changes remove the System Admin role, mirroring the `deactivateUser` guard. Owning story: Story 5.11. RESOLVED in Story 5.11 — see `server/functions/User Management/src/main.js:273-292`.

## Deferred from: code review of story-5.11 (2026-08-04)

- source_spec: `docs/implementation-artifacts/spec-5-11-start-fresh-production-setup-wizard.md`
  summary: `village_settings.country_phone_code` has `maxLength: 4` (`src/stores/settings-store.js` validation, `server/scripts/setup-appwrite.js` schema), which rejects valid international dialing codes longer than 4 characters (e.g. `+1242`).
  evidence: `src/stores/settings-store.js:273`, `server/scripts/setup-appwrite.js:272`. Pre-existing constraint predating 5.11, surfaced incidentally by the Start Fresh Wizard's Step 1 form. Owning story: post-MVP i18n/localization hardening pass.
- source_spec: `docs/implementation-artifacts/spec-5-11-start-fresh-production-setup-wizard.md`
  summary: `StartFreshWizard.vue` Step 1's currency code and country phone code inputs only validate presence, not ISO 4217 / dialing-code format.
  evidence: `src/components/setup/StartFreshWizard.vue` (currency/phone code `q-input` `:rules`). Matches the equally lenient validation already in `VillageSettingsPage.vue`/`settings-store.js`. Owning story: post-MVP input-validation hardening pass (fix alongside the settings page's equivalent fields).
- source_spec: `docs/implementation-artifacts/spec-5-11-start-fresh-production-setup-wizard.md`
  summary: The Story 5.11 last-System-Administrator guard added to `updateUser` (and the pre-existing one in `deactivateUser`) has a theoretical TOCTOU race: two concurrent role-removal requests against the last two System Administrators could both pass the `countOtherActiveSystemAdmins` check before either write commits, leaving zero admins.
  evidence: `server/functions/User Management/src/main.js:273-292` (new guard) and `:379-390` (`deactivateUser`, pre-existing, same shape). Appwrite's TablesDB has no row-level locking exposed to functions; fixing this would require a redesign (e.g. a dedicated admin-count counter row with optimistic locking). Owning story: post-MVP concurrency-hardening pass.
- source_spec: `docs/implementation-artifacts/spec-5-11-start-fresh-production-setup-wizard.md`
  summary: The `/setup` route (`src/router/routes.js`) requires only `requiresAuth: true`, with no `requiresPermission` check — any authenticated user, not just a System Administrator, can navigate to `/setup` and launch the Start Fresh Wizard.
  evidence: `src/router/routes.js:31-38`. Pre-existing behavior from the original `SetupWizard.vue` (the "Load Sample Data" card had the same exposure); not introduced by 5.11. Owning story: post-MVP RBAC hardening pass.

## Deferred from: Story 5.10a planning (2026-08-04)

- source_spec: `docs/implementation-artifacts/spec-5-10a-dashboard-completion-real-data-wiring.md`
  summary: Story 5.10 AC8 (System Health Monitoring) is deferred to post-MVP. An admin page showing database size, storage usage, active user counts, and error logs would require a new server function (to query Appwrite project-level metrics not exposed to client SDKs) and is out of scope for MVP dashboard completion.
  evidence: Story 5.10 acceptance criteria (AC8); no existing server function or store exposes this data. Owning story: post-MVP admin/observability epic.

## Deferred from: code review of spec-5-10b-navigation-polish-breadcrumbs-and-quick-search (2026-08-04)

- source_spec: `docs/implementation-artifacts/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md`
  summary: Replacing ad-hoc Back buttons with the shared `Breadcrumbs.vue` component dropped several pages' descriptive back-button tooltips/aria-labels (e.g. `<q-tooltip>Back</q-tooltip>` naming the specific destination) in favor of a single generic `aria-label="Back"` on the component's mobile back button.
  evidence: `EnrollLearnerPage.vue`, `CreateInterventionPage.vue`, and several detail pages previously had destination-specific tooltips on their Back buttons; `Breadcrumbs.vue`'s mobile `q-btn` only has a generic `aria-label="Back"`. Low-severity accessibility regression, not required by Story 5.10b's ACs. Owning story: 5.10e (UX Polish, Performance, Mobile Responsiveness, and Final Testing Checklist — accessibility audit / aria-labels).
- source_spec: `docs/implementation-artifacts/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md`
  summary: The header quick-search results `q-menu` uses `no-focus no-refocus` (added in post-finalization patch `3152db1` to stop the menu from stealing focus from the input while typing). This may reduce keyboard navigability of the results dropdown (arrow-key/Tab traversal of result rows).
  evidence: `src/layouts/MainLayout.vue` `<q-menu ... no-focus no-refocus>` on the search results menu. Not required by Story 5.10b's ACs; tradeoff accepted to keep typing fluent. Owning story: 5.10e (accessibility audit — verify/restore keyboard reachability of search results without re-introducing the focus-steal regression).

## Deferred from: code review of spec-5-10c-notifications-system (2026-08-05)

- source_spec: `docs/implementation-artifacts/spec-5-10c-notifications-system.md`
  summary: The `notification_reads` table grants table-level `create` to `Role.users()` (any authenticated user), matching the existing `file_metadata` row-security precedent; this means a user could craft a direct API call creating a read-receipt row with someone else's `user_id`, incorrectly marking another user's notification as read without their action (the row's own read/update/delete permissions still correctly restrict it to the intended owner after creation).
  evidence: `server/scripts/setup-appwrite.js` `notification_reads` table permissions; `src/stores/notifications-store.js` `markRead`. This is the same trust model already accepted for `file_metadata` (Story 5.3) — not a new class of risk introduced uniquely by this story, but worth hardening later (e.g. moving read-receipt writes through a server function that trusts only the caller's own session `user_id`) since the blast radius here is "silently mark someone else's notification read," a low-but-nonzero-impact griefing vector. Owning story: 5.10e (or a future security-hardening pass) — not required by Story 5.10c's ACs.
- source_spec: `docs/implementation-artifacts/spec-5-10c-notifications-system.md`
  summary: The notification bell's realtime subscription only catches synchronous throws from `Realtime.subscribe(...)`; if the underlying websocket connection fails asynchronously after `subscribe()` returns (rather than throwing synchronously), the polling fallback is never armed and the bell simply stops receiving live updates until the next full page load.
  evidence: `src/layouts/MainLayout.vue` `onMounted` try/catch around `realtime.subscribe(...)`. This mirrors the exact same pattern already used by `src/modules/finance/composables/useDashboardData.js`'s `subscribeToRealtime` (the only other realtime consumer in the codebase), so it is a pre-existing systemic gap in the realtime pattern, not something introduced fresh by this story. A full fix (e.g. Appwrite `Realtime` connection-state/error callbacks, if the installed SDK version exposes them) should be applied to both consumers together. Owning story: 5.10e or a future realtime-hardening pass.
- source_spec: `docs/implementation-artifacts/spec-5-10c-notifications-system.md`
  summary: `at-risk-store.js`'s existing 60-second `computeAtRisk` cache (pre-dating this story) means that if a learner flips out of and back into at-risk status within the same 60-second window, the newly-added `notifyNewAtRiskLearners` trigger will not fire a second time for that learner, since the notifications-table dedup key (`type`+`related_entity_type`+`related_entity_id`) already has a row from the first flip and the cache prevents `computeAtRisk` from even re-running until it expires.
  evidence: `src/modules/school/stores/at-risk-store.js` `CACHE_TTL_MS = 60_000` (pre-existing) interacting with the new `notifyNewAtRiskLearners` call site. Low-impact (a 60-second window on a computation that is itself only refreshed on-demand per page view, not on a tight loop); not required by Story 5.10c's ACs, which only require detecting "newly at-risk" once per dedup key. Owning story: 5.10e or a future at-risk-notification refinement, if this proves material in practice.
