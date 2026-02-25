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

// Precompute group index and position for each check column
const CHECK_COL_GROUP = (() => {
  const arr = [];
  let idx = 0;
  CHECK_GROUPS.forEach((g, gi) => {
    for (let c = 0; c < g.count; c++) {
      arr.push({ group: gi, isFirst: c === 0, isLast: c === g.count - 1 });
      idx++;
    }
  });
  return arr;
})();

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
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();   // 792
    const pageH = doc.internal.pageSize.getHeight();   // 612
    const margin = 36;

    // Column widths — total usable: 792 - 72 = 720
    const colJobW = 60;
    const colCustW = 80;
    const colCrewW = 65;
    const colDaysW = 35;
    const colCheckW = 30;
    const infoW = colJobW + colCustW + colCrewW + colDaysW; // 240
    const checksW = 16 * colCheckW; // 480
    const tableW = infoW + checksW; // 720

    // Group header colors (RGB)
    const groupColors = [
      [37, 99, 235],    // Setup — blue
      [22, 163, 74],    // Agreements — green
      [147, 51, 234],   // Photos — purple
      [217, 119, 6],    // Field Work — amber
      [13, 148, 136],   // Notes — teal
    ];

    const rowH = 14;
    const headerGroupH = 14;
    const headerLabelH = 72; // tall enough for vertical rotated labels
    const totalHeaderH = headerGroupH + headerLabelH;

    // Gather distinct PMs sorted alphabetically
    const pmMap = {};
    rows.forEach((row) => {
      const pm = row.info[PM_INDEX] || 'Unassigned PM';
      if (!pmMap[pm]) pmMap[pm] = [];
      pmMap[pm].push(row);
    });
    const pmNames = Object.keys(pmMap).sort((a, b) => a.localeCompare(b));

    // Helper: truncate text to fit width
    const truncate = (text, maxW, fontSize) => {
      doc.setFontSize(fontSize);
      if (doc.getTextWidth(text) <= maxW - 4) return text;
      while (text.length > 0 && doc.getTextWidth(text + '…') > maxW - 4) {
        text = text.slice(0, -1);
      }
      return text + '…';
    };

    // Helper: draw table headers (group row + column labels row)
    const drawHeaders = (x0, y0) => {
      let x = x0;

      // --- Group row ---
      // Spacer over info columns
      doc.setFillColor(240, 240, 240);
      doc.rect(x, y0, infoW, headerGroupH, 'F');
      x += infoW;

      // Group header cells
      let checkIdx = 0;
      CHECK_GROUPS.forEach((g, gi) => {
        const w = g.count * colCheckW;
        const [r, gv, b] = groupColors[gi];
        doc.setFillColor(r, gv, b);
        doc.rect(x, y0, w, headerGroupH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(g.label, x + w / 2, y0 + 10, { align: 'center' });
        checkIdx += g.count;
        x += w;
      });

      // --- Column labels row ---
      const y1 = y0 + headerGroupH;
      x = x0;

      // Info column headers
      doc.setFillColor(230, 230, 230);
      doc.rect(x, y1, infoW, headerLabelH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 30, 30);

      const infoLabels = ['Job #', 'Customer', 'Crew Chief', 'Days'];
      const infoWidths = [colJobW, colCustW, colCrewW, colDaysW];
      infoLabels.forEach((lbl, i) => {
        doc.text(lbl, x + 3, y1 + headerLabelH - 5);
        x += infoWidths[i];
      });

      // Check column headers — vertical rotated text
      FILE_CHECK_HEADERS.forEach((h, i) => {
        const cg = CHECK_COL_GROUP[i];
        const [r, gv, b] = groupColors[cg.group];
        // Lighter tinted background
        doc.setFillColor(
          Math.min(255, r + Math.round((255 - r) * 0.75)),
          Math.min(255, gv + Math.round((255 - gv) * 0.75)),
          Math.min(255, b + Math.round((255 - b) * 0.75))
        );
        doc.rect(x, y1, colCheckW, headerLabelH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(30, 30, 30);
        // Rotate 90° — text reads bottom-to-top
        doc.text(h.label, x + colCheckW / 2 + 2, y1 + headerLabelH - 5, { angle: 90 });
        x += colCheckW;
      });

      // Grid lines for header
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      // Outer border
      doc.rect(x0, y0, tableW, totalHeaderH);
      // Horizontal line between group row and labels row
      doc.line(x0, y1, x0 + tableW, y1);
      // Vertical lines for info columns
      x = x0;
      infoWidths.forEach((w) => { x += w; doc.line(x, y0, x, y1 + headerLabelH); });
      // Vertical lines for check columns
      for (let i = 0; i < 16; i++) {
        const cx = x0 + infoW + i * colCheckW;
        doc.line(cx, y0, cx, y1 + headerLabelH);
      }

      return y1 + headerLabelH;
    };

    // Helper: draw one data row
    const drawDataRow = (row, x0, yTop, isEven) => {
      const allPassed = row.checks.every(Boolean);

      // Row background
      if (allPassed) {
        doc.setFillColor(220, 252, 231); // light green
      } else if (isEven) {
        doc.setFillColor(249, 250, 251); // light gray
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(x0, yTop, tableW, rowH, 'F');

      let x = x0;
      const textY = yTop + 10;

      // Job #
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0);
      doc.text(truncate(row.jobNumber, colJobW, 7), x + 3, textY);
      x += colJobW;

      // Customer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(50, 50, 50);
      doc.text(truncate(row.info[0] || '', colCustW, 6.5), x + 3, textY);
      x += colCustW;

      // Crew Chief
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(truncate(row.info[CREW_INDEX] || '', colCrewW, 6.5), x + 3, textY);
      x += colCrewW;

      // Days Active
      doc.setFontSize(7);
      doc.setTextColor(0);
      const days = row.info[3] || '';
      doc.text(days, x + colDaysW / 2, textY, { align: 'center' });
      x += colDaysW;

      // Check cells — full cell background color
      row.checks.forEach((ok) => {
        if (ok) {
          doc.setFillColor(187, 247, 208); // green-200
          doc.rect(x, yTop, colCheckW, rowH, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(21, 128, 61); // green-700
          doc.text('\u2713', x + colCheckW / 2, textY + 1, { align: 'center' });
        } else {
          doc.setFillColor(254, 202, 202); // red-200
          doc.rect(x, yTop, colCheckW, rowH, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(185, 28, 28); // red-700
          doc.text('\u2717', x + colCheckW / 2, textY + 1, { align: 'center' });
        }
        x += colCheckW;
      });

      // Grid lines for row
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.25);
      // Bottom border
      doc.line(x0, yTop + rowH, x0 + tableW, yTop + rowH);
      // Left/right outer borders
      doc.line(x0, yTop, x0, yTop + rowH);
      doc.line(x0 + tableW, yTop, x0 + tableW, yTop + rowH);
      // Vertical separators
      x = x0;
      const infoWidths = [colJobW, colCustW, colCrewW, colDaysW];
      infoWidths.forEach((w) => { x += w; doc.line(x, yTop, x, yTop + rowH); });
      for (let i = 1; i < 16; i++) {
        const cx = x0 + infoW + i * colCheckW;
        doc.line(cx, yTop, cx, yTop + rowH);
      }
    };

    // --- Render pages ---
    let isFirstPage = true;

    pmNames.forEach((pm) => {
      if (!isFirstPage) doc.addPage();
      isFirstPage = false;

      const pmRows = pmMap[pm].slice().sort((a, b) => {
        const crewCmp = (a.info[CREW_INDEX] || '').localeCompare(b.info[CREW_INDEX] || '', undefined, { sensitivity: 'base' });
        if (crewCmp !== 0) return crewCmp;
        return a.jobNumber.localeCompare(b.jobNumber, undefined, { sensitivity: 'base' });
      });

      const pmTotal = pmRows.length;
      const pmCompliant = pmRows.filter((r) => r.checks.every(Boolean)).length;
      const pmMissing = pmTotal - pmCompliant;

      let y = margin;
      let rowIdx = 0;

      const renderPageHeader = () => {
        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`${pm} \u2014 Job File Check Punchlist`, margin, y + 12);

        // Timestamp
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        doc.text(new Date().toLocaleString('en-US'), pageW - margin, y + 12, { align: 'right' });

        // Summary
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.text(`${pmTotal} jobs  |  ${pmCompliant} fully compliant  |  ${pmMissing} with missing items`, margin, y + 24);

        y += 34;

        // Draw table headers
        y = drawHeaders(margin, y);
      };

      renderPageHeader();

      pmRows.forEach((row, ri) => {
        // Check if row fits on current page
        if (y + rowH > pageH - margin) {
          doc.addPage();
          y = margin;
          renderPageHeader();
        }
        drawDataRow(row, margin, y, ri % 2 === 0);
        y += rowH;
      });
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
                  {FILE_CHECK_HEADERS.map((h, i) => {
                    const cg = CHECK_COL_GROUP[i];
                    return (
                      <th key={i} className={`jfc-th-check jfc-th-sortable jfc-col-group-${cg.group}${cg.isFirst ? ' jfc-col-group-first' : ''}${cg.isLast ? ' jfc-col-group-last' : ''}`} title={h.fullName} onClick={() => handleSort(`check-${i}`)}>
                        <span className="jfc-th-check-label">{h.label}</span>
                        <span className="jfc-th-sort-icon">{sortIndicator(`check-${i}`)}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, ri) => (
                  <tr key={ri} className={`jfc-row${row.checks.every(Boolean) ? ' jfc-row-all-passed' : ''}`}>
                    <td className="jfc-td-job" title={row.jobNumber}>{row.jobNumber}</td>
                    {row.info.map((val, ii) => (
                      <td key={`info-${ii}`} className="jfc-td-info" title={val}>{val || '\u2014'}</td>
                    ))}
                    {row.checks.map((ok, ci) => {
                      const cg = CHECK_COL_GROUP[ci];
                      return (
                        <td
                          key={ci}
                          className={`jfc-td-check jfc-td-toggle ${ok ? 'present' : 'missing'} jfc-col-group-${cg.group}${cg.isFirst ? ' jfc-col-group-first' : ''}${cg.isLast ? ' jfc-col-group-last' : ''}`}
                          title={`${FILE_CHECK_HEADERS[ci].fullName}: ${ok ? 'Present' : 'Missing'} (click to toggle)`}
                          onClick={() => toggleCheck(row._i, ci)}
                        >
                          {ok ? '\u2713' : '\u00d7'}
                        </td>
                      );
                    })}
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
