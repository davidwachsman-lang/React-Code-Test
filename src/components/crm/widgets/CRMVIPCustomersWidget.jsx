import React from 'react';
import { useVIPCustomers } from '../../../hooks/useCRM';
import './CRMFollowUpsDueWidget.css';

function CRMVIPCustomersWidget({ onRecordClick }) {
  const { data: records, loading, error } = useVIPCustomers(10);

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) return <div className="crm-widget">Loading...</div>;
  if (error) return <div className="crm-widget">Error: {error}</div>;

  return (
    <div className="crm-widget crm-vip-widget">
      <h3>VIP Customers (Top 10)</h3>
      {!records || records.length === 0 ? (
        <p className="widget-empty">No VIP customers</p>
      ) : (
        <ul className="widget-list">
          {records.map(record => (
            <li
              key={record.id}
              className="widget-item"
              onClick={() => onRecordClick && onRecordClick(record)}
            >
              <div className="item-name">
                {record.company_name || `${record.first_name} ${record.last_name}` || 'Unnamed'}
              </div>
              <div className="item-value">{formatCurrency(record.lifetime_revenue)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CRMVIPCustomersWidget;

