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
