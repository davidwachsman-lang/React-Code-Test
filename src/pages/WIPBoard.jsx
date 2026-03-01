import React, { useMemo, useState } from 'react';
import './Page.css';
import './WIPBoard.css';

const TEAMS = [
  { id: 'hb_mit', label: 'HB MIT', group: 'home_base', capacity: 16 },
  { id: 'hb_recon', label: 'HB RECON', group: 'home_base', capacity: 10 },
  { id: 'large_loss', label: 'Large Loss', group: 'large_loss', capacity: 8 },
];

const STAGES = [
  { id: 'pending', label: 'Pending', weight: 0.3 },
  { id: 'in_progress', label: 'WIP', weight: 0.6 },
  { id: 'ready_to_bill', label: 'Ready to Bill', weight: 0.85 },
  { id: 'ar', label: 'AR', weight: 1.0 },
  { id: 'closed', label: 'Closed', weight: 0 },
];

const FLOW_STAGES = STAGES.filter((stage) => stage.id !== 'closed');

const MOCK_JOBS = [
  { id: 'HBM-1488', team: 'hb_mit', stage: 'pending', customer: 'Adams', propertyType: 'Residential', value: 18200, aging: 6, risk: 42, pm: 'KEVIN', owner: 'GABRIEL', nextAction: 'Insurance intake validation', due: 'Mar 2' },
  { id: 'HBM-1489', team: 'hb_mit', stage: 'pending', customer: 'Keller', propertyType: 'Commercial', value: 0, aging: 3, risk: 48, pm: 'LEO', owner: 'PEDRO', nextAction: 'Estimate visit not completed', due: 'Mar 2' },
  { id: 'HBM-1491', team: 'hb_mit', stage: 'in_progress', customer: 'Morris', propertyType: 'Commercial', value: 26400, aging: 15, risk: 73, pm: 'LEO', owner: 'PEDRO', nextAction: 'Dry standard verification', due: 'Mar 3' },
  { id: 'HBM-1496', team: 'hb_mit', stage: 'ready_to_bill', customer: 'Parker', propertyType: 'Residential', value: 11900, aging: 12, risk: 64, pm: 'AARON', owner: 'JUAN', nextAction: 'Final notes and billing packet', due: 'Mar 1' },
  { id: 'HBM-1501', team: 'hb_mit', stage: 'ar', customer: 'Garner', propertyType: 'Residential', value: 9100, aging: 27, risk: 81, pm: 'KEVIN', owner: 'GABRIEL', nextAction: '2nd AR follow-up', due: 'Today' },
  { id: 'HBM-1507', team: 'hb_mit', stage: 'in_progress', customer: 'Dawson', propertyType: 'Commercial', value: 33500, aging: 4, risk: 35, pm: 'LEO', owner: 'PEDRO', nextAction: 'Scope update', due: 'Mar 4' },
  { id: 'HBR-921', team: 'hb_recon', stage: 'pending', customer: 'Henderson', propertyType: 'Residential', value: 68200, aging: 9, risk: 58, pm: 'AARON', owner: 'JUAN', nextAction: 'Material lead-time check', due: 'Mar 5' },
  { id: 'HBR-922', team: 'hb_recon', stage: 'pending', customer: 'Baker', propertyType: 'Commercial', value: 0, aging: 7, risk: 66, pm: 'KEVIN', owner: 'GABRIEL', nextAction: 'Scope approval pending', due: 'Mar 4' },
  { id: 'HBR-924', team: 'hb_recon', stage: 'in_progress', customer: 'Willis', propertyType: 'Commercial', value: 91200, aging: 22, risk: 87, pm: 'KEVIN', owner: 'GABRIEL', nextAction: 'Permit hold resolution', due: 'Today' },
  { id: 'HBR-929', team: 'hb_recon', stage: 'ready_to_bill', customer: 'Temple', propertyType: 'Commercial', value: 47400, aging: 11, risk: 61, pm: 'LEO', owner: 'PEDRO', nextAction: 'CO packet upload', due: 'Mar 2' },
  { id: 'HBR-933', team: 'hb_recon', stage: 'ar', customer: 'Porter', propertyType: 'Residential', value: 56800, aging: 34, risk: 93, pm: 'AARON', owner: 'JUAN', nextAction: '', due: '' },
  { id: 'HBR-935', team: 'hb_recon', stage: 'closed', customer: 'Casey', propertyType: 'Commercial', value: 38400, aging: 2, risk: 15, pm: 'KEVIN', owner: 'GABRIEL', nextAction: 'Closed', due: '-' },
  { id: 'LL-208', team: 'large_loss', stage: 'pending', customer: 'Windsor Plaza', propertyType: 'Commercial', value: 248000, aging: 8, risk: 55, pm: 'TONY', owner: 'FIELD A', nextAction: 'Carrier strategy call', due: 'Mar 4' },
  { id: 'LL-209', team: 'large_loss', stage: 'pending', customer: 'Brookhaven Mall', propertyType: 'Commercial', value: 0, aging: 5, risk: 62, pm: 'PAIGE', owner: 'FIELD B', nextAction: 'Estimate build in progress', due: 'Mar 3' },
  { id: 'LL-211', team: 'large_loss', stage: 'in_progress', customer: 'Crossway Towers', propertyType: 'Commercial', value: 612000, aging: 19, risk: 79, pm: 'PAIGE', owner: 'FIELD B', nextAction: 'Mold protocol signoff', due: 'Mar 2' },
  { id: 'LL-214', team: 'large_loss', stage: 'ready_to_bill', customer: 'Northbend Campus', propertyType: 'Commercial', value: 434000, aging: 16, risk: 68, pm: 'JOE', owner: 'FIELD C', nextAction: 'Executive review packet', due: 'Mar 3' },
  { id: 'LL-219', team: 'large_loss', stage: 'ar', customer: 'Riverton Medical', propertyType: 'Commercial', value: 389000, aging: 41, risk: 96, pm: 'PAIGE', owner: 'FIELD B', nextAction: 'Escalate AR call', due: 'Today' },
];

