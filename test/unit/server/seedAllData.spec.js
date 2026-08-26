import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node-appwrite', () => ({
  Client: class {
    setEndpoint() {
      return this;
    }
    setProject() {
      return this;
    }
    setKey() {
      return this;
    }
  },
  TablesDB: class {},
  ID: { unique: () => 'generated-id' },
  Query: { limit: (value) => `limit:${value}` },
}));

import {
  SAMPLE_HOUSEHOLDS,
  SAMPLE_RESIDENTS,
  TIMETABLE_SCHEDULE,
} from '../../../server/functions/seedAllData/src/data.js';
import {
  assertSafeToSeed,
  findUserAnchor,
  seedIdentityBackedScenarios,
  seedNotifications,
  seedVillageEvents,
} from '../../../server/functions/seedAllData/src/main.js';

function tablesMock(rowsByTable = {}) {
  let nextId = 0;
  return {
    listRows: vi.fn(({ tableId }) => Promise.resolve({ rows: rowsByTable[tableId] || [] })),
    createRow: vi.fn(({ tableId, data }) =>
      Promise.resolve({ $id: `${tableId}-${++nextId}`, ...data }),
    ),
  };
}

describe('seedAllData showcase fixtures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps positional household and timetable fixtures internally valid', () => {
    expect(SAMPLE_RESIDENTS.length).toBeGreaterThan(0);
    for (const resident of SAMPLE_RESIDENTS) {
      expect(resident.householdIndex).toBeGreaterThanOrEqual(0);
      expect(resident.householdIndex).toBeLessThan(SAMPLE_HOUSEHOLDS.length);
    }
    expect(Object.keys(TIMETABLE_SCHEDULE)).toHaveLength(13);
    for (const week of Object.values(TIMETABLE_SCHEDULE)) {
      expect(week).toHaveLength(5);
      expect(week.every((day) => day.length > 0)).toBe(true);
    }
  });

  it('refuses a re-run when canonical business rows already exist', async () => {
    const tablesDB = tablesMock({ households: [{ $id: 'existing-household' }] });
    await expect(assertSafeToSeed(tablesDB, 'villageDB')).rejects.toThrow(
      'Refusing to seed a non-empty database',
    );
  });

  it('selects only an active existing user as the identity anchor', async () => {
    const tablesDB = tablesMock({
      users: [
        { $id: 'disabled', active: false },
        { $id: 'active-user', active: true },
      ],
    });
    await expect(findUserAnchor(tablesDB, 'villageDB')).resolves.toMatchObject({
      $id: 'active-user',
    });
  });

  it('creates historical, upcoming, timed, all-day, and recurring village events', async () => {
    const tablesDB = tablesMock();
    await seedVillageEvents(tablesDB, 'villageDB', { $id: 'user-1' }, vi.fn());
    const events = tablesDB.createRow.mock.calls.map(([call]) => call.data);
    expect(events).toHaveLength(3);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          is_all_day: false,
          is_recurring: true,
          recurrence_rule: 'monthly',
        }),
        expect.objectContaining({ is_all_day: true, is_recurring: false }),
      ]),
    );
    expect(
      new Date(events.find((event) => event.title.startsWith('Completed')).start_date).getTime(),
    ).toBeLessThan(Date.now());
    expect(
      new Date(events.find((event) => event.title === 'Community Field Day').start_date).getTime(),
    ).toBeGreaterThan(Date.now());
  });

  it('creates village events with a seed-script fallback when no user anchor exists', async () => {
    const tablesDB = tablesMock();
    await seedVillageEvents(tablesDB, 'villageDB', null, vi.fn());
    const events = tablesDB.createRow.mock.calls.map(([call]) => call.data);
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.created_by === 'seed-script')).toBe(true);
  });

  it('passes actual phase IDs into identity-backed relationships', async () => {
    const tablesDB = tablesMock();
    // showcaseTransactions: [0] = income (child/provides funds), [1] = expense (parent/receives funding)
    await seedIdentityBackedScenarios(
      tablesDB,
      'villageDB',
      { $id: 'user-1' },
      [{ $id: 'source-1' }, { $id: 'source-2' }],
      [{ $id: 'income-tx' }, { $id: 'expense-tx' }],
      [{ $id: 'notification-1' }],
      vi.fn(),
    );
    expect(tablesDB.createRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'transaction_links',
        data: expect.objectContaining({
          parent_transaction_id: 'expense-tx',
          child_transaction_id: 'income-tx',
          funding_source_id: 'source-2',
          recorded_by: 'user-1',
        }),
      }),
    );
    expect(tablesDB.createRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 'notification_reads',
        data: expect.objectContaining({ notification_id: 'notification-1', user_id: 'user-1' }),
      }),
    );
  });

  it('logs a precise skip and writes nothing when no user anchor exists', async () => {
    const tablesDB = tablesMock();
    const log = vi.fn();
    await seedIdentityBackedScenarios(tablesDB, 'villageDB', null, [], [], [], log);
    expect(tablesDB.createRow).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('no active users row'));
  });

  it('wires real entity IDs into notification links and related_entity fields', async () => {
    const tablesDB = tablesMock();
    await seedNotifications(
      tablesDB,
      'villageDB',
      {
        atRiskLearnerId: 'learner-abc',
        upcomingHarvestPlantingId: 'planting-upcoming',
        lowStockInventoryId: 'inventory-low',
        vendorId: 'vendor-benga',
        failedPlantingId: 'planting-failed',
      },
      vi.fn(),
    );
    const notifs = tablesDB.createRow.mock.calls.map(([call]) => call.data);
    expect(notifs).toHaveLength(5);
    const atRisk = notifs.find((n) => n.type === 'at_risk_learner');
    expect(atRisk.related_entity_type).toBe('learner');
    expect(atRisk.related_entity_id).toBe('learner-abc');
    expect(atRisk.link).toBe('/school/learners/learner-abc');
    const cropFailure = notifs.find((n) => n.type === 'farm_alert:crop_failure');
    expect(cropFailure.related_entity_type).toBe('planting');
    expect(cropFailure.related_entity_id).toBe('planting-failed');
    expect(cropFailure.link).toBe('/farm/plantings/planting-failed');
    const vendorNotif = notifs.find((n) => n.type === 'vendor_created');
    expect(vendorNotif.related_entity_type).toBe('vendor');
    expect(vendorNotif.related_entity_id).toBe('vendor-benga');
  });
});
