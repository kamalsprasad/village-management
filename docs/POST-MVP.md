# Post-MVP Improvements & Upgrades

This document tracks deferred improvements, upgrades, and refactoring items that are not required for MVP but should be considered for future development.

---

## Charting

### Migrate from direct Chart.js to vue-chartjs

- **Current state**: Charts use Chart.js directly with canvas refs and manual lifecycle management (`onMounted`/`onUnmounted` for create/destroy)
- **Improvement**: Migrate to [vue-chartjs](https://vue-chartjs.org/) for cleaner Vue 3 integration, reactive props, and automatic cleanup
- **Benefits**: Less boilerplate, reactive chart updates, built-in SSR handling, better DX
- **Effort**: Low-Medium
- **Added**: Story 2.8

---

## Reporting

### Refactor DonorReportService to use shared ReportExportService

- **Current state**: `DonorReportService.js` has its own PDF generation logic independent of the shared `ReportExportService.js`
- **Improvement**: Refactor to use shared PDF utilities from `ReportExportService` for consistency
- **Benefits**: Single source of truth for PDF formatting, consistent headers/footers/styling across all reports
- **Risk**: Must not break existing Funding Source detail page PDF generation
- **Effort**: Low
- **Added**: Story 2.8

---

## Seeding

### Server-Side Data Seeding via Cloud Function

- **Current state**: Sample data generation (including 1.5 years of financial history) runs client-side, making numerous API calls which can be slow and subject to network interruptions.
- **Improvement**: Move the entire sample data generation logic into an Appwrite Cloud Function written in Node.js. The "Load Sample Data" button would just trigger this function execution.
- **Benefits**: Significantly faster execution (runs directly on server), no client-side rate limits, resilient to network drops, cleaner client codebase.
- **Effort**: Medium
- **Added**: Story 2.8

---

## Farm Module

### Per-Worker Labor Cost Tracking

- **Current state**: Planting and harvest labor costs are tracked as aggregate totals (`planting_labor_farmhands` count + `planting_labor_cost` total)
- **Improvement**: Track individual worker contributions with resident linkage for detailed labor accountability and potential payroll integration
- **Schema change**: Replace aggregate fields with `labor_entries[]` array containing `{worker_id, hours_worked, hourly_rate, total_cost, task_description}`
- **Benefits**: Worker accountability, detailed cost breakdown, payroll system integration, labor efficiency analysis per worker
- **Effort**: Medium (requires schema migration and UI updates)
- **Added**: Story 3.3 (deferred from MVP requirements)

---
