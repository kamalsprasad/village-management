import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTeacherStore } from 'src/modules/school/stores/teacher-store';
import { useAuthStore } from 'src/stores/auth-store';
import { mockTables } from 'test/helpers/appwrite-mock';
import { makeUser, ADMIN_ROLE } from 'test/helpers/fixtures';

// Mock usePermissions composable
vi.mock('src/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn(() => true),
  }),
}));

// Mock school-constants
vi.mock('src/modules/school/utils/school-constants', () => ({
  GRADE_LEVELS: ['1', '2', '3', '4', '5', '6', '7'],
}));

const assignment = (over = {}) => ({
  $id: 'asg-1',
  teacher_id: 'r1',
  grade_level: '1',
  notes: '',
  subjects: [],
  ...over,
});

describe('teacher-store', () => {
  let store;
  let authStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useTeacherStore();
    authStore = useAuthStore();
    authStore.user = makeUser();
    authStore.userRoles = [ADMIN_ROLE];
    vi.clearAllMocks();
  });

  describe('fetchTeacherAssignments', () => {
    it('fetches assignments and enriches with resident names', async () => {
      const assignments = [assignment()];
      mockTables.listRows
        .mockResolvedValueOnce({ rows: assignments }) // assignments
        .mockResolvedValueOnce({ rows: [{ $id: 'r1', first_name: 'Jane', last_name: 'Smith' }] }); // residents

      const result = await store.fetchTeacherAssignments();

      expect(result.success).toBe(true);
      expect(store.teacherAssignments).toHaveLength(1);
      expect(store.teacherAssignmentsLoaded).toBe(true);
      expect(store.teacherAssignments[0].teacher_name).toBe('Jane Smith');
    });

    it('returns cached data when already loaded', async () => {
      store.teacherAssignmentsLoaded = true;
      store.teacherAssignments = [assignment()];

      const result = await store.fetchTeacherAssignments();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('handles residents fetch failure gracefully', async () => {
      mockTables.listRows
        .mockResolvedValueOnce({ rows: [assignment()] })
        .mockRejectedValueOnce(new Error('residents fail'));

      const result = await store.fetchTeacherAssignments();

      expect(result.success).toBe(true);
      expect(store.teacherAssignments[0].teacher_name).toBe('Unknown Teacher');
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchTeacherAssignments();

      expect(result.success).toBe(false);
    });
  });

  describe('createTeacherAssignment', () => {
    it('creates an assignment when no duplicate exists', async () => {
      const newAsg = assignment({ $id: 'asg-new' });
      mockTables.listRows
        .mockResolvedValue({ rows: [] }); // fetchTeacherAssignments returns empty
      mockTables.createRow.mockResolvedValue(newAsg);

      const result = await store.createTeacherAssignment('r1', '1', 'Notes', ['Math']);

      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
    });

    it('rejects when teacher already assigned to grade', async () => {
      mockTables.listRows
        .mockResolvedValueOnce({ rows: [assignment({ teacher_id: 'r1', grade_level: '1' })] })
        .mockResolvedValueOnce({ rows: [] }); // residents

      const result = await store.createTeacherAssignment('r1', '1');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already assigned/);
    });

    it('returns error on create failure', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [] });
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.createTeacherAssignment('r1', '1');

      expect(result.success).toBe(false);
    });
  });

  describe('deleteTeacherAssignment', () => {
    it('deletes an assignment and removes from state', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.teacherAssignments = [assignment({ $id: 'asg-1' })];

      const result = await store.deleteTeacherAssignment('asg-1');

      expect(result.success).toBe(true);
      expect(store.teacherAssignments).toHaveLength(0);
    });

    it('returns error on failure', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteTeacherAssignment('asg-1');

      expect(result.success).toBe(false);
    });
  });
});
