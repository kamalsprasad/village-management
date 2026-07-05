# Story 4.2: School Module — Test Score Recording (Bulk Entry by Grade)

**Epic:** 4 — School Management and Educational Accountability  
**Story ID:** 4.2  
**Status:** ready-for-dev  
**Date:** 2026-06-09  
**Author:** AI Assistant

---

## Story

As a **Teacher**, I want to record test scores for an entire grade in a spreadsheet-style interface, so that I can efficiently track learner academic performance without entering scores one by one.

As a **Head Teacher**, I want to view class performance summaries and individual learner score histories, so that I can identify learners who need support and monitor overall grade progress.

---

## Summary

This story makes the School module’s **Academics** tab functional by introducing `test_scores` storage, a bulk-entry UI for teachers, and read-only performance views for both the **Learner Detail** page and a new **Class Performance** summary.

It also introduces the **`teacher_assignments`** table (deferred from Story 4.1) so that runtime grade-level authorization can be enforced: a Teacher can only record or view scores for grades they are explicitly assigned to. Head Teachers and School Administrators bypass this restriction.

**Key Architectural Decisions (confirmed):**

- **Flat `test_scores` table** (no `assessments` header table). An assessment is the implicit grouping of rows that share the same `grade_level`, `subject`, `assessment_type`, `term`, `academic_year`, and `assessment_date`. This avoids a two-phase save and keeps the MVP schema minimal.
- **`teacher_assignments` table introduced in this story.** Deferred from Story 4.1. Links `teacher_id` -> `residents` (following the existing `crop_manager_id` -> `residents` pattern in `farm_plots`), not `users`. The runtime check resolves the current user’s `resident_id` and queries `teacher_assignments`.
- **Subject and assessment type enums** are hard-coded constants for MVP (same pattern as `GRADE_LEVELS`). Configurable subjects are POST-MVP.
- **Score storage:** `score_value` + `max_score` (not just a percentage). This supports tests out of 20, 50, 100, etc. Client-side computes the percentage for display.
- **Term awareness:** `term` (enum: Term 1/2/3) + `academic_year` (integer) on each `test_scores` row. No separate `academic_terms` table for MVP. Automatic term detection is POST-MVP.

---

## Prerequisites

- **Story 4.1** (done): Learner enrollment, `school-store.js`, tabbed `LearnerDetailPage`, School navigation.

---

## Schema Changes

### 1. `server/scripts/setup-appwrite.js` — New `test_scores` table

```javascript
test_scores: {
  name: 'Test Scores',
  columns: [
    {
      key: 'learner_id',
      type: 'relationship',
      relatedTable: 'learners',
      relationType: 'manyToOne',
      twoWay: false,
      required: true,
      onDelete: 'cascade',
    },
    {
      key: 'subject',
      type: 'enum',
      elements: [
        'Mathematics', 'English', 'Integrated Science', 'Social Studies',
        'Religious Education', 'Civic Education', 'Creative and Technology Studies',
        'Local Language', 'Computer Studies', 'Agriculture Science', 'History',
        'Geography', 'Biology', 'Chemistry', 'Physics', 'Business Studies',
        'French', 'Art', 'Music', 'Physical Education', 'Other',
      ],
      required: true,
    },
    {
      key: 'assessment_type',
      type: 'enum',
      elements: [
        'Class Exercise', 'Monthly Test', 'Mid-Term Exam',
        'End-of-Term Exam', 'Quiz', 'Project', 'Assignment', 'Other',
      ],
      required: true,
    },
    {
      key: 'term',
      type: 'enum',
      elements: ['Term 1', 'Term 2', 'Term 3'],
      required: true,
    },
    { key: 'academic_year', type: 'integer', required: true },
    { key: 'assessment_date', type: 'datetime', required: true },
    { key: 'score_value', type: 'double', required: true },
    { key: 'max_score', type: 'double', required: true },
    { key: 'notes', type: 'string', size: 500, required: false },
  ],
  indexes: [
    {
      key: 'idx_test_scores_learner',
      type: 'key',
      columns: ['learner_id'],
      orders: ['ASC'],
    },
    {
      key: 'idx_test_scores_subject_date',
      type: 'key',
      columns: ['assessment_date', 'subject', 'assessment_type'],
      orders: ['DESC', 'ASC', 'ASC'],
    },
  ],
}
```

