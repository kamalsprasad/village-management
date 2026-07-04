/**
 * School Goal Utilities (Story 4.12)
 *
 * Pure functions for computing progress toward the village's long-term educational goal.
 * No Vue/Pinia dependencies — designed to be unit-testable in isolation.
 *
 * Goal interpretation (confirmed by user):
 *   - The "90th percentile" is modelled as a configurable benchmark score threshold
 *     (default 90%).
 *   - A learner is "at target" when their current academic-year overall average is
 *     >= the benchmark score threshold.
 *   - The headline metric is the percentage of active learners who are at target.
 */

import { computeSubjectAverages, computeOverallAverage } from './at-risk-utils';
import { computeScorePercent, normalizeClassId } from './school-utils';

/**
 * Round a number to one decimal place for display.
 * @param {number} value
 * @returns {number}
 */
export function roundToOneDecimal(value) {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.round(value * 10) / 10;
}

/**
 * Compute a learner's overall average for a given academic year and optional term.
 *
 * @param {Array} testScores - all enriched test_scores rows (must include learner_id_normalized)
 * @param {string} learnerId - learner $id
 * @param {number} academicYear
 * @param {string|null} [termName]
 * @returns {number|null} overall average, or null if no scores match
 */
export function computeLearnerOverallAverage(testScores, learnerId, academicYear, termName = null) {
  const learnerScores = testScores.filter((s) => {
    const matchesLearner = s.learner_id_normalized === learnerId;
    const matchesYear = s.academic_year === academicYear;
    const matchesTerm = termName ? s.term === termName : true;
    return matchesLearner && matchesYear && matchesTerm;
  });

  const subjectAverages = computeSubjectAverages(learnerScores, academicYear);
  return computeOverallAverage(subjectAverages);
}

/**
 * Determine whether a learner is at target for a given year/term.
 *
 * @param {Array} testScores
 * @param {string} learnerId
 * @param {number} academicYear
 * @param {number} targetScore
 * @param {string|null} [termName]
 * @returns {boolean}
 */
export function isLearnerAtTarget(
  testScores,
  learnerId,
  academicYear,
  targetScore,
  termName = null,
) {
  const overall = computeLearnerOverallAverage(testScores, learnerId, academicYear, termName);
  return overall !== null && overall >= targetScore;
}

/**
 * Compute progress for a specific academic year and optional term.
 *
 * @param {Array} activeLearners - learners with enrollment_status === 'Active'
 * @param {Array} testScores
 * @param {number} academicYear
 * @param {number} targetScore
 * @param {string|null} [termName]
 * @returns {{academicYear: number, termName?: string, atTarget: number, total: number, percentAtTarget: number}}
 */
export function computeProgressForPeriod(
  activeLearners,
  testScores,
  academicYear,
  targetScore,
  termName = null,
) {
  let atTarget = 0;
  for (const learner of activeLearners) {
    if (isLearnerAtTarget(testScores, learner.$id, academicYear, targetScore, termName)) {
      atTarget += 1;
    }
  }
  const total = activeLearners.length;
  return {
    academicYear,
    ...(termName ? { termName } : {}),
    atTarget,
    total,
    percentAtTarget: total > 0 ? roundToOneDecimal((atTarget / total) * 100) : 0,
  };
}

/**
 * Compute progress for an academic year (all terms in that year combined).
 * Convenience wrapper around computeProgressForPeriod without a term filter.
 *
 * @param {Array} activeLearners
 * @param {Array} testScores
 * @param {number} academicYear
 * @param {number} targetScore
 * @returns {{academicYear: number, atTarget: number, total: number, percentAtTarget: number}}
 */
export function computeProgressForYear(activeLearners, testScores, academicYear, targetScore) {
  return computeProgressForPeriod(activeLearners, testScores, academicYear, targetScore, null);
}

