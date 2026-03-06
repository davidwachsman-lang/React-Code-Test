import React, { useRef, useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import masterTableService from '../services/masterTableService';
import './Page.css';
import './DashImport.css';

// Excel header → DB column mapping
const COLUMN_MAP = {
  'Job Number': 'job_number',
  'Job Status': 'job_status',
  'Date Started': 'date_started',
  'Customer': 'customer',
  'Job Name': 'job_name',
  'Division': 'division',
  'Reason For Closing': 'reason_for_closing',
  'Loss Category': 'loss_category',
  'Supervisor': 'supervisor',
  'Target Completion Date': 'target_completion_date',
  'Foreperson': 'foreperson',
  'Coordinator': 'coordinator',
  'Estimator': 'estimator',
  'Marketing Person': 'marketing_person',
  'Date Received': 'date_received',
  'Claim Number': 'claim_number',
  'State': 'state',
  'Target Start Date': 'target_start_date',
  'Date Inventoried': 'date_inventoried',
  'Customer Primary Contact Number': 'customer_primary_contact_number',
  'Date Inspected': 'date_inspected',
  'Estimate Sent Date': 'estimate_sent_date',
  'City': 'city',
  'Date of Majority Completion': 'date_of_majority_completion',
  'Date Invoiced': 'date_invoiced',
  'Date Paid': 'date_paid',
  'Date Closed': 'date_closed',
  'Address': 'address',
  'ZIP': 'zip',
  'Total Estimates': 'total_estimates',
  'Total Invoiced': 'total_invoiced',
  'Referred By': 'referred_by',
  'Referral Type': 'referral_type',
  'Reported By': 'reported_by',
  'Total Job Cost': 'total_job_cost',
  'Estimated GP(%) (From Estimate Import)': 'estimated_gp_pct',
  'Working Gross Profit(%)': 'working_gross_profit_pct',
  'Actual Gross Profit(%)': 'actual_gross_profit_pct',
  'Total Collected': 'total_collected',
  'Survey Score': 'survey_score',
  'External File Number': 'external_file_number',
  'Last Journal Note Event Date/Time': 'last_journal_note_datetime',
  'Last Journal Note Entered': 'last_journal_note_entered',
  'Company Contact Name': 'company_contact_name',
  'Insured Contacted': 'insured_contacted',
  'Tags': 'tags',
  'Estimate Owner': 'estimate_owner',
  'Dispatcher': 'dispatcher',
};

// Columns that contain dates (Excel serial → ISO string)
const DATE_COLUMNS = new Set([
  'date_started', 'target_completion_date', 'date_received',
  'target_start_date', 'date_inventoried', 'date_inspected',
  'estimate_sent_date', 'date_of_majority_completion', 'date_invoiced',
  'date_paid', 'date_closed', 'last_journal_note_datetime', 'insured_contacted',
]);

// Columns that are numeric money/pct values (NOT dates even if they look like serials)
const NUMERIC_COLUMNS = new Set([
  'total_estimates', 'total_invoiced', 'total_job_cost',
  'estimated_gp_pct', 'working_gross_profit_pct', 'actual_gross_profit_pct',
  'total_collected',
]);

/**
 * Convert an Excel serial date number to an ISO date string.
 * Returns the original value if it's not a valid serial.
 */
function excelSerialToISO(val) {
  if (typeof val !== 'number' || val <= 0) return val;
  const parsed = XLSX.SSF.parse_date_code(val);
  if (!parsed) return val;
  const y = parsed.y;
  const m = String(parsed.m).padStart(2, '0');
  const d = String(parsed.d).padStart(2, '0');
  if (parsed.H !== undefined && (parsed.H > 0 || parsed.M > 0 || parsed.S > 0)) {
    const H = String(parsed.H).padStart(2, '0');
    const M = String(parsed.M).padStart(2, '0');
    const S = String(parsed.S).padStart(2, '0');
    return `${y}-${m}-${d}T${H}:${M}:${S}`;
  }
  return `${y}-${m}-${d}`;
}

/**
 * Map a raw Excel row object to a DB-ready row using COLUMN_MAP.
 */
function mapRow(rawRow) {
  const mapped = {};
  for (const [excelHeader, dbCol] of Object.entries(COLUMN_MAP)) {
    let val = rawRow[excelHeader];
    if (val === '' || val === undefined || val === null) {
      mapped[dbCol] = null;
      continue;
    }
    if (DATE_COLUMNS.has(dbCol) && typeof val === 'number') {
      val = excelSerialToISO(val);
    } else if (NUMERIC_COLUMNS.has(dbCol)) {
      // Keep as number; convert strings like "$1,234.56" to number
      if (typeof val === 'string') {
        const cleaned = val.replace(/[$,%]/g, '').replace(/,/g, '');
        const num = parseFloat(cleaned);
        val = isNaN(num) ? null : num;
      }
    }
    mapped[dbCol] = val;
  }
  return mapped;
}

// DB columns for TanStack table (human-readable header + accessor)
const DB_COLUMNS = Object.entries(COLUMN_MAP).map(([header, accessor]) => ({
  header,
  accessor,
}));

function DashImport() {
  const fileInputRef = useRef(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // View state
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);

  // Table state
  const [sorting, setSorting] = useState([]);
  const [expandedCell, setExpandedCell] = useState(null);

  const toggleCell = useCallback((cellId) => {
    setExpandedCell((prev) => (prev === cellId ? null : cellId));
  }, []);

  // ---------- Upload flow ----------
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setUploadError(null);
    setUploadProgress({ current: 0, total: 0 });

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const mappedRows = rawRows.map(mapRow);
      setUploadProgress({ current: 0, total: mappedRows.length });

      const result = await masterTableService.truncateAndInsert(
        mappedRows,
        (inserted, total) => setUploadProgress({ current: inserted, total })
      );

      setUploadResult(result);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---------- View flow ----------
  const handleView = async () => {
    setViewLoading(true);
    setViewError(null);
    try {
      const rows = await masterTableService.getAll();
      setViewData(rows);
    } catch (err) {
      console.error('View failed:', err);
      setViewError(err.message || 'Failed to load data');
    } finally {
      setViewLoading(false);
    }
  };

  // ---------- TanStack columns ----------
  const columns = useMemo(
    () =>
      DB_COLUMNS.map(({ header, accessor }) => ({
        accessorKey: accessor,
        header,
        cell: ({ getValue }) => {
          const v = getValue();
          if (v === null || v === undefined) return '';
          return String(v);
        },
      })),
    []
  );

  const table = useReactTable({
    data: viewData || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  const paginationState = table.getState().pagination;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dash Import</h1>
        <p className="page-subtitle">Import data from Dash super reports</p>
      </div>

      {/* Action buttons */}
      <div className="dash-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          className="dash-btn dash-btn-blue"
          disabled={uploading}
          onClick={() => fileInputRef.current.click()}
        >
          {uploading ? 'Uploading...' : 'Upload Dash Super Report'}
        </button>
        <button
          className="dash-btn dash-btn-green"
          disabled={uploading || viewLoading}
          onClick={handleView}
        >
          {viewLoading ? 'Loading...' : 'View Super Report'}
        </button>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="dash-status">
          <div className="dash-progress-bar">
            <div
              className="dash-progress-fill"
              style={{
                width: uploadProgress.total
                  ? `${(uploadProgress.current / uploadProgress.total) * 100}%`
                  : '0%',
              }}
            />
          </div>
          <p className="dash-status-text">
            Uploading... {uploadProgress.current.toLocaleString()} / {uploadProgress.total.toLocaleString()}
          </p>
        </div>
      )}

      {/* Upload result */}
      {uploadResult && (
        <div className="dash-status dash-success">
          Done! {uploadResult.inserted.toLocaleString()} rows imported.
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="dash-status dash-error">
          Upload failed: {uploadError}
        </div>
      )}

      {/* View error */}
      {viewError && (
        <div className="dash-status dash-error">
          {viewError}
        </div>
      )}

      {/* Data table */}
      {viewData && (
        <div className="dash-table-section">
          <div className="dash-table-header">
            <span>{viewData.length.toLocaleString()} rows</span>
            <button
              className="dash-btn-close"
              onClick={() => setViewData(null)}
            >
              Close Table
            </button>
          </div>

          <div className="dash-table-scroll">
            <table className="dash-table">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize(), position: 'relative' }}
                      >
                        <div
                          className="dash-th-content"
                          onClick={header.column.getToggleSortingHandler()}
                          style={{ cursor: 'pointer' }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className={`sort-indicator${header.column.getIsSorted() ? ' sort-active' : ''}`}>
                            {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted()] ?? ' ⇅'}
                          </span>
                        </div>
                        <div
                          className={`dash-resize-handle${header.column.getIsResizing() ? ' resizing' : ''}`}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                        />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const val = cell.getValue();
                      const text = val != null ? String(val) : '';
                      return (
                        <td
                          key={cell.id}
                          className={expandedCell === cell.id ? 'expanded' : ''}
                          style={{ width: cell.column.getSize() }}
                          title={text}
                          onClick={() => toggleCell(cell.id)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="dash-pagination">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {'<<'}
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {'<'}
            </button>
            <span className="dash-page-info">
              Page {paginationState.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {'>'}
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {'>>'}
            </button>
            <select
              value={paginationState.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[25, 50, 100, 200].map((size) => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashImport;
