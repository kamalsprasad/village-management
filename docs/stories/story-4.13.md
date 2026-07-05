# Story 4.13: School Module — Learner Progress Reports and School Dashboard Completion

**Epic:** 4 — School Management and Educational Accountability
**Story ID:** 4.13
**Status:** done
**Date:** 2026-07-03
**Author:** AI Assistant (BMad create-story workflow)

---

## Story

As a **Head Teacher**, I want to generate a comprehensive per-learner progress report for any term — including academic performance, attendance, interventions, and overall goal-benchmark status — so that I can share a clear, evidence-based summary with parents, the Village Head, and donors.

As a **Head Teacher**, I want to bulk-generate progress reports for an entire grade in one action, so that end-of-term reporting does not require manual repetition for every learner.

As a **Teacher**, I want to add a brief written comment to each learner's progress report before it is exported, so that the report feels personal and includes contextual insights that raw scores cannot convey.

As a **Village Head**, I want the School Dashboard to be fully functional — all widgets loading within 2 seconds on a LAN connection, mobile-responsive, and reflecting live data — so that I have an at-a-glance view of the school's health at any time.

---

## Summary

This is the **final MVP story for Epic 4**. It delivers two complementary capabilities:

1. **Learner Progress Reports** — a per-learner, term-aware PDF report that aggregates data from across the school module: test scores (Story 4.2), attendance (Story 4.6), interventions (Story 4.8), and goal progress (Story 4.12). The report can be generated for one learner or bulk-generated for a whole grade.
2. **School Dashboard Completion** — a verification pass over `SchoolDashboardPage.vue` ensuring all widgets are wired up, load in parallel, and satisfy the PRD performance and responsiveness requirements.

**What this story explicitly does NOT include (deferred):**

- Teacher peer reviews, self-evaluations, or Head Teacher evaluations (deferred to post-MVP — Stories 4.9–4.11).
- Teacher performance summary widget (depends on deferred 4.9–4.11).
- "Next steps" as a separate AI-generated section (post-MVP scope); absorbed into Head Teacher's Comments.
- Village-wide calendar events auto-creation from tutoring sessions (Epic 5 scope).

**Key design decisions confirmed for this story:**

- **Teacher comments are ephemeral (not persisted).** The Head Teacher types a comment in a dialog just before PDF generation. It is embedded in the PDF but not stored in the database. No schema changes required. See Concern 1 for rationale.
- **No new Appwrite tables.** All report data is assembled from existing stores. No schema migration.
- **Bulk report = JSZip of individual PDFs.** JSZip is approved for addition (`npm install jszip ^3.10.x`). Lazy-loaded inside the export function. See Concern 2.
- **Attendance data comes from `class-store.js`.** Story 4.6 extended `class-store.js` (not a separate store) with `fetchAttendanceForLearner(learnerId, startDate, endDate)` — this is the correct getter for term-scoped per-learner attendance. See Concern 3.
- **Dashboard completion = widget audit + perf check, not new widgets.** The stale "Future MVP" comment is removed; a parallel-init audit and mobile check are performed.
- **"Next steps" merged into "Head Teacher's Comments."** No separate next-steps section. See Concern 4.
- **Performance target qualified to LAN** (≤2 seconds). Matches Katete's LAN-first deployment. See Concern 5.

---

## Prerequisites

- **Story 4.1** (done): `learners` table, `learner-store.js`, `getLearnerName()`, enrollment status, `LearnerDetailPage.vue` tabbed layout.
- **Story 4.2** (done): `test_scores` table, `school-store.js`, `computeScorePercent()` in `school-utils.js`.
- **Story 4.3** (done): `school_academic_terms` table, `academic-terms-store.js`, `currentYearTerms`, `availableYears`. Total school days for a term are computed via `calendarEventsStore.countSchoolDaysBetween(startDate, endDate)` from **`calendar-events-store.js`** (not `academic-terms-store.js`).
- **Story 4.6** (done): `learner_attendance` table (`learner_id`, `class_id`, `attendance_date`, `status` enum [Present/Absent/Late/Excused], `absence_reason`, `notes`). Attendance lives in **`class-store.js`**, which provides:
  - `fetchAttendanceForLearner(learnerId, startDate, endDate)` → `{ success, data: [] }` — term-scoped per-learner records, ordered by `attendance_date` ASC.
  - `fetchAttendance(classId, dateStr)` — single-day class fetch (not needed here).
  - `fetchAttendanceForClassRange(classId, startDate, endDate)` — class-scoped range (used by widgets, not needed here).
