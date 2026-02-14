import React, { useMemo, useState } from 'react';
import {
  estimateTasks,
  getEstimateKPIs,
  getPipelineFunnel,
  getEstimatorLeaderboard,
  getAgingHeatmap,
} from '../data/estimateControlTowerMockData';
import './Page.css';
import './EstimateControlTower.css';

const FUNNEL_COLORS = {
  Draft: '#3b82f6',
  Sent: '#60a5fa',
  'Follow-Up Needed': '#f59e0b',
  Approved: '#22c55e',
  Declined: '#ef4444',
  Expired: '#64748b',
};

function EstimateControlTower() {
  const [activeLineOfBusiness, setActiveLineOfBusiness] = useState('HB: MIT');
  const [approvalWindow, setApprovalWindow] = useState('30d');
  const [activeFunnelStage, setActiveFunnelStage] = useState(null);
  const [activeEstimator, setActiveEstimator] = useState(null);

  const filteredTasks = useMemo(
    () => estimateTasks.filter((t) => t.lineOfBusiness === activeLineOfBusiness),
    [activeLineOfBusiness]
  );
  const kpis = useMemo(() => getEstimateKPIs(filteredTasks), [filteredTasks]);
  const funnel = useMemo(() => getPipelineFunnel(filteredTasks), [filteredTasks]);
  const leaderboard = useMemo(() => getEstimatorLeaderboard(filteredTasks), [filteredTasks]);
  const aging = useMemo(() => getAgingHeatmap(filteredTasks), [filteredTasks]);

  const approvalRateValue =
    approvalWindow === '60d'
      ? kpis.approvalRate.rate60
      : approvalWindow === 'YTD'
        ? kpis.approvalRate.rateYTD
        : kpis.approvalRate.rate30;

  const maxFunnelCount = Math.max(...funnel.map((s) => s.count), 1);

  return (
    <div className="page-container ect-page">
      {/* Header */}
      <div className="ect-header">
        <div>
          <h1>Estimate Control Tower</h1>
          <p>Track estimate pipeline health, cycle times, and conversion metrics.</p>
        </div>
        <div className="ect-lob-toggle">
          {['HB: MIT', 'HB: RECON', 'LL'].map((lob) => (
            <button
              key={lob}
              type="button"
              className={activeLineOfBusiness === lob ? 'active' : ''}
              onClick={() => setActiveLineOfBusiness(lob)}
            >
              {lob}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Ribbon — Row 1 */}
      <div className="ect-kpi-row ect-kpi-row-5">
        <div className="ect-kpi-card accent-red">
          <span className="ect-kpi-label">Pending Jobs w/o Estimates</span>
          <span className="ect-kpi-value">{kpis.pendingNoEstimate.count}</span>
        </div>
        <div className="ect-kpi-card accent-slate">
          <span className="ect-kpi-label">Total Open Estimates</span>
          <span className="ect-kpi-value">{kpis.totalOpen.count}</span>
          <span className="ect-kpi-subtitle">{kpis.totalOpen.dollarFormatted}</span>
        </div>
        <div className="ect-kpi-card accent-green">
          <span className="ect-kpi-label">Avg. Estimate $</span>
          <span className="ect-kpi-value">{kpis.avgEstimateDollar.formatted}</span>
        </div>
        <div className="ect-kpi-card accent-amber">
          <span className="ect-kpi-label">Conversion Rate</span>
          <span className="ect-kpi-value">{approvalRateValue}%</span>
          <div className="ect-kpi-toggle">
            {['30d', '60d', 'YTD'].map((label) => (
              <button
                key={label}
                type="button"
                className={approvalWindow === label ? 'active' : ''}
                onClick={() => setApprovalWindow(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="ect-kpi-card accent-red">
          <span className="ect-kpi-label">No Follow-Up Scheduled</span>
          <span className="ect-kpi-value">{kpis.noFollowUp.count}</span>
        </div>
      </div>

      {/* KPI Ribbon — Row 2 */}
      <div className="ect-kpi-row ect-kpi-row-3">
        <div className="ect-kpi-card accent-blue">
          <span className="ect-kpi-label">FNOL to Estimate</span>
          <span className="ect-kpi-value">{kpis.fnolToEstimate.avgDays}d</span>
          <span className="ect-kpi-subtitle">avg days</span>
        </div>
        <div className="ect-kpi-card accent-blue">
          <span className="ect-kpi-label">Estimate to Conversion</span>
          <span className="ect-kpi-value">{kpis.estimateToApproval.avgDays}d</span>
          <span className="ect-kpi-subtitle">avg days</span>
        </div>
        <div className="ect-kpi-card accent-purple">
          <span className="ect-kpi-label">Total Estimate Cycle Time</span>
          <span className="ect-kpi-value">{kpis.totalCycleTime.avgDays}d</span>
          <span className="ect-kpi-subtitle">FNOL to Conversion</span>
        </div>
      </div>

      {/* ---- Pipeline Funnel ---- */}
      <section className="ect-section-card">
        <h2 className="ect-section-title">Pipeline Funnel</h2>
        <div className="ect-funnel">
          {funnel.map((stage) => {
            const pct = maxFunnelCount > 0 ? (stage.count / maxFunnelCount) * 100 : 0;
            const color = FUNNEL_COLORS[stage.stage] || '#64748b';
            const isActive = activeFunnelStage === stage.stage;
            return (
              <button
                key={stage.stage}
                type="button"
                className={`ect-funnel-row ${isActive ? 'active' : ''}`}
                onClick={() => setActiveFunnelStage(isActive ? null : stage.stage)}
              >
                <span className="ect-funnel-label">{stage.stage}</span>
                <div className="ect-funnel-bar-track">
                  <div
                    className="ect-funnel-bar-fill"
                    style={{ width: `${Math.max(pct, 6)}%`, background: color }}
                  />
                </div>
                <span className="ect-funnel-count">{stage.count}</span>
                <span className="ect-funnel-dollar">{stage.dollarFormatted}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- Bottom grid: Leaderboard + Heatmap ---- */}
      <div className="ect-bottom-grid">
        {/* Estimator Leaderboard */}
        <section className="ect-section-card">
          <h2 className="ect-section-title">Estimator Leaderboard</h2>
          <div className="ect-leaderboard-wrap">
            <table className="ect-leaderboard">
              <thead>
                <tr>
                  <th>Estimator</th>
                  <th>Open</th>
                  <th>Total $</th>
                  <th>Avg $</th>
                  <th>Conv %</th>
                  <th>FNOL to Est</th>
                  <th>Est to Conv</th>
                  <th>Total Cycle</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr
                    key={row.name}
                    className={activeEstimator === row.name ? 'active' : ''}
                    onClick={() =>
                      setActiveEstimator(activeEstimator === row.name ? null : row.name)
                    }
                  >
                    <td className="ect-lb-name">{row.name}</td>
                    <td>{row.openCount}</td>
                    <td>{row.totalValueFormatted}</td>
                    <td>{row.avgValueFormatted}</td>
                    <td>{row.conversionRate != null ? `${row.conversionRate}%` : '—'}</td>
                    <td>{row.avgFnolToEstimate != null ? `${row.avgFnolToEstimate}d` : '—'}</td>
                    <td>{row.avgEstToConversion != null ? `${row.avgEstToConversion}d` : '—'}</td>
                    <td>{row.avgTotalCycle != null ? `${row.avgTotalCycle}d` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Aging Heatmap */}
        <section className="ect-section-card">
          <h2 className="ect-section-title">Estimate Aging</h2>
          <div className="ect-aging">
            {aging.map((bucket) => (
              <div key={bucket.label} className={`ect-aging-bucket ${bucket.cls}`}>
                <span className="ect-aging-count">{bucket.count}</span>
                <span className="ect-aging-label">{bucket.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default EstimateControlTower;
