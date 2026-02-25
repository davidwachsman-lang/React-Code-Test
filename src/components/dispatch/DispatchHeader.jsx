import React, { useRef } from 'react';

export default function DispatchHeader({
  rangeMode, setRangeMode,
  viewMode, setViewMode,
  date, weekLabel, threeDayLabel, monthLabel,
  goPrev, goNext, goToday, formatDate,
  showExcelUpload, setShowExcelUpload,
  exportPdf, openEmailDraft,
  emailError, emailSuccess,
  optimizeError,
  overflowCount,
  finalized, onFinalize, saving,
  canUndo, canRedo, onUndo, onRedo,
  conflicts,
  onCopyFromDate,
  onManageTeams,
}) {
  const copyDateRef = useRef(null);

  const handleCopyClick = () => {
    if (copyDateRef.current) copyDateRef.current.showPicker();
  };

  const handleCopyDateChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const parts = val.split('-');
    const picked = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    if (onCopyFromDate) onCopyFromDate(picked);
    e.target.value = '';
  };
  return (
    <div className="dispatch-header">
      <h1>Dispatch & Scheduling</h1>
      {/* Row 1: nav, range toggle, undo/redo, view toggle */}
      <div className="dispatch-header-row dispatch-header-nav-row">
        <div className="dispatch-date-nav">
          <button type="button" onClick={goPrev} aria-label="Previous day">&larr;</button>
          <button type="button" onClick={goToday} className="today-btn">Today</button>
          <button type="button" onClick={goNext} aria-label="Next day">&rarr;</button>
          <span className="dispatch-date-label">{
            rangeMode === 'day' ? formatDate(date) :
            rangeMode === '3day' ? threeDayLabel :
            rangeMode === 'month' ? monthLabel :
            weekLabel
          }</span>
        </div>

        <div className="dispatch-range-toggle" role="tablist" aria-label="Range">
          <button type="button" className={rangeMode === 'day' ? 'active' : ''} onClick={() => setRangeMode('day')}>Day</button>
          <button type="button" className={rangeMode === '3day' ? 'active' : ''} onClick={() => setRangeMode('3day')}>3-Day</button>
          <button type="button" className={rangeMode === 'week' ? 'active' : ''} onClick={() => setRangeMode('week')}>Week</button>
          <button type="button" className={rangeMode === 'month' ? 'active' : ''} onClick={() => setRangeMode('month')}>Month</button>
        </div>

        {/* Undo / Redo */}
        <div className="dispatch-undo-redo">
          <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo" className="dispatch-undo-btn">&larr; Undo</button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo" className="dispatch-redo-btn">Redo &rarr;</button>
        </div>

        <div className="dispatch-view-toggle">
          <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
            Table{overflowCount > 0 && <span className="dispatch-overflow-badge">{overflowCount}</span>}
          </button>
          <button type="button" className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')} disabled={rangeMode !== 'day'}>Map</button>
        </div>
      </div>

      {/* Row 2: action buttons */}
      <div className="dispatch-header-row dispatch-header-actions-row">
        <button type="button" className="dispatch-upload-excel-btn" onClick={() => setShowExcelUpload((v) => !v)}>
          {showExcelUpload ? 'Hide upload' : 'Upload Excel'}
        </button>
        <button type="button" className="dispatch-manage-teams-btn" onClick={onManageTeams}>
          Manage Teams
        </button>
        {rangeMode === 'day' && (
          <div className="dispatch-copy-from-wrap">
            <button type="button" className="dispatch-copy-from-btn" onClick={handleCopyClick}>
              Copy from...
            </button>
            <input
              ref={copyDateRef}
              type="date"
              className="dispatch-copy-date-input"
              onChange={handleCopyDateChange}
              tabIndex={-1}
            />
          </div>
        )}
        <button
          type="button" className="dispatch-export-pdf-btn" onClick={exportPdf}
          disabled={rangeMode !== 'day'}
          title={rangeMode !== 'day' ? 'Switch to Day view to export' : 'Export PDF'}
        >Export PDF</button>
        <button
          type="button" className="dispatch-email-schedule-btn" onClick={openEmailDraft}
          disabled={rangeMode !== 'day'}
          title={rangeMode !== 'day' ? 'Switch to Day view to email' : 'Open email draft'}
        >Email Schedule</button>

        {/* Finalize button */}
        <button
          type="button"
          className={`dispatch-finalize-btn ${finalized ? 'finalized' : ''}`}
          onClick={onFinalize}
          disabled={saving || finalized}
          title={finalized ? 'Schedule has been finalized and sent to technicians' : 'Finalize and publish to technician schedule views'}
        >
          {saving ? 'Saving…' : finalized ? 'Finalized' : 'Finalize'}
        </button>

        {(emailError || emailSuccess) && (
          <span className={`dispatch-email-status ${emailError ? 'error' : 'ok'}`}>
            {emailError || emailSuccess}
          </span>
        )}
        {optimizeError && <span className="dispatch-optimize-error">{optimizeError}</span>}
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="dispatch-conflicts">
          {conflicts.map((c, i) => (
            <div key={i} className={`dispatch-conflict-item ${c.type}`}>
              {c.type === 'overtime' ? '⚠' : '⚡'} {c.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
