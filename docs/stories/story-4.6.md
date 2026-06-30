# Story 4.6: School Module - Attendance Tracking (Bulk Entry by Grade)

**Epic:** 4 — School Management and Educational Accountability  
**Story ID:** 4.6  
**Status:** done  
**Date:** 2026-06-25  
**Author:** AI Assistant (retrospective documentation)

---

## Story

As a **Teacher**, I want to record daily attendance for my class in spreadsheet format, with the school calendar determining which days are valid attendance days, so that I can efficiently track learner presence and identify attendance patterns.

As a **Head Teacher**, I want to view attendance history and class attendance reports, so that I can monitor overall school attendance and identify classes that need support.

---

## Summary

This story delivers the **core attendance tracking system** for the School module. It introduces the `learner_attendance` table, bulk attendance entry interface, and attendance management features that serve as the foundation for at-risk learner identification in Story 4.7.

**Key Implementation Decisions:**

- **`learner_attendance` table** with daily roll records per learner — supports Present, Absent, Late, and Excused statuses with optional reason notes.
- **Bulk entry interface** — spreadsheet-style table with status dropdowns for all learners in a class, enabling efficient daily roll call.
- **Calendar-aware validation** — integrates with `school_calendar_events` to warn when attendance is being recorded on non-school days (holidays, breaks).
- **Class-level attendance tracking** — attendance is always recorded in the context of a specific class on a specific date.
- **Simple storage model** — attendance records are independent daily snapshots; no complex state tracking or approval workflows.

**Note on Implementation Scope:** The core attendance CRUD functionality was implemented in this story, but several UX enhancements (calendar-aware date validation, attendance history view, class attendance widget) were completed in Story 4.7 as part of the at-risk identification work. This story documents the complete delivered functionality.

---

## Prerequisites

- **Story 4.1** (done): Learner enrollment, `learners` table, class management.
- **Story 4.3** (done): School calendar with `school_calendar_events` table for determining school days.

---

## Schema Changes

### 1. New table: `learner_attendance`

```javascript
learner_attendance: {
  name: 'Learner Attendance',
  columns: [
    {
      key: 'learner_id',
      type: 'relationship',
      relatedTable: 'learners',
      relationType: 'manyToOne',
      twoWay: false,
      onDelete: 'cascade',
      required: true,
    },
    {
      key: 'class_id',
      type: 'relationship',
      relatedTable: 'school_classes',
      relationType: 'manyToOne',
      twoWay: false,
      onDelete: 'cascade',
      required: true,
    },
    {
      key: 'attendance_date',
      type: 'datetime',
      required: true,
    },
    {
      key: 'status',
      type: 'enum',
      elements: ['Present', 'Absent', 'Late', 'Excused'],
      required: true,
    },
    {
      key: 'absence_reason',
      type: 'string',
      size: 255,
      required: false,
    },
    {
      key: 'notes',
      type: 'string',
      size: 500,
      required: false,
    },
  ],
}
```

### 2. `DATABASE_SCHEMA.md` updates

- Add `learner_attendance` table documentation under School Tables section.
- Document relationships to `learners` and `school_classes` tables.
- Note the attendance status enum and optional reason/notes fields.

---

## Acceptance Criteria

### AC1: Attendance Table and Core Storage

- [x] `learner_attendance` table created in Appwrite with schema above.
- [x] Table relationships configured: `learner_attendance → learners` (cascade), `learner_attendance → school_classes` (cascade).
- [x] `class-store.js` extended with attendance state management: `attendance[]`, `attendanceLoaded`, `isLoading` flags.
- [x] Core data operations implemented:
  - `fetchAttendance(classId, dateStr)` — retrieves attendance records for a class on a specific date.
  - `saveAttendance(classId, dateStr, attendanceList)` — bulk saves attendance records for all learners in a class.
  - Local storage fallback for development/offline mode.

### AC2: Class Attendance Entry Interface (`ClassDetailPage.vue`)

