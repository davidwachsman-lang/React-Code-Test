import React, { useState } from 'react';
import TimeTracking from '../components/TimeTracking';
import ScheduleView from '../components/ScheduleView';
import './FieldServices.css';

// SVG Icon Components
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ClipboardCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="M9 14l2 2 4-4"/>
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

function FieldServices() {
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'schedule',
      title: 'Schedule & Dispatch',
      description: 'Assign technicians, schedule jobs, and manage routes',
      icon: <CalendarIcon />
    },
    {
      id: 'execution',
      title: 'Job Execution',
      description: 'Track active jobs, time tracking, and task completion',
      icon: <ClipboardCheckIcon />
    },
    {
      id: 'time-tracking',
      title: 'Time Tracking',
      description: 'Clock in/out, track hours, and manage labor costs',
      icon: <ClockIcon />
    },
    {
      id: 'equipment',
      title: 'Equipment & Inventory',
      description: 'Manage equipment, tools, and material inventory',
      icon: <PackageIcon />
    },
    {
      id: 'documentation',
      title: 'Field Documentation & Compliance',
      description: 'Safety reports, photos, signatures, and compliance forms',
      icon: <FileTextIcon />
    }
  ];

  return (
    <div className="precision-layout">
      <div className="precision-main">
        <div className="precision-header">
          <div>
            <h1>Field Services</h1>
            <p className="precision-header-subtitle">Manage field operations, technicians, and service schedules</p>
          </div>
          {activeSection && (
            <button
              type="button"
              className="field-services-back-btn"
              onClick={() => setActiveSection(null)}
            >
              Back to menu
            </button>
          )}
        </div>

        <div className="precision-content">
          <div className="field-services-grid">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`field-service-card ${activeSection === section.id ? 'active' : ''}`}
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
            {activeSection === 'schedule' ? (
              <ScheduleView />
            ) : activeSection === 'time-tracking' ? (
              <TimeTracking />
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
    </div>
  );
}

export default FieldServices;
