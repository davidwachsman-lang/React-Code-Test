
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useCRM } from '../hooks/useCRM';
import { useCreateCRMRecord, useUpdateCRMRecord, useDeleteCRMRecord } from '../hooks/useCRMRecord';
import crmService from '../services/crmService';
import SalesFunnel from '../components/SalesFunnel';
import CRMTable from '../components/crm/CRMTable';
import CRMFilters from '../components/crm/CRMFilters';
import CRMForm from '../components/crm/CRMForm';
import CRMDetail from '../components/crm/CRMDetail';
import CRMFollowUpsDueWidget from '../components/crm/widgets/CRMFollowUpsDueWidget';
import CRMTopTargetsWidget from '../components/crm/widgets/CRMTopTargetsWidget';
import CRMPipelineStatsWidget from '../components/crm/widgets/CRMPipelineStatsWidget';
import CRMAtRiskCustomersWidget from '../components/crm/widgets/CRMAtRiskCustomersWidget';
import CRMVIPCustomersWidget from '../components/crm/widgets/CRMVIPCustomersWidget';
import CRMRecentActivitiesWidget from '../components/crm/widgets/CRMRecentActivitiesWidget';
import MassEmailModal from '../components/crm/MassEmailModal';
import './Page.css';
import './CRM.css';

const PlaybookTab = lazy(() => import('../components/crm/PlaybookTab'));
const FeatureUpgradesTab = lazy(() => import('../components/crm/FeatureUpgradesTab'));
const TopTargetsTab = lazy(() => import('../components/crm/TopTargetsTab'));
const ActivityTrackingTab = lazy(() => import('../components/crm/ActivityTrackingTab'));

