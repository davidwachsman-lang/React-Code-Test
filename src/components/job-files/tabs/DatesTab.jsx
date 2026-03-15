const COLUMNS = [
  {
    label: 'Intake',
    color: '#2563EB',
    fields: [
      { key: 'date_of_loss', label: 'Date of Loss' },
      { key: 'date_received', label: 'Date Received' },
      { key: 'date_inspected', label: 'Date Inspected' },
      { key: 'estimate_sent_date', label: 'Estimate Sent' },
    ],
  },
  {
    label: 'Production',
    color: '#D97706',
    fields: [
      { key: 'date_started', label: 'Start Date' },
      { key: 'target_completion_date', label: 'Target Completion' },
      { key: 'date_of_cos', label: 'Date of COS' },
      { key: 'date_majority_completion', label: 'Majority Completion' },
    ],
  },
  {
    label: 'Billing & Close',
    color: '#16A34A',
    fields: [
      { key: 'date_invoiced', label: 'Date Invoiced' },
      { key: 'date_paid', label: 'Date Paid' },
      { key: 'date_closed', label: 'Date Closed' },
    ],
  },
];

export default function DatesTab({ job, onSupabaseChange }) {
  const renderField = (f) => (
    <div key={f.key} className="form-group">
      <label>{f.label}</label>
      <input
        type="date"
        className="form-input"
        value={job[f.key] || ''}
        onChange={(e) => onSupabaseChange(f.key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="dates-tab-content">
      <div className="dates-columns-grid">
        {COLUMNS.map((col) => (
          <div key={col.label} className="dates-column" style={{ borderTopColor: col.color }}>
            <div className="dates-column-header">
              <h4>{col.label}</h4>
            </div>
            <div className="dates-column-fields">
              {col.fields.map(renderField)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