### 2. `server/scripts/setup-appwrite.js` — New `teacher_assignments` table

```javascript
teacher_assignments: {
  name: 'Teacher Assignments',
  columns: [
    {
      key: 'teacher_id',
      type: 'relationship',
      relatedTable: 'residents',
      relationType: 'manyToOne',
      twoWay: false,
      required: true,
      onDelete: 'cascade',
    },
    {
      key: 'grade_level',
      type: 'enum',
      elements: [
        'Early Childhood',
        'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
        'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
        'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
      ],
      required: true,
    },
    { key: 'notes', type: 'string', size: 500, required: false },
  ],
  indexes: [
    {
      key: 'idx_teacher_assignments_teacher',
      type: 'key',
      columns: ['teacher_id'],
      orders: ['ASC'],
    },
    {
      key: 'idx_teacher_assignments_grade',
      type: 'key',
      columns: ['grade_level'],
      orders: ['ASC'],
    },
  ],
}
```

> **Rationale:** `teacher_id` -> `residents` follows the existing `crop_manager_id` -> `residents` pattern. Runtime authorization resolves the logged-in user’s `resident_id` (via `users.resident_id`) and queries this table. Head Teachers / Admins bypass the check.

### 3. `DATABASE_SCHEMA.md`

Add `test_scores` and `teacher_assignments` to the School Tables section after `learners`. Document relationships:

- `test_scores` -> `learners` (manyToOne, cascade)
- `teacher_assignments` -> `residents` (manyToOne, cascade)

---

## Acceptance Criteria

### AC1: School Navigation Updated

- [ ] "Test Scores" navigation item added under the School section in `MainLayout.vue` (icon: `quiz`), gated on `school:read`.
- [ ] The School Dashboard "Quick Links" card enables the "Test Scores" link (removes `disable` state, routes to `/school/test-scores`).
- [ ] Unauthorized users do not see the nav item.

### AC2: Test Scores List / Landing Page (`/school/test-scores`)

- [ ] Page displays a list of past assessments grouped by `(assessment_date, grade_level, subject, assessment_type, term, academic_year)`.
- [ ] Each assessment card/row shows: date, grade, subject, assessment type, term, learner count, class average %.
- [ ] Filter by: grade level, subject, assessment type, term, academic year.
- [ ] "Record Scores" button routes to `/school/test-scores/record`.
- [ ] Clicking an assessment opens its class performance view.
- [ ] Empty state: "No test scores recorded yet. Click 'Record Scores' to create your first assessment."

### AC3: Record Scores — Bulk Entry Page (`/school/test-scores/record`)

- [ ] **Grade-level authorization:**
  - Teachers see only grades assigned to them in `teacher_assignments`.
  - Head Teachers and Admins see all grades.
  - If a Teacher has no assignments, show: "You are not assigned to any grades. Contact the Head Teacher."
- [ ] Form header fields (above the table):
  - **Grade Level** (required, dropdown filtered by authorization)
  - **Subject** (required, dropdown from `SUBJECTS` constant)
  - **Assessment Type** (required, dropdown from `ASSESSMENT_TYPES` constant)
  - **Term** (required, dropdown: Term 1 / Term 2 / Term 3)
  - **Academic Year** (required, integer input, default current calendar year)
  - **Assessment Date** (required, date picker, default today)
  - **Max Score** (required, number input, default 100, min 1)
- [ ] **Spreadsheet-style table** appears after grade is selected:
  - Columns: Learner Name (read-only, sorted alphabetically), Score (numeric input, 0–max_score), Computed % (read-only, auto-calculated), Notes (text input).
  - "Set All to Max Score" button for quick entry of perfect scores.
  - Visual validation: row turns red if score > max_score or < 0; inline error message.
- [ ] Only **Active** learners in the selected grade are shown.
- [ ] **Duplicate detection:** Before saving, query existing `test_scores` for the same `(learner_id, subject, assessment_type, term, academic_year, assessment_date)`. If any exist, show a warning modal: "[N] learners already have scores for this assessment. Overwrite existing scores?" with Cancel / Overwrite options.
- [ ] **"Save All Scores" button:**
  - Saves one `test_scores` row per learner.
  - All rows saved in a single `Promise.all` batch (client-side transaction; true atomicity deferred to POST-MVP Cloud Function).
  - On success: show notification, redirect to the class performance view for this assessment.
  - On partial failure: show which rows failed, allow retry.

