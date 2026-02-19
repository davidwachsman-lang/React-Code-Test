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
  // #11: Track which sections are open (multiple can be open at once)
  const [openSections, setOpenSections] = useState({ internal: true });
  const [newEntries, setNewEntries] = useState({});
  const [severity, setSeverity] = useState('Medium');

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getLog = (type) => {
    if (type.supabase) return job[type.dbField] || '';
    return localState[type.localField] || '';
  };

  const handleAdd = (type) => {
    const text = (newEntries[type.key] || '').trim();
    if (!text) return;

    const timestamp = `[${new Date().toLocaleString()}]`;
    const prefix = type.hasServerity ? `[${severity}] ` : '';
    const entry = `${timestamp}\n${prefix}${text}`;

    if (type.supabase) {
      onAddNote(text);
    } else {
      const existing = localState[type.localField] || '';
      const updated = existing ? `${existing}\n\n${entry}` : entry;
      onLocalChange(type.localField, updated);
    }
    setNewEntries(prev => ({ ...prev, [type.key]: '' }));
  };

  const sectionColors = {
    internal: '#3b82f6',
    customer: '#22c55e',
    adjuster: '#f59e0b',
    escalations: '#ef4444',
    timeline: '#8b5cf6',
  };

  return (
    <div className="communications-tab">
      {COMM_TYPES.map((type) => {
        const isOpen = openSections[type.key];
        const log = getLog(type);
        const borderColor = sectionColors[type.key] || '#3b82f6';

        return (
          <div
            key={type.key}
            className="fnol-section"
            style={{ borderLeftColor: borderColor }}
          >
            <div
              className="fnol-section-header"
              onClick={() => toggleSection(type.key)}
            >
              <h4>{type.label}</h4>
              <span className="fnol-collapse-icon">{isOpen ? '-' : '+'}</span>
            </div>

            {isOpen && (
              <div style={{ padding: '0 1.25rem 1.25rem' }}>
                {!type.readOnly && (
                  <div style={{ marginBottom: '1rem' }}>
                    {type.hasServerity && (
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
                      placeholder={`Enter ${type.label.toLowerCase()}...`}
                      value={newEntries[type.key] || ''}
                      onChange={(e) => setNewEntries(prev => ({ ...prev, [type.key]: e.target.value }))}
                      rows={4}
                      maxLength={2000}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        className="btn-primary"
                        onClick={() => handleAdd(type)}
                        disabled={!(newEntries[type.key] || '').trim()}
                      >
                        Add Entry
                      </button>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {(newEntries[type.key] || '').length}/2000
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    History
                  </h4>
                  {type.readOnly ? (
                    <p className="no-notes">Job timeline events will be auto-populated in a future update.</p>
                  ) : log ? (
                    <div className="notes-history">{log}</div>
                  ) : (
                    <p className="no-notes">No entries yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
