import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useClassStore } from 'src/modules/school/stores/class-store';
import { mockTables } from 'test/helpers/appwrite-mock';

// Mock learner-store to avoid circular deps and network calls
vi.mock('src/modules/school/stores/learner-store', () => ({
  useLearnerStore: () => ({
    learners: [],
    fetchLearners: vi.fn().mockResolvedValue({ success: true }),
  }),
}));

// Mock school-utils
vi.mock('src/modules/school/utils/school-utils', () => ({
  computeScorePercent: vi.fn((score, total) => (total > 0 ? (score / total) * 100 : 0)),
  normalizeClassId: vi.fn((id) => (typeof id === 'object' ? id?.$id : id)),
}));

const classRow = (over = {}) => ({
  $id: 'cls-1',
  name: 'Grade 1A',
  grade_level: '1',
  academic_year: 2026,
  class_teacher_id: null,
  notes: '',
  ...over,
});

describe('class-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useClassStore();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('fetchClasses', () => {
    it('fetches classes and enriches with teacher names', async () => {
      const classes = [classRow()];
      mockTables.listRows
        .mockResolvedValueOnce({ rows: classes }) // classes
        .mockResolvedValueOnce({ rows: [] }); // residents (non-fatal)

      const result = await store.fetchClasses();

      expect(result.success).toBe(true);
      expect(store.classes).toHaveLength(1);
      expect(store.classesLoaded).toBe(true);
      expect(store.allClassRows).toEqual(classes);
    });

    it('returns cached data when already loaded', async () => {
      store.classesLoaded = true;
      store.classes = [classRow()];

      const result = await store.fetchClasses();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('falls back to localStorage on Appwrite failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));
      localStorage.setItem('school_classes_fallback', JSON.stringify([classRow()]));

      const result = await store.fetchClasses();

      expect(result.success).toBe(true);
      expect(store.classes).toHaveLength(1);
      expect(store.classesLoaded).toBe(true);
    });

    it('creates empty array on failure with no cache', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchClasses();

      expect(result.success).toBe(true);
      expect(store.classes).toEqual([]);
    });
  });

  describe('enrichClass', () => {
    it('returns "No Teacher Assigned" when no teacher', () => {
      const enriched = store.enrichClass(classRow());
      expect(enriched.teacher_name).toBe('No Teacher Assigned');
    });

    it('resolves teacher name from object relationship', () => {
      const cls = classRow({
        class_teacher_id: { $id: 'r1', first_name: 'Jane', last_name: 'Smith' },
      });
      const enriched = store.enrichClass(cls);
      expect(enriched.teacher_name).toBe('Jane Smith');
    });

    it('resolves teacher name from residentsMap', () => {
      const cls = classRow({ class_teacher_id: 'r1' });
      const residentsMap = new Map([['r1', { $id: 'r1', first_name: 'John', last_name: 'Doe' }]]);
      const enriched = store.enrichClass(cls, residentsMap);
      expect(enriched.teacher_name).toBe('John Doe');
    });

    it('normalizes class_teacher_id to string', () => {
      const cls = classRow({ class_teacher_id: { $id: 'r1' } });
      const enriched = store.enrichClass(cls);
      expect(enriched.class_teacher_id_normalized).toBe('r1');
    });
  });

  describe('createClass', () => {
    it('creates a class and adds to state', async () => {
      const newClass = classRow({ $id: 'cls-new' });
      mockTables.createRow.mockResolvedValue(newClass);

      const result = await store.createClass({
        name: 'Grade 2A',
        grade_level: '2',
        academic_year: 2026,
      });

      expect(result.success).toBe(true);
      expect(store.classes.find((c) => c.$id === 'cls-new')).toBeDefined();
    });

    it('defaults academic_year to 2026 when not provided', async () => {
      mockTables.createRow.mockResolvedValue(classRow());

      await store.createClass({ name: 'Test', grade_level: '1' });

      expect(mockTables.createRow.mock.calls[0][0].data.academic_year).toBe(2026);
    });

    it('falls back to local class on Appwrite failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('network'));

      const result = await store.createClass({
        name: 'Local Class',
        grade_level: '3',
      });

      expect(result.success).toBe(true);
      expect(store.classes.find((c) => c.name === 'Local Class')).toBeDefined();
    });
  });

  describe('updateClass', () => {
    it('updates a class and syncs state', async () => {
      store.classes = [classRow({ $id: 'cls-1', name: 'Old' })];
      const updated = classRow({ $id: 'cls-1', name: 'New' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.updateClass('cls-1', {
        name: 'New',
        grade_level: '1',
        academic_year: 2026,
      });

      expect(result.success).toBe(true);
      expect(store.classes[0].name).toBe('New');
    });

    it('falls back to local update on Appwrite failure', async () => {
      store.classes = [classRow({ $id: 'cls-1', name: 'Old' })];
      mockTables.updateRow.mockRejectedValue(new Error('network'));

      const result = await store.updateClass('cls-1', {
        name: 'Updated',
        grade_level: '1',
        academic_year: 2026,
      });

      expect(result.success).toBe(true);
      expect(store.classes[0].name).toBe('Updated');
    });

    it('returns error when class not found on failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('network'));

      const result = await store.updateClass('unknown', {
        name: 'Test',
        grade_level: '1',
        academic_year: 2026,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('deleteClass', () => {
    it('deletes a class and removes from state', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.classes = [classRow({ $id: 'cls-1' })];

      const result = await store.deleteClass('cls-1');

      expect(result.success).toBe(true);
      expect(store.classes).toHaveLength(0);
    });

    it('removes from local state even on Appwrite failure', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('network'));
      store.classes = [classRow({ $id: 'cls-1' })];

      const result = await store.deleteClass('cls-1');

      expect(result.success).toBe(true);
      expect(store.classes).toHaveLength(0);
    });
  });

  describe('fetchAttendance', () => {
    it('fetches attendance for a class and date', async () => {
      const records = [{ $id: 'att-1', learner_id: 'l1', status: 'present' }];
      mockTables.listRows.mockResolvedValue({ rows: records });

      const result = await store.fetchAttendance('cls-1', '2025-01-15');

      expect(result.success).toBe(true);
      expect(store.attendance).toEqual(records);
      expect(store.attendanceLoaded).toBe(true);
    });

    it('falls back to localStorage on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));
      const cached = [{ $id: 'local-1', status: 'present' }];
      localStorage.setItem('school_attendance_fallback_cls-1_2025-01-15', JSON.stringify(cached));

      const result = await store.fetchAttendance('cls-1', '2025-01-15');

      expect(result.success).toBe(true);
      expect(store.attendance).toEqual(cached);
    });

    it('returns empty array on failure with no cache', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchAttendance('cls-1', '2025-01-15');

      expect(result.success).toBe(true);
      expect(store.attendance).toEqual([]);
    });
  });

  describe('saveAttendance', () => {
    it('creates new attendance records', async () => {
      const newRec = { $id: 'att-new', learner_id: 'l1', status: 'present' };
      mockTables.createRow.mockResolvedValue(newRec);

      const result = await store.saveAttendance('cls-1', '2025-01-15', [
        { learner_id: 'l1', status: 'present' },
      ]);

      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
      expect(store.attendance).toHaveLength(1);
    });

    it('updates existing attendance records', async () => {
      const updated = { $id: 'att-1', learner_id: 'l1', status: 'absent' };
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.saveAttendance('cls-1', '2025-01-15', [
        { $id: 'att-1', learner_id: 'l1', status: 'absent' },
      ]);

      expect(result.success).toBe(true);
      expect(mockTables.updateRow).toHaveBeenCalled();
    });

    it('falls back to local save on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('network'));

      const result = await store.saveAttendance('cls-1', '2025-01-15', [
        { learner_id: 'l1', status: 'present' },
      ]);

      expect(result.success).toBe(true);
      expect(store.attendance).toHaveLength(1);
    });
  });

  describe('fetchAttendanceForLearner', () => {
    it('fetches attendance records for a learner within date range', async () => {
      const records = [{ $id: 'att-1', status: 'present' }];
      mockTables.listRows.mockResolvedValue({ rows: records });

      const result = await store.fetchAttendanceForLearner('l1', '2025-01-01', '2025-01-31');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(records);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchAttendanceForLearner('l1', '2025-01-01', '2025-01-31');

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
    });
  });

  describe('fetchAttendanceForClassRange', () => {
    it('fetches attendance records for a class within date range', async () => {
      const records = [{ $id: 'att-1', status: 'present' }];
      mockTables.listRows.mockResolvedValue({ rows: records });

      const result = await store.fetchAttendanceForClassRange('cls-1', '2025-01-01', '2025-01-31');

      expect(result.success).toBe(true);
      expect(store.attendanceHistory).toEqual(records);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchAttendanceForClassRange('cls-1', '2025-01-01', '2025-01-31');

      expect(result.success).toBe(false);
    });
  });

  describe('saveToLocalCache', () => {
    it('saves data to localStorage', () => {
      store.saveToLocalCache('test_key', { foo: 'bar' });
      expect(localStorage.getItem('test_key')).toBe(JSON.stringify({ foo: 'bar' }));
    });
  });
});
