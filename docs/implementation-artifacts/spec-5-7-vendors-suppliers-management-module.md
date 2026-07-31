# Story 5.7: Vendors/Suppliers Management Module

**Source Spec:** `docs/stories/story-5.7.md`  
**Source Prompt:** `docs/implementation-artifacts/bmad-dev-auto-epic-5-prompt.md`  
**Epic:** Epic 5 — Village Calendar, Storage, Optional Modules, and User Management  
**Goal:** Deliver a Vendors module that lets finance managers track suppliers/buyers, integrates vendor selection into farm sales and finance expenses, and surfaces vendor history on a dashboard widget.  
**Version:** 1.0  
**Status:** done
**Baseline Revision:** 7a1cd99502f5431d103535b6044da6d377fc875f
**Final Revision:** NO_VCS (commit pending user approval)
**Follow-up Review Recommended:** false
**Warnings:** oversized

---

## Acceptance Criteria (Given/When/Then)

1. **Module enablement**
   - **Given** a village settings row  
     **When** `vendors_enabled` is true (default)  
     **Then** users with `vendors:read` see a Vendors section in the main navigation and can access `/vendors`.

2. **Vendor master data**
   - **Given** a user with `vendors:write`  
     **When** they submit the Add Vendor form  
     **Then** a `vendors` row is created with name, type (Supplier/Buyer/Both), business type, contact info, payment terms, quality rating, and the vendor appears in the list.

3. **Vendor detail + history**
   - **Given** an existing vendor  
     **When** a user opens the vendor detail page  
     **Then** the page shows vendor info, total transactions, total purchase/sale amounts, and a chronological list of linked `finance_transactions` (expenses) and `farm_sales`.

4. **Farm sales buyer selection**
   - **Given** a farm manager recording a sale  
     **When** they select a vendor from the buyer picker or type an ad-hoc name  
     **Then** `farm_sales` stores `buyer_type: 'vendor'`, `buyer_id: <vendor.$id>`, and `buyer_name: <vendor.name>`; ad-hoc sales use `buyer_type: 'external'` and the typed `buyer_name`.

5. **Finance expense vendor selection**
   - **Given** a finance manager recording an expense  
     **When** they select a vendor or choose ad-hoc  
     **Then** `finance_transactions.vendor_id` is set to the vendor ID; ad-hoc text is prepended to the `description` field because the free-text `vendor` column is removed.

6. **Dashboard widget**
   - **Given** a user on the main dashboard  
     **When** the Vendors module is enabled  
     **Then** a Vendors Summary widget shows active vendor counts by type and a link to the vendor list.

7. **Sample data**
   - **Given** the Seed All Data cloud function runs on a fresh database  
     **When** vendors are seeded before finance/farm sample data  
     **Then** sample farm sales and expenses reference vendor IDs instead of free-text names.

---

## Dependencies & Risks

- **Prerequisites completed:** Epic 2 finance categories/expense form (2.2, 2.3), Epic 3 farm sales (3.8), Epic 5.3/5.4 storage/module plumbing.
- **Assumption:** Fresh install; no data migration required. Existing `finance_transactions.vendor` free-text column is replaced by `vendor_id` in `setup-appwrite.js`.
- **Design conflict resolved:** The user prompt recommends an ad-hoc free-text fallback but also says the free-text `vendor` field is gone. This spec keeps `buyer_id` as a string for `farm_sales` (so ad-hoc buyer names still persist in `buyer_name`) and replaces `finance_transactions.vendor` with `vendor_id`. For finance ad-hoc text, the typed name is prepended to `description` (no free-text column).
- **No client-side sample-data composables:** `src/composables/useSampleData.js`, `useFinanceSampleData.js`, and `useFarmSampleData.js` do not exist. Sample data lives in `server/functions/seedAllData/src/main.js`; this spec updates that file.
- **DATABASE_SCHEMA.md location:** The project schema doc is at `DATABASE_SCHEMA.md` (repo root), not `docs/DATABASE_SCHEMA.md`.

---

## Code Map

