import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { hoursForJobType } from '../../config/dispatchJobDurations';
import './DispatchExcelUpload.css';

// Status/type options for dispatch → hours
export const STATUS_OPTIONS = [
  { value: 'dry', label: 'Dry', hours: hoursForJobType('dry') },
  { value: 'monitoring', label: 'Monitoring', hours: hoursForJobType('monitoring') },
  { value: 'stabilization', label: 'Stabilization', hours: hoursForJobType('stabilization') },
  { value: 'walkthrough', label: 'Walkthrough', hours: hoursForJobType('walkthrough') },
  { value: 'demo', label: 'Demo', hours: hoursForJobType('demo') },
  { value: 'packout', label: 'Packout', hours: hoursForJobType('packout') },
  { value: 'equipment-pickup', label: 'Equipment Pickup', hours: hoursForJobType('equipment-pickup') },
];

const UNASSIGNED_ID = 'unassigned';
const LANE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16',
  '#f43f5e', '#fb923c', '#a3e635', '#2dd4bf',
];

function crewChiefToLaneId(crewChiefName, uniqueNamesInOrder) {
  const trimmed = String(crewChiefName || '').trim();
  if (!trimmed) return UNASSIGNED_ID;
  const idx = uniqueNamesInOrder.indexOf(trimmed);
  return idx >= 0 ? 'crew-' + idx : UNASSIGNED_ID;
}

