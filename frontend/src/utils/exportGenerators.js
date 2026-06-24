import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// Human-readable sheet/section names
const SHEET_NAMES = {
  Category: 'Categories',
  Product: 'Products',
  StockIn: 'Stock In',
  StockOut: 'Stock Out',
  BackOrder: 'Back Orders',
  SalesReturn: 'Sales Returns',
  SalesReturnItem: 'Sales Return Items',
  Partner: 'Partners',
  Requisition: 'Requisitions',
  RequisitionItem: 'Requisition Items',
  RequisitionItemDelivery: 'Req Item Deliveries',
  StockRequisition: 'Stock Requisitions',
  StockRequisitionItem: 'Stock Req Items',
  ReceivingLog: 'Receiving Logs',
  Employee: 'Employees',
  Admin: 'Admins',
  Task: 'Tasks',
  Permission: 'Permissions',
  Report: 'Reports',
  Expense: 'Expenses',
  Transaction: 'Transactions',
  Credit: 'Credits',
  Activity: 'Activity Log',
  Notification: 'Notifications',
};

// Fields to strip from Excel/PDF (never show hashes in human-readable formats)
const STRIP_FOR_DISPLAY = ['password'];

// ─── AUTO-SIZE COLUMNS ───────────────────────────────────────────────────────
function autoSize(ws, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  ws['!cols'] = keys.map((k) => {
    const max = Math.max(k.length, ...rows.map((r) => String(r[k] ?? '').length));
    return { wch: Math.min(max + 2, 60) };
  });
}

// ─── STRIP DISPLAY-ONLY SENSITIVE FIELDS ─────────────────────────────────────
function stripForDisplay(rows) {
  return rows.map((row) => {
    const clone = { ...row };
    for (const f of STRIP_FOR_DISPLAY) delete clone[f];
    // Also strip the M2M helper field (not a real column)
    delete clone._employeeIds;
    // Flatten JSON fields for Excel readability
    for (const [k, v] of Object.entries(clone)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        clone[k] = JSON.stringify(v);
      } else if (Array.isArray(v)) {
        clone[k] = JSON.stringify(v);
      }
    }
    return clone;
  });
}

// ─── JSON EXPORT (PRIMARY — full fidelity, re-importable) ────────────────────
export function generateJSON(data, config, counts) {
  const payload = {
    version: '1.0',
    system: 'aby-inventor',
    exportedAt: new Date().toISOString(),
    entities: Object.keys(data),
    metadata: {
      counts,
      dateRange: config.dateRange ?? null,
      filters: config.filters ?? null,
    },
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aby-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── EXCEL EXPORT (SECONDARY — human-readable, multi-sheet) ──────────────────
export function generateExcel(data, config, counts) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    { Field: 'Export Date', Value: new Date().toLocaleString() },
    { Field: 'System', Value: 'Aby Inventor' },
    { Field: 'Entities Exported', Value: Object.keys(data).join(', ') },
    { Field: 'Date Range Start', Value: config.dateRange?.start || 'All time' },
    { Field: 'Date Range End', Value: config.dateRange?.end || 'All time' },
    { Field: '', Value: '' },
    { Field: '── Record Counts ──', Value: '' },
    ...Object.entries(counts).map(([e, c]) => ({ Field: SHEET_NAMES[e] ?? e, Value: c })),
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  autoSize(summaryWs, summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // One sheet per entity
  for (const [entity, rows] of Object.entries(data)) {
    const name = (SHEET_NAMES[entity] ?? entity).substring(0, 31);
    const displayRows = stripForDisplay(rows);

    if (!displayRows.length) {
      const ws = XLSX.utils.aoa_to_sheet([['No records in selected range']]);
      XLSX.utils.book_append_sheet(wb, ws, name);
      continue;
    }

    const ws = XLSX.utils.json_to_sheet(displayRows);
    autoSize(ws, displayRows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  XLSX.writeFile(wb, `aby-export-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ─── PDF EXPORT (SECONDARY — review format, up to 100 rows per entity) ───────
export function generatePDF(data, config, counts) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const margin = 10;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = margin;

  const addText = (text, size = 10, bold = false) => {
    if (y > pageH - 20) { doc.addPage(); y = margin; }
    doc.setFontSize(size);
    doc.setFont(undefined, bold ? 'bold' : 'normal');
    doc.text(String(text), margin, y);
    y += size * 0.5 + 2;
  };

  // Cover
  doc.setFillColor(63, 171, 198);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  addText('Aby Inventor — Data Export', 18, true);
  addText(`Generated: ${new Date().toLocaleString()}`, 10);
  if (config.dateRange?.start || config.dateRange?.end) {
    addText(`Date Range: ${config.dateRange?.start || '—'} → ${config.dateRange?.end || '—'}`, 9);
  }
  doc.setTextColor(0, 0, 0);
  y += 6;

  for (const [entity, rows] of Object.entries(data)) {
    const displayRows = stripForDisplay(rows).slice(0, 100);
    if (!displayRows.length) continue;

    if (y > pageH - 40) { doc.addPage(); y = margin; }

    // Section header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(27, 37, 54);
    doc.text(`${SHEET_NAMES[entity] ?? entity}  (${counts[entity] ?? rows.length} records${rows.length > 100 ? ', showing first 100' : ''})`, margin + 2, y + 5.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    y += 10;

    const keys = Object.keys(displayRows[0] ?? {}).slice(0, 8); // max 8 cols for PDF
    const colW = (pageW - 2 * margin) / keys.length;
    const rowH = 7;

    // Column headers
    if (y > pageH - 20) { doc.addPage(); y = margin; }
    doc.setFillColor(63, 171, 198);
    doc.rect(margin, y, pageW - 2 * margin, rowH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    keys.forEach((k, i) => {
      doc.text(k.substring(0, 16), margin + i * colW + 1, y + 5);
    });
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    y += rowH;

    // Rows
    displayRows.forEach((row, idx) => {
      if (y > pageH - 15) { doc.addPage(); y = margin; }
      if (idx % 2 === 0) {
        doc.setFillColor(245, 247, 251);
        doc.rect(margin, y, pageW - 2 * margin, rowH, 'F');
      }
      doc.setFontSize(7);
      keys.forEach((k, i) => {
        const val = String(row[k] ?? '').substring(0, 18);
        doc.text(val, margin + i * colW + 1, y + 5);
      });
      y += rowH;
    });

    y += 6;
  }

  doc.save(`aby-export-${new Date().toISOString().split('T')[0]}.pdf`);
}
