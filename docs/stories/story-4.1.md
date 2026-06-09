# Story 4.1: School Module - Learner Enrollment from Residents

**Epic:** 4 - School Management and Educational Accountability  
**Story ID:** 4.1  
**Status:** review  
**Date:** 2026-06-09  
**Author:** AI Assistant

---

## User Story

As a **Head Teacher**, I want to enroll learners by selecting from the residents table, so that learner data is pre-populated and consistent with the village resident registry.

---

## Summary

This story establishes the foundational data structure and UI for the School module by implementing learner enrollment. Learners are village residents who are actively enrolled in the village school. By linking learners to the existing `residents` table, the system avoids data duplication (name, DOB, gender, household) and maintains a single source of truth for personal information.

This story delivers:

- The complete School module skeleton (`src/modules/school/`)
- Role-based navigation for school staff
- CRUD operations for learner enrollment
- A School dashboard with learner overview
- A learner detail page with placeholder sections for future academic data

**Key Architectural Decisions (final, as implemented):**

- Learners are **not** a standalone entity; they are residents with additional school-specific attributes (grade, enrollment date, status)
- **Option A:** ONE learner row per resident, ever. Status changes (promotion, graduation, re-enrollment) mutate the single row, preserving a stable learner ID for test scores/attendance/interventions in Stories 4.2+. Re-enrollment of a returning learner re-activates the existing row via the edit page — no new row is created
- `resident_id` is a relationship column (onDelete: restrict). Uniqueness is enforced in the store (`checkExistingEnrollment`) because Appwrite does not support indexes on relationship columns
- `status_effective_date` column added: required (in UI) when status changes to Graduated/Transferred/Dropped Out
- Learner detail page is **tabbed** (Overview / Academics / Attendance / Interventions) so Stories 4.2–4.5 fill in tabs without restructuring the page
- Grade levels use a fixed enum for MVP; configurable grade levels are POST-MVP
- Parent/guardian and emergency contact are free-text fields for MVP (may reference non-residents)
- Reuses existing `ResidentSearchInput.vue` for resident selection

---

## Prerequisites

- **Epic 1 Story 1.4** (done): RBAC Foundation with role-based permissions
- **Epic 1 Story 1.6** (done): Households Management
- **Epic 1 Story 1.7** (done): Residents Management for resident selection
- **Epic 1 Story 1.8** (done): Village configuration
- **Epic 1 Story 1.9** (done): Sample data mode (will need school sample data in follow-up)

---

## Schema Changes

### 1. `server/scripts/setup-appwrite.js` — New `learners` table

```javascript
learners: {
  name: 'Learners',
  columns: [
    {
      key: 'resident_id',
      type: 'relationship',
      relatedTable: 'residents',
      relationType: 'manyToOne',
      twoWay: false,
      required: true,
      onDelete: 'restrict',
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
    { key: 'enrollment_date', type: 'datetime', required: true },
    {
      key: 'enrollment_status',
      type: 'enum',
      elements: ['Active', 'Inactive', 'Graduated', 'Transferred', 'Dropped Out'],
      required: true,
      default: 'Active',
    },
    { key: 'parent_guardian_name', type: 'string', size: 255, required: false },
    { key: 'parent_guardian_phone', type: 'string', size: 20, required: false },
    { key: 'emergency_contact_name', type: 'string', size: 255, required: false },
    { key: 'emergency_contact_phone', type: 'string', size: 20, required: false },
    { key: 'medical_notes', type: 'string', size: 1000, required: false },
    { key: 'notes', type: 'string', size: 1000, required: false },
  ],
  indexes: [
    {
      key: 'idx_learners_resident',
      type: 'key',
      columns: ['resident_id'],
      orders: ['ASC'],
    },
    {
      key: 'idx_learners_grade',
      type: 'key',
      columns: ['grade_level'],
      orders: ['ASC'],
    },
    {
      key: 'idx_learners_status',
      type: 'key',
      columns: ['enrollment_status'],
      orders: ['ASC'],
    },
  ],
}
```

### 2. `server/scripts/seed-roles.js` — Add school roles and permissions

**Permission strings:**

