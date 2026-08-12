import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePeriodSlotsStore } from 'src/modules/school/stores/period-slots-store';
import { mockTables } from 'test/helpers/appwrite-mock';

const slot = (over = {}) => ({
  $id: 'slot-1',
  grade_level: '1',
  academic_year: 2026,
  slot_number: 1,
  label: 'Period 1',
  slot_type: 'lesson',
  start_time: '08:00',
  end_time: '08:40',
  applies_to_days: ['monday', 'tuesday'],
  notes: null,
  ...over,
});

describe('period-slots-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = usePeriodSlotsStore();
    vi.clearAllMocks();
  });

  describe('fetchPeriodSlots', () => {
    it('fetches slots and updates state', async () => {
      const slots = [slot()];
      mockTables.listRows.mockResolvedValue({ rows: slots });

      const result = await store.fetchPeriodSlots();

      expect(result.success).toBe(true);
      expect(store.periodSlots).toEqual(slots);
      expect(store.periodSlotsLoaded).toBe(true);
    });

    it('returns cached data when already loaded', async () => {
      store.periodSlotsLoaded = true;
      store.periodSlots = [slot()];

      const result = await store.fetchPeriodSlots();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchPeriodSlots();

      expect(result.success).toBe(false);
    });
  });

  describe('fetchPeriodSlotsForGradeYear', () => {
    it('fetches slots for a specific grade/year and merges into state', async () => {
      store.periodSlots = [slot({ $id: 'old-1', grade_level: '1', academic_year: 2026 })];
      const newSlots = [slot({ $id: 'new-1', grade_level: '1', academic_year: 2026 })];
      mockTables.listRows.mockResolvedValue({ rows: newSlots });

      const result = await store.fetchPeriodSlotsForGradeYear('1', 2026);

      expect(result.success).toBe(true);
      // Old slots for grade 1 / 2026 should be replaced
      expect(store.periodSlots.find((s) => s.$id === 'old-1')).toBeUndefined();
      expect(store.periodSlots.find((s) => s.$id === 'new-1')).toBeDefined();
    });

    it('keeps slots for other grades/years', async () => {
      store.periodSlots = [slot({ $id: 'g2-slot', grade_level: '2', academic_year: 2026 })];
      mockTables.listRows.mockResolvedValue({ rows: [slot({ $id: 'g1-slot' })] });

      await store.fetchPeriodSlotsForGradeYear('1', 2026);

      expect(store.periodSlots.find((s) => s.$id === 'g2-slot')).toBeDefined();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchPeriodSlotsForGradeYear('1', 2026);

      expect(result.success).toBe(false);
    });
  });

  describe('savePeriodSlot', () => {
    it('creates a new slot when no $id', async () => {
      const newSlot = slot({ $id: 'slot-new' });
      mockTables.createRow.mockResolvedValue(newSlot);

      const result = await store.savePeriodSlot({
        grade_level: '1',
        academic_year: 2026,
        slot_number: 1,
        label: 'Period 1',
        slot_type: 'lesson',
        start_time: '08:00',
        end_time: '08:40',
      });

      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
      expect(store.periodSlots.find((s) => s.$id === 'slot-new')).toBeDefined();
    });

    it('updates an existing slot when $id is present', async () => {
      store.periodSlots = [slot({ $id: 'slot-1', label: 'Old' })];
      const updated = slot({ $id: 'slot-1', label: 'New' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.savePeriodSlot({
        $id: 'slot-1',
        label: 'New',
      });

      expect(result.success).toBe(true);
      expect(mockTables.updateRow).toHaveBeenCalled();
      expect(store.periodSlots[0].label).toBe('New');
    });

    it('normalizes applies_to_days to empty array when not provided', async () => {
      mockTables.createRow.mockResolvedValue(slot());

      await store.savePeriodSlot({ grade_level: '1', academic_year: 2026, slot_number: 1 });

      const data = mockTables.createRow.mock.calls[0][0].data;
      expect(data.applies_to_days).toEqual([]);
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.savePeriodSlot({});

      expect(result.success).toBe(false);
    });
  });

  describe('deletePeriodSlot', () => {
    it('deletes a slot and removes from state', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.periodSlots = [slot({ $id: 'slot-1' })];

      const result = await store.deletePeriodSlot('slot-1');

      expect(result.success).toBe(true);
      expect(store.periodSlots).toHaveLength(0);
    });

    it('returns error on failure', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deletePeriodSlot('slot-1');

      expect(result.success).toBe(false);
    });
  });

  describe('reorderSlots', () => {
    it('updates slot_number for all slots in order', async () => {
      mockTables.updateRow
        .mockResolvedValueOnce(slot({ $id: 's1', slot_number: 1 }))
        .mockResolvedValueOnce(slot({ $id: 's2', slot_number: 2 }));

      const result = await store.reorderSlots('1', 2026, ['s2', 's1']);

      expect(result.success).toBe(true);
      expect(mockTables.updateRow).toHaveBeenCalledTimes(2);
      // First call should set slot_number=1 for s2 (index 0 + 1)
      expect(mockTables.updateRow.mock.calls[0][0].data.slot_number).toBe(1);
      expect(mockTables.updateRow.mock.calls[1][0].data.slot_number).toBe(2);
    });

    it('returns error on failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));

      const result = await store.reorderSlots('1', 2026, ['s1']);

      expect(result.success).toBe(false);
    });
  });

  describe('copySchedule', () => {
    it('rejects when source and target are the same', async () => {
      const result = await store.copySchedule('1', 2026, '1', 2026);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/must be different/);
    });

    it('rejects when no source slots exist', async () => {
      const result = await store.copySchedule('1', 2026, '2', 2026);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No slots found/);
    });

    it('deletes existing target slots and creates copies', async () => {
      store.periodSlots = [
        slot({ $id: 'src-1', grade_level: '1', academic_year: 2026 }),
        slot({ $id: 'tgt-old', grade_level: '2', academic_year: 2026 }),
      ];
      mockTables.deleteRow.mockResolvedValue();
      mockTables.createRow.mockResolvedValue(
        slot({ $id: 'copy-1', grade_level: '2', academic_year: 2026 }),
      );

      const result = await store.copySchedule('1', 2026, '2', 2026);

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      // Old target slot should be removed
      expect(store.periodSlots.find((s) => s.$id === 'tgt-old')).toBeUndefined();
    });

    it('returns error on create failure', async () => {
      store.periodSlots = [slot({ $id: 'src-1', grade_level: '1', academic_year: 2026 })];
      mockTables.createRow.mockRejectedValue(new Error('create fail'));

      const result = await store.copySchedule('1', 2026, '2', 2026);

      expect(result.success).toBe(false);
    });
  });
});
