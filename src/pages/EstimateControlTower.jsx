import React, { useCallback, useMemo, useState } from 'react';
import {
  estimateTasks,
  getEstimateKPIs,
  getEstimatorLeaderboard,
  getAgingHeatmap,
  getConversionCenter,
} from '../data/estimateControlTowerMockData';
import './Page.css';
import './EstimateControlTower.css';

/* ---- CSV export helper ---- */
function downloadCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---- Follow-up mailto builder ---- */
function buildFollowUpMailto(row) {
  const subject = encodeURIComponent(
    `Follow-Up Needed: ${row.jobNumber} — ${row.customerName} (${row.agingDays}d)`
  );
  const body = encodeURIComponent(
    `Hi,\n\nPlease follow up on the estimate below:\n\n` +
    `Job: ${row.jobNumber}\n` +
    `Customer: ${row.customerName}\n` +
    `Estimate Amount: ${row.estimateValueFormatted}\n` +
    `Estimate Sent: ${row.sentFormatted}\n` +
    `Aging: ${row.agingDays} days\n\n` +
    `Customer Phone: ${row.customerPhone}\n` +
    `Customer Email: ${row.customerEmail}\n\n` +
    `Please reach out and update the status.\n\nThank you`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

function EstimateControlTower() {
  const [activeLineOfBusiness, setActiveLineOfBusiness] = useState('HB: MIT');
  const [approvalWindow, setApprovalWindow] = useState('30d');
  const [activeEstimator, setActiveEstimator] = useState(null);

  const filteredTasks = useMemo(
    () => estimateTasks.filter((t) => t.lineOfBusiness === activeLineOfBusiness),
    [activeLineOfBusiness]
  );
  const kpis = useMemo(() => getEstimateKPIs(filteredTasks), [filteredTasks]);
  const leaderboard = useMemo(() => getEstimatorLeaderboard(filteredTasks), [filteredTasks]);
  const aging = useMemo(() => getAgingHeatmap(filteredTasks), [filteredTasks]);
  const conversionCenter = useMemo(() => getConversionCenter(filteredTasks), [filteredTasks]);

  const approvalRateValue =
    approvalWindow === '60d'
      ? kpis.approvalRate.rate60
      : approvalWindow === 'YTD'
        ? kpis.approvalRate.rateYTD
        : kpis.approvalRate.rate30;

  const exportLeaderboard = useCallback(() => {
    const headers = ['Estimator', 'Open', 'Total $', 'Avg $', 'Conv %', 'FNOL to Insp', 'Insp to Est', 'Est to Close', 'Total Cycle'];
    const rows = leaderboard.map((r) => [
      r.name, r.openCount, r.totalValueFormatted, r.avgValueFormatted,
      r.conversionRate != null ? `${r.conversionRate}%` : '',
      r.avgFnolToInsp != null ? `${r.avgFnolToInsp}d` : '',
      r.avgInspToEst != null ? `${r.avgInspToEst}d` : '',
      r.avgEstToClose != null ? `${r.avgEstToClose}d` : '',
      r.avgTotalCycle != null ? `${r.avgTotalCycle}d` : '',
    ]);
    downloadCSV(`estimator-leaderboard-${activeLineOfBusiness.replace(/[: ]/g, '')}.csv`, headers, rows);
  }, [leaderboard, activeLineOfBusiness]);

  const exportConversionCenter = useCallback(() => {
    const headers = ['Job ID', 'Customer', 'Estimator', 'FNOL', 'Inspection', 'Est. Sent', 'Est. Amount', 'Aging (days)', 'Follow-Up Owner', 'Phone', 'Email'];
    const rows = conversionCenter.map((r) => [
      r.jobNumber, r.customerName, r.owner, r.fnolFormatted, r.inspectionFormatted,
      r.sentFormatted, r.estimateValueFormatted, r.agingDays, r.followUpOwner,
      r.customerPhone, r.customerEmail,
    ]);
    downloadCSV(`conversion-center-${activeLineOfBusiness.replace(/[: ]/g, '')}.csv`, headers, rows);
  }, [conversionCenter, activeLineOfBusiness]);

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

      {/* Headline KPIs */}
      <section className="ect-section-card">
        <h2 className="ect-section-title">Headline KPIs</h2>
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
      </section>

      {/* Estimate Cycle Time */}
      <section className="ect-section-card">
        <h2 className="ect-section-title">Estimate Cycle Time</h2>
        <div className="ect-cycle-flow">
        <div className="ect-cycle-segment seg-cyan">
          <span className="ect-cycle-label">FNOL to Inspection</span>
          <span className="ect-cycle-days">{kpis.fnolToInspection.avgDays}<small>d</small></span>
        </div>
        <span className="ect-cycle-arrow" />
        <div className="ect-cycle-segment seg-blue">
          <span className="ect-cycle-label">Inspection to Estimate</span>
          <span className="ect-cycle-days">{kpis.inspectionToEstimate.avgDays}<small>d</small></span>
        </div>
        <span className="ect-cycle-arrow" />
        <div className="ect-cycle-segment seg-indigo">
          <span className="ect-cycle-label">Estimate to Close</span>
          <span className="ect-cycle-days">{kpis.estimateToClose.avgDays}<small>d</small></span>
        </div>
        <span className="ect-cycle-arrow" />
        <div className="ect-cycle-segment seg-total">
          <span className="ect-cycle-label">Total Cycle</span>
          <span className="ect-cycle-days">{kpis.totalCycleTime.avgDays}<small>d</small></span>
        </div>
      </div>
      </section>

      {/* ---- Estimate Aging ---- */}
      <section className="ect-section-card">
        <h2 className="ect-section-title">Estimate Aging <span className="ect-section-subtitle">(Job Count)</span></h2>
        <div className="ect-aging">
          {aging.map((bucket) => (
            <div key={bucket.label} className={`ect-aging-bucket ${bucket.cls}`}>
              <span className="ect-aging-count">{bucket.count}</span>
              <span className="ect-aging-label">{bucket.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Estimator Leaderboard ---- */}
      <section className="ect-section-card">
          <div className="ect-section-header">
            <h2 className="ect-section-title">Estimator Leaderboard</h2>
            <button type="button" className="ect-export-btn" onClick={exportLeaderboard}>Export CSV</button>
          </div>
          <div className="ect-leaderboard-wrap">
            <table className="ect-leaderboard">
              <thead>
                <tr>
                  <th>Estimator</th>
                  <th>Open</th>
                  <th>Total $</th>
                  <th>Avg $</th>
                  <th>Conv %</th>
                  <th>FNOL to Insp</th>
                  <th>Insp to Est</th>
                  <th>Est to Close</th>
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
                    <td>{row.avgFnolToInsp != null ? `${row.avgFnolToInsp}d` : '—'}</td>
                    <td>{row.avgInspToEst != null ? `${row.avgInspToEst}d` : '—'}</td>
                    <td>{row.avgEstToClose != null ? `${row.avgEstToClose}d` : '—'}</td>
                    <td>{row.avgTotalCycle != null ? `${row.avgTotalCycle}d` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      {/* ---- Conversion Center ---- */}
      <section className="ect-section-card">
        <div className="ect-section-header">
          <h2 className="ect-section-title">Conversion Center</h2>
          <button type="button" className="ect-export-btn" onClick={exportConversionCenter}>Export CSV</button>
        </div>
        <div className="ect-leaderboard-wrap">
          <table className="ect-leaderboard ect-conversion-table">
            <thead>
              <tr className="ect-thead-group">
                <th />
                <th />
                <th />
                <th colSpan="3" className="ect-col-group-header">Key Dates</th>
                <th />
                <th />
                <th />
                <th colSpan="2" className="ect-col-group-header">Customer Contact</th>
                <th />
              </tr>
              <tr>
                <th>Job ID</th>
                <th>Customer</th>
                <th>Estimator</th>
                <th>FNOL</th>
                <th>Inspection</th>
                <th>Est. Sent</th>
                <th>Est. Amount</th>
                <th>Aging</th>
                <th>Follow-Up Owner</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {conversionCenter.map((row) => (
                <tr key={row.id}>
                  <td className="ect-lb-name">{row.jobNumber}</td>
                  <td>{row.customerName}</td>
                  <td>{row.owner}</td>
                  <td>{row.fnolFormatted}</td>
                  <td>{row.inspectionFormatted}</td>
                  <td>{row.sentFormatted}</td>
                  <td>{row.estimateValueFormatted}</td>
                  <td className={row.agingCls}>{row.agingDays}d</td>
                  <td>{row.followUpOwner}</td>
                  <td>
                    <a href={`tel:${row.customerPhone}`} className="ect-contact-btn ect-contact-phone" title={row.customerPhone}>
                      {row.customerPhone}
                    </a>
                  </td>
                  <td>
                    <a href={`mailto:${row.customerEmail}`} className="ect-contact-btn ect-contact-email" title={row.customerEmail}>
                      {row.customerEmail}
                    </a>
                  </td>
                  <td>
                    <a href={buildFollowUpMailto(row)} className="ect-remind-btn" title="Send follow-up reminder email">
                      Remind
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default EstimateControlTower;
