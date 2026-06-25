/**
 * At-Risk Store (Story 4.7)
 *
 * Pinia store for at-risk learner identification. Orchestrates the computation
 * of at-risk status across all active learners by combining attendance data
 * (learner_attendance), academic data (test_scores), and calendar data
 * (school_academic_terms + school_calendar_events).
 *
 * At-risk status is DERIVED, not persisted. It is recomputed on demand with a
 * 60-second cache. The calculation is cheap (client-side over already-loaded
 * store data + one attendance fetch per learner).
 *
 * Key design choices:
 * - Attendance rate is computed from the CURRENT TERM's records only
 *   (from term.start_date to today). Historical attendance from prior terms
 *   does not affect the current at-risk status.
 * - A 5-school-day grace period suppresses flagging at the start of each term.
 * - Learners with no attendance records and no test scores are never at-risk.
 * - The grace period is checked school-wide (classId = null) for the banner;
 *   per-class closures in the first week are an acceptable edge case.
 */

import { defineStore } from 'pinia';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useLearnerStore } from './learner-store';
import { useClassStore } from './class-store';
import { useSchoolStore } from './school-store';
import { useAcademicTermsStore } from './academic-terms-store';
import { useCalendarEventsStore } from './calendar-events-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { toDateStrInTimezone } from 'src/utils/dateUtils';
import { normalizeClassId } from './class-store';
import {
  computeAttendanceRate,
  computeSubjectAverages,
  computeOverallAverage,
  evaluateAtRisk,
  isWithinGracePeriod,
  countElapsedSchoolDays,
} from '../utils/at-risk-utils';

const errorHandler = useErrorHandler();

/** Cache duration in milliseconds — skip re-computation if younger than this. */
const CACHE_TTL_MS = 60_000;

