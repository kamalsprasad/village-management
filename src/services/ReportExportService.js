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
/**
 * Generate a PDF for the Financial Dashboard.
 * Prioritizes data tables over charts for reliable printing.
 * @param {Object} dashboardData - Output from useDashboardData composable
 * @param {string} villageName - Configured village name
 * @param {string} userName - Name of user generating the report
 */
export async function exportDashboardToPDF(dashboardData, villageName, userName) {
  await loadPDFDependencies();

  const doc = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString();

  let y = addPDFHeader(doc, 'Financial Dashboard Summary', {
    generatedAt,
    villageName,
  });

  // Financial Summary Section
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Financial Summary (Current Period)', 14, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated by: ${userName}`, 14, y);
  y += 6;

  const summary = dashboardData.summary || {};
  y = addPDFTable(
    doc,
    ['Metric', 'Amount', 'Status'],
    [
      ['Total Income', pdfCurrency(summary.totalIncome), ''],
      ['Total Expenses', pdfCurrency(summary.totalExpenses), ''],
      [
        'Net Position',
        pdfCurrency(Math.abs(summary.netPosition)),
        summary.netPosition >= 0 ? 'Surplus' : 'Deficit',
      ],
    ],
    y,
  );

  // Funding Sources Section
  if (dashboardData.fundingSources && dashboardData.fundingSources.length > 0) {
    y += 4;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Funding Sources Overview', 14, y);
    y += 6;

    y = addPDFTable(
      doc,
      ['Source Name', 'Total Allocated', 'Current Balance', 'Utilization'],
      dashboardData.fundingSources.map((s) => [
        s.name,
        pdfCurrency(s.total_received),
        pdfCurrency(s.current_balance),
        `${(s.percentUsed || 0).toFixed(1)}%`,
      ]),
      y,
    );
  }

  // Top Expense Categories Section
  if (dashboardData.topExpenseCategories && dashboardData.topExpenseCategories.length > 0) {
    // Check if we need a new page
    if (y > 240) {
      doc.addPage();
      y = 20;
    } else {
      y += 4;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Top Expense Categories', 14, y);
    y += 6;

    y = addPDFTable(
      doc,
      ['Category Name', 'Total Amount'],
      dashboardData.topExpenseCategories.slice(0, 5).map((c) => [c.name, pdfCurrency(c.amount)]),
      y,
    );
  }

  // Active Loans Section
  if (
    dashboardData.loansSummary &&
    dashboardData.loansSummary.moduleEnabled &&
    dashboardData.loansSummary.activeCount > 0
  ) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    } else {
      y += 4;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Active Loans Portfolio', 14, y);
    y += 6;

    y = addPDFSummary(
      doc,
      [
        {
          label: 'Total Outstanding',
          value: pdfCurrency(dashboardData.loansSummary.totalOutstanding),
        },
        { label: 'Active Loans', value: String(dashboardData.loansSummary.activeCount) },
        { label: 'Overdue Loans', value: String(dashboardData.loansSummary.overdueCount) },
      ],
      y,
    );

    if (dashboardData.loansSummary.topLoans && dashboardData.loansSummary.topLoans.length > 0) {
      y = addPDFTable(
        doc,
        ['Borrower', 'Original Amount', 'Balance', 'Status'],
        dashboardData.loansSummary.topLoans.map((l) => [
          l.borrowerName || 'Unknown',
          pdfCurrency(l.principal_amount),
          pdfCurrency(l.outstanding_balance),
          l.status,
        ]),
        y,
      );
    }
  }

  // Inventory Alerts Section
  if (dashboardData.inventoryAlerts && dashboardData.inventoryAlerts.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    } else {
      y += 4;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Inventory Alerts (Action Required)', 14, y);
    y += 6;

    y = addPDFTable(
      doc,
      ['Item Name', 'Status', 'Current Stock', 'Threshold'],
      dashboardData.inventoryAlerts.map((a) => [
        a.item_name,
        a.status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock',
        `${a.quantity} ${a.unit || ''}`,
        `${a.reorder_threshold} ${a.unit || ''}`,
      ]),
      y,
    );
  }

  // Footer Note
  doc.setFontSize(9);
  doc.setFont(undefined, 'italic');
  doc.text('* Charts and visual trends are available in the web dashboard view.', 14, y + 10);

  const pageCount = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated by ${userName}`, 14, pageHeight - 8);
    doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
      align: 'right',
    });
  }

  doc.save(`financial-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Export the Farm Crop Performance Report to PDF.
 * Story 3.9: standalone farm export that reuses shared helper functions.
 *
 * @param {Object} params
 * @param {Array}  params.cropData      - Array from computeCropPerformance()
 * @param {Array}  params.summaryStats  - Array of { label, value } KPI items
 * @param {string} [params.dateFrom]
 * @param {string} [params.dateTo]
 * @param {string} [params.villageName]
 */
export async function exportFarmReportToPDF({
  cropData = [],
  summaryStats = [],
  dateFrom,
  dateTo,
  villageName,
} = {}) {
  await loadPDFDependencies();

  const doc = new jsPDFClass({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString();

  let y = addPDFHeader(doc, 'Farm Crop Performance Report', {
    dateFrom,
    dateTo,
    generatedAt,
    villageName,
  });

  if (summaryStats.length) {
    y = addPDFSummary(doc, summaryStats, y);
  }

  if (cropData.length) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Crop Performance', 14, y);
    y += 2;

    const columns = [
      'Crop',
      'Plantings',
      'Harvest (kg)',
      'Revenue (ZMW)',
      'Total Costs',
      'Net Profit',
      'ROI %',
      'Avg Profit/Planting',
      'Yield/Ha',
      'Success Rate',
    ];

    const rows = cropData.map((c) => [
      c.cropName,
      String(c.totalPlantings),
      Number(c.totalHarvestKg).toFixed(1),
      pdfCurrency(c.totalRevenue),
      pdfCurrency(c.totalCost),
      pdfCurrency(c.netProfit),
      c.roiPercent != null ? c.roiPercent + '%' : '—',
      pdfCurrency(c.avgProfitPerPlanting),
      c.avgYieldPerHectare != null ? c.avgYieldPerHectare + ' kg/ha' : '—',
      c.successRate || '—',
    ]);

    addPDFTable(doc, columns, rows, y);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Page ${i} of ${pageCount}`, pw - 14, ph - 8, { align: 'right' });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`farm-crop-performance-${dateStr}.pdf`);
}

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
    y = addPDFSummary(
      doc,
      [
        { label: 'Total Income', value: pdfCurrency(reportData.totalIncome) },
        { label: 'Transactions', value: String(reportData.transactionCount) },
      ],
      y,
    );

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
    y = addPDFSummary(
      doc,
      [
        { label: 'Total Expenses', value: pdfCurrency(reportData.totalExpenses) },
        { label: 'Transactions', value: String(reportData.transactionCount) },
      ],
      y,
    );

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
    y = addPDFSummary(
      doc,
      [
        { label: 'Total Income', value: pdfCurrency(reportData.totalIncome) },
        { label: 'Total Expenses', value: pdfCurrency(reportData.totalExpenses) },
        {
          label: reportData.isProfit ? 'Net Surplus' : 'Net Deficit',
          value: pdfCurrency(Math.abs(reportData.netResult)),
        },
      ],
      y,
    );

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
    y = addPDFSummary(
      doc,
      [
        { label: 'Total Inflows', value: pdfCurrency(reportData.totalInflow) },
        { label: 'Total Outflows', value: pdfCurrency(reportData.totalOutflow) },
        { label: 'Net Cash Movement', value: pdfCurrency(reportData.netCashMovement) },
      ],
      y,
    );

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
    y = addPDFSummary(
      doc,
      [
        { label: 'Total Assets', value: pdfCurrency(reportData.assets.total) },
        { label: 'Total Liabilities', value: pdfCurrency(reportData.liabilities.total) },
        { label: 'Net Position', value: pdfCurrency(reportData.netPosition) },
      ],
      y,
    );

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
      y = addPDFSummary(
        doc,
        [
          { label: 'Funding Source', value: fs.name },
          { label: 'Type', value: fs.type },
          { label: 'Total Received', value: pdfCurrency(fs.totalReceived) },
          { label: 'Total Spent', value: pdfCurrency(reportData.totalSpent) },
          { label: 'Remaining Balance', value: pdfCurrency(reportData.remainingBalance) },
          { label: 'Utilization Rate', value: `${reportData.utilizationRate}%` },
          { label: 'Restrictions', value: fs.restrictions },
        ],
        y,
      );
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

/**
 * Export the Educational Goals quarterly report to PDF (Story 4.12).
 *
 * @param {Object} params
 * @param {Object} params.goal - active school_long_term_goals row
 * @param {Object} params.currentProgress - output from school-goals-store getCurrentProgress
 * @param {Array}  params.history - term-level progress history
 * @param {Array}  params.breakdownByGrade - grade breakdown rows
 * @param {Array}  params.breakdownBySubject - subject breakdown rows
 * @param {string} [params.villageName]
 * @param {string} [params.academicYearLabel]
 * @param {string} [params.termLabel] - current term name (included in filename)
 */
export async function exportEducationalGoalsToPDF({
  goal = {},
  currentProgress = {},
  history = [],
  breakdownByGrade = [],
  breakdownBySubject = [],
  villageName = '',
  academicYearLabel = '',
  termLabel = '',
} = {}) {
  await loadPDFDependencies();

  const doc = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString();

  let y = addPDFHeader(doc, 'Educational Goals Quarterly Report', {
    generatedAt,
    villageName,
  });

  // Goal summary
  const statusText =
    currentProgress.projectionStatus === 'on_track'
      ? 'On Track'
      : currentProgress.projectionStatus === 'at_risk'
        ? 'At Risk'
        : 'Insufficient Data';

  y = addPDFSummary(
    doc,
    [
      { label: 'Goal', value: goal.goal_name || '—' },
      { label: 'Academic Year', value: academicYearLabel || '—' },
      {
        label: 'Current % at Benchmark',
        value: `${currentProgress.percentAtTarget ?? 0}%`,
      },
      { label: 'Target %', value: `${currentProgress.targetPercent ?? 0}%` },
      { label: 'Gap', value: `${currentProgress.gap ?? 0}%` },
      { label: 'Years Remaining', value: String(currentProgress.yearsRemaining ?? '—') },
      {
        label: 'Required Annual Improvement',
        value: `${currentProgress.requiredAnnualImprovement ?? 0}%`,
      },
      {
        label: 'Projected Outcome',
        value:
          currentProgress.projectedOutcome != null
            ? `${currentProgress.projectedOutcome}% (${statusText})`
            : statusText,
      },
    ],
    y,
  );

  // Progress history table
  if (history.length > 0) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Progress History', 14, y);
    y += 2;
    y = addPDFTable(
      doc,
      ['Period', 'At Target', 'Total Learners', '% at Benchmark'],
      history.map((p) => [
        p.termName ? `${p.academicYear} — ${p.termName}` : String(p.academicYear),
        String(p.atTarget),
        String(p.total),
        `${p.percentAtTarget}%`,
      ]),
      y,
    );
  }

  // Grade breakdown table
  if (breakdownByGrade.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    } else {
      y += 4;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Breakdown by Grade', 14, y);
    y += 2;
    y = addPDFTable(
      doc,
      ['Grade', 'At Target', 'Total Learners', '% at Benchmark', 'Gap'],
      breakdownByGrade.map((g) => [
        g.grade,
        String(g.atTarget),
        String(g.total),
        `${g.percentAtTarget}%`,
        `${g.gap}%`,
      ]),
      y,
    );
  }

  // Subject breakdown table
  if (breakdownBySubject.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    } else {
      y += 4;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Breakdown by Subject', 14, y);
    y += 2;
    y = addPDFTable(
      doc,
      ['Subject', 'At Target', 'Learners Assessed', '% at Benchmark', 'Gap'],
      breakdownBySubject.map((s) => [
        s.subject,
        String(s.atTarget),
        String(s.total),
        `${s.percentAtTarget}%`,
        `${s.gap}%`,
      ]),
      y,
    );
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Generated by Village Management System', 14, ph - 8);
    doc.text(`Page ${i} of ${pageCount}`, pw - 14, ph - 8, { align: 'right' });
  }

  const yearPart = academicYearLabel ? `-${academicYearLabel.replace(/\s+/g, '_')}` : '';
  const termPart = termLabel ? `-${termLabel.replace(/\s+/g, '_')}` : '';
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`educational-goals-report${yearPart}${termPart}-${dateStr}.pdf`);
}