- [x] **Attendance tab** in `ClassDetailPage.vue` fully implemented with roll-call interface.
- [x] **Date picker** for selecting attendance date with `@update:model-value="loadAttendance"` handler.
- [x] **"Mark All Present"** button that sets all learners to 'Present' status.
- [x] **Spreadsheet table** with columns:
  - Learner Name (from enrolled learners in the class)
  - Status dropdown (Present/Absent/Late/Excused)
  - Reason/Notes text field (shows when status is Absent/Late/Excused)
- [x] **Save Attendance** button that triggers bulk save via `classStore.saveAttendance()`.
- [x] **Loading states** and success/error notifications using Quasar notify.
- [x] **Real-time updates** — table refreshes after successful save.

### AC3: Attendance Status Management

- [x] **Status dropdown** with four options: 'Present', 'Absent', 'Late', 'Excused'.
- [x] **Conditional reason field** — appears when status is not 'Present', required for 'Absent' and 'Late', optional for 'Excused'.
- [x] **Notes field** — optional free-text field for teacher observations.
- [x] **Validation** — ensures all learners have a status selected before allowing save.
- [x] **Default values** — new attendance rows default to 'Present' status.

### AC4: Class-Level Attendance Operations

- [x] **Class context** — attendance is always saved with the current `class_id` from route params.
- [x] **Date-based queries** — attendance records are stored with UTC normalized dates (00:00:00) for consistent querying.
- [x] **Bulk operations** — `saveAttendance()` handles all learners in a single operation using `Promise.all()` for efficiency.
- [x] **Overwrite protection** — saving attendance for the same date/class replaces previous records (delete + insert pattern).

### AC5: Integration with Learner Management

- [x] **Learner listing** — attendance table shows all currently enrolled learners in the class (filters by enrollment status).
- [x] **Class validation** — attendance can only be recorded for valid, active classes.
- [x] **Dynamic learner updates** — if learners are added/removed from class, attendance table reflects changes on next load.

### AC6: Sample Data Seeding

- [x] **Attendance history** — `server/functions/seedAllData/src/main.js` seeds 30 days of attendance history for all classes.
- [x] **Realistic patterns** — attendance distribution: ~80% Present, ~10% Late, ~10% Absent/Excused.
- [x] **Date range** — seeded attendance covers the last 30 school days (excludes weekends per calendar).
- [x] **Class-specific data** — each class gets independent attendance patterns to demonstrate variability.

### AC7: Error Handling and Edge Cases

- [x] **Appwrite fallback** — graceful degradation to local storage when Appwrite is unavailable.
- [x] **Network error handling** — user-friendly error messages for failed saves/loads.
- [x] **Empty class handling** — appropriate empty state when class has no enrolled learners.
- [x] **Date validation** — basic date picker validation (prevents future dates where reasonable).

---

## Implementation Notes / Completed Features

### Core Architecture

- **Store Pattern:** Follows established Pinia store patterns in `class-store.js` with `isLoading`, `attendanceLoaded`, and error handling.
- **Appwrite Integration:** Uses standard Appwrite TablesDB queries with `Query.equal()`, `Query.limit()`, and proper error handling.
- **Local Storage Fallback:** Maintains offline capability with localStorage keys using pattern `${LOCAL_STORAGE_KEYS.ATTENDANCE}_${classId}_${dateStr}`.
- **Date Normalization:** All dates stored as UTC 00:00:00 to ensure consistent querying across timezones.

### User Interface Decisions

- **Tabbed Interface:** Attendance functionality implemented as a tab in `ClassDetailPage.vue` for contextual access.
- **Spreadsheet Layout:** Vertical table layout with learner names in rows, editable cells for status/reason.
- **Responsive Design:** Table adapts to mobile screens with horizontal scrolling where needed.
- **Status Colors:** Visual indicators using Quasar color classes for different attendance statuses.

### Performance Considerations

- **Bulk Operations:** Attendance save uses `Promise.all()` to process all learner records concurrently.
- **Query Optimization:** Attendance queries use indexed fields (`class_id`, `attendance_date`) for efficient retrieval.
- **Lazy Loading:** Attendance data only loaded when the attendance tab is activated.

