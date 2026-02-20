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
  const isCompact = !columnCount || columnCount === 7;

  // Load pre-scheduled items (estimates, site visits) from job_schedules
  const [preScheduledByDate, setPreScheduledByDate] = useState({});

  useEffect(() => {
    if (!weekDates || weekDates.length === 0) return;
    let cancelled = false;

    const loadPreScheduled = async () => {
      try {
        const startStr = dateToString(weekDates[0]);
        const endStr = dateToString(weekDates[weekDates.length - 1]);

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

  // Build day columns with jobs grouped by crew
  const dayColumns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return weekDates.map((d, i) => {
      const snap = weekSnapshots[i];
      const dateStr = dateToString(d);
      const dNorm = new Date(d);
      dNorm.setHours(0, 0, 0, 0);
      const isToday = dNorm.getTime() === today.getTime();

      // Collect all jobs with crew assignment
      const allJobs = [];
      const seenJobNumbers = new Set();

      if (snap?.jobsByCrewName) {
        Object.entries(snap.jobsByCrewName).forEach(([crewName, data]) => {
          (data.jobs || []).forEach((job) => {
            allJobs.push({ ...job, assignedTo: crewName, _drive: data.drive });
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

      // Group by crew/assignee
      const crewMap = {};
      allJobs.forEach((job) => {
        const crew = job.assignedTo || 'Unassigned';
        if (!crewMap[crew]) crewMap[crew] = { jobs: [], totalHours: 0, drive: job._drive || null };
        crewMap[crew].jobs.push(job);
        crewMap[crew].totalHours += Number(job.hours) || 0;
      });

      // Sort jobs within each crew by time
      Object.values(crewMap).forEach((group) => {
        group.jobs.sort((a, b) => {
          const tA = a.preScheduledTime || '';
          const tB = b.preScheduledTime || '';
          return tA.localeCompare(tB);
        });
      });

      // Sort crews: Unassigned last, then alphabetical
      const crewGroups = Object.entries(crewMap)
        .sort(([a], [b]) => {
          if (a === 'Unassigned') return 1;
          if (b === 'Unassigned') return -1;
          return a.localeCompare(b);
        })
        .map(([name, data]) => ({ name, ...data }));

      return { date: d, dateStr, isToday, crewGroups, totalJobs: allJobs.length };
    });
  }, [weekDates, weekSnapshots, preScheduledByDate]);

  return (
    <div className="outlook-week-view">
      <div
        className="outlook-week-grid"
        style={columnCount ? { gridTemplateColumns: `repeat(${columnCount}, 1fr)` } : undefined}
      >
        {dayColumns.map((col) => (
          <div key={col.dateStr} className={`outlook-day-column${col.isToday ? ' outlook-today' : ''}`}>
            <button
              type="button"
              className="outlook-day-header"
              onClick={() => { setDate(col.date); setRangeMode('day'); setViewMode('table'); }}
              title="Open day view"
            >
              <div className="outlook-day-name">{formatDayShort(col.date)}</div>
              <div className="outlook-day-date">
                {formatMd(col.date)}
                {col.totalJobs > 0 && (
                  <span className="outlook-day-count">{col.totalJobs}</span>
                )}
              </div>
            </button>
            <div className="outlook-day-body">
              {col.crewGroups.length === 0 ? (
                <div className="outlook-day-empty">No jobs scheduled</div>
              ) : (
                col.crewGroups.map((crew) => (
                  <div key={crew.name} className="outlook-crew-group">
                    <div className="outlook-crew-header">
                      <span className="outlook-crew-name">{crew.name}</span>
                      <span className="outlook-crew-summary">
                        {crew.jobs.length}j &middot; {crew.totalHours.toFixed(1)}h
                      </span>
                    </div>
                    {crew.jobs.map((job, idx) => (
                      isCompact ? (
                        /* ── Compact card (7-day week view) ── */
                        <div
                          key={job.id || idx}
                          className={`outlook-job-card outlook-job-compact${cardAccentClass(job.jobType)}`}
                          title={[
                            job.jobNumber,
                            job.jobType,
                            job.customer,
                            job.preScheduledTime ? formatTime12(job.preScheduledTime) : '',
                            job.address,
                          ].filter(Boolean).join(' \u2014 ')}
                        >
                          <span className="outlook-compact-time">
                            {job.preScheduledTime ? formatTime12(job.preScheduledTime) : ''}
                          </span>
                          <span className="outlook-compact-job">{job.jobNumber || '\u2014'}</span>
                          <span className="outlook-compact-cust">{job.customer || ''}</span>
                        </div>
                      ) : (
                        /* ── Rich card (3-day view) ── */
                        <div key={job.id || idx} className={`outlook-job-card${cardAccentClass(job.jobType)}`}>
                          <div className="outlook-job-row-top">
                            {job.preScheduledTime && (
                              <span className="outlook-job-time">{formatTime12(job.preScheduledTime)}</span>
                            )}
                            <span className="outlook-job-number">{job.jobNumber || '\u2014'}</span>
                            <span className={`outlook-job-type ${typeBadgeClass(job.jobType)}`}>
                              {job.jobType || '\u2014'}
                            </span>
                          </div>
                          <div className="outlook-job-row-bottom">
                            <span className="outlook-job-customer">{job.customer || '\u2014'}</span>
                            <span className="outlook-job-hours">{Number(job.hours || 0).toFixed(1)}h</span>
                          </div>
                        </div>
                      )
                    ))}
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
