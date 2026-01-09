import React, { useState, useEffect } from 'react';
import stormJobMetricsService from '../../services/stormJobMetricsService';
import './StormKPIRibbon.css';

function StormKPIRibbon({ selectedStormEventId, onKpiClick }) {
  const [kpis, setKpis] = useState({
    leads: 0,
    activeJobs: 0,
    unassignedJobs: 0,
    teamsDeployed: 0,
    equipmentOnField: 0,
    estRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const selectedEventId = selectedStormEventId || null;

  // Load KPIs when selected event changes
  useEffect(() => {
    const loadKPIs = async () => {
      try {
        setLoading(true);
        const data = await stormJobMetricsService.getAllKPIs(selectedEventId);
        setKpis(data);
      } catch (error) {
        console.error('Error loading KPIs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadKPIs();

    // Refresh periodically
    const interval = setInterval(loadKPIs, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [selectedEventId]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const kpiCards = [
    {
      id: 'leads',
      label: 'Leads',
      value: kpis.leads,
      color: 'blue',
      onClick: () => onKpiClick?.('leads', selectedEventId)
    },
    {
      id: 'activeJobs',
      label: 'Active Jobs',
      value: kpis.activeJobs,
      color: 'green',
      onClick: () => onKpiClick?.('activeJobs', selectedEventId)
    },
    {
      id: 'unassignedJobs',
      label: 'Unassigned Jobs',
      value: kpis.unassignedJobs,
      color: 'orange',
      onClick: () => onKpiClick?.('unassignedJobs', selectedEventId)
    },
    {
      id: 'teamsDeployed',
      label: 'Teams Deployed',
      value: kpis.teamsDeployed,
      color: 'purple',
      onClick: () => onKpiClick?.('teamsDeployed', selectedEventId)
    },
    {
      id: 'equipmentOnField',
      label: 'Equipment on Field',
      value: kpis.equipmentOnField,
      color: 'teal',
      onClick: () => onKpiClick?.('equipmentOnField', selectedEventId)
    },
    {
      id: 'estRevenue',
      label: 'Est. Revenue',
      value: formatCurrency(kpis.estRevenue),
      color: 'gold',
      onClick: () => onKpiClick?.('estRevenue', selectedEventId)
    }
  ];

  return (
    <div className="storm-kpi-ribbon">
      <div className="storm-kpi-header">
        <h3>Storm Metrics</h3>
      </div>
      <div className="storm-kpi-grid">
        {loading ? (
          <div className="storm-kpi-loading">Loading metrics...</div>
        ) : (
          kpiCards.map(card => (
            <div
              key={card.id}
              className={`storm-kpi-card storm-kpi-card-${card.color} ${onKpiClick ? 'clickable' : ''}`}
              onClick={card.onClick}
            >
              <div className="storm-kpi-content">
                <div className="storm-kpi-value">{card.value}</div>
                <div className="storm-kpi-label">{card.label}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StormKPIRibbon;