function DispatchExcelUpload({ onApply, onCancel }) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('upload');
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [columns, setColumns] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [mapping, setMapping] = useState({
    pm: '',
    crewChief: '',
    jobNumber: '',
    customer: '',
    address: '',
    status: '',
  });
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    reset();
    setError('');
    setFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (!validTypes.includes(file.type) && !['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError('Failed to read file.');
    reader.onload = (ev) => {
      try {
        let wb;
        const data = new Uint8Array(ev.target.result);
        if (ext === 'csv') {
          const text = new TextDecoder('utf-8').decode(data);
          wb = XLSX.read(text, { type: 'string' });
        } else {
          wb = XLSX.read(data, { type: 'array', cellDates: true });
        }
        if (!wb.SheetNames?.length) {
          setError('No sheets found.');
          return;
        }
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setSelectedSheet(wb.SheetNames[0]);
        if (wb.SheetNames.length > 1) {
          setStep('sheet_select');
          return;
        }
        parseSheet(wb, wb.SheetNames[0]);
      } catch (err) {
        setError(err.message || 'Failed to parse file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseSheet = (wb, sheetName) => {
    setError(null);
    try {
      const ws = wb.Sheets[sheetName];
      if (!ws) {
        setError('Could not read sheet.');
        return;
      }
      const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true });
      if (!json?.length) {
        setError('Sheet is empty.');
        return;
      }
      let headerIdx = 0;
      for (let i = 0; i < Math.min(10, json.length); i++) {
        const row = json[i];
        const filled = Array.isArray(row) ? row.filter((c) => c != null && String(c).trim() !== '') : [];
        if (filled.length >= 2) {
          headerIdx = i;
          break;
        }
      }
      const headerRow = json[headerIdx];
      const headers = [];
      const idxMap = [];
      const seenHeaders = {};
      (headerRow || []).forEach((h, i) => {
        let v = String(h || '').trim();
        if (v) {
          if (seenHeaders[v]) {
            seenHeaders[v]++;
            v = `${v} (${seenHeaders[v]})`;
          } else {
            seenHeaders[v] = 1;
          }
          headers.push(v);
          idxMap.push(i);
        }
      });
      if (!headers.length) {
        setError('No column headers found.');
        return;
      }
      setColumns(headers);
      const dataRows = json.slice(headerIdx + 1).map((row) => {
        const obj = {};
        headers.forEach((h, i) => {
          const val = Array.isArray(row) ? row[idxMap[i]] : undefined;
          if (val instanceof Date) obj[h] = val.toLocaleDateString();
          else if (val != null && String(val).trim() !== '') obj[h] = String(val).trim();
          else obj[h] = '';
        });
        return obj;
      }).filter((r) => Object.values(r).some((v) => v !== ''));
      if (dataRows.length === 0) {
        setError('The selected sheet has no data rows (only headers found).');
        return;
      }
      const autoMapping = autoDetect(headers);
      setRawData(dataRows);
      setMapping(autoMapping);
      if (autoMapping.crewChief && autoMapping.jobNumber) {
        setRows(buildRowsFromData(dataRows, autoMapping));
        setStep('preview');
      } else {
        setStep('mapping');
      }
    } catch (err) {
      setError(err.message || 'Parse error.');
    }
  };

  const autoDetect = (headers) => {
    const m = { pm: '', crewChief: '', jobNumber: '', customer: '', address: '', status: '' };
    const lower = headers.map((h) => h.toLowerCase());
    // PM: pm, project manager, manager (but not "crew manager" which is crew-related)
    const pmIdx = lower.findIndex((h) => /^pm$|project\s*manager|^manager$/.test(h));
    if (pmIdx >= 0) m.pm = headers[pmIdx];
    // Crew: crew, chief, assign, tech, team, crew chief
    const crewIdx = lower.findIndex((h, i) => i !== pmIdx && /crew|chief|assign|^tech$|^team$/.test(h));
    if (crewIdx >= 0) m.crewChief = headers[crewIdx];
    // Job: job #, job number, file #, job no, etc.
    let jobIdx = lower.findIndex((h) => /job\s*#|job\s*number|file\s*#|job\s*no|job\s*id|^#/.test(h));
    if (jobIdx < 0) jobIdx = lower.findIndex((h) => h.includes('job') || h === 'number' || h === 'id');
    if (jobIdx >= 0) m.jobNumber = headers[jobIdx];
    const custIdx = lower.findIndex((h) => /customer|client|name|owner|contact/.test(h));
    if (custIdx >= 0) m.customer = headers[custIdx];
    const addrIdx = lower.findIndex((h) => /address|street|addr|location|property/.test(h));
    if (addrIdx >= 0) m.address = headers[addrIdx];
    const statusIdx = lower.findIndex((h) => /status|type|dry|monitor|stabil/.test(h));
    if (statusIdx >= 0) m.status = headers[statusIdx];
    return m;
  };

  const buildRowsFromData = (data, map) => {
    const statusNorm = (v) => {
      const s = String(v || '').toLowerCase();
      if (/dry/.test(s)) return 'dry';
      if (/monitor/.test(s)) return 'monitoring';
      if (/stabil/.test(s)) return 'stabilization';
      if (/walk/.test(s)) return 'walkthrough';
      if (/demo/.test(s)) return 'demo';
      if (/pack/.test(s)) return 'packout';
      if (/pick\s*up|pickup|equipment\s*pick/.test(s)) return 'equipment-pickup';
      return '';
    };
    return data.map((row, idx) => {
      const statusCol = map.status ? (row[map.status] || '') : '';
      const status = statusNorm(statusCol) || 'dry';
      const opt = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
      const address = map.address ? (row[map.address] || '') : '';
      return {
        id: `row-${idx}`,
        pm: map.pm ? (row[map.pm] || '').trim() : '',
        crewChief: (row[map.crewChief] || '').trim(),
        jobNumber: (row[map.jobNumber] || '').trim(),
        customer: (row[map.customer] || '').trim(),
        address: address.trim(),
        status,
        hours: opt.hours,
        latitude: null,
        longitude: null,
      };
    });
  };

  const handleSheetSelect = () => {
    if (workbook && selectedSheet) parseSheet(workbook, selectedSheet);
  };

  const buildRows = () => {
    setRows(buildRowsFromData(rawData, mapping));
    setStep('preview');
  };

  const updateRowStatus = (index, status) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status, hours: opt.hours };
      return next;
    });
  };

  const setAllStatuses = (status) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
    setRows((prev) => prev.map((r) => ({ ...r, status, hours: opt.hours })));
  };

  const applyToSchedule = () => {
    const uniqueCrews = [];
    rows.forEach((r) => {
      const n = String(r.crewChief || '').trim();
      if (n && !uniqueCrews.includes(n)) uniqueCrews.push(n);
    });
    const lanes = uniqueCrews.map((name, i) => ({
      id: 'crew-' + i,
      name,
      color: LANE_COLORS[i % LANE_COLORS.length],
    }));
    const byCrew = {};
    lanes.forEach((l) => { byCrew[l.id] = []; });
    byCrew[UNASSIGNED_ID] = [];
    rows.forEach((r) => {
      const crewId = crewChiefToLaneId(r.crewChief, uniqueCrews);
      if (!byCrew[crewId]) byCrew[crewId] = [];
      byCrew[crewId].push({
        id: r.id || Date.now() + Math.random(),
        jobType: r.status,
        hours: r.hours,
        jobNumber: r.jobNumber,
        customer: r.customer,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
      });
    });

    // Build PM groups from the data (if PM column was mapped)
    const PM_GROUP_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    const pmGroupsFromData = [];
    rows.forEach((r) => {
      const pmName = (r.pm || '').trim();
      const crewName = (r.crewChief || '').trim();
      if (!pmName || !crewName) return;
      let group = pmGroupsFromData.find((g) => g.pm.toLowerCase() === pmName.toLowerCase());
      if (!group) {
        group = { pm: pmName, title: '', color: PM_GROUP_COLORS[pmGroupsFromData.length % PM_GROUP_COLORS.length], crews: [] };
        pmGroupsFromData.push(group);
      }
      if (!group.crews.some((c) => c.toLowerCase() === crewName.toLowerCase())) {
        group.crews.push(crewName);
      }
    });

    onApply(byCrew, lanes, pmGroupsFromData);
  };

  const reset = () => {
    setStep('upload');
    setFileName('');
    setWorkbook(null);
    setRawData([]);
    setRows([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="dispatch-excel-upload">
      {step === 'upload' && (
        <div className="dispatch-upload-step">
          <h3>Upload Excel</h3>
          <p>Upload a spreadsheet with crew chief assignments and jobs. We’ll read the columns automatically; you can adjust mapping in the next step if needed. Set status (Dry / Monitoring / Stabilization) to generate hours.</p>
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              id="dispatch-excel-input"
            />
            <label htmlFor="dispatch-excel-input" className="file-input-label">Choose file</label>
          </div>
          {error && <p className="dispatch-upload-error">{error}</p>}
          {onCancel && <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>}
        </div>
      )}

      {step === 'sheet_select' && (
        <div className="dispatch-upload-step">
          <h3>Select sheet</h3>
          <select value={selectedSheet} onChange={(e) => setSelectedSheet(e.target.value)}>
            {sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={handleSheetSelect}>Use this sheet</button>
          {onCancel && <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>}
        </div>
      )}

      {step === 'mapping' && (
        <div className="dispatch-upload-step dispatch-mapping">
          <h3>Map columns</h3>
          <p>Match your Excel columns to the fields below. At least <strong>Crew chief</strong> and <strong>Job #</strong> are required. Map the <strong>PM</strong> column to group crew chiefs under their project managers.</p>
          <div className="mapping-grid">
            <label>PM (Project Manager)</label>
            <select value={mapping.pm} onChange={(e) => setMapping((m) => ({ ...m, pm: e.target.value }))}>
              <option value="">— (none)</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label>Crew chief</label>
            <select value={mapping.crewChief} onChange={(e) => setMapping((m) => ({ ...m, crewChief: e.target.value }))}>
              <option value="">—</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label>Job #</label>
            <select value={mapping.jobNumber} onChange={(e) => setMapping((m) => ({ ...m, jobNumber: e.target.value }))}>
              <option value="">—</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label>Customer</label>
            <select value={mapping.customer} onChange={(e) => setMapping((m) => ({ ...m, customer: e.target.value }))}>
              <option value="">—</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label>Address</label>
            <select value={mapping.address} onChange={(e) => setMapping((m) => ({ ...m, address: e.target.value }))}>
              <option value="">—</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label>Status (optional)</label>
            <select value={mapping.status} onChange={(e) => setMapping((m) => ({ ...m, status: e.target.value }))}>
              <option value="">— Set in next step</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <p className="dispatch-upload-error">{error}</p>}
          <button type="button" className="primary-btn" onClick={buildRows} disabled={!mapping.crewChief || !mapping.jobNumber}>
            Preview & set status
          </button>
          {onCancel && <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>}
        </div>
      )}

      {step === 'preview' && (
        <div className="dispatch-upload-step dispatch-preview">
          <div className="preview-header-row">
            <h3>Preview & status</h3>
            <span className="preview-meta">{fileName ? `${fileName} \u2014 ` : ''}{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
            <button type="button" className="adjust-mapping-btn" onClick={() => setStep('mapping')}>
              Adjust column mapping
            </button>
          </div>
          {mapping.crewChief && mapping.jobNumber && (
            <div className="preview-detect-banner">
              Detected: {mapping.pm ? <><strong>PM</strong> = {mapping.pm}, </> : null}
              <strong>Crew Chief</strong> = {mapping.crewChief}, <strong>Job #</strong> = {mapping.jobNumber}
              {mapping.customer ? <>, <strong>Customer</strong> = {mapping.customer}</> : null}
              {mapping.address ? <>, <strong>Address</strong> = {mapping.address}</> : null}
              {mapping.status ? <>, <strong>Status</strong> = {mapping.status}</> : null}
            </div>
          )}
          <div className="preview-bulk-status">
            <label>Set all statuses to:</label>
            <select onChange={(e) => { if (e.target.value) setAllStatuses(e.target.value); }} defaultValue="">
              <option value="" disabled>Choose…</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label} ({o.hours}h)</option>
              ))}
            </select>
          </div>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  {mapping.pm && <th>PM</th>}
                  <th>Crew chief</th>
                  <th>Job #</th>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Hrs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    {mapping.pm && <td>{r.pm}</td>}
                    <td>{r.crewChief}</td>
                    <td>{r.jobNumber}</td>
                    <td>{r.customer}</td>
                    <td>{r.address}</td>
                    <td>
                      <select
                        value={r.status}
                        onChange={(e) => updateRowStatus(i, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label} ({o.hours}h)</option>
                        ))}
                      </select>
                    </td>
                    <td>{r.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="preview-footer">
            <button type="button" className="primary-btn" onClick={applyToSchedule}>
              Apply to schedule
            </button>
            <button type="button" className="cancel-btn" onClick={() => setStep('mapping')}>Back</button>
            {onCancel && <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export default DispatchExcelUpload;
