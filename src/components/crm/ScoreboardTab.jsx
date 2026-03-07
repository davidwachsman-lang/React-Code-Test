import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import './ScoreboardTab.css';

const SALES_REPS = ['Paige', 'Ainsley', 'Joe', 'Tony'];
const QUOTA_STORAGE_KEY = 'crm-sales-quotas';
const DEFAULT_QUOTAS = { Paige: 1700000, Tony: 15000000, Ainsley: 750000, Joe: 750000 };

function ScoreboardTab() {
  const [activityData, setActivityData] = useState([]);
  const [crmRecords, setCrmRecords] = useState([]);
  const [roiData, setRoiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quotas, setQuotas] = useState(() => {
    const saved = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_QUOTAS, ...parsed };
      } catch { /* fall through */ }
    }
    return { ...DEFAULT_QUOTAS };
  });
  const [editingQuota, setEditingQuota] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const [activityRes, crmRes, roiRes] = await Promise.all([
        supabase
          .from('activity_tracking')
          .select('*')
          .gte('week_start_date', yearStart)
          .lte('week_start_date', yearEnd),
        supabase
          .from('crm_records')
          .select('id, primary_sales_rep, relationship_stage, courting_cost, first_referral_date')
          .neq('is_deleted', true),
        supabase
          .from('crm_roi_data')
          .select('*'),
      ]);

      setActivityData(activityRes.data || []);
      setCrmRecords(crmRes.data || []);
      setRoiData(roiRes.data || []);
    } catch (error) {
      console.error('Error loading scoreboard data:', error);
    }
    setLoading(false);
  };

  const scoreboard = useMemo(() => {
    return SALES_REPS.map((rep) => {
      const repLower = rep.toLowerCase();

      // Activity tracking YTD totals
      const repActivities = activityData.filter(
        (a) => (a.sales_rep || '').toLowerCase() === repLower
      );
      const calls = repActivities.reduce((sum, a) => sum + (a.cold_calls || 0), 0);
      const insightMeetings = repActivities.reduce((sum, a) => sum + (a.insight_meetings || 0), 0);
      const referralJobs = repActivities.reduce((sum, a) => sum + (a.referral_jobs || 0), 0);

      // CRM records for this rep
      const repRecords = crmRecords.filter(
        (r) => (r.primary_sales_rep || '').toLowerCase() === repLower
      );
      const activeClients = repRecords.filter(
        (r) => r.relationship_stage === 'active_customer'
      ).length;
      const prospectiveClients = repRecords.filter(
        (r) => r.relationship_stage === 'prospect'
      ).length;

      // ROI data for this rep
      const repRoi = roiData.filter(
        (r) => (r.primary_sales_rep || '').toLowerCase() === repLower
      );
      const revenueYTD = repRoi.reduce((sum, r) => sum + (parseFloat(r.lifetime_revenue) || 0), 0);
      const costsYTD = repRecords.reduce((sum, r) => sum + (parseFloat(r.courting_cost) || 0), 0);
      const roi = costsYTD > 0 ? ((revenueYTD - costsYTD) / costsYTD) * 100 : 0;

      return {
        name: rep,
        calls,
        insightMeetings,
        referralJobs,
        activeClients,
        prospectiveClients,
        revenueYTD,
        costsYTD,
        roi,
      };
    });
  }, [activityData, crmRecords, roiData]);

  const totals = useMemo(() => {
    return scoreboard.reduce(
      (acc, row) => ({
        calls: acc.calls + row.calls,
        insightMeetings: acc.insightMeetings + row.insightMeetings,
        referralJobs: acc.referralJobs + row.referralJobs,
        activeClients: acc.activeClients + row.activeClients,
        prospectiveClients: acc.prospectiveClients + row.prospectiveClients,
        revenueYTD: acc.revenueYTD + row.revenueYTD,
        costsYTD: acc.costsYTD + row.costsYTD,
        roi: 0,
      }),
      { calls: 0, insightMeetings: 0, referralJobs: 0, activeClients: 0, prospectiveClients: 0, revenueYTD: 0, costsYTD: 0, roi: 0 }
    );
  }, [scoreboard]);

  const totalRoi = totals.costsYTD > 0 ? ((totals.revenueYTD - totals.costsYTD) / totals.costsYTD) * 100 : 0;

  const handleQuotaSave = (repName, value) => {
    const numVal = parseFloat(value) || 0;
    const updated = { ...quotas, [repName]: numVal };
    setQuotas(updated);
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(updated));
    setEditingQuota(null);
  };

  const totalQuota = SALES_REPS.reduce((sum, rep) => sum + (quotas[rep] || 0), 0);
  const totalPctToQuota = totalQuota > 0 ? (totals.revenueYTD / totalQuota) * 100 : 0;

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  const formatPct = (val) => `${val >= 0 ? '+' : ''}${val.toFixed(0)}%`;

  if (loading) {
    return (
      <div className="scoreboard-container">
        <div className="scoreboard-loading">Loading scoreboard...</div>
      </div>
    );
  }

  return (
    <div className="scoreboard-container">
      <div className="scoreboard-header">
        <h2>Sales Rep Scoreboard</h2>
        <span className="scoreboard-year">{new Date().getFullYear()} YTD</span>
      </div>
      <div className="scoreboard-table-wrapper">
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th className="col-name">Sales Rep</th>
              <th className="col-num">Calls</th>
              <th className="col-num">Insight Meetings</th>
              <th className="col-num">Referral Jobs</th>
              <th className="col-num">Active Clients</th>
              <th className="col-num">Prospects</th>
              <th className="col-currency">Revenue YTD</th>
              <th className="col-currency">Sales Quota</th>
              <th className="col-pct">% to Quota</th>
              <th className="col-currency">Costs YTD</th>
              <th className="col-pct">ROI</th>
            </tr>
          </thead>
          <tbody>
            {scoreboard.map((row) => (
              <tr key={row.name}>
                <td className="col-name">{row.name}</td>
                <td className="col-num">{row.calls.toLocaleString()}</td>
                <td className="col-num">{row.insightMeetings.toLocaleString()}</td>
                <td className="col-num">{row.referralJobs.toLocaleString()}</td>
                <td className="col-num">{row.activeClients}</td>
                <td className="col-num">{row.prospectiveClients}</td>
                <td className="col-currency">{formatCurrency(row.revenueYTD)}</td>
                <td className="col-currency col-quota" onClick={() => setEditingQuota(row.name)}>
                  {editingQuota === row.name ? (
                    <input
                      type="number"
                      className="quota-input"
                      defaultValue={quotas[row.name] || ''}
                      autoFocus
                      onBlur={(e) => handleQuotaSave(row.name, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuotaSave(row.name, e.target.value);
                        if (e.key === 'Escape') setEditingQuota(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="quota-value">{quotas[row.name] ? formatCurrency(quotas[row.name]) : 'Set quota'}</span>
                  )}
                </td>
                <td className={`col-pct ${quotas[row.name] && row.revenueYTD / quotas[row.name] >= 1 ? 'positive' : quotas[row.name] ? 'warning' : ''}`}>
                  {quotas[row.name] ? `${((row.revenueYTD / quotas[row.name]) * 100).toFixed(0)}%` : '--'}
                </td>
                <td className="col-currency">{formatCurrency(row.costsYTD)}</td>
                <td className={`col-pct ${row.roi >= 0 ? 'positive' : 'negative'}`}>
                  {row.costsYTD > 0 ? formatPct(row.roi) : '--'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="col-name">Totals</td>
              <td className="col-num">{totals.calls.toLocaleString()}</td>
              <td className="col-num">{totals.insightMeetings.toLocaleString()}</td>
              <td className="col-num">{totals.referralJobs.toLocaleString()}</td>
              <td className="col-num">{totals.activeClients}</td>
              <td className="col-num">{totals.prospectiveClients}</td>
              <td className="col-currency">{formatCurrency(totals.revenueYTD)}</td>
              <td className="col-currency">{totalQuota > 0 ? formatCurrency(totalQuota) : '--'}</td>
              <td className={`col-pct ${totalPctToQuota >= 100 ? 'positive' : totalQuota > 0 ? 'warning' : ''}`}>
                {totalQuota > 0 ? `${totalPctToQuota.toFixed(0)}%` : '--'}
              </td>
              <td className="col-currency">{formatCurrency(totals.costsYTD)}</td>
              <td className={`col-pct ${totalRoi >= 0 ? 'positive' : 'negative'}`}>
                {totals.costsYTD > 0 ? formatPct(totalRoi) : '--'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default ScoreboardTab;
