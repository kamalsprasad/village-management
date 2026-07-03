# Story 4.12: School Module — Progress Toward Long-Term Educational Goal (90% in 90th Percentile)

**Epic:** 4 — School Management and Educational Accountability  
**Story ID:** 4.12  
**Status:** done  
**Date:** 2026-07-03  
**Author:** AI Assistant (BMad create-story workflow)

---

## Story

As a **Head Teacher**, I want to configure and track our long-term educational goal (90% of learners reaching the 90th-percentile benchmark by year 10), so that I can monitor progress, identify gaps, and demonstrate measurable outcomes to the Village Head and donors.

As a **Village Head**, I want to see a concise "Progress to Goal" widget on the school dashboard and a detailed Educational Goals page, so that I can make evidence-based decisions about learning-material budgets and donor reporting.

---

## Summary

This story closes the strategic feedback loop for the School module by making the 10-year educational goal from the PRD measurable and visible. It introduces:

- A persisted **long-term goal configuration** (`school_long_term_goals` table).
- A set of **pure calculation utilities** that compute the current percentage of learners who meet the target benchmark, the remaining gap, the required improvement rate, and a projected outcome.
- A new **Educational Goals** page (`/school/educational-goals`) with a multi-year progress chart, key metrics, and breakdowns by grade and subject.
- A **"Progress to Goal"** dashboard widget on `SchoolDashboardPage.vue`.
- A **Quarterly Goal Review** PDF export that the Head Teacher can generate on demand for donor/village-leadership meetings.

**Key design decisions (confirmed for this story):**

- **No national data feed.** The "90th percentile" is modelled as a configurable **benchmark score threshold** (default 90%). A learner "meets the benchmark" when their current academic-year overall average score is ≥ the threshold. This matches the PRD user-journey example ("20% of learners in 90th percentile (2 of 10)" and "Class average: 77.6% (target: 90%)"). Confirmed with the user; see Concern 1 and Confirmed Decisions below.
- **Single active goal, multiple historical snapshots.** The `school_long_term_goals` table holds one active long-term goal. Progress over time is computed on-demand from `test_scores` grouped by academic year and term, rather than stored as a separate time-series table, to keep the MVP schema minimal. (If historical snapshots become necessary later, they can be added without changing this API.)
- **Progress is computed from active learners only.** Learners whose `enrollment_status` is not `Active` are excluded from the numerator and denominator, consistent with the learner dashboard counts.
- **Re-use existing Chart.js pattern.** The school module has no charts yet; this story follows the lazy-loaded Chart.js pattern used in `src/modules/farm/components/YieldTrendsWidget.vue` and `src/modules/finance/components/TopExpenseCategoriesWidget.vue`.
- **PDF export reuses `ReportExportService`.** The quarterly report uses the lazy-loaded `jsPDF` + `jspdf-autotable` pattern already established in `src/services/ReportExportService.js` and `src/services/DonorReportService.js`.
- **Stable public API for Story 4.13.** `school-goals-store.js` exposes `getGoalProgress(academicYear, termName)` and `getProgressHistory()` getters that Story 4.13 (Learner Progress Reports and School Dashboard Completion) can consume without changes.

---

## Prerequisites

- **Story 4.1** (done): `learners`, `school_classes`, `learner-store.js`, `useLearnerStore().activeLearners`, `getLearnerName()`.
- **Story 4.2** (done): `test_scores` table, `school-store.js`, `computeScorePercent()` in `src/modules/school/utils/school-utils.js`.
- **Story 4.3** (done): `school_academic_terms` table, `academic-terms-store.js` with `availableYears`, `currentYearTerms`, `getTermForDate()`.
- **Story 4.7** (done): `at-risk-utils.js` thresholds pattern (reuse for benchmark calculations), `settings-store.js` for timezone-aware date handling.
- **Epic 1** (done): `usePermissions()` composable with `school:read`, `school:write`, `school:admin`; `MainLayout.vue` navigation pattern; `src/router/routes.js` module route spreading.

---

## Concerns and Potential Problems

The following issues were identified during review. Each has a confirmed resolution that is incorporated into the acceptance criteria below.

### Concern 1: The phrase "90% of learners in 90th percentile" is ambiguous

**Problem:** The PRD's goal #3 states "90% of learners score in 90th percentile on national exams by year 10." In a small village school with, e.g., 10 learners, only one learner can statistically be in the 90th percentile of the internal cohort. The PRD journey instead shows "20% of learners in 90th percentile (2 of 10)" and "Class average: 77.6% (target: 90%)," which suggests a simpler benchmark interpretation: a learner is "in the 90th percentile" if their average score meets a high score threshold, not if they are in the top 10% of the class. The system has no national exam data feed, so the true statistical percentile cannot be computed.

