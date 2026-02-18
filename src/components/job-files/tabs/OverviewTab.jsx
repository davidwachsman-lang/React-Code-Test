import { useState, useEffect } from 'react';
import {
  STATUS_OPTIONS,
  PENDING_STAGE_OPTIONS,
  WIP_STAGE_OPTIONS,
  DIVISION_OPTIONS,
  GROUP_OPTIONS,
  DEPARTMENT_OPTIONS,
  PM_OPTIONS,
  CREW_CHIEF_OPTIONS,
  ESTIMATOR_OPTIONS,
  STATUS_DB_MAP,
  STATUS_DISPLAY_MAP,
} from '../../../constants/jobFileConstants';

const SCHEDULE_ASSIGNEE_OPTIONS = [...new Set([...PM_OPTIONS, ...ESTIMATOR_OPTIONS, ...CREW_CHIEF_OPTIONS])].sort();
import scheduleService from '../../../services/scheduleService';

function formatCurrency(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '-';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeAging(job, localState) {
  const dateStr = localState.fnol_date || job.date_of_loss || job.date_received || job.created_at;
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const hr12 = hr % 12 || 12;
  return `${hr12}:${m} ${ampm}`;
}

export default function OverviewTab({ job, localState, onSupabaseChange, onLocalChange }) {
  const statusDisplay = STATUS_DISPLAY_MAP[job.status] || job.status?.toUpperCase() || 'UNKNOWN';

  // Close Job state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closedBy, setClosedBy] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [closing, setClosing] = useState(false);

  // Schedule Inspection state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('09:00');
  const [schedDuration, setSchedDuration] = useState(60);
  const [schedAssignee, setSchedAssignee] = useState('');
  const [schedNotes, setSchedNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Upcoming schedules
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  useEffect(() => {
    if (job?.id) loadSchedules();
  }, [job?.id]);

  const loadSchedules = async () => {
    try {
      setSchedulesLoading(true);
      const data = await scheduleService.getByJobId(job.id);
      setSchedules(data.filter(s => s.status !== 'cancelled'));
    } catch (err) {
      console.warn('Could not load schedules:', err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleCloseJob = async () => {
    if (!closedBy.trim()) return;
    setClosing(true);
    try {
      await onSupabaseChange('closed_by', closedBy.trim());
      if (closureNotes.trim()) {
        await onSupabaseChange('closure_notes', closureNotes.trim());
      }
      await onSupabaseChange('status', 'closed');
      setShowCloseModal(false);
    } catch (err) {
      console.error('Failed to close job:', err);
    } finally {
      setClosing(false);
    }
  };

  const handleReopenJob = async () => {
    await onSupabaseChange('status', 'pending');
  };

  const handleSchedule = async () => {
    if (!schedDate || !schedAssignee) return;
    setScheduling(true);
    try {
      await scheduleService.createSchedule({
        jobId: job.id,
        technicianName: schedAssignee,
        scheduledDate: schedDate,
        scheduledTime: schedTime || null,
        durationMinutes: schedDuration,
        notes: schedNotes || null,
      });
      // Update job stage and inspection_date
      await onSupabaseChange('stage', 'Inspection Scheduled');
      await onSupabaseChange('inspection_date', schedDate);
      // Refresh schedules
      await loadSchedules();
      setShowScheduleModal(false);
      setSchedDate('');
      setSchedTime('09:00');
      setSchedDuration(60);
      setSchedAssignee('');
      setSchedNotes('');
    } catch (err) {
      console.error('Failed to schedule:', err);
      alert('Failed to schedule: ' + (err.message || 'Unknown error'));
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelSchedule = async (scheduleId) => {
    try {
      await scheduleService.cancelSchedule(scheduleId);
      await loadSchedules();
    } catch (err) {
      console.error('Failed to cancel schedule:', err);
    }
  };

  return (
    <div className="overview-tab">
      {/* Snapshot Card */}
      <div className="overview-snapshot">
        <div className="snapshot-row">
          <div className="snapshot-item">
            <span className="snapshot-label">Job ID</span>
            <span className="snapshot-value">{job.job_number || job.external_job_number || 'N/A'}</span>
          </div>
          {job.status !== 'closed' ? (
            <>
              <div className="snapshot-item">
                <span className="snapshot-label">Status</span>
                <select
                  className="form-input snapshot-select"
                  value={job.status || ''}
                  onChange={(e) => onSupabaseChange('status', e.target.value)}
                >
                  <option value="">Select...</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={STATUS_DB_MAP[s]}>{s}</option>
                  ))}
                </select>
              </div>
              {(job.status === 'pending' || job.status === 'wip') && (
                <div className="snapshot-item">
                  <span className="snapshot-label">Stage</span>
                  <select
                    className="form-input snapshot-select"
                    value={job.stage || ''}
                    onChange={(e) => onSupabaseChange('stage', e.target.value)}
                  >
                    <option value="">Select...</option>
                    {(job.status === 'pending' ? PENDING_STAGE_OPTIONS : WIP_STAGE_OPTIONS).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="snapshot-item">
                <span className="snapshot-label">Division</span>
                <select
                  className="form-input snapshot-select"
                  value={job.division || ''}
                  onChange={(e) => onSupabaseChange('division', e.target.value)}
                >
                  <option value="">Select...</option>
                  {DIVISION_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Group</span>
                <select
                  className="form-input snapshot-select"
                  value={job.job_group || ''}
                  onChange={(e) => onSupabaseChange('job_group', e.target.value)}
                >
                  <option value="">Select...</option>
                  {GROUP_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Job Type</span>
                <select
                  className="form-input snapshot-select"
                  value={job.department || ''}
                  onChange={(e) => onSupabaseChange('department', e.target.value)}
                >
                  <option value="">Select...</option>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="snapshot-item">
              <span className="snapshot-label">Status</span>
              <span className="status-badge status-closed">CLOSED</span>
            </div>
          )}
        </div>
      </div>

      {/* Customer & Property Summary */}
      <div className="detail-section">
        <h3>Customer & Property</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <strong>Customer</strong>
            <span>{job.customer_name || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <strong>Property Address</strong>
            <span>{job.property_address || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Quick-View Row */}
      <div className="detail-section">
        <h3>Quick View</h3>
        <div className="quick-view-row">
          <div className="quick-view-card">
            <span className="qv-label">PM</span>
            <span className="qv-value">{job.pm || '-'}</span>
          </div>
          <div className="quick-view-card">
            <span className="qv-label">JFC</span>
            <span className="qv-value">{job.jfc || '-'}</span>
          </div>
          <div className="quick-view-card">
            <span className="qv-label">Estimate</span>
            <span className="qv-value">{formatCurrency(job.estimate_value)}</span>
          </div>
          <div className="quick-view-card">
            <span className="qv-label">Aging</span>
            <span className="qv-value">{computeAging(job, localState)}d</span>
          </div>
        </div>
      </div>

      {/* Scheduled Items */}
      {job.status !== 'closed' && (
        <div className="detail-section">
          <div className="section-header-row">
            <h3>Scheduled</h3>
            <button className="btn-schedule" onClick={() => setShowScheduleModal(true)}>
              + Schedule
            </button>
          </div>
          {schedulesLoading ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading...</p>
          ) : schedules.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No upcoming scheduled items</p>
          ) : (
            <div className="schedule-list">
              {schedules.map((s) => {
                const isPast = new Date(s.scheduled_date + 'T23:59:59') < new Date();
                return (
                  <div key={s.id} className={`schedule-item ${isPast ? 'past' : ''} ${s.status === 'completed' ? 'completed' : ''}`}>
                    <div className="schedule-item-main">
                      <span className="schedule-date">{formatDate(s.scheduled_date)}</span>
                      {s.scheduled_time && <span className="schedule-time">{formatTime(s.scheduled_time)}</span>}
                      <span className="schedule-duration">{s.duration_minutes}min</span>
                      <span className="schedule-assignee">{s.technician_name}</span>
                      {s.notes && <span className="schedule-notes">{s.notes}</span>}
                    </div>
                    <div className="schedule-item-actions">
                      <span className={`schedule-status schedule-status-${s.status}`}>
                        {s.status}
                      </span>
                      {s.status === 'scheduled' && (
                        <button
                          className="btn-cancel-schedule"
                          onClick={() => handleCancelSchedule(s.id)}
                          title="Cancel"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Close / Reopen Job */}
      {job.status !== 'closed' ? (
        <div className="detail-section" style={{ textAlign: 'right' }}>
          <button className="btn-close-job" onClick={() => setShowCloseModal(true)}>
            Close Job
          </button>
        </div>
      ) : (
        <div className="detail-section">
          <h3>Closure Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <strong>Closed By</strong>
              <span>{job.closed_by || 'N/A'}</span>
            </div>
            {job.closure_notes && (
              <div className="detail-item">
                <strong>Closure Notes</strong>
                <span>{job.closure_notes}</span>
              </div>
            )}
          </div>
          <button
            className="btn-reopen-job"
            onClick={handleReopenJob}
            style={{ marginTop: '1rem' }}
          >
            Reopen Job
          </button>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="close-modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="close-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Schedule</h3>
            <p className="close-modal-subtitle">
              Schedule an inspection or visit for <strong>{job.job_number || job.external_job_number || 'this job'}</strong>
            </p>
            <div className="close-modal-field">
              <label>Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="date"
                className="form-input"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                autoFocus
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="close-modal-field">
                <label>Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                />
              </div>
              <div className="close-modal-field">
                <label>Duration (min)</label>
                <select
                  className="form-input"
                  value={schedDuration}
                  onChange={(e) => setSchedDuration(Number(e.target.value))}
                >
                  <option value={30}>30 min</option>
                  <option value={60}>1 hr</option>
                  <option value={90}>1.5 hr</option>
                  <option value={120}>2 hr</option>
                  <option value={180}>3 hr</option>
                  <option value={240}>4 hr</option>
                </select>
              </div>
            </div>
            <div className="close-modal-field">
              <label>Assigned To <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                className="form-input"
                value={schedAssignee}
                onChange={(e) => setSchedAssignee(e.target.value)}
              >
                <option value="">Select...</option>
                {SCHEDULE_ASSIGNEE_OPTIONS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="close-modal-field">
              <label>Notes</label>
              <textarea
                className="form-input"
                placeholder="Inspection type, special instructions..."
                rows={2}
                value={schedNotes}
                onChange={(e) => setSchedNotes(e.target.value)}
              />
            </div>
            <div className="close-modal-actions">
              <button className="btn-cancel" onClick={() => setShowScheduleModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSchedule}
                disabled={!schedDate || !schedAssignee || scheduling}
              >
                {scheduling ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Job Modal */}
      {showCloseModal && (
        <div className="close-modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="close-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Close Job</h3>
            <p className="close-modal-subtitle">
              This will mark <strong>{job.job_number || job.external_job_number || 'this job'}</strong> as closed.
            </p>
            <div className="close-modal-field">
              <label>Closed By <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Your name"
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                autoFocus
              />
            </div>
            <div className="close-modal-field">
              <label>Closure Notes</label>
              <textarea
                className="form-input"
                placeholder="Reason for closing, final notes..."
                rows={3}
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
              />
            </div>
            <div className="close-modal-actions">
              <button className="btn-cancel" onClick={() => setShowCloseModal(false)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleCloseJob}
                disabled={!closedBy.trim() || closing}
              >
                {closing ? 'Closing...' : 'Close Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
