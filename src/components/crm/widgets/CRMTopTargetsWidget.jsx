import React from 'react';
import { useTopTargets } from '../../../hooks/useCRM';
import './CRMFollowUpsDueWidget.css';

function CRMTopTargetsWidget({ onRecordClick }) {
  const { data: records, loading, error } = useTopTargets();

  if (loading) return <div className="crm-widget">Loading...</div>;
  if (error) return <div className="crm-widget">Error: {error}</div>;

  return (
    <div className="crm-widget crm-top-targets-widget">
      <h3>Top Targets</h3>
      {!records || records.length === 0 ? (
        <p className="widget-empty">No top targets</p>
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
              <div className="item-stage">{record.relationship_stage}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CRMTopTargetsWidget;