### AC4: Class Performance View

- [ ] Accessible by clicking an assessment from the list page (e.g., `/school/test-scores/performance?grade=Grade%205&subject=Mathematics&assessmentType=Monthly%20Test&date=2026-06-09`).
- [ ] Summary cards at top:
  - Total learners assessed
  - Class average % (computed from `score_value / max_score`)
  - Highest score
  - Lowest score
- [ ] Score distribution chart (bar chart using Chart.js, wrapped in `shallowRef`):
  - X-axis: percentage ranges (0–9%, 10–19%, …, 90–100%)
  - Y-axis: number of learners
- [ ] Table of all learner scores with columns: Name, Score, %, Notes.
  - Color-coding: < 50% in red; 50–59% in orange; 60%+ in green (following at-risk thresholds from Story 4.4).
- [ ] Head Teacher / Admin can delete individual scores or the entire assessment (deletes all matching rows).

### AC5: Learner Detail — Academics Tab Becomes Functional

- [ ] Replace the placeholder in `LearnerDetailPage.vue` Academics tab with real content.
- [ ] **Score History table:**
  - Columns: Date, Subject, Assessment Type, Term, Score, %.
  - Sortable by date (descending default).
  - Filters: subject, assessment type, term, academic year.
- [ ] **Subject Averages:**
  - Cards or small table showing average % per subject for the selected academic year (default current year).
- [ ] **Performance Trend Chart:**
  - Line chart (Chart.js, `shallowRef`) showing score % over time.
  - Dropdown to select subject; "All Subjects" shows average across all subjects per assessment date.
- [ ] Empty state: "No test scores recorded yet for this learner."

### AC6: Teacher Assignment Management (Admin / Head Teacher only)

- [ ] New standalone `/school/teacher-assignments` page, gated on `school:admin`. Accessible via School section navigation or a link from the School Dashboard.
- [ ] Form to add assignment: select Teacher (resident dropdown, filtered to residents whose user account has the `Teacher` role), select Grade Level.
- [ ] Table showing all assignments with delete action.
- [ ] Validation: prevent duplicate `(teacher_id, grade_level)` pairs.
- [ ] If no assignments exist, Teachers bypass the grade filter and can record for any grade (graceful fallback for greenfield deployments).

### AC7: Performance and Error Handling

- [ ] List page loads within 2 seconds for < 500 test score rows.
- [ ] Bulk entry table renders within 1 second for < 50 learners.
- [ ] Charts use `shallowRef` and are destroyed on `onBeforeUnmount`.
- [ ] Loading states use Quasar skeletons.
- [ ] Network errors show retry option; validation errors are inline; server errors show user-friendly messages.

---

## Design Decisions (Confirmed)

The following decisions were proposed as areas of concern and have been confirmed for this story:

### `teacher_assignments` Table — Included in This Story

Story 4.1 deferred `teacher_assignments` to Story 4.2. Without it, any user with `school:write` could record scores for any grade. We are introducing the table now with a minimal management UI and runtime grade filtering. The table links `teacher_id` -> `residents` (following the `crop_manager_id` pattern). This enables the "my classes" concept required for both test scores (4.2) and attendance (4.3).

### Flat `test_scores` Table — MVP Approach

We are using a single flat `test_scores` table. An assessment is the implicit grouping of rows sharing `(grade_level, subject, assessment_type, term, academic_year, assessment_date)`. Client-side grouping is acceptable at MVP scale. A header-line pattern (`assessments` + `test_score_items`) is deferred to POST-MVP if editing past assessments becomes critical.

### No `academic_terms` Table — Manual Term Selection

Terms are represented as `term` (enum: Term 1/2/3) + `academic_year` (integer) on each `test_scores` row. Teachers manually select the term. An `academic_terms` table with automatic term detection is POST-MVP.

### Score Entry Format — Raw Score + Max Score