- `school:read` — View school module, learners, dashboard
- `school:write` — Create/edit learners, enrollments, interventions
- `school:admin` — Configure school settings, grade promotion, full access

**Role definitions (already updated in `seed-roles.js`):**

| Role                   | Category | Permissions                                                   | Storage Quota |
| ---------------------- | -------- | ------------------------------------------------------------- | ------------- |
| `School Administrator` | `school` | `school:read`, `school:write`, `school:admin`, `reports:read` | 100 GB        |
| `Head Teacher`         | `school` | `school:read`, `school:write`, `reports:read`                 | 50 GB         |
| `Teacher`              | `school` | `school:read`, `school:write`                                 | 20 GB         |

**Teacher granularity:** `Teacher` has `school:write` at the RBAC level, which grants access to the School module. Whether a specific Teacher can edit scores for a specific grade is determined **at runtime** by checking if they are assigned to that grade/class. This avoids permission-string explosion (e.g., `school:grade5:write`). The `teacher_assignments` table will be introduced in Story 4.2 when the "my classes" concept first matters.

### 3. `DATABASE_SCHEMA.md` — Document `learners` table

Add a new "School Tables" section after "Farm Tables" documenting the `learners` schema.

---

## Acceptance Criteria

### AC1: School Navigation with Role-Based Visibility

- [ ] School navigation section appears in main sidebar for users with `Head Teacher`, `Teacher`, or `Admin` roles
- [ ] Navigation uses appropriate education icon (e.g., `school`, `menu_book`, or `cast_for_education`)
- [ ] Navigation label: "School"
- [ ] Sub-navigation items: Dashboard, Learners
- [ ] Users without `school:read` permission do not see the navigation section
- [ ] Direct navigation to `/school` routes blocked for unauthorized users

### AC2: School Dashboard Shows Learner Overview

- [ ] School dashboard (`/school` or `/school/dashboard`) displays overview cards:
  - Total Enrolled Learners (status = 'Active')
  - Learners by Grade (count per grade level)
  - Recent Enrollments (last 5 enrollments)
- [ ] Empty state: "No learners enrolled yet. Click 'Enroll Learner' to get started."
- [ ] Dashboard responsive on mobile (cards stack vertically)

### AC3: Learners List Page

- [ ] Learners list page accessible at `/school/learners`
- [ ] Table columns: Resident Name (auto-populated), Grade Level, Enrollment Status, Enrollment Date, Actions
- [ ] Status badges with color coding: Active (green), Inactive (grey), Graduated (blue), Transferred (orange), Dropped Out (red)
- [ ] Filter by: grade level, enrollment status
- [ ] Search by resident name
- [ ] Sort by name, grade level, enrollment date
- [ ] Pagination for lists > 25 learners
- [ ] "Enroll Learner" button prominently displayed

### AC4: Enroll Learner Form

- [ ] "Enroll Learner" button opens form with:
  - **Resident** (required, searchable dropdown of all residents; shows "[First Name] [Last Name] — [Household Name]")
  - **Grade Level** (required, dropdown: Early Childhood, Grade 1–12)
  - **Enrollment Date** (required, date picker, defaults to today)
  - **Parent/Guardian Name** (optional, text)
  - **Parent/Guardian Phone** (optional, text)
  - **Emergency Contact Name** (optional, text)
  - **Emergency Contact Phone** (optional, text)
  - **Medical Notes** (optional, textarea)
  - **Additional Notes** (optional, textarea)
- [ ] When resident is selected, auto-populate read-only fields: Name, DOB, Gender, Household
- [ ] Validation: Resident can only have one **Active** enrollment. If resident already has an active enrollment, show error: "[Name] is already enrolled as an active learner."
- [ ] Successful enrollment creates learner row in Appwrite
- [ ] Success notification displayed
- [ ] List refreshes immediately

### AC5: Learner Detail Page

- [ ] Learner detail page at `/school/learners/:id`
- [ ] **Personal Info Section** (read-only, from resident):
  - Full Name, DOB, Gender, Household (with link to household detail)
- [ ] **Enrollment Info Section**:
  - Grade Level, Enrollment Date, Enrollment Status, Enrollment History
