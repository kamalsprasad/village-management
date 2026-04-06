# Story 2.9: Finance Dashboard - Comprehensive Financial Overview

**Epic:** 2 - Financial Management and Inventory Tracking
**Story ID:** 2.9
**Status:** ready-for-dev
**Date:** 2026-04-06
**Author:** AI Assistant

---

## Story

As a **Finance Manager**,
I want a comprehensive financial dashboard,
so that I can quickly assess village financial health and identify issues.

---

## Summary

This story consolidates all Epic 2 financial data into a unified dashboard experience. It creates the capstone feature that brings together data from Stories 2.1-2.8 into a single, actionable view. The dashboard displays 7 key widgets: Financial Summary, Recent Transactions, Funding Sources, Active Loans, Low Stock Alerts, Top Expense Categories, and Income vs Expenses Trend.

Unlike the Reports page (Story 2.8) which is designed for detailed analysis and export, this dashboard is optimized for at-a-glance operational awareness. Widgets update in real-time as underlying data changes, and each widget provides click-through navigation to detailed views.

This story reuses the reporting calculations from `ReportService.js` (Story 2.8) and integrates with the inventory store for stock alerts and lending store for loan portfolio data.

---

## Prerequisites

- **Story 2.1** (done): Income Transaction Recording - dashboard summary data structure
- **Story 2.2** (done): Expense Transaction Recording - expense aggregation and top categories
- **Story 2.3** (done): Admin-Configurable Categories - dynamic category names for widgets
- **Story 2.4** (done): Funding Source Tracking - funding source balances and overview
- **Story 2.5** (done): Village Lending - loan portfolio data and Active Loans widget
- **Story 2.6** (done): Core Inventory Management - stock status and Low Stock Alerts widget
- **Story 2.7** (done): Automatic Inventory from Finance Purchases - linked inventory visibility
- **Story 2.8** (done): Financial Reports Suite - ReportService.js with aggregation functions

---

## Acceptance Criteria

### AC1: Finance Dashboard Page

- [ ] Create `/finance/dashboard` route (or enhance existing `/finance` as the dashboard landing)
- [ ] Finance Manager sees dashboard as default landing page when accessing Finance module
- [ ] Dashboard layout uses responsive grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- [ ] Page includes refresh button for manual data update
- [ ] Page shows last-updated timestamp
- [ ] Loading state displays skeleton screens while data fetches
- [ ] Empty state shown when no financial data exists (prompt to add transactions)

### AC2: Financial Summary Widget

- [ ] Widget displays at-a-glance summary cards:
  - Total Income (current month / selected period)
  - Total Expenses (current month / selected period)
  - Net Position (surplus/deficit with color indicator)
  - Cash on Hand (sum of funding source current balances)
- [ ] Each card shows:
  - Current period value in large text
  - Comparison to previous period (e.g., "+12% vs last month")
  - Trend indicator arrow (up/down/neutral)
- [ ] Clicking any card navigates to Finance Transactions page with appropriate filter pre-applied
- [ ] Widget updates in real-time when transactions are added/edited in other tabs

### AC3: Recent Transactions Widget

- [ ] Widget displays last 10 transactions in condensed list format
- [ ] Each row shows: date, type icon (income/expense), category, amount, status
- [ ] Clicking a transaction row opens the transaction detail/edit modal
- [ ] "View All" link navigates to Finance Transactions page
- [ ] "Record Transaction" quick button at top of widget
- [ ] Auto-refresh when new transactions are recorded (via store reactivity)

### AC4: Funding Sources Overview Widget

- [ ] Widget displays bar chart or progress bars showing:
  - Each active funding source name
  - Total allocated amount
  - Current balance remaining
  - Percentage used (color-coded: green <70%, yellow 70-90%, red >90%)
- [ ] Shows count of: total sources, fully depleted sources, sources with restrictions
- [ ] "Manage Sources" link navigates to Funding Sources management page
- [ ] Click individual funding source to view detail page with full transaction history

### AC5: Active Loans Widget

- [ ] Widget displays loan portfolio summary:
  - Total outstanding balance (across all active loans)
  - Number of active loans
  - Number of overdue loans (highlighted in red if >0)
  - Next upcoming payment due (date and amount)
