/**
 * useProgressReport composable (extracted from LearnerDetailPage)
 *
 * Encapsulates learner progress report PDF generation logic:
 * dialog state, year/term selection, and the generate action.
 */

import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useSchoolStore } from '../stores/school-store';
import { useClassStore } from '../stores/class-store';
import { useAcademicTermsStore } from '../stores/academic-terms-store';
import { useCalendarEventsStore } from '../stores/calendar-events-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useSchoolGoalsStore } from '../stores/school-goals-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { exportLearnerProgressToPDF } from 'src/services/ReportExportService';
import { computeLearnerOverallAverage } from '../utils/school-goal-utils';

export function useProgressReport() {
  const $q = useQuasar();
  const schoolStore = useSchoolStore();
  const classStore = useClassStore();
  const academicTermsStore = useAcademicTermsStore();
  const calendarEventsStore = useCalendarEventsStore();
  const teacherStore = useTeacherStore();
  const goalsStore = useSchoolGoalsStore();
  const settingsStore = useSettingsStore();

  // Dialog state
  const showReportDialog = ref(false);
  const isGeneratingReport = ref(false);
  const selectedYear = ref(null);
  const selectedTerm = ref(null);
  const teacherComment = ref('');

  // Options for Year & Term selects
  const yearOptions = computed(() => {
    return academicTermsStore.availableYears.map((y) => ({ label: String(y), value: y }));
  });

  const termOptions = computed(() => {
    if (!selectedYear.value) return [];
    const yearValue =
      typeof selectedYear.value === 'object' ? selectedYear.value?.value : selectedYear.value;
    return academicTermsStore.termsByYear(yearValue).map((t) => ({
      label: t.term_name,
      value: t.term_name,
      start_date: t.start_date,
      end_date: t.end_date,
    }));
  });

  /**
   * Generate and download a learner progress report PDF.
   *
   * @param {Object} params
   * @param {Object} params.learner - Current learner record
   * @param {Object|null} params.resident - Resident record (or null)
   * @param {string} params.learnerName - Display name
   * @param {string} params.learnerClassName - Class display name
   * @param {string} params.householdName - Household display name
   * @param {Array} params.learnerInterventions - Interventions for this learner
   */
  async function generateReport({
    learner,
    resident,
    learnerName,
    learnerClassName,
    householdName,
    learnerInterventions,
  }) {
    if (!selectedYear.value || !selectedTerm.value) {
      $q.notify({ type: 'warning', message: 'Please select an academic year and term' });
      return;
    }

    isGeneratingReport.value = true;
    try {
      const yearValue =
        typeof selectedYear.value === 'object' ? selectedYear.value?.value : selectedYear.value;
      const termValue =
        typeof selectedTerm.value === 'object' ? selectedTerm.value?.value : selectedTerm.value;
      const termStart = selectedTerm.value?.start_date;
      const termEnd = selectedTerm.value?.end_date;

      // 1. Fetch term attendance
      const attResult = await classStore.fetchAttendanceForLearner(learner.$id, termStart, termEnd);
      const attendanceRecords = attResult?.data || [];

      // 2. Count total school days for term
      const totalSchoolDays = calendarEventsStore.countSchoolDaysBetween(termStart, termEnd);

      // 3. Compute overall average for the year/term combination
      const learnerOverallAverage = computeLearnerOverallAverage(
        schoolStore.testScores,
        learner.$id,
        yearValue,
        termValue,
      );

      // 4. Generate and download PDF
      await exportLearnerProgressToPDF({
        learner,
        resident: resident
          ? {
              full_name: learnerName,
              dob: resident.dob,
              household_name: householdName,
            }
          : null,
        className: learnerClassName,
        testScores: schoolStore.testScores,
        attendanceRecords,
        totalSchoolDays,
        interventions: learnerInterventions,
        activeGoal: goalsStore.activeGoal,
        learnerOverallAverage,
        teacherComment: teacherComment.value,
        termName: termValue,
        academicYear: yearValue,
        villageName: settingsStore.villageName,
        teacherAssignments: teacherStore.teacherAssignments,
        returnBytes: false,
      });

      $q.notify({ type: 'positive', message: 'Progress report downloaded.' });
      showReportDialog.value = false;
    } catch (error) {
      console.error('Error generating learner progress report:', error);
      $q.notify({ type: 'negative', message: 'Failed to generate progress report PDF' });
    } finally {
      isGeneratingReport.value = false;
    }
  }

  /**
   * Initialize default year/term selections based on available data.
   *
   * @param {Object} learner - Current learner record
   */
  function initDefaults(learner) {
    if (academicTermsStore.availableYears.length === 0) return;

    const currentYear = new Date().getFullYear();
    const defaultYear = academicTermsStore.availableYears.includes(currentYear)
      ? currentYear
      : academicTermsStore.availableYears[0];
    selectedYear.value = { label: String(defaultYear), value: defaultYear };

    const yearTerms = academicTermsStore.termsByYear(defaultYear);
    if (yearTerms.length > 0 && learner) {
      // Find the most recent term with recorded scores for this learner
      const scoredTerms = schoolStore.testScores
        .filter((s) => s.learner_id_normalized === learner.$id && s.academic_year === defaultYear)
        .map((s) => s.term);
      const scoredTermSet = new Set(scoredTerms);
      const matchedTerm =
        yearTerms.findLast((t) => scoredTermSet.has(t.term_name)) ||
        yearTerms[yearTerms.length - 1];

      selectedTerm.value = {
        label: matchedTerm.term_name,
        value: matchedTerm.term_name,
        start_date: matchedTerm.start_date,
        end_date: matchedTerm.end_date,
      };
    }
  }

  return {
    showReportDialog,
    isGeneratingReport,
    selectedYear,
    selectedTerm,
    teacherComment,
    yearOptions,
    termOptions,
    generateReport,
    initDefaults,
  };
}
