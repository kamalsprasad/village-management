import { describe, it, expect, vi, beforeEach } from 'vitest';

// Top-level mocks with valid exports. No references to outer variables,
// so vi.mock hoisting is safe and produces no warnings.
vi.mock('jspdf', () => ({
  jsPDF: class FakeJsPDF {},
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

import { DonorReportService } from 'src/services/DonorReportService';
import {
  createMockJsPDFDoc,
  createMockAutoTable,
  createMockJsPDFConstructor,
} from 'test/helpers/mock-jspdf';

describe('DonorReportService', () => {
  let svc;
  beforeEach(() => {
    svc = new DonorReportService();
  });

  describe('formatCurrency', () => {
    it('formats a number with the amount present', () => {
      expect(svc.formatCurrency(1500)).toContain('1,500.00');
    });
    it('treats null/undefined as 0', () => {
      expect(svc.formatCurrency(null)).toMatch(/0/);
      expect(svc.formatCurrency(undefined)).toMatch(/0/);
    });
  });

  describe('formatDate', () => {
    it('returns N/A for falsy input', () => {
      expect(svc.formatDate(null)).toBe('N/A');
      expect(svc.formatDate('')).toBe('N/A');
    });
    it('formats an ISO date', () => {
      expect(svc.formatDate('2025-01-15T12:00:00.000Z')).toMatch(/2025/);
    });
  });

  describe('filterTransactionsByDateRange', () => {
    const txns = [
      { date: '2025-01-10T12:00:00Z' },
      { date: '2025-02-15T12:00:00Z' },
      { date: '2025-03-20T12:00:00Z' },
    ];
    it('returns all when no range provided', () => {
      expect(svc.filterTransactionsByDateRange(txns)).toHaveLength(3);
    });
    it('filters from date', () => {
      const out = svc.filterTransactionsByDateRange(txns, { dateFrom: '2025-02-01' });
      expect(out).toHaveLength(2);
    });
    it('filters to date', () => {
      const out = svc.filterTransactionsByDateRange(txns, { dateTo: '2025-02-28' });
      expect(out).toHaveLength(2);
    });
    it('filters both bounds', () => {
      const out = svc.filterTransactionsByDateRange(txns, {
        dateFrom: '2025-02-01',
        dateTo: '2025-02-28',
      });
      expect(out).toHaveLength(1);
    });
    it('defaults to empty array', () => {
      expect(svc.filterTransactionsByDateRange()).toEqual([]);
    });
  });

  describe('buildDateRangeLabel', () => {
    it('returns "All transactions" when no range', () => {
      expect(svc.buildDateRangeLabel()).toBe('All transactions');
    });
    it('returns range label when both provided', () => {
      const label = svc.buildDateRangeLabel({ dateFrom: '2025-01-01', dateTo: '2025-02-01' });
      expect(label).toContain(' - ');
    });
    it('returns "From" label when only dateFrom', () => {
      expect(svc.buildDateRangeLabel({ dateFrom: '2025-01-01' })).toMatch(/^From /);
    });
    it('returns "Up to" label when only dateTo', () => {
      expect(svc.buildDateRangeLabel({ dateTo: '2025-02-01' })).toMatch(/^Up to /);
    });
  });

  describe('applyAutoTable', () => {
    it('uses doc.autoTable when available', () => {
      const doc = { autoTable: vi.fn() };
      svc.applyAutoTable(doc, { head: [['a']] });
      expect(doc.autoTable).toHaveBeenCalledWith({ head: [['a']] });
    });

    it('falls back to this.autoTable when doc.autoTable missing', () => {
      const doc = {};
      svc.autoTable = vi.fn();
      svc.applyAutoTable(doc, { head: [['a']] });
      expect(svc.autoTable).toHaveBeenCalledWith(doc, { head: [['a']] });
    });

    it('throws when neither is available', () => {
      const doc = {};
      svc.autoTable = null;
      expect(() => svc.applyAutoTable(doc, {})).toThrow(/AutoTable is not available/);
    });
  });

  describe('loadDependencies', () => {
    it('loads and caches jsPDF on first call', async () => {
      expect(svc.jsPDF).toBeNull();
      await svc.loadDependencies();
      expect(svc.jsPDF).toBeDefined();
      expect(typeof svc.autoTable).toBe('function');
    });

    it('returns cached jsPDF on second call without re-importing', async () => {
      await svc.loadDependencies();
      const firstJsPDF = svc.jsPDF;
      await svc.loadDependencies();
      expect(svc.jsPDF).toBe(firstJsPDF);
    });

    it('throws when jspdf-autotable export shape is invalid', async () => {
      vi.resetModules();
      // Override the top-level mock with an invalid export (no default,
      // no autoTable). The factory returns an object — it does NOT throw.
      vi.doMock('jspdf-autotable', () => ({}));
      const { DonorReportService: FreshService } = await import('src/services/DonorReportService');
      const fresh = new FreshService();
      await expect(fresh.loadDependencies()).rejects.toThrow(/PDF generation requires/);
    });
  });

  // ================================================================
  // PDF generation tests
  // ================================================================

  // Helper: set up svc with mock jsPDF and autoTable so generate methods
  // can run without real PDF libraries. loadDependencies() becomes a
  // no-op because this.jsPDF is already non-null.
  function setupMockPdf(docOpts = {}) {
    const doc = createMockJsPDFDoc(docOpts);
    const finalY = docOpts.initialFinalY ?? 80;
    const mockAutoTable = createMockAutoTable(finalY);
    // Construct a constructor function (must be `function`, not arrow,
    // so `new this.jsPDF(...)` works)
    svc.jsPDF = vi.fn(function () {
      return doc;
    });
    svc.autoTable = mockAutoTable;
    return { doc, mockAutoTable };
  }

  describe('generateFundingSourceReport', () => {
    const fundingSource = {
      name: 'Test Donor',
      type: 'grant',
      status: 'active',
      date_received: '2025-01-15T12:00:00Z',
      restrictions: 'Education only',
      total_received: 10000,
      current_balance: 6000,
    };

    const transactions = [
      {
        date: '2025-02-01T12:00:00Z',
        type: 'income',
        description: 'Initial deposit',
        amount_funded: 10000,
        status: 'completed',
      },
      {
        date: '2025-03-01T12:00:00Z',
        type: 'expense',
        description: 'School supplies',
        amount_funded: 4000,
        status: 'completed',
      },
      {
        date: '2025-04-01T12:00:00Z',
        type: 'expense',
        description: 'Cancelled order',
        amount_funded: 500,
        status: 'cancelled',
      },
    ];

    it('generates a report with transactions and downloads PDF', async () => {
      const { doc } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      expect(doc.save).toHaveBeenCalledTimes(1);
      expect(doc.save.mock.calls[0][0]).toMatch(/^Donor_Report_Test_Donor_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('creates jsPDF in portrait A4 format', async () => {
      const { doc } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      expect(svc.jsPDF).toHaveBeenCalledWith({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
    });

    it('writes header text with "Donor Report" title', async () => {
      const { doc } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      const textCalls = doc.text.mock.calls.map((c) => c[0]);
      expect(textCalls).toContain('Donor Report');
    });

    it('writes funding source details section', async () => {
      const { doc } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      const textCalls = doc.text.mock.calls.map((c) => c[0]);
      expect(textCalls).toContain('Funding Source Details');
      expect(textCalls).toContain('Name:');
      expect(textCalls).toContain('Type:');
      expect(textCalls).toContain('Status:');
    });

    it('writes financial summary section', async () => {
      const { doc } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      const textCalls = doc.text.mock.calls.map((c) => c[0]);
      expect(textCalls).toContain('Financial Summary');
    });

    it('calls applyAutoTable for summary table with correct head', async () => {
      const { doc, mockAutoTable } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      // First autoTable call is the summary table
      const summaryOptions = mockAutoTable.mock.calls[0][1];
      expect(summaryOptions.head).toEqual([['Metric', 'Amount']]);
      const bodyRows = summaryOptions.body;
      // Should include Total Received, Current Balance, etc.
      expect(bodyRows.some((r) => r[0] === 'Total Received')).toBe(true);
      expect(bodyRows.some((r) => r[0] === 'Current Balance')).toBe(true);
      expect(bodyRows.some((r) => r[0] === 'Transaction Count')).toBe(true);
    });

    it('includes transaction count in summary', async () => {
      const { doc, mockAutoTable } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      const summaryOptions = mockAutoTable.mock.calls[0][1];
      const countRow = summaryOptions.body.find((r) => r[0] === 'Transaction Count');
      // 3 transactions total (before filtering cancelled in transaction table)
      expect(countRow[1]).toBe('3');
    });

    it('calls applyAutoTable for transaction history when transactions exist', async () => {
      const { doc, mockAutoTable } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      // Second autoTable call is the transaction history table
      expect(mockAutoTable.mock.calls.length).toBeGreaterThanOrEqual(2);
      const txOptions = mockAutoTable.mock.calls[1][1];
      expect(txOptions.head).toEqual([['Date', 'Type', 'Description', 'Amount', 'Status']]);
    });

    it('excludes cancelled transactions from history table', async () => {
      const { doc, mockAutoTable } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      const txOptions = mockAutoTable.mock.calls[1][1];
      // 3 transactions, 1 cancelled → 2 rows in table
      expect(txOptions.body).toHaveLength(2);
      // None should have 'Cancelled' status
      expect(txOptions.body.every((r) => r[4] !== 'Cancelled')).toBe(true);
    });

    it('sorts transactions by date descending', async () => {
      const { doc, mockAutoTable } = setupMockPdf();
      const unsorted = [
        {
          date: '2025-01-01T00:00:00Z',
          type: 'income',
          description: 'first',
          amount_funded: 100,
          status: 'completed',
        },
        {
          date: '2025-03-01T00:00:00Z',
          type: 'expense',
          description: 'last',
          amount_funded: 200,
          status: 'completed',
        },
        {
          date: '2025-02-01T00:00:00Z',
          type: 'income',
          description: 'middle',
          amount_funded: 300,
          status: 'completed',
        },
      ];
      await svc.generateFundingSourceReport(fundingSource, unsorted);
      const txOptions = mockAutoTable.mock.calls[1][1];
      // Should be sorted: March, February, January
      expect(txOptions.body[0][2]).toBe('last');
      expect(txOptions.body[1][2]).toBe('middle');
      expect(txOptions.body[2][2]).toBe('first');
    });

    it('skips transaction history table when no transactions', async () => {
      const { doc, mockAutoTable } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, []);
      // Only the summary table should be called
      expect(mockAutoTable).toHaveBeenCalledTimes(1);
    });

    it('adds page break when content overflows', async () => {
      // Set initialFinalY high so yPos > 200 triggers addPage
      const { doc } = setupMockPdf({ initialFinalY: 220 });
      await svc.generateFundingSourceReport(fundingSource, transactions);
      expect(doc.addPage).toHaveBeenCalled();
    });

    it('does not add page break when content fits', async () => {
      const { doc } = setupMockPdf({ initialFinalY: 80 });
      await svc.generateFundingSourceReport(fundingSource, transactions);
      expect(doc.addPage).not.toHaveBeenCalled();
    });

    it('writes footer with generation timestamp', async () => {
      const { doc } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions);
      const textCalls = doc.text.mock.calls.map((c) => c[0]);
      expect(
        textCalls.some((t) => typeof t === 'string' && t.startsWith('Report generated on')),
      ).toBe(true);
    });

    it('includes generatedAt date when provided in options', async () => {
      const { doc } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions, {
        generatedAt: '2025-06-01T12:00:00Z',
      });
      const textCalls = doc.text.mock.calls.map((c) => c[0]);
      expect(textCalls.some((t) => typeof t === 'string' && t.includes('Generated:'))).toBe(true);
    });

    it('filters transactions by date range', async () => {
      const { doc, mockAutoTable } = setupMockPdf();
      await svc.generateFundingSourceReport(fundingSource, transactions, {
        dateFrom: '2025-02-15',
        dateTo: '2025-03-15',
      });
      // Summary table should show filtered count (1 transaction in range)
      const summaryOptions = mockAutoTable.mock.calls[0][1];
      const countRow = summaryOptions.body.find((r) => r[0] === 'Transaction Count');
      expect(countRow[1]).toBe('1');
    });

    it('sanitizes funding source name in filename', async () => {
      const { doc } = setupMockPdf();
      const sourceWithSpecialChars = { ...fundingSource, name: 'Donor / Test: Report!' };
      await svc.generateFundingSourceReport(sourceWithSpecialChars, transactions);
      const filename = doc.save.mock.calls[0][0];
      // Special characters should be replaced with underscores
      expect(filename).not.toMatch(/[/:!]/);
      expect(filename).toMatch(/^Donor_Report_/);
    });

    it('handles funding source with missing optional fields', async () => {
      const { doc } = setupMockPdf();
      const minimalSource = { name: 'Minimal' };
      await svc.generateFundingSourceReport(minimalSource, []);
      expect(doc.save).toHaveBeenCalledTimes(1);
      // Should not throw — defaults to N/A for missing fields
    });

    it('throws when autoTable is not available', async () => {
      // Set jsPDF to a constructor but autoTable to null so
      // applyAutoTable throws. loadDependencies is skipped because
      // this.jsPDF is already non-null.
      const doc = createMockJsPDFDoc();
      svc.jsPDF = vi.fn(function () {
        return doc;
      });
      svc.autoTable = null;
      delete doc.autoTable;
      await expect(svc.generateFundingSourceReport(fundingSource, transactions)).rejects.toThrow(
        /AutoTable is not available/,
      );
    });

    it('calculates utilization rate correctly', async () => {
      const { doc, mockAutoTable } = setupMockPdf();
      // total_received=10000, current_balance=6000 → utilized=4000 → 40%
      await svc.generateFundingSourceReport(fundingSource, transactions);
      const summaryOptions = mockAutoTable.mock.calls[0][1];
      const utilRow = summaryOptions.body.find((r) => r[0] === 'Utilization Rate');
      expect(utilRow[1]).toBe('40.0%');
    });

    it('handles zero total_received without division error', async () => {
      const { doc, mockAutoTable } = setupMockPdf();
      const zeroSource = { ...fundingSource, total_received: 0, current_balance: 0 };
      await svc.generateFundingSourceReport(zeroSource, []);
      const summaryOptions = mockAutoTable.mock.calls[0][1];
      const utilRow = summaryOptions.body.find((r) => r[0] === 'Utilization Rate');
      expect(utilRow[1]).toBe('0%');
    });
  });

  describe('generateReport (alias)', () => {
    it('delegates to generateFundingSourceReport', async () => {
      const { doc } = setupMockPdf();
      const spy = vi.spyOn(svc, 'generateFundingSourceReport');
      await svc.generateReport({ name: 'Test' }, [], {});
      expect(spy).toHaveBeenCalledWith({ name: 'Test' }, [], {});
    });
  });

  describe('generateAllSourcesReport', () => {
    const sources = [
      {
        name: 'Donor A',
        type: 'grant',
        status: 'active',
        total_received: 5000,
        current_balance: 3000,
        restrictions: 'Education',
      },
      {
        name: 'Donor B',
        type: 'donation',
        status: 'inactive',
        total_received: 2000,
        current_balance: 0,
        restrictions: null,
      },
    ];

    it('generates a summary report and downloads PDF', async () => {
      const { doc } = setupMockPdf({ pageWidth: 297, pageHeight: 210 });
      await svc.generateAllSourcesReport(sources);
      expect(doc.save).toHaveBeenCalledTimes(1);
      expect(doc.save.mock.calls[0][0]).toMatch(/^Funding_Sources_Summary_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('creates jsPDF in landscape A4 format', async () => {
      const { doc } = setupMockPdf({ pageWidth: 297, pageHeight: 210 });
      await svc.generateAllSourcesReport(sources);
      expect(svc.jsPDF).toHaveBeenCalledWith({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
    });

    it('writes header with "Funding Sources Summary Report" title', async () => {
      const { doc } = setupMockPdf({ pageWidth: 297, pageHeight: 210 });
      await svc.generateAllSourcesReport(sources);
      const textCalls = doc.text.mock.calls.map((c) => c[0]);
      expect(textCalls).toContain('Funding Sources Summary Report');
    });

    it('writes summary stats with source count and totals', async () => {
      const { doc } = setupMockPdf({ pageWidth: 297, pageHeight: 210 });
      await svc.generateAllSourcesReport(sources);
      const textCalls = doc.text.mock.calls.map((c) => c[0]);
      // "Total Sources: 2 (1 active)"
      expect(textCalls.some((t) => typeof t === 'string' && t.includes('Total Sources: 2'))).toBe(
        true,
      );
      expect(textCalls.some((t) => typeof t === 'string' && t.includes('1 active'))).toBe(true);
    });

    it('calls applyAutoTable with correct head columns', async () => {
      const { doc, mockAutoTable } = setupMockPdf({ pageWidth: 297, pageHeight: 210 });
      await svc.generateAllSourcesReport(sources);
      expect(mockAutoTable).toHaveBeenCalledTimes(1);
      const options = mockAutoTable.mock.calls[0][1];
      expect(options.head).toEqual([
        ['Name', 'Type', 'Status', 'Total Received', 'Balance', 'Utilized', 'Restricted'],
      ]);
    });

    it('maps source rows correctly with capitalized type and status', async () => {
      const { doc, mockAutoTable } = setupMockPdf({ pageWidth: 297, pageHeight: 210 });
      await svc.generateAllSourcesReport(sources);
      const body = mockAutoTable.mock.calls[0][1].body;
      expect(body[0][0]).toBe('Donor A');
      expect(body[0][1]).toBe('Grant'); // capitalized
      expect(body[0][2]).toBe('Active'); // capitalized
      expect(body[0][6]).toBe('Yes'); // has restrictions
      expect(body[1][6]).toBe('No'); // no restrictions
    });

    it('calculates utilization percentage per source', async () => {
      const { doc, mockAutoTable } = setupMockPdf({ pageWidth: 297, pageHeight: 210 });
      await svc.generateAllSourcesReport(sources);
      const body = mockAutoTable.mock.calls[0][1].body;
      // Donor A: (5000-3000)/5000 = 40%
      expect(body[0][5]).toBe('40.0%');
      // Donor B: (2000-0)/2000 = 100%
      expect(body[1][5]).toBe('100.0%');
    });

    it('handles empty sources array', async () => {
      const { doc, mockAutoTable } = setupMockPdf({ pageWidth: 297, pageHeight: 210 });
      await svc.generateAllSourcesReport([]);
      expect(doc.save).toHaveBeenCalledTimes(1);
      const body = mockAutoTable.mock.calls[0][1].body;
      expect(body).toHaveLength(0);
    });

    it('handles source with zero total_received', async () => {
      const { doc, mockAutoTable } = setupMockPdf({ pageWidth: 297, pageHeight: 210 });
      const zeroSource = {
        name: 'Zero',
        type: 'grant',
        status: 'active',
        total_received: 0,
        current_balance: 0,
        restrictions: null,
      };
      await svc.generateAllSourcesReport([zeroSource]);
      const body = mockAutoTable.mock.calls[0][1].body;
      // Utilization should be 0%, not NaN
      expect(body[0][5]).toBe('0%');
    });

    it('throws when autoTable is not available', async () => {
      const doc = createMockJsPDFDoc({ pageWidth: 297, pageHeight: 210 });
      svc.jsPDF = vi.fn(function () {
        return doc;
      });
      svc.autoTable = null;
      delete doc.autoTable;
      await expect(svc.generateAllSourcesReport(sources)).rejects.toThrow(
        /AutoTable is not available/,
      );
    });
  });
});