Teachers enter `score_value` and set `max_score` for the assessment. The UI computes and displays the percentage. This supports any test scale (out of 20, 50, 100, etc.). Percentage-only entry was rejected as too limiting.

### Teacher Assignments — Grade-Level Only, No Subject Restriction

The `teacher_assignments` table uses `(teacher_id, grade_level)` only — no `subject` column. A teacher assigned to a grade can record scores for **any subject** in that grade. This matches the primary-school model where teachers are generalists. Subject-level restrictions are POST-MVP if secondary-school specialization is needed later.

---

## Decisions Log

| #   | Question                       | Decision                                                                                      | Date       |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------- | ---------- |
| 1   | Teacher Assignment UI location | **Standalone `/school/teacher-assignments` page**                                             | 2026-06-09 |
| 2   | Subject-level restrictions?    | **No** — grade-level assignment only; teachers can record any subject in their assigned grade | 2026-06-09 |
| 3   | Class Performance view format  | **Dedicated route** (`/school/test-scores/performance?...`) for deep-linking                  | 2026-06-09 |

---

## Tasks / Subtasks

- [ ] **Schema & Setup** (AC: —)
  - [ ] Add `test_scores` table to `setup-appwrite.js`
  - [ ] Add `teacher_assignments` table to `setup-appwrite.js`
  - [ ] Update `DATABASE_SCHEMA.md`
  - [ ] Re-run `setup-appwrite.js` on live Appwrite (user action)
- [ ] **Constants & Store** (AC: 2–7)
  - [ ] Create `src/modules/school/utils/school-constants.js` additions: `SUBJECTS`, `ASSESSMENT_TYPES`, `TERMS`
  - [ ] Extend `school-store.js` with `testScores`, `testScoresLoaded`, `teacherAssignments`, `teacherAssignmentsLoaded` state
  - [ ] Add actions: `fetchTestScores()`, `fetchTestScoresForAssessment()`, `saveTestScores()`, `deleteTestScoresForAssessment()`, `fetchTeacherAssignments()`, `createTeacherAssignment()`, `deleteTeacherAssignment()`, `getTeacherAssignedGrades()`
  - [ ] Add getters: `assessmentsList` (grouped), `classPerformanceStats`, `learnerScoreHistory`, `learnerSubjectAverages`
- [ ] **Navigation & Dashboard** (AC: 1)
  - [ ] Add "Test Scores" to `MainLayout.vue` School section
  - [ ] Enable "Test Scores" quick link in `SchoolDashboardPage.vue`
- [ ] **Test Scores List Page** (AC: 2)
  - [ ] Create `src/modules/school/pages/TestScoresListPage.vue`
  - [ ] Add route `/school/test-scores` in `router.js`
- [ ] **Record Scores Page** (AC: 3)
  - [ ] Create `src/modules/school/pages/RecordScoresPage.vue`
  - [ ] Add route `/school/test-scores/record` in `router.js`
  - [ ] Build bulk-entry table with Quasar `q-table` (editable cells via `q-input` slots)
  - [ ] Implement duplicate detection and overwrite modal
  - [ ] Implement grade-level authorization dropdown
- [ ] **Class Performance View** (AC: 4)
  - [ ] Create `src/modules/school/pages/ClassPerformancePage.vue` (or inline component)
  - [ ] Add Chart.js bar chart (score distribution) using `shallowRef`
  - [ ] Add summary cards and color-coded score table
  - [ ] Add delete individual / delete all actions (Admin/Head Teacher only)
- [ ] **Learner Detail — Academics Tab** (AC: 5)
  - [ ] Replace placeholder in `LearnerDetailPage.vue` Academics tab
  - [ ] Add score history table with filters
  - [ ] Add subject averages cards
  - [ ] Add Chart.js line chart (trend over time) using `shallowRef`
- [ ] **Teacher Assignment Management** (AC: 6)
  - [ ] Create `src/modules/school/pages/TeacherAssignmentsPage.vue`
  - [ ] Add route `/school/teacher-assignments` in `router.js`
  - [ ] Build assignment form (teacher dropdown filtered by `Teacher` role, grade dropdown)
  - [ ] Build assignments table with delete action
