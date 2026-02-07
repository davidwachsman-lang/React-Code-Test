import React, { useState, useMemo } from 'react';
import './Page.css';
import './Goals.css';
import {
  usePillars,
  useKeyResults,
  useFinancialTargets,
  useInitiatives,
  useUpdateInitiative,
} from '../hooks/useGoals';

// ── Status helpers ─────────────────────────────────────────
const STATUS_COLORS = {
  on_track: '#10b981',
  at_risk: '#f59e0b',
  off_track: '#ef4444',
  not_started: '#6b7280',
  in_progress: '#3b82f6',
  complete: '#10b981',
  overdue: '#ef4444',
};

const STATUS_LABELS = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
  overdue: 'Overdue',
};

const INITIATIVE_STATUSES = ['not_started', 'in_progress', 'complete', 'at_risk', 'overdue'];
const CADENCE_LABELS = { weekly: 'W', monthly: 'M', quarterly: 'Q' };

function StatusBadge({ status, hide_not_started = false }) {
  if (hide_not_started && status === 'not_started') return null;
  const color = STATUS_COLORS[status] || '#6b7280';
  return (
    <span className="status-badge" style={{ backgroundColor: `${color}20`, color }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ── Section 1: Financial Scoreboard (card layout) ──────────
function FinancialScoreboard({ targets }) {
  const divisions = ['HB', 'IDRT', 'Total'];
  const metrics = ['Net Revenue', 'Gross Margin %', 'Contribution Margin', 'EBITDA Margin'];
  const companyTargets = (targets || []).filter((t) => t.division === 'Company');

  const getTarget = (div, metric) =>
    (targets || []).find((t) => t.division === div && t.metric_name === metric);

  return (
    <section className="goals-section">
      <h2 className="section-title">Financial Scoreboard</h2>
      <div className="scoreboard-cards">
        {divisions.map((div) => (
          <div key={div} className="scoreboard-card">
            <div className="scoreboard-card-header">{div}</div>
            <div className="scoreboard-metrics">
              {metrics.map((metric) => {
                const t = getTarget(div, metric);
                return (
                  <div key={metric} className="scoreboard-metric-row">
                    <span className="scoreboard-metric-label">{metric}</span>
                    <div className="scoreboard-metric-values">
                      <span className="scoreboard-target">{t?.target_display ?? '—'}</span>
                      {t?.actual_display && (
                        <span className="scoreboard-actual">{t.actual_display}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {companyTargets.length > 0 && (
        <div className="company-kpis">
          {companyTargets.map((t) => (
            <div key={t.id} className="company-kpi-card">
              <div className="company-kpi-label">{t.metric_name}</div>
              <div className="company-kpi-value">{t.target_display}</div>
              {t.actual_display && (
                <div className="company-kpi-actual">Actual: {t.actual_display}</div>
              )}
              <StatusBadge status={t.status} hide_not_started />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Section 2: Three-Pillar Key Results ────────────────────
function PillarKeyResults({ pillars, keyResults }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const krByPillar = useMemo(() => {
    const map = {};
    (keyResults || []).forEach((kr) => {
      const pid = kr.pillar_id;
      if (!map[pid]) map[pid] = [];
      map[pid].push(kr);
    });
    return map;
  }, [keyResults]);

  // Summary counts per pillar
  const pillarSummary = (krs) => {
    const active = krs.filter((k) => k.status !== 'not_started').length;
    const onTrack = krs.filter((k) => k.status === 'on_track').length;
    return { total: krs.length, active, onTrack };
  };

  return (
    <section className="goals-section">
      <h2 className="section-title">Key Results by Pillar</h2>
      <div className="pillar-grid">
        {(pillars || []).map((pillar) => {
          const isOpen = expanded[pillar.id] === true;
          const krs = krByPillar[pillar.id] || [];
          const summary = pillarSummary(krs);
          return (
            <div key={pillar.id} className={`pillar-card ${isOpen ? 'pillar-card--open' : ''}`}>
              <button className="pillar-header" onClick={() => toggle(pillar.id)} type="button">
                <div className="pillar-header-left">
                  <span className="pillar-chevron">{isOpen ? '▾' : '▸'}</span>
                  <h3 className="pillar-name">{pillar.name}</h3>
                </div>
                <div className="pillar-header-right">
                  <span className="pillar-count">{summary.total} KRs</span>
                  {summary.active > 0 && (
                    <span className="pillar-active">{summary.onTrack}/{summary.active} on track</span>
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="kr-list">
                  {krs.map((kr) => (
                    <div key={kr.id} className="kr-item">
                      <div className="kr-info">
                        <div className="kr-label">{kr.label}</div>
                        <div className="kr-details">
                          <span className="kr-target-val">{kr.target_value}</span>
                          {kr.actual_value && (
                            <span className="kr-actual-val">{kr.actual_value}</span>
                          )}
                          <span className="kr-cadence">{CADENCE_LABELS[kr.measurement_cadence] || kr.measurement_cadence}</span>
                        </div>
                      </div>
                      <StatusBadge status={kr.status} hide_not_started />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Section 3: Initiative Tracker (single table) ───────────
function InitiativeTracker({ initiatives, onStatusChange }) {
  const grouped = useMemo(() => {
    const map = {};
    (initiatives || []).forEach((init) => {
      const key = init.sub_objective || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(init);
    });
    return map;
  }, [initiatives]);

  const groupOrder = [
    'Cash + Margin',
    'LL & HB Operations',
    'Revenue Growth & Conversion',
    'HB Sales & Marketing',
  ];
  const sortedGroups = groupOrder.filter((g) => grouped[g]);

  return (
    <section className="goals-section">
      <h2 className="section-title">Initiative Tracker</h2>
      <div className="initiative-table-wrap">
        <table className="initiative-table">
          <thead>
            <tr>
              <th>Initiative</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Metric</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map((group) => (
              <React.Fragment key={group}>
                <tr className="initiative-group-row">
                  <td colSpan={5}>{group}</td>
                </tr>
                {grouped[group].map((init) => (
                  <tr key={init.id}>
                    <td className="init-name">{init.initiative_name}</td>
                    <td>{init.owner}</td>
                    <td className="init-due">{init.due_date}</td>
                    <td className="init-metric">{init.primary_metric || '—'}</td>
                    <td>
                      <select
                        className="init-status-select"
                        value={init.status}
                        onChange={(e) => onStatusChange(init.id, e.target.value)}
                        style={{
                          color: STATUS_COLORS[init.status] || '#6b7280',
                          borderColor: `${STATUS_COLORS[init.status] || '#6b7280'}40`,
                        }}
                      >
                        {INITIATIVE_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Main Goals Page ────────────────────────────────────────
function Goals() {
  const { data: pillars, loading: lp } = usePillars();
  const { data: keyResults, loading: lk } = useKeyResults();
  const { data: financials, loading: lf } = useFinancialTargets();
  const { data: initiatives, loading: li, refetch: refetchInit } = useInitiatives();
  const { updateInitiative } = useUpdateInitiative();

  const loading = lp || lk || lf || li;

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateInitiative(id, { status: newStatus });
      refetchInit();
    } catch (err) {
      console.error('Failed to update initiative status:', err);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>FY26 Goals</h1>
          <p>Three pillars — Ops Execution, Cash + Margin, Sales & Marketing</p>
        </div>
        <div className="status-legend">
          <span className="legend-item good">On Track</span>
          <span className="legend-item warning">At Risk</span>
          <span className="legend-item bad">Off Track</span>
        </div>
      </div>

      {loading ? (
        <div className="goals-loading">Loading...</div>
      ) : (
        <div className="goals-content">
          <FinancialScoreboard targets={financials} />
          <PillarKeyResults pillars={pillars} keyResults={keyResults} />
          <InitiativeTracker initiatives={initiatives} onStatusChange={handleStatusChange} />
        </div>
      )}
    </div>
  );
}

export default Goals;
