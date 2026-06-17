/**
 * School Store (Story 4.2)
 *
 * Pinia store for school academics, including test scores.
 * Maintains a flat test_scores database structure. Grouping into logical
 * "assessments" is done client-side for reporting, lists, and performance analysis.
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useLearnerStore } from './learner-store';
import { ID, Query } from 'appwrite';
import { computeScorePercent } from '../utils/school-utils';

const errorHandler = useErrorHandler();

function normalizeId(value) {
  if (!value) return null;
  return typeof value === 'object' ? value.$id : value;
}

export const useSchoolStore = defineStore('school', {
  state: () => ({
    testScores: [],
    testScoresLoaded: false,
    isLoading: false,
  }),

  getters: {
    /**
     * Group flat test scores into unique past assessments.
     * An assessment is grouped by: Date, Class, Subject, Assessment Type, Term, Year, Max Score.
     * Includes aggregated metrics: learner count, class average %.
     */
    assessmentsList: (state) => {
      const learnerStore = useLearnerStore();
      const groups = {};

      state.testScores.forEach((score) => {
        const learner = learnerStore.learners.find((l) => l.$id === score.learner_id_normalized);
        const classId =
          score.class_id_normalized ||
          normalizeId(score.class_id) ||
          learner?.class_id_normalized ||
          normalizeId(learner?.class_id) ||
          'Unknown';

        // Extract ISO date portion
        const dateStr = score.assessment_date ? score.assessment_date.slice(0, 10) : 'Unknown';

        const key = `${dateStr}_${classId}_${score.subject}_${score.assessment_type}_${score.term}_${score.academic_year}`;

        if (!groups[key]) {
          groups[key] = {
            id: key,
            assessment_date: score.assessment_date,
            class_id: classId,
            subject: score.subject,
            assessment_type: score.assessment_type,
            term: score.term,
            academic_year: score.academic_year,
            max_score: score.max_score,
            scores: [],
          };
        }
        groups[key].scores.push(score);
      });

      return Object.values(groups)
        .map((group) => {
          const totalLearners = group.scores.length;
          const totalPercent = group.scores.reduce((acc, score) => {
            return acc + computeScorePercent(score.score_value, score.max_score);
          }, 0);

          return {
            ...group,
            learner_count: totalLearners,
            class_average: totalLearners > 0 ? Math.round(totalPercent / totalLearners) : 0,
          };
        })
        .sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
    },

    /**
     * Get score history for a single learner
     */
    getLearnerScoreHistory: (state) => (learnerId) => {
      return state.testScores
        .filter((s) => s.learner_id_normalized === learnerId)
        .sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
    },

    /**
     * Get subject averages for a single learner in an academic year
     */
    getLearnerSubjectAverages: (state) => (learnerId, academicYear) => {
      const learnerScores = state.testScores.filter(
        (s) => s.learner_id_normalized === learnerId && s.academic_year === academicYear,
      );

      const subjectsMap = {};
      learnerScores.forEach((s) => {
        if (!subjectsMap[s.subject]) {
          subjectsMap[s.subject] = { total: 0, count: 0 };
        }
        subjectsMap[s.subject].total += computeScorePercent(s.score_value, s.max_score);
        subjectsMap[s.subject].count += 1;
      });

      return Object.entries(subjectsMap).map(([subject, data]) => ({
        subject,
        average: Math.round(data.total / data.count),
        test_count: data.count,
      }));
    },
  },

  actions: {
    /**
     * Enrich raw test score rows with denormalized information
     */
    enrichTestScore(score) {
      const learnerStore = useLearnerStore();
      const classStore = useClassStore();
      const learnerId = normalizeId(score.learner_id);
      const classId = normalizeId(score.class_id);
      const learner = learnerStore.learners.find((l) => l.$id === learnerId);

      const className = classId
        ? classStore.classes.find((c) => c.$id === classId)?.name || ''
        : '';
      return {
        ...score,
        learner_id_normalized: learnerId,
        class_id_normalized: classId,
        learner_name: learner ? learnerStore.getLearnerName(learner) : 'Unknown Learner',
        learner_grade: className,
      };
    },

    /**
     * Fetch all test scores
     */
    async fetchTestScores(force = false) {
      if (this.testScoresLoaded && !force) {
        return { success: true, data: this.testScores };
      }
      this.isLoading = true;
      try {
        const learnerStore = useLearnerStore();
        await learnerStore.fetchLearners(); // Ensure learners are loaded for enrichment

        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'test_scores',
          queries: [Query.limit(2000), Query.orderDesc('assessment_date')],
        });

        this.testScores = response.rows.map((row) => this.enrichTestScore(row));
        this.testScoresLoaded = true;
        return { success: true, data: this.testScores };
      } catch (error) {
        console.error('Error fetching test scores:', error);
        errorHandler.notifyError('Failed to load academic test scores. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Save/Record a batch of test scores (Bulk entry)
     * Handles both updates (overwrites) and inserts.
     */
    async saveTestScores(scoresList) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        // Perform parallel saves
        const savePromises = scoresList.map(async (scoreData) => {
          if (scoreData.$id) {
            // Update existing row
            const { $id, ...writeFields } = scoreData;
            const updatedRow = await tables.updateRow({
              databaseId: dbId,
              tableId: 'test_scores',
              rowId: $id,
              data: writeFields,
            });
            return this.enrichTestScore(updatedRow);
          } else {
            // Create new row
            const createdRow = await tables.createRow({
              databaseId: dbId,
              tableId: 'test_scores',
              rowId: ID.unique(),
              data: scoreData,
            });
            return this.enrichTestScore(createdRow);
          }
        });

        const savedScores = await Promise.all(savePromises);

        // Update local state
        savedScores.forEach((saved) => {
          const index = this.testScores.findIndex((s) => s.$id === saved.$id);
          if (index !== -1) {
            this.testScores.splice(index, 1, saved);
          } else {
            this.testScores.unshift(saved);
          }
        });

        return { success: true, data: savedScores };
      } catch (error) {
        console.error('Error saving bulk test scores:', error);
        errorHandler.notifyError('Failed to record test scores. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete an entire assessment (all scores matching header combo)
     */
    async deleteAssessment(assessmentParams) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const learnerStore = useLearnerStore();

        // Find all local matching score IDs
        const dateStr = assessmentParams.assessment_date.slice(0, 10);
        const matches = this.testScores.filter((score) => {
          const learner = learnerStore.learners.find((l) => l.$id === score.learner_id_normalized);
          const classId =
            score.class_id_normalized ||
            normalizeId(score.class_id) ||
            learner?.class_id_normalized ||
            normalizeId(learner?.class_id) ||
            'Unknown';
          const sDateStr = score.assessment_date ? score.assessment_date.slice(0, 10) : '';

          return (
            sDateStr === dateStr &&
            classId === assessmentParams.class_id &&
            score.subject === assessmentParams.subject &&
            score.assessment_type === assessmentParams.assessment_type &&
            score.term === assessmentParams.term &&
            score.academic_year === assessmentParams.academic_year
          );
        });

        // Parallel delete from Appwrite
        const deletePromises = matches.map((score) =>
          tables.deleteRow({
            databaseId: dbId,
            tableId: 'test_scores',
            rowId: score.$id,
          }),
        );

        await Promise.all(deletePromises);

        // Filter out deleted rows from local state
        const deletedIds = new Set(matches.map((m) => m.$id));
        this.testScores = this.testScores.filter((s) => !deletedIds.has(s.$id));

        return { success: true };
      } catch (error) {
        console.error('Error deleting assessment:', error);
        errorHandler.notifyError('Failed to delete assessment records. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },
  },
});

// Import class-store at bottom to avoid circular dependency
import { useClassStore } from './class-store';
