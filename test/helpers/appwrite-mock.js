// Central Appwrite mock factory — single source of truth.
//
// Stores import { account, databases, storage, functions, tables, client }
// from 'src/boot/appwrite'. In unit tests we never want to hit the real
// Appwrite SDK, so test/setup.js installs a module-level vi.mock that
// returns the object built here. Each test can configure the return value
// of any method via the named exports below.
//
// The mock singletons are built inside vi.hoisted() so they exist before
// any vi.mock factory (which Vitest hoists above imports) runs.

const mocks = vi.hoisted(() => {
  const SERVICE_METHODS = {
    account: [
      'get',
      'create',
      'updateName',
      'updatePassword',
      'updateEmail',
      'deleteSession',
      'createEmailPasswordSession',
      'createRecovery',
      'updateRecovery',
    ],
    storage: ['createFile', 'getFile', 'deleteFile', 'listFiles', 'getFileDownload'],
    functions: ['createExecution', 'getExecution'],
    tables: ['listRows', 'getRow', 'createRow', 'updateRow', 'deleteRow', 'listTableLogs'],
  };

  const client = {
    setEndpoint: vi.fn().mockReturnThis(),
    setProject: vi.fn().mockReturnThis(),
  };

  const account = {};
  const storage = {};
  const functions = {};
  const tables = {};
  const databases = {
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  };

  for (const [svc, methods] of Object.entries(SERVICE_METHODS)) {
    const target =
      svc === 'account'
        ? account
        : svc === 'storage'
          ? storage
          : svc === 'functions'
            ? functions
            : tables;
    for (const m of methods) target[m] = vi.fn();
  }

  const module = {
    client,
    account,
    databases,
    storage,
    functions,
    tables,
    default: vi.fn(),
  };

  return { client, account, databases, storage, functions, tables, module };
});

export const mockClient = mocks.client;
export const mockAccount = mocks.account;
export const mockStorage = mocks.storage;
export const mockFunctions = mocks.functions;
export const mockTables = mocks.tables;
export const mockDatabases = mocks.databases;
export const appwriteMockModule = mocks.module;

export function resetAppwriteMocks() {
  for (const service of [mockTables, mockAccount, mockStorage, mockFunctions, mockDatabases]) {
    for (const fn of Object.values(service)) {
      if (typeof fn?.mockReset === 'function') fn.mockReset();
    }
  }
  // Restore the returnThis chain on client setters after reset.
  mockClient.setEndpoint.mockReturnThis();
  mockClient.setProject.mockReturnThis();
}