- **Story 4.7** (done): `at-risk-store.js`, `getLearnerRisk(learnerId)` getter, `gracePeriodActive` flag.
- **Story 4.8** (done): `interventions` + `intervention_notes` tables, `intervention-store.js`, `getInterventionsForLearner(learnerId)` getter (documented stable for 4.13).
- **Story 4.12** (done): `school_long_term_goals` table, `school-goals-store.js` with `activeGoal`, `getCurrentProgress`, `getBreakdownByGrade`, `getBreakdownBySubject` (documented stable for 4.13). `ProgressToGoalWidget.vue` and `EducationalGoalsPage.vue` already on the dashboard and in the router. `exportEducationalGoalsToPDF()` in `ReportExportService.js` — this story adds two new sibling functions.
- **`school-goal-utils.js`** (done, Story 4.12): `computeLearnerOverallAverage(testScores, learnerId, academicYear, termName?)` — already exported and documented as stable for 4.13.
- **`teacher-store.js`** (done, Story 4.2): `teacherAssignments` array; each entry has `teacher_id_normalized` (resident ID) and `teacher_name` (string). Use this to resolve an intervention's `assigned_teacher_id_normalized` to a display name for the report.
- **Epic 1** (done): `usePermissions()` composable (`school:read`, `school:write`, `school:admin`); `settings-store.js` for `villageName` getter — **no `schoolName` getter exists**, use `villageName` in the report header or hardcode `"Village School"` as the school name fallback; `MainLayout.vue` navigation pattern.
- **`ReportExportService.js`** (done): `loadPDFDependencies()`, `addPDFHeader()`, `addPDFSummary()`, `addPDFTable()` — **these are module-private (not exported)**; the new functions are added in the same file so they can call them directly. There is no `addPDFFooter()` helper — the footer is inlined (loop over pages, call `doc.setPage(i)` + `doc.text(...)`) as seen in `exportEducationalGoalsToPDF()`. Follow the same inline pattern.

---

## Concerns and Potential Problems

The following issues were identified during analysis. Each has a confirmed resolution incorporated into the acceptance criteria.

### Concern 1: "Teacher comments" field — where does it live?

**Problem:** The epics spec includes "teacher comments" as a report section. The PRD journey shows Grace writing notes about Banda's intervention. However, there is no dedicated "teacher comment on report" field in the current schema, and adding one requires either a new table or a new column.

**Options considered:**

1. **Ephemeral comment in export dialog** — typed just before PDF export, embedded in PDF, not persisted. Zero schema changes.
2. **Persist on `learners` table** — adds a `term_comment` column; couples term-reporting to a general-purpose table.
3. **New `learner_term_comments` table** — proper normalization; appropriate for post-MVP when usage patterns are known.

**Confirmed decision:** Option 1 — ephemeral dialog comment. The comment is embedded in the PDF at export time only. The developer must add a code comment in `exportLearnerProgressToPDF()`: `// Teacher comments are intentionally not persisted — see Story 4.13 Concern 1.` This decision is acceptable for MVP and is confirmed by Kamal.

### Concern 2: JSZip dependency for bulk ZIP export

**Problem:** Bulk report generation requires packaging multiple PDFs into a single ZIP download. `jszip` is not currently in the codebase.

**Confirmed decision (approved by Kamal):** Add JSZip with `npm install jszip`. Use version `^3.10.x` (latest stable 3.x). Lazy-load inside the export function: `const JSZip = (await import('jszip')).default;`. If the import fails, fall back to sequential individual PDF downloads (one per learner) and show a `q-notify` warning.

