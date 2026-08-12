import { describe, it, expect, vi } from 'vitest';
import { mockTables, mockAccount, resetAppwriteMocks } from 'test/helpers/appwrite-mock';

describe('test infrastructure smoke', () => {
  it('appwrite mocks are callable and resettable', () => {
    mockTables.listRows.mockResolvedValue({ rows: [{ $id: '1' }] });
    expect(mockTables.listRows).toBeDefined();
    return mockTables.listRows().then((r) => expect(r.rows).toHaveLength(1));
  });

  it('resets mock call history between tests', () => {
    expect(mockTables.listRows).not.toHaveBeenCalled();
    expect(mockAccount.get).not.toHaveBeenCalled();
  });
});