- [ ] **RBAC & Authorization** (AC: 3, 6)
  - [ ] Add `useTeacherAssignments` composable or helper in `school-store.js` for runtime grade checks
  - [ ] Enforce grade filter on Record Scores page
  - [ ] Enforce `school:admin` gate on Teacher Assignments page
- [ ] **Sprint Status & Docs**
  - [ ] Update `docs/sprint-status.yaml`: `4-2-school-module-test-score-recording-bulk-entry-by-grade: review`
  - [ ] Add any deferred items to `docs/POST-MVP.md` (academic_terms table, assessment header-line pattern, subject-level teacher assignments)

---

## Dev Notes

### Reusing Existing Patterns

- **Store pattern:** Follow `farm-store.js` (state, getters, actions with `{ success, data, error }` return shapes).
- **Chart pattern:** Follow `FarmReportsPage.vue` and `YieldTrendsWidget.vue`: Chart.js wrapped in `shallowRef`, destroyed in `onBeforeUnmount`.
- **Relationship enrichment:** Follow `school-store.js` `enrichLearner()` pattern. `test_scores` rows will embed `learner_id`; the store enriches with `learner_name` and `grade_level` client-side.
- **Route guards:** All new routes require `requiresAuth: true` and `requiresPermission: 'school:read'` (list/performance) or `'school:write'` (record) or `'school:admin'` (teacher assignments).

### Score Percent Computation

```javascript
function computeScorePercent(scoreValue, maxScore) {
  if (!maxScore || maxScore <= 0) return 0;
  return Math.round((scoreValue / maxScore) * 100);
}
```

Store this in `src/modules/school/utils/school-utils.js` (new file) for reuse across components.

### Authorization Helper

```javascript
// In school-store.js or a composable
async function getAssignedGradesForCurrentUser() {
  const authStore = useAuthStore();
  const residentId = authStore.user?.resident_id;
  if (!residentId) return [];
  // If user has school:admin, return all GRADE_LEVELS
  if (hasPermission('school:admin')) return GRADE_LEVELS;
  // Otherwise query teacher_assignments
  const assignments = await this.fetchTeacherAssignmentsForTeacher(residentId);
  return assignments.map((a) => a.grade_level);
}
```

### Duplicate Detection Query

Before saving, query `test_scores` with:

```javascript
Query.and([
  Query.equal('subject', subject),
  Query.equal('assessment_type', assessmentType),
  Query.equal('term', term),
  Query.equal('academic_year', academicYear),
  Query.equal('assessment_date', assessmentDate),
  Query.equal('learner_id', learnerIds), // batch query
]);
```

Appwrite supports `Query.equal` with an array for OR-matching on a single field. Use `Query.limit(100)` and paginate if needed.

---

## Estimated Effort

- **Story Points:** 8
- **Estimated Hours:** 14–20 hours
- **Complexity:** Medium-High

**Breakdown:**

- Database schema + setup script updates: 1.5 hours
- Store extensions (test scores + teacher assignments): 3 hours
- Constants + utility functions: 0.5 hours
- Navigation + dashboard updates: 0.5 hours
- Test Scores List page: 2 hours
- Record Scores bulk-entry page: 4 hours
- Class Performance view (chart + table): 2.5 hours
- Learner Detail Academics tab (table + chart + averages): 2.5 hours
- Teacher Assignments management page: 1.5 hours
- RBAC + authorization wiring: 1 hour
- Testing + bug fixes: 2 hours

---

## References

- [Source: docs/epics.md#696] — Story 4.2 acceptance criteria
- [Source: docs/PRD.md#197] — FR-11: School Management requirements
- [Source: docs/PRD.md#400] — Journey 2: Head Teacher test score recording workflow
- [Source: docs/stories/story-4.1.md] — Learner enrollment model, tabbed detail page, `teacher_assignments` deferred decision
- [Source: src/modules/school/stores/school-store.js] — Store pattern to extend
- [Source: src/modules/school/pages/LearnerDetailPage.vue] — Tabbed detail page to update
- [Source: src/modules/school/router.js] — Route registration pattern
- [Source: src/modules/farm/pages/FarmReportsPage.vue] — Chart.js `shallowRef` pattern
- [Source: DATABASE_SCHEMA.md#416] — School Tables section
