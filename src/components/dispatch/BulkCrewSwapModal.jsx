import React, { useState, useMemo } from 'react';
import { DAY_START, DAY_END, getDriveTotal } from '../../hooks/useDispatchSchedule';

export default function BulkCrewSwapModal({ lanes, schedule, driveTimeByCrew, onApply, onClose }) {
  const crewLanes = useMemo(() => lanes.filter((l) => l.type !== 'pm'), [lanes]);

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [mode, setMode] = useState('swap'); // 'swap' | 'move' | 'redistribute'

  const sourceJobs = schedule[sourceId] || [];
  const targetJobs = schedule[targetId] || [];

  const valid = mode === 'redistribute'
    ? sourceId && sourceJobs.length > 0
    : sourceId && targetId && sourceId !== targetId;

  // Preview redistribution: simulate how jobs would be distributed
  const redistributionPreview = useMemo(() => {
    if (mode !== 'redistribute' || !sourceId || sourceJobs.length === 0) return null;

    const targetLanes = crewLanes.filter((l) => l.id !== sourceId);
    if (targetLanes.length === 0) return null;

    const dayLength = DAY_END - DAY_START;
    const capacityMap = {};
    targetLanes.forEach((l) => {
      const jobs = schedule[l.id] || [];
      const workHours = jobs.reduce((sum, j) => sum + (Number(j.hours) || 0), 0);
      const driveHours = getDriveTotal((driveTimeByCrew || {})[l.id]) / 3600;
      capacityMap[l.id] = dayLength - workHours - driveHours;
    });

    // Average position of each target crew's existing jobs
    const crewCentroids = {};
    targetLanes.forEach((l) => {
      const jobs = schedule[l.id] || [];
      const withCoords = jobs.filter((j) => j.latitude != null && j.longitude != null);
      if (withCoords.length > 0) {
        crewCentroids[l.id] = {
          lat: withCoords.reduce((s, j) => s + j.latitude, 0) / withCoords.length,
          lng: withCoords.reduce((s, j) => s + j.longitude, 0) / withCoords.length,
        };
      }
    });

    const sorted = [...sourceJobs].sort((a, b) => (Number(b.hours) || 0) - (Number(a.hours) || 0));
    const assignments = {}; // laneId -> [job, ...]
    targetLanes.forEach((l) => { assignments[l.id] = []; });

    sorted.forEach((job) => {
      const jobHours = Number(job.hours) || 0;
      const hasCoords = job.latitude != null && job.longitude != null;

      let bestLaneId = null;
      let bestScore = Infinity;

      targetLanes.forEach((l) => {
        const remaining = capacityMap[l.id];
        if (remaining < jobHours && remaining < 0) return;

        const capacityScore = -remaining;
        let geoScore = 0;
        if (hasCoords && crewCentroids[l.id]) {
          const dLat = job.latitude - crewCentroids[l.id].lat;
          const dLng = job.longitude - crewCentroids[l.id].lng;
          geoScore = dLat * dLat + dLng * dLng;
        }

        let score;
        if (hasCoords && crewCentroids[l.id]) {
          score = geoScore * 0.6 + capacityScore * 0.0001 * 0.4;
        } else {
          score = capacityScore;
        }

        if (score < bestScore) {
          bestScore = score;
          bestLaneId = l.id;
        }
      });

      if (!bestLaneId) {
        let maxCap = -Infinity;
        targetLanes.forEach((l) => {
          if (capacityMap[l.id] > maxCap) {
            maxCap = capacityMap[l.id];
            bestLaneId = l.id;
          }
        });
      }

      if (bestLaneId) {
        assignments[bestLaneId].push(job);
        capacityMap[bestLaneId] -= jobHours;
        if (hasCoords) {
          const allJobs = [...(schedule[bestLaneId] || []), ...assignments[bestLaneId]];
          const withCoords = allJobs.filter((j) => j.latitude != null && j.longitude != null);
          if (withCoords.length > 0) {
            crewCentroids[bestLaneId] = {
              lat: withCoords.reduce((s, j) => s + j.latitude, 0) / withCoords.length,
              lng: withCoords.reduce((s, j) => s + j.longitude, 0) / withCoords.length,
            };
          }
        }
      }
    });

    return targetLanes
      .map((l) => ({
        id: l.id,
        name: l.name,
        jobCount: assignments[l.id].length,
        totalHours: assignments[l.id].reduce((s, j) => s + (Number(j.hours) || 0), 0),
        willOverflow: capacityMap[l.id] < 0,
      }))
      .filter((r) => r.jobCount > 0);
  }, [mode, sourceId, sourceJobs, crewLanes, schedule, driveTimeByCrew]);

  const handleApply = () => {
    if (!valid) return;
    onApply(sourceId, targetId || null, mode);
    onClose();
  };

  const modeTitle = mode === 'swap' ? 'Swap' : mode === 'move' ? 'Move' : 'Redistribute';

  return (
    <div className="bulk-swap-overlay" onClick={onClose}>
      <div className="bulk-swap-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="bulk-swap-title">Bulk Crew {modeTitle}</h3>

        {/* Mode toggle */}
        <div className="bulk-swap-mode">
          <button className={mode === 'swap' ? 'active' : ''} onClick={() => setMode('swap')}>
            Swap (exchange)
          </button>
          <button className={mode === 'move' ? 'active' : ''} onClick={() => setMode('move')}>
            Move (one-way)
          </button>
          <button className={mode === 'redistribute' ? 'active' : ''} onClick={() => setMode('redistribute')}>
            Redistribute (split up)
          </button>
        </div>

        {/* Crew selectors */}
        <div className="bulk-swap-selectors">
          <div className="bulk-swap-field">
            <label>{mode === 'swap' ? 'Crew A' : 'From Crew'}</label>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">Select crew...</option>
              {crewLanes.map((l) => (
                <option key={l.id} value={l.id} disabled={l.id === targetId}>{l.name}</option>
              ))}
            </select>
          </div>

          {mode !== 'redistribute' && (
            <>
              <div className="bulk-swap-arrow">{mode === 'swap' ? '⇄' : '→'}</div>

              <div className="bulk-swap-field">
                <label>{mode === 'swap' ? 'Crew B' : 'To Crew'}</label>
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">Select crew...</option>
                  {crewLanes.map((l) => (
                    <option key={l.id} value={l.id} disabled={l.id === sourceId}>{l.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Preview — swap/move */}
        {mode !== 'redistribute' && valid && (
          <div className="bulk-swap-preview">
            <div className="bulk-swap-preview-col">
              <strong>{crewLanes.find((l) => l.id === sourceId)?.name}</strong>
              <span>{sourceJobs.length} job{sourceJobs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="bulk-swap-preview-arrow">{mode === 'swap' ? '⇄' : '→'}</div>
            <div className="bulk-swap-preview-col">
              <strong>{crewLanes.find((l) => l.id === targetId)?.name}</strong>
              <span>{targetJobs.length} job{targetJobs.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        {/* Preview — redistribute */}
        {mode === 'redistribute' && sourceId && (
          <div className="bulk-swap-preview" style={{ flexDirection: 'column', gap: '6px' }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>{crewLanes.find((l) => l.id === sourceId)?.name}</strong>
              {' — '}
              <span>{sourceJobs.length} job{sourceJobs.length !== 1 ? 's' : ''} to redistribute</span>
            </div>
            {redistributionPreview && redistributionPreview.length > 0 ? (
              redistributionPreview.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '2px 0' }}>
                  <span>→ {r.name}</span>
                  <span style={{ color: r.willOverflow ? '#ef4444' : 'inherit' }}>
                    {r.jobCount} job{r.jobCount !== 1 ? 's' : ''} ({r.totalHours.toFixed(1)}h)
                    {r.willOverflow && ' ⚠️ overtime'}
                  </span>
                </div>
              ))
            ) : sourceJobs.length > 0 ? (
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>No other crews available</div>
            ) : (
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>No jobs to redistribute</div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="bulk-swap-actions">
          <button className="bulk-swap-cancel" onClick={onClose}>Cancel</button>
          <button className="bulk-swap-apply" disabled={!valid} onClick={handleApply}>
            {mode === 'swap' ? 'Swap Jobs' : mode === 'move' ? 'Move Jobs' : 'Redistribute Jobs'}
          </button>
        </div>
      </div>
    </div>
  );
}
