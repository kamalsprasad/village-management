// Global Vitest setup.
//
// 1. Mocks 'quasar' so importing modules that call useErrorHandler() at
//    module top-level (which calls Notify.create) does not blow up.
// 2. Mocks 'src/boot/appwrite' so stores never touch the real Appwrite SDK.
// 3. Provides an active Pinia for every test.
// 4. Sets process.env.SERVER = false (client path) by default; individual
//    router-guard tests can flip it.

import { vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { config } from '@vue/test-utils';
import { appwriteMockModule, resetAppwriteMocks } from './helpers/appwrite-mock';

// --- Mock 'quasar' -------------------------------------------------------
const quasarMocks = vi.hoisted(() => ({
  Notify: { create: vi.fn(), dismiss: vi.fn() },
  Dialog: { create: vi.fn() },
}));
vi.mock('quasar', () => {
  const Quasar = { install: () => {}, plugins: { Notify: {}, Dialog: {} } };
  const stub = (name) => ({ name, template: '<div class="q-stub"><slot/></div>' });
  return {
    Quasar,
    Notify: quasarMocks.Notify,
    Dialog: quasarMocks.Dialog,
    useQuasar: () => ({ notify: quasarMocks.Notify, dialog: quasarMocks.Dialog }),
    QBtn: { name: 'QBtn', template: '<button><slot/></button>' },
    QCard: stub('QCard'),
    QCardSection: stub('QCardSection'),
    QCardActions: stub('QCardActions'),
    QPage: stub('QPage'),
    QInput: stub('QInput'),
    QSelect: stub('QSelect'),
    QIcon: { name: 'QIcon', template: '<i class="q-icon"><slot/></i>' },
    QChip: stub('QChip'),
    QTable: stub('QTable'),
    QTr: { name: 'QTr', template: '<tr><slot/></tr>' },
    QTd: { name: 'QTd', template: '<td><slot/></td>' },
    QTh: { name: 'QTh', template: '<th><slot/></th>' },
    QToggle: stub('QToggle'),
    QCheckbox: stub('QCheckbox'),
    QSpinner: { name: 'QSpinner', template: '<div class="q-spinner"></div>' },
    QBanner: stub('QBanner'),
    QList: stub('QList'),
    QItem: stub('QItem'),
    QItemSection: stub('QItemSection'),
    QItemLabel: stub('QItemLabel'),
    QSeparator: { name: 'QSeparator', template: '<div class="q-separator"></div>' },
    QSpace: { name: 'QSpace', template: '<div class="q-space"></div>' },
    QTooltip: stub('QTooltip'),
    QBadge: stub('QBadge'),
    QAvatar: stub('QAvatar'),
    QExpansionItem: stub('QExpansionItem'),
    QDrawer: stub('QDrawer'),
    QHeader: stub('QHeader'),
    QPageContainer: stub('QPageContainer'),
    QLayout: stub('QLayout'),
    QBreadcrumbs: stub('QBreadcrumbs'),
    QBreadcrumbsEl: stub('QBreadcrumbsEl'),
    QTab: stub('QTab'),
    QTabs: stub('QTabs'),
    QTabPanels: stub('QTabPanels'),
    QTabPanel: stub('QTabPanel'),
    QForm: {
      name: 'QForm',
      template: '<form class="q-form"><slot/></form>',
      methods: {
        validate: vi.fn(() => Promise.resolve(true)),
        resetValidation: vi.fn(),
      },
    },
    QField: stub('QField'),
    QDate: { name: 'QDate', template: '<div class="q-date"></div>' },
    QPopupProxy: stub('QPopupProxy'),
    QMarkupTable: {
      name: 'QMarkupTable',
      template: '<table class="q-markup-table"><slot/></table>',
    },
    QImg: { name: 'QImg', template: '<div class="q-img"></div>' },
    QLinearProgress: { name: 'QLinearProgress', template: '<div class="q-linear-progress"></div>' },
    QCircularProgress: {
      name: 'QCircularProgress',
      template: '<div class="q-circular-progress"></div>',
    },
    QPagination: { name: 'QPagination', template: '<div class="q-pagination"></div>' },
    QScrollArea: stub('QScrollArea'),
    QMenu: stub('QMenu'),
    QDialog: stub('QDialog'),
    QStepper: stub('QStepper'),
    QStep: stub('QStep'),
    QStepperNavigation: stub('QStepperNavigation'),
    QOptionGroup: stub('QOptionGroup'),
    QSpinnerDots: { name: 'QSpinnerDots', template: '<div class="q-spinner-dots"></div>' },
    ClosePopup: { name: 'ClosePopup' },
  };
});

// --- Mock 'src/boot/appwrite' -------------------------------------------
// appwriteMockModule is built in vi.hoisted() inside the helper, so it is
// available even though vi.mock is hoisted above this import.
vi.mock('src/boot/appwrite', () => appwriteMockModule);

// --- Mock 'appwrite' SDK utilities --------------------------------------
// Stores/composables import { ID, Query, Permission, Role } from 'appwrite'.
// We provide functional stubs so test code can use the same API surface.
const appwriteSdk = vi.hoisted(() => ({
  ID: { unique: vi.fn(() => 'mock-unique-id') },
  Query: {
    select: vi.fn((...a) => ({ method: 'select', args: a })),
    equal: vi.fn((...a) => ({ method: 'equal', args: a })),
    notEqual: vi.fn((...a) => ({ method: 'notEqual', args: a })),
    lessThan: vi.fn((...a) => ({ method: 'lessThan', args: a })),
    greaterThan: vi.fn((...a) => ({ method: 'greaterThan', args: a })),
    lessThanEqual: vi.fn((...a) => ({ method: 'lessThanEqual', args: a })),
    greaterThanEqual: vi.fn((...a) => ({ method: 'greaterThanEqual', args: a })),
    search: vi.fn((...a) => ({ method: 'search', args: a })),
    contains: vi.fn((...a) => ({ method: 'contains', args: a })),
    notContains: vi.fn((...a) => ({ method: 'notContains', args: a })),
    startsWith: vi.fn((...a) => ({ method: 'startsWith', args: a })),
    endsWith: vi.fn((...a) => ({ method: 'endsWith', args: a })),
    between: vi.fn((...a) => ({ method: 'between', args: a })),
    isNull: vi.fn((...a) => ({ method: 'isNull', args: a })),
    isNotNull: vi.fn((...a) => ({ method: 'isNotNull', args: a })),
    orderDesc: vi.fn((...a) => ({ method: 'orderDesc', args: a })),
    orderAsc: vi.fn((...a) => ({ method: 'orderAsc', args: a })),
    limit: vi.fn((...a) => ({ method: 'limit', args: a })),
    offset: vi.fn((...a) => ({ method: 'offset', args: a })),
    cursorAfter: vi.fn((...a) => ({ method: 'cursorAfter', args: a })),
    or: vi.fn((...a) => ({ method: 'or', args: a })),
    and: vi.fn((...a) => ({ method: 'and', args: a })),
  },
  Permission: {
    read: vi.fn((r) => ({ permission: 'read', role: r })),
    write: vi.fn((r) => ({ permission: 'write', role: r })),
    update: vi.fn((r) => ({ permission: 'update', role: r })),
    delete: vi.fn((r) => ({ permission: 'delete', role: r })),
    create: vi.fn((r) => ({ permission: 'create', role: r })),
  },
  Role: {
    user: vi.fn((id) => ({ role: 'user', id })),
    team: vi.fn((id) => ({ role: 'team', id })),
    any: vi.fn(() => ({ role: 'any' })),
    users: vi.fn(() => ({ role: 'users' })),
    guests: vi.fn(() => ({ role: 'guests' })),
  },
  Client: vi.fn(),
  Account: vi.fn(),
  Databases: vi.fn(),
  Storage: vi.fn(),
  Functions: vi.fn(),
  TablesDB: vi.fn(),
}));
vi.mock('appwrite', () => appwriteSdk);

// --- Mock farm-utils (used by inventory-store) --------------------------
vi.mock('src/modules/farm/utils/farm-utils', () => ({
  deriveProduceName: vi.fn(
    (crop, plot) => `${crop?.crop_name || 'Unknown'} – ${plot?.name || 'Unknown'}`,
  ),
  OVERDUE_GRACE_DAYS: 7,
}));

// --- Pinia ---------------------------------------------------------------
beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  resetAppwriteMocks();
  quasarMocks.Notify.create.mockClear();
  quasarMocks.Dialog.create.mockClear();
});

// --- SSR env default -----------------------------------------------------
process.env.SERVER = 'false';

// --- Vue Test Utils global config ---------------------------------------
config.global.renderStubDefaultSlot = true;
