import React, { useEffect, useMemo, useState } from 'react';
import useDispatchSchedule, { DAY_START, DAY_END } from '../hooks/useDispatchSchedule';
import DispatchNowMapModal from '../components/dispatch/DispatchNowMapModal';
import './Page.css';
import './DispatchBoard.css';

const HOUR_STEP = 1;
const DEMO_UNASSIGNED = [
  { id: 'demo-u1', jobNumber: 'HBM-2411', customer: 'Thompson', address: '1210 Cedar St, Nashville, TN', hours: 2.5, isDemo: true },
  { id: 'demo-u2', jobNumber: 'HBR-993', customer: 'Pine Ridge HOA', address: '980 Trailhead Dr, Franklin, TN', hours: 3, isDemo: true },
  { id: 'demo-u3', jobNumber: 'LL-451', customer: 'Larkspur Offices', address: '77 Commerce Ave, Nashville, TN', hours: 4, isDemo: true },
];

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatHour(value) {
  const hour = Math.floor(value);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
}

function formatAlertRole(lane, crewChiefNames) {
  if (lane?.type === 'pm') return 'PM';
  if (crewChiefNames.has((lane?.name || '').toLowerCase())) return 'Crew Chief';
  return 'Tech';
}

function distanceMiles(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = (Math.sin(dLat / 2) ** 2)
    + (Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLng / 2) ** 2));
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadiusMiles * c;
}

