import React, { useEffect, useState } from 'react';
import featureUpgradesService from '../../services/featureUpgradesService';

function FeatureUpgradesTab() {
  const [featureUpgrades, setFeatureUpgrades] = useState([]);
  const [loadingFeatureUpgrades, setLoadingFeatureUpgrades] = useState(false);
  const [showFeatureUpgradeForm, setShowFeatureUpgradeForm] = useState(false);
  const [featureUpgradeFormData, setFeatureUpgradeFormData] = useState({
    salesRep: '',
    suggestedUpgrade: ''
  });
  const [editingFeatureUpgrade, setEditingFeatureUpgrade] = useState(null);

  useEffect(() => {
    const loadFeatureUpgrades = async () => {
      setLoadingFeatureUpgrades(true);
      try {
        const upgrades = await featureUpgradesService.getAll();
        setFeatureUpgrades(upgrades || []);
      } catch (error) {
        console.error('Error loading feature upgrades:', error);
        setFeatureUpgrades([]);
      } finally {
        setLoadingFeatureUpgrades(false);
      }
    };

    loadFeatureUpgrades();
  }, []);

  const handleFeatureUpgradeSubmit = async (e) => {
    e.preventDefault();
    if (!featureUpgradeFormData.salesRep || !featureUpgradeFormData.suggestedUpgrade.trim()) {
      alert('Please select a sales rep and enter a feature upgrade suggestion.');
      return;
    }

    setLoadingFeatureUpgrades(true);
    try {
      if (editingFeatureUpgrade) {
        await featureUpgradesService.update(editingFeatureUpgrade.id, {
          sales_rep: featureUpgradeFormData.salesRep,
          suggested_upgrade: featureUpgradeFormData.suggestedUpgrade.trim()
        });
      } else {
        await featureUpgradesService.create({
          sales_rep: featureUpgradeFormData.salesRep,
          suggested_upgrade: featureUpgradeFormData.suggestedUpgrade.trim()
        });
      }

      const upgrades = await featureUpgradesService.getAll();
      setFeatureUpgrades(upgrades || []);

      setFeatureUpgradeFormData({ salesRep: '', suggestedUpgrade: '' });
      setShowFeatureUpgradeForm(false);
      setEditingFeatureUpgrade(null);
    } catch (error) {
      console.error('Error saving feature upgrade:', error);
      alert('Failed to save feature upgrade: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingFeatureUpgrades(false);
    }
  };

  const handleDeleteFeatureUpgrade = async (id) => {
    if (!confirm('Are you sure you want to delete this feature upgrade suggestion?')) {
      return;
    }

    setLoadingFeatureUpgrades(true);
    try {
      await featureUpgradesService.delete(id);
      const upgrades = await featureUpgradesService.getAll();
      setFeatureUpgrades(upgrades || []);
    } catch (error) {
      console.error('Error deleting feature upgrade:', error);
      alert('Failed to delete feature upgrade: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingFeatureUpgrades(false);
    }
  };

  const handleEditFeatureUpgrade = (upgrade) => {
    setEditingFeatureUpgrade(upgrade);
    setFeatureUpgradeFormData({
      salesRep: upgrade.sales_rep,
      suggestedUpgrade: upgrade.suggested_upgrade
    });
    setShowFeatureUpgradeForm(true);
  };

  return (
    <>
      <div className="customers-container">
        <div className="customers-header">
          <h2>Feature Upgrades</h2>
          <button
            className="btn-primary"
            onClick={() => {
              setEditingFeatureUpgrade(null);
              setFeatureUpgradeFormData({ salesRep: '', suggestedUpgrade: '' });
              setShowFeatureUpgradeForm(true);
            }}
          >
            + Add Feature Upgrade
          </button>
        </div>

        {loadingFeatureUpgrades ? (
          <div className="crm-loading">
            <p>Loading feature upgrades...</p>
          </div>
        ) : (
          <div className="feature-upgrades-container">
            {featureUpgrades.length === 0 ? (
              <div className="empty-state">
                <p>No feature upgrades yet. Click "Add Feature Upgrade" to suggest a new feature.</p>
              </div>
            ) : (
              <table className="feature-upgrades-table">
                <thead>
                  <tr>
                    <th>Sales Rep</th>
                    <th>Suggested Upgrade</th>
                    <th>Status</th>
                    <th>Date Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {featureUpgrades.map((upgrade) => (
                    <tr key={upgrade.id}>
                      <td>{upgrade.sales_rep}</td>
                      <td>{upgrade.suggested_upgrade}</td>
                      <td>
                        <span className={`status-badge status-${upgrade.status || 'pending'}`}>
                          {(upgrade.status || 'pending').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td>{new Date(upgrade.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn-edit"
                          onClick={() => handleEditFeatureUpgrade(upgrade)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteFeatureUpgrade(upgrade.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Feature Upgrade Form Modal */}
      {showFeatureUpgradeForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingFeatureUpgrade ? 'Edit Feature Upgrade' : 'Add Feature Upgrade'}</h2>
              <button className="close-btn" onClick={() => {
                setShowFeatureUpgradeForm(false);
                setEditingFeatureUpgrade(null);
                setFeatureUpgradeFormData({ salesRep: '', suggestedUpgrade: '' });
              }}>×</button>
            </div>
            <form onSubmit={handleFeatureUpgradeSubmit}>
              <div className="form-group">
                <label htmlFor="salesRep">Sales Rep *</label>
                <select
                  id="salesRep"
                  value={featureUpgradeFormData.salesRep}
                  onChange={(e) => setFeatureUpgradeFormData({...featureUpgradeFormData, salesRep: e.target.value})}
                  required
                >
                  <option value="">Select sales rep...</option>
                  <option value="Ainsley">Ainsley</option>
                  <option value="Amy">Amy</option>
                  <option value="Bri">Bri</option>
                  <option value="David">David</option>
                  <option value="Joe">Joe</option>
                  <option value="Mike">Mike</option>
                  <option value="Paige">Paige</option>
                  <option value="Tony">Tony</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="suggestedUpgrade">Suggested Feature Upgrade *</label>
                <textarea
                  id="suggestedUpgrade"
                  value={featureUpgradeFormData.suggestedUpgrade}
                  onChange={(e) => setFeatureUpgradeFormData({...featureUpgradeFormData, suggestedUpgrade: e.target.value})}
                  placeholder="Describe the feature upgrade you'd like to suggest..."
                  rows="5"
                  required
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
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowFeatureUpgradeForm(false);
                    setEditingFeatureUpgrade(null);
                    setFeatureUpgradeFormData({ salesRep: '', suggestedUpgrade: '' });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loadingFeatureUpgrades}
                >
                  {loadingFeatureUpgrades ? 'Saving...' : editingFeatureUpgrade ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default FeatureUpgradesTab;