| Layer                    | New / Modified Files                                                                                                  | Purpose                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema**               | `server/scripts/setup-appwrite.js`                                                                                    | Add `vendors` table; add `vendors_enabled` to `village_settings`; replace `finance_transactions.vendor` with `vendor_id` relationship; add `'vendor'` to `farm_sales.buyer_type` enum. |
| **Seeding / Defaults**   | `server/scripts/seed-roles.js`, `server/scripts/seed-village-settings.js`, `server/functions/seedAllData/src/main.js` | Grant vendor permissions, default `vendors_enabled: true`, seed sample vendors, link sample farm/finance rows to vendor IDs.                                                           |
| **Wipe**                 | `server/functions/wipeAllData/src/main.js`                                                                            | Add `vendors` table to the wipe list.                                                                                                                                                  |
| **Settings store**       | `src/stores/settings-store.js`                                                                                        | Add `vendorsEnabled` getter (defaults to true).                                                                                                                                        |
| **Vendor module**        | `src/modules/vendors/stores/vendors-store.js`                                                                         | Pinia store: fetch, create, update, delete, fetch vendor history.                                                                                                                      |
|                          | `src/modules/vendors/components/VendorPicker.vue`                                                                     | Reusable q-select + ad-hoc fallback used by TransactionForm and RecordSaleDialog.                                                                                                      |
|                          | `src/modules/vendors/components/VendorsSummaryWidget.vue`                                                             | Dashboard widget.                                                                                                                                                                      |
|                          | `src/modules/vendors/pages/VendorsListPage.vue`                                                                       | Paginated/filterable vendor list.                                                                                                                                                      |
|                          | `src/modules/vendors/pages/VendorFormPage.vue`                                                                        | Add/edit vendor.                                                                                                                                                                       |
|                          | `src/modules/vendors/pages/VendorDetailPage.vue`                                                                      | Vendor info + transaction history.                                                                                                                                                     |
|                          | `src/modules/vendors/router.js`                                                                                       | Module routes gated by `vendors:read` and `requiresSetting: 'vendorsEnabled'`.                                                                                                         |
|                          | `src/modules/vendors/utils/vendor-utils.js`                                                                           | Helpers for vendor type colors and name formatting.                                                                                                                                    |
| **Navigation / Routing** | `src/layouts/MainLayout.vue`, `src/router/routes.js`                                                                  | Add Vendors drawer section; wire vendor routes.                                                                                                                                        |
| **Finance integration**  | `src/modules/finance/components/TransactionForm.vue`, `src/modules/finance/stores/finance-store.js`                   | Replace free-text vendor with `VendorPicker`; set `vendor_id`; persist ad-hoc text in `description`.                                                                                   |
| **Farm integration**     | `src/modules/farm/components/RecordSaleDialog.vue`, `src/modules/farm/stores/farm-store.js`                           | Replace buyer q-input with `VendorPicker`; set `buyer_type`/`buyer_id`/`buyer_name`.                                                                                                   |
| **Dashboard**            | `src/pages/dashboard/DashboardPage.vue`                                                                               | Include `VendorsSummaryWidget`.                                                                                                                                                        |
| **Docs**                 | `DATABASE_SCHEMA.md`                                                                                                  | Add `vendors` table section.                                                                                                                                                           |
|                          | `docs/implementation-artifacts/bmad-dev-auto-epic-5-prompt.md`                                                        | Mark Story 5.7 as done.                                                                                                                                                                |

---

## Tasks & Acceptance

### 1. Database schema (`server/scripts/setup-appwrite.js`)

- [x] Add `vendors` table before `finance_transactions` and `farm_sales` in `tableSchemas`:
  - `name` (string, 200, required)
  - `vendor_type` (enum: `Supplier`, `Buyer`, `Both`, required)
  - `business_type` (enum: `Individual`, `Cooperative`, `Company`, `NGO`, `Government`, `Market`, optional)
  - `contact_person` (string, 100, optional)
  - `phone` (string, 30, optional)
  - `email` (email, optional)
  - `address` (string, 500, optional)
  - `payment_terms` (string, 255, optional)
  - `quality_rating` (integer, 1-5, optional)
  - `is_preferred` (boolean, default false)
  - `is_active` (boolean, default true)
  - `notes` (string, 1000, optional)
  - `contract_expiry` (datetime, optional)
  - Indexes: `idx_vendors_name` on `name ASC`, `idx_vendors_type` on `vendor_type ASC`.
- [x] Add `vendors_enabled` boolean column to `village_settings` (default `true`).
- [x] In `finance_transactions`, remove the `vendor` string column and add `vendor_id` relationship (`manyToOne` → `vendors`, `onDelete: 'setNull'`, optional).
- [x] In `farm_sales`, add `'vendor'` to the `buyer_type` enum elements. Keep `buyer_id` as a string.

