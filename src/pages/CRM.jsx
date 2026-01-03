
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useCRM, useTopTargets, useCRMNeedingFollowup, useActiveProspects, useHotProspects, useAtRiskCustomers } from '../hooks/useCRM';
import { useCreateCRMRecord, useUpdateCRMRecord, useDeleteCRMRecord } from '../hooks/useCRMRecord';
import crmService from '../services/crmService';
import SalesFunnel from '../components/SalesFunnel';
import CRMTable from '../components/crm/CRMTable';
import ROITable from '../components/crm/ROITable';
import CRMFilters from '../components/crm/CRMFilters';
import CRMForm from '../components/crm/CRMForm';
import CRMDetail from '../components/crm/CRMDetail';
import CRMFollowUpsDueWidget from '../components/crm/widgets/CRMFollowUpsDueWidget';
import CRMTopTargetsWidget from '../components/crm/widgets/CRMTopTargetsWidget';
import CRMPipelineStatsWidget from '../components/crm/widgets/CRMPipelineStatsWidget';
import CRMAtRiskCustomersWidget from '../components/crm/widgets/CRMAtRiskCustomersWidget';
import CRMVIPCustomersWidget from '../components/crm/widgets/CRMVIPCustomersWidget';
import CRMRecentActivitiesWidget from '../components/crm/widgets/CRMRecentActivitiesWidget';
import ActivityForm from '../components/ActivityForm';
import { jsPDF } from 'jspdf';
import './Page.css';
import './CRM.css';

