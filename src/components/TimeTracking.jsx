import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import timeTrackingService from '../services/timeTrackingService';
import dispatchTeamService from '../services/dispatchTeamService';
import './TimeTracking.css';

const JOB_FILE_CHECKLIST = [
  // Setup (3)
  { group: 'Setup', label: 'Job Locked' },
  { group: 'Setup', label: 'DBMX File Created' },
  { group: 'Setup', label: 'Start Date Entered' },
  // Agreements (3)
  { group: 'Agreements', label: 'ATP Signed' },
  { group: 'Agreements', label: 'Customer Information Form Signed' },
  { group: 'Agreements', label: 'Equipment Responsibility Form Signed' },
  // Photos (4)
  { group: 'Photos', label: 'Cause of Loss Photo' },
  { group: 'Photos', label: 'Front of Structure Photo' },
  { group: 'Photos', label: 'Pre-Mitigation Photos' },
  { group: 'Photos', label: 'Daily Departure Photos' },
  // Field Work (4)
  { group: 'Field Work', label: 'DocuSketch Uploaded' },
  { group: 'Field Work', label: 'Initial Scope Sheet Entered' },
  { group: 'Field Work', label: 'Equipment Placed and Logged' },
  { group: 'Field Work', label: 'Initial Atmospheric Readings Taken' },
  // Notes (2)
  { group: 'Notes', label: 'Day 1 Note Entered' },
  { group: 'Notes', label: 'Initial Inspection Questions Answered' },
];

const CREW_CHIEFS = ['Gabriel', 'David', 'Michael', 'Ramon', 'Roger', 'Pedro', 'Monica'];
const TECHS = ['Genesis', 'Tyler', 'Josue', 'Frank', 'Juan', 'Leslie'];
const ALL_FIELD_NAMES = [
  ...CREW_CHIEFS.map((n) => ({ name: n, role: 'Crew Chief' })),
  ...TECHS.map((n) => ({ name: n, role: 'Tech' })),
];