**Acceptance:** `npm run setup:appwrite` creates/updates the schema without errors on a fresh database.

### 2. RBAC (`server/scripts/seed-roles.js`)

- [x] `Finance Manager`: add `vendors:read`, `vendors:write`.
- [x] `Village Head`, `Deputy Village Head`, `Council Member`: add `vendors:read`.
- [x] `Farm Manager`, `Crop Manager`: add `vendors:read`.

**Acceptance:** Default role definitions include vendor permissions.

### 3. Village settings defaults

- [x] `server/scripts/seed-village-settings.js`: add `vendors_enabled: true` to `defaultSettings` and include `'vendors'` in `modules_enabled`.
- [x] `server/functions/seedAllData/src/main.js` (`seedVillageSettings`): add `vendors_enabled: true` and `'vendors'` to `modules_enabled`.

**Acceptance:** New and sample villages have the Vendors module enabled by default.

### 4. Settings store (`src/stores/settings-store.js`)

- [x] Add getter `vendorsEnabled: (state) => state.settings?.vendors_enabled ?? true`.

**Acceptance:** `settingsStore.vendorsEnabled` is truthy for new/existing settings rows without a value.

### 5. Wipe all data (`server/functions/wipeAllData/src/main.js`)

- [x] Add `'vendors'` to `TABLES_TO_WIPE` immediately after `'finance_transactions'`.

**Acceptance:** Wiping data removes the vendors table.

### 6. Sample data (`server/functions/seedAllData/src/main.js`)

- [x] Create a new `seedVendors` phase that runs before `seedFinance` and `seedFarm`. Seed at least 6 sample vendors:
  - Buyers: `Zambia Food Reserve Agency` (Buyer, Government), `Katete Local Miller` (Buyer, Individual), `Katete Market Vendors` (Buyer, Market), `Chipata Urban Wholesaler` (Buyer, Company).
  - Suppliers: `Benga Agro Supplies` (Supplier, Company), `Munali Inputs Cooperative` (Supplier, Cooperative).
- [x] Return a vendor ID map keyed by lowercase name.
- [x] In the 18-month finance expense loop, set `vendor_id` for rows where it makes sense (e.g., `Monthly office supplies` → `Benga Agro Supplies`; `Water pump maintenance` → `Munali Inputs Cooperative`).
- [x] In `buildHarvestPlans`, replace `buyer_type: 'external'` and `buyer_name` with vendor references where the buyer matches a seeded vendor; for unmatched buyers keep `buyer_type: 'external'` and `buyer_name`.

**Acceptance:** Re-seeding a fresh database produces farm sales and finance transactions that reference vendor IDs.

### 7. Vendor store (`src/modules/vendors/stores/vendors-store.js`)

Create a new Pinia options store named `vendors` with:

- State: `vendors`, `vendorsLoaded`, `isLoading`, `currentVendor`, `vendorHistory`.
- Getters: `activeVendors`, `suppliers`, `buyers`, `both`, `getVendorNameById`, `vendorTransactionTotals`.
- Actions:
  - `fetchVendors(force)` — list all active vendors, order by `name`.
  - `fetchVendorById(id)` — load single vendor into `currentVendor`.
  - `createVendor(data)`/`updateVendor(id, data)`/`deleteVendor(id)` — CRUD with local state refresh.
  - `fetchVendorHistory(vendorId)` — query `finance_transactions` where `vendor_id = vendorId` and `farm_sales` where `buyer_id = vendorId` and `buyer_type = 'vendor'`, merge, sort by date desc.

**Acceptance:** Store methods return `{ success, data, error }` and update reactive state.

### 8. Reusable vendor picker (`src/modules/vendors/components/VendorPicker.vue`)

- [x] Props: `modelValue` (object or null with `id`, `name`, `type`), `buyerMode` (boolean, false), `label`.
- [x] Loads `vendors` from `useVendorsStore` on mount.
- [x] `q-select` with `use-input`, `input-debounce`, `@filter` to filter by name.
- [x] Options include an `"Ad-hoc"` entry at the bottom that, when selected, reveals a free-text `q-input` below the select.
- [x] Emits `update:modelValue` with `{ id, name, type: 'vendor' | 'external' }`. For ad-hoc farm sales, `type: 'external'`, `id: ''`, `name` = typed text. For ad-hoc finance, `type: 'external'`, `id: ''`, and the typed name is returned as `adHocName` for the parent to prepend to `description`.
- [x] Slot/action for an "Add Vendor" `q-item` at the top of the dropdown that opens a small inline dialog or navigates to `/vendors/add`.

