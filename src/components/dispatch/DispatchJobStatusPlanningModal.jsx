import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { STATUS_OPTIONS } from './DispatchExcelUpload';

function normalizeStageToStatus(stage) {
  const s = String(stage || '').toLowerCase();
  if (s.includes('dry')) return 'dry';
  if (s.includes('monitor')) return 'monitoring';
  if (s.includes('stabil')) return 'stabilization';
  if (s.includes('walk')) return 'walkthrough';
  if (s.includes('demo')) return 'demo';
  if (s.includes('pack')) return 'packout';
  if (s.includes('pick') || s.includes('equipment')) return 'equipment-pickup';
  return 'dry';
}

function statusLabel(value) {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label || value;
}

function statusHours(value) {
  return STATUS_OPTIONS.find((o) => o.value === value)?.hours || 1;
}

function needsEstimate(job) {
  const estimateVal = Number(job.estimate_value);
  const noEstimate = !Number.isFinite(estimateVal) || estimateVal <= 0;
  const stageText = String(job.stage || '').toLowerCase();
  const stageNeedsEstimate = stageText.includes('estim');
  return noEstimate || stageNeedsEstimate;
}

function formatAddress(job) {
  const fromProperty = [job.properties?.address1, job.properties?.city, job.properties?.state].filter(Boolean).join(', ');
  return fromProperty || '';
}