**Impact:** If implemented literally as an internal percentile, the goal would be impossible for small cohorts and confusing to users. If implemented as a configurable benchmark score, it becomes actionable and matches the journey numbers.

**Confirmed decision:** Implement the goal as a **configurable benchmark score threshold**. Default: `target_percentile_score = 90`. A learner is counted as "at target" when their current academic-year overall average (mean of all subject averages) is ≥ `target_percentile_score`. The headline metric is then the percentage of active learners who meet this benchmark. This is the approach used in the acceptance criteria below.

**Alternatives considered:**

1. **Internal cohort percentile** — rejected because it is mathematically impossible for most small cohorts to ever reach 90%.
2. **National percentile lookup table** — rejected because no national data source or API exists in the MVP, and the PRD does not specify one.
3. **Configurable benchmark score threshold (recommended)** — simple, matches the PRD journey, and lets the Head Teacher adjust the benchmark if national standards change.

### Concern 2: Where should the goal configuration live?

**Problem:** There is no existing table for school-level strategic goals. Adding the fields to `village_settings` would pollute the global village record and couple the School module to core settings. Creating a separate `school_settings` table with one row is possible but over-engineered for a single goal.

**Impact:** Schema choice affects where the Head Teacher edits the goal, how seeding works, and how Story 4.13 consumes the data.

**Confirmed decision:** Create a dedicated `school_long_term_goals` table with one active row. This keeps the goal close to the School module, is easy to seed, and can be extended later to multiple goals without migration. The table is intentionally small and generic (see Schema Changes).

### Concern 3: How is "year 10" determined?

**Problem:** The PRD says "by year 10" of the village. The system has `village_settings.established_date`, but it may be null on a fresh install. The goal also needs a baseline academic year to measure progress from.

**Impact:** Without a clear year-10 calculation, the "years remaining" and "required improvement rate" metrics will be wrong or inconsistent.

**Confirmed decision:** Use the configured academic year as the timeline. The goal row stores `baseline_academic_year` and `target_academic_year` (default baseline + 10). If the village has no `established_date`, the baseline defaults to the earliest academic year with `test_scores` data, or the current year if no scores exist. The UI allows the Head Teacher to override these values in School Settings.

### Concern 4: Goal progress needs historical data, but there may not be enough data points to project

**Problem:** The acceptance criteria ask for "required improvement rate" and "projected outcome." These require at least two data points (e.g., baseline year and current year). On a fresh install with only one term of scores, projection is not meaningful.

**Impact:** Showing a nonsensical projection early in the village's life would erode trust in the feature.

**Confirmed decision:** The calculation utilities handle missing data gracefully:

- If only one academic year of data exists, the projection is shown as "Insufficient data — need at least two years of scores."
- If the target year is the current year, the required improvement rate is simply `target_percent - current_percent`.
- The projection uses linear extrapolation from the last two recorded academic-year progress points (or the baseline and current point if only two exist).

### Concern 5: Story 4.13 depends on 4.12

**Problem:** `sprint-status.yaml` and `epics.md` list Story 4.13 (`Learner Progress Reports and School Dashboard Completion`) as depending on Story 4.12. Any API created here must be stable enough for 4.13 to call without changes.

**Impact:** If the goal-tracking store API is not clean, 4.13 will have to refactor it, causing rework.

**Confirmed decision:** Design `school-goals-store.js` with a small, stable public API documented in JSDoc:

- `getActiveGoal()` — returns the configured goal row.
- `getGoalProgress(academicYear, termName?)` — returns the progress metrics for a given year/term.
- `getProgressHistory()` — returns an array of progress points for the chart.
- `getCurrentProgress()` — returns progress for the current academic year/term.
  These getters are used by 4.12's pages and are explicitly marked as stable for 4.13.

### Concern 6: No chart component exists in the School module yet

**Problem:** The School module has not used Chart.js before. The dashboard currently uses plain QCards and QTables. Adding the first chart sets a pattern for the module.

**Impact:** Wrong chart import pattern (e.g., importing Chart.js at the top level) can break SSR or bloat the bundle.

**Confirmed decision:** Follow the established lazy-load pattern: `const { Chart, registerables } = await import('chart.js'); Chart.register(...registerables);` inside a client-only `renderChart()` function. Use `shallowRef` for the chart instance and destroy it in `onBeforeUnmount`. Wrap the canvas in a `ClientOnly` component or guard `renderChart()` with a `typeof window !== 'undefined'` check to avoid SSR errors.