/**
 * Compute progress for a specific term.
 *
 * @param {Array} activeLearners
 * @param {Array} testScores
 * @param {number} academicYear
 * @param {string} termName
 * @param {number} targetScore
 * @returns {{academicYear: number, termName: string, atTarget: number, total: number, percentAtTarget: number}}
 */
export function computeProgressForTerm(
  activeLearners,
  testScores,
  academicYear,
  termName,
  targetScore,
) {
  return computeProgressForPeriod(activeLearners, testScores, academicYear, targetScore, termName);
}

/**
 * Compute term-level progress history for all (year, term) combinations that have scores.
 *
 * @param {Array} activeLearners
 * @param {Array} testScores
 * @param {Array} academicTerms - school_academic_terms rows (for term ordering)
 * @param {number} targetScore
 * @returns {Array<{academicYear: number, termName: string, atTarget: number, total: number, percentAtTarget: number}>}
 */
export function computeProgressHistory(activeLearners, testScores, academicTerms, targetScore) {
  const termsWithScores = new Set();
  for (const s of testScores) {
    if (s.term && s.academic_year) {
      termsWithScores.add(`${s.academic_year}|||${s.term}`);
    }
  }

  const history = [];
  for (const key of termsWithScores) {
    const [yearStr, termName] = key.split('|||');
    const year = parseInt(yearStr, 10);
    history.push(computeProgressForTerm(activeLearners, testScores, year, termName, targetScore));
  }

  // Build a term-order lookup for chronological sorting
  const termOrderMap = {};
  for (const t of academicTerms) {
    termOrderMap[`${t.academic_year}|||${t.term_name}`] = t.term_order;
  }

  history.sort((a, b) => {
    if (a.academicYear !== b.academicYear) return a.academicYear - b.academicYear;
    const orderA = termOrderMap[`${a.academicYear}|||${a.termName}`] ?? 0;
    const orderB = termOrderMap[`${b.academicYear}|||${b.termName}`] ?? 0;
    return orderA - orderB;
  });

  return history;
}

/**
 * Compute year-level progress points for every academic year that has scores.
 *
 * @param {Array} activeLearners
 * @param {Array} testScores
 * @param {number} targetScore
 * @returns {Array<{academicYear: number, atTarget: number, total: number, percentAtTarget: number}>}
 */
export function computeYearlyProgress(activeLearners, testScores, targetScore) {
  const years = [...new Set(testScores.map((s) => s.academic_year).filter((y) => y != null))].sort(
    (a, b) => a - b,
  );

  return years.map((year) => computeProgressForYear(activeLearners, testScores, year, targetScore));
}

/**
 * Compute grade-level breakdown for the current academic year.
 *
 * @param {Array} activeLearners
 * @param {Array} testScores
 * @param {Object} classesMap - map of classId -> { grade_level }
 * @param {number} academicYear
 * @param {number} targetScore
 * @param {number} targetPercentOfLearners - the goal percentage (used for gap calculation)
 * @returns {Array<{grade: string, total: number, atTarget: number, percentAtTarget: number, gap: number}>}
 */
export function computeBreakdownByGrade(
  activeLearners,
  testScores,
  classesMap,
  academicYear,
  targetScore,
  targetPercentOfLearners,
) {
  const learnersByGrade = {};
  for (const learner of activeLearners) {
    const classId = learner.class_id_normalized || normalizeClassId(learner.class_id);
    const grade = classId && classesMap[classId] ? classesMap[classId].grade_level : 'Unassigned';
    if (!learnersByGrade[grade]) learnersByGrade[grade] = [];
    learnersByGrade[grade].push(learner);
  }

  return Object.entries(learnersByGrade)
    .map(([grade, learners]) => {
      const progress = computeProgressForYear(learners, testScores, academicYear, targetScore);
      return {
        grade,
        total: progress.total,
        atTarget: progress.atTarget,
        percentAtTarget: progress.percentAtTarget,
        gap: roundToOneDecimal(targetPercentOfLearners - progress.percentAtTarget),
      };
    })
    .sort((a, b) => a.grade.localeCompare(b.grade));
}