function CRM() {
  const { data: crmRecordsData, loading, error, refetch } = useCRM();
  const [crmRecords, setCrmRecords] = useState(null);
  const [roiData, setRoiData] = useState(null);
  const [roiLoading, setRoiLoading] = useState(false);
  
  // Sync external data with local state
  useEffect(() => {
    if (crmRecordsData) {
      setCrmRecords(crmRecordsData);
    }
  }, [crmRecordsData]);
  const { mutate: createCRMRecord, loading: creating } = useCreateCRMRecord();
  const { mutate: updateCRMRecord, loading: updating } = useUpdateCRMRecord();
  const { mutate: deleteCRMRecord, loading: deleting } = useDeleteCRMRecord();

  const saving = creating || updating;

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [parentRecord, setParentRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'hot', 'atRisk', 'inactive', 'lost', 'dashboard', 'funnel', 'playbook', 'roi'
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
  const [showQuickActivityForm, setShowQuickActivityForm] = useState(false);
  const [quickActivityRecord, setQuickActivityRecord] = useState(null);

  const [playbookFormData, setPlaybookFormData] = useState({
    // Contact Section
    contactName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    contactCompany: '',
    
    // Property Section
    propertyAddress: '',
    propertyType: '',
    propertySize: '',
    propertyAge: '',
    numberOfBuildings: '',
    currentChallenges: '',
    
    // Process Section
    currentProcess: '',
    processChallenges: '',
    
    // Current Providers Section
    currentProviders: '',
    providerSatisfaction: '',
    providerImprovements: '',
    
    // Maintenance / Management Section
    numberOfMaintenanceEngineers: '',
    lastTraining: '',
    equipment: '',
    
    // Loss History Section
    recentLosses: '',
    lastEvent: '',
    eventType24Months: [],
    outsourcingScale: '',
    protocolForCallout: '',
    eventsAnnually: '',
    
    // Organization Structure Section
    portfolioManagers: '',
    regionalManagers: '',
    propertyManagers: '',
    maintenanceSupervisors: '',
    directorEngineeringMaintenance: '',
    
    // Commitment Section
    projectedJobDate: '',
    interactionPlanStrategy: ''
  });

  // Helper function to format phone numbers
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

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

  const handleQuickLogActivity = (record) => {
    setQuickActivityRecord(record);
    setShowQuickActivityForm(true);
  };

  const handleQuickActivitySave = async (activityData) => {
    try {
      const { crmActivityService } = await import('../services/crmActivityService');
      await crmActivityService.create({ ...activityData, crm_id: quickActivityRecord.id });
      setShowQuickActivityForm(false);
      setQuickActivityRecord(null);
      refetch();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Failed to save activity: ' + error.message);
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

  // Generate PDF for playbook (keeping existing functionality)
  const generatePDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;
    const sectionSpacing = 5;

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredSpace = 10) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    // Helper function to add text with word wrap
    const addText = (text, x, y, maxWidth, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text || 'N/A', maxWidth);
      doc.text(lines, x, y);
      return lines.length * lineHeight;
    };

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Insight Meeting Playbook', margin, yPosition);
    yPosition += 10;

    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += sectionSpacing + 5;

    // Section 1: Contact
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('1. Contact', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Name: ${playbookFormData.contactName}`, margin, yPosition, 170);
    yPosition += addText(`Title: ${playbookFormData.contactTitle}`, margin, yPosition, 170);
    yPosition += addText(`Email: ${playbookFormData.contactEmail}`, margin, yPosition, 170);
    yPosition += addText(`Phone: ${playbookFormData.contactPhone}`, margin, yPosition, 170);
    yPosition += addText(`Company: ${playbookFormData.contactCompany}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 2: Property
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('2. Property', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Property Address: ${playbookFormData.propertyAddress}`, margin, yPosition, 170);
    yPosition += addText(`Property Type: ${playbookFormData.propertyType}`, margin, yPosition, 170);
    yPosition += addText(`Property Size: ${playbookFormData.propertySize}`, margin, yPosition, 170);
    yPosition += addText(`Property Age: ${playbookFormData.propertyAge}`, margin, yPosition, 170);
    yPosition += addText(`Number of Buildings: ${playbookFormData.numberOfBuildings}`, margin, yPosition, 170);
    yPosition += addText(`Current Challenges: ${playbookFormData.currentChallenges}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 3: Process
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('3. Process', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Current Process: ${playbookFormData.currentProcess}`, margin, yPosition, 170);
    yPosition += addText(`Process Challenges: ${playbookFormData.processChallenges}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 4: Current Providers
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('4. Current Providers', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Current Providers: ${playbookFormData.currentProviders}`, margin, yPosition, 170);
    yPosition += addText(`Provider Satisfaction: ${playbookFormData.providerSatisfaction}`, margin, yPosition, 170);
    yPosition += addText(`How/What could they improve?: ${playbookFormData.providerImprovements}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 5: Maintenance / Management
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('5. Maintenance / Management', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Number of maintenance / engineers: ${playbookFormData.numberOfMaintenanceEngineers}`, margin, yPosition, 170);
    yPosition += addText(`Last Training (What/When): ${playbookFormData.lastTraining}`, margin, yPosition, 170);
    yPosition += addText(`Equipment (Dehus, air movers, moister readers): ${playbookFormData.equipment}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 6: Loss History
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('6. Loss History', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Recent Losses: ${playbookFormData.recentLosses}`, margin, yPosition, 170);
    yPosition += addText(`Last Event (When / Details): ${playbookFormData.lastEvent}`, margin, yPosition, 170);
    const eventTypes = playbookFormData.eventType24Months.length > 0 
      ? playbookFormData.eventType24Months.join(', ') 
      : 'None';
    yPosition += addText(`Event Type in last 24 months: ${eventTypes}`, margin, yPosition, 170);
    yPosition += addText(`Emergency event Outsourcing Scale: ${playbookFormData.outsourcingScale}`, margin, yPosition, 170);
    yPosition += addText(`Protocol for deciding what gets called out: ${playbookFormData.protocolForCallout}`, margin, yPosition, 170);
    yPosition += addText(`Number of events annually: ${playbookFormData.eventsAnnually}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 7: Organization Structure
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('7. Organization Structure', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Portfolio Managers: ${playbookFormData.portfolioManagers}`, margin, yPosition, 170);
    yPosition += addText(`Regional Managers: ${playbookFormData.regionalManagers}`, margin, yPosition, 170);
    yPosition += addText(`Property Managers: ${playbookFormData.propertyManagers}`, margin, yPosition, 170);
    yPosition += addText(`Maintenance Supervisors: ${playbookFormData.maintenanceSupervisors}`, margin, yPosition, 170);
    yPosition += addText(`Director of Engineering / Maintenance: ${playbookFormData.directorEngineeringMaintenance}`, margin, yPosition, 170);
    yPosition += sectionSpacing;

    // Section 8: Commitment
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('8. Commitment', margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    yPosition += addText(`Projected Job Date: ${playbookFormData.projectedJobDate}`, margin, yPosition, 170);
    yPosition += addText(`Initial Commitment Interaction Plan / Strategy: ${playbookFormData.interactionPlanStrategy}`, margin, yPosition, 170);

    // Save the PDF
    const fileName = `Insight_Meeting_Playbook_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
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
        <button 
          className={`action-btn ${activeTab === 'all' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveTab('all')}
        >
          <span className="btn-icon">📋</span>
          CRM
        </button>
        <button 
          className={`action-btn ${activeTab === 'roi' ? 'action-btn-blue' : 'action-btn-gray'}`}
          onClick={async () => {
            setActiveTab('roi');
            setRoiLoading(true);
            try {
              const data = await crmService.getROIData();
              console.log('ROI data loaded:', data);
              setRoiData(data || []);
            } catch (err) {
              console.error('Error loading ROI data:', err);
              alert('Failed to load ROI data: ' + err.message);
              setRoiData([]);
            } finally {
              setRoiLoading(false);
            }
          }}
        >
          <span className="btn-icon">📈</span>
          ROI View
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
      </div>

      {/* CRM Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => {
          setShowForm(false);
          setEditingRecord(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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

      {/* Quick Activity Form Modal */}
      {showQuickActivityForm && quickActivityRecord && (
        <div className="modal-overlay" onClick={() => {
          setShowQuickActivityForm(false);
          setQuickActivityRecord(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quick Log Activity - {quickActivityRecord.company_name || 'Unnamed'}</h2>
              <button className="close-btn" onClick={() => {
                setShowQuickActivityForm(false);
                setQuickActivityRecord(null);
              }}>×</button>
            </div>
            <ActivityForm
              crmId={quickActivityRecord.id}
              onSave={handleQuickActivitySave}
              onCancel={() => {
                setShowQuickActivityForm(false);
                setQuickActivityRecord(null);
              }}
            />
          </div>
        </div>
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
              onQuickLogActivity={handleQuickLogActivity}
              onToggleTopTarget={handleToggleTopTarget}
              onDelete={handleDeleteCRMRecord}
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

      {/* ROI View */}
      {activeTab === 'roi' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>ROI View</h2>
          </div>
          {roiLoading ? (
            <div className="crm-loading">
              <p>Loading ROI data...</p>
            </div>
          ) : roiData && roiData.length > 0 ? (
            <ROITable
              records={roiData}
              onRecordClick={handleEdit}
            />
          ) : (
            <div className="crm-table-empty">
              <p>No ROI data available. {roiData === null ? 'Click "ROI View" to load data.' : 'No records found.'}</p>
            </div>
          )}
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
                <option value="bri">Bri</option>
                <option value="paige">Paige</option>
                <option value="matt">Matt</option>
                <option value="tony">Tony</option>
                  </select>
                </div>
                </div>
          <SalesFunnel layers={funnelLayers} salesRep={selectedSalesRep} />
              </div>
      )}

      {/* Insight Meeting Playbook View - Keep existing implementation */}
      {activeTab === 'playbook' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Insight Meeting Playbook</h2>
              </div>
          <div className="playbook-form-container">
            <form className="playbook-form" onSubmit={(e) => {
              e.preventDefault();
              // TODO: Save to Supabase or email output
              console.log('Playbook form data:', playbookFormData);
              alert('Form data ready for Supabase/email integration');
            }}>
              {/* Section 1: Contact */}
              <div className="form-section-header">1. Contact</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    name="contactName"
                    value={playbookFormData.contactName}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactName: e.target.value})}
                    placeholder="Full name"
                  />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    name="contactTitle"
                    value={playbookFormData.contactTitle}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactTitle: e.target.value})}
                    placeholder="Job title"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={playbookFormData.contactEmail}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactEmail: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={playbookFormData.contactPhone}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactPhone: formatPhoneNumber(e.target.value)})}
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  name="contactCompany"
                  value={playbookFormData.contactCompany}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, contactCompany: e.target.value})}
                  placeholder="Company name"
                />
              </div>

              <div className="form-section-divider"></div>

              {/* Section 2: Property */}
              <div className="form-section-header">2. Property</div>
              <div className="form-group">
                <label>Property Address</label>
                <input
                  type="text"
                  name="propertyAddress"
                  value={playbookFormData.propertyAddress}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, propertyAddress: e.target.value})}
                  placeholder="Full property address"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Property Type</label>
                  <select
                    name="propertyType"
                    value={playbookFormData.propertyType}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, propertyType: e.target.value})}
                  >
                    <option value="">Select type...</option>
                    <option value="multi-family">Multi-Family (Apts)</option>
                    <option value="condos">Condos</option>
                    <option value="office">Office</option>
                    <option value="education">Education</option>
                    <option value="industrial">Industrial</option>
                    <option value="medical">Medical</option>
                    <option value="retail">Retail</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Property Size (sq ft)</label>
                  <input
                    type="text"
                    name="propertySize"
                    value={playbookFormData.propertySize}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, propertySize: e.target.value})}
                    placeholder="Square footage"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Property Age</label>
                  <input
                    type="text"
                    name="propertyAge"
                    value={playbookFormData.propertyAge}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, propertyAge: e.target.value})}
                    placeholder="Years or year built"
                  />
                </div>
                <div className="form-group">
                  <label>Number of Buildings</label>
                  <input
                    type="text"
                    name="numberOfBuildings"
                    value={playbookFormData.numberOfBuildings}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, numberOfBuildings: e.target.value})}
                    placeholder="Total buildings"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Current Challenges at Property</label>
                <textarea
                  name="currentChallenges"
                  value={playbookFormData.currentChallenges}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, currentChallenges: e.target.value})}
                  placeholder="Describe current challenges at the property"
                  rows="3"
                />
              </div>

              <div className="form-section-divider"></div>

              {/* Section 3: Process */}
              <div className="form-section-header">3. Process</div>
              <div className="form-group">
                <label>Current Process</label>
                <textarea
                  name="currentProcess"
                  value={playbookFormData.currentProcess}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, currentProcess: e.target.value})}
                  placeholder="Describe their current process for handling restoration/maintenance"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Process Challenges</label>
                <textarea
                  name="processChallenges"
                  value={playbookFormData.processChallenges}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, processChallenges: e.target.value})}
                  placeholder="What challenges do they face with their current process?"
                  rows="3"
                />
          </div>

              <div className="form-section-divider"></div>

              {/* Section 4: Current Providers */}
              <div className="form-section-header">4. Current Providers</div>
              <div className="form-group">
                <label>Current Providers</label>
                <textarea
                  name="currentProviders"
                  value={playbookFormData.currentProviders}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, currentProviders: e.target.value})}
                  placeholder="List current service providers, vendors, or contractors"
                  rows="3"
                />
          </div>
              <div className="form-group">
                <label>Provider Satisfaction Level</label>
                <select
                  name="providerSatisfaction"
                  value={playbookFormData.providerSatisfaction}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, providerSatisfaction: e.target.value})}
                >
                  <option value="">Select...</option>
                  <option value="very-satisfied">Very Satisfied</option>
                  <option value="satisfied">Satisfied</option>
                  <option value="neutral">Neutral</option>
                  <option value="dissatisfied">Dissatisfied</option>
                  <option value="very-dissatisfied">Very Dissatisfied</option>
                </select>
          </div>
              <div className="form-group">
                <label>How/What could they improve?</label>
                <textarea
                  name="providerImprovements"
                  value={playbookFormData.providerImprovements}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, providerImprovements: e.target.value})}
                  placeholder="What improvements could be made with current providers?"
                  rows="2"
                />
      </div>

              <div className="form-section-divider"></div>

              {/* Section 5: Maintenance / Management */}
              <div className="form-section-header">5. Maintenance / Management</div>
              <div className="form-group">
                <label>Number of maintenance / engineers</label>
                <input
                  type="text"
                  name="numberOfMaintenanceEngineers"
                  value={playbookFormData.numberOfMaintenanceEngineers}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, numberOfMaintenanceEngineers: e.target.value})}
                  placeholder="Number of maintenance staff/engineers"
                />
              </div>
              <div className="form-group">
                <label>Last Training (What/When)</label>
                <textarea
                  name="lastTraining"
                  value={playbookFormData.lastTraining}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, lastTraining: e.target.value})}
                  placeholder="What training was provided and when?"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Equipment (Dehus, air movers, moisture readers)</label>
                <textarea
                  name="equipment"
                  value={playbookFormData.equipment}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, equipment: e.target.value})}
                  placeholder="List equipment available (dehumidifiers, air movers, moisture readers, etc.)"
                  rows="2"
                />
            </div>

              <div className="form-section-divider"></div>

              {/* Section 6: Loss History */}
              <div className="form-section-header">6. Loss History</div>
              <div className="form-group">
                <label>Recent Losses</label>
                <textarea
                  name="recentLosses"
                  value={playbookFormData.recentLosses}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, recentLosses: e.target.value})}
                  placeholder="Describe recent losses or incidents"
                  rows="3"
                />
                  </div>
              <div className="form-group">
                <label>Last Event (When / Details)</label>
                <textarea
                  name="lastEvent"
                  value={playbookFormData.lastEvent}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, lastEvent: e.target.value})}
                  placeholder="When was the last event and what were the details?"
                  rows="2"
                />
                  </div>
              <div className="form-group">
                <label>Event Type in last 24 months</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playbookFormData.eventType24Months.includes('water')}
                      onChange={(e) => {
                        const current = playbookFormData.eventType24Months;
                        const updated = e.target.checked
                          ? [...current, 'water']
                          : current.filter(t => t !== 'water');
                        setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                      }}
                    />
                    Water
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playbookFormData.eventType24Months.includes('fire')}
                      onChange={(e) => {
                        const current = playbookFormData.eventType24Months;
                        const updated = e.target.checked
                          ? [...current, 'fire']
                          : current.filter(t => t !== 'fire');
                        setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                      }}
                    />
                    Fire
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playbookFormData.eventType24Months.includes('mold')}
                      onChange={(e) => {
                        const current = playbookFormData.eventType24Months;
                        const updated = e.target.checked
                          ? [...current, 'mold']
                          : current.filter(t => t !== 'mold');
                        setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                      }}
                    />
                    Mold
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playbookFormData.eventType24Months.includes('bio')}
                      onChange={(e) => {
                        const current = playbookFormData.eventType24Months;
                        const updated = e.target.checked
                          ? [...current, 'bio']
                          : current.filter(t => t !== 'bio');
                        setPlaybookFormData({...playbookFormData, eventType24Months: updated});
                      }}
                    />
                    Bio
                  </label>
                  </div>
                  </div>
              <div className="form-group">
                <label>Emergency event Outsourcing Scale (1-10)</label>
                <select
                  name="outsourcingScale"
                  value={playbookFormData.outsourcingScale}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, outsourcingScale: e.target.value})}
                >
                  <option value="">Select scale...</option>
                  <option value="1">1 - They only call if floors and walls are penetrated and multiple units are affected</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10 - They don't clean up anything themselves</option>
                </select>
                </div>
              <div className="form-group">
                <label>Protocol for deciding what gets called out</label>
                <textarea
                  name="protocolForCallout"
                  value={playbookFormData.protocolForCallout}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, protocolForCallout: e.target.value})}
                  placeholder="What is their protocol for deciding when to call out external help?"
                  rows="2"
                />
              </div>
              <div className="form-group">
                <label>Number of events annually</label>
                <input
                  type="text"
                  name="eventsAnnually"
                  value={playbookFormData.eventsAnnually}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, eventsAnnually: e.target.value})}
                  placeholder="Average number of events per year"
                />
              </div>

              <div className="form-section-divider"></div>

              {/* Section 7: Organization Structure */}
              <div className="form-section-header">7. Organization Structure</div>
              <div className="form-group">
                <label>Portfolio Managers</label>
                <textarea
                  name="portfolioManagers"
                  value={playbookFormData.portfolioManagers}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, portfolioManagers: e.target.value})}
                  placeholder="Portfolio managers information"
                  rows="2"
                />
                  </div>
              <div className="form-group">
                <label>Regional Managers</label>
                <textarea
                  name="regionalManagers"
                  value={playbookFormData.regionalManagers}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, regionalManagers: e.target.value})}
                  placeholder="Regional managers information"
                  rows="2"
                />
                  </div>
              <div className="form-group">
                <label>Property Managers</label>
                <textarea
                  name="propertyManagers"
                  value={playbookFormData.propertyManagers}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, propertyManagers: e.target.value})}
                  placeholder="Property managers information"
                  rows="2"
                />
                  </div>
              <div className="form-group">
                <label>Maintenance Supervisors</label>
                <textarea
                  name="maintenanceSupervisors"
                  value={playbookFormData.maintenanceSupervisors}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, maintenanceSupervisors: e.target.value})}
                  placeholder="Maintenance supervisors information"
                  rows="2"
                />
                </div>
              <div className="form-group">
                <label>Director of Engineering / Maintenance</label>
                <textarea
                  name="directorEngineeringMaintenance"
                  value={playbookFormData.directorEngineeringMaintenance}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, directorEngineeringMaintenance: e.target.value})}
                  placeholder="Director of Engineering / Maintenance information"
                  rows="2"
                />
              </div>

              <div className="form-section-divider"></div>

              {/* Section 8: Commitment */}
              <div className="form-section-header">8. Commitment</div>
              <div className="form-group">
                <label>Projected Job Date</label>
                <input
                  type="text"
                  name="projectedJobDate"
                  value={playbookFormData.projectedJobDate}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, projectedJobDate: e.target.value})}
                  placeholder="Enter projected job date"
                />
                </div>
              <div className="form-group">
                <label>Initial Commitment Interaction Plan / Strategy</label>
                <textarea
                  name="interactionPlanStrategy"
                  value={playbookFormData.interactionPlanStrategy}
                  onChange={(e) => setPlaybookFormData({...playbookFormData, interactionPlanStrategy: e.target.value})}
                  placeholder="Describe the interaction plan and strategy for initial commitment"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={generatePDF}>
                  Print to PDF
                </button>
                <button type="submit" className="btn-primary">
                  Save / Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