### Concern 7: The dashboard is already becoming crowded

**Problem:** `SchoolDashboardPage.vue` already contains stats cards, the At-Risk widget, Class Attendance widget, Learners Overview widget, My Interventions widget, and Quick Links. Adding the Progress to Goal widget must not push the layout over 2 seconds or harm mobile responsiveness.

**Impact:** Story 4.13 requires the dashboard to load within 2 seconds and be mobile-responsive. A heavy new widget could violate that.

**Confirmed decision:** Make the Progress to Goal widget compact (single QCard, ~180px height chart). It should re-use the same calculation data as the Educational Goals page (computed once per store, not per widget). The widget loads its data in parallel with the existing widgets and does not block the rest of the dashboard.

---

## Confirmed Decisions

The following decisions were confirmed by the user after review:

1. **90th percentile = configurable benchmark score threshold.**  
   A learner is counted as "at target" when their current academic-year overall average score is ≥ the configured benchmark score (default 90%). This is not a true statistical percentile; it is the practical interpretation used in the PRD journey.

2. **Goal targets are editable by the Head Teacher.**  
   The Long-Term Goal settings page allows the Head Teacher to edit: goal name, target % of learners, benchmark score, baseline academic year, and target academic year. Sensible defaults are pre-filled.

3. **Quarterly goal report is generated on demand.**  
   A "Generate Quarterly Report" button on the Educational Goals page produces the PDF. No automatic/scheduled generation is required for the MVP.

4. **Headline metric uses the current academic year to date.**  
   The current % of learners at benchmark is computed from all terms in the current academic year that have recorded scores. This allows the metric to improve as more assessments are recorded during the year.

---

## Schema Changes

### 1. New table: `school_long_term_goals`

Add to `server/scripts/setup-appwrite.js` in the School Module Tables section (after `intervention_notes`, before the console log summary).

```javascript
school_long_term_goals: {
  name: 'School Long-Term Goals',
  permissions: permissions,
  columns: [
    {
      key: 'goal_name',
      type: 'string',
      size: 255,
      required: true,
      default: '90% of learners at 90th-percentile benchmark',
    },
    {
      key: 'target_percent_of_learners',
      type: 'double',
      required: true,
      default: 90,
    },
    {
      key: 'target_percentile_score',
      type: 'double',
      required: true,
      default: 90,
    },
    {
      key: 'baseline_academic_year',
      type: 'integer',
      required: true,
    },
    {
      key: 'target_academic_year',
      type: 'integer',
      required: true,
    },
    {
      key: 'is_active',
      type: 'boolean',
      required: true,
      default: true,
    },
    { key: 'notes', type: 'string', size: 1000, required: false },
  ],
  indexes: [
    {
      key: 'idx_school_long_term_goals_active',
      type: 'key',
      columns: ['is_active'],
      orders: ['ASC'],
    },
  ],
},
```

**Rationale:** A dedicated table keeps the goal close to the School module. The `is_active` flag lets the system select the current goal; a boolean index is sufficient because the table will hold only a handful of rows. `target_percent_of_learners` and `target_percentile_score` are `double` to allow decimals (e.g., 85.5%) if needed in the future.

### 2. `DATABASE_SCHEMA.md` — document the new table

Add a `### school_long_term_goals` section under `## School Tables` (after `intervention_notes`, before `School Relationships`). Include:

| Column                       | Type    | Constraints            | Description                                                       |
| ---------------------------- | ------- | ---------------------- | ----------------------------------------------------------------- |
| `goal_name`                  | string  | Required, max 255      | Human-readable goal name                                          |
| `target_percent_of_learners` | double  | Required, default 90   | Target % of active learners meeting the benchmark                 |
| `target_percentile_score`    | double  | Required, default 90   | Benchmark score threshold representing the percentile (e.g., 90%) |
| `baseline_academic_year`     | integer | Required               | First academic year used for progress tracking                    |
| `target_academic_year`       | integer | Required               | Target academic year to reach the goal (baseline + 10)            |
| `is_active`                  | boolean | Required, default true | Whether this goal is the current active goal                      |
| `notes`                      | string  | Optional, max 1000     | Notes                                                             |

**Indexes:** `idx_school_long_term_goals_active` on `(is_active ASC)`.

### 3. No changes to `test_scores`, `learners`, or `school_classes`

Goal progress is computed from existing data. No new columns are needed on those tables.

---

## Acceptance Criteria

### AC1: School Settings — Long-Term Goal Configuration

