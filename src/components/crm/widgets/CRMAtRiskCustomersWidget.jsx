import React from 'react';
import { useAtRiskCustomers } from '../../../hooks/useCRM';
import './CRMFollowUpsDueWidget.css';

function CRMAtRiskCustomersWidget({ onRecordClick }) {
  const { data: records, loading, error } = useAtRiskCustomers();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <div className="crm-widget">Loading...</div>;
  if (error) return <div className="crm-widget">Error: {error}</div>;

  return (
    <div className="crm-widget crm-at-risk-widget">
      <h3>At-Risk Customers</h3>
      {!records || records.length === 0 ? (
        <p className="widget-empty">No at-risk customers</p>
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
              <div className="item-date">
                Last job: {formatDate(record.last_job_date_calculated || record.last_job_date)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CRMAtRiskCustomersWidget;

