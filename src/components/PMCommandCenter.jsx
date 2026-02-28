import React, { useState, useMemo } from 'react';
import { PM_OPTIONS } from '../constants/jobFileConstants';
import {
  pmJobs,
  pmTasks as pmTasksData,
  pmCrewAssignments,
  pmFinancials,
  pmCommunicationLog,
  pmDocumentStatus,
} from '../data/pmCommandCenterData';
import './PMCommandCenter.css';

const TABS = [
  { id: 'jobs', label: 'Job Overview' },
  { id: 'tasks', label: 'Tasks & Action Items' },
  { id: 'crew', label: 'Crew Assignments' },
  { id: 'financials', label: 'Financials' },
  { id: 'comms', label: 'Communication Log' },
  { id: 'docs', label: 'Documents & Photos' },
];

const STATUS_COLORS = {
  Pending: '#f59e0b',
  WIP: '#3b82f6',
  'Ready to Bill': '#22c55e',
  AR: '#ef4444',
};

const TYPE_COLORS = {
  Water: '#3b82f6',
  Fire: '#ef4444',
  Mold: '#a855f7',
};

const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High: '#f59e0b',
  Medium: '#3b82f6',
  Low: '#6b7280',
};

const DOC_ICONS = { done: '✓', missing: '✗', pending: '⏳' };
const DOC_CLASSES = { done: 'pmc-doc-done', missing: 'pmc-doc-missing', pending: 'pmc-doc-pending' };

const COMM_TYPE_LABELS = { phone: '📞 Phone', email: '✉️ Email', note: '📝 Note' };

function formatCurrency(val) {
  return '$' + val.toLocaleString();
}

