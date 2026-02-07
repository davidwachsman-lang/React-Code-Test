import React, { useEffect, useState } from 'react';
import topTargetsService from '../../services/topTargetsService';

const topTargetsSections = [
  { name: 'HB Nashville', reps: ['Ainsley', 'Joe', 'Paige'] },
  { name: 'National', reps: ['Tony'] }
];
const allTopTargetsReps = topTargetsSections.flatMap(section => section.reps);

const initialTargetsData = {
  'Tony': [
    'Cushman & Wakefield',
    'Avison Young',
    'Charles Hawkins Co',
    'Commonwealth Commercial Partners',
    'Holladay Properties',
    'Brookside Properties',
    'Lincoln Property Company',
    'Taubman Centers, Inc.',
    'Southeast Venture LLC',
    'Tony G (nashRE)'
  ],
  'Paige': [
    'Willow Bridge',
    'Greystar',
    'Avison Young',
    'Lion Real Estate Group',
    'Schatten Properties',
    'New Earth Residential',
    'TC Restaurant Group',
    'Evergreen',
    'Colliers',
    'Fairfield Residential',
    'Freeman Webb (Local)'
  ]
};

function TopTargetsTab() {
  const [topTargetsData, setTopTargetsData] = useState({});
  const [loadingTopTargets, setLoadingTopTargets] = useState(false);
  const [showTopTargetModal, setShowTopTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [targetFormData, setTargetFormData] = useState({
    companyName: '',
    status: '',
    notes: ''
  });

  useEffect(() => {
    const loadTopTargets = async () => {
      setLoadingTopTargets(true);
      try {
        const allTargets = await topTargetsService.getAll();

        const targetsObj = {};
        allTopTargetsReps.forEach(rep => {
          targetsObj[rep] = {};
          for (let i = 1; i <= 10; i++) {
            targetsObj[rep][i] = { companyName: '', status: '', notes: '', id: null };
          }
        });

        allTargets.forEach(target => {
          const repName = target.sales_rep.charAt(0).toUpperCase() + target.sales_rep.slice(1).toLowerCase();
          if (targetsObj[repName] && target.target_position >= 1 && target.target_position <= 10) {
            targetsObj[repName][target.target_position] = {
              companyName: target.company_name || '',
              status: target.status || '',
              notes: target.notes || '',
              id: target.id
            };
          }
        });

        setTopTargetsData(targetsObj);
        setLoadingTopTargets(false);

        let needsSync = false;
        for (const [salesRep, targets] of Object.entries(initialTargetsData)) {
          const existingTargets = allTargets.filter(
            t => t.sales_rep.toLowerCase() === salesRep.toLowerCase()
          );
          if (existingTargets.length === 0 ||
              (targets.length > 0 && existingTargets[0]?.company_name !== targets[0])) {
            needsSync = true;
            break;
          }
        }

        if (needsSync) {
          console.log('Syncing targets data in background...');
          const syncPromises = [];

          for (const [salesRep, targets] of Object.entries(initialTargetsData)) {
            for (let i = 0; i < targets.length && i < 10; i++) {
              const existingTarget = allTargets.find(
                t => t.sales_rep.toLowerCase() === salesRep.toLowerCase() && t.target_position === i + 1
              );
              if (!existingTarget || existingTarget.company_name !== targets[i]) {
                syncPromises.push(
                  topTargetsService.upsert({
                    sales_rep: salesRep,
                    target_position: i + 1,
                    company_name: targets[i],
                    status: existingTarget?.status || null
                  })
                );
              }
            }
          }

          if (syncPromises.length > 0) {
            await Promise.all(syncPromises);
            const reloadedTargets = await topTargetsService.getAll();
            const updatedTargetsObj = {};
            allTopTargetsReps.forEach(rep => {
              updatedTargetsObj[rep] = {};
              for (let i = 1; i <= 10; i++) {
                updatedTargetsObj[rep][i] = { companyName: '', status: '', notes: '', id: null };
              }
            });
            reloadedTargets.forEach(target => {
              const repName = target.sales_rep.charAt(0).toUpperCase() + target.sales_rep.slice(1).toLowerCase();
              if (updatedTargetsObj[repName] && target.target_position >= 1 && target.target_position <= 10) {
                updatedTargetsObj[repName][target.target_position] = {
                  companyName: target.company_name || '',
                  status: target.status || '',
                  notes: target.notes || '',
                  id: target.id
                };
              }
            });
            setTopTargetsData(updatedTargetsObj);
          }
        }
      } catch (error) {
        console.error('Error loading top targets:', error);
        setLoadingTopTargets(false);
      }
    };

    loadTopTargets();
  }, []);

  const handleTargetCellClick = (salesRep, position) => {
    const target = topTargetsData[salesRep]?.[position] || { companyName: '', status: '', notes: '', id: null };
    setEditingTarget({ salesRep, position, id: target.id });
    setTargetFormData({
      companyName: target.companyName,
      status: target.status,
      notes: target.notes || ''
    });
    setShowTopTargetModal(true);
  };

  const handleTargetFormSubmit = async (e) => {
    e.preventDefault();
    if (!editingTarget) return;

    setLoadingTopTargets(true);
    try {
      await topTargetsService.upsert({
        sales_rep: editingTarget.salesRep,
        target_position: editingTarget.position,
        company_name: targetFormData.companyName.trim() || null,
        status: targetFormData.status || null,
        notes: targetFormData.notes.trim() || null
      });

      const allTargets = await topTargetsService.getAll();
      const targetsObj = {};

      allTopTargetsReps.forEach(rep => {
        targetsObj[rep] = {};
        for (let i = 1; i <= 10; i++) {
          targetsObj[rep][i] = { companyName: '', status: '', notes: '', id: null };
        }
      });

      allTargets.forEach(target => {
        const repName = target.sales_rep.charAt(0).toUpperCase() + target.sales_rep.slice(1).toLowerCase();
        if (targetsObj[repName] && target.target_position >= 1 && target.target_position <= 10) {
          targetsObj[repName][target.target_position] = {
            companyName: target.company_name || '',
            status: target.status || '',
            notes: target.notes || '',
            id: target.id
          };
        }
      });

      setTopTargetsData(targetsObj);
      setShowTopTargetModal(false);
      setEditingTarget(null);
    } catch (error) {
      console.error('Error saving target:', error);
      alert('Failed to save target: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingTopTargets(false);
    }
  };

  return (
    <>
      <div className="customers-container">
        <div className="customers-header">
          <h2>Top 10 Targets</h2>
        </div>
        {loadingTopTargets ? (
          <div className="crm-loading">
            <p>Loading targets...</p>
          </div>
        ) : (
          <div className="top-targets-table-container">
            <table className="top-targets-table">
              <thead>
                <tr>
                  <th rowSpan="2" className="top-targets-position-header">Position</th>
                  {topTargetsSections.map(section => (
                    <th key={section.name} colSpan={section.reps.length} className="top-targets-section-header">
                      {section.name}
                    </th>
                  ))}
                </tr>
                <tr>
                  {topTargetsSections.map(section =>
                    section.reps.map(rep => (
                      <th key={rep} className="top-targets-rep-header">{rep}</th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(position => (
                  <tr key={position}>
                    <td className="top-targets-position-cell">{position}</td>
                    {topTargetsSections.map(section =>
                      section.reps.map(rep => {
                        const target = topTargetsData[rep]?.[position] || { companyName: '', status: '', notes: '', id: null };
                        const statusClass = target.status ? `top-targets-status-${target.status}` : '';
                        return (
                          <td
                            key={rep}
                            className={`top-targets-cell ${statusClass}`}
                            onClick={() => handleTargetCellClick(rep, position)}
                            title={target.notes ? `Notes: ${target.notes}` : ''}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {target.companyName || <span className="top-targets-empty">Click to add</span>}
                              {target.notes && (
                                <span style={{ fontSize: '0.85rem', color: '#60a5fa', flexShrink: 0 }} title={target.notes}>📝</span>
                              )}
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Target Edit Modal */}
      {showTopTargetModal && editingTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Edit Target - {editingTarget.salesRep} (Position {editingTarget.position})</h2>
              <button className="close-btn" onClick={() => {
                setShowTopTargetModal(false);
                setEditingTarget(null);
              }}>×</button>
            </div>
            <form onSubmit={handleTargetFormSubmit}>
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  value={targetFormData.companyName}
                  onChange={(e) => setTargetFormData({...targetFormData, companyName: e.target.value})}
                  placeholder="Enter company name"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={targetFormData.status}
                  onChange={(e) => setTargetFormData({...targetFormData, status: e.target.value})}
                >
                  <option value="">Select status...</option>
                  <option value="red">🔴 Stalled / Needs Help</option>
                  <option value="yellow">🟡 Active but Unvalidated - Risk Remains</option>
                  <option value="green">🟢 Validated & Advancing</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={targetFormData.notes}
                  onChange={(e) => setTargetFormData({...targetFormData, notes: e.target.value})}
                  placeholder="Add notes about this target..."
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    color: '#f1f5f9',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setShowTopTargetModal(false);
                  setEditingTarget(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loadingTopTargets}>
                  {loadingTopTargets ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default TopTargetsTab;