- [ ] Mini table shows top 5 loans by outstanding balance
- [ ] Each row shows: borrower name, original amount, remaining balance, status
- [ ] Overdue loans flagged with warning icon and days overdue count
- [ ] Click widget title or "View All Loans" link navigates to Lending module
- [ ] Click individual loan row navigates to loan detail page

### AC6: Low Stock Alerts Widget

- [ ] Widget displays inventory items needing attention:
  - Count of low stock items (status = 'low_stock')
  - Count of out of stock items (status = 'out_of_stock')
  - Combined alert count badge on widget title
- [ ] List shows top 5 items by urgency (out of stock first, then low stock)
- [ ] Each row shows: item name, item type icon, current quantity, reorder threshold
- [ ] Items below threshold shown in yellow, out of stock in red
- [ ] "Manage Inventory" link navigates to Inventory module
- [ ] Click item row navigates to inventory item detail page

### AC7: Top Expense Categories Widget

- [ ] Widget displays pie or donut chart of top 5 expense categories by amount
- [ ] Current period: default to current month, user can select last 3/6/12 months
- [ ] Shows category name, total amount, and percentage of total expenses
- [ ] Legend below chart with color coding
- [ ] "View Full Report" link navigates to Finance Reports with Expense Summary pre-selected
- [ ] Chart uses consistent colors with Finance Reports page

### AC8: Income vs Expenses Trend Widget

- [ ] Widget displays line chart showing income and expense trends over time
- [ ] Default view: last 6 months of data
- [ ] User can toggle view options: 3 months, 6 months, 12 months, year-to-date
- [ ] Two lines on chart: income (green) and expenses (red)
- [ ] Net position shown as shaded area between lines or third line
- [ ] X-axis: months, Y-axis: ZMW amounts
- [ ] Chart has hover tooltips showing exact values
- [ ] "View Full Report" link navigates to Finance Reports with Profit & Loss pre-selected

### AC9: Real-Time Update Behavior

- [ ] All widgets update automatically when:
  - New transaction recorded (income or expense)
  - Transaction edited or deleted
  - Funding source balance changes
  - Loan payment recorded
  - Inventory status changes
- [ ] Updates occur within 2 seconds of data change
- [ ] No full page refresh required
- [ ] Visual flash/highlight on changed widget values (subtle, not jarring)

### AC10: Dashboard Export to PDF

- [ ] "Export Summary" button generates PDF of entire dashboard
- [ ] PDF includes all widgets in a condensed, print-friendly layout
- [ ] PDF header includes village name, report title "Financial Dashboard Summary", date
- [ ] PDF footer includes page numbers and "Generated by [User Name]"
- [ ] Reuses ReportExportService.js from Story 2.8 for consistency

### AC11: Role-Based Access Control

- [ ] **Finance Manager**: Full access to all widgets and data
- [ ] **Village Head**: Read-only access to all widgets (no quick action buttons)
- [ ] **Module managers** (Farm Manager, Head Teacher): Restricted view showing only their module's data
  - Financial Summary filtered to their module
  - Recent Transactions filtered to their module
  - Top Expense Categories filtered to their module
  - Income vs Expenses Trend filtered to their module
  - Funding Sources widget visible but only showing their module's allocations
  - Loans widget visible if they have lending:read permission
  - Inventory widget visible if they have inventory:read permission
- [ ] Users without finance:read permission cannot access dashboard

### AC12: Mobile-Responsive Layout

- [ ] Desktop (1920px+): 3-column grid layout, widgets sized appropriately
- [ ] Tablet (768px-1919px): 2-column grid, Financial Summary spans full width
- [ ] Mobile (320px-767px): Single column stack, all widgets full width
- [ ] Touch-friendly: minimum 44px tap targets on all interactive elements
- [ ] Charts scale appropriately, labels remain readable
- [ ] No horizontal scrolling required

---

## Tasks / Subtasks