- [ ] A new "Long-Term Goals" card is added to `SchoolSettingsPage.vue` (after Timetable Templates), linking to `/school/settings/long-term-goals`.
- [ ] The route `/school/settings/long-term-goals` is registered in `src/modules/school/router.js` with `school:admin` permission.
- [ ] A new page `LongTermGoalsSettingsPage.vue` is created at `src/modules/school/pages/LongTermGoalsSettingsPage.vue`.
- [ ] The settings page displays the active goal (or an empty state if none exists) with editable fields:
  - Goal Name
  - Target % of Learners (0–100, default 90)
  - Benchmark Score Threshold (0–100, default 90) — with help text explaining this represents the 90th-percentile target
  - Baseline Academic Year (integer)
  - Target Academic Year (integer, auto-defaults baseline + 10)
  - Active checkbox
  - Notes
- [ ] Validation: target percent and benchmark score must be 0–100; baseline year ≤ target year; target year ≥ current year.
- [ ] Saving creates or updates the active goal row in `school_long_term_goals` via `school-goals-store.js`.
- [ ] Unauthorised users cannot access the settings page (route guard + page-level permission check).

### AC2: Goal Calculation Engine (`school-goals-store.js` + `school-goal-utils.js`)

- [ ] Create `src/modules/school/utils/school-goal-utils.js` with pure, unit-testable functions (no Vue/Pinia dependencies):
  - `computeLearnerOverallAverage(testScores, learnerId, academicYear, termName?)` — returns the mean of per-subject averages for the learner in the given year.
  - `computeProgressForYear(activeLearners, testScores, academicYear, targetScore)` — returns `{ academicYear, atTarget, total, percentAtTarget }`. (Spec originally named this `countLearnersAtTarget`; renamed during implementation for clarity. The full progress object with `currentPercent`, `targetPercent`, `gap`, `yearsRemaining`, `requiredAnnualImprovement`, `projectedOutcome`, `projectionStatus` is assembled by the store's `computeProgress` action, the equivalent of the spec's `computeGoalProgress`.)
  - `computeProgressForPeriod(activeLearners, testScores, academicYear, targetScore, termName?)` — term-aware variant of the above.
  - `computeProgressHistory(activeLearners, testScores, academicTerms, targetScore)` — returns an array of `{ academicYear, termName, percentAtTarget, total, atTarget }` sorted chronologically.
  - `computeYearlyProgress(activeLearners, testScores, targetScore)` — year-level progress points for projection.
  - `computeBreakdownByGrade(...)` / `computeBreakdownBySubject(...)` — per-grade and per-subject breakdowns.
  - `evaluateProjection(currentPercent, targetPercentOfLearners, yearlyProgress, targetYear, currentYear?)` — returns `{ status, projectedOutcome, requiredAnnualImprovement, message }` where status is `'on_track' | 'at_risk' | 'insufficient_data'`.
- [ ] Create `src/modules/school/stores/school-goals-store.js` (Pinia) with:
  - State: `goals`, `activeGoal`, `goalsLoaded`, `isLoading`, `progressCache`.
  - Getters: `getActiveGoal`, `getGoalProgress(academicYear, termName?)`, `getCurrentProgress`, `getProgressHistory`, `getBreakdownByGrade`, `getBreakdownBySubject`.
  - Actions: `fetchGoals`, `saveGoal`, `computeGoalProgress` (caches results for 60 seconds to avoid re-computation on every widget mount).
- [ ] The store loads dependent data (`learners`, `test_scores`, `academic_terms`) via existing stores, not direct API calls, to benefit from existing caches and avoid duplicate requests.
- [ ] All percentages are rounded to one decimal place for display and stored as `number` internally.

### AC3: Educational Goals Dashboard Page (`/school/educational-goals`)

- [ ] Register `/school/educational-goals` in `src/modules/school/router.js` with `school:read` permission.
- [ ] Create `src/modules/school/pages/EducationalGoalsPage.vue`.
- [ ] Page header shows: goal name, current academic year, and last updated time.
- [ ] Key metrics cards (top row):
  - Current % of learners at benchmark
  - Target %
  - Gap (target − current)
  - Years remaining
  - Required annual improvement
  - Projected outcome (with status badge: On Track / At Risk / Insufficient Data)
- [ ] Goal progress chart (Chart.js line chart) showing progress history over academic years/terms. X-axis: year/term label; Y-axis: % of learners at benchmark. Include a dashed target line at `target_percent_of_learners`.
- [ ] Breakdown by grade table: grade level, total active learners, learners at benchmark, % at benchmark, gap.
- [ ] Breakdown by subject table: subject, total learners assessed, learners at benchmark, % at benchmark, gap.
- [ ] Empty state: if no active goal is configured, show a banner with a link to School Settings to configure one.
- [ ] Empty state: if no test scores exist, show "No scores recorded yet. Record test scores to see progress toward the goal." with a link to `/school/classes`.
- [ ] Responsive layout: metrics cards collapse to single column on mobile; chart maintains readable height on small screens.