function DispatchBoard() {
  const sched = useDispatchSchedule(null);
  const {
    date,
    goPrev,
    goNext,
    goToday,
    lanes,
    pmGroups,
    schedule,
    setSchedule,
    pushUndo,
    conflicts,
  } = sched;

  const [queueMode, setQueueMode] = useState('unassigned');
  const [searchText, setSearchText] = useState('');
  const [alertsLog, setAlertsLog] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNowMap, setShowNowMap] = useState(false);
  const [newJob, setNewJob] = useState({
    jobNumber: '',
    customer: '',
    address: '',
    hours: 2,
    assignee: 'unassigned',
    startHour: '',
  });
  const [assignTargets, setAssignTargets] = useState({});

  // Current-time indicator: percentage across the time grid, null if outside range
  const [nowPct, setNowPct] = useState(() => {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < DAY_START || h > DAY_END) return null;
    return ((h - DAY_START) / (DAY_END - DAY_START)) * 100;
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60;
      if (h < DAY_START || h > DAY_END) { setNowPct(null); return; }
      setNowPct(((h - DAY_START) / (DAY_END - DAY_START)) * 100);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // Only show the line when viewing today's date
  const isToday = useMemo(() => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }, [date]);

  const showNowLine = isToday && nowPct != null;

  const search = searchText.trim().toLowerCase();
  const crewChiefNames = useMemo(() => {
    const all = new Set();
    pmGroups.forEach((group) => {
      (group.crews || []).forEach((name) => all.add(String(name).toLowerCase()));
    });
    return all;
  }, [pmGroups]);

  const orderedLanes = useMemo(() => {
    const pm = lanes.filter((l) => l.type === 'pm');
    const crewChiefs = lanes.filter((l) => l.type !== 'pm' && crewChiefNames.has((l.name || '').toLowerCase()));
    const techs = lanes.filter((l) => l.type !== 'pm' && !crewChiefNames.has((l.name || '').toLowerCase()));
    const sortByName = (a, b) => a.name.localeCompare(b.name);
    return [
      { section: 'PMs', rows: [...pm].sort(sortByName) },
      { section: 'Crew Chiefs', rows: [...crewChiefs].sort(sortByName) },
      { section: 'Techs', rows: [...techs].sort(sortByName) },
    ];
  }, [lanes, crewChiefNames]);

  const assignableLanes = useMemo(
    () => lanes.filter((lane) => lane.type === 'pm' || crewChiefNames.has((lane.name || '').toLowerCase())),
    [lanes, crewChiefNames]
  );

  const demoJobsByLane = useMemo(() => {
    const pmLane = orderedLanes.find((s) => s.section === 'PMs')?.rows?.[0];
    const crewChiefLane = orderedLanes.find((s) => s.section === 'Crew Chiefs')?.rows?.[0];
    const techLane = orderedLanes.find((s) => s.section === 'Techs')?.rows?.[0];
    const map = {};
    if (pmLane) {
      map[pmLane.id] = [
        { id: 'demo-pm-1', jobNumber: 'MIT-1108', customer: 'Briarwood', address: '100 Mockingbird Ln', hours: 1.5, fixedStartHour: 9, isDemo: true },
      ];
    }
    if (crewChiefLane) {
      map[crewChiefLane.id] = [
        { id: 'demo-cc-1', jobNumber: 'MIT-1122', customer: 'Parker', address: '19 Rolling Rd', hours: 2, fixedStartHour: 10, isDemo: true },
        { id: 'demo-cc-2', jobNumber: 'MIT-1130', customer: 'Bridgewater Apt', address: '321 8th Ave', hours: 2.5, fixedStartHour: 13, isDemo: true },
      ];
    }
    if (techLane) {
      map[techLane.id] = [
        { id: 'demo-tech-1', jobNumber: 'MIT-1144', customer: 'Hayes', address: '680 Brentwood Dr', hours: 2, fixedStartHour: 11, isDemo: true },
      ];
    }
    return map;
  }, [orderedLanes]);

  const scheduleWithDemo = useMemo(() => {
    const merged = { ...schedule };
    merged.unassigned = [...(schedule.unassigned || []), ...DEMO_UNASSIGNED];
    Object.entries(demoJobsByLane).forEach(([laneId, demoJobs]) => {
      merged[laneId] = [...(schedule[laneId] || []), ...demoJobs];
    });
    return merged;
  }, [schedule, demoJobsByLane]);

  const allAlerts = useMemo(() => {
    const conflictAlerts = (conflicts || []).map((c, idx) => ({
      id: `conflict-${idx}`,
      type: 'system',
      message: c.message,
      timestamp: new Date().toISOString(),
    }));
    return [...alertsLog, ...conflictAlerts].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [alertsLog, conflicts]);

  const unassignedJobs = useMemo(() => {
    const jobs = scheduleWithDemo.unassigned || [];
    if (!search) return jobs;
    return jobs.filter((job) => {
      const blob = `${job.jobNumber || ''} ${job.customer || ''} ${job.address || ''}`.toLowerCase();
      return blob.includes(search);
    });
  }, [scheduleWithDemo, search]);

  const rowsForBoard = useMemo(() => {
    const laneHasMatch = (lane) => {
      if (!search) return true;
      const laneNameMatch = (lane.name || '').toLowerCase().includes(search);
      const jobs = scheduleWithDemo[lane.id] || [];
      const jobMatch = jobs.some((job) => {
        const blob = `${job.jobNumber || ''} ${job.customer || ''} ${job.address || ''}`.toLowerCase();
        return blob.includes(search);
      });
      return laneNameMatch || jobMatch;
    };

    return orderedLanes
      .map((section) => ({
        ...section,
        rows: section.rows.filter((lane) => laneHasMatch(lane)),
      }))
      .filter((section) => section.rows.length > 0);
  }, [orderedLanes, scheduleWithDemo, search]);

  const hours = useMemo(() => {
    const list = [];
    for (let h = DAY_START; h <= DAY_END; h += HOUR_STEP) list.push(h);
    return list;
  }, []);

  const assignJobToLane = (job, lane, mode = 'manual') => {
    if (!lane || !job || job.isDemo) return;
    const sourceIndex = (schedule.unassigned || []).findIndex((j) => j.id === job.id);
    if (sourceIndex < 0) return;
    pushUndo();
    setSchedule((prev) => {
      const source = [...(prev.unassigned || [])];
      const moved = source.splice(sourceIndex, 1)[0];
      return {
        ...prev,
        unassigned: source,
        [lane.id]: [...(prev[lane.id] || []), moved],
      };
    });

    setAlertsLog((prev) => [
      {
        id: crypto.randomUUID(),
        type: 'assignment',
        message: `${mode === 'smart' ? 'Smart assigned' : 'Assigned'} to ${formatAlertRole(lane, crewChiefNames)} ${lane.name}: job ${job.jobNumber || 'new'}.`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const assignUnassigned = (job) => {
    const targetLaneId = assignTargets[job.id];
    if (!targetLaneId) return;
    const lane = lanes.find((l) => l.id === targetLaneId);
    assignJobToLane(job, lane, 'manual');
  };

  const getSmartTargetLane = (job) => {
    if (!assignableLanes.length) return null;
    const hasCoords = job.latitude != null && job.longitude != null;
    const targetLat = hasCoords ? job.latitude : null;
    const targetLng = hasCoords ? job.longitude : null;
    const scored = assignableLanes.map((lane) => {
      const laneJobs = schedule[lane.id] || [];
      const laneHours = laneJobs.reduce((sum, j) => sum + (Number(j.hours) || 0), 0);
      const laneCoords = laneJobs.filter((j) => j.latitude != null && j.longitude != null);
      let proximity = 9999;
      if (hasCoords && laneCoords.length > 0) {
        proximity = Math.min(...laneCoords.map((j) => distanceMiles(targetLat, targetLng, j.latitude, j.longitude)));
      } else if (hasCoords) {
        proximity = 50;
      }
      return {
        lane,
        score: (proximity * 0.75) + (laneHours * 0.25),
      };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored[0]?.lane || null;
  };

  const smartAssign = (job) => {
    if (job.isDemo) return;
    const targetLane = getSmartTargetLane(job);
    if (!targetLane) return;
    setAssignTargets((prev) => ({ ...prev, [job.id]: targetLane.id }));
    assignJobToLane(job, targetLane, 'smart');
  };

  const addJob = () => {
    const assignee = newJob.assignee;
    const lane = lanes.find((l) => l.id === assignee);
    const payload = {
      id: crypto.randomUUID(),
      jobType: 'new-start',
      hours: Number(newJob.hours) || 1,
      jobNumber: newJob.jobNumber || '',
      customer: newJob.customer || '',
      address: newJob.address || '',
    };
    if (newJob.startHour !== '') payload.fixedStartHour = Number(newJob.startHour);

    pushUndo();
    setSchedule((prev) => ({
      ...prev,
      [assignee]: [...(prev[assignee] || []), payload],
    }));

    if (assignee !== 'unassigned' && lane) {
      setAlertsLog((prev) => [
        {
          id: crypto.randomUUID(),
          type: 'new',
          message: `Alerted ${formatAlertRole(lane, crewChiefNames)} ${lane.name}: new job ${payload.jobNumber || '(no #)'} added.`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    setShowAddModal(false);
    setNewJob({
      jobNumber: '',
      customer: '',
      address: '',
      hours: 2,
      assignee: 'unassigned',
      startHour: '',
    });
  };

  const renderLaneJobs = (laneId) => {
    const jobs = scheduleWithDemo[laneId] || [];
    let cursor = DAY_START;
    return jobs.map((job) => {
      const hoursValue = Math.max(0.5, Number(job.hours) || 1);
      const start = job.fixedStartHour != null ? Number(job.fixedStartHour) : cursor;
      const end = Math.min(DAY_END, start + hoursValue);
      cursor = Math.max(cursor, end);
      const leftPct = ((start - DAY_START) / (DAY_END - DAY_START)) * 100;
      const widthPct = ((end - start) / (DAY_END - DAY_START)) * 100;
      return (
        <article
          key={job.id}
          className="dispatch-job-pill"
          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 6)}%` }}
          title={`${job.jobNumber || 'No #'} | ${job.customer || 'No customer'} | ${job.address || ''}`}
        >
          <div className="dispatch-job-pill-num">{job.jobNumber || 'No #'}</div>
          <div className="dispatch-job-pill-name">{job.customer || 'No customer'}</div>
        </article>
      );
    });
  };

  return (
    <div className="page-container dispatch-board-page">
      <header className="dispatch-board-header">
        <div className="dispatch-board-title">
          <h1>Dispatch Board</h1>
        </div>
        <div className="dispatch-board-controls">
          <div className="dispatch-date-nav">
            <button type="button" onClick={goPrev}>&larr; Yesterday</button>
            <button type="button" onClick={goToday}>Today</button>
            <button type="button" onClick={goNext}>Tomorrow &rarr;</button>
          </div>
          <input
            type="search"
            className="dispatch-board-search"
            placeholder="Search jobs, customers, techs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button type="button" className="dispatch-new-job-btn" onClick={() => setShowAddModal(true)}>
            + Add Job
          </button>
          <button type="button" className="dispatch-map-now-btn" onClick={() => setShowNowMap(true)}>
            Map Now
          </button>
        </div>
      </header>

      <main className="dispatch-board-layout">
        <aside className="dispatch-queue-panel">
          <div className="dispatch-queue-top">
            <h2>Job Queue</h2>
            <div className="dispatch-queue-toggle">
              <button
                type="button"
                className={queueMode === 'unassigned' ? 'active' : ''}
                onClick={() => setQueueMode('unassigned')}
              >
                Unassigned
              </button>
              <button
                type="button"
                className={queueMode === 'alerts' ? 'active' : ''}
                onClick={() => setQueueMode('alerts')}
              >
                Alerts
              </button>
            </div>
          </div>

          <div className="dispatch-queue-list">
            {queueMode === 'unassigned' && unassignedJobs.length === 0 && (
              <p className="dispatch-queue-empty">No unassigned jobs found.</p>
            )}
            {queueMode === 'unassigned' && unassignedJobs.map((job) => (
              <article key={job.id} className="dispatch-queue-tile">
                <div className="dispatch-queue-jobnum">{job.jobNumber || 'No Job #'}</div>
                <div className="dispatch-queue-customer">{job.customer || 'No customer'}</div>
                <div className="dispatch-queue-address">{job.address || 'No address'}</div>
                <div className="dispatch-queue-actions">
                  <select
                    disabled={job.isDemo}
                    value={assignTargets[job.id] || ''}
                    onChange={(e) => setAssignTargets((prev) => ({ ...prev, [job.id]: e.target.value }))}
                  >
                    <option value="">Move to...</option>
                    {assignableLanes.map((lane) => (
                      <option key={lane.id} value={lane.id}>{lane.name}</option>
                    ))}
                  </select>
                  <button type="button" disabled={job.isDemo} onClick={() => smartAssign(job)}>
                    {job.isDemo ? 'Sample' : 'Smart Assign'}
                  </button>
                  <button type="button" disabled={job.isDemo} onClick={() => assignUnassigned(job)}>
                    {job.isDemo ? 'Sample' : 'Assign'}
                  </button>
                </div>
              </article>
            ))}

            {queueMode === 'alerts' && allAlerts.length === 0 && (
              <p className="dispatch-queue-empty">No alerts yet.</p>
            )}
            {queueMode === 'alerts' && allAlerts.map((alert) => (
              <article key={alert.id} className="dispatch-alert-tile">
                <div className="dispatch-alert-message">{alert.message}</div>
                <div className="dispatch-alert-time">
                  {new Date(alert.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </article>
            ))}
          </div>
        </aside>

        <section className="dispatch-swimlane-panel">
          <div className="dispatch-board-panel-head">
            <div className="dispatch-board-label">Dispatch Board</div>
            <div className="dispatch-board-date-pill">{formatDateLabel(date)}</div>
          </div>
          <div className="dispatch-time-header">
            <div className="dispatch-employee-header">Employee</div>
            <div className="dispatch-time-scale" style={{ position: 'relative' }}>
              <div
                className="dispatch-time-scale-grid"
                style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
              >
                {hours.map((hour) => (
                  <span key={hour}>{formatHour(hour)}</span>
                ))}
              </div>
              {showNowLine && <div className="dispatch-now-line" style={{ left: `${nowPct}%` }} />}
            </div>
          </div>

          <div className="dispatch-lane-sections">
            {rowsForBoard.map((section) => (
              <section key={section.section} className="dispatch-lane-group">
                <h3>{section.section}</h3>
                {section.rows.map((lane) => (
                  <div key={lane.id} className="dispatch-lane-row">
                    <div className="dispatch-lane-name">
                      <span className="dispatch-lane-dot" style={{ backgroundColor: lane.color }} />
                      {lane.name}
                    </div>
                    <div className="dispatch-lane-track">
                      <div
                        className="dispatch-lane-grid"
                        style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
                      >
                        {hours.map((hour) => (
                          <span key={hour} />
                        ))}
                      </div>
                      {renderLaneJobs(lane.id)}
                      {showNowLine && <div className="dispatch-now-line" style={{ left: `${nowPct}%` }} />}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </section>
      </main>

      {showAddModal && (
        <div className="dispatch-add-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="dispatch-add-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Job</h3>
            <label>
              Job #
              <input value={newJob.jobNumber} onChange={(e) => setNewJob((prev) => ({ ...prev, jobNumber: e.target.value }))} />
            </label>
            <label>
              Customer
              <input value={newJob.customer} onChange={(e) => setNewJob((prev) => ({ ...prev, customer: e.target.value }))} />
            </label>
            <label>
              Address
              <input value={newJob.address} onChange={(e) => setNewJob((prev) => ({ ...prev, address: e.target.value }))} />
            </label>
            <div className="dispatch-add-modal-row">
              <label>
                Hours
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newJob.hours}
                  onChange={(e) => setNewJob((prev) => ({ ...prev, hours: e.target.value }))}
                />
              </label>
              <label>
                Start (optional)
                <select
                  value={newJob.startHour}
                  onChange={(e) => setNewJob((prev) => ({ ...prev, startHour: e.target.value }))}
                >
                  <option value="">Auto</option>
                  {hours.map((hour) => (
                    <option key={hour} value={hour}>{formatHour(hour)}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Assign to
              <select value={newJob.assignee} onChange={(e) => setNewJob((prev) => ({ ...prev, assignee: e.target.value }))}>
                <option value="unassigned">Unassigned</option>
                {lanes.map((lane) => (
                  <option key={lane.id} value={lane.id}>{lane.name}</option>
                ))}
              </select>
            </label>
            <div className="dispatch-add-modal-actions">
              <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="button" className="primary" onClick={addJob}>Add Job</button>
            </div>
          </div>
        </div>
      )}

      <DispatchNowMapModal
        open={showNowMap}
        onClose={() => setShowNowMap(false)}
        lanes={orderedLanes.flatMap((section) => section.rows)}
        scheduleByLane={scheduleWithDemo}
      />
    </div>
  );
}

export default DispatchBoard;
