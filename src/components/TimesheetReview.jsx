import React, { useState, useMemo } from 'react';
import { mockTimesheetEntries, mockTimesheetFlags, pmCrewMapping, employeeRoles, TIME_TYPES, ALL_TIME_TYPES } from '../data/timesheetReviewData';
import './TimesheetReview.css';

const BLENDED_RATE = 35;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TYPE_KEYS = Object.keys(TIME_TYPES);

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatWeekLabel(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `Week of ${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDayIndex(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

const FLAG_ICONS = {
  overtime: '⏱',
  missing_clockout: '⚠',
  no_lunch: '🍽',
  weekend: '📅',
};

const FLAG_LABELS = {
  overtime: 'Overtime',
  missing_clockout: 'Missing Clock-out',
  no_lunch: 'No Lunch Break',
  weekend: 'Weekend Work',
};

function TimesheetReview() {
  const [selectedPm, setSelectedPm] = useState('Kevin');
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState(mockTimesheetEntries);
  const [expandedTechs, setExpandedTechs] = useState({});
  const [activeTab, setActiveTab] = useState('technician');

  const baseWeekStart = getWeekStart(new Date('2026-02-24'));
  const currentWeekStart = useMemo(() => {
    const d = new Date(baseWeekStart);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const crewNames = pmCrewMapping[selectedPm] || [];

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => crewNames.includes(e.technician_name));
  }, [entries, crewNames]);

  const filteredFlags = useMemo(() => {
    return mockTimesheetFlags.filter((f) => crewNames.includes(f.technician));
  }, [crewNames]);

  // KPIs
  const techCount = new Set(filteredEntries.map((e) => e.technician_name)).size;
  const totalHours = filteredEntries.reduce((sum, e) => sum + e.total_hours, 0);
  const pendingCount = filteredEntries.filter((e) => e.status === 'pending').length;
  const laborCost = totalHours * BLENDED_RATE;

  // Hours by type
  const hoursByType = useMemo(() => {
    const map = {};
    TYPE_KEYS.forEach((k) => { map[k] = 0; });
    filteredEntries.forEach((e) => {
      if (map[e.time_type] !== undefined) map[e.time_type] += e.total_hours;
    });
    return map;
  }, [filteredEntries]);

  const allReviewed = filteredEntries.length > 0 && filteredEntries.every((e) => e.status !== 'pending');

  // Group entries by technician
  const byTechnician = useMemo(() => {
    const grouped = {};
    filteredEntries.forEach((e) => {
      if (!grouped[e.technician_name]) grouped[e.technician_name] = [];
      grouped[e.technician_name].push(e);
    });
    return grouped;
  }, [filteredEntries]);

  function bulkUpdateTechnician(techName, status) {
    setEntries((prev) =>
      prev.map((e) => (e.technician_name === techName && crewNames.includes(techName) ? { ...e, status } : e))
    );
  }

  function toggleTech(name) {
    setExpandedTechs((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function cycleEntryStatus(id) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const next = e.status === 'pending' ? 'approved' : e.status === 'approved' ? 'rejected' : 'pending';
        return { ...e, status: next };
      })
    );
  }

  function getTechStatus(techEntries) {
    const statuses = new Set(techEntries.map((e) => e.status));
    if (statuses.size === 1) return [...statuses][0];
    return 'mixed';
  }

  function getTechWeeklyHours(techEntries) {
    return techEntries.reduce((s, e) => s + e.total_hours, 0);
  }

  function getTechHoursByType(techEntries) {
    const map = { driving: 0 };
    TYPE_KEYS.forEach((k) => { map[k] = 0; });
    techEntries.forEach((e) => {
      if (map[e.time_type] !== undefined) map[e.time_type] += e.total_hours;
    });
    return map;
  }

  // --- Render tabs ---

  function getJobsForTech(techEntries) {
    const jobs = {};
    techEntries.forEach((e) => {
      const key = e.job_number;
      if (!jobs[key]) jobs[key] = { job_number: key, customer: e.customer, entries: [] };
      jobs[key].entries.push(e);
    });
    return Object.values(jobs);
  }

  function renderByTechnician() {
    const techNames = Object.keys(byTechnician);

    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="tsr-summary-table">
          <thead>
            <tr className="tsr-summary-group-row">
              <th colSpan={2}></th>
              <th colSpan={TYPE_KEYS.length + 1} className="tsr-summary-group-header">Hours</th>
              <th colSpan={3} className="tsr-summary-group-header">Stats</th>
              <th colSpan={2}></th>
            </tr>
            <tr>
              <th className="tsr-summary-th-name">Employee</th>
              <th>Role</th>
              {TYPE_KEYS.map((t) => (
                <th key={t} style={{ color: TIME_TYPES[t].color }}>{TIME_TYPES[t].label}</th>
              ))}
              <th>Total</th>
              <th className="tsr-stat-header">% Driving</th>
              <th className="tsr-stat-header">% Training</th>
              <th className="tsr-stat-header">% OT</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {techNames.map((name) => {
              const techEntries = byTechnician[name];
              const expanded = expandedTechs[name];
              const weeklyHrs = getTechWeeklyHours(techEntries);
              const status = getTechStatus(techEntries);
              const typeHrs = getTechHoursByType(techEntries);
              const jobs = getJobsForTech(techEntries);

              return (
                <React.Fragment key={name}>
                  <tr className="tsr-summary-row" onClick={() => toggleTech(name)}>
                    <td className="tsr-summary-td-name">
                      <span className={`tsr-tech-chevron${expanded ? ' tsr-expanded' : ''}`}>▶</span>
                      {name}
                    </td>
                    <td>{employeeRoles[name] || 'Tech'}</td>
                    {TYPE_KEYS.map((t) => (
                      <td key={t} style={{ color: typeHrs[t] > 0 ? TIME_TYPES[t].color : '#475569' }}>
                        {typeHrs[t] > 0 ? typeHrs[t].toFixed(1) : '—'}
                      </td>
                    ))}
                    <td className="tsr-summary-total-cell">
                      {weeklyHrs.toFixed(1)}
                      {weeklyHrs > 40 && (
                        <span className="tsr-ot-label"> ({(weeklyHrs - 40).toFixed(1)} OT)</span>
                      )}
                    </td>
                    <td className="tsr-stat-cell">{weeklyHrs > 0 ? `${((typeHrs.driving / weeklyHrs) * 100).toFixed(0)}%` : '—'}</td>
                    <td className="tsr-stat-cell">{weeklyHrs > 0 && typeHrs.training > 0 ? `${((typeHrs.training / weeklyHrs) * 100).toFixed(0)}%` : '—'}</td>
                    <td className="tsr-stat-cell">{weeklyHrs > 40 ? `${(((weeklyHrs - 40) / weeklyHrs) * 100).toFixed(0)}%` : '—'}</td>
                    <td><span className={`tsr-status-badge tsr-status-${status}`}>{status}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="tsr-tech-actions">
                        <button className="tsr-btn-approve" onClick={() => bulkUpdateTechnician(name, 'approved')}>Approve All</button>
                        <button className="tsr-btn-reject" onClick={() => bulkUpdateTechnician(name, 'rejected')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                  {expanded && jobs.map((job) => {
                    const jobHrs = job.entries.reduce((s, e) => s + e.total_hours, 0);
                    return (
                      <React.Fragment key={job.job_number}>
                        <tr className="tsr-job-header-row">
                          <td colSpan={TYPE_KEYS.length + 8}>
                            <span className="tsr-job-number">{job.job_number}</span>
                            {job.customer && <span className="tsr-job-customer">{job.customer}</span>}
                            <span className="tsr-job-hours">{jobHrs.toFixed(1)}h</span>
                          </td>
                        </tr>
                        {job.entries.map((entry) => (
                          <tr className="tsr-detail-row" key={entry.id}>
                            <td className="tsr-detail-date">{formatDate(entry.date)}</td>
                            <td colSpan={2}>
                              <span
                                className="tsr-type-badge"
                                style={{ background: `${ALL_TIME_TYPES[entry.time_type]?.color || '#64748b'}20`, color: ALL_TIME_TYPES[entry.time_type]?.color || '#64748b' }}
                              >
                                {ALL_TIME_TYPES[entry.time_type]?.label || entry.time_type}
                              </span>
                            </td>
                            <td>{entry.clock_in_time}</td>
                            <td>{entry.clock_out_time || '—'}</td>
                            <td>{entry.total_hours > 0 ? entry.total_hours.toFixed(1) : '—'}</td>
                            <td className="tsr-detail-notes">{entry.notes}</td>
                            <td>
                              <button
                                className={`tsr-entry-toggle tsr-toggle-${entry.status}`}
                                onClick={() => cycleEntryStatus(entry.id)}
                                title="Click to cycle status"
                              >
                                {entry.status === 'approved' ? '✓' : entry.status === 'rejected' ? '✕' : '●'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {techNames.length === 0 && (
              <tr>
                <td colSpan={TYPE_KEYS.length + 8} style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                  No timesheet entries for this crew this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderDailyView() {
    const techNames = Object.keys(byTechnician);

    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="tsr-daily-grid">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Technician</th>
              {DAY_LABELS.map((d) => (
                <th key={d}>{d}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {techNames.map((name) => {
              const techEntries = byTechnician[name];
              // Build per-day breakdown by type
              const dayData = Array.from({ length: 7 }, () => ({}));

              techEntries.forEach((e) => {
                const idx = getDayIndex(e.date);
                const t = e.time_type || 'job';
                dayData[idx][t] = (dayData[idx][t] || 0) + e.total_hours;
              });

              const total = techEntries.reduce((s, e) => s + e.total_hours, 0);

              return (
                <tr key={name}>
                  <td>{name}</td>
                  {dayData.map((typeMap, i) => {
                    const dayTotal = Object.values(typeMap).reduce((s, v) => s + v, 0);
                    const hasData = dayTotal > 0;
                    return (
                      <td key={i}>
                        {hasData ? (
                          <div className="tsr-daily-cell-stack">
                            {TYPE_KEYS.map((t) =>
                              typeMap[t] ? (
                                <span
                                  key={t}
                                  className="tsr-daily-type-chip"
                                  style={{ background: `${TIME_TYPES[t].color}25`, color: TIME_TYPES[t].color }}
                                  title={TIME_TYPES[t].label}
                                >
                                  {typeMap[t].toFixed(1)}
                                </span>
                              ) : null
                            )}
                            <span className="tsr-daily-day-total">{dayTotal.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="tsr-daily-cell tsr-daily-cell-empty">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="tsr-daily-total">{total.toFixed(1)}</td>
                </tr>
              );
            })}
            {techNames.length === 0 && (
              <tr>
                <td colSpan={9} style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                  No entries for this crew this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Legend */}
        <div className="tsr-daily-legend">
          {TYPE_KEYS.map((t) => (
            <span key={t} className="tsr-legend-item">
              <span className="tsr-legend-dot" style={{ background: TIME_TYPES[t].color }} />
              {TIME_TYPES[t].label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  function renderExceptions() {
    if (filteredFlags.length === 0) {
      return (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
          No exceptions flagged for this crew this week.
        </div>
      );
    }

    return (
      <div>
        {filteredFlags.map((flag) => (
          <div className="tsr-flag-card" key={flag.id}>
            <div className={`tsr-flag-icon tsr-flag-icon-${flag.type}`}>{FLAG_ICONS[flag.type]}</div>
            <div className="tsr-flag-details">
              <div className="tsr-flag-title">{flag.technician}</div>
              <div className="tsr-flag-meta">
                {formatDate(flag.date)} · {flag.jobNumber}
              </div>
              <div className="tsr-flag-desc">{flag.description}</div>
            </div>
            <span className="tsr-flag-type-badge">{FLAG_LABELS[flag.type]}</span>
            <div className="tsr-flag-actions">
              <button className="tsr-btn-approve" title="Acknowledge">✓</button>
              <button className="tsr-btn-reject" title="Escalate">!</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="tsr-container">
      {/* Top Bar */}
      <div className="tsr-top-bar">
        <div className="tsr-pm-selector">
          <label htmlFor="tsr-pm-select">PM</label>
          <select
            id="tsr-pm-select"
            className="tsr-pm-select"
            value={selectedPm}
            onChange={(e) => setSelectedPm(e.target.value)}
          >
            {Object.keys(pmCrewMapping).map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </div>

        <div className="tsr-week-picker">
          <button className="tsr-week-btn" onClick={() => setWeekOffset((o) => o - 1)}>
            ‹
          </button>
          <span className="tsr-week-label">{formatWeekLabel(currentWeekStart)}</span>
          <button className="tsr-week-btn" onClick={() => setWeekOffset((o) => o + 1)}>
            ›
          </button>
        </div>

        <button className="tsr-submit-btn" disabled={!allReviewed}>
          Submit to Payroll
        </button>
      </div>

      {/* KPI Row */}
      <div className="tsr-kpi-row">
        <div className="tsr-kpi-card">
          <div className="tsr-kpi-label">Technicians</div>
          <div className="tsr-kpi-value">{techCount}</div>
        </div>
        <div className="tsr-kpi-card">
          <div className="tsr-kpi-label">Total Hours</div>
          <div className="tsr-kpi-value">{totalHours.toFixed(1)}</div>
          <div className="tsr-kpi-type-breakdown">
            {TYPE_KEYS.map((t) =>
              hoursByType[t] > 0 ? (
                <span key={t} className="tsr-kpi-type-item" style={{ color: TIME_TYPES[t].color }}>
                  {TIME_TYPES[t].label}: {hoursByType[t].toFixed(1)}
                </span>
              ) : null
            )}
          </div>
        </div>
        <div className="tsr-kpi-card">
          <div className="tsr-kpi-label">Pending Review</div>
          <div className="tsr-kpi-value">{pendingCount}</div>
          <div className="tsr-kpi-sub">{filteredEntries.length} total entries</div>
        </div>
        <div className="tsr-kpi-card">
          <div className="tsr-kpi-label">Est. Labor Cost</div>
          <div className="tsr-kpi-value">${laborCost.toLocaleString()}</div>
          <div className="tsr-kpi-sub">@${BLENDED_RATE}/hr</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tsr-tabs">
        <button
          className={`tsr-tab${activeTab === 'technician' ? ' tsr-tab-active' : ''}`}
          onClick={() => setActiveTab('technician')}
        >
          By Employee
        </button>
        <button
          className={`tsr-tab${activeTab === 'daily' ? ' tsr-tab-active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          Daily View
        </button>
        <button
          className={`tsr-tab${activeTab === 'exceptions' ? ' tsr-tab-active' : ''}`}
          onClick={() => setActiveTab('exceptions')}
        >
          Exceptions & Flags
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'technician' && renderByTechnician()}
      {activeTab === 'daily' && renderDailyView()}
      {activeTab === 'exceptions' && renderExceptions()}
    </div>
  );
}

export default TimesheetReview;
