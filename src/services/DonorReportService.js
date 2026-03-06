/**
 * DonorReportService - Story 2.4
 *
 * Client-side PDF report generation for funding sources.
 * Uses jsPDF and jspdf-autotable for PDF creation.
 *
 * Install dependencies:
 *   npm install jspdf jspdf-autotable
 */

import { format } from 'date-fns';

/**
 * Donor Report Service
 * Generates PDF reports for funding sources showing transaction history and utilization.
 */
export class DonorReportService {
  constructor() {
    this.jsPDF = null;
    this.autoTable = null;
  }

  /**
   * Lazy load jsPDF dependencies
   * This allows the app to run even if jspdf is not installed yet
   */
  async loadDependencies() {
    if (!this.jsPDF) {
      try {
        // Dynamic import of jsPDF
        const { jsPDF } = await import('jspdf');
        this.jsPDF = jsPDF;

        // Dynamic import of autotable plugin
        const autoTableModule = await import('jspdf-autotable');
        this.autoTable = autoTableModule.default || autoTableModule.autoTable;

        if (typeof this.autoTable !== 'function') {
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

  applyAutoTable(doc, options) {
    if (typeof doc.autoTable === 'function') {
      return doc.autoTable(options);
    }

    if (typeof this.autoTable === 'function') {
      return this.autoTable(doc, options);
    }

    throw new Error(
      'AutoTable is not available for PDF generation. ' +
        'Plugin not loaded properly. Try refreshing the page.',
    );
  }

  /**
   * Format currency for reports
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }

  /**
   * Format date for reports
   */
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return format(new Date(dateStr), 'MMM d, yyyy');
  }

  filterTransactionsByDateRange(transactions = [], options = {}) {
    const { dateFrom, dateTo } = options;

    return transactions.filter((transaction) => {
      if (!dateFrom && !dateTo) {
        return true;
      }

      const transactionDate = new Date(transaction.date);

      if (dateFrom && transactionDate < new Date(dateFrom)) {
        return false;
      }

      if (dateTo && transactionDate > new Date(dateTo)) {
        return false;
      }

      return true;
    });
  }

  buildDateRangeLabel(options = {}) {
    const { dateFrom, dateTo } = options;

    if (!dateFrom && !dateTo) {
      return 'All transactions';
    }

    if (dateFrom && dateTo) {
      return `${this.formatDate(dateFrom)} - ${this.formatDate(dateTo)}`;
    }

    if (dateFrom) {
      return `From ${this.formatDate(dateFrom)}`;
    }

    return `Up to ${this.formatDate(dateTo)}`;
  }

  /**
   * Generate a donor report PDF for a funding source
   *
   * @param {Object} fundingSource - The funding source object
   * @param {Array} transactions - Array of transactions linked to this source
   * @param {Object} options - Optional report filters
   * @returns {Promise<void>} - Downloads the PDF
   */
  async generateFundingSourceReport(fundingSource, transactions = [], options = {}) {
    await this.loadDependencies();

    const filteredTransactions = this.filterTransactionsByDateRange(transactions, options);

    // Create new PDF document
    const doc = new this.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;

    // ==============================
    // Header
    // ==============================
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Donor Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sustainable Model Village Management System', pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 7;

    doc.text(this.buildDateRangeLabel(options), pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 8;

    if (options.generatedAt) {
      doc.setFontSize(10);
      doc.text(`Generated: ${this.formatDate(options.generatedAt)}`, pageWidth / 2, yPos, {
        align: 'center',
      });
      yPos += 8;
    }

    // ==============================
    // Funding Source Details
    // ==============================
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Funding Source Details', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const sourceDetails = [
      ['Name:', fundingSource.name],
      [
        'Type:',
        fundingSource.type
          ? fundingSource.type.charAt(0).toUpperCase() + fundingSource.type.slice(1)
          : 'N/A',
      ],
      [
        'Status:',
        fundingSource.status
          ? fundingSource.status.charAt(0).toUpperCase() + fundingSource.status.slice(1)
          : 'N/A',
      ],
      ['Date Received:', this.formatDate(fundingSource.date_received)],
      ['Restrictions:', fundingSource.restrictions || 'None specified'],
    ];

    sourceDetails.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, yPos);
      doc.setFont('helvetica', 'normal');
      // Wrap long text
      const maxWidth = pageWidth - margin * 2 - 40;
      const lines = doc.splitTextToSize(value.toString(), maxWidth);
      doc.text(lines, margin + 40, yPos);
      yPos += 6 * lines.length;
    });

    yPos += 10;

    // ==============================
    // Financial Summary
    // ==============================
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', margin, yPos);
    yPos += 8;

    // Calculate summary
    const totalReceived = fundingSource.total_received || 0;
    const currentBalance = fundingSource.current_balance || 0;
    const utilized = totalReceived - currentBalance;
    const utilizationPercent =
      totalReceived > 0 ? ((utilized / totalReceived) * 100).toFixed(1) : 0;

    const incomeTransactions = filteredTransactions.filter(
      (t) => t.type === 'income' && t.status === 'completed',
    );
    const expenseTransactions = filteredTransactions.filter(
      (t) => t.type === 'expense' && t.status === 'completed',
    );

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + (t.amount_funded || 0), 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + (t.amount_funded || 0), 0);