**Acceptance:** Picker is usable in both TransactionForm and RecordSaleDialog.

### 9. Vendor pages and router

- [x] `src/modules/vendors/router.js`:
  - `/vendors` (list) — `vendors:read`, `requiresSetting: 'vendorsEnabled'`
  - `/vendors/add` (form) — `vendors:write`
  - `/vendors/:id` (detail) — `vendors:read`
  - `/vendors/:id/edit` (form) — `vendors:write`
- [x] `src/router/routes.js`: `import vendorRoutes` and spread after `storageRoutes`.
- [x] `src/modules/vendors/pages/VendorsListPage.vue` — table with columns Name, Type, Business, Phone, Rating, Active status; filters by type and search; row click navigates to detail.
- [x] `src/modules/vendors/pages/VendorFormPage.vue` — form for all vendor fields; handles add and edit.
- [x] `src/modules/vendors/pages/VendorDetailPage.vue` — header with vendor info, summary cards (total purchases/sales, transaction count), list of recent transactions with links to finance/farm detail.

**Acceptance:** Routes are gated by permissions and the `vendorsEnabled` setting.

### 10. Main navigation (`src/layouts/MainLayout.vue`)

- [x] Add `vendors: false` to `expandedSections`.
- [x] Add a new `q-expansion-item` under **Finance** (or a new **Suppliers** section) visible when `isClient && hasPermission('vendors:read') && settingsStore.vendorsEnabled`.
- [x] Links: `Vendors` → `/vendors`; `Add Vendor` → `/vendors/add` (write only).

**Acceptance:** Navigation appears only when the module is enabled and user has read permission.

### 11. Finance expense integration

- [x] `src/modules/finance/components/TransactionForm.vue`:
  - Replace the `vendor` q-input with `VendorPicker` bound to a new `formData.vendor` object.
  - When a vendor is selected, `submitData.vendor_id = formData.vendor.id`.
  - When ad-hoc is selected, `submitData.vendor_id = null` and prepend `Vendor: {adHocName} — ` to `submitData.description` if `adHocName` is provided.
  - On edit, initialize `formData.vendor` from `initialData.vendor_id` by loading the vendor via `useVendorsStore`.
- [x] `src/modules/finance/stores/finance-store.js`:
  - In `createTransaction` and `updateTransaction`, remove `data.vendor = transactionData.vendor`.
  - Set `data.vendor_id = transactionData.vendor_id || null`.
  - For `enrichTransactions`, optionally resolve `vendor_name` from a local cache if `vendor_id` is present.

**Acceptance:** Creating/updating an expense with a vendor sets `vendor_id`; ad-hoc text is preserved in `description`.

### 12. Farm sales integration

- [x] `src/modules/farm/components/RecordSaleDialog.vue`:
  - Replace `buyer_name` q-input with `VendorPicker` (`buyerMode` true) bound to `formData.buyer`.
  - Emit `buyer_name`, `buyer_type`, `buyer_id` in the submit payload.
- [x] `src/modules/farm/stores/farm-store.js` (`recordSale`):
  - Set `buyer_type: saleFormData.buyer_type || 'external'`.
  - Set `buyer_id: saleFormData.buyer_id || ''`.
  - Set `buyer_name: saleFormData.buyer_name`.
  - Update `description` to use `buyer_name`.

**Acceptance:** Selecting a vendor in Record Sale stores `buyer_type='vendor'`, `buyer_id=<vendor.$id>`, and `buyer_name=<vendor.name>`.

### 13. Dashboard widget

- [x] `src/modules/vendors/components/VendorsSummaryWidget.vue` — card showing:
  - Total active vendors
  - Counts by type (Suppliers / Buyers / Both)
  - "View All" link to `/vendors`
- [x] `src/pages/dashboard/DashboardPage.vue` — conditionally include `<VendorsSummaryWidget />` when `isClient && hasPermission('vendors:read')`.

**Acceptance:** Widget loads and updates when vendor data changes.

### 14. Documentation

