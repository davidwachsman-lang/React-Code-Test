const DATE_FIELDS = [
  { key: 'target_completion_date', label: 'Target Completion', supabase: false },
  { key: 'date_of_loss', label: 'Date of Loss', supabase: false },
  { key: 'date_received', label: 'Date Received', supabase: true },
  { key: 'date_inspected', label: 'Date Inspected', supabase: true },
  { key: 'date_started', label: 'Start Date', supabase: true },
  { key: 'estimate_sent_date', label: 'Estimate Sent', supabase: true },
  { key: 'date_majority_completion', label: 'Majority Completion', supabase: true },
  { key: 'date_of_cos', label: 'Date of COS', supabase: false },
  { key: 'date_invoiced', label: 'Date Invoiced', supabase: true },
  { key: 'date_paid', label: 'Date Paid', supabase: true },
  { key: 'date_closed', label: 'Date Closed', supabase: true },
  { key: '_last_journal', label: 'Last Journal Note', supabase: true, derived: true },
];

export default function DatesTab({ job, localState, onSupabaseChange, onLocalChange }) {
  const getDateValue = (f) => {
    if (f.derived) return '';
    if (f.supabase) return job[f.key] || '';
    return localState[f.key] || '';
  };

  const handleDateChange = (f, value) => {
    if (f.supabase) onSupabaseChange(f.key, value);
    else onLocalChange(f.key, value);
  };

  return (
    <div className="dates-tab-content">
      <div className="detail-section">
        <h3>Key Dates</h3>
        <div className="dates-grid-3col">
          {DATE_FIELDS.map((f) => (
            <div key={f.key} className="form-group">
              <label>
                {f.label}
                {!f.supabase && !f.derived && <span className="preview-tag">Preview</span>}
                {f.derived && <span className="derived-tag">Derived</span>}
              </label>
              {f.derived ? (
                <div className="derived-value">-</div>
              ) : (
                <input
                  type="date"
                  className="form-input"
                  value={getDateValue(f)}
                  onChange={(e) => handleDateChange(f, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