- [ ] **Guardian Info Section**:
  - Parent/Guardian, Emergency Contact, Medical Notes
- [ ] **Academic Performance Section** (placeholder):
  - Message: "No test scores recorded yet. Test score recording coming in Story 4.2."
- [ ] **Attendance Section** (placeholder):
  - Message: "No attendance recorded yet. Attendance tracking coming in Story 4.3."
- [ ] **Interventions Section** (placeholder):
  - Message: "No interventions recorded yet. Intervention tracking coming in Story 4.5."
- [ ] Edit button for Head Teacher/Admin; Teacher can view only
- [ ] "Back to Learners" navigation link

### AC6: Edit and Grade Promotion

- [ ] Edit form pre-populates all fields
- [ ] Grade can be changed (grade promotion)
- [ ] Enrollment status can be changed (e.g., Active → Graduated)
- [ ] When status changed to Graduated/Transferred/Dropped Out, require an effective date
- [ ] Validation: Cannot change status back to Active if resident has another active enrollment (edge case: rare, but block to prevent duplicates)
- [ ] Delete button with confirmation (only Admin/Head Teacher)
- [ ] Hard delete acceptable for MVP (no soft delete needed)

### AC7: Search and Filter

- [ ] Search by resident first name or last name
- [ ] Filter by grade level (multi-select dropdown)
- [ ] Filter by enrollment status (multi-select dropdown)
- [ ] Filters persist during session (not across reloads, per existing pattern)

### AC8: Performance and Error Handling

- [ ] Learner list loads within 1 second for < 100 learners
- [ ] Form submissions complete within 2 seconds
- [ ] Error states handled gracefully:
  - Network errors show retry option
  - Validation errors display inline
  - Server errors show user-friendly message
- [ ] Loading states use Quasar skeleton components

---

## Implementation Notes

### Files Created

| File                                                       | Purpose                                   |
| ---------------------------------------------------------- | ----------------------------------------- |
| `src/modules/school/router.js`                             | School module route definitions           |
| `src/modules/school/stores/school-store.js`                | Pinia store for learners and school state |
| `src/modules/school/pages/SchoolDashboardPage.vue`         | School dashboard with stats               |
| `src/modules/school/pages/LearnersListPage.vue`            | Learner list with filters                 |
| `src/modules/school/pages/LearnerDetailPage.vue`           | Learner detail view                       |
| `src/modules/school/pages/EnrollLearnerPage.vue`           | Enroll new learner form                   |
| `src/modules/school/components/LearnerForm.vue`            | Reusable add/edit form                    |
| `src/modules/school/components/EnrollmentStatusBadge.vue`  | Status badge with colors                  |
| `src/modules/school/components/LearnersOverviewWidget.vue` | Dashboard widget                          |
| `src/modules/school/utils/school-constants.js`             | Shared grade/status constants             |

### Files Modified

- `src/router/routes.js` — Import and spread `schoolRoutes`
- `src/layouts/MainLayout.vue` — Add School navigation section
- `server/scripts/setup-appwrite.js` — Add `learners` table schema
- `server/scripts/seed-roles.js` — Add `School Administrator` (with `school:admin`), `Head Teacher`, and `Teacher` roles with `school:` permissions
- `DATABASE_SCHEMA.md` — Document `learners` table
- `src/utils/report-scope.js` — Ensure `school` module is correctly mapped (already has `Head Teacher` and `Teacher` mapped to `['School']`)
- `docs/sprint-status.yaml` — Update Epic 4 story names to match `epics.md`

---

## Areas of Concern and Recommendations

### � MODERATE: Teacher Write-Scope Granularity

**Problem:** `Teacher` has `school:write`, which grants module-wide write access. In practice, a Teacher should only be able to record scores/attendance for grades they are assigned to.

**Solution (Two-Layer Authorization):**

- **RBAC layer:** `school:read` / `school:write` answers "Can this user access the School module at all?"
- **Application layer:** Runtime check (e.g., `isTeacherAssignedToGrade(userId, gradeLevel)`) answers "Can this Teacher edit this specific grade?"

