import React, { useState, useRef, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import jobService from '../services/jobService';
import './Page.css';
import './JobFileChecks.css';

const PM_INDEX = 1;
const CREW_INDEX = 2;

const FILE_CHECK_HEADERS = [
  // Setup (3)
  { label: 'JOB LOCKED',      fullName: 'Job Locked',                          dbCol: 'chk_job_locked' },
  { label: 'DBMX FILE',       fullName: 'DBMX File Created',                   dbCol: 'chk_dbmx_file_created' },
  { label: 'START DATE',      fullName: 'Start Date Entered',                  dbCol: 'chk_start_date_entered' },
  // Agreements (3)
  { label: 'ATP',              fullName: 'ATP Signed',                          dbCol: 'chk_atp_signed' },
  { label: 'CUST INFO FORM',  fullName: 'Customer Information Form Signed',    dbCol: 'chk_customer_info_form_signed' },
  { label: 'EQUIP RESP FORM', fullName: 'Equipment Responsibility Form Signed', dbCol: 'chk_equipment_resp_form_signed' },
  // Photos (4)
  { label: 'COL PHOTO',       fullName: 'Cause of Loss Photo',                 dbCol: 'chk_cause_of_loss_photo' },
  { label: 'FRONT PHOTO',     fullName: 'Front of Structure Photo',            dbCol: 'chk_front_of_structure_photo' },
  { label: 'PRE-MIT PHOTOS',  fullName: 'Pre-Mitigation Photos',               dbCol: 'chk_pre_mitigation_photos' },
  { label: 'DAILY PHOTOS',    fullName: 'Daily Departure Photos',              dbCol: 'chk_daily_departure_photos' },
  // Field Work (4)
  { label: 'DOCUSKETCH',      fullName: 'DocuSketch Uploaded',                  dbCol: 'chk_docusketch_uploaded' },
  { label: 'SCOPE SHEET',     fullName: 'Initial Scope Sheet Entered',         dbCol: 'chk_initial_scope_sheet_entered' },
  { label: 'EQUIP LOGGED',    fullName: 'Equipment Placed and Logged',         dbCol: 'chk_equipment_placed_and_logged' },
  { label: 'ATMO READINGS',   fullName: 'Initial Atmospheric Readings Taken',  dbCol: 'chk_initial_atmospheric_readings' },
  // Notes (2)
  { label: 'DAY 1 NOTE',      fullName: 'Day 1 Note Entered',                  dbCol: 'chk_day_1_note_entered' },
  { label: 'INSP QUESTIONS',  fullName: 'Initial Inspection Questions Answered', dbCol: 'chk_initial_inspection_questions' },
];

const CHECK_GROUPS = [
  { label: 'Setup',        count: 3 },  // Job Locked, DBMX File, Start Date
  { label: 'Agreements',   count: 3 },  // ATP, Cust Info Form, Equip Resp Form
  { label: 'Photos',       count: 4 },  // COL, Front, Pre-Mit, Daily
  { label: 'Field Work',   count: 4 },  // DocuSketch, Scope Sheet, Equip Logged, Atmo Readings
  { label: 'Notes',        count: 2 },  // Day 1 Note, Insp Questions
];

const INFO_COLUMNS = [
  { label: 'Customer', aliases: ['customer', 'client', 'customername', 'customerjobname'] },
  { label: 'PM', aliases: ['pm', 'projectmanager'] },
  { label: 'Crew Chief', aliases: ['crewchief', 'crew'] },
  { label: 'Days Active', aliases: ['daysactive', 'ofdaysactive', 'numberdays', 'daycount'] },
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
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', blankrows: false });
  if (!json.length) return [];

  const keys = Object.keys(json[0]);

  const jobKey = keys.find((k) => {
    const n = k.trim().toLowerCase().replace(/[^a-z]/g, '');
    return n === 'jobnumber' || n === 'jobno' || n === 'job';
  });

  const infoKeys = INFO_COLUMNS.map((col) => findKey(keys, col.aliases));

  const checkKeys = FILE_CHECK_HEADERS.map((h) =>
    keys.find((k) => fuzzyMatch(k, h.fullName)) || null
  );

  const isYes = (v) => {
    if (v === true || v === 1) return true;
    const s = String(v).trim().toLowerCase();
    return s === 'y' || s === 'yes' || s === '1' || s === 'true';
  };

  // Filter to rows that have a real job number and at least one other non-empty cell
  const seen = new Set();
  return json
    .filter((row) => {
      if (!jobKey) return false;
      const jn = String(row[jobKey]).trim();
      if (!jn) return false;
      // Skip rows where job number matches a column header (repeated header rows)
      const jnLower = jn.toLowerCase();
      if (jnLower === 'job number' || jnLower === 'job #' || jnLower === 'job no') return false;
      // Skip duplicate job numbers
      if (seen.has(jn)) return false;
      seen.add(jn);
      // Ensure at least one other cell has a value (not a fully empty row with just a job number artifact)
      const hasData = keys.some((k) => k !== jobKey && row[k] !== '' && row[k] !== null && row[k] !== undefined);
      return hasData;
    })
    .map((row) => ({
      jobNumber: String(row[jobKey]).trim(),
      info: infoKeys.map((ik) => (ik ? String(row[ik] ?? '').trim() : '')),
      checks: checkKeys.map((ck) => {
        if (!ck) return false;
        return isYes(row[ck]);
      }),
    }));
}

// sort key types: 'job' | 'info-0'..'info-4' | 'check-0'..'check-15'
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
  // Stores the row display order as indices; only recalculated on explicit sort clicks
  const [sortOrder, setSortOrder] = useState(null);
  const [filterPM, setFilterPM] = useState('');
  const [filterCrew, setFilterCrew] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const fileRef = useRef(null);

  const pmOptions = useMemo(() => {
    if (!rows) return [];
    const vals = [...new Set(rows.map((r) => r.info[PM_INDEX]).filter(Boolean))];
    vals.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return vals;
  }, [rows]);

  const crewOptions = useMemo(() => {
    if (!rows) return [];
    const vals = [...new Set(rows.map((r) => r.info[CREW_INDEX]).filter(Boolean))];
    vals.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return vals;
  }, [rows]);

  const recomputeOrder = useCallback((data, key, dir) => {
    if (!data || !key) { setSortOrder(null); return; }
    const indices = data.map((_, i) => i);
    indices.sort((ai, bi) => compareFn(data[ai], data[bi], key, dir));
    setSortOrder(indices);
  }, []);

  const handleSort = (key) => {
    const newDir = sortKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    recomputeOrder(rows, key, newDir);
  };

  const toggleCheck = (rowIndex, checkIndex) => {
    setRows((prev) => prev.map((row, ri) =>
      ri === rowIndex
        ? { ...row, checks: row.checks.map((v, ci) => ci === checkIndex ? !v : v) }
        : row
    ));
  };

  // Use frozen sort order so toggling a check doesn't shuffle rows, then apply filters
  const displayRows = useMemo(() => {
    if (!rows) return null;
    const ordered = (sortOrder || rows.map((_, i) => i)).map((i) => ({ ...rows[i], _i: i }));
    return ordered.filter((row) => {
      if (filterPM && row.info[PM_INDEX] !== filterPM) return false;
      if (filterCrew && row.info[CREW_INDEX] !== filterCrew) return false;
      return true;
    });
  }, [rows, sortOrder, filterPM, filterCrew]);

  const sortIndicator = (key) => {
    if (sortKey !== key) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const [enriching, setEnriching] = useState(false);

  const enrichWithSupabase = async (parsed) => {
    try {
      setEnriching(true);
      const jobNumbers = parsed.map((r) => r.jobNumber).filter(Boolean);
      const existing = await jobService.lookupChecksByJobNumbers(jobNumbers);

      const dbColOrder = FILE_CHECK_HEADERS.map((h) => h.dbCol);

      return parsed.map((row) => {
        const match = existing[row.jobNumber];
        if (!match) return row;

        // Merge Supabase checks: if Excel says false but Supabase says true, use Supabase value
        const mergedChecks = row.checks.map((excelVal, i) => {
          const dbVal = match[dbColOrder[i]];
          return excelVal || !!dbVal;
        });

        // Merge info fields (PM, Crew Chief, Days Active) if Excel is empty
        const mergedInfo = [...row.info];
        if (!mergedInfo[PM_INDEX] && match.pm) mergedInfo[PM_INDEX] = match.pm;
        if (!mergedInfo[CREW_INDEX] && match.crew_chief) mergedInfo[CREW_INDEX] = match.crew_chief;
        if (!mergedInfo[3] && match.days_active) mergedInfo[3] = String(match.days_active);

        return { ...row, checks: mergedChecks, info: mergedInfo };
      });
    } catch (err) {
      console.warn('Could not enrich with Supabase data:', err);
      return parsed; // fall back to Excel-only data
    } finally {
      setEnriching(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const parsed = parseFileChecks(wb);
        if (parsed.length) {
          const enriched = await enrichWithSupabase(parsed);
          setRows(enriched);
        }
      } catch { /* ignore bad files */ }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const clear = () => {
    setRows(null);
    setSortKey(null);
    setSortDir('asc');
    setSortOrder(null);
    setFilterPM('');
    setFilterCrew('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSaveToSupabase = async () => {
    if (!rows) return;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const results = await jobService.saveFileChecks(rows.map((row) => ({
        externalJobNumber: row.jobNumber || null,
        customerName: row.info[0] || 'Unknown',
        pm: row.info[1] || null,
        crewChief: row.info[2] || null,
        daysActive: row.info[3] ? parseInt(row.info[3], 10) || null : null,
        checks: Object.fromEntries(
          FILE_CHECK_HEADERS.map((h, i) => [h.dbCol, row.checks[i] || false])
        ),
      })));
      if (results.errors?.length > 0) {
        console.error('Save errors:', results.errors);
      }
      setSaveStatus(results);
    } catch (err) {
      setSaveError(err.message || 'Failed to save to Supabase');
      setSaveStatus(null);
    }
  };

  const leaderboard = useMemo(() => {
    if (!rows) return { crews: [], pms: [] };
    const totalChecks = FILE_CHECK_HEADERS.length;

    const buildRankings = (infoIndex) => {
      const map = {};
      rows.forEach((row) => {
        const name = row.info[infoIndex];
        if (!name) return;
        if (!map[name]) map[name] = { name, passed: 0, total: 0, jobs: 0 };
        map[name].jobs += 1;
        map[name].total += totalChecks;
        map[name].passed += row.checks.filter(Boolean).length;
      });
      return Object.values(map)
        .map((e) => ({ ...e, pct: e.total > 0 ? Math.round((e.passed / e.total) * 100) : 0 }))
        .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));
    };

    return { crews: buildRankings(CREW_INDEX), pms: buildRankings(PM_INDEX) };
  }, [rows]);

  const exportToExcel = () => {
    if (!displayRows) return;
    const data = displayRows.map((row) => {
      const obj = { 'Job Number': row.jobNumber };
      INFO_COLUMNS.forEach((col, i) => { obj[col.label] = row.info[i] || ''; });
      FILE_CHECK_HEADERS.forEach((h, i) => { obj[h.fullName] = row.checks[i] ? 'Y' : 'N'; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Job File Checks');
    XLSX.writeFile(wb, 'Job_File_Checks.xlsx');
  };

  const exportPunchlistPdf = () => {
    if (!rows) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 36;
    const lineH = 13;
    let y = 0;

    const ensureSpace = (needed) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin + 10;
      }
    };

    // Title
    y = margin + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Job File Check Punchlist', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, margin, y);
    doc.setTextColor(0);
    y += 20;

    // Group rows: PM → Crew Chief → jobs with missing checks
    const pmMap = {};
    rows.forEach((row) => {
      const missingItems = FILE_CHECK_HEADERS
        .map((h, i) => (!row.checks[i] ? h.fullName : null))
        .filter(Boolean);
      if (missingItems.length === 0) return; // skip jobs with no missing items

      const pm = row.info[PM_INDEX] || 'Unassigned PM';
      const crew = row.info[CREW_INDEX] || 'Unassigned Crew Chief';
      if (!pmMap[pm]) pmMap[pm] = {};
      if (!pmMap[pm][crew]) pmMap[pm][crew] = [];
      pmMap[pm][crew].push({ jobNumber: row.jobNumber, customer: row.info[0], missing: missingItems });
    });

    const pmNames = Object.keys(pmMap).sort((a, b) => a.localeCompare(b));

    if (pmNames.length === 0) {
      doc.setFontSize(11);
      doc.text('No missing items found — all checks are passing.', margin, y);
      doc.save('Job_File_Check_Punchlist.pdf');
      return;
    }

    pmNames.forEach((pm) => {
      // PM header
      ensureSpace(lineH * 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 64, 175); // blue
      doc.text(pm, margin, y);
      y += 4;
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.75);
      doc.line(margin, y, pageW - margin, y);
      y += lineH + 2;
      doc.setTextColor(0);

      const crewNames = Object.keys(pmMap[pm]).sort((a, b) => a.localeCompare(b));
      crewNames.forEach((crew) => {
        // Crew Chief header
        ensureSpace(lineH * 2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text(crew, margin + 12, y);
        y += lineH + 2;
        doc.setTextColor(0);

        const jobs = pmMap[pm][crew];
        jobs.forEach((job) => {
          // Job line
          ensureSpace(lineH * 2 + job.missing.length * lineH);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          const jobLabel = `${job.jobNumber}${job.customer ? '  —  ' + job.customer : ''}`;
          doc.text(jobLabel, margin + 24, y);
          y += lineH;

          // Missing items
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(200, 30, 30); // red
          job.missing.forEach((item) => {
            ensureSpace(lineH);
            doc.text('\u2717  ' + item, margin + 36, y);
            y += lineH;
          });
          doc.setTextColor(0);
          y += 4;
        });
        y += 4;
      });
      y += 6;
    });

    doc.save('Job_File_Check_Punchlist.pdf');
  };

  const presentCount = displayRows
    ? displayRows.reduce((sum, r) => sum + r.checks.filter(Boolean).length, 0)
    : 0;
  const totalCount = displayRows ? displayRows.length * FILE_CHECK_HEADERS.length : 0;

  return (
    <div className="page-container">
      <h1>Job File Checks</h1>
      <p className="jfc-subtitle">
        Upload an Excel file to verify job file statuses across the 16 compliance checks.
      </p>

      <div className="jfc-card">
        <div className="jfc-card-header">
          <span className="jfc-card-title">
            {rows
              ? `${displayRows.length}${displayRows.length !== rows.length ? ` / ${rows.length}` : ''} Jobs`
              : 'Upload File'}
          </span>
          <div className="jfc-card-actions">
            {rows && (
              <>
                <select
                  className="jfc-filter-select"
                  value={filterPM}
                  onChange={(e) => setFilterPM(e.target.value)}
                >
                  <option value="">All PMs</option>
                  {pmOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select
                  className="jfc-filter-select"
                  value={filterCrew}
                  onChange={(e) => setFilterCrew(e.target.value)}
                >
                  <option value="">All Crew Chiefs</option>
                  {crewOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <span className="jfc-summary">
                  {presentCount}/{totalCount} present
                </span>
              </>
            )}
            {rows ? (
              <>
                <button
                  className={`jfc-leaderboard-btn${showLeaderboard ? ' active' : ''}`}
                  onClick={() => setShowLeaderboard((v) => !v)}
                >
                  Leaderboard
                </button>
                <button
                  className="jfc-export-btn"
                  onClick={handleSaveToSupabase}
                  disabled={saveStatus === 'saving'}
                  title="Save imported jobs to Supabase with external job numbers"
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save to Supabase'}
                </button>
                <button className="jfc-export-btn" onClick={exportPunchlistPdf}>Punchlist PDF</button>
                <button className="jfc-export-btn" onClick={exportToExcel}>Export Excel</button>
                <button className="jfc-clear-btn" onClick={clear}>Clear</button>
              </>
            ) : null}
          </div>
        </div>

        {saveStatus && saveStatus !== 'saving' && (
          <div style={{ padding: '8px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', fontSize: '13px', color: '#059669' }}>
            Supabase: {saveStatus.created} created, {saveStatus.updated} updated
            {saveStatus.errors?.length > 0 && `, ${saveStatus.errors.length} errors — check browser console (F12) for details`}
          </div>
        )}
        {saveError && (
          <div style={{ padding: '8px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', fontSize: '13px', color: '#dc2626' }}>
            {saveError}
          </div>
        )}

        {rows && showLeaderboard && (
          <div className="jfc-leaderboard">
            <div className="jfc-lb-section">
              <h3 className="jfc-lb-title">Crew Chief Rankings</h3>
              {leaderboard.crews.length === 0 ? (
                <p className="jfc-lb-empty">No crew chief data</p>
              ) : (
                <div className="jfc-lb-list">
                  {leaderboard.crews.map((e, i) => (
                    <div key={e.name} className="jfc-lb-row">
                      <span className={`jfc-lb-rank${i < 3 ? ` jfc-lb-top${i + 1}` : ''}`}>#{i + 1}</span>
                      <span className="jfc-lb-name">{e.name}</span>
                      <span className="jfc-lb-jobs">{e.jobs} job{e.jobs !== 1 ? 's' : ''}</span>
                      <span className="jfc-lb-score">{e.passed}/{e.total}</span>
                      <div className="jfc-lb-bar-wrap">
                        <div className="jfc-lb-bar" style={{ width: `${e.pct}%`, background: e.pct >= 80 ? '#22c55e' : e.pct >= 50 ? '#fbbf24' : '#ef4444' }} />
                      </div>
                      <span className={`jfc-lb-pct${e.pct >= 80 ? ' high' : e.pct >= 50 ? ' mid' : ' low'}`}>{e.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="jfc-lb-section">
              <h3 className="jfc-lb-title">PM Rankings</h3>
              {leaderboard.pms.length === 0 ? (
                <p className="jfc-lb-empty">No PM data</p>
              ) : (
                <div className="jfc-lb-list">
                  {leaderboard.pms.map((e, i) => (
                    <div key={e.name} className="jfc-lb-row">
                      <span className={`jfc-lb-rank${i < 3 ? ` jfc-lb-top${i + 1}` : ''}`}>#{i + 1}</span>
                      <span className="jfc-lb-name">{e.name}</span>
                      <span className="jfc-lb-jobs">{e.jobs} job{e.jobs !== 1 ? 's' : ''}</span>
                      <span className="jfc-lb-score">{e.passed}/{e.total}</span>
                      <div className="jfc-lb-bar-wrap">
                        <div className="jfc-lb-bar" style={{ width: `${e.pct}%`, background: e.pct >= 80 ? '#22c55e' : e.pct >= 50 ? '#fbbf24' : '#ef4444' }} />
                      </div>
                      <span className={`jfc-lb-pct${e.pct >= 80 ? ' high' : e.pct >= 50 ? ' mid' : ' low'}`}>{e.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!rows ? (
          <div className="jfc-upload-area">
            {enriching && (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                Loading existing check data from Supabase...
              </div>
            )}
            <div className="jfc-upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="jfc-upload-text">
              Upload an Excel file (.xlsx, .xls, .csv) with a <strong>Job Number</strong> column
              and any of the 16 file check columns.
            </p>
            <div className="jfc-upload-checks">
              {FILE_CHECK_HEADERS.map((h, i) => (
                <span key={i} className="jfc-upload-check-tag" title={h.fullName}>{h.label}</span>
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
                <tr className="jfc-group-row">
                  <th colSpan={1 + INFO_COLUMNS.length} className="jfc-th-group-spacer" />
                  {CHECK_GROUPS.map((g, i) => (
                    <th key={i} colSpan={g.count} className={`jfc-th-group jfc-group-${i}`}>
                      {g.label}
                    </th>
                  ))}
                </tr>
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
                    <th key={i} className="jfc-th-check jfc-th-sortable" title={h.fullName} onClick={() => handleSort(`check-${i}`)}>
                      <span className="jfc-th-check-label">{h.label}</span>
                      <span className="jfc-th-sort-icon">{sortIndicator(`check-${i}`)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, ri) => (
                  <tr key={ri} className="jfc-row">
                    <td className="jfc-td-job" title={row.jobNumber}>{row.jobNumber}</td>
                    {row.info.map((val, ii) => (
                      <td key={`info-${ii}`} className="jfc-td-info" title={val}>{val || '\u2014'}</td>
                    ))}
                    {row.checks.map((ok, ci) => (
                      <td
                        key={ci}
                        className={`jfc-td-check jfc-td-toggle ${ok ? 'present' : 'missing'}`}
                        title={`${FILE_CHECK_HEADERS[ci].fullName}: ${ok ? 'Present' : 'Missing'} (click to toggle)`}
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
