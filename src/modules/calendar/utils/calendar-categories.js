/**
 * Village Calendar Categories (Story 5.1)
 *
 * Single shared category → color/icon map for the global village calendar.
 * Reused by the calendar page, the dashboard Upcoming Events widget, and
 * Story 5.2+ (event creation). Guests/Equipment/Energy are forward-compatible
 * labels — no events are emitted for them until those modules are built.
 */

export const CALENDAR_CATEGORIES = [
  { value: 'school', label: 'School', color: 'blue-7', icon: 'school' },
  { value: 'farm', label: 'Farm', color: 'green-7', icon: 'agriculture' },
  { value: 'village', label: 'Village', color: 'brown-7', icon: 'holiday_village' },
  { value: 'guests', label: 'Guests', color: 'purple-6', icon: 'luggage' },
  { value: 'equipment', label: 'Equipment', color: 'orange-7', icon: 'build' },
  { value: 'energy', label: 'Energy', color: 'amber-7', icon: 'bolt' },
  { value: 'other', label: 'Other', color: 'grey-6', icon: 'event_note' },
];

/**
 * Get the display config for a calendar category value.
 * Falls back to the 'other' category for unknown values.
 * @param {string} value
 * @returns {{ value, label, color, icon }}
 */
export function getCalendarCategory(value) {
  return CALENDAR_CATEGORIES.find((c) => c.value === value) || CALENDAR_CATEGORIES.at(-1);
}
