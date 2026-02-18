import { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jobService from '../../services/jobService';
import {
  STATUS_DB_MAP,
  STATUS_DISPLAY_MAP,
} from '../../constants/jobFileConstants';

// Column definitions: key = Supabase field, label = display name, aliases = Excel header matches
const UPLOAD_COLUMNS = [
  // Identity
  { key: 'job_number', label: 'Job #', aliases: ['jobnumber', 'jobno', 'job', 'jobid', 'jobnbr'] },
  { key: 'customer_name', label: 'Customer', aliases: ['customer', 'client', 'customername', 'customerjobname', 'clientname'] },
  { key: 'property_address', label: 'Address', aliases: ['address', 'propertyaddress', 'lossaddress', 'address1'] },
  { key: 'city', label: 'City', aliases: ['city'] },
  { key: 'state', label: 'State', aliases: ['state', 'st'] },
  { key: 'zip', label: 'Zip', aliases: ['zip', 'postalcode', 'postal', 'zipcode'] },
  // Status & classification
  { key: 'status', label: 'Status', aliases: ['status', 'jobstatus'] },
  { key: 'stage', label: 'Stage', aliases: ['stage', 'jobstage'] },
  { key: 'division', label: 'Division', aliases: ['division', 'div'] },
  { key: 'job_group', label: 'Group', aliases: ['group', 'jobgroup'] },
  { key: 'department', label: 'Job Type', aliases: ['department', 'dept', 'jobtype', 'type', 'lostype', 'losstype'] },
  { key: 'property_type', label: 'Prop Type', aliases: ['propertytype', 'proptype'] },
  // Personnel
  { key: 'pm', label: 'PM', aliases: ['pm', 'projectmanager'] },
  { key: 'crew_chief', label: 'Crew Chief', aliases: ['crewchief', 'crew', 'cc'] },
  { key: 'jfc', label: 'JFC', aliases: ['jfc', 'jobfilecoordinator'] },
  { key: 'estimator', label: 'Estimator', aliases: ['estimator', 'est'] },
  { key: 'estimate_owner', label: 'Est Owner', aliases: ['estimateowner', 'estowner'] },
  { key: 'sales_person', label: 'BDR', aliases: ['salesperson', 'bdr', 'businessdev', 'sales'] },
  // Financials
  { key: 'estimate_value', label: 'Estimate $', aliases: ['estimate', 'estimatevalue', 'estvalue', 'estimateamount'], type: 'currency' },
  { key: 'invoiced_amount', label: 'Invoiced $', aliases: ['invoiced', 'invoicedamount', 'invoiceamt'], type: 'currency' },
  { key: 'subcontractor_cost', label: 'Sub Cost', aliases: ['subcontractorcost', 'subcost', 'subs'], type: 'currency' },
  { key: 'labor_cost', label: 'Labor Cost', aliases: ['laborcost', 'labor'], type: 'currency' },
  { key: 'ar_balance', label: 'AR Balance', aliases: ['arbalance', 'ar', 'accountsreceivable'], type: 'currency' },
  // Dates
  { key: 'date_of_loss', label: 'Loss Date', aliases: ['dateofloss', 'lossdate', 'dol'], type: 'date' },
  { key: 'date_received', label: 'Received', aliases: ['datereceived', 'received', 'daterecvd'], type: 'date' },
  { key: 'date_started', label: 'Started', aliases: ['datestarted', 'started', 'startdate'], type: 'date' },
  { key: 'target_completion_date', label: 'Target Date', aliases: ['targetcompletiondate', 'targetdate', 'duedate'], type: 'date' },
  { key: 'date_invoiced', label: 'Invoiced Date', aliases: ['dateinvoiced', 'invoicedate'], type: 'date' },
  // Insurance
  { key: 'insurance_company', label: 'Carrier', aliases: ['insurancecompany', 'carrier', 'insco'] },
  { key: 'insurance_adjuster_name', label: 'Adjuster', aliases: ['adjustername', 'adjuster'] },
  // Other
  { key: 'days_active', label: 'Days Active', aliases: ['daysactive', 'ofdaysactive'], type: 'number' },
  { key: 'internal_notes', label: 'Notes', aliases: ['notes', 'internalnotes', 'jobnotes'] },
];

function normalize(str) {
  return String(str).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findExcelKey(excelKeys, aliases) {
  return excelKeys.find(k => aliases.includes(normalize(k))) || null;
}

function parseValue(val, type) {
  if (val === '' || val === null || val === undefined) return null;
  if (type === 'currency') {
    const n = parseFloat(String(val).replace(/[$,]/g, ''));
    return isNaN(n) ? null : n;
  }
  if (type === 'number') {
    const n = parseInt(String(val), 10);
    return isNaN(n) ? null : n;
  }
  if (type === 'date') {
    // Handle Excel serial dates
    if (typeof val === 'number') {
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
  }
  return String(val).trim();
}

function mapStatus(val) {
  if (!val) return null;
  const upper = String(val).trim().toUpperCase();
  // Check display → db map
  if (STATUS_DB_MAP[upper]) return STATUS_DB_MAP[upper];
  // Check if it's already a db value
  const dbValues = Object.values(STATUS_DB_MAP);
  const lower = upper.toLowerCase();
  if (dbValues.includes(lower)) return lower;
  // Fuzzy
  if (lower.includes('pend')) return 'pending';
  if (lower.includes('wip') || lower.includes('progress')) return 'wip';
  if (lower.includes('bill')) return 'ready_to_bill';
  if (lower === 'ar') return 'ar';
  if (lower.includes('close')) return 'closed';
  if (lower.includes('complete')) return 'complete';
  return null;
}

// "Last, First" → "First Last"
function flipName(name) {
  if (!name || typeof name !== 'string') return name;
  const parts = name.split(',');
  if (parts.length === 2) {
    const last = parts[0].trim();
    const first = parts[1].trim();
    if (first && last) return `${first} ${last}`;
  }
  return name.trim();
}

function parseExcel(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', blankrows: false });
  if (!json.length) return { rows: [], mapping: [] };

  const excelKeys = Object.keys(json[0]);

  // Auto-map columns
  const mapping = UPLOAD_COLUMNS.map(col => ({
    ...col,
    excelKey: findExcelKey(excelKeys, col.aliases),
  }));

  // Parse rows
  const seen = new Set();
  const rows = json
    .filter(row => {
      const jobCol = mapping.find(m => m.key === 'job_number');
      if (!jobCol?.excelKey) return true; // no job # column, include all
      const jn = String(row[jobCol.excelKey]).trim();
      if (!jn) return false;
      if (seen.has(jn)) return false;
      seen.add(jn);
      return true;
    })
    .map(row => {
      const parsed = {};
      mapping.forEach(col => {
        if (!col.excelKey) return;
        let val = parseValue(row[col.excelKey], col.type);
        if (col.key === 'status') val = mapStatus(val);
        if (col.key === 'customer_name') val = flipName(val);
        parsed[col.key] = val;
      });
      return parsed;
    });

  return { rows, mapping, excelKeys };
}

export default function JobBulkUpload({ onComplete }) {
  const [rows, setRows] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [excelKeys, setExcelKeys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const { rows: parsed, mapping: map, excelKeys: keys } = parseExcel(wb);
        if (parsed.length) {
          setRows(parsed);
          setMapping(map);
          setExcelKeys(keys);
          setSaveResult(null);
          setSaveError(null);
        }
      } catch { /* ignore */ }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const mappedCount = useMemo(() => mapping?.filter(m => m.excelKey).length || 0, [mapping]);

  const handleSave = async () => {
    if (!rows) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await jobService.bulkImportJobs(rows);
      setSaveResult(result);
      if (result.errors?.length) console.error('Import errors:', result.errors);
    } catch (err) {
      setSaveError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setRows(null);
    setMapping(null);
    setExcelKeys([]);
    setSaveResult(null);
    setSaveError(null);
    if (onComplete) onComplete();
  };

  const formatVal = (val, type) => {
    if (val === null || val === undefined || val === '') return '-';
    if (type === 'currency') return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return String(val);
  };

  // Show only columns that were mapped
  const visibleCols = useMemo(() => mapping?.filter(m => m.excelKey) || [], [mapping]);

  if (saveResult) {
    return (
      <div className="bulk-upload-panel">
        <div className="bulk-upload-result">
          <h3>Import Complete</h3>
          <div className="bulk-result-stats">
            <div className="bulk-stat">
              <span className="bulk-stat-num">{saveResult.created}</span>
              <span className="bulk-stat-label">Created</span>
            </div>
            <div className="bulk-stat">
              <span className="bulk-stat-num">{saveResult.updated}</span>
              <span className="bulk-stat-label">Updated</span>
            </div>
            <div className="bulk-stat">
              <span className="bulk-stat-num">{saveResult.skipped}</span>
              <span className="bulk-stat-label">Skipped</span>
            </div>
            {saveResult.errors?.length > 0 && (
              <div className="bulk-stat bulk-stat-error">
                <span className="bulk-stat-num">{saveResult.errors.length}</span>
                <span className="bulk-stat-label">Errors</span>
              </div>
            )}
          </div>
          {saveResult.errors?.length > 0 && (
            <p style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '0.5rem' }}>
              Check browser console (F12) for error details
            </p>
          )}
          <button className="btn-primary" onClick={handleClose} style={{ marginTop: '1rem' }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bulk-upload-panel">
      {!rows ? (
        <div className="bulk-upload-area">
          <div className="bulk-upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className="bulk-upload-text">
            Upload an Excel file to bulk import or update jobs. Columns are auto-mapped by header name.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>
            Select File
          </button>
          <button className="btn-cancel" onClick={handleClose} style={{ marginTop: '0.5rem' }}>
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="bulk-upload-header">
            <div>
              <h3>{rows.length} jobs parsed</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                {mappedCount} of {UPLOAD_COLUMNS.length} columns mapped
              </p>
            </div>
            <div className="bulk-upload-actions">
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save to Supabase'}
              </button>
              <button className="btn-cancel" onClick={handleClose}>Cancel</button>
            </div>
          </div>

          {saveError && (
            <div style={{ padding: '8px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', fontSize: '13px', color: '#dc2626' }}>
              {saveError}
            </div>
          )}

          <div className="bulk-preview-scroll">
            <table className="bulk-preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  {visibleCols.map(col => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row, i) => (
                  <tr key={i}>
                    <td className="bulk-row-num">{i + 1}</td>
                    {visibleCols.map(col => (
                      <td key={col.key} title={formatVal(row[col.key], col.type)}>
                        {col.key === 'status' ? (
                          <span className={`status-badge status-${row[col.key] || ''}`}>
                            {STATUS_DISPLAY_MAP[row[col.key]] || row[col.key] || '-'}
                          </span>
                        ) : (
                          formatVal(row[col.key], col.type)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && (
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '0.5rem' }}>
                Showing first 100 of {rows.length} rows
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