- [ ] **Task 1: Create Dashboard Route and Navigation** (AC: #1, #11)
  - [ ] Add `/finance/dashboard` route to `src/modules/finance/router.js`
  - [ ] Set dashboard as default Finance landing page (redirect `/finance` → `/finance/dashboard`)
  - [ ] Update MainLayout navigation to highlight Finance section when on dashboard
  - [ ] Add route guard requiring `finance:read` permission

- [ ] **Task 2: Create FinanceDashboardPage.vue Structure** (AC: #1, #12)
  - [ ] Create page component with responsive grid layout using Quasar's grid system
  - [ ] Add page header with title "Financial Dashboard" and refresh/last-updated controls
  - [ ] Implement loading skeleton state for all widgets
  - [ ] Implement empty state when no data exists
  - [ ] Add manual refresh button with loading indicator

- [ ] **Task 3: Create Financial Summary Widget Component** (AC: #2)
  - [ ] Create `FinancialSummaryWidget.vue` with 4 summary cards
  - [ ] Integrate with `ReportService.js` for period calculations
  - [ ] Add period comparison logic (current vs previous)
  - [ ] Implement color coding: green for surplus, red for deficit
  - [ ] Add click navigation to filtered transactions page
  - [ ] Add real-time reactivity to store changes

- [ ] **Task 4: Create Recent Transactions Widget Component** (AC: #3)
  - [ ] Create `RecentTransactionsWidget.vue` with condensed list view
  - [ ] Fetch last 10 transactions from `finance-store.js`
  - [ ] Implement row click to open TransactionForm in edit mode
  - [ ] Add "View All" and "Record Transaction" action buttons
  - [ ] Subscribe to transaction store changes for auto-refresh

- [ ] **Task 5: Create Funding Sources Widget Component** (AC: #4)
  - [ ] Create `FundingSourcesWidget.vue` with progress bars or chart
  - [ ] Integrate with `finance-store.js` funding sources data
  - [ ] Implement percentage used calculation with color coding
  - [ ] Add click navigation to FundingSourceDetailPage
  - [ ] Add "Manage Sources" link

- [ ] **Task 6: Create Active Loans Widget Component** (AC: #5)
  - [ ] Create `ActiveLoansWidget.vue` with portfolio summary
  - [ ] Integrate with lending store (from Story 2.5) for loan data
  - [ ] Calculate overdue loans and next payment due
  - [ ] Implement loan table with status indicators
  - [ ] Add click navigation to loan detail pages
  - [ ] Handle case when lending module is disabled

- [ ] **Task 7: Create Low Stock Alerts Widget Component** (AC: #6)
  - [ ] Create `LowStockAlertsWidget.vue` with alert list
  - [ ] Integrate with `inventory-store.js` for low/out of stock items
  - [ ] Implement urgency sorting (out of stock first)
  - [ ] Add color coding: red for out of stock, yellow for low
  - [ ] Add click navigation to inventory detail pages
  - [ ] Add "Manage Inventory" link

- [ ] **Task 8: Create Top Expense Categories Widget Component** (AC: #7)
  - [ ] Create `TopExpenseCategoriesWidget.vue` with pie/donut chart
  - [ ] Integrate with `ReportService.js` for expense aggregation
  - [ ] Implement period selector (1/3/6/12 months)
  - [ ] Use Chart.js for chart rendering (client-only, wrapped in ClientOnly component)
  - [ ] Add "View Full Report" navigation

- [ ] **Task 9: Create Income vs Expenses Trend Widget Component** (AC: #8)
  - [ ] Create `IncomeExpenseTrendWidget.vue` with line chart
  - [ ] Integrate with `ReportService.js` for monthly aggregation
  - [ ] Implement view toggle (3/6/12 months, YTD)
  - [ ] Use Chart.js with dual line series (income/expense)
  - [ ] Add hover tooltips for exact values
  - [ ] Add "View Full Report" navigation

- [ ] **Task 9: Implement Real-Time Update System** (AC: #9)
  - [ ] Set up Pinia store subscriptions with 500ms debounce for aggregation widgets
  - [ ] Use immediate reactivity for Recent Transactions (no debounce needed)
  - [ ] Add subtle visual flash on changed values (CSS animation)
  - [ ] Ensure 2-second update target is met

- [ ] **Task 10: Implement Dashboard PDF Export** (AC: #10)
  - [ ] Add "Export Summary" button to page header
  - [ ] Extend `ReportExportService.js` with `exportDashboardToPDF()` function
  - [ ] Create simplified print view layout (tables prioritized over charts)
  - [ ] Add village name, date, and generated-by to PDF header
  - [ ] Test PDF output contains all widget data (charts optional for MVP)

- [ ] **Task 11: Implement RBAC and Module Scoping** (AC: #11)
  - [ ] Use `report-scope.js` `getAllowedModules()` for module-based filtering
  - [ ] Implement read-only mode for Village Head (hide action buttons, use `v-if` on permissions)
  - [ ] Filter all data queries by user's allowed source modules
  - [ ] Handle edge case when user has no module access (show empty state with message)

- [ ] **Task 13: Mobile Responsiveness and Testing** (AC: #12)
  - [ ] Test grid layout on desktop, tablet, mobile breakpoints
  - [ ] Verify all touch targets meet 44px minimum
  - [ ] Test chart readability on small screens
  - [ ] Verify no horizontal scrolling required

---

## Review Findings / Pre-Implementation Concerns

### 1. Widget Data Fetching Strategy

**Concern:** Each widget needs different data, but multiple simultaneous API calls could cause performance issues and race conditions.

**Impact:**

- Dashboard load time could exceed 2-second target
- Widgets might show inconsistent data if fetched at different times
- Appwrite rate limits could be hit with many concurrent queries

**Recommended Solution: Unified Dashboard Data Fetch**

Implement a dedicated `fetchDashboardData` action in `finance-store.js` that:

- Fetches all required data in parallel batches
- Returns a unified data object for all widgets
- Includes intelligent caching (30-second cache) to avoid redundant fetches
- Returns cached data immediately while refreshing in background

```javascript
// src/modules/finance/stores/finance-store.js
async fetchDashboardData(options = {}) {
  const { forceRefresh = false, dateRange = 'current_month' } = options;

  // Return cached data if available and not forcing refresh
  if (!forceRefresh && this.dashboardData && this.dashboardDataTimestamp) {
    const cacheAge = Date.now() - this.dashboardDataTimestamp;
    if (cacheAge < 30000) { // 30 second cache
      return this.dashboardData;
    }
  }

  // Fetch all required data in parallel
  const [transactions, fundingSources, categories] = await Promise.all([
    this.fetchTransactionsForReport({ dateRange, limit: 1000 }),
    this.fetchFundingSources(),
    this.fetchCategories(),
  ]);

  // Aggregate data for widgets using ReportService.js
  const { calculateSummary, groupByCategory } = await import('src/services/ReportService.js');

  this.dashboardData = {
    summary: calculateSummary(transactions),
    recentTransactions: transactions.slice(0, 10),
    fundingSourceBalances: fundingSources.map(s => ({
      ...s,
      percentUsed: ((s.total_received - s.current_balance) / s.total_received) * 100
    })),
    topExpenseCategories: groupByCategory(transactions.filter(t => t.type === 'expense')),
  };

  this.dashboardDataTimestamp = Date.now();
  return this.dashboardData;
}
```

**Alternative (if time-constrained):** Keep separate widget-level fetches but add request deduplication and debouncing.

---

### 2. Chart.js SSR/Hydration Issues

**Concern:** Chart.js is client-side only and can cause SSR hydration mismatches or errors if rendered server-side.

**Impact:**

- Dashboard page may fail to load in SSR mode
- Hydration errors in browser console
- Charts may not render correctly

**Recommended Solution: Client-Only Chart Rendering**

Use Quasar's `<q-no-ssr>` or a custom `ClientOnly` wrapper component:

```vue
<!-- src/components/ClientOnly.vue -->
<template>
  <slot v-if="isClient" />
  <div v-else class="chart-placeholder">
    <q-skeleton type="rect" height="200px" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
const isClient = ref(false);
onMounted(() => {
  isClient.value = true;
});
</script>
```

Use in widgets:

```vue
<ClientOnly>
  <canvas ref="chartRef" />
</ClientOnly>
```

**Implementation Note:** The `FinanceReportsPage.vue` from Story 2.8 uses `shallowRef` for chart instances. Follow this same pattern for consistency.

---

### 3. Lending Store Integration Dependency

**Concern:** Story 2.5 implemented the lending module as a separate module (`src/modules/lending/`). The Active Loans widget needs access to this data, but cross-module store dependencies can create coupling issues.

**Impact:**

- If lending module is disabled, widget should gracefully handle missing data
- Tight coupling between finance dashboard and lending store
- Potential circular dependencies

**Recommended Solution: Event-Based Decoupling with Graceful Degradation**

Create a lending store interface in `finance-store.js` that:

- Checks if lending store is available (module enabled)
- Returns empty/default data if lending disabled
- Uses optional chaining to avoid errors

```javascript
// In finance-store.js or useDashboardData composable
getActiveLoansSummary() {
  // Try to get from lending store if available
  try {
    const lendingStore = useLendingStore();
    if (lendingStore && lendingStore.portfolioSummary) {
      return lendingStore.getPortfolioSummary();
    }
  } catch (e) {
    // Lending module not available
  }

  // Return empty state if lending not available
  return {
    totalOutstanding: 0,
    activeCount: 0,
    overdueCount: 0,
    nextPaymentDue: null,
    topLoans: [],
    moduleEnabled: false,
  };
}
```

**UI Handling:** Show widget with "Lending module not enabled" message or hide entirely based on preference.

---

### 4. Real-Time Update Performance

**Concern:** AC9 requires "all widgets update automatically" within 2 seconds. Pinia reactivity alone may not be sufficient for complex aggregations.

**Impact:**

- Recalculating all dashboard data on every transaction change is expensive
- Could cause UI jank during heavy data entry
- Battery drain on mobile devices

**Recommended Solution: Debounced Smart Updates**

Use 500ms debounced refresh for aggregation widgets. Recent Transactions can update immediately via Pinia reactivity.

```javascript
// In FinanceDashboardPage.vue or useDashboardData composable
import { debounce } from 'quasar';
import { watch } from 'vue';

const financeStore = useFinanceStore();

// Debounced refresh for expensive aggregations
const debouncedRefresh = debounce(async () => {
  await financeStore.fetchDashboardData({ forceRefresh: true });
  showUpdateIndicator();
}, 500);

// Subscribe to store changes
watch(
  () => financeStore.transactions,
  () => {
    debouncedRefresh();
  },
  { deep: true },
);

// Immediate reactivity for Recent Transactions widget
const recentTransactions = computed(() => financeStore.transactions.slice(0, 10));
```

**Optimization:** Only widgets showing aggregated data (Financial Summary, Top Expenses, Trend) need recalculation. Recent Transactions and Funding Sources can use direct store reactivity.

---

### 5. PDF Export Layout Complexity

**Concern:** Exporting a full dashboard with 7 widgets and multiple charts to PDF is technically complex.

**Impact:**

- Charts need to be rendered as images for PDF inclusion
- Layout may not fit well on printed pages
- File size could be large with multiple chart images

**Recommended Solution: Simplified PDF Layout**

Create a dedicated "print view" layout that:

- Shows data in tables instead of charts where possible
- Uses a single-column layout optimized for A4/Letter
- Generates charts as data URIs using Chart.js `toBase64Image()` (optional)

```javascript
// In ReportExportService.js - extend existing service
export function exportDashboardToPDF(dashboardData, villageName, userName) {
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.text('Financial Dashboard Summary', 14, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.text(`Village: ${villageName}`, 14, yPos);
  yPos += 6;
  doc.text(`Generated: ${new Date().toLocaleDateString()} by ${userName}`, 14, yPos);
  yPos += 15;

  // Summary Cards as Table
  doc.setFontSize(14);
  doc.text('Financial Summary', 14, yPos);
  yPos += 8;

  const summaryRows = [
    ['Metric', 'Current Period', 'Previous Period', 'Change'],
    ['Total Income', formatCurrency(dashboardData.summary.totalIncome) /* ... */],
    ['Total Expenses', formatCurrency(dashboardData.summary.totalExpenses) /* ... */],
    ['Net Position', formatCurrency(dashboardData.summary.netPosition) /* ... */],
  ];

  doc.autoTable({
    startY: yPos,
    head: [summaryRows[0]],
    body: summaryRows.slice(1),
  });

  // Continue with other widgets as tables...
  // Recent Transactions, Funding Sources, Loans, Inventory Alerts

  // Note: Charts are omitted in favor of data tables for reliability
  // Add a footer note: "Charts available in web view"

  doc.save('financial-dashboard-summary.pdf');
}
```

**Fallback:** If chart-to-image proves complex, export data tables only with "Charts available in web view" note. This is acceptable for MVP.

---

## Dev Notes

### Implementation Decisions Summary

| Concern             | Decision                     | Implementation                                           |
| ------------------- | ---------------------------- | -------------------------------------------------------- |
| Data Fetching       | Unified fetch with caching   | `fetchDashboardData` action in finance store             |
| Chart Rendering     | Client-only with placeholder | `ClientOnly` wrapper + skeleton placeholders             |
| Lending Integration | Graceful degradation         | Check if lending store exists, return empty state if not |
| Real-time Updates   | Debounced refresh            | 500ms debounce on store change subscriptions             |
| PDF Export          | Simplified layout            | Tables prioritized over charts for print                 |

### Reuse from Story 2.8

The following Story 2.8 components should be reused:

- `src/services/ReportService.js` - Use aggregation functions for summary calculations
- `src/services/ReportExportService.js` - Extend with `exportDashboardToPDF` method
- `src/utils/report-scope.js` - Use for module-based access control
- `FinanceReportsPage.vue` patterns - Copy responsive grid and chart patterns

### Project Structure

Files to create:

```
src/modules/finance/
├── pages/
│   └── FinanceDashboardPage.vue          # Main dashboard page
├── components/
│   ├── FinancialSummaryWidget.vue        # AC2: Summary cards
│   ├── RecentTransactionsWidget.vue    # AC3: Recent transactions
│   ├── FundingSourcesWidget.vue          # AC4: Funding source bars
│   ├── ActiveLoansWidget.vue             # AC5: Loan portfolio
│   ├── LowStockAlertsWidget.vue          # AC6: Inventory alerts
│   ├── TopExpenseCategoriesWidget.vue    # AC7: Expense pie chart
│   ├── IncomeExpenseTrendWidget.vue      # AC8: Trend line chart
│   └── DashboardExportButton.vue         # AC10: PDF export trigger
└── composables/
    └── useDashboardData.js               # Unified data fetching composable

src/components/
└── ClientOnly.vue                        # SSR-safe client-only wrapper
```

Files to modify:

```
src/modules/finance/
├── router.js                             # Add /finance/dashboard route
└── stores/finance-store.js               # Add fetchDashboardData action

src/layouts/
└── MainLayout.vue                        # Ensure Finance nav highlights for dashboard
```

### Store Integration

```javascript
// src/modules/finance/composables/useDashboardData.js
import { computed, watch } from 'vue';
import { debounce } from 'quasar';
import { useFinanceStore } from '../stores/finance-store';
import { useInventoryStore } from 'src/stores/inventory-store';

export function useDashboardData() {
  const financeStore = useFinanceStore();
  const inventoryStore = useInventoryStore();

  // Gracefully handle optional lending store
  let lendingStore = null;
  try {
    const { useLendingStore } = await import('src/modules/lending/stores/lending-store');
    lendingStore = useLendingStore();
  } catch {
    // Lending module not enabled
  }

  const dashboardData = computed(() => ({
    summary: financeStore.dashboardData?.summary || defaultSummary,
    recentTransactions: financeStore.transactions.slice(0, 10),
    fundingSources: financeStore.fundingSources,
    inventoryAlerts: inventoryStore.itemsNeedingAttention?.slice(0, 5) || [],
    loansSummary: lendingStore?.portfolioSummary || defaultLoanSummary,
  }));

  // Debounced refresh for expensive aggregations
  const debouncedRefresh = debounce(async () => {
    await financeStore.fetchDashboardData({ forceRefresh: true });
  }, 500);

  // Subscribe to store changes for real-time updates
  watch(() => financeStore.transactions, () => {
    debouncedRefresh();
  }, { deep: true });

  const refresh = async () => {
    await Promise.all([
      financeStore.fetchDashboardData({ forceRefresh: true }),
      inventoryStore.fetchItemsNeedingAttention?.(),
      lendingStore?.fetchPortfolioSummary?.(),
    ]);
  };

  return { dashboardData, refresh, debouncedRefresh };
}
```

### RBAC Implementation

```javascript
// In FinanceDashboardPage.vue
import { useAuthStore } from 'src/stores/auth-store';
import { getAllowedModules } from 'src/utils/report-scope';

const authStore = useAuthStore();
const allowedModules = computed(() => getAllowedModules(authStore.user?.roles));

// Read-only check
const isReadOnly = computed(() => {
  return authStore.user?.roles?.some((r) => r.name === 'Village Head') || false;
});

// Filter data by module scope
const scopedTransactions = computed(() => {
  return filterByModuleScope(financeStore.transactions, authStore.user?.roles);
});
```

### References

- [Source: docs/epics.md#Story-2.9] - Original epic acceptance criteria
- [Source: docs/stories/story-2.8.md] - ReportService.js patterns to reuse
- [Source: src/services/ReportService.js] - Pure aggregation functions
- [Source: src/utils/report-scope.js] - Role-to-module mapping
- [Source: src/stores/inventory-store.js] - Low stock items getter
- [Source: src/modules/finance/stores/finance-store.js] - Finance data structure

---

## Testing Checklist

### Manual Testing Scenarios

1. **Dashboard Page Access**
   - [ ] Login as Finance Manager → verify dashboard loads, all widgets visible
   - [ ] Login as Village Head → verify read-only mode (no action buttons)
   - [ ] Login as Farm Manager → verify only Farm module data shown
   - [ ] Login as Resident → verify no access to dashboard

2. **Widget Data Accuracy**
   - [ ] Verify Financial Summary totals match actual transactions
   - [ ] Verify Recent Transactions shows last 10 in correct order
   - [ ] Verify Funding Sources balances match detail page
   - [ ] Verify Active Loans data matches lending module
   - [ ] Verify Low Stock alerts match inventory store

3. **Real-Time Updates**
   - [ ] Add new transaction → verify Recent Transactions updates within 2 seconds
   - [ ] Edit transaction → verify summary recalculates
   - [ ] Record loan payment → verify Active Loans updates
   - [ ] Adjust inventory → verify Low Stock alerts update

4. **Navigation**
   - [ ] Click Financial Summary card → verify navigates to transactions with filter
   - [ ] Click Recent Transaction → verify opens edit modal
   - [ ] Click Funding Source → verify navigates to detail page
   - [ ] Click View All Loans → verify navigates to lending module
   - [ ] Click Inventory item → verify navigates to inventory detail

5. **Charts and Visualizations**
   - [ ] Verify Top Expenses pie chart renders correctly
   - [ ] Verify Income vs Expenses line chart has correct data
   - [ ] Test period selectors update chart data
   - [ ] Verify no hydration errors in browser console

6. **PDF Export**
   - [ ] Click Export Summary → verify PDF downloads
   - [ ] Verify PDF contains all widget data
   - [ ] Verify PDF has correct village name and date

7. **Mobile Responsiveness**
   - [ ] Test on 320px width → verify single column, readable text
   - [ ] Test on 768px width → verify 2-column layout
   - [ ] Test on 1920px width → verify 3-column layout
   - [ ] Verify all buttons are touch-friendly (44px+)

8. **Performance**
   - [ ] Dashboard loads within 2 seconds with 1 year of data
   - [ ] Widget updates complete within 2 seconds of data change
   - [ ] No UI jank during data entry

---

## Estimated Effort

- **Story Points:** 8
- **Estimated Hours:** 10-14 hours
- **Complexity:** Medium-High
- **Primary Skills:** Vue/Quasar frontend, Pinia state management, Chart.js integration, PDF export

---

## Definition of Done

- [ ] All acceptance criteria (AC1-AC12) implemented and tested
- [ ] All 7 dashboard widgets functional and displaying correct data
- [ ] Real-time updates working within 2-second target
- [ ] PDF export generates complete dashboard summary
- [ ] RBAC properly restricts data by user role and module scope
- [ ] Mobile-responsive layout verified on all breakpoints
- [ ] No console errors, ESLint warnings, or hydration issues
- [ ] Manual testing checklist completed
- [ ] Cross-module dependencies (inventory, lending) gracefully handled

---

## Related Documents

- [Epics Document](../epics.md) - Story 2.9 specification source
- [Architecture Document](../architecture.md) - Technical patterns and conventions
- [Story 2.1](./story-2.1.md) - Income transaction recording
- [Story 2.2](./story-2.2.md) - Expense transaction recording
- [Story 2.4](./story-2.4.md) - Funding source tracking
- [Story 2.5](./story-2.5.md) - Village lending
- [Story 2.6](./story-2.6.md) - Core inventory management
- [Story 2.8](./story-2.8.md) - Financial reports (ReportService.js source)

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
