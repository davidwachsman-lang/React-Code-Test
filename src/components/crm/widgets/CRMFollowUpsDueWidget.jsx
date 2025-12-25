import React from 'react';
import { useCRMNeedingFollowup } from '../../../hooks/useCRM';
import './CRMFollowUpsDueWidget.css';

function CRMFollowUpsDueWidget({ onRecordClick }) {
  const { data: records, loading, error } = useCRMNeedingFollowup();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="crm-widget">Loading...</div>;
  if (error) return <div className="crm-widget">Error: {error}</div>;

  return (
    <div className="crm-widget crm-followups-widget">
      <h3>Follow-ups Due</h3>
      {!records || records.length === 0 ? (
        <p className="widget-empty">No follow-ups due</p>
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
              <div className="item-date">{formatDate(record.next_followup_date)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CRMFollowUpsDueWidget;

