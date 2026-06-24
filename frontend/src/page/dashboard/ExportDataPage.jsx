import { useState, useRef } from 'react';
import {
  Download, Upload, Package, ShoppingCart, RotateCcw,
  Clipboard, ClipboardList, Users, DollarSign, Activity,
  ChevronRight, ChevronDown, AlertTriangle, CheckCircle2,
  XCircle, FileJson, FileSpreadsheet, FileText, RefreshCw,
  Info,
} from 'lucide-react';
import exportService from '../../services/exportService';
import { generateJSON, generateExcel, generatePDF } from '../../utils/exportGenerators';

const C = {
  bg: '#F3F5F9', panel: '#ffffff', panel2: '#F5F7FB',
  ink: '#1B2536', muted: '#6A788D', line: '#E7EBF1',
  primary: '#3FABC6', primaryd: '#2B8EA6', primarysoft: '#E4F4F8',
  green: '#15A24A', greensoft: '#E6F6EC',
  amber: '#D88A0C', ambersoft: '#FDF3E0',
  red: '#E04848', redsoft: '#FDECEC',
  shadow: '0 1px 2px rgba(16,30,54,.04),0 6px 18px rgba(16,30,54,.06)',
};

// ─── ENTITY GROUPS ────────────────────────────────────────────────────────────
const GROUPS = [
  {
    key: 'inventory', label: 'Inventory Core', Icon: Package,
    entities: [
      { key: 'Category', label: 'Categories' },
      { key: 'Product', label: 'Products' },
      { key: 'StockIn', label: 'Stock In' },
    ],
  },
  {
    key: 'sales', label: 'Sales', Icon: ShoppingCart,
    entities: [
      { key: 'StockOut', label: 'Stock Out / Sales' },
      { key: 'BackOrder', label: 'Back Orders' },
    ],
  },
  {
    key: 'returns', label: 'Sales Returns', Icon: RotateCcw,
    entities: [
      { key: 'SalesReturn', label: 'Sales Returns' },
      { key: 'SalesReturnItem', label: 'Sales Return Items' },
    ],
  },
  {
    key: 'partner-req', label: 'Partner Requisitions', Icon: Clipboard,
    entities: [
      { key: 'Partner', label: 'Partners' },
      { key: 'Requisition', label: 'Requisitions' },
      { key: 'RequisitionItem', label: 'Requisition Items' },
      { key: 'RequisitionItemDelivery', label: 'Delivery Records' },
    ],
  },
  {
    key: 'stock-req', label: 'Stock Requisitions', Icon: ClipboardList,
    entities: [
      { key: 'StockRequisition', label: 'Stock Requisitions' },
      { key: 'StockRequisitionItem', label: 'Stock Req Items' },
      { key: 'ReceivingLog', label: 'Receiving Logs' },
    ],
  },
  {
    key: 'people', label: 'People', Icon: Users,
    entities: [
      { key: 'Employee', label: 'Employees' },
      { key: 'Admin', label: 'Admins' },
      { key: 'Task', label: 'Tasks / Positions' },
      { key: 'Permission', label: 'Permissions' },
    ],
  },
  {
    key: 'financial', label: 'Financial', Icon: DollarSign,
    entities: [
      { key: 'Report', label: 'Reports' },
      { key: 'Expense', label: 'Expenses' },
      { key: 'Transaction', label: 'Transactions' },
      { key: 'Credit', label: 'Credits' },
    ],
  },
  {
    key: 'audit', label: 'Audit', Icon: Activity,
    entities: [
      { key: 'Activity', label: 'Activity Log' },
      { key: 'Notification', label: 'Notifications' },
    ],
  },
];

