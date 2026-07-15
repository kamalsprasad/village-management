/**
 * At-Risk Utilities (Story 4.7)
 *
 * Pure functions for at-risk learner identification. No Vue/Pinia dependencies —
 * designed to be unit-testable in isolation when a test framework is added.
 *
 * At-risk criteria (per PRD FR-11 and Epic 4.7):
 *   - Attendance < 90%  (severity: high)
 *   - Any subject < 50% (severity: high)
 *   - Overall average < 60% (severity: medium, only if no high-severity criterion met)
 *
 * A learner is at-risk if ANY ONE criterion is met.
 * A learner with no attendance records and no test scores is NEVER at-risk.
 *
 * Attendance rate semantics: (Present + Late) / total records.
 * Excused and Absent both count against the learner.
 */

import { computeScorePercent } from './school-utils';

/** At-risk thresholds — single source of truth. */
export const AT_RISK_THRESHOLDS = {
  ATTENDANCE: 90, // < 90% → at-risk (high)
  SUBJECT: 50, // < 50% in any subject → at-risk (high)
  OVERALL: 60, // < 60% overall → at-risk (medium)
};

/** Number of school days after term start before at-risk flagging begins. */
export const GRACE_PERIOD_SCHOOL_DAYS = 5;

/**
 * Compute the attendance rate from a list of learner_attendance records.
 *
 * Counts Present + Late as "present". Excused and Absent count against the learner.
 *
 * @param {Array<{status: string}>} attendanceRecords - learner_attendance rows
 * @returns {{rate: number|null, presentCount: number, lateCount: number, absentCount: number, excusedCount: number, totalRecords: number}}
 *   rate is null when there are no records (caller must check totalRecords === 0
 *   to distinguish "no data" from "0% attendance").
 */
export function computeAttendanceRate(attendanceRecords) {
  if (!attendanceRecords || attendanceRecords.length === 0) {
    return {
      rate: null,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      excusedCount: 0,
      totalRecords: 0,
    };
  }

  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  for (const rec of attendanceRecords) {
    switch (rec.status) {
      case 'Present':
        presentCount++;
        break;
      case 'Late':
        lateCount++;
        break;
      case 'Absent':
        absentCount++;
        break;
      case 'Excused':
        excusedCount++;
        break;
    }
  }

  const totalRecords = attendanceRecords.length;
  const rate = Math.round(((presentCount + lateCount) / totalRecords) * 100);

  return { rate, presentCount, lateCount, absentCount, excusedCount, totalRecords };
}

/**
 * Compute per-subject average percentages for a learner in a given academic year.
 * Reuses computeScorePercent from school-utils for consistency.
 *
 * @param {Array<{subject: string, score_value: number, max_score: number, academic_year: number}>} testScores - flat test_scores rows
 * @param {number} academicYear - the academic year to filter on
 * @returns {Array<{subject: string, average: number, testCount: number}>} sorted by subject name
 */
