import React, { useMemo, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

function dateToString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${m} ${ampm}`;
}

function cardAccentClass(jobType) {
  switch (jobType) {
    case 'estimate': return ' outlook-card-estimate';
    case 'site-visit': return ' outlook-card-site-visit';
    case 'emergency': return ' outlook-card-emergency';
    case 'new-start': return ' outlook-card-new-start';
    case 'demo': return ' outlook-card-demo';
    default: return '';
  }
}

function typeBadgeClass(jobType) {
  switch (jobType) {
    case 'estimate': return 'outlook-type-estimate';
    case 'site-visit': return 'outlook-type-site-visit';
    case 'emergency': return 'outlook-type-emergency';
    default: return 'outlook-type-default';
  }
}

export default function DispatchWeekView({
  weekSnapshots, weekDates, setDate, setRangeMode, setViewMode,
  formatDayShort, formatMd,
  columnCount,
}) {
  // Load pre-scheduled items (estimates, site visits) from job_schedules for the week
  const [preScheduledByDate, setPreScheduledByDate] = useState({});

  useEffect(() => {
    if (!weekDates || weekDates.length === 0) return;
    let cancelled = false;

    const loadPreScheduled = async () => {
      try {
        const startStr = dateToString(weekDates[0]);
        const endStr = dateToString(weekDates[6]);

        const { data, error } = await supabase
          .from('job_schedules')
          .select(`
            *,
            jobs(id, job_number, customers(name), properties(address1, city, state))
          `)
          .gte('scheduled_date', startStr)
          .lte('scheduled_date', endStr)
          .in('status', ['scheduled', 'confirmed']);

        if (cancelled || error) return;

        const byDate = {};
        (data || []).forEach((ps) => {
          if (!byDate[ps.scheduled_date]) byDate[ps.scheduled_date] = [];
          byDate[ps.scheduled_date].push(ps);
        });
        setPreScheduledByDate(byDate);
      } catch (_) {}
    };

    loadPreScheduled();
    return () => { cancelled = true; };
  }, [weekDates]);

  // Build day columns: one per weekDate, always all 7
  const dayColumns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return weekDates.map((d, i) => {
      const snap = weekSnapshots[i];
      const dateStr = dateToString(d);
      const dNorm = new Date(d);
      dNorm.setHours(0, 0, 0, 0);
      const isToday = dNorm.getTime() === today.getTime();

      // Collect all jobs from saved dispatch snapshot
      const allJobs = [];
      const seenJobNumbers = new Set();

      if (snap?.jobsByCrewName) {
        Object.entries(snap.jobsByCrewName).forEach(([crewName, data]) => {
          (data.jobs || []).forEach((job) => {
            allJobs.push({ ...job, assignedTo: crewName });
            if (job.jobNumber) seenJobNumbers.add(job.jobNumber.trim().toLowerCase());
          });
        });
      }

      if (snap?.unassignedJobs) {
        snap.unassignedJobs.forEach((job) => {
          allJobs.push({ ...job, assignedTo: 'Unassigned' });
          if (job.jobNumber) seenJobNumbers.add(job.jobNumber.trim().toLowerCase());
        });
      }

      // Merge pre-scheduled items that aren't already in the snapshot
      if (preScheduledByDate[dateStr]) {
        preScheduledByDate[dateStr].forEach((ps) => {
          const jn = (ps.jobs?.job_number || '').trim().toLowerCase();
          if (jn && seenJobNumbers.has(jn)) return;

          const jobData = ps.jobs;
          const customer = jobData?.customers?.name || '';
          const addr = jobData?.properties
            ? [jobData.properties.address1, jobData.properties.city, jobData.properties.state].filter(Boolean).join(', ')
            : '';

          const notesLower = (ps.notes || '').toLowerCase();
          let jobType = 'walkthrough';
          if (notesLower.startsWith('estimate')) jobType = 'estimate';
          else if (notesLower.startsWith('site visit') || notesLower.startsWith('inspection')) jobType = 'site-visit';

          const notesParts = (ps.notes || '').split(' \u2014 ');

          allJobs.push({
            id: ps.id,
            jobType,
            hours: (ps.duration_minutes || 60) / 60,
            jobNumber: jobData?.job_number || notesParts[1] || '',
            customer: customer || notesParts[2] || '',
            address: addr,
            assignedTo: ps.technician_name || 'Unassigned',
            preScheduledTime: ps.scheduled_time,
            preScheduled: true,
          });
        });
      }

      // Sort by scheduled time, then by assignedTo
      allJobs.sort((a, b) => {
        const tA = a.preScheduledTime || '';
        const tB = b.preScheduledTime || '';
        if (tA !== tB) return tA.localeCompare(tB);
        return (a.assignedTo || '').localeCompare(b.assignedTo || '');
      });

      return { date: d, dateStr, isToday, jobs: allJobs };
    });
  }, [weekDates, weekSnapshots, preScheduledByDate]);

  return (
    <div className="outlook-week-view">
      <div className="outlook-week-grid" style={columnCount ? { gridTemplateColumns: `repeat(${columnCount}, 1fr)` } : undefined}>
        {dayColumns.map((col) => (
          <div key={col.dateStr} className={`outlook-day-column${col.isToday ? ' outlook-today' : ''}`}>
            <button
              type="button"
              className="outlook-day-header"
              onClick={() => { setDate(col.date); setRangeMode('day'); setViewMode('table'); }}
              title="Open day view"
            >
              <div className="outlook-day-name">{formatDayShort(col.date)}</div>
              <div className="outlook-day-date">{formatMd(col.date)}</div>
            </button>
            <div className="outlook-day-body">
              {col.jobs.length === 0 ? (
                <div className="outlook-day-empty">No jobs scheduled</div>
              ) : (
                col.jobs.map((job, idx) => (
                  <div key={job.id || idx} className={`outlook-job-card${cardAccentClass(job.jobType)}`}>
                    {job.preScheduledTime && (
                      <div className="outlook-job-time">{formatTime12(job.preScheduledTime)}</div>
                    )}
                    <div className="outlook-job-header">
                      <span className="outlook-job-number">{job.jobNumber || '\u2014'}</span>
                      <span className={`outlook-job-type ${typeBadgeClass(job.jobType)}`}>
                        {job.jobType || '\u2014'}
                      </span>
                    </div>
                    <div className="outlook-job-customer">{job.customer || '\u2014'}</div>
                    <div className="outlook-job-assignee">{job.assignedTo}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
