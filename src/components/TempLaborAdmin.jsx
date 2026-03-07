import React, { useState, useEffect } from 'react';
import dispatchTeamService from '../services/dispatchTeamService';
import './TempLaborAdmin.css';

const emptyRow = () => ({
  key: Date.now() + '-' + Math.random(),
  name: '',
  company: '',
  assignedTo: '',
  rate: '',
  notes: '',
});

function TempLaborAdmin() {
  const [tempWorkers, setTempWorkers] = useState([]);
  const [crewNames, setCrewNames] = useState([]);
  const [filterCrew, setFilterCrew] = useState('All');
  const [filterStatus, setFilterStatus] = useState('active');

  // Batch add state
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchDefaults, setBatchDefaults] = useState({ company: '', assignedTo: '', rate: '' });
  const [batchRows, setBatchRows] = useState([emptyRow(), emptyRow(), emptyRow()]);

  // Single edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', company: '', assignedTo: '', rate: '', notes: '' });

  // Load crew names from dispatch teams
  useEffect(() => {
    const loadCrews = async () => {
      try {
        const { lanes } = await dispatchTeamService.loadTeams();
        const names = lanes
          .filter((l) => l.type === 'crew')
          .map((l) => l.name);
        setCrewNames(names);
      } catch (err) {
        console.error('Failed to load crew names:', err);
      }
    };
    loadCrews();
  }, []);

  // Local storage persistence (until Supabase is wired)
  useEffect(() => {
    const stored = localStorage.getItem('temp-labor-workers');
    if (stored) {
      try { setTempWorkers(JSON.parse(stored)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('temp-labor-workers', JSON.stringify(tempWorkers));
  }, [tempWorkers]);

  // Batch add helpers
  const updateBatchRow = (key, field, value) => {
    setBatchRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );
  };

  const addBatchRow = () => {
    setBatchRows((prev) => [...prev, emptyRow()]);
  };

  const removeBatchRow = (key) => {
    setBatchRows((prev) => prev.filter((r) => r.key !== key));
  };

  const handleBatchSubmit = () => {
    const newWorkers = batchRows
      .filter((r) => r.name.trim())
      .map((r) => ({
        id: 'temp-' + Date.now() + '-' + Math.random(),
        name: r.name.trim(),
        company: (r.company.trim() || batchDefaults.company.trim()),
        assignedTo: (r.assignedTo || batchDefaults.assignedTo),
        rate: (r.rate.trim() || batchDefaults.rate.trim()),
        notes: r.notes.trim(),
        active: true,
        createdAt: new Date().toISOString(),
      }));
    if (newWorkers.length === 0) return;
    setTempWorkers((prev) => [...prev, ...newWorkers]);
    setBatchRows([emptyRow(), emptyRow(), emptyRow()]);
    setBatchDefaults({ company: '', assignedTo: '', rate: '' });
    setShowBatchAdd(false);
  };

  const batchValidCount = batchRows.filter((r) => r.name.trim()).length;

  // Edit helpers
  const handleEdit = (worker) => {
    setEditForm({
      name: worker.name,
      company: worker.company || '',
      assignedTo: worker.assignedTo || '',
      rate: worker.rate || '',
      notes: worker.notes || '',
    });
    setEditingId(worker.id);
  };

  const handleEditSave = () => {
    setTempWorkers((prev) =>
      prev.map((w) =>
        w.id === editingId
          ? { ...w, name: editForm.name.trim(), company: editForm.company.trim(), assignedTo: editForm.assignedTo, rate: editForm.rate.trim(), notes: editForm.notes.trim() }
          : w
      )
    );
    setEditingId(null);
  };

  const handleToggleActive = (id) => {
    setTempWorkers((prev) =>
      prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w))
    );
  };

  const filtered = tempWorkers.filter((w) => {
    if (filterStatus === 'active' && !w.active) return false;
    if (filterStatus === 'inactive' && w.active) return false;
    if (filterCrew !== 'All' && w.assignedTo !== filterCrew) return false;
    return true;
  });

  // Group by assigned crew
  const grouped = {};
  filtered.forEach((w) => {
    const key = w.assignedTo || 'Unassigned';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  });

  return (
    <div className="tla-container">
      <div className="tla-header">
        <div>
          <h2 className="tla-title">Temp Labor Management</h2>
          <p className="tla-subtitle">Assign temp workers to crew chiefs for time tracking and billing</p>
        </div>
        <button
          className="tla-add-btn"
          onClick={() => {
            setShowBatchAdd(true);
            setBatchRows([emptyRow(), emptyRow(), emptyRow()]);
            setBatchDefaults({ company: '', assignedTo: '', rate: '' });
          }}
        >
          + Add Temp Workers
        </button>
      </div>

      {/* Filters */}
      <div className="tla-filters">
        <div className="tla-filter-group">
          <label>Assigned To</label>
          <select value={filterCrew} onChange={(e) => setFilterCrew(e.target.value)}>
            <option value="All">All Crews</option>
            {crewNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
            <option value="">Unassigned</option>
          </select>
        </div>
        <div className="tla-filter-group">
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="tla-count">
          {filtered.length} temp worker{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Batch Add Table */}
      {showBatchAdd && (
        <div className="tla-batch-card">
          <div className="tla-batch-header">
            <h3 className="tla-form-title">Add Temp Workers</h3>
            <span className="tla-batch-hint">Fill in names below. Shared fields apply to all rows unless overridden.</span>
          </div>

          {/* Shared defaults */}
          <div className="tla-batch-defaults">
            <div className="tla-batch-default-field">
              <label>Default Company</label>
              <input
                type="text"
                value={batchDefaults.company}
                onChange={(e) => setBatchDefaults((d) => ({ ...d, company: e.target.value }))}
                placeholder="Applies to all"
              />
            </div>
            <div className="tla-batch-default-field">
              <label>Default Crew Chief</label>
              <select
                value={batchDefaults.assignedTo}
                onChange={(e) => setBatchDefaults((d) => ({ ...d, assignedTo: e.target.value }))}
              >
                <option value="">-- Select --</option>
                {crewNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="tla-batch-default-field">
              <label>Default Rate ($/hr)</label>
              <input
                type="text"
                value={batchDefaults.rate}
                onChange={(e) => setBatchDefaults((d) => ({ ...d, rate: e.target.value }))}
                placeholder="e.g. 25.00"
              />
            </div>
          </div>

          {/* Table */}
          <div className="tla-batch-table-wrap">
            <table className="tla-batch-table">
              <thead>
                <tr>
                  <th>Name *</th>
                  <th>Company</th>
                  <th>Assigned To</th>
                  <th>Rate</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateBatchRow(row.key, 'name', e.target.value)}
                        placeholder="Worker name"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.company}
                        onChange={(e) => updateBatchRow(row.key, 'company', e.target.value)}
                        placeholder={batchDefaults.company || 'Company'}
                      />
                    </td>
                    <td>
                      <select
                        value={row.assignedTo}
                        onChange={(e) => updateBatchRow(row.key, 'assignedTo', e.target.value)}
                      >
                        <option value="">{batchDefaults.assignedTo || '-- Default --'}</option>
                        {crewNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.rate}
                        onChange={(e) => updateBatchRow(row.key, 'rate', e.target.value)}
                        placeholder={batchDefaults.rate || '$/hr'}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => updateBatchRow(row.key, 'notes', e.target.value)}
                        placeholder="Notes"
                      />
                    </td>
                    <td>
                      {batchRows.length > 1 && (
                        <button className="tla-batch-remove" onClick={() => removeBatchRow(row.key)} title="Remove row">
                          &times;
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tla-batch-footer">
            <button className="tla-batch-add-row" onClick={addBatchRow}>
              + Add Row
            </button>
            <div className="tla-batch-actions">
              <button className="tla-form-cancel" onClick={() => setShowBatchAdd(false)}>Cancel</button>
              <button
                className="tla-form-submit"
                onClick={handleBatchSubmit}
                disabled={batchValidCount === 0}
              >
                Add {batchValidCount} Worker{batchValidCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (inline) */}
      {editingId && (
        <div className="tla-form-card">
          <h3 className="tla-form-title">Edit Temp Worker</h3>
          <div className="tla-form-grid">
            <div className="tla-form-field">
              <label>Name</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="tla-form-field">
              <label>Company</label>
              <input type="text" value={editForm.company} onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))} />
            </div>
            <div className="tla-form-field">
              <label>Assigned To</label>
              <select value={editForm.assignedTo} onChange={(e) => setEditForm((f) => ({ ...f, assignedTo: e.target.value }))}>
                <option value="">-- Select --</option>
                {crewNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="tla-form-field">
              <label>Rate ($/hr)</label>
              <input type="text" value={editForm.rate} onChange={(e) => setEditForm((f) => ({ ...f, rate: e.target.value }))} />
            </div>
          </div>
          <div className="tla-form-field tla-form-notes">
            <label>Notes</label>
            <textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="tla-form-actions">
            <button className="tla-form-cancel" onClick={() => setEditingId(null)}>Cancel</button>
            <button className="tla-form-submit" onClick={handleEditSave}>Save Changes</button>
          </div>
        </div>
      )}

      {/* Worker List */}
      {filtered.length === 0 ? (
        <div className="tla-empty">
          {tempWorkers.length === 0
            ? 'No temp workers added yet. Click "+ Add Temp Workers" to get started.'
            : 'No temp workers match the current filters.'}
        </div>
      ) : (
        Object.keys(grouped).sort().map((crewName) => (
          <div key={crewName} className="tla-group">
            <h3 className="tla-group-title">
              <span className="tla-group-badge">{grouped[crewName].length}</span>
              {crewName}
            </h3>
            <div className="tla-worker-grid">
              {grouped[crewName].map((worker) => (
                <div key={worker.id} className={`tla-worker-card${!worker.active ? ' inactive' : ''}`}>
                  <div className="tla-worker-header">
                    <div className="tla-worker-name">{worker.name}</div>
                    <div className="tla-worker-actions">
                      <button className="tla-worker-edit" onClick={() => handleEdit(worker)} title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className={`tla-worker-toggle${worker.active ? ' active' : ''}`}
                        onClick={() => handleToggleActive(worker.id)}
                        title={worker.active ? 'Deactivate' : 'Activate'}
                      >
                        {worker.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                  <div className="tla-worker-detail">
                    <div className="tla-worker-company">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      {worker.company || 'No company'}
                    </div>
                    {worker.rate && (
                      <div className="tla-worker-rate">${worker.rate}/hr</div>
                    )}
                  </div>
                  {worker.notes && (
                    <div className="tla-worker-notes">{worker.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TempLaborAdmin;
