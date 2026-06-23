# Story 4.5: School Calendar — Class Timetable Weekly Schedule Builder

**Epic:** 4 — School Management and Educational Accountability  
**Story ID:** 4.5  
**Status:** ready-for-dev  
**Date:** 2026-06-20  
**Author:** AI Assistant

---

## Story

As a **School Administrator** or **Head Teacher**, I want to build a weekly subject schedule for each class — assigning subjects and teachers to specific period slots across Monday–Friday — so that every class has a clear, visible timetable that teachers and learners can refer to.

As a **Teacher**, I want to view the timetable for my assigned class(es) so that I know what to teach and when.

---

## Summary

This story delivers the full **class timetable builder** on top of the grade bell schedule established in Story 4.4. It introduces the `class_timetable_entries` table (the proper replacement for the removed `school_timetable` stub), a grade-level **timetable template** system, and per-class overrides.

**How the grade template + per-class override model works:**

1. An admin defines a **grade-level template** (e.g., "Grade 3 template"): which subjects are taught on which days in which period slots. This is stored as `class_timetable_entries` rows with `class_id = null` and `is_template = true`.
2. When a new class is created (e.g., Grade 3A), the admin can **apply the grade template** to it, which generates `class_timetable_entries` rows with the specific `class_id` (and `is_template = false`). Per-class teachers are then assigned to each entry.
3. Individual slots in a class's timetable can be **overridden** (different subject or teacher from the template) without affecting other classes or the template itself.

The **New Class timetable tab** (`ClassDetailPage.vue` → Timetable tab) becomes functional in this story, showing the class's weekly schedule in a grid view and providing an edit mode for admins.

**Key Architectural Decisions:**

- **`class_timetable_entries` with `is_template` flag** — One table stores both grade templates (null class_id, is_template = true) and class-specific schedules (class_id set, is_template = false). Keeps the schema minimal.
- **Teacher assigned per timetable entry** — Each entry has an optional `teacher_id` relationship to `residents`. This enables teacher conflict detection (same teacher in two places at the same time).
- **`valid_from` / `valid_to` date fields** — Timetable entries can be date-ranged to handle mid-year changes (e.g., a new teacher takes over a slot from a specific date). Null `valid_to` = currently active.
- **Subject as free string** — Timetable entries store `subject` as a string (not an enum relationship) to allow subjects not in the standard SUBJECTS list (e.g., a local language class with a specific name). The UI still uses the SUBJECTS constant for dropdown suggestions.
- **Simple table UI for editing, vue-cal weekly view for display** — The edit mode uses a grid of dropdowns (subject + teacher per cell). The read-only display uses vue-cal's week view for visual clarity.

---

## Prerequisites

- **Story 4.1** (done): School module, `school_classes` table, navigation.
- **Story 4.2** (done): Teacher assignments, class management UI.
- **Story 4.3** (done): Academic terms (provides academic year context).
- **Story 4.4** (done): `school_period_slots` table exists and is populated for at least one grade.

---

## Schema Changes

### 1. New table: `class_timetable_entries`

This table replaces the removed `school_timetable` stub from Story 4.4.

