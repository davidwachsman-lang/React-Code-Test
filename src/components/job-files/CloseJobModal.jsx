import { useState } from 'react';

export default function CloseJobModal({ job, onClose, onConfirm }) {
  const [closedBy, setClosedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!closedBy.trim()) return;
    setSaving(true);
    try {
      await onConfirm({ closedBy: closedBy.trim(), notes: notes.trim() });
      onClose();
    } catch (err) {
      console.error('Failed to close job:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2>Close Job</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <p style={{ padding: '0 1.25rem', color: '#64748B', fontSize: '0.85rem' }}>
          This will mark <strong>{job.job_number || job.external_job_number || 'this job'}</strong> as closed.
        </p>
        <div className="form-group">
          <label>Closed By <span style={{ color: '#DC2626' }}>*</span></label>
          <input
            type="text"
            className="form-input"
            placeholder="Your name"
            value={closedBy}
            onChange={(e) => setClosedBy(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Closure Notes</label>
          <textarea
            className="form-input"
            placeholder="Reason for closing, final notes..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            style={{ background: '#DC2626' }}
            onClick={handleSubmit}
            disabled={!closedBy.trim() || saving}
          >
            {saving ? 'Closing...' : 'Close Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