This avoids permission-string explosion and keeps RBAC simple. The `teacher_assignments` table will be introduced in **Story 4.2** when the "my classes" concept first matters. For Story 4.1, Teachers can view all learners and edit any learner's basic info (enrollment data, guardian contacts). Score/attendance restrictions apply in Stories 4.2–4.3.

### ✅ RESOLVED: sprint-status.yaml Story Name Alignment

**Status:** Fixed. `docs/sprint-status.yaml` Epic 4 entries now match `docs/epics.md` exactly. `epic-4` status updated from `backlog` to `contexted`.

Final story keys:

```yaml
epic-4: contexted
4-1-school-module-learner-enrollment-from-residents: backlog
4-2-school-module-test-score-recording-bulk-entry-by-grade: backlog
4-3-school-module-attendance-tracking-bulk-entry-by-grade: backlog
4-4-school-module-at-risk-learner-identification-90-percent-attendance-threshold: backlog
4-5-school-module-intervention-planning-and-progress-tracking: backlog
4-6-school-module-peer-review-with-enhanced-categories-and-checked-status: backlog
4-7-school-module-self-evaluation-and-head-teacher-evaluation: backlog
4-8-school-module-collaborative-teaching-practices-documentation: backlog
4-9-school-module-progress-toward-long-term-educational-goal-90-percent-in-90th-percentile: backlog
4-10-school-module-learner-progress-reports-and-school-dashboard-completion: backlog
```

### ✅ RESOLVED: Missing `school:` Permissions

**Status:** Fixed. `school:read`, `school:write`, and `school:admin` added to `seed-roles.js` for `School Administrator`, `Head Teacher`, and `Teacher` roles. No other files need changes because `hasPermission()` in `permissions.js` is generic and handles any permission string.

### 🟢 LOW: Module Toggle Not Yet Implemented

**Problem:** Epic 5.9 (Module Management) is not yet built. The school module cannot be enabled/disabled.

**Recommended Solution:** For Story 4.1, always show the School navigation when the user has `school:read`. Add a deferred item in `POST-MVP.md` to make school toggleable via `modules_enabled` once Epic 5.9 is implemented.

### 🟢 LOW: Sample Data Does Not Include School Data

**Problem:** `useSampleData.js` seeds residents, households, finance, and farm data, but no school learners or test scores.

**Recommended Solution:** Create a follow-up task to add `useSchoolSampleData.js` after Story 4.1–4.3 are complete. This avoids building sample data for features that don't exist yet.

---

## Dev Notes

### School Store Structure

Follow the farm-store.js pattern:

```javascript
export const useSchoolStore = defineStore('school', {
  state: () => ({
    learners: [],
    learnersLoaded: false,
    isLearnersLoading: false,
    currentLearner: null,
    filters: {
      gradeLevel: null,
      status: null,
      searchQuery: '',
    },
    stats: {
      totalActive: 0,
      totalByGrade: {},
    },
  }),
  getters: {
    activeLearners: (state) => state.learners.filter((l) => l.enrollment_status === 'Active'),
    learnersByGrade: (state) => {
      return state.learners.reduce((acc, learner) => {
        const grade = learner.grade_level;
        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      }, {});
    },
  },
  actions: {
    async fetchLearners() { ... },
    async getLearnerById(id) { ... },
    async createLearner(data) {
      // Validate: no other active enrollment for this resident
      const existing = await this.checkActiveEnrollment(data.resident_id);
      if (existing) throw new Error('Resident already has an active enrollment');
      ...
    },
    async updateLearner(id, data) { ... },
    async deleteLearner(id) { ... },
    async checkActiveEnrollment(residentId) { ... },
  },
});
```

### Navigation Integration

Add to `src/layouts/MainLayout.vue` after the Farm section:

```vue
<template v-if="isClient && hasPermission('school:read')">
  <q-separator class="q-my-sm" />
  <q-item-label header> School </q-item-label>

  <q-item clickable to="/school">
    <q-item-section avatar>
      <q-icon name="school" />
    </q-item-section>
    <q-item-section>
      <q-item-label>Dashboard</q-item-label>
    </q-item-section>
  </q-item>

  <q-item clickable to="/school/learners">
    <q-item-section avatar>
      <q-icon name="people" />
    </q-item-section>
    <q-item-section>
      <q-item-label>Learners</q-item-label>
    </q-item-section>
  </q-item>
</template>
```

