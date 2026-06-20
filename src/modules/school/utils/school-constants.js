/**
 * School Module Constants (Story 4.1, updated Story 4.3)
 *
 * Shared constants for grade levels and enrollment statuses.
 * Must stay in sync with the `learners` table enums in server/scripts/setup-appwrite.js.
 *
 * TERMS is kept for backward-compatibility as a static fallback when the DB has no terms
 * configured yet (e.g. first run before Story 4.3 data is seeded). All new code should
 * prefer loading terms from useAcademicTermsStore instead.
 */

export const GRADE_LEVELS = [
  'Early Childhood',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export const ENROLLMENT_STATUSES = [
  { value: 'Active', label: 'Active', color: 'positive', textColor: 'white' },
  { value: 'Inactive', label: 'Inactive', color: 'grey', textColor: 'white' },
  { value: 'Graduated', label: 'Graduated', color: 'info', textColor: 'white' },
  { value: 'Transferred', label: 'Transferred', color: 'warning', textColor: 'black' },
  { value: 'Dropped Out', label: 'Dropped Out', color: 'negative', textColor: 'white' },
];

/**
 * Statuses that require an effective date when set (AC6)
 */
export const STATUSES_REQUIRING_EFFECTIVE_DATE = ['Graduated', 'Transferred', 'Dropped Out'];

export const SUBJECTS = [
  'Mathematics',
  'English',
  'Integrated Science',
  'Social Studies',
  'Religious Education',
  'Civic Education',
  'Creative and Technology Studies',
  'Local Language',
  'Computer Studies',
  'Agriculture Science',
  'History',
  'Geography',
  'Biology',
  'Chemistry',
  'Physics',
  'Business Studies',
  'French',
  'Art',
  'Music',
  'Physical Education',
  'Other',
];

export const ASSESSMENT_TYPES = [
  'Class Exercise',
  'Monthly Test',
  'Mid-Term Exam',
  'End-of-Term Exam',
  'Quiz',
  'Project',
  'Assignment',
  'Other',
];

/**
 * Static fallback term list used when no terms are configured in the database yet.
 * Story 4.3: RecordScoresPage loads terms from school_academic_terms and falls back
 * to this list if the table is empty or unavailable.
 */
export const TERMS = ['Term 1', 'Term 2', 'Term 3'];

/**
 * School calendar event types (Story 4.3).
 * Must stay in sync with the `school_calendar_events.event_type` enum in setup-appwrite.js.
 */
export const CALENDAR_EVENT_TYPES = [
  { value: 'public_holiday', label: 'Public Holiday', color: 'red-8', icon: 'flag' },
  { value: 'school_holiday', label: 'School Holiday', color: 'orange-7', icon: 'beach_access' },
  { value: 'pd_day', label: 'Professional Development Day', color: 'purple-6', icon: 'school' },
  { value: 'exam_block', label: 'Exam Block', color: 'blue-7', icon: 'quiz' },
  { value: 'early_dismissal', label: 'Early Dismissal', color: 'teal-6', icon: 'timer' },
  { value: 'assembly', label: 'Assembly', color: 'green-6', icon: 'groups' },
  { value: 'other', label: 'Other', color: 'grey-6', icon: 'event_note' },
];

/**
 * Get the display config for a calendar event type value.
 * @param {string} value
 * @returns {{ value, label, color, icon }}
 */
export function getCalendarEventType(value) {
  return CALENDAR_EVENT_TYPES.find((t) => t.value === value) || CALENDAR_EVENT_TYPES.at(-1);
}

/**
 * Get the badge color for an enrollment status
 * @param {string} status - Enrollment status value
 * @returns {string} Quasar color name
 */
export function getStatusColor(status) {
  const match = ENROLLMENT_STATUSES.find((s) => s.value === status);
  return match ? match.color : 'grey';
}
