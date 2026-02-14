import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import './Page.css';
import './JobFileChecks.css';

const FILE_CHECK_HEADERS = [
  'ATP', 'SKETCH', 'VALIDATION', 'SCOPES', 'NOTES', 'PHOTOS', 'VERBAL BRIEF', 'MONITORING',
];

const INFO_COLUMNS = [
  { label: 'Customer', aliases: ['customer', 'client', 'customername'] },
  { label: 'PM', aliases: ['pm', 'projectmanager'] },
  { label: 'Crew Chief', aliases: ['crewchief', 'crew'] },
];

function fuzzyMatch(colName, target) {
  const a = String(colName).trim().toLowerCase().replace(/[^a-z]/g, '');
  const b = target.toLowerCase().replace(/[^a-z]/g, '');
  return a === b;
}

function findKey(keys, aliases) {
  return keys.find((k) => {
    const n = k.trim().toLowerCase().replace(/[^a-z]/g, '');
    return aliases.includes(n);
  }) || null;
}

function parseFileChecks(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!json.length) return [];

  const keys = Object.keys(json[0]);

  const jobKey = keys.find((k) => {
    const n = k.trim().toLowerCase().replace(/[^a-z]/g, '');
    return n === 'jobnumber' || n === 'jobno' || n === 'job';
  });

  const infoKeys = INFO_COLUMNS.map((col) => findKey(keys, col.aliases));

  const checkKeys = FILE_CHECK_HEADERS.map((h) =>
    keys.find((k) => fuzzyMatch(k, h)) || null
  );

  return json
    .filter((row) => jobKey && String(row[jobKey]).trim())
    .map((row) => ({
      jobNumber: String(row[jobKey]).trim(),
      info: infoKeys.map((ik) => (ik ? String(row[ik] ?? '').trim() : '')),
      checks: checkKeys.map((ck) => {
        if (!ck) return false;
        const v = row[ck];
        return v !== '' && v !== null && v !== undefined;
      }),
    }));
}

// sort key types: 'job' | 'info-0'..'info-2' | 'check-0'..'check-7'
function compareFn(a, b, key, dir) {
  let av, bv;
  if (key === 'job') {
    av = a.jobNumber; bv = b.jobNumber;
  } else if (key.startsWith('info-')) {
    const i = Number(key.split('-')[1]);
    av = a.info[i]; bv = b.info[i];
  } else {
    const i = Number(key.split('-')[1]);
    av = a.checks[i] ? 1 : 0; bv = b.checks[i] ? 1 : 0;
  }
  if (typeof av === 'string') {
    const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  }
  return dir === 'asc' ? av - bv : bv - av;
}

function JobFileChecks() {
  const [rows, setRows] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const fileRef = useRef(null);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleCheck = (rowIndex, checkIndex) => {
    setRows((prev) => prev.map((row, ri) =>
      ri === rowIndex
        ? { ...row, checks: row.checks.map((v, ci) => ci === checkIndex ? !v : v) }
        : row
    ));
  };

  // Keep original indices so toggles target the right row after sorting
  const indexedRows = rows ? rows.map((row, i) => ({ ...row, _i: i })) : null;
  const sortedRows = indexedRows && sortKey
    ? [...indexedRows].sort((a, b) => compareFn(a, b, sortKey, sortDir))
    : indexedRows;

  const sortIndicator = (key) => {
    if (sortKey !== key) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const parsed = parseFileChecks(wb);
        if (parsed.length) setRows(parsed);
      } catch { /* ignore bad files */ }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const clear = () => {
    setRows(null);
    setSortKey(null);
    setSortDir('asc');
    if (fileRef.current) fileRef.current.value = '';
  };

  const presentCount = rows
    ? rows.reduce((sum, r) => sum + r.checks.filter(Boolean).length, 0)
    : 0;
  const totalCount = rows ? rows.length * FILE_CHECK_HEADERS.length : 0;

  return (
    <div className="page-container">
      <h1>Job File Checks</h1>
      <p className="jfc-subtitle">
        Upload an Excel file to verify job file statuses across the 8 compliance checks.
      </p>

      <div className="jfc-card">
        <div className="jfc-card-header">
          <span className="jfc-card-title">
            {rows ? `${rows.length} Jobs Loaded` : 'Upload File'}
          </span>
          <div className="jfc-card-actions">
            {rows && (
              <span className="jfc-summary">
                {presentCount}/{totalCount} present
              </span>
            )}
            {rows ? (
              <button className="jfc-clear-btn" onClick={clear}>Clear</button>
            ) : null}
          </div>
        </div>

        {!rows ? (
          <div className="jfc-upload-area">
            <div className="jfc-upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="jfc-upload-text">
              Upload an Excel file (.xlsx, .xls, .csv) with a <strong>Job Number</strong> column
              and any of the 8 file check columns.
            </p>
            <div className="jfc-upload-checks">
              {FILE_CHECK_HEADERS.map((h, i) => (
                <span key={i} className="jfc-upload-check-tag">{h}</span>
              ))}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <button
              className="jfc-upload-btn"
              onClick={() => fileRef.current?.click()}
            >
              Upload Job Files
            </button>
          </div>
        ) : (
          <div className="jfc-table-wrap">
            <table className="jfc-table">
              <thead>
                <tr>
                  <th className="jfc-th-job jfc-th-sortable" onClick={() => handleSort('job')}>
                    Job #{sortIndicator('job')}
                  </th>
                  {INFO_COLUMNS.map((col, i) => (
                    <th key={`info-${i}`} className="jfc-th-info jfc-th-sortable" onClick={() => handleSort(`info-${i}`)}>
                      {col.label}{sortIndicator(`info-${i}`)}
                    </th>
                  ))}
                  {FILE_CHECK_HEADERS.map((h, i) => (
                    <th key={i} className="jfc-th-check jfc-th-sortable" onClick={() => handleSort(`check-${i}`)}>
                      {h}{sortIndicator(`check-${i}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, ri) => (
                  <tr key={ri} className="jfc-row">
                    <td className="jfc-td-job" title={row.jobNumber}>{row.jobNumber}</td>
                    {row.info.map((val, ii) => (
                      <td key={`info-${ii}`} className="jfc-td-info" title={val}>{val || '\u2014'}</td>
                    ))}
                    {row.checks.map((ok, ci) => (
                      <td
                        key={ci}
                        className={`jfc-td-check jfc-td-toggle ${ok ? 'present' : 'missing'}`}
                        title={`${FILE_CHECK_HEADERS[ci]}: ${ok ? 'Present' : 'Missing'} (click to toggle)`}
                        onClick={() => toggleCheck(row._i, ci)}
                      >
                        {ok ? '\u2713' : '\u00d7'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default JobFileChecks;
