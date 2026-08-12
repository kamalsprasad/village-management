/**
 * Reusable mock jsPDF document for testing PDF generation services.
 *
 * Provides all methods used by DonorReportService (and any future
 * PDF-generating code) as vi.fn() spies so tests can assert on call
 * structure without producing real PDF output.
 *
 * Usage:
 *   const doc = createMockJsPDFDoc();
 *   svc.jsPDF = vi.fn(() => doc);
 *   // ... call service method ...
 *   expect(doc.save).toHaveBeenCalledWith('expected-filename.pdf');
 */

import { vi } from 'vitest';

/**
 * Create a mock jsPDF document.
 * @param {Object} opts - Page dimensions
 * @param {number} opts.pageWidth - Default 210 (A4 portrait mm)
 * @param {number} opts.pageHeight - Default 297 (A4 portrait mm)
 * @param {number} opts.initialFinalY - finalY after first autoTable call (default 80)
 * @returns {Object} Mock doc with spy methods
 */
export function createMockJsPDFDoc(opts = {}) {
  const pageWidth = opts.pageWidth ?? 210;
  const pageHeight = opts.pageHeight ?? 297;
  const initialFinalY = opts.initialFinalY ?? 80;

  const doc = {
    // --- internal.pageSize ---
    internal: {
      pageSize: {
        getWidth: vi.fn(() => pageWidth),
        getHeight: vi.fn(() => pageHeight),
      },
      getNumberOfPages: vi.fn(() => 1),
    },

    // --- font methods ---
    setFontSize: vi.fn(function () {
      return this;
    }),
    setFont: vi.fn(function () {
      return this;
    }),

    // --- text methods ---
    text: vi.fn(function () {
      return this;
    }),
    splitTextToSize: vi.fn((text) => {
      // Return text as a single-line array (no wrapping needed in tests)
      if (Array.isArray(text)) return text;
      return [String(text)];
    }),

    // --- page methods ---
    addPage: vi.fn(function () {
      return this;
    }),
    setPage: vi.fn(function () {
      return this;
    }),

    // --- output ---
    save: vi.fn(),

    // --- autoTable result placeholder ---
    // Set by the mock autoTable function after applyAutoTable is called.
    lastAutoTable: { finalY: initialFinalY },

    // --- autoTable function on doc (alternative to svc.autoTable) ---
    // Left undefined so applyAutoTable falls through to svc.autoTable.
    // autoTable: undefined,
  };

  return doc;
}

/**
 * Create a mock autoTable function that sets doc.lastAutoTable.finalY.
 * Use this to replace svc.autoTable after loadDependencies().
 *
 * @param {number} finalY - The finalY value to set after table render
 * @returns {vi.fn} Mock autoTable function
 */
export function createMockAutoTable(finalY = 80) {
  return vi.fn((doc, options) => {
    doc.lastAutoTable = { finalY };
    return doc;
  });
}

/**
 * Create a mock jsPDF constructor that returns mock docs.
 * Each call returns a fresh doc so multiple reports don't share state.
 *
 * IMPORTANT: Uses a regular function (not arrow) so it can be invoked
 * with `new` — jsPDF is always called as `new this.jsPDF(...)`.
 *
 * @param {Object} docOpts - Options passed to createMockJsPDFDoc
 * @returns {vi.fn} Constructor function
 */
export function createMockJsPDFConstructor(docOpts = {}) {
  return vi.fn(function () {
    return createMockJsPDFDoc(docOpts);
  });
}