- [x] `DATABASE_SCHEMA.md`: add a `vendors` table section documenting all columns and relationships.
- [x] `docs/implementation-artifacts/bmad-dev-auto-epic-5-prompt.md`: update current story status to mark 5.7 as done and 5.4 already done.

**Acceptance:** Docs accurately reflect the implemented schema and current epic state.

---

## Design Notes

- **`buyer_id` is kept as a string** in `farm_sales` (it already is one) to preserve polymorphism across buyer types (`vendor`, `external`, `market`, `cooperative`, `household`). When a vendor is chosen, it stores the vendor's `$id` and `buyer_type: 'vendor'`.
- **`finance_transactions.vendor` is removed** and replaced by `vendor_id` (manyToOne → `vendors`). This is the primary AC and review invariant from the user prompt.
- **Ad-hoc finance vendor handling:** The free-text name from the VendorPicker's ad-hoc mode is prepended to the transaction `description` so the supplier context is not lost. This avoids keeping a free-text vendor column.
- **Sample-data source:** The client-side `useSampleData.js`/`useFinanceSampleData.js`/`useFarmSampleData.js` files referenced in the prompt do not exist. All sample data lives in the `seedAllData` cloud function; this story updates that file.
- **Module toggle:** `vendors_enabled` is a `village_settings` boolean. Story 5.9 (Module Management) will add the admin UI toggle; until then the flag defaults to `true`.

---

## Verification

1. Run `npm run lint` and `npm run build` with no new errors.
2. Run `npm run setup:appwrite` against a fresh project and confirm `vendors` table, `vendor_id` column, and enum changes are created.
3. Run `npm run seed:roles` and `npm run seed:settings` (or deploy and run `seedAllData`) and verify default settings.
4. Manual UI checks:
   - Add a vendor; verify it appears in the list.
   - Record a farm sale with a vendor; verify `farm_sales.buyer_type='vendor'`, `buyer_id` set.
   - Record a finance expense with a vendor; verify `finance_transactions.vendor_id` set.
   - Record an ad-hoc finance expense; verify `vendor_id` is null and the typed name appears in `description`.
   - Open vendor detail; verify transaction history lists both expense and sale.
   - Confirm widget counts on dashboard.

---

## Auto Run Result

**Summary:** Implemented the Vendors/Suppliers Management Module end-to-end: `vendors` table + `vendors_enabled` settings flag in `setup-appwrite.js`; vendor RBAC permissions in `seed-roles.js`; default settings updates in `seed-village-settings.js` and `seedAllData/src/main.js` (new `seedVendors` phase seeding 6 sample vendors, wired into the finance expense loop and `buildHarvestPlans`); `vendors` added to `wipeAllData` TABLES_TO_WIPE; `vendorsEnabled` getter on `settingsStore`; new `src/modules/vendors/` module (`vendors-store.js`, `vendor-utils.js`, `router.js`, `VendorPicker.vue`, `VendorsSummaryWidget.vue`, `VendorsListPage.vue`, `VendorFormPage.vue`, `VendorDetailPage.vue`); routes spread into `src/router/routes.js`; nav section in `MainLayout.vue`; `TransactionForm.vue`/`finance-store.js` updated to use `vendor_id` (with ad-hoc description fallback) instead of the free-text `vendor` column; `RecordSaleDialog.vue`/`farm-store.js` updated to set `buyer_type`/`buyer_id` from the picked vendor; `VendorsSummaryWidget` added to `DashboardPage.vue`; `DATABASE_SCHEMA.md` updated with the new `vendors` table and the `finance_transactions`/`farm_sales`/`village_settings` column changes.

**Deferred / follow-ups:**

- No admin UI to toggle `vendors_enabled` yet — Story 5.9 (Module Management) will generalize this into the full toggle page.
- `VendorPicker`'s "Add Vendor" action navigates to `/vendors/add` rather than opening an inline dialog (acceptable per spec wording — "opens a small inline dialog or navigates").
- Existing (pre-5.7) `finance_transactions` rows with a populated `vendor` string column are not migrated; this is a fresh-install schema change per project convention (no production data yet).

**Next Iteration:** Story 5.9 — Module Management and Configuration (see `docs/implementation-artifacts/bmad-dev-auto-epic-5-prompt.md`).

---

## Review Triage Log