/**
 * Compute subject-level breakdown for the current academic year.
 * Counts only learners who have at least one score in the subject.
 *
 * @param {Array} activeLearners
 * @param {Array} testScores
 * @param {number} academicYear
 * @param {number} targetScore
 * @param {number} targetPercentOfLearners - the goal percentage (used for gap calculation)
 * @returns {Array<{subject: string, total: number, atTarget: number, percentAtTarget: number, gap: number}>}
 */
export function computeBreakdownBySubject(
  activeLearners,
  testScores,
  academicYear,
  targetScore,
  targetPercentOfLearners,
) {
  const subjectsInYear = [
    ...new Set(testScores.filter((s) => s.academic_year === academicYear).map((s) => s.subject)),
  ].sort();

  return subjectsInYear.map((subject) => {
    let atTarget = 0;
    let total = 0;
    for (const learner of activeLearners) {
      const learnerScores = testScores.filter(
        (s) =>
          s.learner_id_normalized === learner.$id &&
          s.academic_year === academicYear &&
          s.subject === subject,
      );
      if (learnerScores.length === 0) continue;

      total += 1;
      const avg = Math.round(
        learnerScores.reduce((sum, s) => sum + computeScorePercent(s.score_value, s.max_score), 0) /
          learnerScores.length,
      );
      if (avg >= targetScore) atTarget += 1;
    }
    const percentAtTarget = total > 0 ? roundToOneDecimal((atTarget / total) * 100) : 0;
    return {
      subject,
      total,
      atTarget,
      percentAtTarget,
      gap: roundToOneDecimal(targetPercentOfLearners - percentAtTarget),
    };
  });
}

/**
 * Evaluate the projection toward the target year based on recent yearly progress.
 *
 * @param {number} currentPercent
 * @param {number} targetPercentOfLearners
 * @param {Array<{academicYear: number, percentAtTarget: number}>} yearlyProgress
 * @param {number} targetYear
 * @param {number} [currentYear] - defaults to current calendar year
 * @returns {{status: 'on_track' | 'at_risk' | 'insufficient_data', projectedOutcome: number|null, requiredAnnualImprovement: number, message: string|null}}
 */
export function evaluateProjection(
  currentPercent,
  targetPercentOfLearners,
  yearlyProgress,
  targetYear,
  currentYear = new Date().getFullYear(),
) {
  const yearsRemaining = targetYear - currentYear;

  // Target year in the past or current year — no remaining runway.
  if (yearsRemaining <= 0) {
    return {
      status: currentPercent >= targetPercentOfLearners ? 'on_track' : 'at_risk',
      projectedOutcome: currentPercent,
      requiredAnnualImprovement: 0,
      message: 'Target year has passed or is the current year.',
    };
  }

  const requiredAnnualImprovement = roundToOneDecimal(
    (targetPercentOfLearners - currentPercent) / yearsRemaining,
  );

  if (yearlyProgress.length < 2) {
    return {
      status: 'insufficient_data',
      projectedOutcome: null,
      requiredAnnualImprovement,
      message: 'Insufficient data — need at least two years of scores.',
    };
  }

  const sorted = [...yearlyProgress].sort((a, b) => a.academicYear - b.academicYear);
  const lastTwo = sorted.slice(-2);
  const annualImprovement = lastTwo[1].percentAtTarget - lastTwo[0].percentAtTarget;

  const projectedOutcome =
    yearsRemaining > 0
      ? roundToOneDecimal(currentPercent + annualImprovement * yearsRemaining)
      : currentPercent;

  const status = projectedOutcome >= targetPercentOfLearners ? 'on_track' : 'at_risk';

  return {
    status,
    projectedOutcome,
    requiredAnnualImprovement,
    message: null,
  };
}
