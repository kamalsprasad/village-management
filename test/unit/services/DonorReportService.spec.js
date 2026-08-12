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
});
