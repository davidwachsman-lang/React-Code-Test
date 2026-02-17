import { useState } from 'react';
import { FNOL_SECTIONS } from '../../../constants/jobFileConstants';

export default function FNOLTab({ job, localState, onSupabaseChange, onLocalChange }) {
  // #9: All sections start collapsed
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(FNOL_SECTIONS.map(s => [s.label, true]))
  );

  const toggle = (label) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const sectionColors = {
    'Caller Information': '#3b82f6',
    'Property & Access': '#8b5cf6',
    'Loss Details': '#ef4444',
    'Insurance': '#f59e0b',
    'Dispatch': '#22c55e',
    'Authorization & Payment': '#06b6d4',
  };

  // Get value for a field — Supabase, readonly, or local
  const getFieldValue = (field) => {
    if (field.readonlyFrom) return job?.[field.readonlyFrom] || '';
    if (field.supabaseField) return job?.[field.supabaseField] || '';
    // Pills stored as comma-separated string in localStorage
    return localState[field.key] || '';
  };

  // Handle change for a field
  const handleFieldChange = (field, value) => {
    if (field.readonlyFrom) return; // readonly fields can't be changed
    if (field.supabaseField) {
      onSupabaseChange(field.supabaseField, value);
    } else {
      onLocalChange(field.key, value);
    }
  };

  // Completion count per section
  const getSectionCompletion = (section) => {
    const filled = section.fields.filter(f => {
      const val = getFieldValue(f);
      return val !== '' && val !== undefined && val !== null;
    }).length;
    return { filled, total: section.fields.length };
  };

  // Toggle a pill value (comma-separated string in localStorage)
  const togglePill = (field, pill) => {
    const current = (localState[field.key] || '').split(',').filter(Boolean);
    const updated = current.includes(pill)
      ? current.filter(v => v !== pill)
      : [...current, pill];
    onLocalChange(field.key, updated.join(','));
  };

  const renderField = (field) => {
    const value = getFieldValue(field);
    const isReadonly = !!field.readonlyFrom;

    // Readonly fields
    if (isReadonly) {
      return (
        <div key={field.key} className="form-group">
          <label>{field.label}</label>
          <div className="form-input readonly-field">{value || 'N/A'}</div>
        </div>
      );
    }

    // Pills (checkbox group)
    if (field.type === 'pills') {
      const selected = (value || '').split(',').filter(Boolean);
      return (
        <div key={field.key} className="form-group form-group-full">
          <label>{field.label}</label>
          <div className="fnol-pill-container">
            {field.options.map(opt => (
              <label key={opt} className={`fnol-pill${selected.includes(opt) ? ' active' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => togglePill(field, opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }

    // Textarea
    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="form-group form-group-full">
          <label>{field.label}</label>
          <textarea
            className="form-input"
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            placeholder={field.label}
            rows={3}
            maxLength={2000}
          />
        </div>
      );
    }

    // Dropdown
    if (field.type === 'dropdown') {
      return (
        <div key={field.key} className="form-group">
          <label>
            {field.label}
            {field.supabaseField && <span className="supabase-tag" title="Saved to database">DB</span>}
          </label>
          <select
            className="form-input"
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    // Standard input (text, email, number, date, datetime-local)
    const inputType = field.type === 'email' ? 'email'
      : field.type === 'date' ? 'date'
      : field.type === 'datetime-local' ? 'datetime-local'
      : field.type === 'number' ? 'number'
      : 'text';

    return (
      <div key={field.key} className="form-group">
        <label>
          {field.label}
          {field.supabaseField && <span className="supabase-tag" title="Saved to database">DB</span>}
        </label>
        <input
          type={inputType}
          className="form-input"
          value={value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={field.label}
          {...(field.type === 'number' ? { min: '0' } : {})}
        />
      </div>
    );
  };

  return (
    <div className="fnol-tab">
      {FNOL_SECTIONS.map((section) => {
        const isCollapsed = collapsed[section.label];
        const borderColor = sectionColors[section.label] || '#3b82f6';
        const { filled, total } = getSectionCompletion(section);

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
              <h4>
                {section.label}
                <span className="fnol-completion-badge">{filled}/{total}</span>
              </h4>
              <span className="fnol-collapse-icon">{isCollapsed ? '+' : '-'}</span>
            </div>

            {!isCollapsed && (
              <div className="fnol-fields-grid">
                {section.fields.map(renderField)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
