import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatMoney = (amount, currency) => {
  if (amount == null) return '0';
  return `${Number(amount).toLocaleString()} ${currency}`;
};

const get = (obj, key, fallback = null) => {
  if (obj[key] !== undefined) return obj[key];
  const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
  if (obj[camelKey] !== undefined) return obj[camelKey];
  return fallback;
};

export const exportBudgetVsActualPdf = async (data) => {
  try {
    const tripName = get(data, 'tripName') || 'Trip';
    const currency = get(data, 'currency') || 'VND';
    const startDate = get(data, 'startDate') || new Date();
    const endDate = get(data, 'endDate') || new Date();
    const totalBudget = Number(get(data, 'totalBudget') || 0);
    const totalEstimated = Number(get(data, 'totalEstimated') || 0);
    const totalActual = Number(get(data, 'totalActual') || 0);
    const activities = get(data, 'activities') || [];

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(24, 144, 255);
    doc.text('Budget vs Actual Report', 14, 22);

    // Trip info
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Trip: ${tripName}`, 14, 32);
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 14, 39);
    doc.text(`Currency: ${currency}`, 14, 46);

    // Summary
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total Budget: ${formatMoney(totalBudget, currency)}`, 140, 32);
    doc.text(`Total Estimated: ${formatMoney(totalEstimated, currency)}`, 140, 39);
    doc.text(`Total Actual: ${formatMoney(totalActual, currency)}`, 140, 46);

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 50, 196, 50);

    // Build table rows
    const bodyRows = [];

    activities.forEach((activity) => {
      const activityName = get(activity, 'activityName') || 'Unknown Activity';
      const budget = Number(get(activity, 'budget') || 0);
      const actualTotal = Number(get(activity, 'actualTotal') || 0);
      const expenseLogs = get(activity, 'expenseLogs') || [];

      if (expenseLogs.length === 0) {
        bodyRows.push([
          activityName,
          formatMoney(budget, currency),
          formatMoney(actualTotal, currency),
          '—',
          '—',
        ]);
      } else {
        // First row
        const firstLog = expenseLogs[0];
        bodyRows.push([
          activityName,
          formatMoney(budget, currency),
          formatMoney(actualTotal, currency),
          get(firstLog, 'title') || '—',
          `${formatMoney(get(firstLog, 'amount') || 0, currency)}\n${get(firstLog, 'createdByName') || '—'}`,
        ]);

        // Additional expense log rows
        for (let i = 1; i < expenseLogs.length; i++) {
          const log = expenseLogs[i];
          bodyRows.push([
            '',
            '',
            '',
            get(log, 'title') || '—',
            `${formatMoney(get(log, 'amount') || 0, currency)}\n${get(log, 'createdByName') || '—'}`,
          ]);
        }
      }
    });

    const headers = ['Activity', 'Budget', 'Actual', 'Expense Log', 'Amount / User'];

    // Use the autoTable function directly (not as prototype method)
    autoTable(doc, {
      startY: 55,
      head: [headers],
      body: bodyRows,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [24, 144, 255],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 45 },
        4: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`${tripName.replace(/[^a-zA-Z0-9]/g, '_')}_Budget_vs_Actual.pdf`);
  } catch (err) {
    console.error('PDF export failed:', err);
    throw err;
  }
};
