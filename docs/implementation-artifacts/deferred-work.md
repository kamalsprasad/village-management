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
