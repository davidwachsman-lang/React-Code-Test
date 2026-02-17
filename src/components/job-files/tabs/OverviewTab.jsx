import {
  STATUS_OPTIONS,
  STAGE_OPTIONS,
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

function daysOpen(createdAt) {
  if (!createdAt) return '-';
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export default function OverviewTab({ job, localState, onSupabaseChange, onLocalChange }) {
  const statusDisplay = STATUS_DISPLAY_MAP[job.status] || job.status?.toUpperCase() || 'UNKNOWN';

  return (
    <div className="overview-tab">
      {/* Snapshot Card */}
      <div className="overview-snapshot">
        <div className="snapshot-row">
          <div className="snapshot-item">
            <span className="snapshot-label">Job ID</span>
            <span className="snapshot-value">{job.job_number || 'N/A'}</span>
          </div>
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
          <div className="snapshot-item">
            <span className="snapshot-label">Stage</span>
            <select
              className="form-input snapshot-select"
              value={localState.stage || ''}
              onChange={(e) => onLocalChange('stage', e.target.value)}
            >
              <option value="">Select...</option>
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="preview-tag">Preview</span>
          </div>
        </div>

        <div className="snapshot-row">
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
              value={localState.group || ''}
              onChange={(e) => onLocalChange('group', e.target.value)}
            >
              <option value="">Select...</option>
              {GROUP_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <span className="preview-tag">Preview</span>
          </div>
          <div className="snapshot-item">
            <span className="snapshot-label">Department</span>
            <select
              className="form-input snapshot-select"
              value={localState.department || ''}
              onChange={(e) => onLocalChange('department', e.target.value)}
            >
              <option value="">Select...</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span className="preview-tag">Preview</span>
          </div>
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
            <span className="qv-label">Days Open</span>
            <span className="qv-value">{daysOpen(job.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Closure Info (if closed) */}
      {job.status === 'closed' && (
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
        </div>
      )}
    </div>
  );
}
