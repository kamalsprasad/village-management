/**
 * Report Export Service
 *
 * Story 2.8: Shared export utilities for PDF, CSV, and print.
 * Uses lazy-loaded jsPDF (matching DonorReportService pattern)
 * and pure functions for CSV generation.
 */

// ============================================================
// CSV Export
// ============================================================

/**
 * Escape a value for CSV output.
 * Wraps in quotes if value contains commas, quotes, or newlines.
 * @param {*} value
 * @returns {string}
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Generate CSV string from an array of row objects.
 * @param {Array<Object>} rows - Array of flat objects with consistent keys
 * @param {string[]} [columns] - Optional column order; defaults to keys of first row
 * @returns {string} CSV content
 */
export function generateCSV(rows, columns) {
  if (!rows || rows.length === 0) return '';
  const headers = columns || Object.keys(rows[0]);
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map((row) => headers.map((h) => escapeCSV(row[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Trigger a CSV file download in the browser.
 * @param {string} csvContent - CSV string
 * @param {string} filename - Filename without extension
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export rows as a CSV file download.
 * @param {Array<Object>} rows
 * @param {string} filename
 * @param {string[]} [columns]
 */
export function exportToCSV(rows, filename, columns) {
  const csv = generateCSV(rows, columns);
  downloadCSV(csv, filename);
}

// ============================================================
// Print
// ============================================================

/**
 * Trigger browser print for the current page.
 * The reports page should include @media print CSS to hide nav/buttons.
 */
export function printReport() {
  window.print();
}

// ============================================================
// PDF Export (lazy-loaded jsPDF)
// ============================================================

let jsPDFClass = null;
let autoTableFn = null;

/**
 * Lazy load jsPDF and jspdf-autotable dependencies.
 * Follows the same pattern as DonorReportService.
 */
async function loadPDFDependencies() {
  if (!jsPDFClass) {
    try {
      const { jsPDF } = await import('jspdf');
      jsPDFClass = jsPDF;

      const autoTableModule = await import('jspdf-autotable');
      autoTableFn = autoTableModule.default || autoTableModule.autoTable;

      if (typeof autoTableFn !== 'function') {
        throw new Error('jspdf-autotable export could not be resolved');
      }
    } catch (error) {
      console.error('Failed to load jsPDF dependencies:', error);
      throw new Error(
        'PDF generation requires jspdf and jspdf-autotable. Please run: npm install jspdf jspdf-autotable',
      );
    }
  }
}

/**
 * Format currency for PDF display.
 * @param {number} amount
 * @returns {string}
 */
function pdfCurrency(amount) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Add a standard report header to a jsPDF document.
 * @param {Object} doc - jsPDF instance
 * @param {string} title - Report title
 * @param {Object} options - { dateFrom, dateTo, generatedAt, villageName }
 * @returns {number} Y position after header
 */
function addPDFHeader(doc, title, options = {}) {
  const { dateFrom, dateTo, generatedAt, villageName } = options;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  let y = 28;
  if (villageName) {
    doc.text(villageName, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }
  if (dateFrom || dateTo) {
    const period = `Period: ${dateFrom || 'Start'} to ${dateTo || 'Present'}`;
    doc.text(period, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }
  if (generatedAt) {
    doc.text(`Generated: ${generatedAt}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  y += 4;
  return y;
}

/**
 * Add a summary KPI section to a PDF.
 * @param {Object} doc - jsPDF instance
 * @param {Array<{label: string, value: string}>} kpis
 * @param {number} startY
 * @returns {number} Y position after KPIs
 */
function addPDFSummary(doc, kpis, startY) {
  let y = startY;
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Summary', 14, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  for (const kpi of kpis) {
    doc.text(`${kpi.label}: ${kpi.value}`, 14, y);
    y += 5;
  }
  y += 4;
  return y;
}

/**
 * Add an autoTable to a PDF.
 * @param {Object} doc - jsPDF instance
 * @param {string[]} columns - Column headers
 * @param {Array<Array>} rows - 2D array of cell values
 * @param {number} startY
 * @returns {number} Y position after table
 */
function addPDFTable(doc, columns, rows, startY) {
  autoTableFn(doc, {
    head: [columns],
    body: rows,
    startY,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
  });
  return doc.lastAutoTable.finalY + 8;
}

/**
 * Generate a PDF for any report type.
 * @param {Object} reportData - Output from a report generator function
 * @param {Object} options - { title, dateFrom, dateTo, villageName, categories, fundingSources }
 */
export async function exportToPDF(reportData, options = {}) {
  await loadPDFDependencies();

  const { title, dateFrom, dateTo, villageName } = options;
  const doc = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const generatedAt = new Date().toLocaleString();
  let y = addPDFHeader(doc, title || 'Financial Report', {
    dateFrom,
    dateTo,
    generatedAt,
    villageName,
  });

  const type = reportData.reportType;

  if (type === 'income-summary') {
    y = addPDFSummary(doc, [
      { label: 'Total Income', value: pdfCurrency(reportData.totalIncome) },
      { label: 'Transactions', value: String(reportData.transactionCount) },
    ], y);

    if (reportData.byCategory.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('By Category', 14, y);
      y += 2;
      y = addPDFTable(
        doc,
        ['Category', 'Total', 'Count'],
        reportData.byCategory.map((g) => [g.label, pdfCurrency(g.total), String(g.count)]),
        y,
      );
    }
  } else if (type === 'expense-summary') {
    y = addPDFSummary(doc, [
      { label: 'Total Expenses', value: pdfCurrency(reportData.totalExpenses) },
      { label: 'Transactions', value: String(reportData.transactionCount) },
    ], y);

    if (reportData.byCategory.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('By Category', 14, y);
      y += 2;
      y = addPDFTable(
        doc,
        ['Category', 'Total', 'Count'],
        reportData.byCategory.map((g) => [g.label, pdfCurrency(g.total), String(g.count)]),
        y,
      );
    }
  } else if (type === 'profit-loss') {
    y = addPDFSummary(doc, [
      { label: 'Total Income', value: pdfCurrency(reportData.totalIncome) },
      { label: 'Total Expenses', value: pdfCurrency(reportData.totalExpenses) },
      {
        label: reportData.isProfit ? 'Net Surplus' : 'Net Deficit',
        value: pdfCurrency(Math.abs(reportData.netResult)),
      },
    ], y);

    if (reportData.incomeByCategory.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Income by Category', 14, y);
      y += 2;
      y = addPDFTable(
        doc,
        ['Category', 'Total', 'Count'],
        reportData.incomeByCategory.map((g) => [g.label, pdfCurrency(g.total), String(g.count)]),
        y,
      );
    }
    if (reportData.expenseByCategory.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Expenses by Category', 14, y);
      y += 2;
      y = addPDFTable(
        doc,
        ['Category', 'Total', 'Count'],
        reportData.expenseByCategory.map((g) => [g.label, pdfCurrency(g.total), String(g.count)]),
        y,
      );
    }
  } else if (type === 'cash-flow') {
    y = addPDFSummary(doc, [
      { label: 'Total Inflows', value: pdfCurrency(reportData.totalInflow) },
      { label: 'Total Outflows', value: pdfCurrency(reportData.totalOutflow) },
      { label: 'Net Cash Movement', value: pdfCurrency(reportData.netCashMovement) },
    ], y);

    if (reportData.byMonth.length > 0) {
      y = addPDFTable(
        doc,
        ['Month', 'Inflows', 'Outflows', 'Net', 'Cumulative'],
        reportData.byMonth.map((m) => [
          m.label,
          pdfCurrency(m.inflow),
          pdfCurrency(m.outflow),
          pdfCurrency(m.net),
          pdfCurrency(m.cumulative),
        ]),
        y,
      );
    }
  } else if (type === 'balance-sheet') {
    y = addPDFSummary(doc, [
      { label: 'Total Assets', value: pdfCurrency(reportData.assets.total) },
      { label: 'Total Liabilities', value: pdfCurrency(reportData.liabilities.total) },
      { label: 'Net Position', value: pdfCurrency(reportData.netPosition) },
    ], y);

    if (reportData.assets.fundingSources.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Assets - Funding Source Balances', 14, y);
      y += 2;
      y = addPDFTable(
        doc,
        ['Name', 'Type', 'Balance'],
        reportData.assets.fundingSources.map((a) => [a.name, a.type, pdfCurrency(a.value)]),
        y,
      );
    }

    if (reportData.assets.inventory.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Assets - Inventory (Estimated)', 14, y);
      y += 2;
      y = addPDFTable(
        doc,
        ['Item', 'Qty', 'Unit Cost', 'Est. Value'],
        reportData.assets.inventory.map((a) => [
          a.name,
          `${a.quantity} ${a.unit || ''}`,
          pdfCurrency(a.unitCost),
          pdfCurrency(a.value),
        ]),
        y,
      );
    }

    // Disclaimer
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    const disclaimer = reportData.disclaimer || '';
    const splitDisclaimer = doc.splitTextToSize(disclaimer, 180);
    doc.text(splitDisclaimer, 14, y);
  } else if (type === 'donor-fund-usage') {
    const fs = reportData.fundingSource;
    if (fs) {
      y = addPDFSummary(doc, [
        { label: 'Funding Source', value: fs.name },
        { label: 'Type', value: fs.type },
        { label: 'Total Received', value: pdfCurrency(fs.totalReceived) },
        { label: 'Total Spent', value: pdfCurrency(reportData.totalSpent) },
        { label: 'Remaining Balance', value: pdfCurrency(reportData.remainingBalance) },
        { label: 'Utilization Rate', value: `${reportData.utilizationRate}%` },
        { label: 'Restrictions', value: fs.restrictions },
      ], y);
    }

    if (reportData.byCategory.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Spending by Category', 14, y);
      y += 2;
      y = addPDFTable(
        doc,
        ['Category', 'Total', 'Count'],
        reportData.byCategory.map((g) => [g.label, pdfCurrency(g.total), String(g.count)]),
        y,
      );
    }
  }

  doc.save(`${(title || 'report').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}