### AC4: School Dashboard Widget — Progress to Goal

- [ ] Create `src/modules/school/components/ProgressToGoalWidget.vue`.
- [ ] Add the widget to `SchoolDashboardPage.vue` in the stats/widget grid (recommended placement: after the stats cards, in a `col-12 col-md-6` or `col-12` row depending on final layout).
- [ ] Widget shows:
  - Compact headline: "X% of learners at benchmark (target: 90%)"
  - A small progress bar (Quasar `q-linear-progress`) coloured by status.
  - A one-line status: "On track" / "At risk" / "Insufficient data".
  - A "View Goals" link to `/school/educational-goals`.
- [ ] Widget reuses `school-goals-store.getCurrentProgress()` so it does not duplicate calculation logic.
- [ ] Widget height should not exceed ~220px and should not block dashboard load.
- [ ] Skeleton loader while data is loading.

### AC5: Quarterly Goal Review Report (PDF Export)

- [ ] On `EducationalGoalsPage.vue`, add a "Generate Quarterly Report" button (visible to users with `school:write` or `school:admin`).
- [ ] Clicking the button generates a PDF using the existing `ReportExportService` / `jsPDF` + `jspdf-autotable` pattern.
- [ ] Report includes:
  - Header: village name, report title, generated date, academic year/term.
  - Goal summary: current %, target %, gap, years remaining, projected outcome.
  - Progress history table (year/term, % at benchmark, learners at benchmark, total learners).
  - Breakdown by grade table.
  - Breakdown by subject table.
  - Footer: page numbers and "Generated by Village Management System".
- [ ] The report filename is `educational-goals-report-{year}-{term}-{date}.pdf`.
- [ ] If data is insufficient, the PDF still generates but the projection section says "Insufficient historical data for projection."

### AC6: Navigation and Access Control

- [ ] Add "Educational Goals" to the School section of `MainLayout.vue` navigation (icon `trending_up`), gated on `school:read`.
- [ ] Add "Educational Goals" to the Quick Links card on `SchoolDashboardPage.vue`, linking to `/school/educational-goals`.
- [ ] Add "Long-Term Goals" to the School Settings hub card grid linking to `/school/settings/long-term-goals`, gated on `school:admin`.
- [ ] Ensure all new routes respect the existing `requiresPermission` meta guards.

### AC7: Sample Data and Seeding

- [ ] Update `server/functions/seedAllData/src/main.js` (Phase 4 — School) to create one active `school_long_term_goals` row after `school_classes` and `test_scores` are seeded.
- [ ] Defaults for seeded goal:
  - `goal_name`: "90% of learners at 90th-percentile benchmark"
  - `target_percent_of_learners`: 90
  - `target_percentile_score`: 90
  - `baseline_academic_year`: 2026 (matches seeded academic year)
  - `target_academic_year`: 2036
  - `is_active`: true
- [ ] After seeding, the Educational Goals page should show realistic progress for the seeded scores (expected to be below 90% but above 0%, demonstrating the feature).

### AC8: Documentation and Schema Sync

- [ ] Update `DATABASE_SCHEMA.md` with the new `school_long_term_goals` table section (see Schema Changes).
- [ ] Update `server/scripts/setup-appwrite.js` console log summary to include `school_long_term_goals` in the School module list.
- [ ] Add a comment to `SchoolDashboardPage.vue` noting that the Progress to Goal widget is Story 4.12.

---

## Tasks / Subtasks

- [x] **Task 1 — Schema and seeding (AC1, AC7, AC8)**
  - [x] Add `school_long_term_goals` table to `server/scripts/setup-appwrite.js`.
  - [x] Update `DATABASE_SCHEMA.md`.
  - [x] Seed one active goal in `server/functions/seedAllData/src/main.js`.
  - [x] Update setup script console log summary.

- [x] **Task 2 — Calculation utilities and store (AC2)**
  - [x] Create `src/modules/school/utils/school-goal-utils.js` with pure functions.
  - [x] Create `src/modules/school/stores/school-goals-store.js`.
  - [x] Add JSDoc noting stable API for Story 4.13.

- [x] **Task 3 — School Settings goal configuration (AC1)**
  - [x] Create `src/modules/school/pages/LongTermGoalsSettingsPage.vue`.
  - [x] Add "Long-Term Goals" card to `SchoolSettingsPage.vue`.
  - [x] Register route in `src/modules/school/router.js`.