// ─── RELATIONSHIP WARNINGS ────────────────────────────────────────────────────
const WARNINGS = [
  {
    check: (sel) => sel.includes('StockOut') && !sel.includes('StockIn'),
    msg: 'StockOut references StockIn. For a complete backup include StockIn.',
    suggest: 'StockIn',
  },
  {
    check: (sel) => (sel.includes('Product') || sel.includes('StockIn')) && !sel.includes('Category'),
    msg: 'Products and StockIn belong to Categories. Include Categories for full restore.',
    suggest: 'Category',
  },
  {
    check: (sel) => sel.includes('StockIn') && !sel.includes('Product'),
    msg: 'Stock In records reference Products. Include Products for a complete backup.',
    suggest: 'Product',
  },
  {
    check: (sel) => sel.includes('Requisition') && !sel.includes('Partner'),
    msg: 'Requisitions belong to Partners. Include Partners.',
    suggest: 'Partner',
  },
  {
    check: (sel) =>
      (sel.includes('RequisitionItem') || sel.includes('RequisitionItemDelivery')) &&
      !sel.includes('Requisition'),
    msg: 'Requisition Items belong to Requisitions. Include Requisitions.',
    suggest: 'Requisition',
  },
  {
    check: (sel) => sel.includes('SalesReturnItem') && !sel.includes('SalesReturn'),
    msg: 'Sales Return Items belong to Sales Returns. Include Sales Returns.',
    suggest: 'SalesReturn',
  },
  {
    check: (sel) => sel.includes('SalesReturnItem') && !sel.includes('StockOut'),
    msg: 'Sales Return Items reference Stock Out records. Include Stock Out.',
    suggest: 'StockOut',
  },
  {
    check: (sel) =>
      (sel.includes('StockRequisitionItem') || sel.includes('ReceivingLog')) &&
      !sel.includes('StockRequisition'),
    msg: 'Stock Req Items belong to Stock Requisitions. Include Stock Requisitions.',
    suggest: 'StockRequisition',
  },
  {
    check: (sel) =>
      (sel.includes('Report') || sel.includes('Expense') || sel.includes('Credit') ||
        sel.includes('StockRequisition')) &&
      !sel.includes('Employee'),
    msg: 'Reports, Expenses, Credits and Stock Requisitions belong to Employees. Include Employees.',
    suggest: 'Employee',
  },
  {
    check: (sel) =>
      (sel.includes('Transaction') || sel.includes('Expense') || sel.includes('Credit')) &&
      !sel.includes('Report'),
    msg: 'Transactions, Expenses, and Credits belong to Reports. Include Reports.',
    suggest: 'Report',
  },
  {
    check: (sel) => sel.includes('Permission') && !sel.includes('Employee'),
    msg: 'Permissions belong to Employees. Include Employees.',
    suggest: 'Employee',
  },
  {
    check: (sel) => sel.includes('Task') && !sel.includes('Employee'),
    msg: 'Tasks have assigned Employees. Include Employees to preserve task assignments.',
    suggest: 'Employee',
  },
];

// ─── OPTIONAL SENSITIVE FIELDS ────────────────────────────────────────────────
const OPTIONAL_EXCLUDE = {
  Employee: ['email', 'phoneNumber', 'address', 'profileImg', 'cv', 'identityCard'],
  Admin: ['adminEmail'],
  Partner: ['email', 'phone', 'address'],
};

const PAYMENT_STATUSES = ['PENDING', 'SUCCESSFUL', 'FAILED', 'DEBTED'];
const EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
const REQ_STATUSES = ['PENDING', 'REVIEWED', 'APPROVED', 'REJECTED', 'PARTIALLY_FULFILLED', 'COMPLETED', 'CANCELLED'];
const STOCK_REQ_STATUSES = ['PENDING', 'APPROVED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'REJECTED', 'COMPLETED'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label, disabled }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled}
        style={{ width: 15, height: 15, accentColor: C.primary, cursor: disabled ? 'default' : 'pointer' }} />
      <span style={{ fontSize: 13, color: C.ink }}>{label}</span>
    </label>
  );
}

function StepBadge({ n, active, done }) {
  const bg = done ? C.green : active ? C.primary : C.line;
  const color = done || active ? '#fff' : C.muted;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, flexShrink: 0,
    }}>
      {done ? <CheckCircle2 size={14} /> : n}
    </div>
  );
}

