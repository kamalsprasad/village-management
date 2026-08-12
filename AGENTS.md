# Village Management System — Agent Guide

## Testing

This project uses a tiered testing strategy with Vitest (unit/component) and
Cypress (E2E). All tests must pass before merging.

### Commands

```bash
# Unit tests (fast, no server needed)
npm run test:unit           # run once
npm run test:unit:watch     # watch mode
npm run test:coverage       # run with coverage report

# E2E tests (requires running dev server + test Appwrite project)
npm run test:e2e            # headless
npm run test:e2e:open       # interactive

# Tiered coverage gate (used in CI)
node scripts/check-coverage.mjs

# Lint
npm run lint
```

### Test structure

```
test/
├── unit/                    # Vitest unit & component tests
│   ├── boot/                # Boot-file logic (router guards, etc.)
│   ├── components/          # Vue component tests (@vue/test-utils)
│   ├── composables/         # Composable function tests
│   ├── services/            # Service-layer tests
│   ├── stores/              # Pinia store tests
│   └── utils/               # Pure utility tests
├── e2e/                     # Cypress E2E tests
│   ├── fixtures/            # Test data (users, settings, etc.)
│   ├── support/             # Custom commands and support files
│   ├── smoke.spec.js        # App loads, basic navigation
│   ├── auth.spec.js         # Login/logout/protected routes
│   ├── rbac.spec.js         # Role-based access control
│   ├── residents-crud.spec  # Resident CRUD flows
│   └── households-crud.spec # Household CRUD flows
├── helpers/
│   ├── appwrite-mock.js     # Centralized Appwrite SDK mocks
│   └── fixtures.js          # Shared test fixtures (users, roles, etc.)
├── stubs/
│   └── q-app-wrappers.js    # Minimal defineBoot stub for boot-file imports
└── setup.js                 # Vitest global setup (mocks, reset logic)
```

### Tiered coverage

Coverage thresholds are enforced per layer, not globally. This avoids
forcing uniform coverage on UI-heavy pages while still holding logic
layers to a high standard.

| Layer              | Current threshold | Target |
|--------------------|-------------------|--------|
| Logic (utils/services/composables) | 75% | 90% |
| Stores             | 70% | 80% |
| Boot & router      | 80% | 80% |
| Components         | 50% | 50% |
| Pages              | Not gated (E2E)  | —      |

The gate script is `scripts/check-coverage.mjs`. It reads
`coverage/coverage-summary.json` and exits non-zero if any layer
falls below its threshold.

### Writing unit tests

1. **Logic layer** (utils, services, composables): test all public
   functions, edge cases, and error paths. These should reach 90%+.

2. **Stores**: test state changes, getters, and actions. Mock Appwrite
   via `test/helpers/appwrite-mock.js`. Reset mocks in `beforeEach`.
   Use `test/helpers/fixtures.js` for reusable test data.

3. **Components**: use `@vue/test-utils` `mount()` with Quasar component
   stubs. Test computed props, emitted events, and conditional rendering.
   Don't test Quasar internals.

4. **Boot files**: stub `#q-app/wrappers` and capture the boot callback.
   See `test/unit/boot/router-guards.spec.js` for the pattern.

### Writing E2E tests

1. E2E tests run against a **real test Appwrite project** — never
   production. Configure via `.env.test` (copy from `.env.test.example`).

2. Use custom commands from `test/e2e/support/commands.js`:
   - `cy.loginAsAdmin()` / `cy.loginAs(email, password)`
   - `cy.wipeData()` / `cy.seedData()`
   - `cy.shouldSeeSuccess(text)` / `cy.shouldSeeError(text)`

3. Use `data-test` attributes in templates for E2E selectors. This
   decouples tests from CSS classes and implementation details.

4. Each E2E spec should be independent and idempotent. Use
   `before()` for expensive setup (login) and `beforeEach()` for
   per-test state (navigation).

### CI pipeline

The GitHub Actions workflow (`.github/workflows/test.yml`) runs:
1. **Lint** — ESLint on all source files.
2. **Unit tests + coverage** — Vitest with V8 coverage, then tiered gate.
3. **Build** — Production build check.
4. **E2E tests** — Cypress against a test Appwrite project (gated behind
   `E2E_ENABLED` variable to skip when no test project is configured).

Artifacts uploaded on failure: coverage report, Cypress screenshots,
Cypress videos.

### Appwrite mock patterns

The test setup (`test/setup.js`) globally mocks:
- `appwrite` SDK exports: `ID`, `Permission`, `Role`, `Query`
- `src/boot/appwrite` — `tables`, `account`, `functions`, `storage`
- Quasar `Notify` plugin
- `src/modules/farm/utils/farm-utils` — `deriveProduceName`

Mock state is reset between tests via `test/helpers/appwrite-mock.js`.

### Common pitfalls

- **`process.env.SERVER`**: env vars are strings. `"false"` is truthy.
  Use `delete process.env.SERVER` for client-side tests, not
  `vi.stubEnv('SERVER', false)`.
- **`vi.resetModules()`**: breaks Pinia store instances. Import modules
  once at the top level and re-register callbacks in `beforeEach`.
- **`Query.contains`**: the mock must include all Query methods used by
  stores. Add missing methods to `test/setup.js`.
- **Vue component tests**: add `@vitejs/plugin-vue` to `vitest.config.js`
  and stub Quasar components (`q-btn`, `q-dialog`, etc.).