- [x] **Task 4 — Educational Goals page (AC3, AC5)**
  - [x] Create `src/modules/school/pages/EducationalGoalsPage.vue`.
  - [x] Register route in `src/modules/school/router.js`.
  - [x] Implement metrics cards, chart, grade/subject breakdowns, and PDF export.

- [x] **Task 5 — Dashboard widget (AC4)**
  - [x] Create `src/modules/school/components/ProgressToGoalWidget.vue`.
  - [x] Add widget to `SchoolDashboardPage.vue`.

- [x] **Task 6 — Navigation and access control (AC6)**
  - [x] Add "Educational Goals" to `MainLayout.vue` School navigation.
  - [x] Add "Educational Goals" to `SchoolDashboardPage.vue` Quick Links.
  - [x] Verify route permission guards (routes use existing `requiresPermission` meta).

- [x] **Task 7 — Verification**
  - [x] Run `npm run lint` — passed.
  - [x] Run `npm run build` — passed; SPA compiled successfully.
  - [x] Syntax check `server/scripts/setup-appwrite.js` — passed.
  - [x] Syntax check `server/functions/seedAllData/src/main.js` — passed.
  - [ ] Manual dev-server verification with seeded data (deferred to user/QA environment).
  - [ ] Manual PDF export readability check (deferred to user/QA environment).
  - [ ] Mobile layout check (deferred to user/QA environment).

### Review Findings

Code review run on 2026-07-03 via bmad-code-review workflow (Blind Hunter + Edge Case Hunter + Acceptance Auditor). 30 raw findings → 17 actionable after dedup and triage. 13 dismissed as noise/false positives.

- [x] [Review][Decision] Spec-named utility functions not exported — RESOLVED: updated AC2 in this spec to reflect the actual implementation names (`computeProgressForYear`, `computeProgressForPeriod`, `computeYearlyProgress`, `computeBreakdownByGrade`, `computeBreakdownBySubject`, `evaluateProjection`). The full progress object assembly lives in the store's `computeProgress` action. [auditor]

- [x] [Review][Patch] Multiple active goals: `saveGoal` doesn't deactivate other goals when `is_active: true` [src/modules/school/stores/school-goals-store.js:137-173] — FIXED: `saveGoal` now deactivates all other active goals before creating/updating.
- [x] [Review][Patch] Missing validation: target year ≥ current year [src/modules/school/pages/LongTermGoalsSettingsPage.vue:116-120] — FIXED: added rule `val >= new Date().getFullYear() || 'Must be >= current year'`.
- [x] [Review][Patch] Negative `yearsRemaining` not explicitly handled in `evaluateProjection` [src/modules/school/utils/school-goal-utils.js:312-316] — FIXED: returns explicit `at_risk`/`on_track` status with message when `yearsRemaining <= 0`.
- [x] [Review][Patch] Missing integer validation for year fields [src/modules/school/pages/LongTermGoalsSettingsPage.vue:96-123] — FIXED: added `Number.isInteger(val) || 'Year must be a whole number'` rule.
- [x] [Review][Patch] Year upper bound validation [src/modules/school/pages/LongTermGoalsSettingsPage.vue:96-123] — FIXED: year range now 2001–2100.
- [x] [Review][Patch] Min > 0 validation for target percentages [src/modules/school/pages/LongTermGoalsSettingsPage.vue:68-91] — FIXED: both percentage fields now require `val > 0`.
- [x] [Review][Patch] `is_active` toggle: no warning when deactivating the only active goal [src/modules/school/pages/LongTermGoalsSettingsPage.vue:126-131] — FIXED: confirmation dialog via `onActiveToggle` handler when deactivating the only active goal.
- [x] [Review][Patch] PDF filename missing term part [src/services/ReportExportService.js:837-839] — FIXED: added `termLabel` parameter; caller passes latest history term name; filename now `educational-goals-report-{year}-{term}-{date}.pdf`.
- [x] [Review][Patch] `roundToOneDecimal` NaN guard [src/modules/school/utils/school-goal-utils.js:23-25] — FIXED: returns 0 for null/undefined/NaN input.

