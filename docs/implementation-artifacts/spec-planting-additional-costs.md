---
title: 'Add Additional Costs to Existing Plantings'
type: 'feature'
created: '2026-08-26'
status: 'done'
baseline_commit: 'b80c51229b1db95b9ad7ee04b5f015f12d1f0b7a'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Planting costs are captured only at creation as mutable aggregate fields, so later labor, input, and miscellaneous expenses cannot be recorded with dates, descriptions, inventory effects, or Finance links.

**Approach:** Add an appendable `planting_cost_entries` ledger related to each planting while retaining current planting cost fields as backward-compatible initial costs. Provide cost history and lifetime totals on planting surfaces, with optional inventory deduction and optional creation of a linked Finance expense.

## Boundaries & Constraints

**Always:** Use cost categories `inputs`, `labor`, and `other`; require a positive amount, date, and description; permit additions only for planned/planted/growing/harvesting plantings; show a confirmation repeating category and amount before create, edit, or delete; authorize mutation through existing Farm permissions and require appropriate Finance permission when creating/updating/cancelling an expense. Keep initial planting fields and creation behavior intact. For inventory-backed input costs, derive the amount from selected item quantity/unit cost unless explicitly overridden, store the item and deducted quantity, and keep stock synchronized. For Finance-backed entries, create and retain a linked expense and keep its amount/details/funding impact synchronized. Multi-resource operations must use ordered writes with compensating rollback and return an explicit consistency error if rollback itself fails.

**Ask First:** Any need for new permission names, an Appwrite Function/transaction mechanism, changes to initial planting costs, or scope beyond planting-related costs.

**Never:** Store ledger history as JSON on the planting; silently overwrite initial aggregate costs; create Finance expenses without explicit user opt-in; allow additions to completed/failed plantings; silently leave inventory, Finance, and ledger values inconsistent.

## I/O & Edge-Case Matrix

| Scenario                 | Input / State                                     | Expected Output / Behavior                                                       | Error Handling                                 |
| ------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| Standalone cost          | Active planting, category/date/amount/description | Confirm, append entry, refresh history and lifetime totals                       | Preserve form and show actionable failure      |
| Inventory input          | Input category plus item and quantity             | Validate stock, derive/confirm cost, deduct stock, append linked entry           | Roll back stock if entry creation fails        |
| Finance expense          | User opts in and supplies valid Finance fields    | Create funded expense and linked entry                                           | Reverse/cancel expense if entry creation fails |
| Edit linked entry        | Amount/details or inventory quantity changes      | Confirm old/new values; apply inventory delta and update Finance funding/details | Roll back completed steps in reverse order     |
| Delete linked entry      | Authorized user confirms category and amount      | Restore deducted stock, cancel Finance expense, then remove entry                | Do not remove entry if linked reversal fails   |
| Closed planting          | Completed or failed planting                      | Show history read-only; hide/disable Add Cost                                    | No write attempted                             |
| Insufficient stock/funds | Requested quantity or Finance funding unavailable | Reject without creating/updating ledger entry                                    | Explain shortage; retain input                 |

</frozen-after-approval>

## Code Map

- `server/scripts/setup-appwrite.js` -- declare the new ledger table, relationships, and indexes.
- `src/modules/farm/stores/farm-store.js` -- ledger state, queries, totals, coordinated CRUD, and rollback.
- `src/stores/inventory-store.js` -- existing stock adjustment API used for deductions/reversals.
- `src/modules/finance/stores/finance-store.js` -- existing expense create/update/cancel and funding-impact behavior.
- `src/modules/farm/pages/PlantingDetailPage.vue` -- cost history, lifetime summary, and add/edit/delete entry points.
- `src/modules/farm/pages/PlotDetailPage.vue` and `src/modules/farm/pages/PlantingsListPage.vue` -- consume ledger-aware investment totals.
- `test/unit/modules/farm/farm-store.spec.js` -- store and compensation-path coverage.

