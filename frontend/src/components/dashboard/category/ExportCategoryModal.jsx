import { X, FileText, Table2, Download } from 'lucide-react';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const COLORS = {
  bg: "#F3F5F9",
  panel: "#ffffff",
  panel2: "#F5F7FB",
  ink: "#1B2536",
  muted: "#6A788D",
  line: "#E7EBF1",
  primary: "#3FABC6",
  primaryd: "#2B8EA6",
  primarysoft: "#E4F4F8",
  green: "#15A24A",
  greensoft: "#E6F6EC",
  amber: "#D88A0C",
  ambersoft: "#FDF3E0",
  red: "rgb(222, 55, 163)",
  redsoft: "#FCE4EC",
  shadow: "0 1px 2px rgba(16,30,54,.04),0 6px 18px rgba(16,30,54,.06)",
};

const ExportCategoryModal = ({ isOpen, onClose, categories }) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const headers = ['Category Name', 'Sub Category', 'Description', 'Status', 'Created Date'];
      const data = categories.map(cat => [
        cat.name,
        cat.subcategory || '',
        cat.description || '',
        cat.synced ? 'Active' : 'Pending',
        new Date(cat.updatedAt || cat.createdAt).toLocaleDateString('en-US'),
      ]);

      const csv = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `categories-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const data = categories.map(cat => ({
        'Category Name': cat.name,
        'Sub Category': cat.subcategory || '',
        'Description': cat.description || '',
        'Status': cat.synced ? 'Active' : 'Pending',
        'Created Date': new Date(cat.updatedAt || cat.createdAt).toLocaleDateString('en-US'),
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 35 },
        { wch: 12 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories');
      XLSX.writeFile(workbook, `categories-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;

      // Title
      doc.setFontSize(16);
      doc.text('Categories Export', margin, margin + 5);

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, margin, margin + 12);
      doc.text(`Total Categories: ${categories.length}`, margin, margin + 18);

      // Table
      let yPosition = margin + 25;
      const rowHeight = 8;
      const headers = ['Category', 'Sub Category', 'Description', 'Status'];
      const headerHeight = rowHeight + 2;

      // Header background
      doc.setFillColor(63, 171, 198);
      doc.rect(margin, yPosition, contentWidth, headerHeight, 'F');

      // Header text
      doc.setTextColor(255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      const colWidths = [30, 30, 60, 20];
      let xPos = margin + 2;
      headers.forEach((header, idx) => {
        doc.text(header, xPos, yPosition + 6);
        xPos += colWidths[idx];
      });

      yPosition += headerHeight;

      // Rows
      doc.setTextColor(0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);

      categories.forEach((cat, idx) => {
        if (yPosition > pageHeight - margin - 10) {
          doc.addPage();
          yPosition = margin;
        }

        const rowData = [
          cat.name,
          cat.subcategory || '-',
          (cat.description || '-').substring(0, 40) + (cat.description && cat.description.length > 40 ? '...' : ''),
          cat.synced ? 'Active' : 'Pending',
        ];

        // Alternating row background
        if (idx % 2 === 0) {
          doc.setFillColor(245, 247, 251);
          doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
        }

        xPos = margin + 2;
        rowData.forEach((cell, colIdx) => {
          doc.text(String(cell), xPos, yPosition + 6);
          xPos += colWidths[colIdx];
        });

        yPosition += rowHeight;
      });

      doc.save(`categories-export-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.panel,
          borderRadius: "12px",
          boxShadow: COLORS.shadow,
          width: "100%",
          maxWidth: "420px",
          border: `1px solid ${COLORS.line}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${COLORS.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: COLORS.ink,
            }}
          >
            Export Categories
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: "8px",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "8px",
              color: COLORS.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          <p
            style={{
              fontSize: "13px",
              color: COLORS.muted,
              marginBottom: "18px",
              fontWeight: 500,
            }}
          >
            Choose a format to export {categories.length} categories:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* CSV Export */}
            <button
              onClick={exportToCSV}
              disabled={isExporting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                border: `1px solid ${COLORS.line}`,
                backgroundColor: COLORS.panel2,
                borderRadius: "8px",
                cursor: isExporting ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isExporting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isExporting) {
                  e.currentTarget.style.backgroundColor = COLORS.primarysoft;
                  e.currentTarget.style.borderColor = COLORS.primary;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.panel2;
                e.currentTarget.style.borderColor = COLORS.line;
              }}
            >
              <Table2 size={20} color={COLORS.primary} />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.ink }}>
                  Export as CSV
                </div>
                <div style={{ fontSize: "11px", color: COLORS.muted }}>
                  Compatible with spreadsheets
                </div>
              </div>
              <Download size={18} color={COLORS.primary} />
            </button>

            {/* Excel Export */}
            <button
              onClick={exportToExcel}
              disabled={isExporting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                border: `1px solid ${COLORS.line}`,
                backgroundColor: COLORS.panel2,
                borderRadius: "8px",
                cursor: isExporting ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isExporting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isExporting) {
                  e.currentTarget.style.backgroundColor = COLORS.greensoft;
                  e.currentTarget.style.borderColor = COLORS.green;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.panel2;
                e.currentTarget.style.borderColor = COLORS.line;
              }}
            >
              <Table2 size={20} color={COLORS.green} />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.ink }}>
                  Export as Excel
                </div>
                <div style={{ fontSize: "11px", color: COLORS.muted }}>
                  .xlsx format with formatting
                </div>
              </div>
              <Download size={18} color={COLORS.green} />
            </button>

            {/* PDF Export */}
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                border: `1px solid ${COLORS.line}`,
                backgroundColor: COLORS.panel2,
                borderRadius: "8px",
                cursor: isExporting ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: isExporting ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isExporting) {
                  e.currentTarget.style.backgroundColor = COLORS.redsoft;
                  e.currentTarget.style.borderColor = COLORS.red;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.panel2;
                e.currentTarget.style.borderColor = COLORS.line;
              }}
            >
              <FileText size={20} color={COLORS.red} />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.ink }}>
                  Export as PDF
                </div>
                <div style={{ fontSize: "11px", color: COLORS.muted }}>
                  Professional formatted document
                </div>
              </div>
              <Download size={18} color={COLORS.red} />
            </button>
          </div>

          {isExporting && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: COLORS.primarysoft,
                borderRadius: "8px",
                textAlign: "center",
                fontSize: "12px",
                color: COLORS.primary,
                fontWeight: 600,
              }}
            >
              Exporting... Please wait
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportCategoryModal;