    doc.setFontSize(10);

    // Summary table
    this.applyAutoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Amount']],
      body: [
        ['Total Received', this.formatCurrency(totalReceived)],
        ['Current Balance', this.formatCurrency(currentBalance)],
        ['Funds Utilized', this.formatCurrency(utilized)],
        ['Utilization Rate', `${utilizationPercent}%`],
        ['Total Income Added', this.formatCurrency(totalIncome)],
        ['Total Expenses Deducted', this.formatCurrency(totalExpenses)],
        ['Transaction Count', filteredTransactions.length.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [41, 98, 255] },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { halign: 'right' },
      },
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // ==============================
    // Transaction History
    // ==============================
    if (filteredTransactions.length > 0) {
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction History', margin, yPos);
      yPos += 8;

      // Prepare transaction data for table
      const transactionRows = filteredTransactions
        .filter((t) => t.status !== 'cancelled')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((t) => [
          this.formatDate(t.date),
          t.type.charAt(0).toUpperCase() + t.type.slice(1),
          t.description || 'N/A',
          t.type === 'income'
            ? `+${this.formatCurrency(t.amount_funded)}`
            : `-${this.formatCurrency(t.amount_funded)}`,
          t.status.charAt(0).toUpperCase() + t.status.slice(1),
        ]);

      this.applyAutoTable(doc, {
        startY: yPos,
        head: [['Date', 'Type', 'Description', 'Amount', 'Status']],
        body: transactionRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 98, 255] },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 20 },
          2: { cellWidth: 70 },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 25 },
        },
        styles: { fontSize: 8 },
        didDrawPage: (data) => {
          // Add page number footer
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' },
          );
        },
      });
    }

    // ==============================
    // Footer
    // ==============================
    const finalPage = doc.internal.getNumberOfPages();
    doc.setPage(finalPage);
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Report generated on ${format(new Date(), 'PPpp')}`, margin, pageHeight - 15);

    // ==============================
    // Download
    // ==============================
    const fileName = `Donor_Report_${fundingSource.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  }

  async generateReport(fundingSource, transactions = [], options = {}) {
    return this.generateFundingSourceReport(fundingSource, transactions, options);
  }

  /**
   * Generate a summary report for all funding sources
   *
   * @param {Array} fundingSources - Array of all funding sources
   * @returns {Promise<void>} - Downloads the PDF
   */
  async generateAllSourcesReport(fundingSources) {
    await this.loadDependencies();

    const doc = new this.jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Funding Sources Summary Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sustainable Model Village Management System', pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 5;
    doc.text(format(new Date(), 'MMMM d, yyyy'), pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Calculate totals
    const totalReceived = fundingSources.reduce((sum, s) => sum + (s.total_received || 0), 0);
    const totalBalance = fundingSources.reduce((sum, s) => sum + (s.current_balance || 0), 0);
    const activeSources = fundingSources.filter((s) => s.status === 'active').length;

    // Summary stats
    doc.setFontSize(10);
    doc.text(`Total Sources: ${fundingSources.length} (${activeSources} active)`, margin, yPos);
    doc.text(`Total Received: ${this.formatCurrency(totalReceived)}`, margin + 80, yPos);
    doc.text(`Total Available: ${this.formatCurrency(totalBalance)}`, margin + 160, yPos);
    yPos += 10;

    // Sources table
    const sourceRows = fundingSources.map((s) => {
      const utilization =
        s.total_received > 0
          ? (((s.total_received - s.current_balance) / s.total_received) * 100).toFixed(1)
          : 0;
      return [
        s.name,
        s.type.charAt(0).toUpperCase() + s.type.slice(1),
        s.status.charAt(0).toUpperCase() + s.status.slice(1),
        this.formatCurrency(s.total_received),
        this.formatCurrency(s.current_balance),
        `${utilization}%`,
        s.restrictions ? 'Yes' : 'No',
      ];
    });

    this.applyAutoTable(doc, {
      startY: yPos,
      head: [['Name', 'Type', 'Status', 'Total Received', 'Balance', 'Utilized', 'Restricted']],
      body: sourceRows,
      theme: 'striped',
      headStyles: { fillColor: [41, 98, 255] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
    });

    // Download
    const fileName = `Funding_Sources_Summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  }
}

export default DonorReportService;
