import {
  PM_OPTIONS,
  CREW_CHIEF_OPTIONS,
  JFC_OPTIONS,
  ESTIMATOR_OPTIONS,
  BIZ_DEV_OPTIONS,
} from '../../../constants/jobFileConstants';

const COLUMNS = [
  {
    label: 'Operations',
    color: '#2563EB',
    fields: [
      { key: 'pm', label: 'Project Manager (PM)', options: PM_OPTIONS },
      { key: 'crew_chief', label: 'Crew Chief', options: CREW_CHIEF_OPTIONS },
      { key: 'jfc', label: 'JFC', options: JFC_OPTIONS },
    ],
  },
  {
    label: 'Estimating',
    color: '#9333EA',
    fields: [
      { key: 'estimator', label: 'Estimator', options: ESTIMATOR_OPTIONS },
      { key: 'estimate_owner', label: 'Estimate Owner', options: null },
    ],
  },
  {
    label: 'Sales',
    color: '#16A34A',
    fields: [
      { key: 'sales_person', label: 'Business Development Rep', options: BIZ_DEV_OPTIONS },
    ],
  },
];

export default function PersonnelTab({ job, onSupabaseChange }) {
  const renderField = (f) => (
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
  );

  return (
    <div className="personnel-tab">
      <div className="pers-columns-grid">
        {COLUMNS.map((col) => (
          <div key={col.label} className="pers-column" style={{ borderTopColor: col.color }}>
            <div className="pers-column-header">
              <h4>{col.label}</h4>
            </div>
            <div className="pers-column-fields">
              {col.fields.map(renderField)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
