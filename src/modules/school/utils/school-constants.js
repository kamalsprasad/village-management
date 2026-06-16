/**
 * School Module Constants (Story 4.1)
 *
 * Shared constants for grade levels and enrollment statuses.
 * Must stay in sync with the `learners` table enums in server/scripts/setup-appwrite.js.
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

export const TERMS = ['Term 1', 'Term 2', 'Term 3'];

/**
 * Get the badge color for an enrollment status
 * @param {string} status - Enrollment status value
 * @returns {string} Quasar color name
 */
export function getStatusColor(status) {
  const match = ENROLLMENT_STATUSES.find((s) => s.value === status);
  return match ? match.color : 'grey';
}
