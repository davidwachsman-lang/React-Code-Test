import React from 'react';
import { useCRM } from '../../../hooks/useCRM';
import './CRMPipelineStatsWidget.css';

function CRMPipelineStatsWidget() {
  const { data: records, loading, error } = useCRM();

  if (loading) return <div className="crm-widget">Loading...</div>;
  if (error) return <div className="crm-widget">Error: {error}</div>;

  const stats = React.useMemo(() => {
    if (!records) return { prospect: 0, active_customer: 0, inactive: 0, lost: 0 };
    return {
      prospect: records.filter(r => r.relationship_stage === 'prospect').length,
      active_customer: records.filter(r => r.relationship_stage === 'active_customer').length,
      inactive: records.filter(r => r.relationship_stage === 'inactive').length,
      lost: records.filter(r => r.relationship_stage === 'lost').length,
    };
  }, [records]);

  return (
    <div className="crm-widget crm-pipeline-stats-widget">
      <h3>Pipeline Stats</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{stats.prospect}</div>
          <div className="stat-label">Prospects</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.active_customer}</div>
          <div className="stat-label">Active Customers</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.inactive}</div>
          <div className="stat-label">Inactive</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.lost}</div>
          <div className="stat-label">Lost</div>
        </div>
      </div>
    </div>
  );
}

export default CRMPipelineStatsWidget;

