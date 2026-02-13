import React, { useMemo } from 'react';
import { formatDriveTime, getDriveTotal } from '../../hooks/useDispatchSchedule';

export default function DispatchWeekView({
  weekSnapshots, weekDates, setDate, setRangeMode, setViewMode,
  formatDayShort, formatMd,
}) {
  // Compute crew rows across the week (with alias resolution)
  const weekCrewRows = useMemo(() => {
    const allNamesSet = new Set();
    weekSnapshots.forEach((s) => {
      Object.keys(s.jobsByCrewName || {}).forEach((name) => {
        const n = String(name || '').replace(/\s+/g, ' ').trim();
        if (n) allNamesSet.add(n);
      });
    });
    const allNames = Array.from(allNamesSet);

    const alias = new Map();
    allNames.forEach((n) => alias.set(n, n));
    allNames.forEach((n) => {
      const trimmed = n.trim();
      if (!trimmed || /\s/.test(trimmed)) return;
      const lower = trimmed.toLowerCase();
      const candidates = allNames.filter((m) => m.toLowerCase().startsWith(lower + ' ') && /\s/.test(m));
      if (candidates.length === 0) return;
      const best = [...candidates].sort((a, b) => b.length - a.length)[0];
      alias.set(n, best);
    });

    const canonicalToSources = new Map();
    allNames.forEach((n) => {
      const canonical = alias.get(n) || n;
      if (!canonicalToSources.has(canonical)) canonicalToSources.set(canonical, []);
      canonicalToSources.get(canonical).push(n);
    });

    return Array.from(canonicalToSources.entries())
      .map(([canonical, sources]) => ({
        canonical,
        sources: sources.sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.canonical.localeCompare(b.canonical));
  }, [weekSnapshots]);

  return (
    <div className="dispatch-week-view">
      <div className="dispatch-week-hint">Click a day header to open that day's schedule.</div>
      <div className="dispatch-week-table-wrap">
        <table className="dispatch-week-table">
          <thead>
            <tr>
              <th className="dispatch-week-crew-col">Crew</th>
              {weekSnapshots.map((snap) => (
                <th key={snap.key} className="dispatch-week-day-col">
                  <button
                    type="button"
                    className="dispatch-week-daybtn"
                    onClick={() => { setDate(new Date(snap.date)); setRangeMode('day'); setViewMode('table'); }}
                    title="Open day view"
                  >
                    <div className="dispatch-week-dayname">{formatDayShort(snap.date)}</div>
                    <div className="dispatch-week-daydate">{formatMd(snap.date)}</div>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekCrewRows.length === 0 && (
              <tr>
                <td className="dispatch-week-empty" colSpan={1 + weekSnapshots.length}>
                  No saved schedules found for this week yet.
                </td>
              </tr>
            )}
            {weekCrewRows.map((row) => (
              <tr key={row.canonical}>
                <td className="dispatch-week-crew">{row.canonical}</td>
                {weekSnapshots.map((snap) => {
                  let jobs = [];
                  let drive = null;
                  row.sources.forEach((name) => {
                    const entry = snap.jobsByCrewName?.[name];
                    if (Array.isArray(entry?.jobs) && entry.jobs.length) jobs = jobs.concat(entry.jobs);
                    if (!drive && entry?.drive) drive = entry.drive;
                  });
                  const hours = jobs.reduce((sum, j) => sum + (Number(j?.hours) || 0), 0);
                  const driveLabel = drive ? formatDriveTime(getDriveTotal(drive)) : '';
                  return (
                    <td key={snap.key + row.canonical} className="dispatch-week-cell">
                      {jobs.length > 0 ? (
                        <>
                          <div className="dispatch-week-main">{jobs.length} job{jobs.length !== 1 ? 's' : ''} &middot; {hours.toFixed(1)}h</div>
                          {driveLabel && <div className="dispatch-week-sub">Drive: {driveLabel}</div>}
                        </>
                      ) : (
                        <div className="dispatch-week-dash">&mdash;</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Unassigned row */}
            <tr className="dispatch-week-unassigned-row">
              <td className="dispatch-week-crew">Unassigned</td>
              {weekSnapshots.map((snap) => {
                const jobs = Array.isArray(snap.unassignedJobs) ? snap.unassignedJobs : [];
                const hours = jobs.reduce((sum, j) => sum + (Number(j?.hours) || 0), 0);
                return (
                  <td key={snap.key + '-unassigned'} className="dispatch-week-cell">
                    {jobs.length > 0 ? (
                      <div className="dispatch-week-main">{jobs.length} job{jobs.length !== 1 ? 's' : ''} &middot; {hours.toFixed(1)}h</div>
                    ) : (
                      <div className="dispatch-week-dash">&mdash;</div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
