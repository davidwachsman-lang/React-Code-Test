import { FNOL_SECTIONS } from '../../../constants/jobFileConstants';

const SECTION_COLORS = {
  'Caller Information': '#2563EB',
  'Property & Access': '#9333EA',
  'Loss Details': '#DC2626',
  'Insurance': '#D97706',
  'Dispatch': '#16A34A',
  'Authorization & Payment': '#06b6d4',
};

export default function FNOLTab({ job, localState, onSupabaseChange, onLocalChange }) {
  // Get value for a field — Supabase, readonly, or local
  const getFieldValue = (field) => {
    if (field.readonlyFrom) return job?.[field.readonlyFrom] || '';
    if (field.supabaseField) return job?.[field.supabaseField] || '';
    return localState[field.key] || '';
  };

  const handleFieldChange = (field, value) => {
    if (field.readonlyFrom) return;
    if (field.supabaseField) {
      onSupabaseChange(field.supabaseField, value);
    } else {
      onLocalChange(field.key, value);
    }
  };

  const togglePill = (field, pill) => {
    const current = (localState[field.key] || '').split(',').filter(Boolean);
    const updated = current.includes(pill)
      ? current.filter(v => v !== pill)
      : [...current, pill];
    onLocalChange(field.key, updated.join(','));
  };

  const getSectionCompletion = (section) => {
    const filled = section.fields.filter(f => {
      const val = getFieldValue(f);
      return val !== '' && val !== undefined && val !== null;
    }).length;
    return { filled, total: section.fields.length };
  };

  const renderField = (field) => {
    const value = getFieldValue(field);
    const isReadonly = !!field.readonlyFrom;

    if (isReadonly) {
      return (
        <div key={field.key} className="form-group">
          <label>{field.label}</label>
          <div className="form-input readonly-field">{value || 'N/A'}</div>
        </div>
      );
    }

    if (field.type === 'pills') {
      const selected = (value || '').split(',').filter(Boolean);
      return (
        <div key={field.key} className="form-group">
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

    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="form-group">
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
      <div className="fnol-columns-grid">
        {FNOL_SECTIONS.map((section) => {
          const borderColor = SECTION_COLORS[section.label] || '#2563EB';
          const { filled, total } = getSectionCompletion(section);

          return (
            <div
              key={section.label}
              className="fnol-column"
              style={{ borderTopColor: borderColor }}
            >
              <div className="fnol-column-header">
                <h4>{section.label}</h4>
                <span className="fnol-completion-badge">{filled}/{total}</span>
              </div>
              <div className="fnol-column-fields">
                {section.fields.map(renderField)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
