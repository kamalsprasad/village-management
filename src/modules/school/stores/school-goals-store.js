/**
 * School Goals Store (Story 4.12)
 *
 * Pinia store for the village's long-term educational goal. Manages the
 * school_long_term_goals table and computes progress metrics from existing
 * learner/test score data.
 *
 * Stable public API for Story 4.13:
 *   - getters.activeGoal
 *   - getters.getGoalProgress(academicYear, termName?)
 *   - getters.getCurrentProgress
 *   - getters.getProgressHistory
 *   - getters.getBreakdownByGrade
 *   - getters.getBreakdownBySubject
 *   - actions.fetchGoals()
 *   - actions.saveGoal(goalData)
 *   - actions.computeProgress(force?)
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { ID, Query } from 'appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useLearnerStore } from './learner-store';
import { useSchoolStore } from './school-store';
import { useClassStore } from './class-store';
import { useAcademicTermsStore } from './academic-terms-store';
import {
  computeProgressForYear,
  computeProgressHistory,
  computeYearlyProgress,
  computeBreakdownByGrade,
  computeBreakdownBySubject,
  evaluateProjection,
  roundToOneDecimal,
} from '../utils/school-goal-utils';

const TABLE_ID = 'school_long_term_goals';
const CACHE_TTL_MS = 60000;
const errorHandler = useErrorHandler();

export const useSchoolGoalsStore = defineStore('schoolGoals', {
  state: () => ({
    goals: [],
    goalsLoaded: false,
    isLoading: false,
    progressCache: {},
    progressCacheTimestamp: null,
  }),

  getters: {
    /**
     * Return the single active goal. If multiple rows are marked active,
     * prefer the most recently updated one.
     */
    activeGoal: (state) => {
      const active = state.goals.filter((g) => g.is_active === true);
      if (active.length === 0) return null;
      return active.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt))[0];
    },

    /**
     * Get cached progress for a specific academic year and optional term.
     * Looks up term-level history when termName is provided, otherwise yearly progress.
     */
    getGoalProgress:
      (state) =>
      (academicYear, termName = null) => {
        if (!state.progressCache) return null;
        if (termName) {
          return (
            state.progressCache.history?.find(
              (p) => p.academicYear === academicYear && p.termName === termName,
            ) || null
          );
        }
        return (
          state.progressCache.yearlyProgress?.find((p) => p.academicYear === academicYear) || null
        );
      },

    /**
     * Get the current academic year-to-date progress with projection.
     */
    getCurrentProgress: (state) => state.progressCache?.current || null,

    /**
     * Get the term-level progress history array (for charts).
     */
    getProgressHistory: (state) => state.progressCache?.history || [],

    /**
     * Get the current year grade-level breakdown.
     */
    getBreakdownByGrade: (state) => state.progressCache?.breakdownByGrade || [],

    /**
     * Get the current year subject-level breakdown.
     */
    getBreakdownBySubject: (state) => state.progressCache?.breakdownBySubject || [],
  },

  actions: {
    /**
     * Fetch all school long-term goals from Appwrite.
     * Uses cached state unless force=true.
     */
    async fetchGoals(force = false) {
      if (this.goalsLoaded && !force) {
        return { success: true, data: this.goals };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: TABLE_ID,
          queries: [Query.limit(100)],
        });
        this.goals = response.rows || [];
        this.goalsLoaded = true;
        return { success: true, data: this.goals };
      } catch (error) {
        console.error('Error fetching school long-term goals:', error);
        errorHandler.notifyError('Failed to load long-term goals. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create or update a goal row.
     * If goalData.$id is set, updates the existing row; otherwise creates a new one.
     * Only one goal should be active at a time; this method does not deactivate others.
     */
    async saveGoal(goalData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const data = { ...goalData };
        let result;

        // Enforce single-active-goal invariant: if this goal is being set
        // active, deactivate all other currently-active goals first.
        if (data.is_active === true) {
          await this.fetchGoals();
          const othersToDeactivate = this.goals.filter(
            (g) => g.is_active === true && g.$id !== data.$id,
          );
          for (const g of othersToDeactivate) {
            await tables.updateRow({
              databaseId: dbId,
              tableId: TABLE_ID,
              rowId: g.$id,
              data: { is_active: false },
            });
          }
        }

        if (data.$id) {
          const { $id, ...writeFields } = data;
          result = await tables.updateRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: $id,
            data: writeFields,
          });
        } else {
          result = await tables.createRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: ID.unique(),
            data,
          });
        }

        await this.fetchGoals(true);
        // Invalidate progress cache since goal config changed
        this.progressCache = {};
        this.progressCacheTimestamp = null;
        return { success: true, data: result };
      } catch (error) {
        console.error('Error saving school long-term goal:', error);
        errorHandler.notifyError('Failed to save long-term goal. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Compute and cache all goal progress metrics.
     * Cached for 60 seconds unless force=true.
     */
    async computeProgress(force = false) {
      const now = Date.now();
      if (
        !force &&
        this.progressCacheTimestamp &&
        now - this.progressCacheTimestamp < CACHE_TTL_MS
      ) {
        return { success: true, data: this.progressCache };
      }

      this.isLoading = true;
      try {
        const learnerStore = useLearnerStore();
        const schoolStore = useSchoolStore();
        const classStore = useClassStore();
        const termsStore = useAcademicTermsStore();

        await Promise.all([
          this.fetchGoals(),
          learnerStore.fetchLearners(),
          schoolStore.fetchTestScores(),
          classStore.fetchClasses(),
          termsStore.fetchAcademicTerms(),
        ]);

        const activeGoal = this.activeGoal;
        if (!activeGoal) {
          this.progressCache = {};
          this.progressCacheTimestamp = now;
          return { success: true, data: this.progressCache };
        }

        const activeLearners = learnerStore.activeLearners || [];
        const testScores = schoolStore.testScores || [];
        const academicTerms = termsStore.academicTerms || [];
        const currentYear = new Date().getFullYear();

        const targetScore = Number(activeGoal.target_percentile_score ?? 90);
        const targetPercentOfLearners = Number(activeGoal.target_percent_of_learners ?? 90);
        const targetYear = Number(activeGoal.target_academic_year ?? currentYear + 10);

        // Build a class map for grade-level breakdowns
        const classesMap = {};
        for (const cls of classStore.classes || []) {
          classesMap[cls.$id] = cls;
        }

        // Current academic year to date
        const currentProgress = computeProgressForYear(
          activeLearners,
          testScores,
          currentYear,
          targetScore,
        );

        // Term-level history (for chart)
        const history = computeProgressHistory(
          activeLearners,
          testScores,
          academicTerms,
          targetScore,
        );

        // Year-level progress (for projection)
        const yearlyProgress = computeYearlyProgress(activeLearners, testScores, targetScore);

        // Grade / subject breakdowns for current year
        const breakdownByGrade = computeBreakdownByGrade(
          activeLearners,
          testScores,
          classesMap,
          currentYear,
          targetScore,
          targetPercentOfLearners,
        );
        const breakdownBySubject = computeBreakdownBySubject(
          activeLearners,
          testScores,
          currentYear,
          targetScore,
          targetPercentOfLearners,
        );

        // Projection
        const projection = evaluateProjection(
          currentProgress.percentAtTarget,
          targetPercentOfLearners,
          yearlyProgress,
          targetYear,
          currentYear,
        );

        this.progressCache = {
          current: {
            ...currentProgress,
            targetPercent: targetPercentOfLearners,
            gap: roundToOneDecimal(
              Math.max(0, targetPercentOfLearners - currentProgress.percentAtTarget),
            ),
            yearsRemaining: targetYear - currentYear,
            requiredAnnualImprovement: projection.requiredAnnualImprovement,
            projectedOutcome: projection.projectedOutcome,
            projectionStatus: projection.status,
            projectionMessage: projection.message,
          },
          history,
          yearlyProgress,
          breakdownByGrade,
          breakdownBySubject,
        };
        this.progressCacheTimestamp = now;

        return { success: true, data: this.progressCache };
      } catch (error) {
        console.error('Error computing goal progress:', error);
        errorHandler.notifyError('Failed to compute goal progress. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Clear the progress cache. Call this when test scores or learner data change.
     */
    clearProgressCache() {
      this.progressCache = {};
      this.progressCacheTimestamp = null;
    },
  },
});
