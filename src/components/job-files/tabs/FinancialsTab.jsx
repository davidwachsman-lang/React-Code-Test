const COLUMNS = [
  {
    label: 'Revenue',
    color: '#16A34A',
    fields: [
      { key: 'estimate_value', label: 'Estimate Amount' },
      { key: 'invoiced_amount', label: 'Invoiced Amount' },
    ],
  },
  {
    label: 'Costs',
    color: '#D97706',
    fields: [
      { key: 'subcontractor_cost', label: 'Subcontractor Cost' },
      { key: 'labor_cost', label: 'Labor Cost' },
    ],
  },
  {
    label: 'AR & Profitability',
    color: '#635BFF',
    fields: [
      { key: 'ar_balance', label: 'AR Balance' },
      { key: '_outstanding_balance', label: 'Outstanding Balance', derived: true },
      { key: '_gp_pct', label: 'GP%', derived: true },
    ],
  },
];

function formatCurrency(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '-';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function gpColor(pct) {
  if (pct >= 50) return '#16A34A';
  if (pct >= 30) return '#D97706';
  return '#DC2626';
}

export default function FinancialsTab({ job, onSupabaseChange }) {
  const estimate = parseFloat(job.estimate_value) || 0;
  const invoiced = parseFloat(job.invoiced_amount) || 0;
  const subCost = parseFloat(job.subcontractor_cost) || 0;
  const laborCost = parseFloat(job.labor_cost) || 0;
  const arBalance = parseFloat(job.ar_balance) || 0;
  const outstandingBalance = arBalance > 0 ? arBalance : (invoiced > 0 && !job.date_paid ? invoiced : 0);
  const gpPct = estimate > 0 ? ((estimate - subCost - laborCost) / estimate) * 100 : 0;

  const renderField = (f) => {
    if (f.key === '_outstanding_balance') {
      return (
        <div key={f.key} className="form-group">
          <label>{f.label}</label>
          <input type="text" className="form-input" value={formatCurrency(outstandingBalance)} readOnly />
        </div>
      );
    }
    if (f.key === '_gp_pct') {
      return (
        <div key={f.key} className="form-group">
          <label>{f.label}</label>
          <input
            type="text"
            className="form-input"
            value={estimate > 0 ? `${gpPct.toFixed(1)}%` : '-'}
            readOnly
            style={{ color: estimate > 0 ? gpColor(gpPct) : undefined, fontWeight: 600 }}
          />
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
  };

  return (
    <div className="financials-tab-content">
      <div className="fin-columns-grid">
        {COLUMNS.map((col) => (
          <div key={col.label} className="fin-column" style={{ borderTopColor: col.color }}>
            <div className="fin-column-header">
              <h4>{col.label}</h4>
            </div>
            <div className="fin-column-fields">
              {col.fields.map(renderField)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
