import React, { useState } from 'react';
import TimeTracking from '../components/TimeTracking';
import PMCommandCenter from '../components/PMCommandCenter';
import TimesheetReview from '../components/TimesheetReview';
import ScheduleView from '../components/ScheduleView';
import { pmDashboardHeaders, pmDashboardRows } from '../data/pmDashboardData';
import './Page.css';
import './FieldServices.css';

const DATE_RECEIVED_INDEX = 6;
const COMPLETION_DATE_INDEX = 15;

function formatExcelCell(value) {
  if (value === '' || value == null) return '';
  if (typeof value === 'number' && value > 40000 && value < 50000) {
    const d = new Date((value - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  return String(value).trim();
}

const FILE_CHECK_START_INDEX = 6;
const DATE_CHECK_START_INDEX = 14;
const PM_COLUMN_INDEX = 3;
const DISPLAY_FILE_CHECK_START = 5;
const DISPLAY_DATE_CHECK_START = 13;

function getPmDashboardDisplayData() {
  let headers = pmDashboardHeaders.filter((_, i) => i !== DATE_RECEIVED_INDEX);
  let rows = pmDashboardRows.map((row) => row.filter((_, i) => i !== DATE_RECEIVED_INDEX));
  headers = headers.filter((_, i) => i !== COMPLETION_DATE_INDEX);
  rows = rows.map((row) => row.filter((_, i) => i !== COMPLETION_DATE_INDEX));
  const mainHeaders = headers.slice(0, DATE_RECEIVED_INDEX);
  const fileCheckHeaders = headers.slice(FILE_CHECK_START_INDEX, DATE_CHECK_START_INDEX);
  const dateCheckHeaders = headers.slice(DATE_CHECK_START_INDEX);
  return { mainHeaders, fileCheckHeaders, dateCheckHeaders, headers, rows };
}

// Dummy "done" indicators for File Checks: rowIndex -> set of file-check column indices (0-based) to show ✓
const FILE_CHECK_DUMMY_DONE = {
  0: [0, 1],
  1: [0, 1, 2],
  2: [0, 3],
  3: [0, 1, 4],
  4: [0, 2, 5]
};

function getFileCheckCellDisplay(rowIndex, colIndex, cellValue) {
  const formatted = formatExcelCell(cellValue);
  if (formatted) return { text: formatted, isMissing: false, isDummy: false };
  const fileCheckColIndex = colIndex - FILE_CHECK_START_INDEX;
  const dummyDone = FILE_CHECK_DUMMY_DONE[rowIndex];
  const showDummy = dummyDone && dummyDone.includes(fileCheckColIndex);
  return {
    text: showDummy ? '✓' : '×',
    isMissing: !showDummy,
    isDummy: showDummy
  };
}

// SVG Icon Components
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const PackageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
  </svg>
);

const PMCenterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const CrewChiefIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);

const MitigationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
);

const ReconstructionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20"/>
    <path d="M5 20V8l7-5 7 5v12"/>
    <path d="M9 20v-6h6v6"/>
    <path d="M9 12h6"/>
  </svg>
);

const TimesheetReviewIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <path d="M9 14l2 2 4-4"/>
  </svg>
);