### 2026-08-02 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 5: (medium 3, low 2)
- defer: 5
- reject: 0
- addressed_findings:
  - `[medium]` `[patch]` `vendorTransactionTotals` summed negative `entry.amount` for finance expenses into `totalPurchases`, producing a negative "Total Purchases (Expenses)" card on `VendorDetailPage`. Fixed by using `Math.abs()` on the finance branch (matches the `Math.abs` already used in the history list rendering).
  - `[medium]` `[patch]` `VendorFormPage` defaulted `quality_rating` to `0`, which violates the `vendors.quality_rating` schema constraint (`min: 1`). Submitting a new vendor without touching the rating would have failed server-side. Default changed to `null` (and edit-mode load now uses `?? null` instead of `|| 0`).
  - `[medium]` `[patch]` `VendorFormPage.loadVendor` left an empty, editable form bound to the route `:id` when `fetchVendorById` failed (not found / network / permission), so a subsequent "Save Changes" would `updateVendor(id, {})` — a no-op update against a missing row, or worse, a successful no-op that misleads the user. Now redirects to `/vendors` on load failure.
  - `[low]` `[patch]` `fetchVendorHistory(vendorId)` had no null/empty guard; calling it with a missing id would issue an Appwrite `Query.equal('vendor_id', undefined)` request. Added an early return with `vendorHistory = []`.
  - `[low]` `[patch]` `VendorsListPage` `q-table` had no `no-data` slot, so an empty village saw a blank table with no call to action. Added an empty-state message pointing to "Add Vendor".

---

## Auto Run Result — Review Pass (2026-08-02)

**Review approach:** The two parallel review subagents (Blind Hunter / Edge Case Hunter) could not be spawned this pass due to a temporary platform quota limit, so the review was performed inline by the parent agent using the same diff scope (full tracked diff since `7a1cd99502f5431d103535b6044da6d377fc875f` plus all new files under `src/modules/vendors/`) and the same adversarial + edge-case lenses.

**Patches applied:** 5 (3 medium, 2 low) — see `addressed_findings` above.

**Items deferred:** 5 — all appended to `docs/implementation-artifacts/deferred-work.md` under this story's heading. They are pre-existing project-wide patterns (seed-roles skip-existing, shared `permissions` var, list pagination caps, no unit-test infra) re-surfaced by this story, not introduced by it.

**Items rejected:** 0.

**Follow-up review recommended:** `false`. The final pass made only localized, low-to-medium consequence fixes (sign correction, null guard, form-default correction, redirect-on-load-failure, empty-state copy). No behavior/API/security/data-migration impact beyond the story's already-accepted scope, and the deferred items are project-wide patterns already tracked from prior stories.

**Verification performed:**

- `npm run lint` — exit 0, no new errors after patches.
- `npm run build` (`quasar build`) — "Build succeeded", exit 0, all vendor chunks (`vendors-store`, `VendorPicker`, `VendorFormPage`, `VendorDetailPage`, `VendorsListPage`, `VendorsSummaryWidget`, `vendor-utils`) emitted.
- Static inspection of the diff for the schema (`setup-appwrite.js`), RBAC (`seed-roles.js`), seed data (`seedAllData/src/main.js`), store, pages, components, router, and the finance/farm integration call sites.
- Not run this session (no live Appwrite credentials): `npm run setup:appwrite`, `npm run seed:roles`, `npm run seed:settings`, deploy + run `seedAllData`. The user should run these against a dev/staging Appwrite project to confirm schema apply and seeding work end-to-end.

**Residual risks:**

- Schema change assumes a fresh/pre-production database (no migration path for existing `finance_transactions.vendor` string data) — consistent with project convention noted in the spec.
- `farm_sales.buyer_id` intentionally remains a plain string (not a relationship) to preserve polymorphism across buyer types — documented in `DATABASE_SCHEMA.md` and the spec's Design Notes.
- No admin UI to toggle `vendors_enabled` yet — deferred to Story 5.9 per the spec.
- Review was performed inline rather than by independent subagents; an independent follow-up review is not recommended for these specific fixes, but a future independent pass over the whole module would be valuable once the deferred project-wide patterns (server-side row security, list pagination, unit tests) are addressed.

---

## Spec Change Log

| Date       | Version | Change                                                                                                  | Author |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------- | ------ |
| 2026-08-02 | 1.0     | Initial spec for Story 5.7; resolved sample-data file-path mismatch and finance ad-hoc fallback design. | Devin  |
