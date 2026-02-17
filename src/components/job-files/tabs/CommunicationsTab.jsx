import { useState } from 'react';
import { ESCALATION_SEVERITIES } from '../../../constants/jobFileConstants';

const COMM_TYPES = [
  { key: 'internal', label: 'Internal Notes', supabase: true, dbField: 'internal_notes' },
  { key: 'customer', label: 'Customer Communication', supabase: false, localField: 'customer_communication' },
  { key: 'adjuster', label: 'Adjuster/Carrier Communication', supabase: false, localField: 'adjuster_carrier_communication' },
  { key: 'escalations', label: 'Escalations', supabase: false, localField: 'escalations', hasServerity: true },
  { key: 'timeline', label: 'Job Timeline Events', supabase: false, localField: 'job_timeline_events', readOnly: true },
];

export default function CommunicationsTab({ job, localState, onSupabaseChange, onLocalChange, onAddNote }) {
  const [activeCommType, setActiveCommType] = useState('internal');
  const [newEntry, setNewEntry] = useState('');
  const [severity, setSeverity] = useState('Medium');

  const currentType = COMM_TYPES.find(t => t.key === activeCommType);

  const getCurrentLog = () => {
    if (currentType.supabase) return job[currentType.dbField] || '';
    return localState[currentType.localField] || '';
  };

  const handleAdd = () => {
    if (!newEntry.trim()) return;

    const timestamp = `[${new Date().toLocaleString()}]`;
    const prefix = currentType.hasServerity ? `[${severity}] ` : '';
    const entry = `${timestamp}\n${prefix}${newEntry}`;

    if (currentType.supabase) {
      onAddNote(newEntry);
    } else {
      const existing = localState[currentType.localField] || '';
      const updated = existing ? `${existing}\n\n${entry}` : entry;
      onLocalChange(currentType.localField, updated);
    }
    setNewEntry('');
  };

  return (
    <div className="communications-tab">
      <div className="comm-subtabs">
        {COMM_TYPES.map((type) => (
          <button
            key={type.key}
            className={`comm-subtab ${activeCommType === type.key ? 'active' : ''}`}
            onClick={() => setActiveCommType(type.key)}
          >
            {type.label}
          </button>
        ))}
      </div>

      {!currentType.supabase && (
        <div className="doc-preview-banner">
          This communication log is in preview mode and won't persist between sessions.
        </div>
      )}

      {!currentType.readOnly && (
        <div className="detail-section">
          <h3>Add Entry</h3>
          {currentType.hasServerity && (
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label>Severity</label>
              <select
                className="form-input"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {ESCALATION_SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <textarea
            className="note-textarea"
            placeholder={`Enter ${currentType.label.toLowerCase()}...`}
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            rows={4}
          />
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={!newEntry.trim()}
          >
            Add Entry
          </button>
        </div>
      )}

      <div className="detail-section">
        <h3>History</h3>
        {currentType.readOnly ? (
          <p className="no-notes">Job timeline events will be auto-populated in a future update.</p>
        ) : getCurrentLog() ? (
          <div className="notes-history">{getCurrentLog()}</div>
        ) : (
          <p className="no-notes">No entries yet.</p>
        )}
      </div>
    </div>
  );
}
