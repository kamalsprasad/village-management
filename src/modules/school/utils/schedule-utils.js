/**
 * Schedule Utilities
 *
 * Shared helpers for resolving the current school day, current time in the
 * configured village timezone, and a teacher's current or next class.
 */

import { formatInTimeZone } from 'date-fns-tz';
import { getDayOfWeekInTimezone } from 'src/utils/dateUtils.js';
import { timeToMinutes } from '../stores/period-slots-store.js';

export const SCHOOL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Return the current school day name in the given timezone.
 * If today is Saturday or Sunday, returns Monday.
 *
 * @param {string} [timezone='Africa/Lusaka']
 * @returns {string}
 */
export function getCurrentSchoolDayName(timezone = 'Africa/Lusaka') {
  const dayIndex = getDayOfWeekInTimezone(new Date().toISOString(), timezone);
  // 0 = Sunday, 6 = Saturday
  if (dayIndex === 0 || dayIndex === 6) {
    return 'Monday';
  }
  return DAY_NAMES[dayIndex] || 'Monday';
}

/**
 * Return the current time as total minutes since midnight in the given timezone.
 *
 * @param {string} [timezone='Africa/Lusaka']
 * @returns {number}
 */
export function getCurrentTimeMinutes(timezone = 'Africa/Lusaka') {
  const timeStr = formatInTimeZone(new Date(), timezone, 'HH:mm');
  return timeToMinutes(timeStr);
}

/**
 * Return the next school day after the given day.
 * Rolls from Friday back to Monday.
 *
 * @param {string} dayName
 * @returns {string}
 */
export function getNextSchoolDay(dayName) {
  const idx = SCHOOL_DAYS.indexOf(dayName);
  if (idx === -1 || idx >= SCHOOL_DAYS.length - 1) {
    return 'Monday';
  }
  return SCHOOL_DAYS[idx + 1];
}

/**
 * Build a list of a teacher's scheduled classes for a given day, enriched with
 * slot and class details and sorted by start time.
 *
 * @param {string} teacherId
 * @param {number} academicYear
 * @param {string} dayName
 * @param {object} timetableStore
 * @param {object} periodSlotsStore
 * @param {object} classStore
 * @returns {Array<{entry, slot, cls, startMinutes, endMinutes}>}
 */
function getDayClasses(
  teacherId,
  academicYear,
  dayName,
  timetableStore,
  periodSlotsStore,
  classStore,
) {
  const entries = timetableStore.teacherSchedule(teacherId, academicYear).filter(
    (e) => e.day_of_week === dayName,
  );

  return entries
    .map((entry) => {
      const slot = periodSlotsStore.periodSlots.find((s) => s.$id === entry.slot_id);
      const cls = classStore.classes.find((c) => c.$id === entry.class_id_normalized);
      return {
        entry,
        slot,
        cls,
        startMinutes: slot ? timeToMinutes(slot.start_time) : -1,
        endMinutes: slot ? timeToMinutes(slot.end_time) : -1,
      };
    })
    .filter((item) => item.startMinutes >= 0 && item.endMinutes >= 0)
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

/**
 * Find the teacher's current or next scheduled class.
 * Prefers a class happening right now; otherwise the next class today; otherwise
 * the first class of the next school day.
 *
 * @param {string} teacherId
 * @param {number} academicYear
 * @param {object} timetableStore
 * @param {object} periodSlotsStore
 * @param {object} classStore
 * @param {string} [timezone='Africa/Lusaka']
 * @returns {object|null} { day, periodLabel, startTime, endTime, subject, className, classId, isNow }
 */
export function findCurrentOrNextClass(
  teacherId,
  academicYear,
  timetableStore,
  periodSlotsStore,
  classStore,
  timezone = 'Africa/Lusaka',
) {
  const dayName = getCurrentSchoolDayName(timezone);
  const nowMinutes = getCurrentTimeMinutes(timezone);

  const todayClasses = getDayClasses(
    teacherId,
    academicYear,
    dayName,
    timetableStore,
    periodSlotsStore,
    classStore,
  );

  if (todayClasses.length === 0) {
    return null;
  }

  const current = todayClasses.find(
    (item) => nowMinutes >= item.startMinutes && nowMinutes < item.endMinutes,
  );
  if (current) {
    return {
      day: dayName,
      periodLabel: current.slot?.label || 'Period',
      startTime: current.slot?.start_time,
      endTime: current.slot?.end_time,
      subject: current.entry.subject || 'No subject',
      className: current.cls?.name || 'Unknown Class',
      classId: current.cls?.$id,
      isNow: true,
    };
  }

  const next = todayClasses.find((item) => nowMinutes < item.startMinutes);
  if (next) {
    return {
      day: dayName,
      periodLabel: next.slot?.label || 'Period',
      startTime: next.slot?.start_time,
      endTime: next.slot?.end_time,
      subject: next.entry.subject || 'No subject',
      className: next.cls?.name || 'Unknown Class',
      classId: next.cls?.$id,
      isNow: false,
    };
  }

  // School day is over — look at the next school day.
  const nextDayName = getNextSchoolDay(dayName);
  const nextDayClasses = getDayClasses(
    teacherId,
    academicYear,
    nextDayName,
    timetableStore,
    periodSlotsStore,
    classStore,
  );

  if (nextDayClasses.length === 0) {
    return null;
  }

  const first = nextDayClasses[0];
  return {
    day: nextDayName,
    periodLabel: first.slot?.label || 'Period',
    startTime: first.slot?.start_time,
    endTime: first.slot?.end_time,
    subject: first.entry.subject || 'No subject',
    className: first.cls?.name || 'Unknown Class',
    classId: first.cls?.$id,
    isNow: false,
  };
}
