import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './Report.css';

const REPORT_EXCEL_URL = import.meta.env.VITE_REPORT_EXCEL_URL || '';
const REPORT_FALLBACK_URL = import.meta.env.VITE_REPORT_URL || '';

function Report() {
  const [sheets, setSheets] = useState({});
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!REPORT_EXCEL_URL) {
      setLoading(false);
      setError('Configure VITE_REPORT_EXCEL_URL in .env with a direct download URL (e.g. GitHub raw, Dropbox raw).');
      return;
    }

    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(REPORT_EXCEL_URL);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const names = workbook.SheetNames || [];
        const parsed = {};
        for (const name of names) {
          const sheet = workbook.Sheets[name];
          parsed[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        }
        if (cancelled) return;

        setSheets(parsed);
        setSheetNames(names);
        setSelectedSheet(names[0] || '');
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load report');
          setSheets({});
          setSheetNames([]);
          setSelectedSheet('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="precision-layout report-page">
        <div className="precision-main">
          <header className="report-header">
            <h1>Report</h1>
            <p className="report-subtitle">Reports and analytics</p>
          </header>
          <div className="precision-content report-content">
            <div className="p-card report-loading">
              <p className="report-loading-text">Loading report...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="precision-layout report-page">
        <div className="precision-main">
          <header className="report-header">
            <h1>Report</h1>
            <p className="report-subtitle">Reports and analytics</p>
          </header>
          <div className="precision-content report-content">
            <div className="p-card report-error">
              <p className="report-error-text">{error}</p>
              {REPORT_FALLBACK_URL && (
                <a
                  href={REPORT_FALLBACK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-btn-primary report-open-btn"
                >
                  Open report in new tab
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const data = selectedSheet ? (sheets[selectedSheet] || []) : [];
  const hasData = data.length > 0;
  const headerRow = hasData ? data[0] : [];
  const bodyRows = hasData ? data.slice(1) : [];
  const colCount = hasData
    ? Math.max(headerRow.length, ...bodyRows.map((r) => (r && r.length) || 0))
    : 0;

  return (
    <div className="precision-layout report-page">
      <div className="precision-main">
        <header className="report-header">
          <h1>Report</h1>
          <p className="report-subtitle">Weekly Operating Committee Report</p>
        </header>

        <div className="precision-content report-content">
          {sheetNames.length > 1 && (
            <div className="report-sheet-tabs" role="tablist">
              {sheetNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={selectedSheet === name}
                  className={`report-sheet-tab ${selectedSheet === name ? 'report-sheet-tab--active' : ''}`}
                  onClick={() => setSelectedSheet(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <div className="p-card report-table-wrapper">
            {hasData ? (
              <div className="report-table-scroll">
                <table className="report-table">
                  <thead>
                    <tr>
                      {Array.from({ length: colCount }, (_, i) => (
                        <th key={i}>{headerRow[i] != null ? String(headerRow[i]) : ''}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bodyRows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {Array.from({ length: colCount }, (_, colIdx) => (
                          <td key={colIdx}>
                            {row && row[colIdx] != null ? String(row[colIdx]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="report-empty">No data in report.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Report;