function TimeTracking() {
  const { user } = useAuth();

  // Checklist expand state (keyed by jobNumber)
  const [openChecklist, setOpenChecklist] = useState(null);
  // Checklist checked state: { [jobNumber]: { [label]: true/false } }
  const [checkedItems, setCheckedItems] = useState({});

  // Temp labor
  const [tempWorkers, setTempWorkers] = useState([]); // [{name, id, company}]
  const [tempNameInput, setTempNameInput] = useState('');
  const [showTempPanel, setShowTempPanel] = useState(false);
  // Track temp clock-in state: { [tempId]: { activeJobNumber, clockInTime, entries: [{job, in, out, hours}] } }
  const [tempTimeState, setTempTimeState] = useState({});

  // Identity
  const [technicianName, setTechnicianName] = useState('');
  const [nameLocked, setNameLocked] = useState(false);
  const [crewNames, setCrewNames] = useState([]);
  const [showCrewDropdown, setShowCrewDropdown] = useState(false);

  // Load admin-assigned temp workers for this crew chief (after name is locked)
  useEffect(() => {
    if (!nameLocked || !technicianName) return;
    try {
      const stored = localStorage.getItem('temp-labor-workers');
      if (stored) {
        const all = JSON.parse(stored);
        const mine = all.filter(
          (w) => w.active && w.assignedTo && w.assignedTo.toLowerCase() === technicianName.toLowerCase()
        );
        if (mine.length > 0) {
          setTempWorkers(mine);
          setShowTempPanel(true);
          const initState = {};
          mine.forEach((w) => {
            initState[w.id] = { activeJobNumber: null, clockInTime: null, entries: [] };
          });
          setTempTimeState((prev) => ({ ...initState, ...prev }));
        }
      }
    } catch {}
  }, [nameLocked, technicianName]);

  // Data
  const [dispatchJobs, setDispatchJobs] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [todayEntries, setTodayEntries] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Auto-populate name from auth
  useEffect(() => {
    const fullName = user?.user_metadata?.full_name;
    if (fullName && !nameLocked) {
      setTechnicianName(fullName);
    }
  }, [user, nameLocked]);

  // Load crew names for fallback dropdown
  useEffect(() => {
    const loadCrews = async () => {
      try {
        const { lanes } = await dispatchTeamService.loadTeams();
        const names = lanes
          .filter((l) => l.type === 'crew')
          .map((l) => l.name);
        setCrewNames(names);
      } catch (err) {
        console.error('Failed to load crew names:', err);
      }
    };
    loadCrews();
  }, []);

  // Load all data when name is set
  const loadAllData = useCallback(async (name) => {
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const [jobs, active, today, recent] = await Promise.all([
        timeTrackingService.getTodayDispatchJobs(name),
        timeTrackingService.getActiveEntry(name),
        timeTrackingService.getTodayEntries(name),
        timeTrackingService.getEntriesByTechnician(name, 10),
      ]);
      setDispatchJobs(jobs);
      setActiveEntry(active);
      setTodayEntries(today);
      setRecentEntries(recent);
      setDataLoaded(true);

      // If no dispatch jobs found and auth name didn't match a lane, show dropdown
      if (jobs.length === 0 && crewNames.length > 0) {
        const authName = user?.user_metadata?.full_name || '';
        const matchesAuthName = authName.toLowerCase() === name.toLowerCase();
        if (matchesAuthName) {
          // Auth name didn't match any lane — offer crew dropdown
          setShowCrewDropdown(true);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [crewNames.length, user]);

  // Trigger data load when name is set and locked
  useEffect(() => {
    if (technicianName && nameLocked) {
      loadAllData(technicianName);
    }
  }, [technicianName, nameLocked, loadAllData]);

  // Auto-lock name from auth on mount
  useEffect(() => {
    const fullName = user?.user_metadata?.full_name;
    if (fullName && !nameLocked) {
      setTechnicianName(fullName);
      setNameLocked(true);
    }
  }, [user, nameLocked]);

  // Elapsed timer for active entry
  useEffect(() => {
    if (activeEntry?.clock_in_time) {
      const update = () => {
        const ms = Date.now() - new Date(activeEntry.clock_in_time).getTime();
        setElapsed(ms);
      };
      update();
      timerRef.current = setInterval(update, 1000);
      return () => clearInterval(timerRef.current);
    } else {
      setElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [activeEntry]);

  // Refresh data helper
  const refreshData = async () => {
    if (!technicianName) return;
    try {
      const [active, today, recent] = await Promise.all([
        timeTrackingService.getActiveEntry(technicianName),
        timeTrackingService.getTodayEntries(technicianName),
        timeTrackingService.getEntriesByTechnician(technicianName, 10),
      ]);
      setActiveEntry(active);
      setTodayEntries(today);
      setRecentEntries(recent);
    } catch (err) {
      console.error('Refresh error:', err);
    }
  };

  // Clock in
  const handleClockIn = async (jobNumber) => {
    setError(null);
    setLoading(true);
    try {
      if (activeEntry) throw new Error('Already clocked in. Please clock out first.');
      await timeTrackingService.clockIn(technicianName, jobNumber, '');
      await refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle checklist item
  const toggleCheckItem = (jobNumber, label) => {
    setCheckedItems((prev) => ({
      ...prev,
      [jobNumber]: {
        ...prev[jobNumber],
        [label]: !prev[jobNumber]?.[label],
      },
    }));
  };

  // Clock out
  const handleClockOut = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!activeEntry) throw new Error('No active time entry found');
      await timeTrackingService.clockOut(activeEntry.id);
      await refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Switch crew name from dropdown
  const handleCrewSelect = (name) => {
    setTechnicianName(name);
    setNameLocked(true);
    setShowCrewDropdown(false);
    setDataLoaded(false);
  };

  // --- Temp labor helpers ---
  const addTempWorker = () => {
    const name = tempNameInput.trim();
    if (!name) return;
    if (tempWorkers.some((w) => w.name.toLowerCase() === name.toLowerCase())) return;
    const id = 'temp-' + Date.now();
    setTempWorkers((prev) => [...prev, { name, id }]);
    setTempTimeState((prev) => ({ ...prev, [id]: { activeJobNumber: null, clockInTime: null, entries: [] } }));
    setTempNameInput('');
  };

  const removeTempWorker = (id) => {
    setTempWorkers((prev) => prev.filter((w) => w.id !== id));
    setTempTimeState((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const tempClockIn = (tempId, jobNumber) => {
    setTempTimeState((prev) => ({
      ...prev,
      [tempId]: {
        ...prev[tempId],
        activeJobNumber: jobNumber,
        clockInTime: new Date().toISOString(),
      },
    }));
  };

  const tempClockOut = (tempId) => {
    setTempTimeState((prev) => {
      const state = prev[tempId];
      if (!state || !state.activeJobNumber) return prev;
      const clockOut = new Date();
      const clockIn = new Date(state.clockInTime);
      const hours = (clockOut - clockIn) / (1000 * 60 * 60);
      return {
        ...prev,
        [tempId]: {
          activeJobNumber: null,
          clockInTime: null,
          entries: [
            ...state.entries,
            {
              job: state.activeJobNumber,
              in: state.clockInTime,
              out: clockOut.toISOString(),
              hours: hours.toFixed(2),
            },
          ],
        },
      };
    });
  };

  const tempClockAllIn = (jobNumber) => {
    tempWorkers.forEach((w) => {
      const state = tempTimeState[w.id];
      if (!state || state.activeJobNumber) return; // skip if already clocked in somewhere
      tempClockIn(w.id, jobNumber);
    });
  };

  const tempClockAllOut = () => {
    tempWorkers.forEach((w) => {
      const state = tempTimeState[w.id];
      if (state && state.activeJobNumber) {
        tempClockOut(w.id);
      }
    });
  };

  const getTempStatusForJob = (tempId, jobNumber) => {
    const state = tempTimeState[tempId];
    if (!state) return 'upcoming';
    if (state.activeJobNumber === jobNumber) return 'active';
    if (state.entries.some((e) => e.job === jobNumber)) return 'completed';
    return 'upcoming';
  };

  const getTempTotalHoursForJob = (tempId, jobNumber) => {
    const state = tempTimeState[tempId];
    if (!state) return 0;
    return state.entries
      .filter((e) => e.job === jobNumber)
      .reduce((sum, e) => sum + parseFloat(e.hours || 0), 0);
  };

  // --- Computed values ---

  // Build full timeline: WIP first, then dispatched jobs
  const wipEntry = {
    jobNumber: 'HOME-OFFICE',
    jobType: 'WIP Meeting',
    customer: 'Home Office',
    address: '',
    scheduledTime: (() => {
      const d = new Date();
      d.setHours(7, 45, 0, 0);
      return d.toISOString();
    })(),
    estimatedHours: 0.5,
    driveTimeMinutes: 0,
    routeOrder: 0,
    isWip: true,
  };
  const timelineJobs = [wipEntry, ...dispatchJobs];

  // Match jobs to today's entries
  const getJobStatus = (job) => {
    if (activeEntry && activeEntry.job_number === job.jobNumber) return 'active';
    const entry = todayEntries.find(
      (e) => e.job_number === job.jobNumber && e.clock_out_time
    );
    if (entry) return 'completed';
    return 'upcoming';
  };

  const getJobEntry = (job) => {
    return todayEntries.find(
      (e) => e.job_number === job.jobNumber && e.clock_out_time
    );
  };

  const getJobTotalHours = (job) => {
    return todayEntries
      .filter((e) => e.job_number === job.jobNumber && e.clock_out_time)
      .reduce((sum, e) => sum + parseFloat(e.total_hours || 0), 0);
  };

  // Day summary
  const completedToday = todayEntries.filter((e) => e.clock_out_time);
  const totalHoursWorked = completedToday.reduce(
    (sum, e) => sum + parseFloat(e.total_hours || 0),
    0
  );
  const activeElapsedHours = activeEntry ? elapsed / (1000 * 60 * 60) : 0;
  const totalHoursDisplay = (totalHoursWorked + activeElapsedHours).toFixed(1);
  const jobsCompleted = completedToday.filter((e) => e.job_number !== 'HOME-OFFICE').length;
  const totalJobs = dispatchJobs.length;

  const currentStatus = activeEntry
    ? `Clocked in at ${activeEntry.job_number}`
    : 'Available';

  // --- Formatters ---
  const formatElapsed = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatScheduledTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // --- Render ---

  if (!nameLocked) {
    return (
      <div className="tt-container">
        <div className="tt-card">
          <h2 className="tt-title">Time Tracking</h2>
          <div className="tt-name-setup">
            <label htmlFor="techName">Who are you?</label>
            <select
              id="techName"
              className="tt-name-select"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
            >
              <option value="">-- Select your name --</option>
              <optgroup label="Crew Chiefs">
                {CREW_CHIEFS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </optgroup>
              <optgroup label="Techs">
                {TECHS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </optgroup>
            </select>
            <button
              className="tt-btn tt-btn-primary"
              onClick={() => {
                if (technicianName.trim()) setNameLocked(true);
              }}
              disabled={!technicianName.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tt-container">
      <div className="tt-card">
        <h2 className="tt-title">Time Tracking</h2>

        {error && <div className="tt-error">{error}</div>}

        {/* Name display + switch */}
        <div className="tt-name-bar">
          <span className="tt-name-label">{technicianName}</span>
          <span className="tt-name-role">
            {ALL_FIELD_NAMES.find((f) => f.name === technicianName)?.role || ''}
          </span>
          <button
            className="tt-switch-btn"
            onClick={() => {
              setNameLocked(false);
              setTechnicianName('');
              setDataLoaded(false);
              setDispatchJobs([]);
              setActiveEntry(null);
              setTodayEntries([]);
              setRecentEntries([]);
              setTempWorkers([]);
              setShowTempPanel(false);
              setTempTimeState({});
            }}
          >
            Switch
          </button>
        </div>

        {/* Temp Labor Panel */}
        <div className="tt-temp-section">
          <button
            className="tt-temp-toggle"
            onClick={() => setShowTempPanel(!showTempPanel)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Temp Labor ({tempWorkers.length})
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ transform: showTempPanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showTempPanel && (
            <div className="tt-temp-panel">
              <div className="tt-temp-add-row">
                <input
                  type="text"
                  placeholder="Temp worker name"
                  value={tempNameInput}
                  onChange={(e) => setTempNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTempWorker()}
                  className="tt-temp-input"
                />
                <button className="tt-btn tt-btn-primary tt-temp-add-btn" onClick={addTempWorker} disabled={!tempNameInput.trim()}>
                  Add
                </button>
              </div>
              {tempWorkers.length === 0 && (
                <div className="tt-temp-empty">No temp workers assigned today</div>
              )}
              {tempWorkers.map((w) => {
                const state = tempTimeState[w.id] || {};
                const totalHrs = (state.entries || []).reduce((s, e) => s + parseFloat(e.hours || 0), 0);
                return (
                  <div key={w.id} className="tt-temp-worker-row">
                    <div className="tt-temp-worker-info">
                      <span className="tt-temp-worker-name">{w.name}</span>
                      {w.company && <span className="tt-temp-worker-company">{w.company}</span>}
                    </div>
                    <span className="tt-temp-worker-status">
                      {state.activeJobNumber ? (
                        <span className="tt-temp-active-badge">On {state.activeJobNumber}</span>
                      ) : (
                        <span className="tt-temp-hours">{totalHrs.toFixed(1)}h</span>
                      )}
                    </span>
                    {!w.assignedTo && (
                      <button className="tt-temp-remove" onClick={() => removeTempWorker(w.id)} title="Remove">
                        &times;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {loading && !dataLoaded ? (
          <div className="tt-loading">Loading schedule...</div>
        ) : (
          <>
            {/* A. Day Summary Bar */}
            <div className="tt-day-summary">
              <div className="tt-stat">
                <span className="tt-stat-value">{totalHoursDisplay}</span>
                <span className="tt-stat-label">Hours</span>
              </div>
              <div className="tt-stat">
                <span className="tt-stat-value">
                  {jobsCompleted}/{totalJobs}
                </span>
                <span className="tt-stat-label">Jobs</span>
              </div>
              <div className="tt-stat tt-stat-status">
                <span className={`tt-status-dot ${activeEntry ? 'active' : ''}`} />
                <span className="tt-stat-label">{currentStatus}</span>
              </div>
            </div>

            {/* B. Today's Jobs Timeline (WIP + dispatched jobs) */}
            <div className="tt-timeline">
              <h3 className="tt-section-title">Today's Schedule</h3>
              {dispatchJobs.length === 0 && (
                <div className="tt-no-schedule-note">
                  No dispatch schedule for today — field jobs will appear once scheduled.
                </div>
              )}
              <div className="tt-timeline-list">
                {timelineJobs.map((job) => {
                  const status = getJobStatus(job);
                  const completedEntry = getJobEntry(job);
                  const isActive = status === 'active';
                  const isCompleted = status === 'completed';

                  return (
                    <div
                      key={job.jobNumber + '-' + job.routeOrder}
                      className={`tt-job-card ${status}${job.isWip ? ' wip' : ''}`}
                    >
                      <div className="tt-timeline-dot" />
                      <div className="tt-job-content">
                        <div className="tt-job-header">
                          <span className="tt-job-time">
                            {formatScheduledTime(job.scheduledTime)}
                          </span>
                          <span className={`tt-job-type${job.isWip ? ' wip-badge' : ''}`}>
                            {job.jobType || 'Job'}
                          </span>
                          {job.driveTimeMinutes > 0 && (
                            <span className="tt-drive-time">
                              {job.driveTimeMinutes}min drive
                            </span>
                          )}
                          {!job.isWip && (
                            <button
                              className={`tt-checklist-icon${openChecklist === job.jobNumber ? ' open' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenChecklist(
                                  openChecklist === job.jobNumber ? null : job.jobNumber
                                );
                              }}
                              title="Job File Checklist"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                                <path d="M9 11l3 3L22 4"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        {openChecklist === job.jobNumber && (() => {
                          const jobChecks = checkedItems[job.jobNumber] || {};
                          const doneCount = JOB_FILE_CHECKLIST.filter((item) => jobChecks[item.label]).length;
                          return (
                            <div className="tt-checklist-panel">
                              <div className="tt-checklist-header">
                                <div className="tt-checklist-title">Job File Checklist</div>
                                <span className="tt-checklist-count">{doneCount}/{JOB_FILE_CHECKLIST.length}</span>
                              </div>
                              {['Setup', 'Agreements', 'Photos', 'Field Work', 'Notes'].map((group) => (
                                <div key={group} className="tt-checklist-group">
                                  <div className="tt-checklist-group-label">{group}</div>
                                  <ul className="tt-checklist-list">
                                    {JOB_FILE_CHECKLIST.filter((item) => item.group === group).map((item) => {
                                      const checked = !!jobChecks[item.label];
                                      return (
                                        <li
                                          key={item.label}
                                          className={`tt-checklist-item${checked ? ' checked' : ''}`}
                                          onClick={() => toggleCheckItem(job.jobNumber, item.label)}
                                        >
                                          <span className={`tt-check-box${checked ? ' checked' : ''}`}>
                                            {checked && (
                                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                                                <polyline points="20 6 9 17 4 12"/>
                                              </svg>
                                            )}
                                          </span>
                                          {item.label}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <div className="tt-job-details">
                          {!job.isWip && (
                            <span className="tt-job-number">
                              #{job.jobNumber}
                            </span>
                          )}
                          <span className="tt-job-customer">
                            {job.customer}
                          </span>
                        </div>
                        {job.address && (
                          <a
                            className="tt-job-address"
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {job.address}
                          </a>
                        )}
                        <div className="tt-job-meta">
                          <span>Est. {formatHours(job.estimatedHours)}</span>
                        </div>

                        {/* Action area */}
                        {isActive && (
                          <div className="tt-job-active-area">
                            <div className="tt-elapsed">
                              {formatElapsed(elapsed)}
                            </div>
                            <button
                              className="tt-btn tt-btn-checkout"
                              onClick={handleClockOut}
                              disabled={loading}
                            >
                              {loading ? 'Checking Out...' : 'Check Out'}
                            </button>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="tt-job-completed-area">
                            <div className="tt-job-completed-info">
                              {getJobTotalHours(job).toFixed(1)}h worked
                            </div>
                            <button
                              className="tt-btn tt-btn-checkin-again"
                              onClick={() => handleClockIn(job.jobNumber)}
                              disabled={loading || !!activeEntry}
                            >
                              Check In Again
                            </button>
                          </div>
                        )}

                        {!isActive && !isCompleted && (
                          <button
                            className="tt-btn tt-btn-checkin"
                            onClick={() => handleClockIn(job.jobNumber)}
                            disabled={loading || !!activeEntry}
                          >
                            {loading ? 'Checking In...' : 'Check In'}
                          </button>
                        )}

                        {/* Temp labor controls for this job */}
                        {tempWorkers.length > 0 && !job.isWip && (() => {
                          const anyTempActive = tempWorkers.some((w) => {
                            const s = tempTimeState[w.id];
                            return s && s.activeJobNumber === job.jobNumber;
                          });
                          const anyTempCanClockIn = tempWorkers.some((w) => {
                            const s = tempTimeState[w.id];
                            return !s || !s.activeJobNumber;
                          });
                          return (
                            <div className="tt-temp-job-controls">
                              {tempWorkers.length > 1 && (
                                <div className="tt-temp-bulk-row">
                                  <span className="tt-temp-bulk-label">All Temps</span>
                                  {anyTempActive && (
                                    <button
                                      className="tt-btn tt-btn-temp-out"
                                      onClick={() => tempClockAllOut()}
                                    >
                                      Clock All Out
                                    </button>
                                  )}
                                  {anyTempCanClockIn && (
                                    <button
                                      className="tt-btn tt-btn-temp-in"
                                      onClick={() => tempClockAllIn(job.jobNumber)}
                                    >
                                      Clock All In
                                    </button>
                                  )}
                                </div>
                              )}
                              {tempWorkers.map((w) => {
                                const tStatus = getTempStatusForJob(w.id, job.jobNumber);
                                const tState = tempTimeState[w.id] || {};
                                const tActive = tStatus === 'active';
                                const tCompleted = tStatus === 'completed';
                                const tHasOtherActive = tState.activeJobNumber && tState.activeJobNumber !== job.jobNumber;
                                return (
                                  <div key={w.id} className={`tt-temp-job-row ${tStatus}`}>
                                    <span className="tt-temp-job-name">{w.name}</span>
                                    {tActive && (
                                      <button
                                        className="tt-btn tt-btn-temp-out"
                                        onClick={() => tempClockOut(w.id)}
                                      >
                                        Clock Out
                                      </button>
                                    )}
                                    {tCompleted && (
                                      <div className="tt-temp-completed-area">
                                        <span className="tt-temp-job-hours">
                                          {getTempTotalHoursForJob(w.id, job.jobNumber).toFixed(1)}h
                                        </span>
                                        <button
                                          className="tt-btn tt-btn-temp-in"
                                          onClick={() => tempClockIn(w.id, job.jobNumber)}
                                          disabled={tHasOtherActive}
                                        >
                                          Clock In Again
                                        </button>
                                      </div>
                                    )}
                                    {!tActive && !tCompleted && (
                                      <button
                                        className="tt-btn tt-btn-temp-in"
                                        onClick={() => tempClockIn(w.id, job.jobNumber)}
                                        disabled={tHasOtherActive}
                                      >
                                        Clock In
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* C. Lunch/Break & Training */}
            {activeEntry && activeEntry.job_number === 'LUNCH-BREAK' && (
              <div className="tt-other-section">
                <div className="tt-special-active">
                  <span className="tt-special-icon">&#9749;</span>
                  <div className="tt-special-active-info">
                    <div className="tt-special-title">Lunch / Break</div>
                    <div className="tt-elapsed">{formatElapsed(elapsed)}</div>
                  </div>
                  <button
                    className="tt-btn tt-btn-checkout"
                    onClick={handleClockOut}
                    disabled={loading}
                  >
                    {loading ? 'Checking Out...' : 'Check Out'}
                  </button>
                </div>
              </div>
            )}
            {activeEntry && activeEntry.job_number === 'TRAINING' && (
              <div className="tt-other-section">
                <div className="tt-special-active">
                  <span className="tt-special-icon">&#128218;</span>
                  <div className="tt-special-active-info">
                    <div className="tt-special-title">Training</div>
                    <div className="tt-elapsed">{formatElapsed(elapsed)}</div>
                  </div>
                  <button
                    className="tt-btn tt-btn-checkout"
                    onClick={handleClockOut}
                    disabled={loading}
                  >
                    {loading ? 'Checking Out...' : 'Check Out'}
                  </button>
                </div>
              </div>
            )}
            {!activeEntry && (
              <div className="tt-other-section">
                <div className="tt-special-options">
                  <button
                    className="tt-btn tt-btn-special lunch"
                    onClick={() => handleClockIn('LUNCH-BREAK')}
                    disabled={loading}
                  >
                    <span className="tt-special-icon">&#9749;</span>
                    <div>
                      <div className="tt-special-title">Lunch / Break</div>
                    </div>
                  </button>
                  <button
                    className="tt-btn tt-btn-special training"
                    onClick={() => handleClockIn('TRAINING')}
                    disabled={loading}
                  >
                    <span className="tt-special-icon">&#128218;</span>
                    <div>
                      <div className="tt-special-title">Training</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* D. Recent Entries */}
            {recentEntries.length > 0 && (
              <div className="tt-recent">
                <h3 className="tt-section-title">Recent Entries</h3>
                <div className="tt-entries-list">
                  {recentEntries.map((entry) => (
                    <div key={entry.id} className="tt-entry-item">
                      <div className="tt-entry-header">
                        <span className="tt-entry-job">
                          #{entry.job_number}
                        </span>
                        <span
                          className={`tt-entry-status ${entry.clock_out_time ? 'completed' : 'active'}`}
                        >
                          {entry.clock_out_time
                            ? `${parseFloat(entry.total_hours).toFixed(1)}h`
                            : 'In Progress'}
                        </span>
                      </div>
                      <div className="tt-entry-times">
                        <span>{formatDateTime(entry.clock_in_time)}</span>
                        {entry.clock_out_time && (
                          <>
                            <span className="tt-time-sep">&rarr;</span>
                            <span>
                              {formatDateTime(entry.clock_out_time)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TimeTracking;
