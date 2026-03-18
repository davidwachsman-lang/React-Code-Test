import React, { useState } from 'react';

const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In Person' },
  { value: 'letter', label: 'Letter/Mail' },
];

export default function LogContactModal({ job, onSave, onClose }) {
  const [form, setForm] = useState({
    contact_method: 'phone',
    notes: '',
    next_action_date: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(job.id, form);
      onClose();
    } catch (err) {
      console.error('Failed to log contact:', err);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Log Collection Contact</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="bar-modal-job-info">
          <span><strong>Job:</strong> {job.display_job_number}</span>
          <span><strong>Customer:</strong> {job.customer_name}</span>
          <span><strong>Balance:</strong> ${Number(job.ar_balance || 0).toLocaleString()}</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Contact Method</label>
            <select
              value={form.contact_method}
              onChange={(e) => setForm({ ...form, contact_method: e.target.value })}
            >
              {CONTACT_METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Describe the conversation or outcome..."
              required
            />
          </div>
          <div className="form-group">
            <label>Follow-Up Date</label>
            <input
              type="date"
              value={form.next_action_date}
              onChange={(e) => setForm({ ...form, next_action_date: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Log Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
