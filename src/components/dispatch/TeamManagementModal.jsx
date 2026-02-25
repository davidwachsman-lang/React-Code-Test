import React, { useState, useCallback } from 'react';
import dispatchTeamService from '../../services/dispatchTeamService';

const PM_COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export default function TeamManagementModal({ pmGroups: initialPmGroups, onSave, onClose }) {
  const [pmGroups, setPmGroups] = useState(() =>
    initialPmGroups.map((g) => ({
      ...g,
      crews: g.crews.map((c) => (typeof c === 'string' ? { name: c, email: '' } : c)),
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ─── PM operations ─────────────────────────────────────────────────────

  const addPm = () => {
    setPmGroups((prev) => [
      ...prev,
      { pm: '', title: '', color: PM_COLORS[prev.length % PM_COLORS.length], crews: [] },
    ]);
  };

  const updatePm = (idx, field, value) => {
    setPmGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g)));
  };

  const removePm = (idx) => {
    if (!confirm(`Remove PM "${pmGroups[idx].pm || 'New PM'}" and all their crews?`)) return;
    setPmGroups((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Crew operations ──────────────────────────────────────────────────

  const addCrew = (pmIdx) => {
    setPmGroups((prev) =>
      prev.map((g, i) =>
        i === pmIdx ? { ...g, crews: [...g.crews, { name: '', email: '' }] } : g
      )
    );
  };

  const updateCrew = (pmIdx, crewIdx, field, value) => {
    setPmGroups((prev) =>
      prev.map((g, i) =>
        i === pmIdx
          ? {
              ...g,
              crews: g.crews.map((c, ci) => (ci === crewIdx ? { ...c, [field]: value } : c)),
            }
          : g
      )
    );
  };

  const removeCrew = (pmIdx, crewIdx) => {
    const crewName = pmGroups[pmIdx].crews[crewIdx]?.name || 'this crew';
    if (!confirm(`Remove "${crewName}"?`)) return;
    setPmGroups((prev) =>
      prev.map((g, i) =>
        i === pmIdx ? { ...g, crews: g.crews.filter((_, ci) => ci !== crewIdx) } : g
      )
    );
  };

  // ─── Drag crews between PMs ───────────────────────────────────────────

  const [dragSource, setDragSource] = useState(null);

  const handleDragStart = (pmIdx, crewIdx) => {
    setDragSource({ pmIdx, crewIdx });
  };

  const handleDrop = useCallback(
    (targetPmIdx) => {
      if (!dragSource) return;
      const { pmIdx: srcPm, crewIdx: srcCrew } = dragSource;
      if (srcPm === targetPmIdx) return;

      setPmGroups((prev) => {
        const next = prev.map((g) => ({ ...g, crews: [...g.crews] }));
        const [moved] = next[srcPm].crews.splice(srcCrew, 1);
        next[targetPmIdx].crews.push(moved);
        return next;
      });
      setDragSource(null);
    },
    [dragSource]
  );

  // ─── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Convert back to the format expected by dispatchTeamService
      const groupsForSave = pmGroups.map((g) => ({
        pm: g.pm,
        title: g.title,
        color: g.color,
        crews: g.crews.map((c) => c.name),
      }));
      const result = await dispatchTeamService.saveTeams(groupsForSave);
      onSave(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save teams');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="team-mgmt-overlay" onClick={onClose}>
      <div className="team-mgmt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="team-mgmt-header">
          <h3>Manage Teams</h3>
          <button className="team-mgmt-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="team-mgmt-error">{error}</div>}

        <div className="team-mgmt-body">
          {pmGroups.map((group, pmIdx) => (
            <div
              key={pmIdx}
              className="team-mgmt-pm-card"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(pmIdx)}
            >
              <div className="team-mgmt-pm-header">
                <input
                  type="color"
                  value={group.color}
                  onChange={(e) => updatePm(pmIdx, 'color', e.target.value)}
                  className="team-mgmt-color-picker"
                  title="PM color"
                />
                <input
                  className="team-mgmt-pm-name"
                  value={group.pm}
                  onChange={(e) => updatePm(pmIdx, 'pm', e.target.value)}
                  placeholder="PM Name"
                />
                <input
                  className="team-mgmt-pm-title"
                  value={group.title}
                  onChange={(e) => updatePm(pmIdx, 'title', e.target.value)}
                  placeholder="Title"
                />
                <button className="team-mgmt-remove-pm" onClick={() => removePm(pmIdx)} title="Remove PM">
                  &times;
                </button>
              </div>

              <div className="team-mgmt-crew-list">
                {group.crews.map((crew, crewIdx) => (
                  <div
                    key={crewIdx}
                    className="team-mgmt-crew-row"
                    draggable
                    onDragStart={() => handleDragStart(pmIdx, crewIdx)}
                  >
                    <span className="team-mgmt-drag-handle">&#x2630;</span>
                    <input
                      className="team-mgmt-crew-name"
                      value={crew.name}
                      onChange={(e) => updateCrew(pmIdx, crewIdx, 'name', e.target.value)}
                      placeholder="Crew Chief Name"
                    />
                    <input
                      className="team-mgmt-crew-email"
                      value={crew.email}
                      onChange={(e) => updateCrew(pmIdx, crewIdx, 'email', e.target.value)}
                      placeholder="Email (optional)"
                      type="email"
                    />
                    <button
                      className="team-mgmt-remove-crew"
                      onClick={() => removeCrew(pmIdx, crewIdx)}
                      title="Remove crew"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button className="team-mgmt-add-crew" onClick={() => addCrew(pmIdx)}>
                + Add Crew
              </button>
            </div>
          ))}
        </div>

        <button className="team-mgmt-add-pm" onClick={addPm}>+ Add PM</button>

        <div className="team-mgmt-footer">
          <button className="team-mgmt-cancel" onClick={onClose}>Cancel</button>
          <button className="team-mgmt-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Teams'}
          </button>
        </div>
      </div>
    </div>
  );
}