export default function PMCommandCenter() {
  const [selectedPm, setSelectedPm] = useState('');
  const [activeTab, setActiveTab] = useState('jobs');
  const [tasks, setTasks] = useState(pmTasksData);
  const [expandedJob, setExpandedJob] = useState(null);
  const [commFilter, setCommFilter] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ description: '', jobId: '', dueDate: '', priority: 'Medium' });

  // Filtered data by PM
  const filterByPm = (arr) => (selectedPm ? arr.filter((item) => item.pm === selectedPm) : arr);

  const filteredJobs = useMemo(() => filterByPm(pmJobs), [selectedPm]);
  const filteredTasks = useMemo(() => filterByPm(tasks), [selectedPm, tasks]);
  const filteredFinancials = useMemo(() => filterByPm(pmFinancials), [selectedPm]);
  const filteredComms = useMemo(() => {
    let result = filterByPm(pmCommunicationLog);
    if (commFilter) result = result.filter((c) => c.jobId === commFilter);
    return result;
  }, [selectedPm, commFilter]);
  const filteredDocs = useMemo(() => filterByPm(pmDocumentStatus), [selectedPm]);
  const filteredCrew = useMemo(() => {
    if (!selectedPm) return pmCrewAssignments;
    return pmCrewAssignments
      .map((crew) => ({
        ...crew,
        jobs: crew.jobs.filter((j) => j.pm === selectedPm),
      }))
      .filter((crew) => crew.jobs.length > 0);
  }, [selectedPm]);

  // KPI calculations
  const activeJobCount = filteredJobs.filter((j) => j.status === 'WIP' || j.status === 'Pending').length;
  const openTaskCount = filteredTasks.filter((t) => !t.completed).length;
  const pendingDocCount = filteredDocs.reduce((sum, d) => {
    return sum + ['atp', 'sketch', 'scope', 'photos', 'dryBook', 'finalEstimate']
      .filter((k) => d[k] !== 'done').length;
  }, 0);
  const revenueInProgress = filteredFinancials.reduce((sum, f) => sum + f.estimateValue, 0);

  // Task toggle
  const toggleTask = (taskId) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)));
  };

  // Add task
  const handleAddTask = () => {
    if (!newTask.description || !newTask.jobId) return;
    const task = {
      id: 't' + (tasks.length + 1),
      ...newTask,
      completed: false,
      pm: selectedPm || 'KEVIN',
      category: 'upcoming',
    };
    setTasks((prev) => [...prev, task]);
    setNewTask({ description: '', jobId: '', dueDate: '', priority: 'Medium' });
    setShowAddTask(false);
  };

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups = { overdue: [], today: [], upcoming: [] };
    filteredTasks.forEach((t) => {
      if (groups[t.category]) groups[t.category].push(t);
      else groups.upcoming.push(t);
    });
    return groups;
  }, [filteredTasks]);

  // Financial totals
  const financialTotals = useMemo(() => {
    return filteredFinancials.reduce(
      (acc, f) => ({
        estimateValue: acc.estimateValue + f.estimateValue,
        invoiced: acc.invoiced + f.invoiced,
        collected: acc.collected + f.collected,
        outstanding: acc.outstanding + f.outstanding,
      }),
      { estimateValue: 0, invoiced: 0, collected: 0, outstanding: 0 }
    );
  }, [filteredFinancials]);

  // Unique job IDs for comm filter
  const commJobIds = useMemo(() => {
    const ids = filterByPm(pmCommunicationLog).map((c) => c.jobId);
    return [...new Set(ids)].sort();
  }, [selectedPm]);

  // Unassigned jobs
  const unassignedJobs = useMemo(() => filteredJobs.filter((j) => !j.crewChief), [filteredJobs]);

  return (
    <div className="pmc-container">
      {/* Top Bar */}
      <div className="pmc-header">
        <div className="pmc-header-left">
          <h2>PM Command Center</h2>
          <div className="pmc-pm-selector">
            <label htmlFor="pmc-pm-select">PM</label>
            <select
              id="pmc-pm-select"
              value={selectedPm}
              onChange={(e) => setSelectedPm(e.target.value)}
            >
              <option value="">All PMs</option>
              {PM_OPTIONS.map((pm) => (
                <option key={pm} value={pm}>{pm.charAt(0) + pm.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="pmc-kpi-row">
        <div className="pmc-kpi-card">
          <div className="pmc-kpi-icon pmc-kpi-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div className="pmc-kpi-value">{activeJobCount}</div>
          <div className="pmc-kpi-label">Active Jobs</div>
        </div>
        <div className="pmc-kpi-card">
          <div className="pmc-kpi-icon pmc-kpi-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div className="pmc-kpi-value">{openTaskCount}</div>
          <div className="pmc-kpi-label">Open Tasks</div>
        </div>
        <div className="pmc-kpi-card">
          <div className="pmc-kpi-icon pmc-kpi-red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div className="pmc-kpi-value">{pendingDocCount}</div>
          <div className="pmc-kpi-label">Pending Documents</div>
        </div>
        <div className="pmc-kpi-card">
          <div className="pmc-kpi-icon pmc-kpi-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="pmc-kpi-value">{formatCurrency(revenueInProgress)}</div>
          <div className="pmc-kpi-label">Revenue in Progress</div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="pmc-tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`pmc-tab${activeTab === tab.id ? ' pmc-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pmc-tab-content">
        {/* ===== 1. Job Overview ===== */}
        {activeTab === 'jobs' && (
          <div className="pmc-section">
            <div className="pmc-table-wrap">
              <table className="pmc-table">
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Aging</th>
                    <th>Crew Chief</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <React.Fragment key={job.id}>
                      <tr
                        className="pmc-table-row pmc-table-row-clickable"
                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                      >
                        <td className="pmc-td-bold">{job.id}</td>
                        <td>{job.customer}</td>
                        <td>
                          <span className="pmc-pill" style={{ background: TYPE_COLORS[job.type] + '22', color: TYPE_COLORS[job.type] }}>
                            {job.type}
                          </span>
                        </td>
                        <td>
                          <span className="pmc-pill" style={{ background: STATUS_COLORS[job.status] + '22', color: STATUS_COLORS[job.status] }}>
                            {job.status}
                          </span>
                        </td>
                        <td>{job.agingDays}d</td>
                        <td>{job.crewChief ? job.crewChief.charAt(0) + job.crewChief.slice(1).toLowerCase() : <span className="pmc-unassigned">Unassigned</span>}</td>
                        <td>
                          <span className="pmc-priority-badge" style={{ background: PRIORITY_COLORS[job.priority] + '22', color: PRIORITY_COLORS[job.priority] }}>
                            {job.priority}
                          </span>
                        </td>
                      </tr>
                      {expandedJob === job.id && (
                        <tr className="pmc-expanded-row">
                          <td colSpan={7}>
                            <div className="pmc-expanded-detail">
                              <div><strong>Address:</strong> {job.address}</div>
                              <div><strong>Loss Type:</strong> {job.type}</div>
                              <div><strong>Loss Date:</strong> {job.lossDate}</div>
                              <div><strong>Date Received:</strong> {job.dateReceived}</div>
                              <div><strong>Target Completion:</strong> {job.targetCompletion}</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {filteredJobs.length === 0 && (
                    <tr><td colSpan={7} className="pmc-empty">No jobs found for selected PM.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== 2. Tasks & Action Items ===== */}
        {activeTab === 'tasks' && (
          <div className="pmc-section">
            <div className="pmc-section-header">
              <button className="pmc-btn" onClick={() => setShowAddTask(!showAddTask)}>
                {showAddTask ? 'Cancel' : '+ Add Task'}
              </button>
            </div>
            {showAddTask && (
              <div className="pmc-add-task-form">
                <input
                  type="text"
                  placeholder="Task description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
                <select value={newTask.jobId} onChange={(e) => setNewTask({ ...newTask, jobId: e.target.value })}>
                  <option value="">Select Job</option>
                  {filteredJobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.id} — {j.customer}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
                <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <button className="pmc-btn pmc-btn-primary" onClick={handleAddTask}>Save</button>
              </div>
            )}
            {[
              { key: 'overdue', label: 'Overdue', color: '#ef4444' },
              { key: 'today', label: 'Due Today', color: '#f59e0b' },
              { key: 'upcoming', label: 'Upcoming', color: '#3b82f6' },
            ].map((group) => (
              <div key={group.key} className="pmc-task-group">
                <h4 className="pmc-task-group-title" style={{ color: group.color }}>
                  {group.label}
                  <span className="pmc-task-count">{groupedTasks[group.key].length}</span>
                </h4>
                {groupedTasks[group.key].map((task) => (
                  <div key={task.id} className={`pmc-task-item${task.completed ? ' pmc-task-done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      className="pmc-checkbox"
                    />
                    <div className="pmc-task-info">
                      <span className="pmc-task-desc">{task.description}</span>
                      <span className="pmc-task-meta">
                        {task.jobId} &middot; Due {task.dueDate}
                      </span>
                    </div>
                    <span className="pmc-priority-badge" style={{ background: PRIORITY_COLORS[task.priority] + '22', color: PRIORITY_COLORS[task.priority] }}>
                      {task.priority}
                    </span>
                  </div>
                ))}
                {groupedTasks[group.key].length === 0 && (
                  <div className="pmc-task-empty">No {group.label.toLowerCase()} tasks</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===== 3. Crew Assignments ===== */}
        {activeTab === 'crew' && (
          <div className="pmc-section">
            <div className="pmc-crew-grid">
              {filteredCrew.map((crew) => (
                <div key={crew.crewChief} className="pmc-crew-card">
                  <div className="pmc-crew-header">
                    <h4>{crew.crewChief.charAt(0) + crew.crewChief.slice(1).toLowerCase()}</h4>
                    <span className="pmc-crew-hours">{crew.totalHoursToday}h today</span>
                  </div>
                  <div className="pmc-crew-jobs">
                    {crew.jobs.map((j) => (
                      <span key={j.jobId} className="pmc-job-chip" style={{ borderColor: TYPE_COLORS[j.type] }}>
                        {j.jobId} <span style={{ color: TYPE_COLORS[j.type] }}>{j.type}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {unassignedJobs.length > 0 && (
              <div className="pmc-unassigned-section">
                <h4 className="pmc-task-group-title" style={{ color: '#f59e0b' }}>
                  Unassigned Jobs
                  <span className="pmc-task-count">{unassignedJobs.length}</span>
                </h4>
                <div className="pmc-crew-jobs">
                  {unassignedJobs.map((j) => (
                    <span key={j.id} className="pmc-job-chip pmc-job-chip-unassigned">
                      {j.id} — {j.customer}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 4. Financials ===== */}
        {activeTab === 'financials' && (
          <div className="pmc-section">
            <div className="pmc-table-wrap">
              <table className="pmc-table">
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Customer</th>
                    <th>Estimate</th>
                    <th>Invoiced</th>
                    <th>Collected</th>
                    <th>Outstanding</th>
                    <th>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFinancials.map((f) => (
                    <tr key={f.jobId} className="pmc-table-row">
                      <td className="pmc-td-bold">{f.jobId}</td>
                      <td>{f.customer}</td>
                      <td>{formatCurrency(f.estimateValue)}</td>
                      <td className="pmc-fin-invoiced">{formatCurrency(f.invoiced)}</td>
                      <td className="pmc-fin-collected">{formatCurrency(f.collected)}</td>
                      <td className="pmc-fin-outstanding">{f.outstanding > 0 ? formatCurrency(f.outstanding) : '—'}</td>
                      <td>{f.margin > 0 ? f.margin + '%' : '—'}</td>
                    </tr>
                  ))}
                  {filteredFinancials.length > 0 && (
                    <tr className="pmc-table-row pmc-totals-row">
                      <td className="pmc-td-bold" colSpan={2}>Totals</td>
                      <td className="pmc-td-bold">{formatCurrency(financialTotals.estimateValue)}</td>
                      <td className="pmc-td-bold pmc-fin-invoiced">{formatCurrency(financialTotals.invoiced)}</td>
                      <td className="pmc-td-bold pmc-fin-collected">{formatCurrency(financialTotals.collected)}</td>
                      <td className="pmc-td-bold pmc-fin-outstanding">{financialTotals.outstanding > 0 ? formatCurrency(financialTotals.outstanding) : '—'}</td>
                      <td></td>
                    </tr>
                  )}
                  {filteredFinancials.length === 0 && (
                    <tr><td colSpan={7} className="pmc-empty">No financial data for selected PM.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== 5. Communication Log ===== */}
        {activeTab === 'comms' && (
          <div className="pmc-section">
            <div className="pmc-section-header">
              <select
                className="pmc-filter-select"
                value={commFilter}
                onChange={(e) => setCommFilter(e.target.value)}
              >
                <option value="">All Jobs</option>
                {commJobIds.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <div className="pmc-timeline">
              {filteredComms.map((c) => (
                <div key={c.id} className="pmc-timeline-entry">
                  <div className="pmc-timeline-dot" />
                  <div className="pmc-timeline-content">
                    <div className="pmc-timeline-header">
                      <span className="pmc-comm-type">{COMM_TYPE_LABELS[c.type]}</span>
                      <span className="pmc-comm-date">{c.date}</span>
                    </div>
                    <div className="pmc-comm-contact">{c.contact}</div>
                    <div className="pmc-comm-summary">{c.summary}</div>
                    <div className="pmc-comm-job">{c.jobId}</div>
                  </div>
                </div>
              ))}
              {filteredComms.length === 0 && (
                <div className="pmc-task-empty">No communications found.</div>
              )}
            </div>
          </div>
        )}

        {/* ===== 6. Documents & Photos ===== */}
        {activeTab === 'docs' && (
          <div className="pmc-section">
            <div className="pmc-table-wrap">
              <table className="pmc-table">
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Customer</th>
                    <th>ATP</th>
                    <th>Sketch</th>
                    <th>Scope</th>
                    <th>Photos</th>
                    <th>DryBook</th>
                    <th>Final Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((d) => (
                    <tr key={d.jobId} className="pmc-table-row">
                      <td className="pmc-td-bold">{d.jobId}</td>
                      <td>{d.customer}</td>
                      {['atp', 'sketch', 'scope', 'photos', 'dryBook', 'finalEstimate'].map((field) => (
                        <td key={field} className={DOC_CLASSES[d[field]]}>
                          {DOC_ICONS[d[field]]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredDocs.length === 0 && (
                    <tr><td colSpan={8} className="pmc-empty">No documents for selected PM.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
