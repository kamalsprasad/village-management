import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSchoolStore } from 'src/modules/school/stores/school-store';
import { mockTables } from 'test/helpers/appwrite-mock';

// Mock learner-store
vi.mock('src/modules/school/stores/learner-store', () => ({
  useLearnerStore: () => ({
    learners: [{ $id: 'l1', first_name: 'John', last_name: 'Doe' }],
    fetchLearners: vi.fn().mockResolvedValue({ success: true }),
    getLearnerName: vi.fn((l) => `${l.first_name} ${l.last_name}`),
  }),
}));

// Mock class-store (circular dep — imported at bottom of school-store)
vi.mock('src/modules/school/stores/class-store', () => ({
  useClassStore: () => ({
    classes: [{ $id: 'cls-1', name: 'Grade 1A' }],
  }),
}));

// Mock school-utils
vi.mock('src/modules/school/utils/school-utils', () => ({
  computeScorePercent: vi.fn((score, total) => (total > 0 ? (score / total) * 100 : 0)),
  normalizeClassId: vi.fn((id) => (typeof id === 'object' ? id?.$id : id)),
}));

const testScore = (over = {}) => ({
  $id: 'ts-1',
  learner_id: 'l1',
  class_id: 'cls-1',
  subject: 'Math',
  assessment_type: 'test',
  term: 'Term 1',
  academic_year: 2026,
  assessment_date: '2026-02-15T00:00:00Z',
  score: 85,
  total_marks: 100,
  ...over,
});

describe('school-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSchoolStore();
    vi.clearAllMocks();
  });

  describe('fetchTestScores', () => {
    it('fetches test scores and enriches them', async () => {
      const scores = [testScore()];
      mockTables.listRows.mockResolvedValue({ rows: scores });

      const result = await store.fetchTestScores();

      expect(result.success).toBe(true);
      expect(store.testScores).toHaveLength(1);
      expect(store.testScoresLoaded).toBe(true);
      expect(store.testScores[0].learner_name).toBe('John Doe');
      expect(store.testScores[0].learner_grade).toBe('Grade 1A');
    });

    it('returns cached data when already loaded', async () => {
      store.testScoresLoaded = true;
      store.testScores = [testScore()];

      const result = await store.fetchTestScores();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchTestScores();

      expect(result.success).toBe(false);
    });
  });

  describe('saveTestScores', () => {
    it('creates new scores when no $id', async () => {
      const newScore = testScore({ $id: 'ts-new' });
      mockTables.createRow.mockResolvedValue(newScore);

      const result = await store.saveTestScores([
        { learner_id: 'l1', subject: 'Math', score: 85, total_marks: 100 },
      ]);

      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
      expect(store.testScores.find((s) => s.$id === 'ts-new')).toBeDefined();
    });

    it('updates existing scores when $id is present', async () => {
      store.testScores = [testScore({ $id: 'ts-1', score: 85 })];
      const updated = testScore({ $id: 'ts-1', score: 90 });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.saveTestScores([
        { $id: 'ts-1', score: 90, total_marks: 100 },
      ]);

      expect(result.success).toBe(true);
      expect(mockTables.updateRow).toHaveBeenCalled();
      expect(store.testScores[0].score).toBe(90);
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.saveTestScores([{ learner_id: 'l1' }]);

      expect(result.success).toBe(false);
    });
  });

  describe('deleteAssessment', () => {
    it('deletes all matching scores for an assessment', async () => {
      store.testScores = [
        testScore({ $id: 'ts-1', subject: 'Math', assessment_type: 'test', term: 'Term 1', academic_year: 2026, class_id: 'cls-1' }),
        testScore({ $id: 'ts-2', subject: 'English', assessment_type: 'test', term: 'Term 1', academic_year: 2026, class_id: 'cls-1' }),
      ];
      mockTables.deleteRow.mockResolvedValue();

      const result = await store.deleteAssessment({
        assessment_date: '2026-02-15',
        class_id: 'cls-1',
        subject: 'Math',
        assessment_type: 'test',
        term: 'Term 1',
        academic_year: 2026,
      });

      expect(result.success).toBe(true);
      expect(mockTables.deleteRow).toHaveBeenCalledTimes(1);
      // Only the Math score should be deleted
      expect(store.testScores).toHaveLength(1);
      expect(store.testScores[0].subject).toBe('English');
    });

    it('returns success when no matching scores exist', async () => {
      store.testScores = [];

      const result = await store.deleteAssessment({
        assessment_date: '2026-02-15',
        class_id: 'cls-1',
        subject: 'Math',
        assessment_type: 'test',
        term: 'Term 1',
        academic_year: 2026,
      });

      expect(result.success).toBe(true);
      expect(mockTables.deleteRow).not.toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      store.testScores = [testScore({ $id: 'ts-1' })];
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteAssessment({
        assessment_date: '2026-02-15',
        class_id: 'cls-1',
        subject: 'Math',
        assessment_type: 'test',
        term: 'Term 1',
        academic_year: 2026,
      });

      expect(result.success).toBe(false);
    });
  });
});