export function computeSubjectAverages(testScores, academicYear) {
  if (!testScores || testScores.length === 0) return [];

  const yearScores = testScores.filter((s) => s.academic_year === academicYear);
  if (yearScores.length === 0) return [];

  const subjectsMap = {};
  for (const s of yearScores) {
    if (!subjectsMap[s.subject]) {
      subjectsMap[s.subject] = { total: 0, count: 0 };
    }
    subjectsMap[s.subject].total += computeScorePercent(s.score_value, s.max_score);
    subjectsMap[s.subject].count += 1;
  }

  return Object.entries(subjectsMap)
    .map(([subject, data]) => ({
      subject,
      average: Math.round(data.total / data.count),
      testCount: data.count,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

/**
 * Compute the overall average across all subject averages.
 *
 * @param {Array<{average: number}>} subjectAverages - output of computeSubjectAverages
 * @returns {number|null} rounded overall average, or null when input is empty
 */
export function computeOverallAverage(subjectAverages) {
  if (!subjectAverages || subjectAverages.length === 0) return null;
  const total = subjectAverages.reduce((sum, s) => sum + s.average, 0);
  return Math.round(total / subjectAverages.length);
}

/**
 * Evaluate whether a learner is at-risk based on attendance and academic data.
 *
 * @param {{attendanceRate: number|null, subjectAverages: Array<{subject: string, average: number}>, overallAverage: number|null}} input
 * @returns {{isAtRisk: boolean, reasons: Array<{type: string, detail: string}>, severity: string}}
 *   severity ∈ 'high' | 'medium' | 'none'
 *   high = attendance <90% OR any subject <50%; medium = overall <60% only
 */
export function evaluateAtRisk({ attendanceRate, subjectAverages, overallAverage }) {
  const reasons = [];
  let severity = 'none';

  // Attendance criterion: < 90%
  if (attendanceRate !== null && attendanceRate < AT_RISK_THRESHOLDS.ATTENDANCE) {
    reasons.push({
      type: 'attendance',
      detail: `Attendance ${attendanceRate}% (below ${AT_RISK_THRESHOLDS.ATTENDANCE}% threshold)`,
    });
    severity = 'high';
  }

  // Academic criterion: < 50% in any subject
  if (subjectAverages && subjectAverages.length > 0) {
    const belowThreshold = subjectAverages.filter(
      (s) => s.average < AT_RISK_THRESHOLDS.SUBJECT,
    );
    for (const s of belowThreshold) {
      reasons.push({
        type: 'subject',
        detail: `${s.subject} ${s.average}% (below ${AT_RISK_THRESHOLDS.SUBJECT}% threshold)`,
      });
      severity = 'high';
    }

    // Overall criterion: < 60%
    if (overallAverage !== null && overallAverage < AT_RISK_THRESHOLDS.OVERALL) {
      reasons.push({
        type: 'overall',
        detail: `Overall average ${overallAverage}% (below ${AT_RISK_THRESHOLDS.OVERALL}% threshold)`,
      });
      if (severity !== 'high') {
        severity = 'medium';
      }
    }
  }

  return {
    isAtRisk: reasons.length > 0,
    reasons,
    severity,
  };
}

/**
 * Determine whether the at-risk grace period is still active.
 *
 * The grace period is GRACE_PERIOD_SCHOOL_DAYS school days from the current term's
 * start date. During the grace period, no learners are flagged at-risk.
 *
 * Edge cases:
 *   - No terms configured at all → grace is NOT active (flag immediately so the
 *     feature works on a fresh install before the admin configures terms).
 *   - Terms configured but today is not in any term (holiday gap) → grace IS
 *     active (safer not to flag on stale data).
 *
 * @param {{term: object|null, today: string|Date, calendarEventsStore: object, classId?: string|null, termsConfigured: boolean}} input
 * @returns {boolean} true if grace period is active (no flagging)
 */
export function isWithinGracePeriod({ term, today, calendarEventsStore, classId = null, termsConfigured }) {
  // No terms configured → no grace → flag immediately
  if (!termsConfigured) return false;

  // Terms exist but today is not in any term → grace active
  if (!term) return true;

  // Count school days from term start to today (inclusive)
  const elapsedSchoolDays = calendarEventsStore.countSchoolDaysBetween(
    term.start_date,
    today,
    classId,
  );

  return elapsedSchoolDays < GRACE_PERIOD_SCHOOL_DAYS;
}

/**
 * Count elapsed school days since the current term started.
 * Returns 0 when there is no current term or no terms configured.
 *
 * @param {{term: object|null, today: string|Date, calendarEventsStore: object, classId?: string|null}} input
 * @returns {number}
 */
export function countElapsedSchoolDays({ term, today, calendarEventsStore, classId = null }) {
  if (!term) return 0;
  return calendarEventsStore.countSchoolDaysBetween(term.start_date, today, classId);
}
