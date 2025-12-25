import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useProspects, useTopTargets, useProspectsNeedingFollowup } from '../hooks/useProspects';
import { useCreateProspect, useUpdateProspect, useDeleteProspect } from '../hooks/useProspects';
import prospectService from '../services/prospectService';
import SalesFunnel from '../components/SalesFunnel';
import ProspectList from '../components/ProspectList';
import ProspectFilters from '../components/ProspectFilters';
import ProspectForm from '../components/ProspectForm';
import ProspectDetail from '../components/ProspectDetail';
import FollowUpsDueWidget from '../components/FollowUpsDueWidget';
import TopTargetsWidget from '../components/TopTargetsWidget';
import PipelineStatsWidget from '../components/PipelineStatsWidget';
import ActivityForm from '../components/ActivityForm';
import { jsPDF } from 'jspdf';
import './Page.css';
import './CRM.css';

function CRM() {
  const { data: prospects, loading, error, refetch } = useProspects();
  const { mutate: createProspect, loading: creating } = useCreateProspect();
  const { mutate: updateProspect, loading: updating } = useUpdateProspect();
  const { mutate: deleteProspect, loading: deleting } = useDeleteProspect();

  const [showForm, setShowForm] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);
  const [viewingProspect, setViewingProspect] = useState(null);
  const [parentProspect, setParentProspect] = useState(null);
  const [activeView, setActiveView] = useState('prospects'); // 'prospects', 'dashboard', 'funnel', 'playbook', 'topTargets'
  const [selectedSalesRep, setSelectedSalesRep] = useState('all');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    salesRep: 'all',
    top10Only: false,
    prospectType: 'all',
    searchTerm: ''
  });
  const [showQuickActivityForm, setShowQuickActivityForm] = useState(false);
  const [quickActivityProspect, setQuickActivityProspect] = useState(null);

  const [playbookFormData, setPlaybookFormData] = useState({
    contactName: '', contactTitle: '', contactEmail: '', contactPhone: '', contactCompany: '',
    propertyAddress: '', propertyType: '', propertySize: '', propertyAge: '', numberOfBuildings: '', currentChallenges: '',
    currentProcess: '', processChallenges: '',
    currentProviders: '', providerSatisfaction: '', providerImprovements: '',
    numberOfMaintenanceEngineers: '', lastTraining: '', equipment: '',
    recentLosses: '', lastEvent: '', eventType24Months: [], outsourcingScale: '', protocolForCallout: '', eventsAnnually: '',
    portfolioManagers: '', regionalManagers: '', propertyManagers: '', maintenanceSupervisors: '', directorEngineeringMaintenance: '',
    projectedJobDate: '', interactionPlanStrategy: ''
  });

  // Get parent prospects for dropdown
  const parentProspects = useMemo(() => {
    return (prospects || []).filter(p => !p.parent_prospect_id);
  }, [prospects]);

  // Filter prospects based on filters
  const filteredProspects = useMemo(() => {
    if (!prospects) return [];
    
    return prospects.filter(prospect => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          (prospect.company_name || '').toLowerCase().includes(searchLower) ||
          (prospect.first_name || '').toLowerCase().includes(searchLower) ||
          (prospect.last_name || '').toLowerCase().includes(searchLower) ||
          (prospect.email || '').toLowerCase().includes(searchLower) ||
          (prospect.phone_primary || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && prospect.status !== filters.status) return false;

      // Priority filter
      if (filters.priority !== 'all' && prospect.priority !== filters.priority) return false;

      // Prospect type filter
      if (filters.prospectType !== 'all' && prospect.prospect_type !== filters.prospectType) return false;

      // Top 10 filter
      if (filters.top10Only && !prospect.is_top_10_target) return false;

      // Sales rep filter (simplified - would need user mapping in production)
      if (filters.salesRep !== 'all') {
        // This is a placeholder - in production, map sales rep names to UUIDs
        // For now, we'll skip this filter or implement a text-based match
      }

      return true;
    });
  }, [prospects, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleCreateProspect = async (prospectData) => {
    try {
      await createProspect(() => prospectService.create(prospectData));
      setShowForm(false);
      setEditingProspect(null);
      refetch();
    } catch (error) {
      console.error('Error creating prospect:', error);
      alert('Failed to create prospect: ' + error.message);
    }
  };

  const handleUpdateProspect = async (prospectData) => {
    try {
      await updateProspect(() => prospectService.update(editingProspect.id, prospectData));
      setShowForm(false);
      setEditingProspect(null);
      setViewingProspect(null);
      refetch();
    } catch (error) {
      console.error('Error updating prospect:', error);
      alert('Failed to update prospect: ' + error.message);
    }
  };

  const handleDeleteProspect = async (id) => {
    if (window.confirm('Are you sure you want to delete this prospect?')) {
      try {
        await deleteProspect(() => prospectService.delete(id));
        refetch();
      } catch (error) {
        console.error('Error deleting prospect:', error);
        alert('Failed to delete prospect: ' + error.message);
      }
    }
  };

  const handleEdit = (prospect) => {
    setEditingProspect(prospect);
    setShowForm(true);
  };

  const handleView = async (prospect) => {
    setViewingProspect(prospect);
    if (prospect.parent_prospect_id) {
      try {
        const parent = await prospectService.getById(prospect.parent_prospect_id);
        setParentProspect(parent);
      } catch (error) {
        setParentProspect(null);
      }
    } else {
      setParentProspect(null);
    }
  };

  const handleQuickLogActivity = (prospect) => {
    setQuickActivityProspect(prospect);
    setShowQuickActivityForm(true);
  };

  const handleQuickActivitySave = async (activityData) => {
    try {
      const { prospectActivityService } = await import('../services/prospectActivityService');
      await prospectActivityService.create(activityData);
      setShowQuickActivityForm(false);
      setQuickActivityProspect(null);
      refetch();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Failed to save activity: ' + error.message);
    }
  };

  // Generate PDF for playbook (keeping existing functionality)
  const generatePDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    const margin = 20;
    const lineHeight = 7;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Insight Meeting Playbook', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 10;

    // Add playbook sections (simplified - full implementation would include all sections)
    const sections = [
      { title: 'Contact', fields: ['contactName', 'contactTitle', 'contactEmail', 'contactPhone', 'contactCompany'] },
      { title: 'Property', fields: ['propertyAddress', 'propertyType', 'propertySize'] }
    ];

    sections.forEach(section => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(section.title, margin, yPosition);
      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      section.fields.forEach(field => {
        const value = playbookFormData[field] || 'N/A';
        doc.text(`${field}: ${value}`, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += 5;
    });

    const fileName = `Insight_Meeting_Playbook_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  // Calculate funnel layers from prospects
  const funnelLayers = useMemo(() => {
    if (!prospects) return [];
    
    const today = new Date();
    const targetIdentified = prospects.filter(p => p.status === 'lead' || p.status === 'active').length;
    const insightScheduled = prospects.filter(p => p.insight_meeting_date && new Date(p.insight_meeting_date) >= today).length;
    const insightCompleted = prospects.filter(p => p.insight_meeting_date && new Date(p.insight_meeting_date) < today).length;
    const presentation = prospects.filter(p => p.insight_meeting_date && p.status === 'active').length;
    const initialCommitment = prospects.filter(p => p.status === 'active' && p.first_referral_date).length;
    const firstReferral = prospects.filter(p => p.first_referral_date).length;
    const closed = prospects.filter(p => p.status === 'won').length;
    const msaSigned = prospects.filter(p => p.date_closed).length;

    const total = prospects.length || 1;

    return [
      { name: 'Target Identified', count: targetIdentified, color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', percentage: (targetIdentified / total) * 100 },
      { name: 'Insight Meeting Scheduled', count: insightScheduled, color: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', percentage: (insightScheduled / total) * 100 },
      { name: 'Insight Meeting Completed', count: insightCompleted, color: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)', percentage: (insightCompleted / total) * 100 },
      { name: 'Presentation to Client', count: presentation, color: '#fde047', gradient: 'linear-gradient(135deg, #fde047 0%, #fbbf24 100%)', percentage: (presentation / total) * 100 },
      { name: 'Initial Commitment', count: initialCommitment, color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', percentage: (initialCommitment / total) * 100 },
      { name: 'First Referral Received', count: firstReferral, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', percentage: (firstReferral / total) * 100 },
      { name: 'Closed / First Job Reviewed', count: closed, color: '#1e40af', gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)', percentage: (closed / total) * 100 },
      { name: 'MSA Signed', count: msaSigned, color: '#1e3a8a', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', percentage: (msaSigned / total) * 100 }
    ];
  }, [prospects]);

  return (
    <div className="page-container crm-page">
      <div className="crm-header">
        <h1>Customer Relationship Management</h1>
      </div>

      {error && (
        <div className="crm-error">
          <p>{error.message || 'Failed to load prospects'}</p>
          <button onClick={refetch} disabled={loading}>
            Retry
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="crm-action-buttons">
        <button className="action-btn action-btn-blue" onClick={() => {
          setEditingProspect(null);
          setShowForm(true);
        }}>
          <span className="btn-icon">👤</span>
          Add Prospect
        </button>
        <button 
          className={`action-btn ${activeView === 'prospects' ? 'action-btn-green' : 'action-btn-gray'}`}
          onClick={() => setActiveView('prospects')}
        >
          <span className="btn-icon">📋</span>
          Prospects
        </button>
        <button 
          className={`action-btn ${activeView === 'dashboard' ? 'action-btn-purple' : 'action-btn-gray'}`}
          onClick={() => setActiveView('dashboard')}
        >
          <span className="btn-icon">📊</span>
          Dashboard
        </button>
        <button 
          className={`action-btn ${activeView === 'funnel' ? 'action-btn-purple' : 'action-btn-gray'}`}
          onClick={() => setActiveView('funnel')}
        >
          <span className="btn-icon">📊</span>
          Sales Funnel
        </button>
        <button 
          className={`action-btn ${activeView === 'playbook' ? 'action-btn-orange' : 'action-btn-gray'}`}
          onClick={() => setActiveView('playbook')}
        >
          <span className="btn-icon">📋</span>
          Insight Meeting Playbook
        </button>
        <button 
          className={`action-btn ${activeView === 'topTargets' ? 'action-btn-yellow' : 'action-btn-gray'}`}
          onClick={() => setActiveView('topTargets')}
        >
          <span className="btn-icon">🎯</span>
          Top Targets
        </button>
      </div>

      {/* Prospect Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => {
          setShowForm(false);
          setEditingProspect(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProspect ? 'Edit Prospect' : 'Add New Prospect'}</h2>
              <button className="close-btn" onClick={() => {
                setShowForm(false);
                setEditingProspect(null);
              }}>×</button>
            </div>
            <ProspectForm
              prospect={editingProspect}
              parentProspects={parentProspects}
              onSave={editingProspect ? handleUpdateProspect : handleCreateProspect}
              onCancel={() => {
                setShowForm(false);
                setEditingProspect(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Activity Form Modal */}
      {showQuickActivityForm && quickActivityProspect && (
        <div className="modal-overlay" onClick={() => {
          setShowQuickActivityForm(false);
          setQuickActivityProspect(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quick Log Activity - {quickActivityProspect.company_name || `${quickActivityProspect.first_name} ${quickActivityProspect.last_name}`}</h2>
              <button className="close-btn" onClick={() => {
                setShowQuickActivityForm(false);
                setQuickActivityProspect(null);
              }}>×</button>
            </div>
            <ActivityForm
              prospectId={quickActivityProspect.id}
              onSave={handleQuickActivitySave}
              onCancel={() => {
                setShowQuickActivityForm(false);
                setQuickActivityProspect(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Prospects List View */}
      {activeView === 'prospects' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Prospects ({filteredProspects.length})</h2>
          </div>
          <ProspectFilters filters={filters} onFilterChange={handleFilterChange} />
          {loading ? (
            <div className="crm-loading">
              <p>Loading prospects...</p>
            </div>
          ) : (
            <ProspectList
              prospects={filteredProspects}
              onProspectClick={handleView}
              onQuickLogActivity={handleQuickLogActivity}
            />
          )}
        </div>
      )}

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>CRM Dashboard</h2>
          </div>
          <div className="dashboard-grid">
            <div className="dashboard-widget">
              <PipelineStatsWidget />
            </div>
            <div className="dashboard-widget">
              <FollowUpsDueWidget onProspectClick={handleView} />
            </div>
            <div className="dashboard-widget">
              <TopTargetsWidget onProspectClick={handleView} />
            </div>
          </div>
        </div>
      )}

      {/* Sales Funnel View */}
      {activeView === 'funnel' && (
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

      {/* Top Targets View */}
      {activeView === 'topTargets' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Top Targets</h2>
          </div>
          <TopTargetsWidget onProspectClick={handleView} />
        </div>
      )}

      {/* Insight Meeting Playbook View - Keep existing implementation */}
      {activeView === 'playbook' && (
        <div className="customers-container">
          <div className="customers-header">
            <h2>Insight Meeting Playbook</h2>
          </div>
          <div className="playbook-form-container">
            <form className="playbook-form" onSubmit={(e) => {
              e.preventDefault();
              console.log('Playbook form data:', playbookFormData);
              alert('Form data ready for Supabase/email integration');
            }}>
              {/* Simplified playbook form - full implementation would include all sections */}
              <div className="form-section-header">1. Contact</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Name</label>
                  <input
                    type="text"
                    value={playbookFormData.contactName}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={playbookFormData.contactTitle}
                    onChange={(e) => setPlaybookFormData({...playbookFormData, contactTitle: e.target.value})}
                  />
                </div>
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

      {/* Prospect Detail Modal */}
      {viewingProspect && (
        <ProspectDetail
          prospect={viewingProspect}
          parentProspect={parentProspect}
          onEdit={handleEdit}
          onClose={() => {
            setViewingProspect(null);
            setParentProspect(null);
          }}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}

export default CRM;

