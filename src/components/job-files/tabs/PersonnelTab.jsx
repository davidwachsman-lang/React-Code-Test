import {
  PM_OPTIONS,
  CREW_CHIEF_OPTIONS,
  JFC_OPTIONS,
  ESTIMATOR_OPTIONS,
  BIZ_DEV_OPTIONS,
} from '../../../constants/jobFileConstants';

const FIELDS = [
  { key: 'pm', label: 'Project Manager (PM)', options: PM_OPTIONS },
  { key: 'crew_chief', label: 'Crew Chief', options: CREW_CHIEF_OPTIONS },
  { key: 'jfc', label: 'JFC', options: JFC_OPTIONS },
  { key: 'estimate_owner', label: 'Estimate Owner', options: null },
  { key: 'estimator', label: 'Estimator', options: ESTIMATOR_OPTIONS },
  { key: 'sales_person', label: 'Business Development Rep', options: BIZ_DEV_OPTIONS },
];

export default function PersonnelTab({ job, onSupabaseChange }) {
  return (
    <div className="personnel-tab">
      <div className="detail-section">
        <h3>Personnel Assignments</h3>
        <div className="personnel-grid">
          {FIELDS.map((f) => (
            <div key={f.key} className="form-group">
              <label>{f.label}</label>
              {f.options ? (
                <select
                  className="form-input"
                  value={job[f.key] || ''}
                  onChange={(e) => onSupabaseChange(f.key, e.target.value)}
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
                  value={job[f.key] || ''}
                  onChange={(e) => onSupabaseChange(f.key, e.target.value)}
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