// ─── STEP 1: ENTITY SELECTION ─────────────────────────────────────────────────
function EntitySelectionStep({ selected, setSelected }) {
  const [collapsed, setCollapsed] = useState({});

  const toggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleGroup = (group) => {
    const keys = group.entities.map((e) => e.key);
    const allIn = keys.every((k) => selected.includes(k));
    if (allIn) {
      setSelected((prev) => prev.filter((k) => !keys.includes(k)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...keys])]);
    }
  };

  const activeWarnings = WARNINGS.filter((w) => w.check(selected));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
          Select which data to include. For a full backup, select all.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setSelected(GROUPS.flatMap((g) => g.entities.map((e) => e.key)))}
            style={{ fontSize: 12, color: C.primary, background: 'none', border: `1px solid ${C.primary}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            Select All
          </button>
          <button onClick={() => setSelected([])}
            style={{ fontSize: 12, color: C.muted, background: 'none', border: `1px solid ${C.line}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      </div>

      {/* Warnings */}
      {activeWarnings.length > 0 && (
        <div style={{ background: C.ambersoft, border: `1px solid ${C.amber}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          {activeWarnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < activeWarnings.length - 1 ? 8 : 0 }}>
              <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, fontSize: 12, color: C.ink }}>{w.msg}</div>
              <button onClick={() => toggle(w.suggest)}
                style={{ fontSize: 11, color: C.amber, background: 'none', border: `1px solid ${C.amber}`, borderRadius: 5, padding: '2px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Add {w.suggest}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Group cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {GROUPS.map((group) => {
          const { Icon } = group;
          const keys = group.entities.map((e) => e.key);
          const allIn = keys.every((k) => selected.includes(k));
          const someIn = keys.some((k) => selected.includes(k));
          const isOpen = !collapsed[group.key];

          return (
            <div key={group.key} style={{ background: C.panel, border: `1px solid ${someIn ? C.primary : C.line}`, borderRadius: 10, overflow: 'hidden', boxShadow: C.shadow }}>
              <div
                onClick={() => setCollapsed((p) => ({ ...p, [group.key]: !p[group.key] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', background: someIn ? C.primarysoft : C.panel2 }}
              >
                <Icon size={16} color={someIn ? C.primary : C.muted} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: someIn ? C.primary : C.ink }}>{group.label}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{keys.filter((k) => selected.includes(k)).length}/{keys.length}</span>
                <input type="checkbox" checked={allIn} ref={(el) => { if (el) el.indeterminate = someIn && !allIn; }}
                  onChange={() => toggleGroup(group)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 15, height: 15, accentColor: C.primary, cursor: 'pointer' }} />
                {isOpen ? <ChevronDown size={14} color={C.muted} /> : <ChevronRight size={14} color={C.muted} />}
              </div>

              {isOpen && (
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.entities.map((e) => (
                    <Checkbox key={e.key} label={e.label} checked={selected.includes(e.key)}
                      onChange={() => toggle(e.key)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STEP 2: FILTERS ─────────────────────────────────────────────────────────
function FiltersStep({ config, setConfig, selected }) {
  const upd = (path, val) =>
    setConfig((prev) => {
      const next = { ...prev };
      const parts = path.split('.');
      let ref = next;
      for (let i = 0; i < parts.length - 1; i++) {
        ref[parts[i]] = { ...ref[parts[i]] };
        ref = ref[parts[i]];
      }
      ref[parts[parts.length - 1]] = val;
      return next;
    });

  const toggleFilter = (path, arr, val) => {
    upd(path, arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const toggleExclude = (entity, field) => {
    const cur = config.excludeFields?.[entity] ?? [];
    upd(`excludeFields.${entity}`, cur.includes(field) ? cur.filter((f) => f !== field) : [...cur, field]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Date range */}
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, margin: '0 0 14px' }}>Date Range</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 4 }}>From</label>
            <input type="date" value={config.dateRange?.start ?? ''}
              onChange={(e) => upd('dateRange.start', e.target.value)}
              style={{ fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 6, padding: '7px 10px', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 4 }}>To</label>
            <input type="date" value={config.dateRange?.end ?? ''}
              onChange={(e) => upd('dateRange.end', e.target.value)}
              style={{ fontSize: 13, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 6, padding: '7px 10px', outline: 'none' }} />
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: '10px 0 0' }}>
          Leave blank to export all records regardless of date.
        </p>
      </div>

      {/* StockOut status filter */}
      {selected.includes('StockOut') && (
        <FilterSection title="Stock Out — Payment Status">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {PAYMENT_STATUSES.map((s) => (
              <Checkbox key={s} label={s} checked={(config.filters?.StockOut?.paymentStatus ?? []).includes(s)}
                onChange={() => toggleFilter('filters.StockOut.paymentStatus', config.filters?.StockOut?.paymentStatus ?? [], s)} />
            ))}
          </div>
          <p style={{ fontSize: 11, color: C.muted, margin: '8px 0 0' }}>Leave all unchecked to include every status.</p>
        </FilterSection>
      )}

      {/* Expense status filter */}
      {selected.includes('Expense') && (
        <FilterSection title="Expenses — Status">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {EXPENSE_STATUSES.map((s) => (
              <Checkbox key={s} label={s} checked={(config.filters?.Expense?.status ?? []).includes(s)}
                onChange={() => toggleFilter('filters.Expense.status', config.filters?.Expense?.status ?? [], s)} />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Requisition status filter */}
      {selected.includes('Requisition') && (
        <FilterSection title="Requisitions — Status">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {REQ_STATUSES.map((s) => (
              <Checkbox key={s} label={s} checked={(config.filters?.Requisition?.status ?? []).includes(s)}
                onChange={() => toggleFilter('filters.Requisition.status', config.filters?.Requisition?.status ?? [], s)} />
            ))}
          </div>
        </FilterSection>
      )}

      {/* StockRequisition status filter */}
      {selected.includes('StockRequisition') && (
        <FilterSection title="Stock Requisitions — Status">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {STOCK_REQ_STATUSES.map((s) => (
              <Checkbox key={s} label={s} checked={(config.filters?.StockRequisition?.status ?? []).includes(s)}
                onChange={() => toggleFilter('filters.StockRequisition.status', config.filters?.StockRequisition?.status ?? [], s)} />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Sensitive field exclusions */}
      {(['Employee', 'Admin', 'Partner'].some((e) => selected.includes(e))) && (
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, margin: '0 0 4px' }}>Sensitive Field Exclusions</h3>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px' }}>
            Passwords are always excluded from Excel/PDF. Tick fields to also exclude them from the JSON backup.
          </p>

          {Object.entries(OPTIONAL_EXCLUDE).map(([entity, fields]) => {
            if (!selected.includes(entity)) return null;
            return (
              <div key={entity} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>{entity}</div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <Checkbox label="password" checked disabled onChange={() => {}} />
                  {fields.map((f) => (
                    <Checkbox key={f} label={f}
                      checked={(config.excludeFields?.[entity] ?? []).includes(f)}
                      onChange={() => toggleExclude(entity, f)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, margin: '0 0 12px' }}>{title}</h3>
      {children}
    </div>
  );
}

// ─── STEP 3: PREVIEW + EXPORT ─────────────────────────────────────────────────
function PreviewExportStep({ config, selected, onExport, isExporting }) {
  const [counts, setCounts] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [format, setFormat] = useState('json');

  const totalRows = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  const loadPreview = async () => {
    setIsPreviewing(true);
    setPreviewError(null);
    try {
      const result = await exportService.preview({ ...config, entities: selected });
      setCounts(result);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const FORMATS = [
    { key: 'json', label: 'JSON', sub: 'Primary — re-importable full backup', Icon: FileJson, color: C.amber },
    { key: 'excel', label: 'Excel (.xlsx)', sub: 'Multi-sheet workbook', Icon: FileSpreadsheet, color: C.green },
    { key: 'pdf', label: 'PDF', sub: 'Review format, first 100 rows/entity', Icon: FileText, color: C.red },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Preview */}
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, margin: 0 }}>Record Counts Preview</h3>
          <button onClick={loadPreview} disabled={isPreviewing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fff', background: C.primary, border: 'none', borderRadius: 7, padding: '7px 14px', cursor: isPreviewing ? 'not-allowed' : 'pointer', opacity: isPreviewing ? 0.7 : 1 }}>
            <RefreshCw size={13} style={{ animation: isPreviewing ? 'spin 1s linear infinite' : 'none' }} />
            {isPreviewing ? 'Loading…' : 'Load Preview'}
          </button>
        </div>

        {previewError && (
          <div style={{ background: C.redsoft, border: `1px solid ${C.red}`, borderRadius: 7, padding: '10px 12px', fontSize: 12, color: C.red }}>
            {previewError}
          </div>
        )}

        {counts && (
          <>
            {totalRows > 10000 && (
              <div style={{ background: C.ambersoft, border: `1px solid ${C.amber}`, borderRadius: 7, padding: '8px 12px', fontSize: 12, color: C.ink, marginBottom: 12, display: 'flex', gap: 8 }}>
                <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                Large export ({totalRows.toLocaleString()} total rows). This may take several seconds.
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.panel2 }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.line}` }}>Entity</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.line}` }}>Records</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(counts).map(([entity, count], i) => (
                  <tr key={entity} style={{ background: i % 2 ? C.panel2 : C.panel }}>
                    <td style={{ padding: '7px 10px', color: C.ink }}>{entity}</td>
                    <td style={{ padding: '7px 10px', color: C.ink, textAlign: 'right', fontWeight: 600 }}>
                      {count.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: C.primarysoft }}>
                  <td style={{ padding: '7px 10px', color: C.primary, fontWeight: 700 }}>Total</td>
                  <td style={{ padding: '7px 10px', color: C.primary, textAlign: 'right', fontWeight: 700 }}>{totalRows.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {!counts && !isPreviewing && !previewError && (
          <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '16px 0' }}>
            Click "Load Preview" to see record counts before downloading.
          </p>
        )}
      </div>

      {/* Format */}
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, margin: '0 0 14px' }}>Export Format</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FORMATS.map(({ key, label, sub, Icon, color }) => (
            <label key={key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              border: `1px solid ${format === key ? color : C.line}`,
              background: format === key ? (key === 'json' ? C.ambersoft : key === 'excel' ? C.greensoft : C.redsoft) : C.panel2,
              borderRadius: 8, cursor: 'pointer',
            }}>
              <input type="radio" name="format" value={key} checked={format === key} onChange={() => setFormat(key)}
                style={{ accentColor: color }} />
              <Icon size={20} color={color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>
              </div>
              {key === 'json' && (
                <span style={{ fontSize: 10, background: C.amber, color: '#fff', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                  RECOMMENDED
                </span>
              )}
            </label>
          ))}
        </div>

        {format === 'json' && (
          <div style={{ display: 'flex', gap: 8, background: C.primarysoft, borderRadius: 7, padding: '10px 12px', marginTop: 12 }}>
            <Info size={14} color={C.primary} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: C.primary, margin: 0 }}>
              JSON preserves all data including IDs and relationships. You can import this file later to restore your data exactly.
            </p>
          </div>
        )}
      </div>

      {/* Download button */}
      <button
        onClick={() => onExport(format, counts ?? {})}
        disabled={isExporting || selected.length === 0}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '14px 24px', background: isExporting ? C.muted : C.primary,
          color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
          cursor: isExporting || selected.length === 0 ? 'not-allowed' : 'pointer',
          opacity: selected.length === 0 ? 0.5 : 1,
        }}
      >
        {isExporting ? (
          <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Exporting…</>
        ) : (
          <><Download size={18} /> Download {format.toUpperCase()}</>
        )}
      </button>
    </div>
  );
}

// ─── IMPORT TAB ───────────────────────────────────────────────────────────────
function ImportTab() {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    setFile(f);
    setParsed(null);
    setParseError(null);
    setResult(null);
    setImportError(null);

    if (!f) return;

    if (f.size > 9 * 1024 * 1024) {
      setParseError('File is too large (max ~9 MB). Export in smaller date ranges and import each part separately.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (json.version !== '1.0' || json.system !== 'aby-inventor') {
          setParseError('Invalid file. This JSON was not exported from Aby Inventor.');
          return;
        }
        setParsed(json);
      } catch {
        setParseError('Failed to parse JSON. Make sure the file is a valid Aby Inventor backup.');
      }
    };
    reader.readAsText(f);
  };

  const doImport = async () => {
    if (!parsed) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const res = await exportService.importData(parsed);
      setResult(res);
    } catch (err) {
      setImportError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null); setParsed(null); setParseError(null);
    setResult(null); setImportError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? C.primary : C.line}`,
            background: dragging ? C.primarysoft : C.panel2,
            borderRadius: 12, padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Upload size={36} color={dragging ? C.primary : C.muted} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>
            {file ? file.name : 'Drop your backup JSON here'}
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            or click to browse — only .json files from Aby Inventor
          </p>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}

      {parseError && (
        <div style={{ background: C.redsoft, border: `1px solid ${C.red}`, borderRadius: 8, padding: '12px 14px', fontSize: 13, color: C.red, display: 'flex', gap: 8 }}>
          <XCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {parseError}
        </div>
      )}

      {/* Parsed preview */}
      {parsed && !result && (
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, margin: '0 0 6px' }}>File Preview</h3>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px' }}>
            Exported on {new Date(parsed.exportedAt).toLocaleString()} · {parsed.entities?.length} entity types
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.panel2 }}>
                <th style={{ textAlign: 'left', padding: '7px 10px', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.line}` }}>Entity</th>
                <th style={{ textAlign: 'right', padding: '7px 10px', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.line}` }}>Records in file</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(parsed.data).map(([entity, rows], i) => (
                <tr key={entity} style={{ background: i % 2 ? C.panel2 : C.panel }}>
                  <td style={{ padding: '7px 10px', color: C.ink }}>{entity}</td>
                  <td style={{ padding: '7px 10px', color: C.ink, textAlign: 'right', fontWeight: 600 }}>{rows.length.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, padding: '10px 12px', background: C.primarysoft, borderRadius: 8 }}>
            <Info size={14} color={C.primary} style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: C.primary, margin: 0 }}>
              Records that already exist (same ID) will be <strong>skipped</strong>. New records will be <strong>created</strong>. No data will be overwritten.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={reset}
              style={{ flex: 1, padding: '10px', fontSize: 13, color: C.muted, background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, cursor: 'pointer' }}>
              Choose Different File
            </button>
            <button onClick={doImport} disabled={isImporting}
              style={{ flex: 2, padding: '10px', fontSize: 13, fontWeight: 700, color: '#fff', background: isImporting ? C.muted : C.green, border: 'none', borderRadius: 8, cursor: isImporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isImporting ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importing…</> : <><Upload size={14} /> Confirm Import</>}
            </button>
          </div>
        </div>
      )}

      {importError && (
        <div style={{ background: C.redsoft, border: `1px solid ${C.red}`, borderRadius: 8, padding: '12px 14px', fontSize: 13, color: C.red }}>
          {importError}
        </div>
      )}

      {/* Import result */}
      {result && (
        <div style={{ background: C.panel, border: `1px solid ${C.green}`, borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <CheckCircle2 size={22} color={C.green} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.green, margin: 0 }}>Import Complete</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total Processed', val: result.summary.totalProcessed, color: C.ink },
              { label: 'Created', val: result.summary.created, color: C.green },
              { label: 'Skipped (exists)', val: result.summary.skipped, color: C.amber },
              { label: 'Errors', val: result.summary.errors, color: C.red },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: C.panel2, borderRadius: 8, padding: '12px 14px', textAlign: 'center', border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Per-entity detail */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.panel2 }}>
                {['Entity', 'Created', 'Skipped', 'Errors'].map((h) => (
                  <th key={h} style={{ textAlign: h === 'Entity' ? 'left' : 'right', padding: '6px 10px', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.line}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.details).map(([entity, r], i) => (
                <tr key={entity} style={{ background: i % 2 ? C.panel2 : C.panel }}>
                  <td style={{ padding: '6px 10px', color: C.ink }}>{entity}</td>
                  <td style={{ padding: '6px 10px', color: C.green, textAlign: 'right', fontWeight: 600 }}>{r.created}</td>
                  <td style={{ padding: '6px 10px', color: C.amber, textAlign: 'right' }}>{r.skipped}</td>
                  <td style={{ padding: '6px 10px', color: r.errors.length ? C.red : C.muted, textAlign: 'right' }}>{r.errors.length}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Show errors if any */}
          {Object.entries(result.details).some(([, r]) => r.errors.length > 0) && (
            <div style={{ marginTop: 14, background: C.redsoft, border: `1px solid ${C.red}`, borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.red, margin: '0 0 8px' }}>Error details:</p>
              {Object.entries(result.details).flatMap(([entity, r]) =>
                r.errors.map((err, i) => (
                  <p key={`${entity}-${i}`} style={{ fontSize: 11, color: C.red, margin: '0 0 4px', fontFamily: 'monospace' }}>
                    [{entity}] {err}
                  </p>
                ))
              )}
            </div>
          )}

          <button onClick={reset} style={{ marginTop: 16, padding: '9px 18px', fontSize: 13, color: C.primary, background: C.primarysoft, border: `1px solid ${C.primary}`, borderRadius: 8, cursor: 'pointer' }}>
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ExportDataPage() {
  const [tab, setTab] = useState('export');
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState([]);
  const [config, setConfig] = useState({
    dateRange: { start: '', end: '' },
    filters: {},
    excludeFields: {},
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const handleExport = async (format, counts) => {
    setIsExporting(true);
    setExportError(null);
    try {
      const data = await exportService.exportData({ ...config, entities: selected });
      if (format === 'json') generateJSON(data, config, counts);
      else if (format === 'excel') generateExcel(data, config, counts);
      else if (format === 'pdf') generatePDF(data, config, counts);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const STEPS = ['Select Entities', 'Date & Filters', 'Preview & Download'];
  const canNext = step === 1 ? selected.length > 0 : true;

  return (
    <>
      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: '0 0 4px' }}>
            Export &amp; Import Data
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Back up your entire project to JSON or generate Excel/PDF reports. Import a backup file to restore data.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 24 }}>
          {[{ key: 'export', label: 'Export', Icon: Download }, { key: 'import', label: 'Import', Icon: Upload }].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => { setTab(key); setStep(1); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', fontSize: 13, fontWeight: 600,
                background: tab === key ? C.panel : 'transparent',
                color: tab === key ? C.primary : C.muted,
                border: tab === key ? `1px solid ${C.line}` : '1px solid transparent',
                borderRadius: 8, cursor: 'pointer', boxShadow: tab === key ? C.shadow : 'none',
                transition: 'all 0.15s',
              }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {tab === 'export' && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Step sidebar */}
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 20px', minWidth: 180, boxShadow: C.shadow }}>
              {STEPS.map((label, i) => {
                const n = i + 1;
                const active = step === n;
                const done = step > n;
                return (
                  <div key={n}
                    onClick={() => { if (n < step || (n === step + 1 && canNext)) setStep(n); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', cursor: done || (n === step + 1 && canNext) ? 'pointer' : 'default', opacity: n > step + 1 ? 0.4 : 1 }}>
                    <StepBadge n={n} active={active} done={done} />
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.primary : done ? C.green : C.muted }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 24, boxShadow: C.shadow, marginBottom: 16 }}>
                {step === 1 && <EntitySelectionStep selected={selected} setSelected={setSelected} />}
                {step === 2 && <FiltersStep config={config} setConfig={setConfig} selected={selected} />}
                {step === 3 && <PreviewExportStep config={config} selected={selected} onExport={handleExport} isExporting={isExporting} />}
              </div>

              {exportError && (
                <div style={{ background: C.redsoft, border: `1px solid ${C.red}`, borderRadius: 8, padding: '12px 14px', fontSize: 13, color: C.red, marginBottom: 12 }}>
                  {exportError}
                </div>
              )}

              {/* Step navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep((s) => s - 1)} disabled={step === 1}
                  style={{ padding: '9px 20px', fontSize: 13, color: C.muted, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, cursor: step === 1 ? 'not-allowed' : 'pointer', opacity: step === 1 ? 0.4 : 1 }}>
                  ← Back
                </button>
                {step < 3 && (
                  <button onClick={() => setStep((s) => s + 1)} disabled={!canNext}
                    style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, color: '#fff', background: canNext ? C.primary : C.muted, border: 'none', borderRadius: 8, cursor: canNext ? 'pointer' : 'not-allowed' }}>
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'import' && (
          <div style={{ maxWidth: 680 }}>
            <ImportTab />
          </div>
        )}
      </div>
    </>
  );
}