## Tasks & Acceptance

**Execution:**

- [x] `server/scripts/setup-appwrite.js` -- add `planting_cost_entries` with planting relation, category, amount/date/description, optional inventory reference/quantity, optional Finance transaction reference, and query indexes.
- [x] `src/modules/farm/stores/farm-store.js` -- add ledger fetch/getters and coordinated create/update/delete actions with status validation, permission-compatible errors, delta synchronization, and best-effort reverse-order rollback.
- [x] `src/modules/farm/components/PlantingCostDialog.vue` -- add reusable create/edit form with conditional inventory and Finance sections, validation, and value/category confirmation.
- [x] `src/modules/farm/pages/PlantingDetailPage.vue` -- load/render chronological cost history, distinguish initial versus additional costs, show lifetime category totals, and expose permitted actions only for active plantings.
- [x] `src/modules/farm/pages/PlotDetailPage.vue` and `src/modules/farm/pages/PlantingsListPage.vue` -- replace raw aggregate calculations with ledger-aware totals without regressing legacy records.
- [x] `test/unit/modules/farm/farm-store.spec.js` and relevant component tests -- cover the matrix, legacy totals, linked synchronization, confirmations, permissions, closed statuses, and rollback failures.

**Acceptance Criteria:**

- Given a legacy planting with no ledger rows, when any planting cost summary renders, then its values equal the existing three initial cost fields.
- Given additional entries, when planting costs render, then initial plus additional values are totaled once and entries remain individually visible.
- Given an inventory- or Finance-linked mutation, when every operation succeeds, then all linked records agree; when an operation fails, then prior operations are compensated or a specific consistency warning is surfaced.
- Given a completed or failed planting, when viewed, then its complete cost history remains visible but no cost mutation is available.

## Spec Change Log

## Design Notes

Treat planting fields as immutable opening balances for compatibility and ledger rows as subsequent activity. Centralize total calculation in store getters so detail, plot, and list views cannot drift. Since client-side Appwrite calls are not transactional, perform prerequisites first, create/update the ledger last, and compensate in reverse order; never report success until all writes complete.

## Verification

**Commands:**

- `npm run test:unit -- --run test/unit/modules/farm` -- expected: Farm store/component tests pass.
- `npm run lint` -- expected: no lint errors.
- `npm run test:unit` -- expected: full unit suite passes.

## Suggested Review Order

**Ledger behavior**

- Start with centralized legacy-plus-ledger totals used across every planting surface.
  [`farm-store.js:168`](../../../src/modules/farm/stores/farm-store.js#L168)

- Coordinated creation orders inventory, Finance, and ledger writes with compensation.
  [`farm-store.js:903`](../../../src/modules/farm/stores/farm-store.js#L903)

- Editing synchronizes inventory switches, Finance changes, and rollback paths.
  [`farm-store.js:1101`](../../../src/modules/farm/stores/farm-store.js#L1101)

- Deletion reverses linked systems before removing the auditable ledger row.
  [`farm-store.js:1298`](../../../src/modules/farm/stores/farm-store.js#L1298)

**User workflow**

- Cost history exposes lifetime totals and controlled mutation actions.
  [`PlantingDetailPage.vue:294`](../../../src/modules/farm/pages/PlantingDetailPage.vue#L294)

- Explicit confirmation repeats category and amount before any write occurs.
  [`PlantingCostDialog.vue:221`](../../../src/modules/farm/components/PlantingCostDialog.vue#L221)

**Schema and verification**

- Appwrite ledger relationships and indexes preserve queryable cost history.
  [`setup-appwrite.js:586`](../../../server/scripts/setup-appwrite.js#L586)

- Component tests cover permission gating, validation, confirmation, and duplicates.
  [`PlantingCostDialog.spec.js:53`](../../../test/unit/modules/farm/PlantingCostDialog.spec.js#L53)
