import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInterventionStore } from 'src/modules/school/stores/intervention-store';
import { mockTables } from 'test/helpers/appwrite-mock';

// Mock school-utils
vi.mock('src/modules/school/utils/school-utils', () => ({
  normalizeClassId: vi.fn((id) => (typeof id === 'object' ? id?.$id : id)),
}));

// Mock school-constants for status transitions
vi.mock('src/modules/school/utils/school-constants', () => ({
  getAllowedStatusTransitions: vi.fn((status) => {
    const transitions = {
      identified: ['in_progress', 'resolved', 'closed_without_resolution'],
      in_progress: ['resolved', 'closed_without_resolution'],
      resolved: [],
      closed_without_resolution: [],
    };
    return transitions[status] || [];
  }),
  statusRequiresOutcome: vi.fn(
    (status) => status === 'resolved' || status === 'closed_without_resolution',
  ),
}));

const intervention = (over = {}) => ({
  $id: 'int-1',
  learner_id: 'l1',
  assigned_teacher_id: 't1',
  status: 'identified',
  intervention_type: 'academic',
  description: 'Math support',
  ...over,
});

describe('intervention-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useInterventionStore();
    vi.clearAllMocks();
  });

  describe('fetchInterventions', () => {
    it('fetches interventions and enriches them', async () => {
      const rows = [intervention()];
      mockTables.listRows.mockResolvedValue({ rows });

      const result = await store.fetchInterventions();

      expect(result.success).toBe(true);
      expect(store.interventions).toHaveLength(1);
      expect(store.interventionsLoaded).toBe(true);
      expect(store.interventions[0].learner_id_normalized).toBe('l1');
    });

    it('returns cached data when already loaded', async () => {
      store.interventionsLoaded = true;
      store.interventions = [intervention()];

      const result = await store.fetchInterventions();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchInterventions();

      expect(result.success).toBe(false);
    });
  });

  describe('fetchNotesForIntervention', () => {
    it('fetches notes and merges with existing notes for other interventions', async () => {
      store.interventionNotes = [
        { $id: 'n-old', intervention_id: 'int-other', intervention_id_normalized: 'int-other' },
      ];
      const notes = [{ $id: 'n1', intervention_id: 'int-1' }];
      mockTables.listRows.mockResolvedValue({ rows: notes });

      const result = await store.fetchNotesForIntervention('int-1');

      expect(result.success).toBe(true);
      // Should keep old notes for other intervention and add new ones
      expect(store.interventionNotes).toHaveLength(2);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchNotesForIntervention('int-1');

      expect(result.success).toBe(false);
    });
  });

  describe('createIntervention', () => {
    it('creates an intervention and adds to state', async () => {
      const newInt = intervention({ $id: 'int-new' });
      mockTables.createRow.mockResolvedValue(newInt);

      const result = await store.createIntervention({
        learner_id: 'l1',
        status: 'identified',
        description: 'New intervention',
      });

      expect(result.success).toBe(true);
      expect(store.interventions[0].$id).toBe('int-new');
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.createIntervention({});

      expect(result.success).toBe(false);
    });
  });

  describe('updateIntervention', () => {
    it('updates an intervention and syncs state', async () => {
      store.interventions = [intervention({ $id: 'int-1', status: 'identified' })];
      const updated = intervention({ $id: 'int-1', status: 'in_progress' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.updateIntervention('int-1', { status: 'in_progress' });

      expect(result.success).toBe(true);
      expect(store.interventions[0].status).toBe('in_progress');
    });

    it('adds to state if not found', async () => {
      const updated = intervention({ $id: 'int-new' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.updateIntervention('int-new', {});

      expect(result.success).toBe(true);
      expect(store.interventions.find((i) => i.$id === 'int-new')).toBeDefined();
    });

    it('returns error on failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));

      const result = await store.updateIntervention('int-1', {});

      expect(result.success).toBe(false);
    });
  });

  describe('changeStatus', () => {
    it('changes status when transition is allowed and notes exist', async () => {
      store.interventions = [intervention({ $id: 'int-1', status: 'identified' })];
      store.interventionNotes = [
        { $id: 'n1', intervention_id_normalized: 'int-1' },
      ];
      const updated = intervention({ $id: 'int-1', status: 'in_progress' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.changeStatus('int-1', 'in_progress');

      expect(result.success).toBe(true);
    });

    it('rejects when intervention not found', async () => {
      const result = await store.changeStatus('unknown', 'in_progress');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/);
    });

    it('rejects when transition is not allowed', async () => {
      store.interventions = [intervention({ $id: 'int-1', status: 'resolved' })];
      store.interventionNotes = [{ $id: 'n1', intervention_id_normalized: 'int-1' }];

      const result = await store.changeStatus('int-1', 'in_progress');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Cannot change status/);
    });

    it('rejects when no notes exist', async () => {
      store.interventions = [intervention({ $id: 'int-1', status: 'identified' })];

      const result = await store.changeStatus('int-1', 'in_progress');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/progress note is required/);
    });

    it('rejects when outcome is required but missing', async () => {
      store.interventions = [intervention({ $id: 'int-1', status: 'identified' })];
      store.interventionNotes = [{ $id: 'n1', intervention_id_normalized: 'int-1' }];

      const result = await store.changeStatus('int-1', 'resolved');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/outcome is required/);
    });

    it('succeeds with outcome for resolved status', async () => {
      store.interventions = [intervention({ $id: 'int-1', status: 'identified' })];
      store.interventionNotes = [{ $id: 'n1', intervention_id_normalized: 'int-1' }];
      const updated = intervention({ $id: 'int-1', status: 'resolved' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.changeStatus('int-1', 'resolved', 'Issue resolved');

      expect(result.success).toBe(true);
      expect(mockTables.updateRow.mock.calls[0][0].data.outcome).toBe('Issue resolved');
    });
  });

  describe('deleteIntervention', () => {
    it('deletes intervention and its notes', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.interventions = [intervention({ $id: 'int-1' })];
      store.interventionNotes = [{ $id: 'n1', intervention_id_normalized: 'int-1' }];

      const result = await store.deleteIntervention('int-1');

      expect(result.success).toBe(true);
      expect(store.interventions).toHaveLength(0);
      expect(store.interventionNotes).toHaveLength(0);
    });

    it('returns error on failure', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteIntervention('int-1');

      expect(result.success).toBe(false);
    });
  });

  describe('addNote', () => {
    it('creates a note and adds to state', async () => {
      const newNote = { $id: 'n-new', intervention_id: 'int-1', content: 'Progress noted' };
      mockTables.createRow.mockResolvedValue(newNote);

      const result = await store.addNote('int-1', {
        content: 'Progress noted',
        learner_response: 'positive',
        author_id: 't1',
      });

      expect(result.success).toBe(true);
      expect(store.interventionNotes.find((n) => n.$id === 'n-new')).toBeDefined();
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.addNote('int-1', { content: 'test' });

      expect(result.success).toBe(false);
    });
  });
});