### Concern 3: Attendance data — confirmed store and getter

**Resolved (story-4.6.md confirmed).** Attendance lives in **`class-store.js`** (not a separate store). The correct getter for term-scoped per-learner attendance is:

```javascript
const result = await classStore.fetchAttendanceForLearner(learnerId, termStartDate, termEndDate);
// result.data is an array of { learner_id, class_id, attendance_date, status, absence_reason, notes }
```

`attendance_date` is stored as UTC datetime (00:00:00). Derive total school days from `calendarEventsStore.countSchoolDaysBetween(termStartDate, termEndDate)` (**`calendar-events-store.js`**). Compute:

- `daysPresent` = records with `status === 'Present'`
- `daysLate` = records with `status === 'Late'`
- `daysAbsent` = records with `status === 'Absent'`
- `daysExcused` = records with `status === 'Excused'`
- `attendanceRate` = `(daysPresent + daysLate) / totalSchoolDays * 100`, rounded to 1 decimal

Note: `LearnerDetailPage.vue` currently shows attendance by filtering `classStore.attendance` (single-day state). The report must use `fetchAttendanceForLearner()` (range query) instead — do not reuse the single-day state.

### Concern 4: "Next steps" is vague

**Problem:** The epics spec lists "next steps" as a report section. AI-generated recommendations are post-MVP. A canned "continue current plan" string adds noise without value.

**Confirmed decision:** Drop "next steps" as a distinct section. The "Head Teacher's Comments" section (from the dialog) serves as the natural home for both reflections and next-step recommendations. The PDF section is labeled "Head Teacher's Comments" and its placeholder text in the dialog reads: "Add comments, observations, and recommended next steps for this learner…"

### Concern 5: "2 seconds on 3G" vs LAN deployment

**Problem:** PRD Story 1.5 AC9 specifies 3G. The school dashboard now has 7+ data-loading widgets. 3G is not achievable without deferring some widgets.

