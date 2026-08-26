---
title: 'Comprehensive Showcase Seed Data'
type: 'feature'
created: '2026-08-26'
status: 'done'
review_loop_iteration: 0
baseline_commit: '5fa177e4a74fabed0bcb1d9654a6ececfd6e69c0'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `seedAllData` covers much of finance, farm, lending, and school, but it omits newly added and cross-cutting features such as planting cost entries, transaction links, village events, notification read states, and storage/audit-aware scenarios. Some existing records do not exercise all filters, statuses, dashboards, and relationship paths.

**Approach:** Reconcile the live 39-table Appwrite schema with application consumers, then expand deterministic sample data so every safely seedable feature has realistic related records and representative states. Preserve referential integrity and validate payloads without modifying live Appwrite data during development.

## Boundaries & Constraints

**Always:** Treat `server/scripts/setup-appwrite.js` and the live `village-project` / `villageDB` schema as authoritative; create dependencies before dependents; use actual returned row IDs; cover positive, empty/optional, overdue/upcoming, active/inactive, and completed/error-like business states where supported; keep data culturally and financially coherent; preserve the function’s admin-only execution model and timeout budget.

**Ask First:** Any live data mutation, function deployment/execution, destructive wipe, creation of Appwrite Auth users, or uploading real bucket files requires explicit approval. If identity-backed tables (`transaction_links.recorded_by`, `notification_reads.user_id`, `file_metadata.owner_id`) cannot be populated generically without existing users or real files, report the constraint and prefer integrity over fabricated references.

**Never:** Touch production-like live rows while reviewing; create orphan relationships or metadata for nonexistent files; weaken permissions/schema/security controls; seed credentials or personal secrets; claim unsupported modules are covered.

## I/O & Edge-Case Matrix

| Scenario              | Input / State                                                           | Expected Output / Behavior                                                        | Error Handling                                                            |
| --------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Fresh database        | Schemas exist and preserved identity tables may contain users/roles     | All safe showcase tables receive coherent, linked records                         | Fail with phase/table context; do not silently omit required relations    |
| Identity available    | Existing application user rows can anchor user-required relationships   | Seed read/unread and funding-link scenarios against valid user IDs                | Skip user-dependent scenarios with explicit log when no valid user exists |
| Optional relationship | Business state legitimately lacks vendor, inventory, or finance linkage | Record remains schema-valid and demonstrates the optional state                   | Never substitute arbitrary IDs                                            |
| Re-run without wipe   | Existing seed data is present                                           | Avoid accidental duplicate canonical/reference data and explain required workflow | Detect unsafe state or use stable lookup/update behavior                  |

</frozen-after-approval>

## Code Map

- `server/functions/seedAllData/src/main.js:1-3406` -- phase orchestration, Appwrite helpers, and all generated domain records; currently omits several live tables.
- `server/functions/seedAllData/src/data.js:1-636` -- households, residents, and timetable fixtures with index-based relationship inputs.
- `server/scripts/setup-appwrite.js:116-1958` -- authoritative 39-table schema, enums, required fields, and relationships; notably `planting_cost_entries` (586-635), `transaction_links` (903-951), and `village_events` (1448-1491).
- `server/functions/wipeAllData/src/main.js:22-60` -- dependency-aware cleanup list; must remain compatible with newly seeded tables.
- `src/composables/useDashboardData.js` and `src/**/stores/*.js` -- consumer queries, filters, aggregations, and status semantics to showcase.
- `test/e2e/support/commands.js:124-137` -- existing test-project wipe/seed integration.
- `test/setup.js` and `vitest.config.js` -- unit-test conventions and Appwrite mocks.
- Live Appwrite `village-project` / `villageDB` -- read-only review found 39 tables, 2 Auth users, 2 storage buckets, and the deployed `seedAllData` function; API schema output must be cross-checked against setup code.

## Tasks & Acceptance

**Execution:**

- [x] `server/functions/seedAllData/src/main.js` and `data.js` -- expand and normalize showcase scenarios, including missing safely seedable tables and relationship chains.
- [x] `server/functions/wipeAllData/src/main.js` -- correct dependency coverage/order only where expanded seeding requires it.
- [x] `test/unit/server/seedAllData.spec.js` -- validate fixture integrity, required scenario coverage, IDs passed across phases, and user-dependent skip behavior with mocked Appwrite.

**Acceptance Criteria:**

- Given a fresh valid schema, when seeding completes, then every application-backed table is either populated with meaningful related data or explicitly documented as identity/file/future constrained.
- Given seeded records, when dashboards, list filters, detail views, and cross-module histories load, then they display representative current, historical, upcoming, overdue, inactive, and completed states.
- Given every populated relationship field, when its target is resolved, then the referenced row exists and belongs to the correct domain entity.
- Given no valid application user anchor, when user-required seed scenarios run, then the function logs a precise skip and completes without fabricated IDs.
- Given unit verification, when seed payload and relationship tests run, then schema enums, required fields, fixture indices, and critical cross-module chains pass.

## Spec Change Log

## Design Notes

Separate portable business fixtures from environment-bound identity/storage examples. Prefer small semantic lookup maps over positional IDs for newly added relationships; retain existing positional fixtures where already stable. Dynamic dates should keep dashboards useful on any run while tests assert relative ordering rather than exact timestamps.

## Verification

**Commands:**

- `npm run test:unit -- --run test/unit/server/seedAllData.spec.js` -- targeted seed tests pass.
- `npm run lint` -- modified source and tests pass lint.
- `npm run test:unit` -- full unit suite passes.

**Manual checks (if no CLI):**

- Compare all 39 live table schemas against seeded/explicitly excluded coverage and inspect representative relationship chains without writing live data.