- [x] [Review][Defer] Server-side validation for baseline ≤ target [src/modules/school/stores/school-goals-store.js:137-173] — deferred, Appwrite doesn't easily support row-level constraints; client validation is in place
- [x] [Review][Defer] Type coercion validation for Appwrite numeric strings [src/modules/school/stores/school-goals-store.js:216-218] — deferred, schema enforces double/integer types server-side
- [x] [Review][Defer] PDF large dataset pagination [src/services/ReportExportService.js:755-823] — deferred, autoTable handles page breaks automatically; low risk for MVP scale
- [x] [Review][Defer] Timezone handling for `currentYear` [src/modules/school/stores/school-goals-store.js:214] — deferred, `new Date().getFullYear()` is browser-local; academic year is a coarse unit and this matches existing codebase pattern
- [x] [Review][Defer] Stale closure / periodic refresh in `ProgressToGoalWidget` [src/modules/school/components/ProgressToGoalWidget.vue:122-124] — deferred, dashboard widget pattern; 60s cache TTL is acceptable for non-real-time data
- [x] [Review][Defer] `computeScorePercent` null/string handling [src/modules/school/utils/school-utils.js:13-16] — deferred, pre-existing function used across the school module; null score_value → 0 is acceptable
- [x] [Review][Defer] Module-level `useErrorHandler()` call [src/modules/school/stores/school-goals-store.js:40] — deferred, works because `Notify.create` is callable outside setup, but unconventional; matches pattern in other stores

---

## Dev Notes

### Reuse, do not reinvent

- Reuse `computeScorePercent` from `src/modules/school/utils/school-utils.js` for all percentage calculations.
- Reuse `useLearnerStore().activeLearners` for the learner denominator.
- Reuse `useSchoolStore().testScores` for score data; do not add a new API endpoint.
- Reuse `useAcademicTermsStore().availableYears` and `currentYearTerms` for year/term resolution.
- Reuse `useSettingsStore().timezone` for date comparisons if needed.
- Reuse `ReportExportService` for PDF export; do not write a new PDF generator.
- Reuse the existing Chart.js lazy-load pattern from `YieldTrendsWidget.vue` or `TopExpenseCategoriesWidget.vue`.

### File locations and naming

- New store: `src/modules/school/stores/school-goals-store.js`
- New utilities: `src/modules/school/utils/school-goal-utils.js`
- New page: `src/modules/school/pages/EducationalGoalsPage.vue`
- New settings page: `src/modules/school/pages/LongTermGoalsSettingsPage.vue`
- New widget: `src/modules/school/components/ProgressToGoalWidget.vue`
- Updated files: `src/modules/school/router.js`, `src/modules/school/pages/SchoolDashboardPage.vue`, `src/modules/school/pages/SchoolSettingsPage.vue`, `src/layouts/MainLayout.vue`, `server/scripts/setup-appwrite.js`, `DATABASE_SCHEMA.md`, `server/functions/seedAllData/src/main.js`.

### Calculation details

- **Current %:** For the current academic year, compute each active learner's overall average as the mean of their per-subject averages (where each subject average is the mean of all `test_scores` percentages for that subject in the current year). A learner is "at target" if this overall average ≥ `target_percentile_score`. Current % = `atTarget / totalActiveLearners * 100`.
- **Per-subject breakdown:** For each subject, count active learners whose subject average in the current year ≥ `target_percentile_score`, divided by total active learners.
- **Per-grade breakdown:** Group active learners by their class's `grade_level`. For each grade, compute the same current % formula.
- **Projection:** If at least two progress points exist (baseline year and another year), compute the average annual improvement between the last two points. Projected outcome = `currentPercent + (averageAnnualImprovement * yearsRemaining)`. If the projected outcome ≥ target, status is `on_track`; otherwise `at_risk`. If fewer than two points, status is `insufficient_data`.
- **Rounding:** Store raw numbers; round to one decimal place for display. Avoid rounding intermediate values to prevent compounding errors.

### Security and permissions

- Goal configuration (`/school/settings/long-term-goals`) requires `school:admin`.
- Viewing the Educational Goals page and the dashboard widget requires `school:read`.
- Generating the quarterly report requires `school:write`.
- The store actions should not expose raw test scores to users who cannot already view them via existing routes.

### Performance

- The calculation is client-side over already-loaded store data. The `school-goals-store` caches the current progress for 60 seconds to avoid recomputation on every mount.
- The chart is only rendered on the client (lazy Chart.js import + `ClientOnly` or `typeof window` guard).
- The PDF export is triggered on demand, not auto-generated.

### Testing approach

- No automated test framework is configured in the MVP (`package.json` has a no-op test script). Therefore, verification is manual:
  1. Load the School Dashboard and confirm the Progress to Goal widget appears with a realistic percentage from seeded data.
  2. Open `/school/educational-goals` and confirm the chart, metrics cards, and breakdown tables render correctly.
  3. Change the benchmark threshold in School Settings and verify the current % updates.
  4. Click "Generate Quarterly Report" and verify the PDF contains all required sections.
  5. Test on a mobile viewport to ensure the page remains readable.