```javascript
class_timetable_entries: {
  name: 'Class Timetable Entries',
  columns: [
    // null when is_template = true (grade-level template, not tied to a specific class)
    {
      key: 'class_id',
      type: 'relationship',
      relatedTable: 'school_classes',
      relationType: 'manyToOne',
      twoWay: false,
      onDelete: 'cascade',
      required: false,
    },
    // When true, this is a grade-level template entry (class_id is null)
    { key: 'is_template', type: 'boolean', required: true, default: false },
    // Grade level is stored on both template and class entries for efficient querying
    {
      key: 'grade_level',
      type: 'enum',
      elements: [
        'Early Childhood',
        'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
        'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
        'Grade 10', 'Grade 11', 'Grade 12',
      ],
      required: true,
    },
    // References school_period_slots.$id — stored as string (not relationship)
    // to avoid cascades and allow slot reuse across grades.
    { key: 'slot_id', type: 'string', size: 50, required: true },
    {
      key: 'day_of_week',
      type: 'enum',
      elements: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true,
    },
    // Subject name — free string, not enum, to allow flexibility
    { key: 'subject', type: 'string', size: 100, required: false },
    // Teacher delivering this specific slot (optional — may be unassigned)
    {
      key: 'teacher_id',
      type: 'relationship',
      relatedTable: 'residents',
      relationType: 'manyToOne',
      twoWay: false,
      onDelete: 'setNull',
      required: false,
    },
    // Academic year this entry applies to
    { key: 'academic_year', type: 'integer', required: true },
    // Date range for mid-year timetable changes. null valid_to = currently active.
    { key: 'valid_from', type: 'datetime', required: false },
    { key: 'valid_to', type: 'datetime', required: false },
    { key: 'notes', type: 'string', size: 255, required: false },
  ],
  indexes: [
    {
      key: 'idx_timetable_class_year',
      type: 'key',
      columns: ['class_id', 'academic_year'],
      orders: ['ASC', 'ASC'],
    },
    {
      key: 'idx_timetable_grade_template',
      type: 'key',
      columns: ['grade_level', 'is_template', 'academic_year'],
      orders: ['ASC', 'ASC', 'ASC'],
    },
    {
      key: 'idx_timetable_teacher_year',
      type: 'key',
      columns: ['teacher_id', 'academic_year'],
      orders: ['ASC', 'ASC'],
    },
  ],
}
```

### 2. `DATABASE_SCHEMA.md` updates

- Add `class_timetable_entries` to the School Tables section.
- Document relationships:
  - `class_timetable_entries → school_classes` (manyToOne, onDelete: cascade)
  - `class_timetable_entries → residents` (manyToOne via `teacher_id`, onDelete: setNull)
- Note that `slot_id` stores `school_period_slots.$id` as a string (not a relationship column) intentionally.

---

## Acceptance Criteria

### AC1: Grade Timetable Template Builder (`/school/settings/timetable-templates`)

- [ ] Page accessible from School Settings hub, gated on `school:admin`.
- [ ] **Grade Level selector** + **Academic Year selector** at top.
- [ ] Displays a **weekly grid**: rows = period slots (class-type only, from `school_period_slots` for selected grade/year), columns = Monday–Friday.
- [ ] Each cell in the grid shows the assigned subject (if any). Empty cells show a placeholder "—".
- [ ] **Edit mode** (toggle button, admin only):
  - Each cell becomes a dropdown (subject from `SUBJECTS` constant + free-text option) + a teacher dropdown (populated from residents who have a `teacher_assignment` for this grade level).
  - Cells for non-class slots (breaks, lunch) are shown as read-only shaded rows in the grid (not editable).
  - "Clear Cell" button per cell to remove subject/teacher assignment.
  - "Apply to All Days" per row — applies same subject to all 5 days for that slot.
- [ ] **"Save Template"** button — saves all entries in bulk. Shows save confirmation.
- [ ] **"Clear Template"** button — removes all entries for the selected grade/year template (with confirmation).
- [ ] Non-class slot rows (breaks, lunch, assembly) are displayed in the grid as shaded, non-editable rows with their label ("Morning Break", "Lunch", etc.) spanning all 5 columns.
- [ ] Empty state (no slots configured for the grade): "No bell schedule configured for [Grade] [Year]. Set up the bell schedule first." with link to Bell Schedules settings.

### AC2: Class Timetable Tab (in `ClassDetailPage.vue`)

- [ ] The existing **Timetable tab** in `ClassDetailPage.vue` is now fully implemented.
- [ ] **Default view**: weekly grid (same visual as the template builder but read-only) showing the class's current timetable.
- [ ] If no class-specific timetable exists yet, display:
  - The grade-level template (greyed out / read-only) as a preview.
  - A banner: "This class does not have a customized timetable. It is currently using the [Grade X] template. [Apply Template to Class] button."
  - "Apply Template to Class" button (admin only): copies the grade template entries into class-specific entries for this class. Prompts: "Apply the Grade [X] template to [Class Name]? You can then customize individual slots." Confirm/Cancel.
