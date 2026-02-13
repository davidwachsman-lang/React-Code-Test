import React from 'react';

export default function DispatchUnassignedPool({ schedule, addJob, removeJob, moveJobToUnassigned }) {
  const unassigned = schedule.unassigned || [];

  return (
    <div
      className="dispatch-unassigned-pool"
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dispatch-drag-over'); }}
      onDragLeave={(e) => { e.currentTarget.classList.remove('dispatch-drag-over'); }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dispatch-drag-over');
        try {
          const data = JSON.parse(e.dataTransfer.getData('application/json'));
          if (data.source === 'lane' && data.job) moveJobToUnassigned(data.laneId, data.jobIndex);
        } catch (_) {}
      }}
    >
      <div className="dispatch-unassigned-header">
        <h3 className="dispatch-unassigned-title">Unassigned Jobs</h3>
        <span className="dispatch-unassigned-count">{unassigned.length} job{unassigned.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="dispatch-unassigned-list">
        {unassigned.length === 0 && (
          <div className="dispatch-unassigned-empty">Drag jobs here to unassign, or drag cards onto a crew column header to assign.</div>
        )}
        {unassigned.map((job) => (
          <div
            key={job.id}
            className="dispatch-unassigned-card"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({ type: 'job', source: 'unassigned', job }));
              e.dataTransfer.effectAllowed = 'move';
            }}
          >
            <span className="dispatch-unassigned-drag" title="Drag to assign">&#9776;</span>
            <span className="dispatch-unassigned-job">{job.jobNumber || '—'}</span>
            <span className="dispatch-unassigned-customer">{job.customer || '—'}</span>
            <span className="dispatch-unassigned-meta">{job.jobType || '—'} &middot; {job.hours}h</span>
            <button
              type="button"
              className="dispatch-unassigned-remove"
              onClick={() => {
                const idx = unassigned.findIndex((j) => j.id === job.id);
                if (idx >= 0) removeJob('unassigned', idx);
              }}
              aria-label="Remove"
            >&times;</button>
          </div>
        ))}
      </div>
      <button type="button" className="add-job-btn" onClick={() => addJob('unassigned')}>+ Add job to pool</button>
    </div>
  );
}
