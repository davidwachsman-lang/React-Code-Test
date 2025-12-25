import React from 'react';
import { useTopTargets } from '../hooks/useProspects';
import './TopTargetsWidget.css';

function TopTargetsWidget({ onProspectClick }) {
  const { data: targets, loading, error } = useTopTargets();

  if (loading) {
    return (
      <div className="top-targets-widget">
        <h3>Top 10 Targets</h3>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="top-targets-widget">
        <h3>Top 10 Targets</h3>
        <p className="error">Error loading targets</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'won':
        return '#10b981';
      case 'active':
        return '#3b82f6';
      case 'lead':
        return '#f59e0b';
      case 'lost':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="top-targets-widget">
      <div className="widget-header">
        <h3>Top 10 Targets</h3>
        <span className="widget-count">{(targets || []).length}</span>
      </div>
      <div className="widget-content">
        {targets && targets.length > 0 ? (
          <div className="targets-list">
            {targets.map((target, index) => (
              <div
                key={target.id}
                className="target-item"
                onClick={() => onProspectClick && onProspectClick(target)}
              >
                <div className="target-rank">{index + 1}</div>
                <div className="target-info">
                  <div className="target-header">
                    <span className="target-company">{target.company_name || 'Unnamed'}</span>
                    <span
                      className="target-status"
                      style={{ backgroundColor: getStatusColor(target.status) }}
                    >
                      {target.status}
                    </span>
                  </div>
                  <div className="target-details">
                    <span className="target-contact">{target.first_name} {target.last_name}</span>
                    {target.estimated_job_value && (
                      <span className="target-value">
                        ${target.estimated_job_value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-targets">
            <p>No top 10 targets set</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TopTargetsWidget;

