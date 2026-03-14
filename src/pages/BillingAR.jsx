import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageWrapper from '../components/PageWrapper';
import ARFilters from '../components/billing/ARFilters';
import LogContactModal from '../components/billing/LogContactModal';
import billingARService, { calcKPIs, calcAgingBuckets, calcDaysOutstanding } from '../services/billingARService';
import {
  buildCustomerReminderMailto,
  buildAdjusterFollowUpMailto,
  buildEscalationMailto,
  buildBulkReminderMailto,
  buildBulkAdjusterMailto,
} from '../utils/arEmailTemplates';
import './BillingAR.css';

/* ---- Helpers ---- */
function fmtCurrency(val) {
  return '$' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function agingClass(days) {
  if (days <= 30) return 'bar-aging-green';
  if (days <= 60) return 'bar-aging-yellow';
  if (days <= 90) return 'bar-aging-orange';
  return 'bar-aging-red';
}

const DIVISION_COLORS = {
  'HB Nashville': { bg: '#DBEAFE', text: '#2563EB' },
  'Large Loss':   { bg: '#FEF3C7', text: '#D97706' },
};

/* ---- Sort helper ---- */
function sortJobs(jobs, sortCol, sortDir) {
  return [...jobs].sort((a, b) => {
    let aVal = a[sortCol];
    let bVal = b[sortCol];
    // Numeric columns
    if (['ar_balance', 'invoiced_amount', 'days_outstanding'].includes(sortCol)) {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    }
    // String columns
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

/* ==================================================================
   BillingAR Page
   ================================================================== */
function BillingAR() {
  /* ---- State ---- */
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({ division: '', pm: '', status: '', agingBucket: null });
  const [sortCol, setSortCol] = useState('ar_balance');
  const [sortDir, setSortDir] = useState('desc');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [expandedActivities, setExpandedActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const [logContactJob, setLogContactJob] = useState(null);
  const [confirmPayJob, setConfirmPayJob] = useState(null);

  /* ---- Fetch data ---- */
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await billingARService.getOutstandingAR();
      // Enrich with days_outstanding
      const enriched = data.map(j => ({
        ...j,
        days_outstanding: calcDaysOutstanding(j.date_invoiced),
      }));
      setJobs(enriched);
    } catch (err) {
      console.error('Failed to load AR data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  /* ---- DEV: inject dummy jobs for testing emails ---- */
  const TEST_JOBS = [
    {
      id: 'test-001', job_number: 'TEST-4821', division: 'HB Nashville', pm: 'John Taylor',
      status: 'Invoiced', invoiced_amount: 12400, ar_balance: 8200, date_invoiced: '2026-01-15',
      estimate_value: 14800, insurance_company: 'State Farm', insurance_adjuster_name: 'Mike Reynolds',
      insurance_adjuster_email: 'mike.reynolds@statefarm-test.com',
      date_of_loss: '2025-12-02', customer_name: 'Sarah Johnson',
      customer_email: 'sarah.johnson@example.com', customer_phone: '(615) 555-0142',
      billing_contact: 'Sarah Johnson',
      property_address: '1234 Oak Hill Dr, Nashville, TN 37205',
    },
    {
      id: 'test-002', job_number: 'TEST-4822', division: 'Large Loss', pm: 'Emily Mason',
      status: 'Invoiced', invoiced_amount: 87500, ar_balance: 87500, date_invoiced: '2025-11-10',
      estimate_value: 92000, insurance_company: 'Allstate', insurance_adjuster_name: 'Karen Webb',
      insurance_adjuster_email: 'karen.webb@allstate-test.com',
      date_of_loss: '2025-10-18', customer_name: 'Thompson Commercial LLC',
      customer_email: 'ap@thompson-test.com', customer_phone: '(615) 555-0299',
      billing_contact: 'David Thompson',
      property_address: '5600 Commerce Blvd, Brentwood, TN 37027',
    },
    {
      id: 'test-003', job_number: 'TEST-4823', division: 'HB Nashville', pm: 'John Taylor',
      status: 'Invoiced', invoiced_amount: 4800, ar_balance: 4800, date_invoiced: '2026-02-20',
      estimate_value: 5200, insurance_company: 'USAA', insurance_adjuster_name: 'Tom Bradley',
      insurance_adjuster_email: 'tom.bradley@usaa-test.com',
      date_of_loss: '2026-02-01', customer_name: 'Marcus Greene',
      customer_email: 'mgreene@example.com', customer_phone: '(615) 555-0187',
      billing_contact: 'Marcus Greene',
      property_address: '789 Elm St, Nashville, TN 37206',
    },
    {
      id: 'test-004', job_number: 'TEST-4824', division: 'Large Loss', pm: 'Emily Mason',
      status: 'Invoiced', invoiced_amount: 134000, ar_balance: 67000, date_invoiced: '2025-09-05',
      estimate_value: 145000, insurance_company: 'Travelers', insurance_adjuster_name: 'Lisa Chen',
      insurance_adjuster_email: 'lisa.chen@travelers-test.com',
      date_of_loss: '2025-08-12', customer_name: 'Riverside Church',
      customer_email: 'admin@riverside-test.com', customer_phone: '(615) 555-0341',
      billing_contact: 'Pastor James Walker',
      property_address: '2100 River Rd, Hendersonville, TN 37075',
    },
    {
      id: 'test-005', job_number: 'TEST-4825', division: 'HB Nashville', pm: 'John Taylor',
      status: 'Invoiced', invoiced_amount: 9600, ar_balance: 3200, date_invoiced: '2026-01-28',
      estimate_value: 10400, insurance_company: 'Erie Insurance', insurance_adjuster_name: 'Pat Sullivan',
      insurance_adjuster_email: '',
      date_of_loss: '2026-01-10', customer_name: 'Linda Patel',
      customer_email: 'linda.patel@example.com', customer_phone: '(615) 555-0078',
      billing_contact: 'Linda Patel',
      property_address: '456 Maple Ln, Franklin, TN 37064',
    },
  ];

  const addTestJobs = () => {
    setJobs(prev => {
      const existingIds = new Set(prev.map(j => j.id));
      const newJobs = TEST_JOBS
        .filter(j => !existingIds.has(j.id))
        .map(j => ({
          ...j,
          external_job_number: null, date_paid: null, stage: null,
          date_received: null, date_started: null, customer_id: null,
          property_city: '', property_state: '',
          display_job_number: j.job_number,
          assigned_pm_display: j.pm,
          days_outstanding: calcDaysOutstanding(j.date_invoiced),
        }));
      return [...newJobs, ...prev];
    });
  };

  /* ---- Expand row → load activities ---- */
  const toggleExpand = useCallback(async (jobId) => {
    if (expandedId === jobId) {
      setExpandedId(null);
      setExpandedActivities([]);
      return;
    }
    setExpandedId(jobId);
    setLoadingActivities(true);
    try {
      const acts = await billingARService.getCollectionActivities(jobId);
      setExpandedActivities(acts);
    } catch {
      setExpandedActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, [expandedId]);

  /* ---- KPIs & Aging (computed from all jobs, pre-filter) ---- */
  const kpis = useMemo(() => calcKPIs(jobs), [jobs]);
  const agingBuckets = useMemo(() => calcAgingBuckets(jobs), [jobs]);

  /* ---- PM options for filter ---- */
  const pmOptions = useMemo(() => {
    const pms = new Set();
    jobs.forEach(j => {
      const pm = j.pm;
      if (pm) pms.add(pm);
    });
    return [...pms].sort();
  }, [jobs]);

  /* ---- Filtered + sorted jobs ---- */
  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (filters.division) {
      result = result.filter(j => j.division === filters.division);
    }
    if (filters.pm) {
      result = result.filter(j => (j.pm) === filters.pm);
    }
    if (filters.status) {
      result = result.filter(j => j.status === filters.status);
    }
    if (filters.agingBucket !== null) {
      const bucket = agingBuckets[filters.agingBucket];
      if (bucket) {
        result = result.filter(j => j.days_outstanding >= bucket.min && j.days_outstanding <= bucket.max);
      }
    }
    return sortJobs(result, sortCol, sortDir);
  }, [jobs, filters, agingBuckets, sortCol, sortDir]);

  /* ---- Handlers ---- */
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ division: '', pm: '', status: '', agingBucket: null });
  };

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir(col === 'ar_balance' || col === 'days_outstanding' ? 'desc' : 'asc');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredJobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredJobs.map(j => j.id)));
    }
  };

  const handleAgingClick = (index) => {
    setFilters(prev => ({
      ...prev,
      agingBucket: prev.agingBucket === index ? null : index,
    }));
  };

  const handleMarkPaid = async () => {
    if (!confirmPayJob) return;
    try {
      await billingARService.markJobPaid(confirmPayJob.id);
      setConfirmPayJob(null);
      setJobs(prev => prev.filter(j => j.id !== confirmPayJob.id));
    } catch (err) {
      console.error('Failed to mark paid:', err);
    }
  };

  const handleLogContact = async (jobId, data) => {
    await billingARService.logCollectionActivity(jobId, data);
    // Refresh activities if this job is expanded
    if (expandedId === jobId) {
      const acts = await billingARService.getCollectionActivities(jobId);
      setExpandedActivities(acts);
    }
  };

  const sortArrow = (col) => {
    if (sortCol !== col) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const selectedJobs = filteredJobs.filter(j => selectedIds.has(j.id));

  /* ---- Render ---- */
  return (
    <PageWrapper>
      <div className="billing-ar-page">
        {/* Header */}
        <div className="billing-ar-header">
          <div>
            <h1>Billing & AR</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={addTestJobs}
              style={{
                padding: '8px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)', color: '#FCD34D', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              + Test Job
            </button>
          </div>
        </div>

        {/* KPI Ribbon */}
        <div className="bar-kpi-row">
          <div className="bar-kpi-card accent-purple">
            <span className="bar-kpi-label">Total AR Outstanding</span>
            <span className="bar-kpi-value">{fmtCurrency(kpis.totalAR)}</span>
          </div>
          <div className="bar-kpi-card accent-blue">
            <span className="bar-kpi-label">HB Nashville AR</span>
            <span className="bar-kpi-value">{fmtCurrency(kpis.arByDivision['HB Nashville'] || 0)}</span>
          </div>
          <div className="bar-kpi-card accent-amber">
            <span className="bar-kpi-label">Large Loss AR</span>
            <span className="bar-kpi-value">{fmtCurrency(kpis.arByDivision['Large Loss'] || 0)}</span>
          </div>
          <div className="bar-kpi-card accent-purple">
            <span className="bar-kpi-label">Avg AR Days</span>
            <span className="bar-kpi-value">{kpis.avgARDays}<small> days</small></span>
          </div>
          <div className="bar-kpi-card accent-red">
            <span className="bar-kpi-label">Jobs &gt; 90 Days</span>
            <span className="bar-kpi-value">{kpis.jobsOver90}</span>
          </div>
        </div>

        {/* Aging Heatmap */}
        <div className="bar-aging-row">
          {agingBuckets.map((bucket, i) => (
            <button
              key={bucket.label}
              type="button"
              className={`bar-aging-bucket ${bucket.cls}${filters.agingBucket === i ? ' active' : ''}`}
              onClick={() => handleAgingClick(i)}
            >
              <span className="bar-aging-count">{bucket.count}</span>
              <span className="bar-aging-dollars">{fmtCurrency(bucket.dollars)}</span>
              <span className="bar-aging-label">{bucket.label}</span>
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <ARFilters
          filters={filters}
          pmOptions={pmOptions}
          onFilterChange={handleFilterChange}
          onClear={clearFilters}
        />

        {/* Loading / Error / Empty */}
        {loading && (
          <div className="bar-state-msg">Loading AR data...</div>
        )}
        {error && (
          <div className="bar-state-msg bar-state-error">Error: {error}</div>
        )}
        {!loading && !error && filteredJobs.length === 0 && (
          <div className="billing-ar-empty">
            <span className="billing-ar-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </span>
            <h3>No Outstanding AR</h3>
            <p>{jobs.length > 0 ? 'No jobs match the current filters.' : 'All invoices are paid. Great work!'}</p>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bar-bulk-actions">
            <span className="bar-bulk-count">{selectedIds.size} job{selectedIds.size > 1 ? 's' : ''} selected</span>
            <a
              href={buildBulkReminderMailto(selectedJobs)}
              className="bar-bulk-email-btn"
            >
              Email Customers
            </a>
            <a
              href={buildBulkAdjusterMailto(selectedJobs)}
              className="bar-bulk-email-btn bar-bulk-email-adj"
            >
              Email Adjusters
            </a>
          </div>
        )}

        {/* AR Job Table */}
        {!loading && !error && filteredJobs.length > 0 && (
          <div className="bar-table-wrap">
            <table className="bar-table">
              <thead>
                <tr>
                  <th className="bar-th-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredJobs.length && filteredJobs.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="bar-th-sortable" onClick={() => handleSort('display_job_number')}>
                    Job #{sortArrow('display_job_number')}
                  </th>
                  <th className="bar-th-sortable" onClick={() => handleSort('customer_name')}>
                    Customer{sortArrow('customer_name')}
                  </th>
                  <th className="bar-th-sortable" onClick={() => handleSort('division')}>
                    Division{sortArrow('division')}
                  </th>
                  <th className="bar-th-sortable" onClick={() => handleSort('assigned_pm_display')}>
                    PM{sortArrow('assigned_pm_display')}
                  </th>
                  <th className="bar-th-sortable" onClick={() => handleSort('invoiced_amount')}>
                    Invoiced{sortArrow('invoiced_amount')}
                  </th>
                  <th className="bar-th-sortable" onClick={() => handleSort('ar_balance')}>
                    AR Balance{sortArrow('ar_balance')}
                  </th>
                  <th className="bar-th-sortable" onClick={() => handleSort('days_outstanding')}>
                    Days Out{sortArrow('days_outstanding')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => {
                  const days = job.days_outstanding;
                  const isExpanded = expandedId === job.id;
                  return (
                    <React.Fragment key={job.id}>
                      <tr
                        className={`bar-row${isExpanded ? ' expanded' : ''}`}
                        onClick={() => toggleExpand(job.id)}
                      >
                        <td className="bar-td-check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(job.id)}
                            onChange={() => toggleSelect(job.id)}
                          />
                        </td>
                        <td className="bar-job-number">{job.display_job_number}</td>
                        <td>{job.customer_name}</td>
                        <td>
                          {job.division ? (
                            <span
                              className="bar-pill"
                              style={{
                                background: (DIVISION_COLORS[job.division] || { bg: '#F1F5F9' }).bg,
                                color: (DIVISION_COLORS[job.division] || { text: '#64748B' }).text,
                              }}
                            >
                              {job.division}
                            </span>
                          ) : '—'}
                        </td>
                        <td>{job.assigned_pm_display}</td>
                        <td>{fmtCurrency(job.invoiced_amount)}</td>
                        <td className={days > 90 ? 'bar-balance-overdue' : 'bar-balance'}>
                          {fmtCurrency(job.ar_balance)}
                        </td>
                        <td>
                          <span className={`bar-days ${agingClass(days)}`}>{days}d</span>
                        </td>
                        <td className="bar-actions" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={days > 90 ? buildEscalationMailto(job) : buildCustomerReminderMailto(job)}
                            className="bar-action-btn"
                            title="Email Customer"
                          >
                            📧
                          </a>
                          <a
                            href={buildAdjusterFollowUpMailto(job)}
                            className="bar-action-btn"
                            title="Email Adjuster"
                          >
                            📧
                          </a>
                          <button
                            type="button"
                            className="bar-action-btn"
                            title="Log Contact"
                            onClick={() => setLogContactJob(job)}
                          >
                            📝
                          </button>
                          <button
                            type="button"
                            className="bar-action-btn bar-action-paid"
                            title="Mark Paid"
                            onClick={() => setConfirmPayJob(job)}
                          >
                            ✅
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr className="bar-expanded-row">
                          <td colSpan={9}>
                            <div className="bar-detail-panel">
                              <div className="bar-detail-grid">
                                <div className="bar-detail-item">
                                  <span className="bar-detail-label">Address</span>
                                  <span>{job.property_address}</span>
                                </div>
                                <div className="bar-detail-item">
                                  <span className="bar-detail-label">Billing Contact</span>
                                  <span>{job.billing_contact || job.customer_name}</span>
                                </div>
                                <div className="bar-detail-item">
                                  <span className="bar-detail-label">Email</span>
                                  <span>{job.customer_email || '—'}</span>
                                </div>
                                <div className="bar-detail-item">
                                  <span className="bar-detail-label">Phone</span>
                                  <span>{job.customer_phone || '—'}</span>
                                </div>
                                <div className="bar-detail-item">
                                  <span className="bar-detail-label">Estimate Value</span>
                                  <span>{fmtCurrency(job.estimate_value)}</span>
                                </div>
                                <div className="bar-detail-item">
                                  <span className="bar-detail-label">Insurance</span>
                                  <span>{job.insurance_company || '—'}</span>
                                </div>
                                <div className="bar-detail-item">
                                  <span className="bar-detail-label">Date Invoiced</span>
                                  <span>{fmtDate(job.date_invoiced)}</span>
                                </div>
                                <div className="bar-detail-item">
                                  <span className="bar-detail-label">Date of Loss</span>
                                  <span>{fmtDate(job.date_of_loss)}</span>
                                </div>
                              </div>

                              {/* Collection Activity Log */}
                              <div className="bar-activity-section">
                                <h4>Collection Activity</h4>
                                {loadingActivities && <div className="bar-activity-loading">Loading...</div>}
                                {!loadingActivities && expandedActivities.length === 0 && (
                                  <div className="bar-activity-empty">No collection activity logged yet.</div>
                                )}
                                {!loadingActivities && expandedActivities.length > 0 && (
                                  <table className="bar-activity-table">
                                    <thead>
                                      <tr>
                                        <th>Date</th>
                                        <th>Method</th>
                                        <th>Notes</th>
                                        <th>Follow-Up</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {expandedActivities.map(act => (
                                        <tr key={act.id}>
                                          <td>{fmtDate(act.created_at)}</td>
                                          <td className="bar-method-pill">{act.contact_method}</td>
                                          <td>{act.notes}</td>
                                          <td>{act.next_action_date ? fmtDate(act.next_action_date) : '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Log Contact Modal */}
        {logContactJob && (
          <LogContactModal
            job={logContactJob}
            onSave={handleLogContact}
            onClose={() => setLogContactJob(null)}
          />
        )}

        {/* Mark Paid Confirm Dialog */}
        {confirmPayJob && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setConfirmPayJob(null)}>
            <div className="modal-content" style={{ maxWidth: '420px' }}>
              <div className="modal-header">
                <h2>Confirm Payment</h2>
                <button className="close-btn" onClick={() => setConfirmPayJob(null)}>&times;</button>
              </div>
              <p style={{ padding: '0 1.25rem', color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Mark <strong>{confirmPayJob.display_job_number}</strong> ({confirmPayJob.customer_name}) as paid?
                This will set AR balance to $0 and record today as the payment date.
              </p>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setConfirmPayJob(null)}>Cancel</button>
                <button type="button" className="btn-primary" onClick={handleMarkPaid}>Mark Paid</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export default BillingAR;
