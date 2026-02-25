import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import scheduleService from '../../services/scheduleService';

function dateToString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUS_ORDER = ['scheduled', 'confirmed', 'in_progress', 'completed'];
const STATUS_COLORS = {
  scheduled: '#94a3b8',
  confirmed: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
};
const STATUS_LABELS = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function DispatchStatusPanel({ date }) {
  const [items, setItems] = useState([]);

  const dateStr = dateToString(date);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    scheduleService.getByDate(dateStr).then((data) => {
      if (!cancelled) setItems(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [dateStr]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('dispatch-status-panel')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'job_schedules',
      }, (payload) => {
        const updated = payload.new;
        if (updated.scheduled_date !== dateStr) return;
        setItems((prev) =>
          prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it))
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dateStr]);

  // Group by technician
  const crewGroups = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      const name = it.technician_name || 'Unassigned';
      if (!map[name]) map[name] = [];
      map[name].push(it);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  // Overall progress
  const completedCount = items.filter((it) => it.status === 'completed').length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="status-panel">
      <div className="status-panel-header">
        <h3>Live Status</h3>
        <div className="status-panel-progress">
          <div className="status-panel-progress-bar">
            <div className="status-panel-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="status-panel-progress-label">{completedCount}/{totalCount} done</span>
        </div>
      </div>

      {/* Legend */}
      <div className="status-panel-legend">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="status-panel-legend-item">
            <span className="status-dot" style={{ background: STATUS_COLORS[s] }} />
            {STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      {crewGroups.length === 0 ? (
        <div className="status-panel-empty">No finalized jobs for this date</div>
      ) : (
        crewGroups.map(([crewName, jobs]) => {
          const crewDone = jobs.filter((j) => j.status === 'completed').length;
          return (
            <div key={crewName} className="status-crew-group">
              <div className="status-crew-header">
                <span className="status-crew-name">{crewName}</span>
                <span className="status-crew-progress">{crewDone}/{jobs.length}</span>
              </div>
              <div className="status-crew-jobs">
                {jobs.map((job) => (
                  <div key={job.id} className="status-job-row">
                    <span className="status-dot" style={{ background: STATUS_COLORS[job.status] || '#64748b' }} />
                    <span className="status-job-number">{job.jobs?.job_number || '--'}</span>
                    <span className="status-job-customer">{job.jobs?.customers?.name || ''}</span>
                    <span className="status-job-status">{STATUS_LABELS[job.status] || job.status}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
