import { useState } from 'react';
import { FNOL_SECTIONS } from '../../../constants/jobFileConstants';

export default function FNOLTab({ localState, onLocalChange }) {
  const [collapsed, setCollapsed] = useState({});

  const toggle = (label) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const sectionColors = {
    Customer: '#3b82f6',
    Property: '#8b5cf6',
    Insurance: '#f59e0b',
    'Loss Details': '#ef4444',
    Dispatch: '#22c55e',
  };

  return (
    <div className="fnol-tab">
      <div className="doc-preview-banner">
        All FNOL fields are in preview mode and won't persist between sessions.
      </div>

      {FNOL_SECTIONS.map((section) => {
        const isCollapsed = collapsed[section.label];
        const borderColor = sectionColors[section.label] || '#3b82f6';

        return (
          <div
            key={section.label}
            className="fnol-section"
            style={{ borderLeftColor: borderColor }}
          >
            <div
              className="fnol-section-header"
              onClick={() => toggle(section.label)}
            >
              <h4>{section.label}</h4>
              <span className="fnol-collapse-icon">{isCollapsed ? '+' : '-'}</span>
            </div>

            {!isCollapsed && (
              <div className="fnol-fields-grid">
                {section.fields.map((field) => (
                  <div key={field.key} className="form-group">
                    <label>{field.label}</label>
                    {field.type === 'dropdown' ? (
                      <select
                        className="form-input"
                        value={localState[field.key] || ''}
                        onChange={(e) => onLocalChange(field.key, e.target.value)}
                      >
                        <option value="">Select...</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        className="form-input"
                        value={localState[field.key] || ''}
                        onChange={(e) => onLocalChange(field.key, e.target.value)}
                        placeholder={field.label}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
