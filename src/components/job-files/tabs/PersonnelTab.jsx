import {
  PM_OPTIONS,
  CREW_CHIEF_OPTIONS,
  JFC_OPTIONS,
  ESTIMATOR_OPTIONS,
  BIZ_DEV_OPTIONS,
} from '../../../constants/jobFileConstants';

const FIELDS = [
  { key: 'pm', label: 'Project Manager (PM)', options: PM_OPTIONS, supabase: true },
  { key: 'crew_chief', label: 'Crew Chief', options: CREW_CHIEF_OPTIONS, supabase: false },
  { key: 'jfc', label: 'JFC', options: JFC_OPTIONS, supabase: true },
  { key: 'estimate_owner', label: 'Estimate Owner', options: null, supabase: false },
  { key: 'estimator', label: 'Estimator', options: ESTIMATOR_OPTIONS, supabase: true },
  { key: 'business_dev_rep', label: 'Business Development Rep', options: BIZ_DEV_OPTIONS, supabase: false, dbField: 'sales_person' },
];

export default function PersonnelTab({ job, localState, onSupabaseChange, onLocalChange }) {
  const getValue = (f) => {
    if (f.supabase) return job[f.dbField || f.key] || '';
    return localState[f.key] || '';
  };

  const handleChange = (f, value) => {
    if (f.supabase) {
      onSupabaseChange(f.dbField || f.key, value);
    } else {
      onLocalChange(f.key, value);
    }
  };

  return (
    <div className="personnel-tab">
      <div className="doc-preview-banner">
        Some fields are in preview mode and won't persist between sessions.
      </div>
      <div className="detail-section">
        <h3>Personnel Assignments</h3>
        <div className="personnel-grid">
          {FIELDS.map((f) => (
            <div key={f.key} className="form-group">
              <label>
                {f.label}
                {!f.supabase && <span className="preview-tag">Preview</span>}
              </label>
              {f.options ? (
                <select
                  className="form-input"
                  value={getValue(f)}
                  onChange={(e) => handleChange(f, e.target.value)}
                >
                  <option value="">Select {f.label}...</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  value={getValue(f)}
                  onChange={(e) => handleChange(f, e.target.value)}
                  placeholder={`Enter ${f.label}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