### Data Model Notes

- **No Attendance Sessions:** Each day is a separate attendance snapshot — no complex session or period-based attendance.
- **Class-Based Storage:** Attendance records always include `class_id` even though learner has current class — preserves historical context.
- **Status Semantics:** 'Present' and 'Late' both count as present for attendance rate calculations (per Zambian school conventions).

---

## Files Created / Modified

| Action | File |
| ------ | ---- |
| Modify | `src/modules/school/stores/class-store.js` (add attendance state and methods) |
| Modify | `src/modules/school/pages/ClassDetailPage.vue` (implement attendance tab) |
| Modify | `server/scripts/setup-appwrite.js` (add learner_attendance table) |
| Modify | `DATABASE_SCHEMA.md` (document learner_attendance table) |
| Modify | `server/functions/seedAllData/src/main.js` (seed attendance data) |
| Create | `src/modules/school/components/ClassAttendanceWidget.vue` (dashboard widget - completed in 4.7) |

---

## Features Completed in Story 4.7 (Enhancements)

Several attendance-related UX enhancements were completed as part of Story 4.7's at-risk identification work:

- **AC2: Calendar-Aware Date Validation** — Warning when selected date is not a school day per `school_calendar_events`
- **AC3: Attendance History View** — Month-level summary showing daily attendance statistics and trends
- **AC4: Class Attendance Report Widget** — Dashboard widget showing weekly attendance rates across all classes
- **Database Documentation** — Added missing `learner_attendance` section to `DATABASE_SCHEMA.md`

These enhancements built upon the core foundation established in Story 4.6 and were essential for accurate at-risk learner calculations.

---

## Testing and Verification

### Automated Checks
- [x] `npm run lint` passes without errors
- [x] `npm run build` (SPA) completes successfully
- [x] Database schema validation passes in setup-appwrite.js

### Manual Testing Completed
- [x] Attendance recording for multiple classes on different dates
- [x] "Mark All Present" functionality and individual status changes
- [x] Save/load cycles with proper data persistence
- [x] Error handling for network failures and Appwrite unavailability
- [x] Sample data seeding produces realistic attendance patterns
- [x] Integration with learner enrollment changes

### Known Limitations
- **No Period-Level Attendance:** Attendance is recorded once per day, not per class period.
- **No Approval Workflow:** All attendance changes are immediately saved; no review/approval process.
- **Basic Date Validation:** Does not prevent all future dates, relies on teacher judgment.

---

## Dependencies and Integration Points

### Upstream Dependencies
- **Story 4.1:** Provides learner enrollment and class management
- **Story 4.3:** Provides school calendar for school day determination (enhanced in 4.7)

### Downstream Dependencies
- **Story 4.7:** Uses attendance data for at-risk learner identification and attendance analytics
- **Story 4.8:** Will use attendance history for intervention planning

### Cross-Module Integration
- **Calendar Module:** Uses `school_calendar_events` for date validation (completed in 4.7)
- **Finance Module:** No direct integration, but attendance data could inform future attendance-based funding calculations

---

## Retrospective Notes

**Successes:**
- Clean, simple data model that handles the core use cases effectively
- Efficient bulk operations perform well with typical class sizes (20-50 learners)
- Solid foundation for at-risk identification and attendance analytics
- Good offline capability with local storage fallback

**Challenges:**
- Date handling complexities required careful UTC normalization
- Balancing simple UI with comprehensive status tracking options
- Limited by Appwrite's lack of transaction support for bulk operations

**Future Enhancement Opportunities:**
- Period-level attendance for more detailed tracking
- Attendance trend analysis and predictive analytics
- Parent/guardian access to learner attendance records
- Automated attendance alerts for chronic absenteeism

---

**Story Status:** done  
**Implementation Complete:** All core attendance tracking functionality is implemented and operational. The system successfully handles daily roll call, maintains attendance history, and provides the foundation for attendance-based analytics and at-risk learner identification.
