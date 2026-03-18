import { useState } from 'react';
import {
  PM_OPTIONS,
  ESTIMATOR_OPTIONS,
  CREW_CHIEF_OPTIONS,
} from '../../constants/jobFileConstants';

const ASSIGNEE_OPTIONS = [...new Set([...PM_OPTIONS, ...ESTIMATOR_OPTIONS, ...CREW_CHIEF_OPTIONS])].sort();

export default function ScheduleModal({ job, onSchedule, onClose }) {
  const [type, setType] = useState('Inspection');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [assignee, setAssignee] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!date || !assignee) return;
    setSaving(true);
    try {
      await onSchedule({ type, date, time, duration, assignee, notes });
      onClose();
    } catch (err) {
      console.error('Failed to schedule:', err);
      alert('Failed to schedule: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2>Schedule</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <p style={{ padding: '0 1.25rem', color: '#64748B', fontSize: '0.85rem' }}>
          Schedule an inspection or visit for <strong>{job.job_number || job.external_job_number || 'this job'}</strong>
        </p>
        <div className="form-group">
          <label>Type <span style={{ color: '#DC2626' }}>*</span></label>
          <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Inspection">Inspection</option>
            <option value="Site Visit">Site Visit</option>
          </select>
        </div>
        <div className="form-group">
          <label>Date <span style={{ color: '#DC2626' }}>*</span></label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            autoFocus
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0 1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>Time</label>
            <input type="time" className="form-input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0A2540', marginBottom: '6px' }}>Duration</label>
            <select className="form-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={30}>30 min</option>
              <option value={60}>1 hr</option>
              <option value={90}>1.5 hr</option>
              <option value={120}>2 hr</option>
              <option value={180}>3 hr</option>
              <option value={240}>4 hr</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Assigned To <span style={{ color: '#DC2626' }}>*</span></label>
          <select className="form-input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Select...</option>
            {ASSIGNEE_OPTIONS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea className="form-input" placeholder="Inspection type, special instructions..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="form-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!date || !assignee || saving}>
            {saving ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