const TEAM_COLOR = {
  hb_mit: '#0f766e',
  hb_recon: '#0b4f8a',
  large_loss: '#92400e',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function riskLabel(score) {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function heatClass(avgRisk) {
  if (avgRisk >= 85) return 'heat-critical';
  if (avgRisk >= 70) return 'heat-high';
  if (avgRisk >= 50) return 'heat-medium';
  if (avgRisk > 0) return 'heat-low';
  return 'heat-empty';
}

function ProductionPipelinePage() {
  const [viewMode, setViewMode] = useState('flow');
  const [scope, setScope] = useState('all');

  const filteredJobs = useMemo(() => {
    if (scope === 'home_base') return MOCK_JOBS.filter((j) => j.team !== 'large_loss');
    if (scope === 'large_loss') return MOCK_JOBS.filter((j) => j.team === 'large_loss');
    return MOCK_JOBS;
  }, [scope]);

  const scopedTeams = useMemo(() => {
    if (scope === 'home_base') return TEAMS.filter((t) => t.group === 'home_base');
    if (scope === 'large_loss') return TEAMS.filter((t) => t.group === 'large_loss');
    return TEAMS;
  }, [scope]);

  const teamStats = useMemo(() => {
    return scopedTeams.map((team) => {
      const jobs = filteredJobs.filter((j) => j.team === team.id && j.stage !== 'closed');
      const closed = filteredJobs.filter((j) => j.team === team.id && j.stage === 'closed').length;
      const totalValue = jobs.reduce((sum, j) => sum + j.value, 0);
      const avgRisk = jobs.length ? Math.round(jobs.reduce((sum, j) => sum + j.risk, 0) / jobs.length) : 0;
      const blocked = jobs.filter((j) => j.risk >= 80 || j.aging > 28 || !j.nextAction).length;
      const utilization = Math.min(100, Math.round((jobs.length / team.capacity) * 100));
      const residential = jobs.filter((j) => j.propertyType === 'Residential').length;
      const commercial = jobs.filter((j) => j.propertyType === 'Commercial').length;
      return { team, jobs, closed, totalValue, avgRisk, blocked, utilization, residential, commercial };
    });
  }, [filteredJobs, scopedTeams]);

  const stageKpis = useMemo(() => {
    return FLOW_STAGES.map((stage) => {
      const jobs = filteredJobs.filter((j) => j.stage === stage.id);
      const count = jobs.length;
      const value = jobs.reduce((sum, j) => sum + j.value, 0);
      const noEstimateCount = stage.id === 'pending'
        ? jobs.filter((j) => !(Number(j.value) > 0)).length
        : 0;
      return { stageId: stage.id, label: stage.label, count, value, noEstimateCount };
    });
  }, [filteredJobs]);

  const pipelineKpi = useMemo(() => {
    const flowStageWeights = FLOW_STAGES.reduce((acc, stage) => {
      acc[stage.id] = stage.weight;
      return acc;
    }, {});

    const openJobs = filteredJobs.filter((job) => Object.prototype.hasOwnProperty.call(flowStageWeights, job.stage));
    const jobCount = openJobs.length;
    const totalValue = openJobs.reduce((sum, job) => sum + job.value, 0);
    const weightedValue = openJobs.reduce((sum, job) => sum + (job.value * (flowStageWeights[job.stage] || 0)), 0);

    return { totalValue, weightedValue, jobCount };
  }, [filteredJobs]);

  const matrixData = useMemo(() => {
    const map = {};
    scopedTeams.forEach((team) => {
      map[team.id] = {};
      STAGES.forEach((stage) => {
        const jobs = filteredJobs.filter((j) => j.team === team.id && j.stage === stage.id);
        const count = jobs.length;
        const value = jobs.reduce((sum, j) => sum + j.value, 0);
        const avgAging = count ? Math.round(jobs.reduce((sum, j) => sum + j.aging, 0) / count) : 0;
        const avgRisk = count ? Math.round(jobs.reduce((sum, j) => sum + j.risk, 0) / count) : 0;
        const blocked = jobs.filter((j) => j.risk >= 80 || !j.nextAction).length;
        map[team.id][stage.id] = { jobs, count, value, avgAging, avgRisk, blocked };
      });
    });
    return map;
  }, [filteredJobs, scopedTeams]);

  const attentionJobs = useMemo(() => {
    return filteredJobs
      .filter((j) => j.stage !== 'closed' && (j.risk >= 75 || j.aging > 21 || !j.nextAction))
      .sort((a, b) => (b.risk - a.risk) || (b.value - a.value))
      .slice(0, 10);
  }, [filteredJobs]);

  const flowGroups = useMemo(() => {
    return scopedTeams.map((team) => {
      const activeJobs = filteredJobs.filter((job) => job.team === team.id && job.stage !== 'closed');
      const jobCount = activeJobs.length;
      const pipelineValue = activeJobs.reduce((sum, job) => sum + job.value, 0);
      if (team.group === 'home_base') {
        return {
          id: team.id,
          title: team.label,
          subtitle: 'Home Base',
          jobCount,
          pipelineValue,
          subRows: [
            { key: `${team.id}-resi`, label: 'Residential', propertyType: 'Residential', tone: 'resi' },
            { key: `${team.id}-com`, label: 'Commercial', propertyType: 'Commercial', tone: 'com' },
          ],
        };
      }
      return {
        id: team.id,
        title: team.label,
        subtitle: 'IDRT',
        jobCount,
        pipelineValue,
        subRows: [{ key: `${team.id}-idr`, label: 'IDRT', propertyType: null, tone: 'idrt' }],
      };
    });
  }, [filteredJobs, scopedTeams]);

  const pmSections = useMemo(() => {
    return scopedTeams.map((team) => {
      const teamJobs = filteredJobs.filter((job) => job.team === team.id && job.stage !== 'closed');
      const pmMap = new Map();
      teamJobs.forEach((job) => {
        if (!pmMap.has(job.pm)) {
          pmMap.set(job.pm, { pm: job.pm, jobs: [] });
        }
        pmMap.get(job.pm).jobs.push(job);
      });

      const rows = Array.from(pmMap.values())
        .map((entry) => {
          const jobsByStage = FLOW_STAGES.reduce((acc, stage) => {
            acc[stage.id] = entry.jobs.filter((job) => job.stage === stage.id);
            return acc;
          }, {});
          const totalValue = entry.jobs.reduce((sum, job) => sum + job.value, 0);
          return { ...entry, jobsByStage, totalValue };
        })
        .sort((a, b) => b.totalValue - a.totalValue);

      return { team, rows };
    });
  }, [filteredJobs, scopedTeams]);

  return (
    <div className="page-container pipeline-page">
      <header className="pipeline-header">
        <div>
          <h1>Production Pipeline</h1>
          <p>Home Base (MIT + RECON) and Large Loss command center</p>
        </div>
        <div className="pipeline-controls">
          <div className="segmented-control" role="tablist" aria-label="Scope">
            <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>All Teams</button>
            <button className={scope === 'home_base' ? 'active' : ''} onClick={() => setScope('home_base')}>Home Base</button>
            <button className={scope === 'large_loss' ? 'active' : ''} onClick={() => setScope('large_loss')}>Large Loss</button>
          </div>
          <div className="segmented-control" role="tablist" aria-label="View mode">
            <button className={viewMode === 'flow' ? 'active' : ''} onClick={() => setViewMode('flow')}>Flow View</button>
            <button className={viewMode === 'pm' ? 'active' : ''} onClick={() => setViewMode('pm')}>PM View</button>
            <button className={viewMode === 'capacity' ? 'active' : ''} onClick={() => setViewMode('capacity')}>Capacity View</button>
          </div>
        </div>
      </header>

      <section className="kpi-strip">
        {stageKpis.map((kpi) => (
          <button key={kpi.stageId} type="button" className={`kpi-card kpi-stage kpi-${kpi.stageId}`}>
            <span className="kpi-label">{kpi.label}</span>
            <span className="kpi-value">{kpi.count}</span>
            {kpi.stageId === 'pending' ? (
              <span className="kpi-subvalue-row">
                <span className="kpi-subvalue">{formatCurrency(kpi.value)}</span>
                <span className="kpi-meta-line">
                  No Est {kpi.noEstimateCount} ({kpi.count ? Math.round((kpi.noEstimateCount / kpi.count) * 100) : 0}%)
                </span>
              </span>
            ) : (
              <span className="kpi-subvalue">{formatCurrency(kpi.value)}</span>
            )}
          </button>
        ))}
        <button type="button" className="kpi-card kpi-stage kpi-total">
          <span className="kpi-label">Pipeline Value</span>
          <span className="kpi-value-row">
            <span className="kpi-value">{formatCurrency(pipelineKpi.totalValue)}</span>
            <span className="kpi-count-pill">{pipelineKpi.jobCount} jobs</span>
          </span>
          <span className="kpi-subvalue">Weighted {formatCurrency(pipelineKpi.weightedValue)}</span>
        </button>
      </section>

      <main className="pipeline-main-grid">
        <section className="pipeline-workspace">
          {viewMode === 'flow' && (
            <div className="flow-matrix">
              <div className="flow-header-row">
                <div className="flow-team-col">Division / Segment</div>
                {FLOW_STAGES.map((stage) => (
                  <div key={stage.id} className="flow-stage-col">{stage.label}</div>
                ))}
              </div>
              {flowGroups.map((group) => (
                <section key={group.id} className="flow-group">
                  <header className="flow-group-header">
                    <h3>{group.title}</h3>
                    <div className="flow-group-metrics">
                      <span>{group.subtitle}</span>
                      <span>{group.jobCount} jobs</span>
                      <span>{formatCurrency(group.pipelineValue)}</span>
                    </div>
                  </header>
                  <div className="flow-group-rows">
                    {group.subRows.map((row) => (
                      <div className="flow-team-row flow-team-row-grouped" key={row.key}>
                        <div className={`flow-team-col flow-team-segment flow-team-segment-${row.tone}`}>
                          <strong>{row.label}</strong>
                        </div>
                        {FLOW_STAGES.map((stage) => {
                          const jobs = (matrixData[group.id][stage.id].jobs || []).filter((j) => !row.propertyType || j.propertyType === row.propertyType);
                          const count = jobs.length;
                          const value = jobs.reduce((sum, j) => sum + j.value, 0);
                          const avgAging = count ? Math.round(jobs.reduce((sum, j) => sum + j.aging, 0) / count) : 0;
                          const avgRisk = count ? Math.round(jobs.reduce((sum, j) => sum + j.risk, 0) / count) : 0;
                          const noEstimateCount = jobs.filter((j) => !(Number(j.value) > 0)).length;
                          const estimatedValue = jobs.filter((j) => Number(j.value) > 0).reduce((sum, j) => sum + j.value, 0);
                          return (
                            <div key={stage.id} className={`flow-cell ${heatClass(avgRisk)}`}>
                              <div className="flow-count">{count}</div>
                              {stage.id === 'pending' ? (
                                <>
                                  <div className="flow-value">Est {formatCurrency(estimatedValue)}</div>
                                  <div className="flow-meta flow-meta-alert">No Est {noEstimateCount}</div>
                                </>
                              ) : (
                                <div className="flow-value">{formatCurrency(value)}</div>
                              )}
                              <div className="flow-meta">{avgAging ? `${avgAging}d avg` : '-'}</div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {viewMode === 'pm' && (
            <div className="pm-table-wrap">
              <table className="pm-table">
                <thead>
                  <tr>
                    <th>PM</th>
                    <th>Active</th>
                    <th>Total Value</th>
                    {FLOW_STAGES.map((stage) => (
                      <th key={stage.id}>{stage.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pmSections.map((section) => (
                    <React.Fragment key={section.team.id}>
                      <tr className="pm-section-row">
                        <td colSpan={4 + FLOW_STAGES.length}>{section.team.label}</td>
                      </tr>
                      {section.rows.length === 0 && (
                        <tr className="pm-empty-row">
                          <td colSpan={4 + FLOW_STAGES.length}>No active PM workload in this division.</td>
                        </tr>
                      )}
                      {section.rows.map((row) => (
                        <tr key={`${section.team.id}-${row.pm}`}>
                          <td className="pm-name">{row.pm}</td>
                          <td>{row.jobs.length}</td>
                          <td>{formatCurrency(row.totalValue)}</td>
                          {FLOW_STAGES.map((stage) => {
                            const jobs = row.jobsByStage[stage.id] || [];
                            const count = jobs.length;
                            const value = jobs.reduce((sum, j) => sum + j.value, 0);
                            const avgAging = count ? Math.round(jobs.reduce((sum, j) => sum + j.aging, 0) / count) : 0;
                            const avgRisk = count ? Math.round(jobs.reduce((sum, j) => sum + j.risk, 0) / count) : 0;
                            const noEstimateCount = jobs.filter((j) => !(Number(j.value) > 0)).length;
                            const estimatedValue = jobs.filter((j) => Number(j.value) > 0).reduce((sum, j) => sum + j.value, 0);
                            const noEstimatePct = count ? Math.round((noEstimateCount / count) * 100) : 0;
                            const riskClass = `pm-stage-risk-${riskLabel(avgRisk)}`;
                            return (
                              <td key={stage.id} className={`pm-stage-cell ${riskClass}`}>
                                {stage.id === 'pending' ? (
                                  <div className="pm-stage-line">
                                    <span>{count}</span>
                                    <span>{formatCurrency(estimatedValue)}</span>
                                    <span className="pm-stage-sub-alert">No Est {noEstimateCount} ({noEstimatePct}%)</span>
                                    <span>{avgAging ? `${avgAging}d` : '-'}</span>
                                  </div>
                                ) : (
                                  <div className="pm-stage-line">
                                    <span>{count}</span>
                                    <span>{formatCurrency(value)}</span>
                                    <span>{avgAging ? `${avgAging}d` : '-'}</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'capacity' && (
            <div className="capacity-grid">
              {teamStats.map((bucket) => (
                <article key={bucket.team.id} className="capacity-card" style={{ borderTopColor: TEAM_COLOR[bucket.team.id] }}>
                  <h3>{bucket.team.label}</h3>
                  <div className="capacity-line">
                    <span>Utilization</span>
                    <strong>{bucket.utilization}%</strong>
                  </div>
                  <div className="capacity-bar">
                    <div className="capacity-fill" style={{ width: `${bucket.utilization}%` }} />
                  </div>
                  <div className="capacity-metrics">
                    <div><span>Active</span><strong>{bucket.jobs.length}</strong></div>
                    <div><span>Closed</span><strong>{bucket.closed}</strong></div>
                    <div><span>Blocked</span><strong>{bucket.blocked}</strong></div>
                    <div><span>Avg Risk</span><strong>{bucket.avgRisk}</strong></div>
                    <div><span>Value</span><strong>{formatCurrency(bucket.totalValue)}</strong></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="attention-panel">
          <div className="attention-header">
            <h3>Needs Attention</h3>
            <span>{attentionJobs.length} jobs</span>
          </div>
          <div className="attention-list">
            {attentionJobs.length === 0 && <p className="attention-empty">No high-risk jobs in scope.</p>}
            {attentionJobs.map((job) => (
              <article key={job.id} className="attention-item">
                <div className="attention-top">
                  <strong>{job.id}</strong>
                  <span className={`risk-tag ${riskLabel(job.risk)}`}>Risk {job.risk}</span>
                </div>
                <div className="attention-mid">{job.customer}</div>
                <div className="attention-sub">
                  <span>{TEAMS.find((t) => t.id === job.team)?.label}</span>
                  <span>{formatCurrency(job.value)}</span>
                  <span>{job.aging}d</span>
                </div>
                <div className="attention-next">
                  {job.nextAction || 'Missing next action'}
                  {job.due ? ` · Due ${job.due}` : ''}
                </div>
              </article>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default ProductionPipelinePage;