function FieldServices() {
  const [activeSection, setActiveSection] = useState(null);
  const [selectedPm, setSelectedPm] = useState('');

  const sections = [
    {
      id: 'time-tracking',
      title: 'Time Tracking',
      description: 'Clock in/out, track hours, and manage labor costs',
      icon: <ClockIcon />,
      highlight: true
    },
    {
      id: 'timesheet-review',
      title: 'Timesheet Review',
      description: 'Review and approve weekly timesheets before payroll',
      icon: <TimesheetReviewIcon />
    },
    {
      id: 'pm-center',
      title: 'PM Command Center',
      description: 'Project manager hub for job oversight and task management',
      icon: <PMCenterIcon />
    },
    {
      id: 'crew-chief-center',
      title: 'Crew Chief Command Center',
      description: 'Crew chief hub for daily assignments and crew coordination',
      icon: <CrewChiefIcon />
    },
    {
      id: 'mitigation-center',
      title: 'Mitigation Command Center',
      description: 'Mitigation operations hub for water, fire, and mold response',
      icon: <MitigationIcon />
    },
    {
      id: 'reconstruction-center',
      title: 'Reconstruction Command Center',
      description: 'Reconstruction hub for rebuild scheduling and progress tracking',
      icon: <ReconstructionIcon />
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Field Services</h1>
          <p>Manage field operations, technicians, and service schedules</p>
        </div>
      </div>

      <div className="field-services-content">
        <div className="field-services-grid">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`field-service-card${section.highlight ? ' field-service-card-highlight' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <div className="field-service-card-icon">
                {section.icon}
              </div>
              <div className="field-service-card-content">
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>
            </button>
          ))}
        </div>

        {activeSection && (
          <div className="field-service-detail">
            {activeSection === 'time-tracking' ? (
              <TimeTracking />
            ) : activeSection === 'pm-center' ? (
              <PMCommandCenter />
            ) : activeSection === 'timesheet-review' ? (
              <TimesheetReview />
            ) : activeSection === 'pm-dashboard' ? (
              (() => {
                const { rows, headers } = getPmDashboardDisplayData();
                const pmNames = [...new Set(rows.map((r) => String(r[PM_COLUMN_INDEX] || '').trim()).filter(Boolean))].sort();
                const filteredRows = selectedPm
                  ? rows.filter((row) => String(row[PM_COLUMN_INDEX] || '').trim() === selectedPm)
                  : rows;
                const displayHeaders = headers.filter((_, i) => i !== PM_COLUMN_INDEX);
                const displayRows = filteredRows.map((row) => row.filter((_, i) => i !== PM_COLUMN_INDEX));
                const displayMainHeaders = displayHeaders.slice(0, DISPLAY_FILE_CHECK_START);
                const displayFileCheckHeaders = displayHeaders.slice(DISPLAY_FILE_CHECK_START, DISPLAY_DATE_CHECK_START);
                const displayDateCheckHeaders = displayHeaders.slice(DISPLAY_DATE_CHECK_START);
                return (
                  <div className="pm-dashboard-panel">
                    <div className="pm-dashboard-header">
                      <div className="pm-dashboard-header-top">
                        <h2>PM File Compliance</h2>
                        <span className="pm-dashboard-count">
                          {filteredRows.length} job{filteredRows.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="pm-dashboard-header-bottom">
                        <label className="pm-dashboard-pm-label" htmlFor="pm-file-compliance-pm-select">
                          PM
                        </label>
                        <select
                          id="pm-file-compliance-pm-select"
                          className="pm-dashboard-pm-select"
                          value={selectedPm}
                          onChange={(e) => setSelectedPm(e.target.value)}
                        >
                          <option value="">All</option>
                          {pmNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="pm-dashboard-table-wrap">
                      <table className="pm-dashboard-table">
                        <thead>
                          <tr className="pm-dashboard-thead-group">
                            {displayMainHeaders.map((h, i) => (
                              <th key={i} className="pm-dashboard-th" rowSpan={2}>
                                {formatExcelCell(h)}
                              </th>
                            ))}
                            <th colSpan={displayFileCheckHeaders.length} className="pm-dashboard-th pm-dashboard-th-group">
                              File Checks
                            </th>
                            <th colSpan={displayDateCheckHeaders.length} className="pm-dashboard-th pm-dashboard-th-group">
                              Date Checks
                            </th>
                          </tr>
                          <tr className="pm-dashboard-thead-sub">
                            {displayFileCheckHeaders.map((h, i) => (
                              <th key={i} className="pm-dashboard-th">
                                {formatExcelCell(h)}
                              </th>
                            ))}
                            {displayDateCheckHeaders.map((h, i) => (
                              <th key={i} className="pm-dashboard-th">
                                {formatExcelCell(h)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayRows.map((row, ri) => (
                            <tr key={ri} className="pm-dashboard-tr">
                              {row.map((cell, ci) => {
                                const isFileCheck = ci >= DISPLAY_FILE_CHECK_START && ci < DISPLAY_DATE_CHECK_START;
                                const display = isFileCheck
                                  ? getFileCheckCellDisplay(ri, ci, cell)
                                  : { text: formatExcelCell(cell) || '—', isMissing: false, isDummy: false };
                                const tdClass = [
                                  'pm-dashboard-td',
                                  display.isMissing && 'pm-dashboard-td-missing',
                                  display.isDummy && 'pm-dashboard-td-done'
                                ].filter(Boolean).join(' ');
                                return (
                                  <td key={ci} className={tdClass}>
                                    {display.text}
                                  </td>
                                );
                              })}
                              {displayHeaders.length > row.length &&
                                Array.from({ length: displayHeaders.length - row.length }).map((_, i) => (
                                  <td key={`empty-${i}`} className="pm-dashboard-td pm-dashboard-td-missing">
                                    ×
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            ) : activeSection === 'documentation' ? (
              <div className="documentation-panel">
                <div className="documentation-header">
                  <h2>Sample Job: Farmers Job</h2>
                  <p className="documentation-subtitle">
                    Example job packet and site checklist for a Farmers claim.
                  </p>
                </div>

                <div className="documentation-layout">
                  <div className="documentation-job-card">
                    <h3>Job Snapshot</h3>
                    <div className="job-meta">
                      <div>
                        <div className="job-label">Carrier</div>
                        <div className="job-value">Farmers Insurance</div>
                      </div>
                      <div>
                        <div className="job-label">Job Type</div>
                        <div className="job-value">Water Mitigation</div>
                      </div>
                      <div>
                        <div className="job-label">Property</div>
                        <div className="job-value">123 Main St, Anytown</div>
                      </div>
                      <div>
                        <div className="job-label">PM / Lead Tech</div>
                        <div className="job-value">Sample: J. Doe</div>
                      </div>
                    </div>
                    <div className="job-notes">
                      Use this as a visual example only. We will later replace
                      this with a real job packet and checklist content from
                      your Farmers PDF.
                    </div>
                  </div>

                  <div className="documentation-checklist">
                    <h3>Farmers Job – Field Documentation Checklist</h3>

                    <div className="checklist-section">
                      <div className="checklist-section-title">DAY 1 (24 HRS FROM START)</div>
                      <ul>
                        <li>
                          <span className="check-square" />
                          Contact customer in 60 min
                        </li>
                        <li>
                          <span className="check-square" />
                          On-site in 4 hours
                        </li>
                        <li>
                          <span className="check-square" />
                          Upload: scope, photos, sketch
                        </li>
                        <li>
                          <span className="check-square" />
                          Photos: front, pre-mitigation, COL, equipment
                        </li>
                        <li>
                          <span className="check-square" />
                          Mark &quot;site inspected&quot; in XA
                        </li>
                        <li>
                          <span className="check-square" />
                          Upload 24-Hr Scope Report
                        </li>
                        <li>
                          <span className="check-square" />
                          Doc ALL communication in XA Notes
                        </li>
                      </ul>
                    </div>

                    <div className="checklist-section">
                      <div className="checklist-section-title">DAY 3 (BY END 3RD BIZ DAY)</div>
                      <ul>
                        <li>
                          <span className="check-square" />
                          CALL ADJUSTER - status / scope / questions
                        </li>
                        <li>
                          <span className="check-square" />
                          If no answer, doc attempt w/ date / time
                        </li>
                      </ul>
                    </div>

                    <div className="checklist-section">
                      <div className="checklist-section-title">DAY 4 (WITHIN 4 DAYS)</div>
                      <ul>
                        <li>
                          <span className="check-square" />
                          Upload prelim estimate &gt;$0 + all demo
                        </li>
                      </ul>
                    </div>

                    <div className="checklist-section">
                      <div className="checklist-section-title">DURING JOB - DAILY</div>
                      <ul>
                        <li>
                          <span className="check-square" />
                          DryBook Mobile readings (required)
                        </li>
                        <li>
                          <span className="check-square" />
                          XA Notes for comm (phone = urgent only)
                        </li>
                        <li>
                          <span className="check-square" />
                          Doc approvals: name, date / time, summary
                        </li>
                      </ul>
                    </div>

                    <div className="checklist-section">
                      <div className="checklist-section-title">CALL ADJUSTER NOW FOR:</div>
                      <ul>
                        <li>
                          <span className="check-square" />
                          3+ drying chambers (single level)
                        </li>
                        <li>
                          <span className="check-square" />
                          Mold &gt;10 sq ft | CAT 3 water
                        </li>
                        <li>
                          <span className="check-square" />
                          ANY demolition | Specialty equipment
                        </li>
                        <li>
                          <span className="check-square" />
                          Subcontractors | Pack-out
                        </li>
                        <li>
                          <span className="check-square" />
                          Continuous flooring | Pre-existing damage
                        </li>
                        <li>
                          <span className="check-square" />
                          Job &gt;$50K (commercial)
                        </li>
                      </ul>
                    </div>

                    <div className="checklist-section">
                      <div className="checklist-section-title">FLOORING</div>
                      <ul>
                        <li>
                          <span className="check-square" />
                          ITEL sample in 24 hrs if &gt;100 SF removed
                        </li>
                        <li>
                          <span className="check-square" />
                          Doc ITEL in XA Notes | Keep 1 sample
                        </li>
                      </ul>
                    </div>

                    <div className="checklist-section">
                      <div className="checklist-section-title">FINAL UPLOAD (5 DAYS FROM DONE)</div>
                      <ul>
                        <li>
                          <span className="check-square" />
                          All photos (pre / during / post)
                        </li>
                        <li>
                          <span className="check-square" />
                          Final estimate | Form #28000
                        </li>
                        <li>
                          <span className="check-square" />
                          DryBook Report | Sub invoices
                        </li>
                        <li>
                          <span className="check-square" />
                          Tax ID | Accurate sketch
                        </li>
                        <li>
                          <span className="check-square" />
                          Run MICA / QA Assist (water jobs)
                        </li>
                        <li>
                          <span className="check-square" />
                          Mark &quot;Complete&quot; in XA
                        </li>
                      </ul>
                    </div>

                    <div className="checklist-section">
                      <div className="checklist-section-title">CRITICAL DON&apos;TS - NO:</div>
                      <ul>
                        <li>
                          <span className="check-square" />
                          NO: supervisory fees, fuel charges, trip charges
                        </li>
                        <li>
                          <span className="check-square" />
                          NO: &quot;heavy&quot; codes, labor mins, mobilization
                        </li>
                        <li>
                          <span className="check-square" />
                          NO: axial fans, soliciting reconstruction (unless RAPA)
                        </li>
                        <li>
                          <span className="check-square" />
                          NO: delaying for asbestos test or drying &gt;3 days
                        </li>
                      </ul>
                    </div>

                    <div className="checklist-section">
                      <div className="checklist-section-title">EQUIPMENT RULES</div>
                      <ul>
                        <li>
                          <span className="check-square" />
                          Charge exact run time only
                        </li>
                        <li>
                          <span className="check-square" />
                          HEPA: 0.25 / job (1.0 mold / sewage)
                        </li>
                        <li>
                          <span className="check-square" />
                          Monitoring: 1-5 = 1 hr, 6-10 = 1.5 hr, 11-15 = 2 hr, 16-20 = ...
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <h2>{sections.find(s => s.id === activeSection)?.title}</h2>
                <p>This feature is coming soon.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FieldServices;
