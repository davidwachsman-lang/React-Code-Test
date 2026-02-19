const DATE_FIELDS = [
  { key: 'target_completion_date', label: 'Target Completion' },
  { key: 'date_of_loss', label: 'Date of Loss' },
  { key: 'date_received', label: 'Date Received' },
  { key: 'date_inspected', label: 'Date Inspected' },
  { key: 'date_started', label: 'Start Date' },
  { key: 'estimate_sent_date', label: 'Estimate Sent' },
  { key: 'date_majority_completion', label: 'Majority Completion' },
  { key: 'date_of_cos', label: 'Date of COS' },
  { key: 'date_invoiced', label: 'Date Invoiced' },
  { key: 'date_paid', label: 'Date Paid' },
  { key: 'date_closed', label: 'Date Closed' },
  { key: '_last_journal', label: 'Last Journal Note', derived: true },
];

export default function DatesTab({ job, onSupabaseChange }) {
  return (
    <div className="dates-tab-content">
      <div className="detail-section">
        <h3>Key Dates</h3>
        <div className="dates-grid-3col">
          {DATE_FIELDS.map((f) => (
            <div key={f.key} className="form-group">
              <label>
                {f.label}
                {f.derived && <span className="derived-tag">Derived</span>}
              </label>
              {f.derived ? (
                <div className="derived-value">-</div>
              ) : (
                <input
                  type="date"
                  className="form-input"
                  value={job[f.key] || ''}
                  onChange={(e) => onSupabaseChange(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