export default function DispatchJobStatusPlanningModal({
  open,
  onClose,
  onApplyStatusToSchedule,
}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusView, setStatusView] = useState('wip');
  const [savingIds, setSavingIds] = useState({});
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadJobs = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: loadError } = await supabase
          .from('jobs')
          .select(`
            id,
            job_number,
            external_job_number,
            status,
            stage,
            estimate_value,
            pm,
            crew_chief,
            customers(name),
            properties(address1, city, state)
          `)
          .in('status', ['pending', 'wip'])
          .order('updated_at', { ascending: false })
          .limit(500);
        if (loadError) throw loadError;
        if (cancelled) return;
        setJobs((data || []).map((job) => ({
          ...job,
          dispatchStatus: normalizeStageToStatus(job.stage),
          hours: statusHours(normalizeStageToStatus(job.stage)),
          originalDispatchStatus: normalizeStageToStatus(job.stage),
          originalHours: statusHours(normalizeStageToStatus(job.stage)),
          customer_name: job.customers?.name || '',
          address_text: formatAddress(job),
        })));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load jobs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadJobs();
    return () => { cancelled = true; };
  }, [open]);

  const visibleJobs = useMemo(
    () => jobs.filter((job) => {
      if (job.status !== statusView) return false;
      if (statusView === 'pending') return needsEstimate(job);
      return true;
    }),
    [jobs, statusView]
  );

  const updateStatus = (jobId, nextStatus) => {
    const nextHours = statusHours(nextStatus);
    setJobs((prev) => prev.map((j) => (
      j.id === jobId ? { ...j, dispatchStatus: nextStatus, hours: nextHours } : j
    )));
  };

  const adjustHours = (jobId, delta) => {
    setJobs((prev) => prev.map((j) => {
      if (j.id !== jobId) return j;
      const nextHours = Math.max(0, Number(j.hours || 0) + delta);
      return { ...j, hours: nextHours };
    }));
  };

  const changedWipJobs = useMemo(
    () => jobs.filter((job) => (
      job.status === 'wip'
      && (job.dispatchStatus !== job.originalDispatchStatus || Number(job.hours) !== Number(job.originalHours))
    )),
    [jobs]
  );

  const applyToSchedule = async () => {
    if (changedWipJobs.length === 0) return;
    setApplying(true);
    setError('');
    const saveById = {};
    changedWipJobs.forEach((job) => { saveById[job.id] = true; });
    setSavingIds((prev) => ({ ...prev, ...saveById }));
    try {
      const statusChangedJobs = changedWipJobs.filter((job) => job.dispatchStatus !== job.originalDispatchStatus);
      if (statusChangedJobs.length > 0) {
        await Promise.all(statusChangedJobs.map(async (job) => {
          const nextStage = statusLabel(job.dispatchStatus);
          const { error: saveError } = await supabase
            .from('jobs')
            .update({ stage: nextStage })
            .eq('id', job.id);
          if (saveError) throw saveError;
        }));
      }

      if (onApplyStatusToSchedule) {
        onApplyStatusToSchedule(changedWipJobs.map((job) => ({
          jobId: job.id,
          jobNumber: job.job_number || job.external_job_number || '',
          statusValue: job.dispatchStatus,
          hours: job.hours,
        })));
      }

      setJobs((prev) => prev.map((job) => (
        changedWipJobs.some((changed) => changed.id === job.id)
          ? { ...job, originalDispatchStatus: job.dispatchStatus, originalHours: job.hours }
          : job
      )));
    } catch (err) {
      setError(err.message || 'Failed to apply changes');
    } finally {
      const clearById = {};
      changedWipJobs.forEach((job) => { clearById[job.id] = false; });
      setSavingIds((prev) => ({ ...prev, ...clearById }));
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="dispatch-status-planning-backdrop" onClick={onClose}>
      <div className="dispatch-status-planning-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dispatch-status-planning-header">
          <h3>Job Status Planning</h3>
          <div className="dispatch-status-planning-header-actions">
            <button
              type="button"
              className="dispatch-status-apply-btn"
              onClick={applyToSchedule}
              disabled={applying || changedWipJobs.length === 0}
            >
              {applying ? 'Applying...' : 'Apply to Schedule'}
            </button>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="dispatch-status-planning-toolbar">
          <div className="dispatch-status-toggle">
            <button type="button" className={statusView === 'pending' ? 'active' : ''} onClick={() => setStatusView('pending')}>Pending</button>
            <button type="button" className={statusView === 'wip' ? 'active' : ''} onClick={() => setStatusView('wip')}>WIP</button>
          </div>
          <span className="dispatch-status-count">{visibleJobs.length} jobs</span>
        </div>

        {loading && <div className="dispatch-status-empty">Loading jobs...</div>}
        {!loading && error && <div className="dispatch-status-error">{error}</div>}

        {!loading && (
          <div className="dispatch-status-table-wrap">
            <table className="dispatch-status-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Job #</th>
                  <th>Address</th>
                  <th>PM</th>
                  <th>Crew Chief</th>
                  {statusView === 'wip' && <th>Status</th>}
                  {statusView === 'wip' && <th>Est +/-</th>}
                  <th>Hrs</th>
                </tr>
              </thead>
              <tbody>
                {visibleJobs.length === 0 && (
                  <tr>
                    <td colSpan={statusView === 'wip' ? 8 : 6} className="dispatch-status-empty">No jobs in this view.</td>
                  </tr>
                )}
                {visibleJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.customer_name || '-'}</td>
                    <td>{job.job_number || job.external_job_number || '-'}</td>
                    <td>{job.address_text || '-'}</td>
                    <td>{job.pm || '-'}</td>
                    <td>{job.crew_chief || '-'}</td>
                    {statusView === 'wip' && (
                      <td>
                        <select
                          value={job.dispatchStatus}
                          onChange={(e) => updateStatus(job.id, e.target.value)}
                          disabled={!!savingIds[job.id]}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label} ({o.hours}h)</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {statusView === 'wip' && (
                      <td>
                        <div className="dispatch-hours-adjust">
                          <button type="button" onClick={() => adjustHours(job.id, -1)} disabled={!!savingIds[job.id]}>-</button>
                          <span>{Number(job.hours) - Number(statusHours(job.dispatchStatus)) > 0 ? `+${Number(job.hours) - Number(statusHours(job.dispatchStatus))}` : Number(job.hours) - Number(statusHours(job.dispatchStatus))}</span>
                          <button type="button" onClick={() => adjustHours(job.id, 1)} disabled={!!savingIds[job.id]}>+</button>
                        </div>
                      </td>
                    )}
                    <td>{job.hours}{savingIds[job.id] ? '...' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