### Route Structure

```javascript
// src/modules/school/router.js
const schoolRoutes = [
  { path: 'school', redirect: '/school/dashboard' },
  {
    path: 'school/dashboard',
    name: 'school-dashboard',
    component: () => import('./pages/SchoolDashboardPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:read' },
  },
  {
    path: 'school/learners',
    name: 'school-learners',
    component: () => import('./pages/LearnersListPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:read' },
  },
  {
    path: 'school/learners/enroll',
    name: 'school-learner-enroll',
    component: () => import('./pages/EnrollLearnerPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:write' },
  },
  {
    path: 'school/learners/:id',
    name: 'school-learner-detail',
    component: () => import('./pages/LearnerDetailPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:read' },
  },
  {
    path: 'school/learners/:id/edit',
    name: 'school-learner-edit',
    component: () => import('./pages/EnrollLearnerPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:write' },
  },
];
export default schoolRoutes;
```

### Enrollment Status Enum

```javascript
const ENROLLMENT_STATUSES = [
  { value: 'Active', label: 'Active', color: 'positive' },
  { value: 'Inactive', label: 'Inactive', color: 'grey' },
  { value: 'Graduated', label: 'Graduated', color: 'info' },
  { value: 'Transferred', label: 'Transferred', color: 'warning' },
  { value: 'Dropped Out', label: 'Dropped Out', color: 'negative' },
];
```

### Cross-Module Considerations

**Residents Integration:**

- Learner list and detail pages use `useResidentsStore` for resident name lookups
- Resident dropdown for enrollment uses existing resident data
- Learner detail links to household detail page

**Finance Integration (Future):**

- School supplies purchases will create inventory items (Story 2.7 pattern)
- School-related expenses will use `source_module: 'School'` in finance transactions

**Calendar Integration (Future — Epic 5):**

- Intervention schedules will create calendar events (Story 4.5)
- Term dates will be configurable in School Settings

---

## Testing Checklist

### Navigation Access Control

- [ ] Login as Head Teacher → School nav visible
- [ ] Login as Teacher → School nav visible
- [ ] Login as Admin → School nav visible
- [ ] Login as Farm Manager → School nav hidden
- [ ] Direct URL to `/school/learners` as unauthorized → blocked

### Learner CRUD

- [ ] Enroll new learner with all fields
- [ ] Enroll with only required fields
- [ ] Attempt duplicate active enrollment → validation error
- [ ] Edit learner grade (promotion)
- [ ] Change status to Graduated
- [ ] Delete learner → confirmation → removed from list

### List Page

- [ ] All learners display
- [ ] Filter by grade = Grade 5
- [ ] Filter by status = Active
- [ ] Search by resident name
- [ ] Sort by enrollment date
- [ ] Click learner → detail page

### Detail Page

- [ ] Resident info displays correctly
- [ ] Enrollment info displays correctly
- [ ] Placeholder sections show appropriate messages
- [ ] Edit button navigates to edit form
- [ ] Household link works

### Dashboard

- [ ] Stats cards display correct counts
- [ ] Empty state when no learners

### Performance

- [ ] List loads < 1 second with 50 learners
- [ ] Form submission < 2 seconds

---

## Open Questions

1. **Q: Should we keep `School Administrator` or rename to `Head Teacher`?**
   - **Decision:** Keep `School Administrator` with full privileges (`school:admin`), and add `Head Teacher` and `Teacher` as separate roles. `School Administrator` is the super-user for school settings; `Head Teacher` is the operational leader; `Teacher` is the classroom-level user.

2. **Q: Should Teachers have `school:write` or a more restricted permission?**
   - **Decision:** `school:write` at RBAC level. Granular class-level restrictions (e.g., "only edit scores for Grade 5") are enforced at runtime via a `teacher_assignments` table, introduced in Story 4.2.

