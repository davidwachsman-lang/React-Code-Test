import React from 'react';
import { useProspects } from '../hooks/useProspects';
import './PipelineStatsWidget.css';

function PipelineStatsWidget() {
  const { data: prospects, loading, error } = useProspects();

  if (loading) {
    return (
      <div className="pipeline-stats-widget">
        <h3>Pipeline Stats</h3>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pipeline-stats-widget">
        <h3>Pipeline Stats</h3>
        <p className="error">Error loading stats</p>
      </div>
    );
  }

  const stats = {
    lead: 0,
    active: 0,
    won: 0,
    lost: 0
  };

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  let wonThisMonth = 0;
  let totalValue = 0;

  (prospects || []).forEach(prospect => {
    if (stats.hasOwnProperty(prospect.status)) {
      stats[prospect.status]++;
    }
    if (prospect.status === 'won' && prospect.date_closed) {
      const closedDate = new Date(prospect.date_closed);
      if (closedDate >= thisMonth) {
        wonThisMonth++;
      }
    }
    if (prospect.estimated_job_value) {
      totalValue += parseFloat(prospect.estimated_job_value) || 0;
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="pipeline-stats-widget">
      <div className="widget-header">
        <h3>Pipeline Stats</h3>
      </div>
      <div className="widget-content">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Leads</div>
            <div className="stat-value lead">{stats.lead}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Active</div>
            <div className="stat-value active">{stats.active}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Won</div>
            <div className="stat-value won">{stats.won}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Lost</div>
            <div className="stat-value lost">{stats.lost}</div>
          </div>
        </div>
        <div className="stats-summary">
          <div className="summary-item">
            <span className="summary-label">Won This Month:</span>
            <span className="summary-value">{wonThisMonth}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Pipeline Value:</span>
            <span className="summary-value">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PipelineStatsWidget;