export const useAtRiskStore = defineStore('atRisk', {
  state: () => ({
    atRiskLearners: [],
    isLoading: false,
    lastComputedAt: null,
    gracePeriodActive: false,
    termsConfigured: true,
    elapsedSchoolDays: 0,
    currentTerm: null,
  }),

  getters: {
    /**
     * Total count of at-risk learners.
     */
    atRiskCount: (state) => state.atRiskLearners.length,

    /**
     * Partition at-risk learners by severity.
     */
    atRiskBySeverity: (state) => {
      const high = state.atRiskLearners.filter((l) => l.severity === 'high');
      const medium = state.atRiskLearners.filter((l) => l.severity === 'medium');
      return { high, medium };
    },

    /**
     * Group at-risk learners by grade level.
     * @returns {Object<string, Array>} Map of grade_level → at-risk learner objects
     */
    atRiskByGrade: (state) => {
      const map = {};
      for (const learner of state.atRiskLearners) {
        const grade = learner.gradeLevel || 'Unknown';
        if (!map[grade]) map[grade] = [];
        map[grade].push(learner);
      }
      return map;
    },

    /**
     * Get the at-risk evaluation for a single learner by ID.
     * @param {string} learnerId
     * @returns {object|null} The at-risk learner object or null if not at-risk.
     */
    getLearnerRisk: (state) => (learnerId) => {
      return state.atRiskLearners.find((l) => l.learnerId === learnerId) || null;
    },
  },

  actions: {
    /**
     * Compute at-risk status for all active learners.
     *
     * Orchestrates: load all dependent stores → resolve current term → check
     * grace period → if grace active, clear at-risk list → otherwise iterate
     * active learners, fetch term-bounded attendance, compute rate + subject
     * averages + overall average, evaluate at-risk, build the list.
     *
     * @param {{force?: boolean}} opts - force: true bypasses the 60s cache
     * @returns {{success: boolean}}
     */
    async computeAtRisk(opts = {}) {
      const force = opts.force === true;

      // Cache check
      if (!force && this.lastComputedAt && Date.now() - this.lastComputedAt < CACHE_TTL_MS) {
        return { success: true, data: this.atRiskLearners };
      }

      this.isLoading = true;
      try {
        // Ensure all dependent stores are loaded
        const learnerStore = useLearnerStore();
        const classStore = useClassStore();
        const schoolStore = useSchoolStore();
        const academicTermsStore = useAcademicTermsStore();
        const calendarEventsStore = useCalendarEventsStore();
        const settingsStore = useSettingsStore();

        await Promise.all([
          learnerStore.fetchLearners(),
          classStore.fetchClasses(),
          schoolStore.fetchTestScores(),
          academicTermsStore.fetchAcademicTerms(),
          calendarEventsStore.fetchCalendarEvents(),
        ]);

        // Resolve current term and grace period
        const tz = settingsStore.timezone;
        const todayIso = toDateStrInTimezone(new Date().toISOString(), tz);
        const termsConfigured = academicTermsStore.academicTerms.length > 0;
        const currentTerm = academicTermsStore.getTermForDate(todayIso);

        this.termsConfigured = termsConfigured;
        this.currentTerm = currentTerm;

        const graceActive = isWithinGracePeriod({
          term: currentTerm,
          today: todayIso,
          calendarEventsStore,
          classId: null, // school-wide grace check
          termsConfigured,
        });

        this.gracePeriodActive = graceActive;
        this.elapsedSchoolDays = countElapsedSchoolDays({
          term: currentTerm,
          today: todayIso,
          calendarEventsStore,
          classId: null,
        });

        // Grace period active → no flagging
        if (graceActive) {
          this.atRiskLearners = [];
          this.lastComputedAt = Date.now();
          return { success: true, data: [] };
        }

        // Determine the attendance date range (current term start → today)
        // If no current term, use the start of the current calendar year as fallback
        const attendanceStartDate = currentTerm
          ? toDateStrInTimezone(currentTerm.start_date, tz)
          : `${todayIso.slice(0, 4)}-01-01`;

        const academicYear = currentTerm
          ? currentTerm.academic_year
          : parseInt(todayIso.slice(0, 4), 10);

        // Iterate active learners and evaluate each
        const activeLearners = learnerStore.activeLearners;
        const atRiskList = [];

        // Fetch attendance for all learners in parallel (Option A from story spec).
        // Use Promise.allSettled so one failed fetch does not discard data for everyone else.
        const attendanceResults = await Promise.allSettled(
          activeLearners.map((learner) =>
            classStore
              .fetchAttendanceForLearner(
                learner.$id,
                new Date(`${attendanceStartDate}T00:00:00Z`).toISOString(),
                new Date(`${todayIso}T23:59:59Z`).toISOString(),
              )
              .then((result) => ({ learner, attendance: result.data || [] })),
          ),
        );

        for (const result of attendanceResults) {
          if (result.status === 'rejected') {
            console.warn('fetchAttendanceForLearner rejected:', result.reason);
            continue;
          }
          const { learner, attendance } = result.value;
          const attendanceRateInfo = computeAttendanceRate(attendance);
          const subjectAverages = computeSubjectAverages(
            schoolStore.testScores.filter((s) => s.learner_id_normalized === learner.$id),
            academicYear,
          );
          const overallAverage = computeOverallAverage(subjectAverages);

          // Skip learners with no data at all (no attendance, no scores)
          if (attendanceRateInfo.totalRecords === 0 && subjectAverages.length === 0) {
            continue;
          }

          // Attendance rate is null when no records → not at-risk on attendance
          const evaluation = evaluateAtRisk({
            attendanceRate: attendanceRateInfo.rate,
            subjectAverages,
            overallAverage,
          });

          if (evaluation.isAtRisk) {
            // Resolve grade level from the learner's class
            const classId = normalizeClassId(learner.class_id);
            const cls = classStore.classes.find((c) => c.$id === classId);
            const gradeLevel = cls ? cls.grade_level : 'Unknown';
            const className = cls ? cls.name : '—';

            // Find the lowest subject for display
            const lowestSubject =
              subjectAverages.length > 0
                ? subjectAverages.reduce((min, s) => (s.average < min.average ? s : min))
                : null;

            atRiskList.push({
              learnerId: learner.$id,
              learnerName: learnerStore.getLearnerName(learner),
              classId: classId || null,
              className,
              gradeLevel,
              attendanceRate: attendanceRateInfo.rate,
              attendanceDetail: attendanceRateInfo,
              subjectAverages,
              overallAverage,
              lowestSubject,
              reasons: evaluation.reasons,
              severity: evaluation.severity,
            });
          }
        }

        // Sort by severity (high first), then by attendance rate (lowest first)
        atRiskList.sort((a, b) => {
          if (a.severity !== b.severity) {
            return a.severity === 'high' ? -1 : 1;
          }
          const aRate = a.attendanceRate ?? 100;
          const bRate = b.attendanceRate ?? 100;
          return aRate - bRate;
        });

        this.atRiskLearners = atRiskList;
        this.lastComputedAt = Date.now();
        return { success: true, data: atRiskList };
      } catch (error) {
        console.error('Error computing at-risk status:', error);
        errorHandler.notifyError('Failed to compute at-risk status. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Force re-computation (bypasses cache).
     */
    async refresh() {
      return this.computeAtRisk({ force: true });
    },
  },
});