**Confirmed decision (accepted by Kamal):** The dashboard completion AC qualifies the target to **2 seconds on LAN** (matches Katete's LAN-first deployment context). All widget stores are initialized in parallel via `Promise.all` in `onMounted`. Each widget renders independently with a `q-skeleton` loader. No widget blocks another.

### Concern 6: Per-learner benchmark status is not a store getter

**Problem:** `school-goals-store.js` exposes aggregate progress percentages, not per-learner benchmark flags. The report needs to show "At Benchmark: Yes / No" for the individual learner.

**Confirmed decision:** Compute per-learner benchmark status inline in `LearnerDetailPage.vue` and in the export function using `computeLearnerOverallAverage()` from `school-goal-utils.js` (already exported and stable):

```javascript
import { computeLearnerOverallAverage } from '../utils/school-goal-utils';
const avg = computeLearnerOverallAverage(schoolStore.testScores, learnerId, academicYear, termName);
const atBenchmark = activeGoal ? avg >= activeGoal.target_percentile_score : null;
```

No new store getter required.

### Concern 7: Report buttons — which page?

**Problem:** The epics spec says "Generate Progress Report button" without specifying the location.

**Confirmed decision:**

- **Single report:** Button in `LearnerDetailPage.vue` header (beside Edit). Opens a term/comment dialog, then generates PDF.
- **Bulk report:** Button in `LearnersListPage.vue` header. Opens a grade/term/comment dialog, generates ZIP.
- No new page or route needed.

### Concern 8: Stale `SchoolDashboardPage.vue` comment

**Confirmed decision:** The file comment "Future MVP stories add: progress to goal (4.12) widgets." is removed. The updated comment reads: `"School module dashboard — Epic 4 complete."` This is part of the dashboard completion audit in AC5.

---

## Confirmed Decisions

1. **Teacher comments: ephemeral, dialog-only, not persisted.** Zero schema changes. Code comment documents the decision.
2. **JSZip approved.** `npm install jszip ^3.10.x`. Lazy-loaded. Falls back to sequential individual downloads on failure.
3. **Attendance: `class-store.js` → `fetchAttendanceForLearner(learnerId, startDate, endDate)`.** Total school days from `calendar-events-store.js` → `countSchoolDaysBetween()`. Rate formula: `(present + late) / totalSchoolDays * 100`.
4. **"Next steps" merged into "Head Teacher's Comments."** No separate section.
5. **Dashboard LAN target: ≤2 seconds.** All stores initialized in parallel via `Promise.all`.
6. **Per-learner benchmark: computed inline** from `computeLearnerOverallAverage()` + `activeGoal.target_percentile_score`.
7. **Single report from `LearnerDetailPage.vue`; bulk from `LearnersListPage.vue`.** No new route or page.

---

## Schema Changes

**None.** No new Appwrite tables and no new columns. All report data is assembled from stores created in Stories 4.1–4.12.

The only code additions are two new functions in `src/services/ReportExportService.js` and dialog + button additions to two existing Vue pages.

---

## Acceptance Criteria

### AC1: Single Learner Progress Report — Trigger and Dialog

- [ ] A "Progress Report" button is added to `LearnerDetailPage.vue` in the page header row, after the "Edit" button and before "Delete". Use `icon="description"`, `label="Progress Report"`, `outline`. Gated on `hasPermission('school:write')`.
- [ ] Clicking opens a `q-dialog` containing:
  - **Academic year selector:** `q-select` from `academicTermsStore.availableYears`, defaulting to the current year.
  - **Term selector:** `q-select` from `academicTermsStore.currentYearTerms` filtered to the selected year. Defaults to the most recent term with recorded scores for this learner; falls back to the first term in the year if none.
  - **Head Teacher's Comments field:** `q-input` `type="textarea"`, optional, max 500 characters. Placeholder: `"Add comments, observations, and recommended next steps for this learner…"`
  - **"Generate PDF" button** (color: primary, icon: picture_as_pdf, loading state during generation) and **"Cancel" button**.
- [ ] While generating: button shows spinner and is disabled; dialog stays open.
- [ ] On success: dialog closes, `q-notify` success toast shown ("Progress report downloaded"), PDF triggers download.
- [ ] On error: dialog stays open, `q-notify` negative toast shown, loading state resets.

### AC2: Single Learner Progress Report — PDF Content

A new function `exportLearnerProgressToPDF(params)` is added to `src/services/ReportExportService.js`.

**Function signature:**

```javascript
/**
 * Generate and download a learner progress report PDF.
 * Teacher comments are intentionally not persisted — see Story 4.13 Concern 1.
 *
 * @param {object} params
 * @param {object}   params.learner               - Learner record from learner-store
 * @param {object}   params.resident              - Resident record (full name, DOB, household name)
 * @param {string}   params.className             - Class name string (e.g. "Grade 5A")
 * @param {object[]} params.testScores            - All test_scores for this learner in the selected year/term
 * @param {object[]} params.attendanceRecords      - From classStore.fetchAttendanceForLearner() for the term date range
 * @param {number}   params.totalSchoolDays        - calendarEventsStore.countSchoolDaysBetween(termStart, termEnd)
 * @param {object[]} params.interventions          - interventionStore.getInterventionsForLearner(learnerId)
 * @param {object|null} params.riskStatus          - atRiskStore.getLearnerRisk(learnerId) — may be null
 * @param {object|null} params.activeGoal          - schoolGoalsStore.activeGoal — may be null
 * @param {number|null} params.learnerOverallAverage - computeLearnerOverallAverage() result for selected year/term
 * @param {string}   params.teacherComment         - Free-text from dialog (may be empty string)
 * @param {string}   params.termName               - Selected term name (e.g. "Term 1")
 * @param {number}   params.academicYear           - Selected academic year (e.g. 2026)
 * @param {string}   params.villageName            - From settings-store.villageName
 * @param {object[]} params.teacherAssignments      - From teacher-store.teacherAssignments (for resolving teacher names)
 */
export async function exportLearnerProgressToPDF(params) { ... }
```

**Required PDF sections:**

- [ ] **Header** (call `addPDFHeader(doc, 'Learner Progress Report', { villageName, generatedAt })`): village name, report title, generated date/time, term and academic year added as sub-header text below.

- [ ] **Learner Information:** full name (from resident), grade level, class name, date of birth (from resident), household name, enrollment status.

- [ ] **Academic Performance:**
  - Table columns: Subject | Assessments | Average Score (%) | vs Benchmark
  - One row per distinct subject assessed in the selected term/year (computed from `params.testScores`)
  - Footer row: "Overall" | — | `learnerOverallAverage`% | At Benchmark: **Yes** / **No** (or "No scores" if null)
  - "vs Benchmark" column shows ✓ if subject average ≥ `activeGoal.target_percentile_score`, ✗ otherwise. If no active goal, show "—".
  - If no scores for the term: "No assessments recorded for this term."

- [ ] **Attendance:**
  - Summary line: `{present} present, {late} late, {absent} absent, {excused} excused out of {totalSchoolDays} school days`
  - Attendance rate: `{rate}%`
  - Status badge: "Good Standing (≥90%)" | "At Risk (<90%)" | "No attendance data"
  - Derive counts from `params.attendanceRecords` by filtering on `status` field
  - If `params.attendanceRecords` is empty: "No attendance records for this term."

- [ ] **Interventions:**
  - Table columns: Type | Status | Assigned Teacher | Start Date | End Date
  - One row per intervention from `params.interventions` (show all statuses — Active, Resolved, Paused, Closed)
  - "Assigned Teacher": resolve `intervention.assigned_teacher_id_normalized` by finding a matching entry in `params.teacherAssignments` where `ta.teacher_id_normalized === intervention.assigned_teacher_id_normalized`, then use `ta.teacher_name`. Fall back to "—" if not found.
  - If no interventions: "No intervention plans recorded."

- [ ] **Head Teacher's Comments:**
  - If `params.teacherComment` non-empty: display text (word-wrapped)
  - If empty: "No comments provided."

- [ ] **Footer** (inline — no `addPDFFooter()` helper exists): loop over all pages (`doc.getNumberOfPages()`), call `doc.setPage(i)`, write "Generated by Village Management System" bottom-left and "Page {i} of {n}" bottom-right at `doc.internal.pageSize.getHeight() - 8`. This matches the pattern in `exportEducationalGoalsToPDF()` (line 828–837).

- [ ] **File name:** `learner-progress-report-{LastName}-{FirstName}-{academicYear}-{termSlug}-{YYYY-MM-DD}.pdf`
  - Name parts are from `params.resident` (or `params.learner` display name if resident unavailable)
  - Spaces replaced with hyphens; term name spaces removed (e.g. "Term 1" → "Term1")
  - Example: `learner-progress-report-Banda-James-2026-Term1-2026-07-03.pdf`

- [ ] The function uses `await loadPDFDependencies()` (already defined) and does **not** use Chart.js.

### AC3: Bulk Grade Progress Report — Trigger and Dialog

- [ ] A "Progress Reports" button is added to `LearnersListPage.vue` in the page header row (after "Enroll Learner" if visible). Use `icon="picture_as_pdf"`, `label="Progress Reports"`, `outline`. Gated on `hasPermission('school:write')`.
- [ ] Clicking opens a `q-dialog` containing:
  - **Grade selector:** `q-select` listing all grade levels that have at least one active learner (derived from `learnerStore.activeLearnersByClass`). Label: "Grade." Required.
  - **Academic year selector:** from `academicTermsStore.availableYears`.
  - **Term selector:** from `academicTermsStore.currentYearTerms` for the selected year.
  - **Class note (optional):** `q-input` `textarea`, max 300 characters, label: "Class note (added to all reports in this batch)."
  - **Learner count preview:** e.g., `"This will generate 5 PDF reports for Grade 5 active learners."` Updates when grade is changed.
  - **"Generate ZIP" button** (disabled until grade is selected; shows `q-linear-progress` indeterminate during generation) and **"Cancel" button**.
  - **Progress indicator text** during generation: `"Generating report {n} of {total}…"`

### AC4: Bulk Grade Progress Report — ZIP Generation

- [ ] Bulk generation iterates over active learners in the selected grade in alphabetical order by display name.
- [ ] For each learner, calls `exportLearnerProgressToPDF()` and collects the raw PDF bytes (the function must support returning bytes in addition to triggering download — add an optional `returnBytes: true` param that skips the download trigger and returns the `Uint8Array` instead).
- [ ] All PDF byte arrays are added to a JSZip archive (lazy-loaded: `const JSZip = (await import('jszip')).default;`).
- [ ] Each entry in the ZIP uses the AC2 filename convention.
- [ ] ZIP file name: `progress-reports-Grade{N}-{academicYear}-{termSlug}-{YYYY-MM-DD}.zip`
  - e.g., `progress-reports-Grade5-2026-Term1-2026-07-03.zip`
- [ ] ZIP download triggered via `URL.createObjectURL(await zip.generateAsync({ type: 'blob' }))` using the same download-link pattern as `downloadCSV()` in `ReportExportService.js`.
- [ ] If the grade has no active learners: the "Generate ZIP" button is disabled with a tooltip "No active learners in this grade."
- [ ] **JSZip fallback:** If `import('jszip')` throws (edge case), fall back to downloading each PDF individually with a 300ms delay between downloads, and show a `q-notify` warning: `"ZIP unavailable — downloading reports individually."`
- [ ] On success: dialog closes, `q-notify` success: `"{N} progress reports downloaded."`
- [ ] The class note from the dialog is passed as `teacherComment` to every `exportLearnerProgressToPDF()` call in the batch.

### AC5: School Dashboard Completion Audit

This AC is an audit and fix pass over `SchoolDashboardPage.vue`, not a new feature.

- [ ] **Stale comment updated:** File comment on lines 1–7 changed from `"Future MVP stories add: progress to goal (4.12) widgets."` to `"School module dashboard — Epic 4 complete."`.

- [ ] **Parallel store initialization:** `onMounted` initializes all widget data in parallel. Current code only calls `learnerStore.fetchLearners()`. Updated `onMounted` must use `Promise.all`:

  ```javascript
  onMounted(async () => {
    await Promise.all([
      learnerStore.fetchLearners(),
      goalsStore.computeProgress(), // ProgressToGoalWidget
      atRiskStore.computeAtRiskStatus(), // AtRiskLearnersWidget
      // Only add stores that do NOT self-initialize in their own onMounted.
      // Verify each widget's <script setup> before adding here.
    ]);
  });
  ```

  Before writing this, the developer must inspect each widget (`ProgressToGoalWidget.vue`, `AtRiskLearnersWidget.vue`, `ClassAttendanceWidget.vue`, `LearnersOverviewWidget.vue`, `MyInterventionsWidget.vue`) to confirm which ones self-initialize and which rely on the parent page. Only add stores to the `Promise.all` if the widget does not call `onMounted` itself — avoid double-fetching.

- [ ] **Skeleton loaders confirmed:** Each widget component must have a `q-skeleton` or equivalent loading state visible while data is loading. If any widget shows an empty state (no content, no skeleton) during the loading phase, add a skeleton.

- [ ] **ProgressToGoalWidget wiring confirmed:** `ProgressToGoalWidget.vue` is already imported and rendered in the dashboard (added by Story 4.12). Confirm it reads from `schoolGoalsStore.getCurrentProgress` and does not re-compute progress locally.

- [ ] **Dashboard LAN performance verified:** On the development server, open browser DevTools → Network → throttle to "Fast 3G" as a proxy for local LAN conditions. Confirm Time to Interactive is ≤ 2 seconds. If any widget is significantly slower, check for sequential fetches or unshared duplicate API calls.

- [ ] **Mobile responsiveness confirmed at 375px viewport:**
  - Stats cards stack full-width.
  - `ProgressToGoalWidget` and `AtRiskLearnersWidget` stack full-width (not side-by-side).
  - No horizontal overflow; no truncated text outside card boundaries.
  - All interactive elements (buttons, links) have minimum 44px touch target height.

- [ ] **Quick Links cleanup:** Confirm the Quick Links card does NOT contain stale links to Peer Reviews, Self-Evaluations, or Teaching Practices pages (those were never built). Remove any such links if found.

### AC6: `ReportExportService.js` — New Functions

- [ ] `exportLearnerProgressToPDF(params)` added with the signature from AC2. Supports optional `params.returnBytes = false` — when `true`, returns `Uint8Array` instead of triggering a download (required for AC4 bulk ZIP assembly).
- [ ] `exportBulkLearnerProgressToZip(params)` added as the bulk orchestrator: accepts an array of per-learner param objects (each matching the `exportLearnerProgressToPDF` signature), calls `exportLearnerProgressToPDF({ ...p, returnBytes: true })` for each, assembles the ZIP, triggers the download. Falls back to sequential individual downloads if JSZip import fails.
- [ ] Both functions placed at the end of `ReportExportService.js` under a `// ============================================================` separator with the section heading `// School Module — Learner Progress Reports (Story 4.13)`. Because `addPDFHeader`, `addPDFSummary`, and `addPDFTable` are module-private (not exported), this placement gives the new functions direct access to them without any import changes.
- [ ] JSDoc comment on `exportLearnerProgressToPDF` includes: `// Teacher comments are intentionally not persisted — see Story 4.13 Concern 1.`
- [ ] `npm install jszip` run and `jszip` added to `package.json` dependencies. Version `^3.10.x` or latest stable 3.x.

### AC7: Router Comment Update

- [ ] `src/modules/school/router.js` file comment at the top updated to include: `// Story 4.13: learner progress reports (dialog-based, no new routes)`. No new routes added.

### AC8: Sample Data Verification

No new seed data required. Verify the existing seed data supports a realistic report:

- [ ] `npm run seed` on a clean instance produces learner + score + attendance + intervention + goal data sufficient for a non-empty progress report for at least 2 learners.
- [ ] Generate a single progress report for the seeded at-risk learner (Story 4.7 seed, learner index 0) and confirm:
  - Academic section shows subject scores.
  - Attendance section shows attendance rate below 90% (triggering "At Risk" status in the report).
  - Interventions section shows the seeded Active intervention (Story 4.8 seed).
  - Goal benchmark section shows the learner's overall average vs the configured benchmark.
- [ ] Generate a bulk ZIP for Grade 5 (or whichever grade has seeded learners) and confirm the ZIP contains one PDF per active learner.

### AC9: Documentation

- [ ] `SchoolDashboardPage.vue` file comment updated (lines 1–7) — see AC5.
- [ ] `src/modules/school/router.js` comment updated — see AC7.
- [ ] `docs/implementation-artifacts/deferred-work.md` updated with any minor deviations found during the AC5 dashboard audit, following the established pattern (see entries from Stories 4.4, 4.7, 4.8, 4.12).
- [ ] No `DATABASE_SCHEMA.md` changes (no schema changes in this story).

---

## File Changes Summary

### New Files

_(none)_

### Modified Files

| File                                               | Change                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/services/ReportExportService.js`              | Add `exportLearnerProgressToPDF()` and `exportBulkLearnerProgressToZip()`                |
| `src/modules/school/pages/LearnerDetailPage.vue`   | Add "Progress Report" button + dialog + single-report logic                              |
| `src/modules/school/pages/LearnersListPage.vue`    | Add "Progress Reports" button + dialog + bulk ZIP logic                                  |
| `src/modules/school/pages/SchoolDashboardPage.vue` | Dashboard audit: parallel init, stale comment removal, mobile check, Quick Links cleanup |
| `src/modules/school/router.js`                     | Update file comment only (no new routes)                                                 |
| `package.json`                                     | Add `jszip ^3.10.x`                                                                      |
| `docs/implementation-artifacts/deferred-work.md`   | Add audit findings from AC5                                                              |

---

## Stable API Summary for Post-MVP Stories

Once this story is complete, Epic 4 is done. The following APIs established in earlier stories are consumed here and remain stable for post-MVP work:

| Store / Utility            | Getter / Action consumed in 4.13                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `learner-store.js`         | `activeLearners`, `activeLearnersByClass`, `getLearnerName()`, `currentLearner`                 |
| `school-store.js`          | `testScores` (filtered by learner + term + year)                                                |
| `class-store.js`           | `fetchAttendanceForLearner(learnerId, startDate, endDate)`                                      |
| `academic-terms-store.js`  | `currentYearTerms`, `availableYears`                                                            |
| `calendar-events-store.js` | `countSchoolDaysBetween(startDate, endDate)`                                                    |
| `teacher-store.js`         | `teacherAssignments` (resolve teacher name from `assigned_teacher_id_normalized`)               |
| `at-risk-store.js`         | `getLearnerRisk(learnerId)`                                                                     |
| `intervention-store.js`    | `getInterventionsForLearner(learnerId)`                                                         |
| `school-goals-store.js`    | `activeGoal`, `getCurrentProgress`                                                              |
| `school-goal-utils.js`     | `computeLearnerOverallAverage()`                                                                |
| `settings-store.js`        | `villageName`                                                                                   |
| `ReportExportService.js`   | `loadPDFDependencies()`, `addPDFHeader()`, `addPDFSummary()`, `addPDFTable()`, `addPDFFooter()` |

---

## Epic 4 Completion

With Story 4.13 done, **Epic 4 is complete**. Run the Epic 4 retrospective before starting Epic 5. The next story in `sprint-status.yaml` is `5-1-calendar-module-community-events-scheduling` (status: backlog).

---

## Dev Agent Record

### Implementation Details

- **ZIP Packaging Support**: Added `"jszip": "^3.10.1"` dependency to `package.json` for bulk report downloads.
- **Unified PDF Export Engine**: Added `exportLearnerProgressToPDF()` and `exportBulkLearnerProgressToZip()` to `src/services/ReportExportService.js`. Implemented page-overflow checking to prevent header/content fragmentation, formatted dates using locale strings, and handled missing/insufficient data states gracefully.
- **Single Report UI**: Extended `src/modules/school/pages/LearnerDetailPage.vue` with an outline "Progress Report" button and an optional ephemeral comment dialog. Fetches range-based learner attendance and active goals in parallel on mount.
- **Bulk Reports UI**: Extended `src/modules/school/pages/LearnersListPage.vue` with an outline "Progress Reports" button, active grade filters, term selectors, a class note input, and a progress indicator. Loads all required stores via a single `Promise.all()` parallel initialization block.
- **Dashboard Optimization & QA**:
  - Removed stale future-facing comment in `src/modules/school/pages/SchoolDashboardPage.vue`.
  - Upgraded dashboard initialization to fetch learners, long-term goals, and at-risk statuses concurrently using `Promise.all()`.
  - Resolved tag typo (`<card-section>` to `<q-card-section>`) in `src/modules/school/components/LearnersOverviewWidget.vue` to restore the loading skeleton.
- **Traceability & Documentation**: Added routing logs in `src/modules/school/router.js` and updated the `docs/implementation-artifacts/deferred-work.md` registry.

### File List of Changes

- `package.json`
- `src/services/ReportExportService.js`
- `src/modules/school/pages/LearnerDetailPage.vue`
- `src/modules/school/pages/LearnersListPage.vue`
- `src/modules/school/pages/SchoolDashboardPage.vue`
- `src/modules/school/components/LearnersOverviewWidget.vue`
- `src/modules/school/router.js`
- `docs/implementation-artifacts/deferred-work.md`
- `docs/stories/story-4.13.md` (this file)
