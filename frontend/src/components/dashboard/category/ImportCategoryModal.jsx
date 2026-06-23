import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

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
  red: "#E04848",
  redsoft: "#FDECEC",
  amber: "#D88A0C",
  ambersoft: "#FDF3E0",
  shadow: "0 1px 2px rgba(16,30,54,.04),0 6px 18px rgba(16,30,54,.06)",
};

const ImportCategoryModal = ({ isOpen, onClose, onImport, isLoading }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Preview
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    name: 0,
    subcategory: -1,
    description: -1,
  });
  const [headers, setHeaders] = useState([]);
  const [errors, setErrors] = useState([]);
  const [validationResults, setValidationResults] = useState([]);

  const autoDetectMapping = (headers) => {
    const mapping = { name: -1, subcategory: -1, description: -1 };

    headers.forEach((header, idx) => {
      const lower = header.toLowerCase().trim();
      if (lower.includes('category name') || lower === 'category' || lower === 'name') {
        mapping.name = idx;
      } else if (lower.includes('sub category') || lower.includes('subcategory')) {
        mapping.subcategory = idx;
      } else if (lower.includes('description') || lower === 'desc') {
        mapping.description = idx;
      }
    });

    return mapping;
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setErrors([]);
    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      readCSV(selectedFile);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      readExcel(selectedFile);
    } else {
      setErrors(['Unsupported file format. Please use CSV or Excel files.']);
    }
  };

  const readCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n');
        if (lines.length < 2) {
          setErrors(['CSV file must have headers and at least one data row']);
          return;
        }

        const headerLine = lines[0];
        const cols = headerLine.split(',').map(h => h.trim());
        setHeaders(cols);

        const data = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          const values = lines[i].split(',').map(v => v.trim());
          data.push(values);
        }

        setParsedData(data);
        const detectedMapping = autoDetectMapping(cols);
        setColumnMapping(detectedMapping);
        setFile(file);
        setStep(2);
      } catch (error) {
        setErrors([`Error reading CSV: ${error.message}`]);
      }
    };
    reader.readAsText(file);
  };

  const readExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (parsed.length < 2) {
          setErrors(['Excel file must have headers and at least one data row']);
          return;
        }

        const cols = parsed[0].map(h => String(h || '').trim());
        setHeaders(cols);

        const dataRows = parsed.slice(1).filter(row => row.some(cell => cell));
        setParsedData(dataRows);
        const detectedMapping = autoDetectMapping(cols);
        setColumnMapping(detectedMapping);
        setFile(file);
        setStep(2);
      } catch (error) {
        setErrors([`Error reading Excel: ${error.message}`]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateAndPreview = () => {
    setErrors([]);
    setValidationResults([]);

    if (columnMapping.name === -1) {
      setErrors(['Category Name column is required']);
      return;
    }

    const results = [];
    let validCount = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const name = row[columnMapping.name];

      if (!name || String(name).trim() === '') {
        results.push({
          row: i + 2,
          valid: false,
          error: 'Category name is required',
          data: null,
        });
      } else {
        const categoryData = {
          name: String(name).trim(),
          subcategory: columnMapping.subcategory !== -1 ? String(row[columnMapping.subcategory] || '').trim() : '',
          description: columnMapping.description !== -1 ? String(row[columnMapping.description] || '').trim() : '',
        };

        results.push({
          row: i + 2,
          valid: true,
          error: null,
          data: categoryData,
        });
        validCount++;
      }
    }

    setValidationResults(results);
    if (validCount === 0) {
      setErrors(['No valid categories found in file']);
    } else {
      setStep(3);
    }
  };

  const handleImport = async () => {
    const validCategories = validationResults
      .filter(r => r.valid)
      .map(r => r.data);

    await onImport(validCategories);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setErrors([]);
    setValidationResults([]);
    setColumnMapping({ name: 0, subcategory: -1, description: -1 });
    onClose();
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
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          border: `1px solid ${COLORS.line}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 20px",
            borderBottom: `1px solid ${COLORS.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: COLORS.ink,
              }}
            >
              Import Categories
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "12px",
                color: COLORS.muted,
                fontWeight: 500,
              }}
            >
              Step {step} of 3
            </p>
          </div>
          <button
            onClick={handleClose}
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
          {/* Error Messages */}
          {errors.length > 0 && (
            <div
              style={{
                backgroundColor: COLORS.redsoft,
                border: `1px solid ${COLORS.red}33`,
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              {errors.map((error, idx) => (
                <p
                  key={idx}
                  style={{
                    margin: idx === 0 ? "0" : "6px 0 0",
                    fontSize: "12px",
                    color: COLORS.red,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 1 && (
            <div>
              <p
                style={{
                  fontSize: "13px",
                  color: COLORS.muted,
                  marginBottom: "16px",
                  fontWeight: 500,
                }}
              >
                Upload a CSV or Excel file with your categories
              </p>

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px dashed ${COLORS.primary}`,
                  borderRadius: "8px",
                  padding: "32px 24px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backgroundColor: COLORS.primarysoft,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.backgroundColor = COLORS.primary + "10";
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.primarysoft;
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    handleFileSelect({ target: { files } });
                  }
                }}
              >
                <Upload size={32} color={COLORS.primary} style={{ marginBottom: "8px" }} />
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: COLORS.ink,
                  }}
                >
                  Drop file here or click to upload
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: COLORS.muted,
                  }}
                >
                  CSV or Excel (.xlsx, .xls)
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
              </label>

              <div
                style={{
                  backgroundColor: COLORS.panel2,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginTop: "16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: COLORS.ink,
                  }}
                >
                  📋 File Format Example:
                </p>
                <table
                  style={{
                    width: "100%",
                    fontSize: "11px",
                    borderCollapse: "collapse",
                    color: COLORS.muted,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                      <th style={{ textAlign: "left", padding: "6px 0", fontWeight: 600 }}>
                        Category Name
                      </th>
                      <th style={{ textAlign: "left", padding: "6px 0", fontWeight: 600 }}>
                        Sub Category
                      </th>
                      <th style={{ textAlign: "left", padding: "6px 0", fontWeight: 600 }}>
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 0" }}>Plumbing</td>
                      <td style={{ padding: "6px 0" }}>Pipes & Tubes</td>
                      <td style={{ padding: "6px 0" }}>Water pipes</td>
                    </tr>
                    <tr style={{ backgroundColor: COLORS.panel }}>
                      <td style={{ padding: "6px 0" }}>Electricity</td>
                      <td style={{ padding: "6px 0" }}>Wiring</td>
                      <td style={{ padding: "6px 0" }}>Electrical wires</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 2: Map Columns */}
          {step === 2 && (
            <div>
              <p
                style={{
                  fontSize: "13px",
                  color: COLORS.muted,
                  marginBottom: "16px",
                  fontWeight: 500,
                }}
              >
                Map your file columns to category fields
              </p>

              {["name", "subcategory", "description"].map((field) => (
                <div key={field} style={{ marginBottom: "14px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: COLORS.ink,
                      marginBottom: "6px",
                      textTransform: "capitalize",
                    }}
                  >
                    {field === "name" ? "Category Name *" : field === "subcategory" ? "Sub Category (optional)" : "Description (optional)"}
                  </label>
                  <select
                    value={columnMapping[field]}
                    onChange={(e) =>
                      setColumnMapping({
                        ...columnMapping,
                        [field]: parseInt(e.target.value),
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${COLORS.line}`,
                      backgroundColor: COLORS.panel2,
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: COLORS.ink,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value={-1}>-- Not included --</option>
                    {headers.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {header || `Column ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Preview */}
              <div
                style={{
                  backgroundColor: COLORS.panel2,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: "8px",
                  padding: "12px",
                  marginTop: "16px",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: COLORS.muted,
                    textTransform: "uppercase",
                  }}
                >
                  Preview (first 3 rows)
                </p>
                {parsedData.slice(0, 3).map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px",
                      borderBottom: `1px solid ${COLORS.line}`,
                      fontSize: "11px",
                      color: COLORS.ink,
                    }}
                  >
                    <strong>{row[columnMapping.name]}</strong>
                    {columnMapping.subcategory !== -1 && (
                      <>
                        {" | "}
                        <span style={{ color: COLORS.primary }}>
                          {row[columnMapping.subcategory]}
                        </span>
                      </>
                    )}
                    {columnMapping.description !== -1 && (
                      <>
                        {" | "}
                        <span style={{ color: COLORS.muted }}>
                          {String(row[columnMapping.description]).substring(0, 30)}...
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview & Import */}
          {step === 3 && (
            <div>
              <p
                style={{
                  fontSize: "13px",
                  color: COLORS.muted,
                  marginBottom: "14px",
                  fontWeight: 500,
                }}
              >
                Review and confirm import
              </p>

              <div
                style={{
                  backgroundColor: COLORS.greensoft,
                  border: `1px solid ${COLORS.green}33`,
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <CheckCircle size={18} color={COLORS.green} />
                <span
                  style={{
                    fontSize: "12px",
                    color: COLORS.green,
                    fontWeight: 600,
                  }}
                >
                  {validationResults.filter(r => r.valid).length} valid categories ready to import
                </span>
              </div>

              <div
                style={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  backgroundColor: COLORS.panel2,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: "8px",
                }}
              >
                {validationResults.map((result, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${COLORS.line}`,
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    {result.valid ? (
                      <>
                        <CheckCircle size={14} color={COLORS.green} style={{ marginTop: "2px", flexShrink: 0 }} />
                        <div style={{ width: "100%" }}>
                          <p style={{ margin: 0, fontWeight: 600, color: COLORS.ink }}>
                            {result.data.name}
                          </p>
                          <p style={{ margin: "4px 0 0", color: COLORS.primary, fontSize: "11px", fontWeight: 500 }}>
                            Sub: {result.data.subcategory ? result.data.subcategory : "(not specified)"}
                          </p>
                          <p style={{ margin: "2px 0 0", color: COLORS.muted, fontSize: "11px" }}>
                            Desc: {result.data.description ? (result.data.description.length > 50 ? result.data.description.substring(0, 50) + "..." : result.data.description) : "(not specified)"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} color={COLORS.red} style={{ marginTop: "2px", flexShrink: 0 }} />
                        <span style={{ color: COLORS.red }}>Row {result.row}: {result.error}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: `1px solid ${COLORS.line}`,
            }}
          >
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: `1px solid ${COLORS.line}`,
                  backgroundColor: COLORS.panel,
                  color: COLORS.ink,
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Back
              </button>
            )}

            {step === 3 && (
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: `1px solid ${COLORS.line}`,
                  backgroundColor: COLORS.panel,
                  color: COLORS.ink,
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Back
              </button>
            )}

            <button
              onClick={handleClose}
              style={{
                flex: 1,
                padding: "10px 14px",
                border: `1px solid ${COLORS.line}`,
                backgroundColor: COLORS.panel,
                color: COLORS.ink,
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Cancel
            </button>

            {step === 2 && (
              <button
                onClick={validateAndPreview}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryd})`,
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Preview
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleImport}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: isLoading ? COLORS.primary : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryd})`,
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.7 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                {isLoading ? "Importing..." : "Import Categories"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportCategoryModal;
