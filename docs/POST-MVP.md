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
