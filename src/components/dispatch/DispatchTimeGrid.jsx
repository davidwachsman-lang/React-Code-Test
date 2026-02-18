import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  DAY_START, DAY_END, SLOT_INTERVAL, TIME_SLOTS,
  hourToLabel, formatDriveTime, getDriveTotal, getDriveLegs,
  JOB_TYPES,
} from '../../hooks/useDispatchSchedule';

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

        const hasPinnedTime = job.fixedStartHour != null;
        const legSec = legs[jobIdx] || 0;
        const preDriveMin = Math.round(legSec / 60);

        if (hasPinnedTime) {
          // Pinned job — jump cursor to exact start, don't offset by drive time
          cursor = job.fixedStartHour;
        } else {
          cursor += legSec / 3600;
        }

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

  // ── Drag-to-resize state ──
  const ROW_HEIGHT = 40; // 2.5rem = 40px
  const [resizeState, setResizeState] = useState(null); // { crewId, jobIndex, originalHours, startY, previewHours }
  const resizeRef = useRef(null);

  const handleResizeMouseDown = useCallback((e, crewId, jobIndex, currentHours) => {
    e.preventDefault();
    e.stopPropagation();
    const state = { crewId, jobIndex, originalHours: currentHours, startY: e.clientY, previewHours: currentHours };
    resizeRef.current = state;
    setResizeState(state);
  }, []);

  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (e) => {
      const s = resizeRef.current;
      if (!s) return;
      const deltaRows = Math.round((e.clientY - s.startY) / ROW_HEIGHT);
      const newHours = Math.max(0.5, s.originalHours + deltaRows * SLOT_INTERVAL);
      if (newHours !== resizeRef.current.previewHours) {
        resizeRef.current = { ...resizeRef.current, previewHours: newHours };
        setResizeState((prev) => ({ ...prev, previewHours: newHours }));
      }
    };

    const handleMouseUp = () => {
      const s = resizeRef.current;
      if (s && s.previewHours !== s.originalHours) {
        updateJob(s.crewId, s.jobIndex, 'hours', s.previewHours);
      }
      resizeRef.current = null;
      setResizeState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, updateJob]);

  return (
    <>
      <div className="dispatch-time-grid-wrap">
        <table className="dispatch-time-grid">
          <thead>
            {/* Crew / PM lane header row */}
            <tr>
              <th className="dispatch-time-col">Time</th>
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
                      } else if (data.source === 'lane' && data.job && col.type === 'pm' && data.laneId !== col.id) {
                        copyJobToLane(col.id, data.job, data.startHour);
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
              const getEffectiveRowSpan = (crewId, p) => {
                if (resizeState && resizeState.crewId === crewId) {
                  const ji = (schedule[crewId] || []).findIndex((j) => j.id === p.job.id);
                  if (ji === resizeState.jobIndex) {
                    return Math.max(1, Math.ceil(resizeState.previewHours / SLOT_INTERVAL));
                  }
                }
                return p.rowSpan;
              };
              const inSpan = (crewId) => (crewJobPlacements[crewId] || []).some((p) => {
                const span = getEffectiveRowSpan(crewId, p);
                return rowIndex > p.startRowIndex && rowIndex < p.startRowIndex + span;
              });

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
                  } else if (data.source === 'lane' && data.job && col.type === 'pm' && data.laneId !== col.id) {
                    copyJobToLane(col.id, data.job, data.startHour);
                  }
                } catch (_) {}
              };

              return (
                <tr key={rowIndex}>
                  <td className="dispatch-time-col time-slot-label">{hourToLabel(slotHour)}</td>
                  {scheduleColumns.map((col) => {
                    if (inSpan(col.id)) return null;
                    const place = placeAtRow(col.id);
                    if (place) {
                      const { job, startHour, endHour, rowSpan, preDriveMin } = place;
                      const jobIndex = (schedule[col.id] || []).findIndex((j) => j.id === job.id);
                      const isResizing = resizeState && resizeState.crewId === col.id && resizeState.jobIndex === jobIndex;
                      const displayRowSpan = isResizing
                        ? Math.max(1, Math.ceil(resizeState.previewHours / SLOT_INTERVAL))
                        : rowSpan;
                      const displayHours = isResizing ? resizeState.previewHours : (Number(job.hours) || 0);
                      return (
                        <td
                          key={col.id} rowSpan={displayRowSpan} className="dispatch-job-cell" style={{ borderLeftColor: col.color }}
                          onDragOver={handleCellDragOver} onDragLeave={handleCellDragLeave} onDrop={handleCellDrop(col)}
                        >
                          <div className="dispatch-job-cell-inner">
                            <div className={`grid-drive-indicator${preDriveMin > 0 ? '' : ' grid-drive-na'}`}>
                              <span className="grid-drive-icon">🚗</span> {preDriveMin > 0 ? `${preDriveMin} min drive` : 'No route'}
                            </div>
                            <div className={`grid-job-block${isResizing ? ' resizing' : ''}`} draggable={!isResizing} onDragStart={(e) => {
                              if (isResizing) { e.preventDefault(); return; }
                              e.dataTransfer.setData('application/json', JSON.stringify({ type: 'job', source: 'lane', laneId: col.id, jobIndex, job, startHour }));
                              e.dataTransfer.effectAllowed = 'move';
                            }}>
                              <div className="grid-job-number">{job.jobNumber || '—'}</div>
                              <div className="grid-job-detail-row">
                                <span className="grid-job-status">{job.jobType || '—'}</span>
                                <span className="grid-job-hours">{displayHours}h</span>
                                {job.preScheduledTime && (
                                  <span className="grid-job-scheduled-time">Appt {(() => {
                                    const [h, m] = job.preScheduledTime.split(':');
                                    const hr = parseInt(h, 10);
                                    const ampm = hr >= 12 ? 'PM' : 'AM';
                                    return `${hr % 12 || 12}:${m} ${ampm}`;
                                  })()}</span>
                                )}
                              </div>
                              <div className="grid-job-customer">{job.customer || '—'}</div>
                              {job.address && <div className="grid-job-address">{job.address}</div>}
                              {jobIndex >= 0 && (
                                <button type="button" className="grid-remove-job" onClick={() => removeJob(col.id, jobIndex)} aria-label="Remove job">&times;</button>
                              )}
                              {/* Resize handle */}
                              <div
                                className="grid-resize-handle"
                                onMouseDown={(e) => handleResizeMouseDown(e, col.id, jobIndex, Number(job.hours) || 0.5)}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    }
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

      </div>
    </>
  );
}
