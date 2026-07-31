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

---`n

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