- [ ] If a class-specific timetable exists:
  - Show the weekly grid.
  - Cells that differ from the grade template are shown with a subtle indicator (e.g., a small "custom" badge or different border).
  - **"Edit Timetable"** button (admin only) enters edit mode.
  - **"Reset to Template"** button (admin only): removes all class-specific overrides and reverts to the grade template. Confirmation required.

### AC3: Class Timetable Edit Mode

- [ ] Activated by "Edit Timetable" button (admin only).
- [ ] Same grid UI as the template builder (AC1), but scoped to this specific class.
- [ ] Teacher dropdown shows residents with a `teacher_assignment` for this class's grade level.
- [ ] **Teacher conflict detection**: when a teacher is assigned to a slot/day, the system checks all other class timetable entries for the same teacher, same day, same slot. If a conflict is found, show an inline warning: "⚠ [Teacher Name] is already assigned to [Other Class] at this time." (Warning, not a hard block — unusual but valid in split-teaching scenarios.)
- [ ] **"Save Changes"** button — saves all modified cells in bulk.
- [ ] **"Discard Changes"** button — reverts unsaved changes.
- [ ] Subject field supports free-text entry in addition to the SUBJECTS dropdown options.

### AC4: Timetable Read View (vue-cal Weekly Display)

- [ ] On the Class Timetable tab (view mode, not edit mode), render a **vue-cal week view** showing the class's full week schedule.
- [ ] Each period slot appears as a vue-cal event: title = subject name, time = slot start/end, color = based on subject (consistent color mapping).
- [ ] Break/lunch/assembly slots appear as background events (non-interactive, shaded).
- [ ] Clicking a period event shows a popup: subject, teacher name, slot time, slot label.
- [ ] If no subject is assigned to a slot, the slot still appears but with a greyed-out "No subject assigned" label.
- [ ] Navigation: the week view shows the current real-world week by default. Navigation arrows move to prev/next week (schedule is the same every week — no real-world events here, just the repeating structure).

### AC5: Teacher Schedule View (New Tab or Page)

