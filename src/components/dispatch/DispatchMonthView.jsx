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

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DispatchMonthView({
  monthSnapshots, monthDates, currentDate,
  setDate, setRangeMode, setViewMode,
}) {
  const currentMonth = currentDate.getMonth();

  // Load pre-scheduled items for the month range
  const [preScheduledByDate, setPreScheduledByDate] = useState({});

  useEffect(() => {
    if (!monthDates || monthDates.length === 0) return;
    let cancelled = false;

    const load = async () => {
      try {
        const startStr = dateToString(monthDates[0]);
        const endStr = dateToString(monthDates[monthDates.length - 1]);

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

    load();
    return () => { cancelled = true; };
  }, [monthDates]);

  // Build cell data for each date
  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return monthDates.map((d, i) => {
      const snap = monthSnapshots[i];
      const dateStr = dateToString(d);
      const dNorm = new Date(d);
      dNorm.setHours(0, 0, 0, 0);
      const isToday = dNorm.getTime() === today.getTime();
      const isCurrentMonth = d.getMonth() === currentMonth;

      // Collect jobs
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

      // Merge pre-scheduled items not already present
      if (preScheduledByDate[dateStr]) {
        preScheduledByDate[dateStr].forEach((ps) => {
          const jn = (ps.jobs?.job_number || '').trim().toLowerCase();
          if (jn && seenJobNumbers.has(jn)) return;

          const jobData = ps.jobs;
          const customer = jobData?.customers?.name || '';
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
            assignedTo: ps.technician_name || 'Unassigned',
            preScheduledTime: ps.scheduled_time,
            preScheduled: true,
          });
        });
      }

      allJobs.sort((a, b) => {
        const tA = a.preScheduledTime || '';
        const tB = b.preScheduledTime || '';
        return tA.localeCompare(tB);
      });

      return { date: d, dateStr, isToday, isCurrentMonth, jobs: allJobs };
    });
  }, [monthDates, monthSnapshots, preScheduledByDate, currentMonth]);

  // Split cells into weeks (rows of 7)
  const weeks = useMemo(() => {
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [cells]);

  const handleDayClick = (d) => {
    setDate(d);
    setRangeMode('day');
    setViewMode('table');
  };

  const typeColor = (jobType) => {
    switch (jobType) {
      case 'estimate': return '#f97316';
      case 'site-visit': return '#22c55e';
      case 'emergency': return '#ef4444';
      case 'new-start': return '#8b5cf6';
      case 'demo': return '#ec4899';
      default: return '#3b82f6';
    }
  };

  return (
    <div className="outlook-month-view">
      {/* Day name headers */}
      <div className="outlook-month-header">
        {DAY_NAMES.map((name) => (
          <div key={name} className="outlook-month-dayname">{name}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="outlook-month-grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="outlook-month-row">
            {week.map((cell) => (
              <button
                key={cell.dateStr}
                type="button"
                className={
                  'outlook-month-cell' +
                  (cell.isToday ? ' outlook-month-today' : '') +
                  (!cell.isCurrentMonth ? ' outlook-month-outside' : '')
                }
                onClick={() => handleDayClick(cell.date)}
                title="Open day view"
              >
                <div className="outlook-month-date">{cell.date.getDate()}</div>
                <div className="outlook-month-jobs">
                  {cell.jobs.slice(0, 3).map((job, idx) => (
                    <div
                      key={job.id || idx}
                      className="outlook-month-job"
                      style={{ borderLeftColor: typeColor(job.jobType) }}
                    >
                      <span className="outlook-month-job-id">{job.jobNumber || '\u2014'}</span>
                      <span className="outlook-month-job-cust">{job.customer || ''}</span>
                    </div>
                  ))}
                  {cell.jobs.length > 3 && (
                    <div className="outlook-month-more">+{cell.jobs.length - 3} more</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
