import { useState } from 'react';
import {
  STATUS_OPTIONS,
  PENDING_STAGE_OPTIONS,
  WIP_STAGE_OPTIONS,
  DIVISION_OPTIONS,
  GROUP_OPTIONS,
  DEPARTMENT_OPTIONS,
  STATUS_DB_MAP,
  STATUS_DISPLAY_MAP,
} from '../../../constants/jobFileConstants';

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

export default function OverviewTab({ job, localState, onSupabaseChange, onLocalChange }) {
  const statusDisplay = STATUS_DISPLAY_MAP[job.status] || job.status?.toUpperCase() || 'UNKNOWN';
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closedBy, setClosedBy] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [closing, setClosing] = useState(false);

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
