import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSchoolGoalsStore } from 'src/modules/school/stores/school-goals-store';
import { mockTables } from 'test/helpers/appwrite-mock';

// Mock cross-store deps (only needed for computeProgress, not CRUD)
vi.mock('src/modules/school/stores/learner-store', () => ({
  useLearnerStore: () => ({ learners: [], fetchLearners: vi.fn() }),
}));
vi.mock('src/modules/school/stores/school-store', () => ({
  useSchoolStore: () => ({ testScores: [], fetchTestScores: vi.fn() }),
}));
vi.mock('src/modules/school/stores/class-store', () => ({
  useClassStore: () => ({ classes: [] }),
}));
vi.mock('src/modules/school/stores/academic-terms-store', () => ({
  useAcademicTermsStore: () => ({ academicTerms: [], fetchAcademicTerms: vi.fn() }),
}));

// Mock school-goal-utils
vi.mock('src/modules/school/utils/school-goal-utils', () => ({
  computeProgressForYear: vi.fn(() => ({})),
  computeProgressHistory: vi.fn(() => []),
  computeYearlyProgress: vi.fn(() => ({})),
  computeBreakdownByGrade: vi.fn(() => ({})),
  computeBreakdownBySubject: vi.fn(() => ({})),
  evaluateProjection: vi.fn(() => ({})),
  roundToOneDecimal: vi.fn((n) => n),
}));

const goal = (over = {}) => ({
  $id: 'goal-1',
  academic_year: 2026,
  target_pass_rate: 80,
  is_active: true,
  notes: 'Test goal',
  ...over,
});

describe('school-goals-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSchoolGoalsStore();
    vi.clearAllMocks();
  });

  describe('fetchGoals', () => {
    it('fetches goals and updates state', async () => {
      const goals = [goal()];
      mockTables.listRows.mockResolvedValue({ rows: goals });

      const result = await store.fetchGoals();

      expect(result.success).toBe(true);
      expect(store.goals).toEqual(goals);
      expect(store.goalsLoaded).toBe(true);
    });

    it('returns cached data when already loaded', async () => {
      store.goalsLoaded = true;
      store.goals = [goal()];

      const result = await store.fetchGoals();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchGoals();

      expect(result.success).toBe(false);
    });
  });

  describe('saveGoal', () => {
    it('creates a new goal when no $id', async () => {
      const newGoal = goal({ $id: 'goal-new' });
      mockTables.listRows.mockResolvedValue({ rows: [] });
      mockTables.createRow.mockResolvedValue(newGoal);

      const result = await store.saveGoal({
        academic_year: 2026,
        target_pass_rate: 80,
        is_active: true,
      });

      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
    });

    it('updates an existing goal when $id is present', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [] });
      const updated = goal({ $id: 'goal-1', target_pass_rate: 90 });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.saveGoal({
        $id: 'goal-1',
        target_pass_rate: 90,
      });

      expect(result.success).toBe(true);
      expect(mockTables.updateRow).toHaveBeenCalled();
    });

    it('deactivates other active goals when setting a new active goal', async () => {
      // First fetchGoals call returns existing active goals
      mockTables.listRows.mockResolvedValue({
        rows: [goal({ $id: 'other-1', is_active: true })],
      });
      mockTables.updateRow.mockResolvedValue(goal({ $id: 'other-1', is_active: false }));
      mockTables.createRow.mockResolvedValue(goal({ $id: 'goal-new', is_active: true }));

      const result = await store.saveGoal({
        academic_year: 2026,
        target_pass_rate: 80,
        is_active: true,
      });

      expect(result.success).toBe(true);
      // Should have called updateRow to deactivate the other goal
      expect(mockTables.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          rowId: 'other-1',
          data: expect.objectContaining({ is_active: false }),
        }),
      );
    });

    it('clears progress cache after saving', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [] });
      mockTables.createRow.mockResolvedValue(goal());
      store.progressCache = { some: 'data' };
      store.progressCacheTimestamp = Date.now();

      await store.saveGoal({ academic_year: 2026, target_pass_rate: 80 });

      expect(store.progressCache).toEqual({});
      expect(store.progressCacheTimestamp).toBeNull();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [] });
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.saveGoal({ academic_year: 2026 });

      expect(result.success).toBe(false);
    });
  });

  describe('clearProgressCache', () => {
    it('resets progress cache and timestamp', () => {
      store.progressCache = { some: 'data' };
      store.progressCacheTimestamp = Date.now();

      store.clearProgressCache();

      expect(store.progressCache).toEqual({});
      expect(store.progressCacheTimestamp).toBeNull();
    });
  });
});