3. **Q: Should grade levels be a configurable table instead of an enum?**
   - **Recommendation:** Enum for MVP. Some Zambian schools have unusual grade structures; configurability can be added in School Settings (POST-MVP).

4. **Q: Should the learner detail page show a full enrollment history (e.g., Grade 5 → Grade 6 → Grade 7)?**
   - **Recommendation:** Not in Story 4.1. The current model stores one enrollment record per resident with a mutable `grade_level`. Full audit history (tracking every grade change) requires a separate `enrollment_history` table. Defer to POST-MVP unless required.

5. **Q: Should we support enrolling non-residents (e.g., children from neighboring villages)?**
   - **Recommendation:** All learners must be residents for MVP. This maintains the resident→learner relationship and avoids creating a parallel "student" entity. If external learners are needed later, they can be added as residents first.

---

## Story Context for Next Stories

### Story 4.2: Test Score Recording

- Will need active learners to exist for testing bulk score entry
- Learner detail "Academic Performance" section becomes functional
- Will need a `test_scores` or `assessments` table

### Story 4.3: Attendance Tracking

- Will need active learners
- Learner detail "Attendance" section becomes functional
- Will need an `attendance` table

### Story 4.4: At-Risk Learner Identification

- Depends on test scores (4.2) and attendance (4.3) data
- Will compute at-risk status from learner data

### Story 4.5: Intervention Planning

- Will need at-risk learners (4.4)
- Learner detail "Interventions" section becomes functional
- May create calendar events when Epic 5 is available

---

## Estimated Effort

- **Story Points:** 5
- **Estimated Hours:** 8–12 hours
- **Complexity:** Medium

**Breakdown:**

- Database schema + setup script updates: 1.5 hours
- Store implementation (CRUD, getters, validation): 2 hours
- School module skeleton (router, pages, components): 3 hours
- Navigation + RBAC integration: 1 hour
- Dashboard widget + list page: 2 hours
- Detail page + enrollment form: 2 hours
- Testing + bug fixes: 1.5 hours

---

## References

- [Source: docs/epics.md#686] — Story 4.1 acceptance criteria
- [Source: docs/PRD.md#197] — FR-11: School Management requirements
- [Source: docs/PRD.md#400] — Journey 2: Head Teacher learner intervention workflow
- [Source: src/modules/farm/router.js] — Farm module route pattern
- [Source: src/modules/farm/stores/farm-store.js] — Pinia store pattern
- [Source: src/layouts/MainLayout.vue] — Navigation integration pattern
- [Source: docs/stories/story-3.1.md] — Reference story format and structure

---

## Files to Create / Modify

### New Files

- `src/modules/school/router.js`
- `src/modules/school/stores/school-store.js`
- `src/modules/school/pages/SchoolDashboardPage.vue`
- `src/modules/school/pages/LearnersListPage.vue`
- `src/modules/school/pages/LearnerDetailPage.vue`
- `src/modules/school/pages/EnrollLearnerPage.vue`
- `src/modules/school/components/LearnerForm.vue`
- `src/modules/school/components/EnrollmentStatusBadge.vue`
- `src/modules/school/components/LearnersOverviewWidget.vue`

### Modified Files

- `src/router/routes.js`
- `src/layouts/MainLayout.vue`
- `server/scripts/setup-appwrite.js`
- `server/scripts/seed-roles.js`
- `DATABASE_SCHEMA.md`
- `docs/sprint-status.yaml`
- `docs/POST-MVP.md` (add any deferred items)

---

## Sign-off Checklist

- [ ] All acceptance criteria met
- [ ] Database schema documented in `DATABASE_SCHEMA.md`
- [ ] `setup-appwrite.js` includes `learners` table
- [ ] `seed-roles.js` includes `School Administrator`, `Head Teacher`, and `Teacher` roles with `school:` permissions
- [ ] All new files have proper headers with story reference
- [ ] Manual testing checklist completed
- [ ] No console errors or warnings
- [ ] Responsive design verified on mobile (320px) and desktop (1920px)
- [ ] RBAC properly enforced
- [ ] Error handling tested (network, validation, server errors)
- [ ] Code follows project conventions
- [ ] Ready for Story 4.2 development
