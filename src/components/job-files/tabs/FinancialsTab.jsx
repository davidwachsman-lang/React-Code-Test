const FINANCIAL_FIELDS = [
  { key: 'estimate_value', label: 'Estimate Amount' },
  { key: 'invoiced_amount', label: 'Invoiced Amount' },
  { key: 'subcontractor_cost', label: 'Subcontractor Cost' },
  { key: 'labor_cost', label: 'Labor Cost' },
  { key: 'ar_balance', label: 'AR Balance' },
  { key: '_outstanding_balance', label: 'Outstanding Balance', derived: true },
  { key: '_gp_pct', label: 'GP%', derived: true },
];

function formatCurrency(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '-';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function gpColor(pct) {
  if (pct >= 50) return '#22c55e';
  if (pct >= 30) return '#fbbf24';
  return '#ef4444';
}

export default function FinancialsTab({ job, onSupabaseChange }) {
  const estimate = parseFloat(job.estimate_value) || 0;
  const invoiced = parseFloat(job.invoiced_amount) || 0;
  const subCost = parseFloat(job.subcontractor_cost) || 0;
  const laborCost = parseFloat(job.labor_cost) || 0;
  const outstandingBalance = invoiced > 0 ? invoiced - (parseFloat(job.date_paid ? invoiced : 0)) : 0;
  const gpPct = estimate > 0 ? ((estimate - subCost - laborCost) / estimate) * 100 : 0;

  return (
    <div className="financials-tab-content">
      <div className="detail-section">
        <h3>Financials</h3>
        <div className="financials-grid">
          {FINANCIAL_FIELDS.map((f) => {
            if (f.key === '_outstanding_balance') {
              return (
                <div key={f.key} className="derived-field-card">
                  <span className="derived-field-label">
                    {f.label}
                    <span className="derived-tag" title="Invoiced - Payments">Derived</span>
                  </span>
                  <span className="derived-field-value">
                    {formatCurrency(outstandingBalance)}
                  </span>
                </div>
              );
            }
            if (f.key === '_gp_pct') {
              return (
                <div key={f.key} className="derived-field-card">
                  <span className="derived-field-label">
                    {f.label}
                    <span className="derived-tag" title="(Estimate - Sub - Labor) / Estimate x 100">Derived</span>
                  </span>
                  <span
                    className="derived-field-value"
                    style={{ color: gpColor(gpPct), fontSize: '1.5rem' }}
                  >
                    {estimate > 0 ? `${gpPct.toFixed(1)}%` : '-'}
                  </span>
                </div>
              );
            }
            return (
              <div key={f.key} className="form-group">
                <label>{f.label}</label>
                <input
                  type="number"
                  className="form-input"
                  value={job[f.key] || ''}
                  onChange={(e) => onSupabaseChange(f.key, e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
