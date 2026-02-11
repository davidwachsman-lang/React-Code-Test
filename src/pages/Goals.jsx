import React, { useState } from 'react';
import './Goals.css';

function Goals() {
  const [selectedQuarter] = useState('Q1 2025');

  // Company-Level Annual OKRs
  const topOkrs = [
    {
      id: 'rev',
      label: 'Revenue',
      targetLabel: '$50.0M',
      actualLabel: '$23.4M YTD',
      progressPct: 47,
      status: 'warning'
    },
    {
      id: 'gm',
      label: 'Gross Margin %',
      targetLabel: '45%',
      actualLabel: '42.1% YTD',
      progressPct: 94,
      status: 'good'
    },
    {
      id: 'ebitda',
      label: 'EBITDA',
      targetLabel: '$6.5M',
      actualLabel: '$2.9M YTD',
      progressPct: 44,
      status: 'warning'
    },
    {
      id: 'dso',
      label: 'DSO',
      targetLabel: '< 35 days',
      actualLabel: '42 days',
      progressPct: 0,
      status: 'bad'
    }
  ];

  // Department OKRs
  const departmentOkrs = [
    {
      id: 'mit',
      name: 'Mitigation',
      krs: [
        {
          label: 'Close 800 mit jobs',
          target: 'Target: 800',
          actual: 'YTD: 410 (51%)',
          status: 'warning'
        },
        {
          label: 'Mit GM% ≥ 48%',
          target: 'Target: 48%',
          actual: 'YTD: 44.7%',
          status: 'warning'
        },
        {
          label: 'Cycle time < 3.5 days',
          target: 'Target: 3.5',
          actual: 'YTD: 4.1 days',
          status: 'warning'
        }
      ]
    },
    {
      id: 'recon',
      name: 'Reconstruction',
      krs: [
        {
          label: 'Recon revenue $18M',
          target: 'Target: $18M',
          actual: 'YTD: $8.4M (47%)',
          status: 'warning'
        },
        {
          label: 'Recon GM% ≥ 40%',
          target: 'Target: 40%',
          actual: 'YTD: 37%',
          status: 'warning'
        },
        {
          label: 'Punchlist < 10 days',
          target: 'Target: 10',
          actual: 'YTD: 12.2 days',
          status: 'bad'
        }
      ]
    },
    {
      id: 'finance',
      name: 'Finance',
      krs: [
        {
          label: 'DSO < 35 days',
          target: 'Target: 35',
          actual: 'YTD: 42',
          status: 'bad'
        },
        {
          label: 'Month-end close ≤ 5 days',
          target: 'Target: 5',
          actual: 'YTD: 4.6 days',
          status: 'good'
        }
      ]
    }
  ];

  // Branch Metrics
  const branchMetrics = [
    {
      id: 'nash',
      name: 'Nashville',
      revenueYtd: '$13.2M',
      gmPct: '45%',
      dso: '38',
      status: 'good'
    },
    {
      id: 'mn',
      name: 'Minnesota',
      revenueYtd: '$7.4M',
      gmPct: '41%',
      dso: '49',
      status: 'bad'
    },
    {
      id: 'nh',
      name: 'New Hampshire',
      revenueYtd: '$2.9M',
      gmPct: '38%',
      dso: '33',
      status: 'warning'
    }
  ];

  // Daily KPIs
  const dailyKpis = [
    {
      id: 'jobs_sched',
      label: 'Jobs Scheduled Today',
      value: '37',
      subLabel: 'Target: 40',
      status: 'warning'
    },
    {
      id: 'in_progress',
      label: 'Jobs In Progress',
      value: '112',
      subLabel: 'Mit/Recon/LL mixed',
      status: 'good'
    },
    {
      id: 'behind',
      label: 'Jobs Behind',
      value: '9',
      subLabel: 'Past promised date',
      status: 'bad'
    },
    {
      id: 'emergencies',
      label: 'Emergencies (24h)',
      value: '6',
      subLabel: 'Water/Fire',
      status: 'good'
    },
    {
      id: 'missing_logs',
      label: 'Missing Moisture Logs',
      value: '14',
      subLabel: 'Need today',
      status: 'bad'
    },
    {
      id: 'idle_equip',
      label: 'Idle Equipment',
      value: '51',
      subLabel: 'Dehus/Airmovers',
      status: 'warning'
    }
  ];

  const getStatusLabel = (status) => {
    switch (status) {
      case 'good': return 'On Track';
      case 'warning': return 'At Risk';
      case 'bad': return 'Off Track';
      default: return status;
    }
  };

  return (
    <div className="precision-layout goals-page">
      <div className="precision-main">
        <header className="goals-header">
          <div className="goals-header-text">
            <h1>Goals & OKR Dashboard</h1>
            <p>Annual financial outcomes tied to operational performance across branches and service lines</p>
          </div>
          <div className="status-legend">
            <span className="legend-item good">On track</span>
            <span className="legend-item warning">At risk</span>
            <span className="legend-item bad">Off track</span>
          </div>
        </header>

        <div className="goals-content">
        {/* Company-Level OKRs */}
        <section className="okr-section">
          <h2 className="section-title">Company-Level Annual OKRs</h2>
          <div className="okr-grid">
            {topOkrs.map((okr) => (
              <div key={okr.id} className="okr-card">
                <div className="okr-header">
                  <span className="okr-label">{okr.label}</span>
                  <span className={`status-badge ${okr.status}`}>
                    {getStatusLabel(okr.status)}
                  </span>
                </div>
                <div className="okr-values">
                  <div className="okr-target">
                    Target: <strong>{okr.targetLabel}</strong>
                  </div>
                  <div className="okr-actual">
                    Actual: <strong>{okr.actualLabel}</strong>
                  </div>
                </div>
                {okr.progressPct > 0 && (
                  <>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${okr.status}`}
                        style={{ width: `${Math.min(okr.progressPct, 100)}%` }}
                      />
                    </div>
                    <div className="progress-label">{okr.progressPct}%</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Department OKRs & Branch Leaderboard */}
        <div className="middle-section">
          {/* Department OKRs */}
          <section className="department-section">
            <h2 className="section-title">Quarterly Key Results by Department</h2>
            <div className="department-grid">
              {departmentOkrs.map((dept) => (
                <div key={dept.id} className="department-card">
                  <h3 className="department-name">{dept.name}</h3>
                  <div className="kr-list">
                    {dept.krs.map((kr, idx) => (
                      <div key={`${dept.id}-${idx}`} className="kr-item">
                        <div className="kr-info">
                          <div className="kr-label">{kr.label}</div>
                          <div className="kr-details">
                            {kr.target} · {kr.actual}
                          </div>
                        </div>
                        <span className={`kr-status ${kr.status}`}>
                          {kr.status === 'good' ? 'On track' : kr.status === 'warning' ? 'Watch' : 'Off'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Branch Leaderboard */}
          <section className="branch-section">
            <div className="branch-card">
              <h3 className="branch-title">Branch Leaderboard</h3>
              <div className="branch-table">
                <div className="branch-table-header">
                  <div>Branch</div>
                  <div>Revenue YTD</div>
                  <div>GM%</div>
                  <div>DSO</div>
                  <div>Status</div>
                </div>
                {branchMetrics.map((branch) => (
                  <div key={branch.id} className="branch-table-row">
                    <div className="branch-name">{branch.name}</div>
                    <div>{branch.revenueYtd}</div>
                    <div>{branch.gmPct}</div>
                    <div>{branch.dso}</div>
                    <div>
                      <span className={`branch-status ${branch.status}`}>
                        {branch.status === 'good' ? 'Strong' : branch.status === 'warning' ? 'Mixed' : 'Needs focus'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Daily Operational KPIs */}
        <section className="kpi-section">
          <h2 className="section-title">Daily Operational KPIs</h2>
          <div className="kpi-grid">
            {dailyKpis.map((kpi) => (
              <div key={kpi.id} className="kpi-card">
                <div className="kpi-header">
                  <div className="kpi-label">{kpi.label}</div>
                  {kpi.status && (
                    <span className={`kpi-status ${kpi.status}`}>
                      {kpi.status === 'good' ? 'OK' : kpi.status === 'warning' ? 'Watch' : 'Alert'}
                    </span>
                  )}
                </div>
                <div className="kpi-value">{kpi.value}</div>
                {kpi.subLabel && <div className="kpi-sublabel">{kpi.subLabel}</div>}
              </div>
            ))}
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}

export default Goals;