function CRM() {
  const { data: crmRecordsData, loading, error, refetch } = useCRM();
  const [crmRecords, setCrmRecords] = useState(null);

  // Sync external data with local state
  useEffect(() => {
    if (crmRecordsData) {
      setCrmRecords(crmRecordsData);
    }
  }, [crmRecordsData]);
  const { mutate: createCRMRecord, loading: creating } = useCreateCRMRecord();
  const { mutate: updateCRMRecord, loading: updating } = useUpdateCRMRecord();
  const { mutate: deleteCRMRecord } = useDeleteCRMRecord();

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [parentRecord, setParentRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'hot', 'atRisk', 'inactive', 'lost', 'dashboard', 'funnel', 'playbook', 'roi', 'topTargets', 'featureUpgrades'
  const [selectedSalesRep, setSelectedSalesRep] = useState('all');
  const [filters, setFilters] = useState({
    relationship_stage: 'all',
    salesRep: 'all',
    topTargetsOnly: false,
    needsFollowup: false,
    prospectType: 'all',
    industry: 'all',
    searchTerm: ''
  });
  const [showMassEmailModal, setShowMassEmailModal] = useState(false);

  // Get parent records for dropdown
  const parentRecords = useMemo(() => {
    return (crmRecords || []).filter(r => !r.parent_id);
  }, [crmRecords]);

  // Filter records based on active tab and filters
  const filteredRecords = useMemo(() => {
    if (!crmRecords) return [];

    let filtered = [...crmRecords];

    // Apply tab filter (only for non-standard tabs)
    if (activeTab === 'hot') {
      // Use hot prospects view logic
      filtered = filtered.filter(r =>
        r.relationship_stage === 'prospect' && (
          r.is_top_target === true ||
          (r.next_followup_date && new Date(r.next_followup_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        )
      );
    } else if (activeTab === 'atRisk') {
      filtered = filtered.filter(r => r.relationship_stage === 'active_customer');
      // Additional filtering for at-risk would be done by the view
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(r => r.relationship_stage === 'inactive');
    } else if (activeTab === 'lost') {
      filtered = filtered.filter(r => r.relationship_stage === 'lost');
    }

    // Apply filters
    return filtered.filter(record => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch =
          (record.company_name || '').toLowerCase().includes(searchLower) ||
          (record.first_name || '').toLowerCase().includes(searchLower) ||
          (record.last_name || '').toLowerCase().includes(searchLower) ||
          (record.email || '').toLowerCase().includes(searchLower) ||
          (record.phone_primary || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Relationship stage filter
      if (filters.relationship_stage !== 'all' && record.relationship_stage !== filters.relationship_stage) return false;

      // Prospect type filter
      if (filters.prospectType !== 'all' && record.prospect_type !== filters.prospectType) return false;

      // Industry filter
      if (filters.industry !== 'all' && record.industry !== filters.industry) return false;

      // Top targets filter
      if (filters.topTargetsOnly && !record.is_top_target) return false;

      // Needs followup filter
      if (filters.needsFollowup) {
        if (!record.next_followup_date) return false;
        const today = new Date().toISOString().split('T')[0];
        if (record.next_followup_date > today) return false;
      }

      // Sales rep filter (simplified - would need user mapping in production)
      if (filters.salesRep !== 'all') {
        // This is a placeholder - in production, map sales rep names to UUIDs
      }

      return true;
    });
  }, [crmRecords, activeTab, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleCreateCRMRecord = async (recordData) => {
    try {
      const result = await createCRMRecord(() => crmService.create(recordData));
      setShowForm(false);
      setEditingRecord(null);
      refetch();
      return result;
    } catch (error) {
      console.error('Error creating CRM record:', error);
      alert('Failed to create CRM record: ' + error.message);
      throw error;
    }
  };

  const handleUpdateCRMRecord = async (recordData) => {
    try {
      const result = await updateCRMRecord(() => crmService.update(editingRecord.id, recordData));
      setShowForm(false);
      setEditingRecord(null);
      setViewingRecord(null);
      refetch();
      return result;
    } catch (error) {
      console.error('Error updating CRM record:', error);
      alert('Failed to update CRM record: ' + error.message);
      throw error;
    }
  };

  const handleDeleteCRMRecord = async (id) => {
    if (window.confirm('Are you sure you want to hide this CRM record? It will be permanently hidden from all CRM views but data will be preserved.')) {
      try {
        await deleteCRMRecord(() => crmService.delete(id));
        refetch();
      } catch (error) {
        console.error('Error hiding CRM record:', error);
        alert('Failed to hide CRM record: ' + error.message);
      }
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleView = async (record) => {
    setViewingRecord(record);
    if (record.parent_id) {
      try {
        const parent = await crmService.getById(record.parent_id);
        setParentRecord(parent);
      } catch (error) {
        setParentRecord(null);
      }
    } else {
      setParentRecord(null);
    }
  };

  const handleCreateParent = async (companyName) => {
    try {
      // Create a new parent record with just the company name
      const newParent = {
        prospect_type: 'commercial',
        parent_id: null, // Top-level record
        company_name: companyName,
        relationship_stage: 'prospect'
      };
      const result = await createCRMRecord(() => crmService.create(newParent));

      // Refresh the parent records list so it appears in the dropdown
      await refetch();

      return result;
    } catch (error) {
      console.error('Error creating parent:', error);
      alert('Failed to create parent company: ' + error.message);
      throw error;
    }
  };

  const handleToggleTopTarget = (recordId) => {
    // Optimistically update the record immediately without waiting for refetch
    // This prevents the page from reloading/scrolling
    if (crmRecords) {
      const updatedRecords = crmRecords.map(record =>
        record.id === recordId
          ? { ...record, is_top_target: !record.is_top_target }
          : record
      );
      setCrmRecords(updatedRecords);
    }
    // Refetch in the background after a delay to sync with server
    // The delay prevents the loading state from showing during the toggle
    setTimeout(() => {
      refetch();
    }, 2000);
  };

  // Calculate funnel layers from CRM records
  const funnelLayers = useMemo(() => {
    if (!crmRecords) return [];

    const today = new Date();
    const targetIdentified = crmRecords.filter(r => r.relationship_stage === 'prospect').length;
    const insightScheduled = crmRecords.filter(r => r.insight_meeting_date && new Date(r.insight_meeting_date) >= today).length;
    const insightCompleted = crmRecords.filter(r => r.insight_meeting_date && new Date(r.insight_meeting_date) < today).length;
    const presentation = crmRecords.filter(r => r.insight_meeting_date && r.relationship_stage === 'prospect').length;
    const initialCommitment = crmRecords.filter(r => r.relationship_stage === 'prospect' && r.first_referral_date).length;
    const firstReferral = crmRecords.filter(r => r.first_referral_date).length;
    const closed = crmRecords.filter(r => r.relationship_stage === 'active_customer').length;
    const msaSigned = crmRecords.filter(r => r.date_closed).length;

    // Use dummy data that shows descending funnel pattern
    // Each level should be smaller than the previous
    const dummyData = [
      { name: 'Target Identified', count: 100, color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', percentage: 100 },
      { name: 'Insight Meeting Scheduled', count: 75, color: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', percentage: 75 },
      { name: 'Insight Meeting Completed', count: 55, color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)', percentage: 55 },
      { name: 'Presentation to Client', count: 40, color: '#fde047', gradient: 'linear-gradient(135deg, #fde047 0%, #fbbf24 100%)', percentage: 40 },
      { name: 'Initial Commitment', count: 28, color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', percentage: 28 },
      { name: 'First Referral Received', count: 18, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', percentage: 18 },
      { name: 'Closed / First Job Reviewed', count: 12, color: '#1e40af', gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', percentage: 12 },
      { name: 'MSA Signed', count: 8, color: '#1e3a8a', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', percentage: 8 }
    ];

    return dummyData;
  }, [crmRecords]);

  return (
    <div className="page-container crm-page">
      <div className="crm-header">
        <h1>Customer Relationship Management</h1>
      </div>

      {error && (
        <div className="crm-error">
          <p>{error.message || 'Failed to load CRM records'}</p>
          <button onClick={refetch} disabled={loading}>
            Retry
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="crm-action-buttons">
        <button className="action-btn action-btn-blue" onClick={() => {
          setEditingRecord(null);
          setShowForm(true);
        }}>
          <span className="btn-icon">👤</span>
          Add CRM Record
        </button>
        <button className="action-btn action-btn-indigo" onClick={() => setShowMassEmailModal(true)}>
          <span className="btn-icon">✉️</span>
          Email Book
        </button>
        <button
          className={`action-btn ${activeTab === 'all' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('all')}
        >
          <span className="btn-icon">📋</span>
          CRM
        </button>
        <button
          className={`action-btn ${activeTab === 'funnel' ? 'action-btn-purple' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('funnel')}
        >
          <span className="btn-icon">📊</span>
          Sales Funnel
        </button>
        <button
          className={`action-btn ${activeTab === 'playbook' ? 'action-btn-orange' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('playbook')}
        >
          <span className="btn-icon">📋</span>
          Insight Meeting Playbook
        </button>
        <button
          className={`action-btn ${activeTab === 'activity' ? 'action-btn-blue' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('activity')}
        >
          <span className="btn-icon">📝</span>
          Activity Tracking
        </button>
        <button
          className={`action-btn ${activeTab === 'topTargets' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('topTargets')}
        >
          <span className="btn-icon">🎯</span>
          Top 10 Targets
        </button>
        <button
          className={`action-btn ${activeTab === 'featureUpgrades' ? 'action-btn-teal' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('featureUpgrades')}
        >
          <span className="btn-icon">✨</span>
          Feature Upgrades
        </button>
      </div>

      {/* CRM Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingRecord ? 'Edit CRM Record' : 'Add New CRM Record'}</h2>
              <button className="close-btn" onClick={() => {
                setShowForm(false);
                setEditingRecord(null);
              }}>×</button>
            </div>
            <CRMForm
              crmRecord={editingRecord}
              parentRecords={parentRecords}
              onSave={editingRecord ? handleUpdateCRMRecord : handleCreateCRMRecord}
              onCreateParent={handleCreateParent}
              onCancel={() => {
                setShowForm(false);
                setEditingRecord(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Mass Email Modal */}
      {showMassEmailModal && (
        <MassEmailModal onClose={() => setShowMassEmailModal(false)} />
      )}

      {/* Table Views */}
      {['all', 'hot', 'atRisk', 'inactive', 'lost'].includes(activeTab) && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>
              {activeTab === 'all' && 'All CRM Records'}
              {activeTab === 'hot' && 'Hot Prospects'}
              {activeTab === 'atRisk' && 'At-Risk Customers'}
              {activeTab === 'inactive' && 'Inactive Customers'}
              {activeTab === 'lost' && 'Lost Records'}
              {' '}({filteredRecords.length})
            </h2>
          </div>
          <CRMFilters filters={filters} onFilterChange={handleFilterChange} />
          {loading ? (
            <div className="crm-loading">
              <p>Loading CRM records...</p>
            </div>
          ) : (
            <CRMTable
              records={filteredRecords}
              onRecordClick={handleEdit}
              onToggleTopTarget={handleToggleTopTarget}
            />
          )}
                </div>
      )}

      {/* Dashboard View */}
      {activeTab === 'dashboard' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>CRM Dashboard</h2>
                </div>
          <div className="dashboard-grid">
            <div className="dashboard-widget">
              <CRMPipelineStatsWidget />
              </div>
            <div className="dashboard-widget">
              <CRMFollowUpsDueWidget onRecordClick={handleView} />
            </div>
            <div className="dashboard-widget">
              <CRMTopTargetsWidget onRecordClick={handleView} />
            </div>
            <div className="dashboard-widget">
              <CRMAtRiskCustomersWidget onRecordClick={handleView} />
            </div>
            <div className="dashboard-widget">
              <CRMVIPCustomersWidget onRecordClick={handleView} />
            </div>
            <div className="dashboard-widget">
              <CRMRecentActivitiesWidget onRecordClick={handleView} />
            </div>
          </div>
        </div>
      )}

      {/* Sales Funnel View */}
      {activeTab === 'funnel' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Sales Funnel</h2>
            <div className="funnel-filter">
              <label htmlFor="sales-rep-filter">Sales Rep:</label>
                  <select
                id="sales-rep-filter"
                value={selectedSalesRep}
                onChange={(e) => setSelectedSalesRep(e.target.value)}
                className="sales-rep-select"
              >
                <option value="all">All Reps</option>
                <option value="paige">Paige</option>
                <option value="tony">Tony</option>
                  </select>
                </div>
                </div>
          <SalesFunnel layers={funnelLayers} salesRep={selectedSalesRep} />
              </div>
      )}

      {/* Lazy-loaded tab views */}
      <Suspense fallback={<div className="crm-loading"><p>Loading...</p></div>}>
        {activeTab === 'playbook' && <PlaybookTab />}
        {activeTab === 'activity' && <ActivityTrackingTab />}
        {activeTab === 'topTargets' && <TopTargetsTab />}
        {activeTab === 'featureUpgrades' && <FeatureUpgradesTab />}
      </Suspense>

      {/* CRM Detail Modal */}
      {viewingRecord && (
        <CRMDetail
          crmRecord={viewingRecord}
          parentRecord={parentRecord}
          onEdit={handleEdit}
          onClose={() => {
            setViewingRecord(null);
            setParentRecord(null);
          }}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}

export default CRM;