- The utility functions in `school-goal-utils.js` are written as pure functions so they can be unit-tested when the project adds a test framework later.

---

## Implementation Notes

### Story 4.13 dependency

Story 4.13 (`Learner Progress Reports and School Dashboard Completion`) depends on this story. The `school-goals-store.js` API is intentionally stable:

```javascript
// Stable getters for Story 4.13
getActiveGoal: (state) => { ... },
getGoalProgress: (state) => (academicYear, termName) => { ... },
getCurrentProgress: (state) => { ... },
getProgressHistory: (state) => { ... },
getBreakdownByGrade: (state) => { ... },
getBreakdownBySubject: (state) => { ... },
```

Story 4.13 can safely import `useSchoolGoalsStore()` and call these getters to include goal progress in the full learner progress report and the completed school dashboard.

### Why no separate snapshots table

A separate `school_goal_progress_snapshots` table was considered but rejected for the MVP because:

- Progress can be recomputed deterministically from `test_scores`.
- Adding a snapshots table would require hooks on every test-score save or a scheduled job, both of which are out of scope.
- The quarterly report is generated on demand and does not need to be persisted.

If the village later needs official, immutable snapshots for donor audits, a `school_goal_progress_snapshots` table can be added in a future story without breaking the store API.

---

## References

- PRD Goal #3: "Improve Educational Outcomes" — `docs/PRD.md` lines 77–79.
- PRD FR-11: "Calculate progress toward goal: 90% of learners in 90th percentile by year 10" — `docs/PRD.md` line 206.
- PRD Head Teacher journey, step 8: "Track Toward Long-Term Goal (Quarterly Review)" — `docs/PRD.md` lines 485–496.
- Epic 4.12 acceptance criteria — `docs/epics.md` lines 820–825.
- Existing school dashboard placeholder — `src/modules/school/pages/SchoolDashboardPage.vue` lines 5–6.
- Existing test score store and schema — `src/modules/school/stores/school-store.js`, `server/scripts/setup-appwrite.js` lines 1034–1117.
- Existing academic terms store — `src/modules/school/stores/academic-terms-store.js`.
- Existing Chart.js lazy-load pattern — `src/modules/farm/components/YieldTrendsWidget.vue` lines 107–188.
- Existing PDF export service — `src/services/ReportExportService.js`.
- Existing permission composable — `src/composables/usePermissions.js`.

---

## Dev Agent Record

### Agent Model Used

Adaptive / BMad create-story workflow

### Debug Log References

- None yet.

### Completion Notes List

- Epic 4 implementation reviewed through Story 4.8.
- User confirmed the four implementation decisions: current-active-learners denominator, term-level chart + year-level projection, `exportEducationalGoalsToPDF` in `ReportExportService.js`, and compact col-md-4 widget below stats row.
- Implemented `school_long_term_goals` table schema, seeding, and `DATABASE_SCHEMA.md` documentation.
- Implemented `school-goal-utils.js` with pure functions and `school-goals-store.js` with a stable public API for Story 4.13.
- Implemented `LongTermGoalsSettingsPage.vue`, `EducationalGoalsPage.vue` (with Chart.js and PDF export), and `ProgressToGoalWidget.vue`.
- Integrated navigation in `MainLayout.vue` and `SchoolDashboardPage.vue` Quick Links.
- Added `exportEducationalGoalsToPDF()` to `ReportExportService.js` following the existing `exportFarmReportToPDF()` pattern.
- Verified with `npm run lint` (passed) and `npm run build` (passed, SPA compiled successfully).
- No automated tests added (project test script is a no-op); manual verification steps deferred to QA environment.

### File List

- New files created:
  - `src/modules/school/stores/school-goals-store.js`
  - `src/modules/school/utils/school-goal-utils.js`
  - `src/modules/school/pages/EducationalGoalsPage.vue`
  - `src/modules/school/pages/LongTermGoalsSettingsPage.vue`
  - `src/modules/school/components/ProgressToGoalWidget.vue`
- Existing files modified:
  - `src/modules/school/router.js`
  - `src/modules/school/pages/SchoolDashboardPage.vue`
  - `src/modules/school/pages/SchoolSettingsPage.vue`
  - `src/layouts/MainLayout.vue`
  - `src/services/ReportExportService.js`
  - `server/scripts/setup-appwrite.js`
  - `DATABASE_SCHEMA.md`
  - `server/functions/seedAllData/src/main.js`