- [ ] A **"My Timetable"** section added to the Teacher's view within `TeachersListPage.vue` (or a dedicated `TeacherDetailPage.vue` tab if one exists).
- [ ] Shows all class timetable entries where `teacher_id` matches the selected teacher, for the current academic year.
- [ ] Displayed as a weekly grid: rows = unique time slots across all grades they teach, columns = Monday–Friday, cells show class name + subject.
- [ ] This is read-only for all roles (teachers can see their own schedule; admins can see any teacher's schedule).

### AC6: `timetable-store.js` (New Pinia Store)

- [ ] Store file: `src/modules/school/stores/timetable-store.js`
- [ ] **State:** `timetableEntries[]`, `timetableLoaded`, `isLoading`
- [ ] **Getters:**
  - `templateByGradeYear(gradeLevel, academicYear)` — Returns `is_template = true` entries for the grade/year
  - `classTimetable(classId, academicYear)` — Returns entries for a specific class
  - `teacherSchedule(teacherId, academicYear)` — Returns all entries for a teacher across all classes
  - `hasConflict(teacherId, dayOfWeek, slotId, academicYear, excludeEntryId?)` — Returns conflicting entry or null
- [ ] **Actions:**
  - `fetchTimetableEntries(force)` — Load all entries (follows existing store patterns)
  - `saveTemplateEntries(gradeLevel, academicYear, entries[])` — Bulk replace template entries
  - `applyTemplateToClass(classId, gradeLevel, academicYear)` — Copy template entries to class
  - `saveclassEntries(classId, academicYear, entries[])` — Bulk replace class entries
  - `resetClassToTemplate(classId, gradeLevel, academicYear)` — Delete class entries, reapply template
  - `deleteEntry(id)` — Delete single entry

### AC7: Class Detail Page — Timetable Tab Completion

- [ ] `ClassDetailPage.vue` Timetable tab is now fully functional (was a placeholder in Story 4.2).
- [ ] The tab shows "Loading timetable..." while fetching.
- [ ] The tab shows a "No timetable configured" empty state with the apply-template call-to-action when no entries exist.
- [ ] The tab correctly distinguishes between "template not applied" vs. "template applied but no subjects filled in yet."

### AC8: Sample Data

- [ ] `server/scripts/seed-sample-data.js` updated to seed:
  - A grade-level template for **Grade 3** (the most common grade in the sample data): all 5 days × all class slots filled with subjects, 2–3 different teachers assigned.
  - Class-specific timetable for **Grade 3A** (one of the sample classes): apply the template, with one override (e.g., Monday Period 1 has a different teacher or subject).
  - No timetable for **Grade 3B** (leaves it in "template not applied" state to test the empty-state UI).

### AC9: Permissions

- [ ] `school:read` — view timetables (class timetable tab, teacher schedule view).
- [ ] `school:admin` — add/edit/delete timetable entries, manage grade templates, apply template to class, reset class to template (School Administrator, Head Teacher).
- [ ] Teachers can view their own schedule (filtered to their assigned classes/grades).

---

## UI Notes

- The grade template builder and class timetable editor both use the same underlying `TimetableGrid.vue` component with a read-only prop and an edit-mode prop. Build the component once, reuse it in both contexts.
- The weekly grid should display slot times in a left column (e.g., "08:00–08:45") alongside the period label ("Period 1") to make the schedule immediately readable.
- On mobile, the weekly grid becomes a tab-per-day view (Monday tab, Tuesday tab, etc.) to avoid horizontal scrolling of a 5-column grid.
- The vue-cal weekly display (AC4) is the "pretty" presentation view; the grid component (AC3) is the functional edit view. They serve different purposes — keep both.

---

## Pre-Implementation Notes / Blockers (2026-06-23)

- **Old timetable code regression:** Story 4.4 removed the `school_timetable` table from the schema. However, `src/modules/school/stores/class-store.js` still has `fetchTimetable`, `saveTimetableEntry`, `deleteTimetableEntry`, and `LOCAL_STORAGE_KEYS.TIMETABLE` targeting the old table. `ClassDetailPage.vue` still renders the Weekly Timetable tab using `classStore.timetable` keyed by `period_number` and `day_of_week`. On a fresh database this tab will fail to load; on a seeded database the new `class_timetable_entries` rows will not be displayed.
  - **Recommendation:** The first task in Story 4.5 should be to delete the old timetable actions from `class-store.js`, remove the old timetable tab markup from `ClassDetailPage.vue`, and build the new implementation on `class_timetable_entries` + `school_period_slots`. Alternatively, hide the old tab behind a placeholder until the new builder is ready.
- **Sample data location mismatch:** Same as Stories 4.3 and 4.4 — the timetable sample data is in `server/functions/seedAllData/src/main.js`, not in `server/scripts/seed-sample-data.js`.

---

## Files to Create / Modify

| Action | File                                                                             |
| ------ | -------------------------------------------------------------------------------- |
| Create | `src/modules/school/pages/TimetableTemplatesPage.vue`                            |
| Create | `src/modules/school/stores/timetable-store.js`                                   |
| Create | `src/modules/school/components/TimetableGrid.vue`                                |
| Modify | `src/modules/school/pages/ClassDetailPage.vue` (implement Timetable tab)         |
| Modify | `src/modules/school/pages/TeachersListPage.vue` (add teacher schedule view)      |
| Modify | `src/modules/school/pages/SchoolSettingsPage.vue` (add Timetable Templates link) |
| Modify | `src/modules/school/router.js` (add timetable-templates route)                   |
| Modify | `server/scripts/setup-appwrite.js` (add class_timetable_entries table)           |
| Modify | `server/scripts/seed-sample-data.js` (seed timetable data)                       |
| Modify | `DATABASE_SCHEMA.md`                                                             |
