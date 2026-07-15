# Sprint Change Proposal: Reorganize School Module around Class Component

**Date:** 2026-06-12  
**Triggered By:** Course Correction Request (Intuitive school reorganization around Class-level component with tabs for Learners and Test Scores, plus Teacher assignment integration)

---

## 1. Issue Summary

During the execution of Epic 4 (School Management), we identified an opportunity to improve usability and intuitive navigation by centering the School module around a **Class** concept (represented by Grade Levels). 

Currently, learners are managed in one list (`/school/learners`) and academic test scores are managed in a separate flat list (`/school/test-scores`). This separation can feel disconnected. A more natural mental model for teachers and school administrators is to click on a **Class** (e.g., *Grade 5*), see who is in that class, see who teaches it, and then view or record test scores for that class in a dedicated tab.

This proposal introduces a logical **Class Component** in the UI that replaces the current "Test Scores" menu item in the navigation, reorganizing the routing and page layouts around class-specific tabs.

---

## 2. Impact Analysis

### Affected Epics
- **Epic 4**: School Management and Educational Accountability.

### Affected Stories
- **Story 4.1 (Learner Enrollment)**: Enrolled learners list is now also viewable directly inside the corresponding Class page.
- **Story 4.2 (Test Score Recording)**: Test score list and performance analysis are moved inside the Class detail page's Academic Performance tab.
- **Story 4.3 (Attendance Tracking - Future)**: Daily/Class-level attendance will naturally live as a third tab in this Class page, keeping the interface extremely cohesive!

### Artifact Conflicts
- `MainLayout.vue`: Replace "Test Scores" nav entry with "Classes" (icon: `class` or `school`).
- `src/modules/school/router.js`: Adjust routing structure to revolve around classes.
- `src/modules/school/pages/ClassesListPage.vue` (NEW): Landing page for the "Classes" menu item.
- `src/modules/school/pages/ClassDetailPage.vue` (NEW): Detailed class view with tabs (Learners / Academic Performance).
- `RecordScoresPage.vue`: Modify route to `/school/classes/:grade/record` and pre-fill/disable the grade selector.
- `ClassPerformancePage.vue`: Modify route to `/school/classes/:grade/performance`.
- `SchoolDashboardPage.vue`: Update the "Test Scores" quick link to route to "Classes".
- `DATABASE_SCHEMA.md` & `docs/stories/story-4.2.md`: No database table modifications are needed since the existing tables (`learners`, `test_scores`, `teacher_assignments`) already support this logical structure.

### Technical Impact
- **No Database Migration Required**: All data models remain unchanged. The Class concept is modeled dynamically on the client side based on `grade_level` fields and existing relationship indexes.
- **Improved UX**: Highly cohesive layout aligning with standard school systems, reducing navigation friction.
- **Preparatory Benefit for Future Stories**: Makes Story 4.3 (Attendance) much easier to integrate as a tab.

---

## 3. Recommended Approach

### Decision: Direct Adjustment (Option 1)
We will logically restructure the frontend routes, pages, and components to group learners and assessments under a new Class structure, utilizing the existing Pinia stores (`learner-store.js`, `school-store.js`, `teacher-store.js`, `class-store.js`).

### Rationale
1. Keeps the database schema simple and clean (avoiding over-engineering a static `classes` table).
2. Follows the established design patterns of the application (such as the tabbed layout on the Learner Detail page).
3. Directly answers the user's request for a more intuitive, class-centric organization.

### Effort Estimate
- **Complexity**: Medium
- **Estimated Dev Hours**: 4–6 hours (fully automated and implemented by Cascade/Developer agent).
- **Risk**: Very Low (purely a frontend route/view reorganization; no database integrity risks).

---

## 4. Detailed Change Proposals

### 1. Route Reorganization (`src/modules/school/router.js`)

**OLD:**
```javascript
  {
    path: 'school/test-scores',
    name: 'school-test-scores',
    component: () => import('./pages/TestScoresListPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:read' },
  },
  {
    path: 'school/test-scores/record',
    name: 'school-record-scores',
    component: () => import('./pages/RecordScoresPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:write' },
  },
  {
    path: 'school/test-scores/performance',
    name: 'school-class-performance',
    component: () => import('./pages/ClassPerformancePage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:read' },
  },
```

**NEW:**
```javascript
  {
    path: 'school/classes',
    name: 'school-classes',
    component: () => import('./pages/ClassesListPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:read' },
  },
  {
    path: 'school/classes/:grade',
    name: 'school-class-detail',
    component: () => import('./pages/ClassDetailPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:read' },
  },
  {
    path: 'school/classes/:grade/record',
    name: 'school-record-scores',
    component: () => import('./pages/RecordScoresPage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:write' },
  },
  {
    path: 'school/classes/:grade/performance',
    name: 'school-class-performance',
    component: () => import('./pages/ClassPerformancePage.vue'),
    meta: { requiresAuth: true, requiresPermission: 'school:read' },
  },
```

---

### 2. Classes List Page (`ClassesListPage.vue`) - NEW
A dashboard grid displaying 13 Class Cards (Early Childhood + Grades 1-12).
Each card includes:
- Class Name (e.g., "Grade 5")
- Class Teacher: Resolved from `teacher_assignments`. Lists teacher name(s) or "No Assigned Teacher".
- Learners Enrolled: Count of active learners in the class.
- Class Average %: Rolling average computed from all assessments recorded for learners in this class.
- "View Class" button linking to `/school/classes/:grade`.

---

### 3. Class Detail Page (`ClassDetailPage.vue`) - NEW
A dynamic tabbed page.
- **Header**: Displays Class Name, Class Teacher(s), Enrolled Count, Class Average %, and a "Record Scores" button.
- **Tab 1: Learners List**:
  - Displays a search-enabled table of all learners enrolled in this grade level.
  - Columns: Name, Age, Status (Active/Inactive), Guardian, Phone, Actions.
  - Actions: Quick link to full Learner Detail page.
- **Tab 2: Academic Performance**:
  - Displays list of past assessments conducted for this grade.
  - Columns: Assessment Date, Subject, Assessment Type, Term, Students, Class Average.
  - Actions: "View Performance Analysis" (routes to `/school/classes/:grade/performance`), "Edit Scores" (routes to record page prefilled), and "Delete Assessment" (Admin/Head Teacher only).

---

### 4. Record Scores Page & Class Performance Page Updates
- Update routes and back-button links to point to `/school/classes/:grade` instead of `/school/test-scores`.
- Pre-select and lock the `:grade` in the dropdown if accessed via `/school/classes/:grade/record`, aligning with the class-specific context.

---

## 5. Implementation Handoff

- **Classification**: Moderate (routing, page restructuring, and dashboard modification).
- **Primary Executor**: Developer agent.
- **Handoff Recipient**: User (to review and approve this proposal, then execute the implementation).
- **Success Criteria**:
  1. Menu navigation displays "Classes" instead of "Test Scores" and points to `/school/classes`.
  2. Selecting "Classes" renders cards with teachers, learner counts, and class averages.
  3. Clicking a class displays learners and assessments in different tabs.
  4. Adding/viewing scores functions seamlessly, routing cleanly back to the Class Detail page.
