import React, { useMemo } from 'react';
import {
  DAY_START, DAY_END, SLOT_INTERVAL, TIME_SLOTS,
  hourToLabel, formatDriveTime, getDriveTotal, getDriveLegs,
  JOB_TYPES,
} from '../../hooks/useDispatchSchedule';

const COLOR_TEAM_NAMES = {
  '#3b82f6': 'Blue', '#8b5cf6': 'Purple', '#22c55e': 'Green', '#f97316': 'Orange',
  '#ef4444': 'Red', '#06b6d4': 'Teal', '#ec4899': 'Pink', '#84cc16': 'Lime',
};

function teamNameFromColor(hex) {
  return COLOR_TEAM_NAMES[hex] || 'Team';
}

export default function DispatchTimeGrid({
  schedule, scheduleColumns, pmHeaderGroups,
  driveTimeByCrew,
  totalHours,
  addJob, removeJob, updateJob, moveJobToUnassigned, moveJobToLane, copyJobToLane,
}) {
  // Compute job placements on the time grid + overflow
  const { crewJobPlacements, overflowJobs } = useMemo(() => {
    const placements = {};
    const overflow = [];
    scheduleColumns.forEach((col) => {
      const jobs = schedule[col.id] || [];
      const legs = getDriveLegs(driveTimeByCrew[col.id]);
      let cursor = DAY_START;
      let jobIdx = 0;
      placements[col.id] = [];
      jobs.forEach((job) => {
        const hours = Number(job.hours) || 0;
        if (hours <= 0) { jobIdx++; return; }

        const legSec = legs[jobIdx] || 0;
        const driveHours = legSec / 3600;
        const preDriveMin = Math.round(legSec / 60);
        cursor += driveHours;

        const startHour = cursor;
        const endHour = cursor + hours;
        cursor = endHour;
        jobIdx++;

        if (startHour >= DAY_END) {
          overflow.push({ crew: col, job });
          return;
        }
        const endHourCapped = Math.min(endHour, DAY_END);
        const startRowIndex = TIME_SLOTS.findIndex((t) => t >= startHour - 0.01);
        const rowsNeeded = Math.ceil((endHourCapped - startHour) / SLOT_INTERVAL);
        const lastRowIndex = TIME_SLOTS.length - 1;
        const rowSpan = startRowIndex >= 0 ? Math.min(Math.max(1, rowsNeeded), lastRowIndex - startRowIndex + 1) : 1;
        if (startRowIndex >= 0 && rowSpan >= 1) {
          placements[col.id].push({ job, startHour, endHour: endHourCapped, startRowIndex, rowSpan, preDriveMin });
        }
      });
    });
    return { crewJobPlacements: placements, overflowJobs: overflow };
  }, [schedule, driveTimeByCrew, scheduleColumns]);

  return (
    <>
      <div className="dispatch-time-grid-wrap">
        <table className="dispatch-time-grid">
          <thead>
            {/* Team spanning row */}
            <tr className="dispatch-pm-header-row">
              <th className="dispatch-time-col" rowSpan={2}>Time</th>
              {pmHeaderGroups.map((g, i) => (
                <th key={i} colSpan={g.colSpan} className={`dispatch-pm-col${g.pm ? '' : ' dispatch-pm-col-empty'}`} style={{ borderBottomColor: g.color }}>
                  {g.pm && (
                    <span className="pm-header-name">{teamNameFromColor(g.color)} Team</span>
                  )}
                </th>
              ))}
            </tr>
            {/* Crew / PM lane header row */}
            <tr>
              {scheduleColumns.map((col) => (
                <th
                  key={col.id}
                  className={`dispatch-crew-col dispatch-drop-target${col.type === 'pm' ? ' dispatch-crew-col-pm' : ''}`}
                  style={{ borderTopColor: col.color }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dispatch-drag-over'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('dispatch-drag-over'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('dispatch-drag-over');
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('application/json'));
                      if (data.source === 'unassigned' && data.job) {
                        moveJobToLane(col.id, data.job);
                      } else if (data.source === 'lane' && data.job && col.type === 'pm') {
                        // Copy job to PM lane (keeps original in crew lane)
                        copyJobToLane(col.id, data.job);
                      }
                    } catch (_) {}
                  }}
                >
                  <span className="grid-crew-name">{col.name}{col.type === 'pm' && <span className="grid-crew-role-badge">PM</span>}</span>
                  <span className="grid-crew-working">Working: {totalHours(col.id).toFixed(1)}h</span>
                  <span className="grid-crew-drive">Drive: {formatDriveTime(getDriveTotal(driveTimeByCrew[col.id]))}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slotHour, rowIndex) => {
              const placeAtRow = (crewId) => (crewJobPlacements[crewId] || []).find((p) => p.startRowIndex === rowIndex);
              const inSpan = (crewId) => (crewJobPlacements[crewId] || []).some((p) => rowIndex > p.startRowIndex && rowIndex < p.startRowIndex + p.rowSpan);

              // Shared drop handler for body cells — copies job to PM lanes
              const handleCellDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('dispatch-drag-over'); };
              const handleCellDragLeave = (e) => { e.currentTarget.classList.remove('dispatch-drag-over'); };
              const handleCellDrop = (col) => (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('dispatch-drag-over');
                try {
                  const data = JSON.parse(e.dataTransfer.getData('application/json'));
                  if (data.source === 'unassigned' && data.job) {
                    moveJobToLane(col.id, data.job);
                  } else if (data.source === 'lane' && data.job && col.type === 'pm') {
                    copyJobToLane(col.id, data.job);
                  }
                } catch (_) {}
              };

              return (
                <tr key={rowIndex}>
                  <td className="dispatch-time-col time-slot-label">{hourToLabel(slotHour)}</td>
                  {scheduleColumns.map((col) => {
                    const place = placeAtRow(col.id);
                    if (place) {
                      const { job, startHour, endHour, rowSpan, preDriveMin } = place;
                      const jobIndex = (schedule[col.id] || []).findIndex((j) => j.id === job.id);
                      return (
                        <td
                          key={col.id} rowSpan={rowSpan} className="dispatch-job-cell" style={{ borderLeftColor: col.color }}
                          onDragOver={handleCellDragOver} onDragLeave={handleCellDragLeave} onDrop={handleCellDrop(col)}
                        >
                          <div className="dispatch-job-cell-inner">
                            {preDriveMin > 0 && (
                              <div className="grid-drive-indicator">
                                <span className="grid-drive-icon">🚗</span> {preDriveMin} min drive
                              </div>
                            )}
                            <div className="grid-job-block" draggable onDragStart={(e) => {
                              e.dataTransfer.setData('application/json', JSON.stringify({ type: 'job', source: 'lane', laneId: col.id, jobIndex, job }));
                              e.dataTransfer.effectAllowed = 'move';
                            }}>
                              <div className="grid-job-number">{job.jobNumber || '—'}</div>
                              <div className="grid-job-customer">{job.customer || '—'}</div>
                              <div className="grid-job-status">{job.jobType || '—'}</div>
                              {jobIndex >= 0 && (
                                <button type="button" className="grid-remove-job" onClick={() => removeJob(col.id, jobIndex)} aria-label="Remove job">&times;</button>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    }
                    if (inSpan(col.id)) return null;
                    return (
                      <td
                        key={col.id} className="dispatch-job-cell empty-cell"
                        onDragOver={handleCellDragOver} onDragLeave={handleCellDragLeave} onDrop={handleCellDrop(col)}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Overflow */}
        {overflowJobs.length > 0 && (
          <div className="dispatch-overflow-section">
            <h3 className="dispatch-overflow-title">After 5 PM — {overflowJobs.length} job{overflowJobs.length !== 1 ? 's' : ''} overflow</h3>
            <p className="dispatch-overflow-desc">These jobs would start at or after 5:00 PM. Move to another day or remove.</p>
            <div className="dispatch-overflow-list">
              {overflowJobs.map(({ crew, job }) => {
                const jobIndex = (schedule[crew.id] || []).findIndex((j) => j.id === job.id);
                return (
                  <div key={`${crew.id}-${job.id}`} className="dispatch-overflow-card" style={{ borderLeftColor: crew.color }}>
                    <span className="dispatch-overflow-crew">{crew.name}</span>
                    <span className="dispatch-overflow-job">{job.jobNumber || '—'}</span>
                    <span className="dispatch-overflow-customer">{job.customer || '—'}</span>
                    {jobIndex >= 0 && (
                      <button type="button" className="dispatch-overflow-remove" onClick={() => removeJob(crew.id, jobIndex)} aria-label="Remove job">&times;</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add job buttons */}
        <div className="dispatch-grid-actions">
          {scheduleColumns.map((col) => (
            <button key={col.id} type="button" className="add-job-btn" onClick={() => addJob(col.id)}>+ Add job to {col.name}</button>
          ))}
        </div>
      </div>
    </>
  );
}
