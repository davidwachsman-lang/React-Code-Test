import React, { useState } from 'react';
import { useProperties } from '../../hooks/useProperties';
import { useActivities } from '../../hooks/useActivities';
import PropertyList from '../PropertyList';
import PropertyForm from '../PropertyForm';
import ActivityTimeline from '../ActivityTimeline';
import ActivityForm from '../ActivityForm';
import propertyService from '../../services/propertyService';
import crmActivityService from '../../services/crmActivityService';
import crmService from '../../services/crmService';
import './CRMDetail.css';

function CRMDetail({ crmRecord, parentRecord, onEdit, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const { data: properties, loading: propertiesLoading, refetch: refetchProperties } = useProperties(crmRecord?.id);
  const { data: activities, loading: activitiesLoading, refetch: refetchActivities } = useActivities(crmRecord?.id);

  const handlePropertySave = async (propertyData) => {
    try {
      const dataToSave = { ...propertyData, crm_id: crmRecord.id };
      if (editingProperty) {
        await propertyService.update(editingProperty.id, dataToSave);
      } else {
        await propertyService.create(dataToSave);
      }
      setShowPropertyForm(false);
      setEditingProperty(null);
      refetchProperties();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Failed to save property: ' + error.message);
    }
  };

  const handlePropertyDelete = async (propertyId) => {
    try {
      await propertyService.delete(propertyId);
      refetchProperties();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property: ' + error.message);
    }
  };

  const handleActivitySave = async (activityData) => {
    try {
      const dataToSave = { ...activityData, crm_id: crmRecord.id };
      if (editingActivity) {
        await crmActivityService.update(editingActivity.id, dataToSave);
      } else {
        await crmActivityService.create(dataToSave);
      }
      setShowActivityForm(false);
      setEditingActivity(null);
      refetchActivities();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Failed to save activity: ' + error.message);
    }
  };

  const handleActivityDelete = async (activityId) => {
    try {
      await crmActivityService.delete(activityId);
      refetchActivities();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Failed to delete activity: ' + error.message);
    }
  };

  const handleToggleTopTarget = async () => {
    try {
      await crmService.toggleTopTarget(crmRecord.id);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error toggling top target:', error);
      alert('Failed to toggle top target: ' + error.message);
    }
  };

  const handleConvertToCustomer = async () => {
    if (window.confirm('Convert this prospect to an active customer?')) {
      try {
        await crmService.convertToCustomer(crmRecord.id);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error converting to customer:', error);
        alert('Failed to convert: ' + error.message);
      }
    }
  };

  const handleMarkAsLost = async () => {
    const reason = window.prompt('Please provide a reason for marking as lost:');
    if (reason) {
      try {
        await crmService.markAsLost(crmRecord.id, reason);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error marking as lost:', error);
        alert('Failed to mark as lost: ' + error.message);
      }
    }
  };

  const handleMarkAsInactive = async () => {
    if (window.confirm('Mark this customer as inactive?')) {
      try {
        await crmService.markAsInactive(crmRecord.id);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error marking as inactive:', error);
        alert('Failed to mark as inactive: ' + error.message);
      }
    }
  };

  const handleReactivate = async () => {
    if (window.confirm('Reactivate this customer?')) {
      try {
        await crmService.reactivate(crmRecord.id);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error reactivating:', error);
        alert('Failed to reactivate: ' + error.message);
      }
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStageClass = (stage) => {
    switch (stage) {
      case 'prospect':
        return 'stage-prospect';
      case 'active_customer':
        return 'stage-active-customer';
      case 'inactive':
        return 'stage-inactive';
      case 'lost':
        return 'stage-lost';
      default:
        return '';
    }
  };

  const getHealthIndicator = (lastJobDate) => {
    if (!lastJobDate) return { status: 'unknown', label: 'No jobs', color: '#9ca3af' };
    const daysSince = Math.floor((new Date() - new Date(lastJobDate)) / (1000 * 60 * 60 * 24));
    if (daysSince < 30) return { status: 'healthy', label: 'Healthy', color: '#22c55e' };
    if (daysSince < 60) return { status: 'at-risk', label: 'At Risk', color: '#eab308' };
    return { status: 'critical', label: 'Critical', color: '#ef4444' };
  };

  if (!crmRecord) {
    return null;
  }

  const health = crmRecord.relationship_stage === 'active_customer' 
    ? getHealthIndicator(crmRecord.last_job_date)
    : null;

  return (
    <div className="crm-detail-modal">
      <div className="modal-overlay"></div>
      <div className="modal-content crm-detail-content">
        <div className="crm-detail-header">
          <div className="header-left">
            <button
              className={`star-button-header ${crmRecord.is_top_target ? 'starred' : ''}`}
              onClick={handleToggleTopTarget}
              title={crmRecord.is_top_target ? 'Remove from top targets' : 'Add to top targets'}
            >
              {crmRecord.is_top_target ? '★' : '☆'}
            </button>
            <h2>{crmRecord.company_name || `${crmRecord.first_name} ${crmRecord.last_name}` || 'Unnamed'}</h2>
            <span className={`stage-badge-header ${getStageClass(crmRecord.relationship_stage)}`}>
              {crmRecord.relationship_stage === 'prospect' ? 'Prospect' :
               crmRecord.relationship_stage === 'active_customer' ? 'Active Customer' :
               crmRecord.relationship_stage === 'inactive' ? 'Inactive' :
               crmRecord.relationship_stage === 'lost' ? 'Lost' : crmRecord.relationship_stage}
            </span>
            {health && (
              <span className="health-indicator" style={{ color: health.color }}>
                {health.status === 'healthy' && '🟢'}
                {health.status === 'at-risk' && '🟡'}
                {health.status === 'critical' && '🔴'}
                {' '}{health.label}
              </span>
            )}
          </div>
          <div className="header-actions">
            {crmRecord.relationship_stage === 'prospect' && (
              <>
                <button className="btn-action btn-convert" onClick={handleConvertToCustomer}>
                  Convert to Customer
                </button>
                <button className="btn-action btn-lost" onClick={handleMarkAsLost}>
                  Mark as Lost
                </button>
              </>
            )}
            {crmRecord.relationship_stage === 'active_customer' && (
              <button className="btn-action btn-inactive" onClick={handleMarkAsInactive}>
                Mark as Inactive
              </button>
            )}
            {crmRecord.relationship_stage === 'inactive' && (
              <button className="btn-action btn-reactivate" onClick={handleReactivate}>
                Reactivate
              </button>
            )}
            <button className="btn-action btn-edit" onClick={() => onEdit && onEdit(crmRecord)}>
              Edit
            </button>
            <button className="btn-action btn-close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="crm-detail-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={activeTab === 'properties' ? 'active' : ''}
            onClick={() => setActiveTab('properties')}
          >
            Properties
          </button>
          <button
            className={activeTab === 'activities' ? 'active' : ''}
            onClick={() => setActiveTab('activities')}
          >
            Activities
          </button>
        </div>

        <div className="crm-detail-body">
          {activeTab === 'overview' && (
            <div className="overview-content">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-grid">
                  <div><strong>Company:</strong> {crmRecord.company_name || 'N/A'}</div>
                  <div><strong>Contact:</strong> {crmRecord.first_name} {crmRecord.last_name}</div>
                  <div><strong>Title:</strong> {crmRecord.title || 'N/A'}</div>
                  <div><strong>Email:</strong> {crmRecord.email ? <a href={`mailto:${crmRecord.email}`}>{crmRecord.email}</a> : 'N/A'}</div>
                  <div><strong>Phone:</strong> {crmRecord.phone_primary ? <a href={`tel:${crmRecord.phone_primary}`}>{crmRecord.phone_primary}</a> : 'N/A'}</div>
                  <div><strong>Prospect Type:</strong> {crmRecord.prospect_type}</div>
                  {crmRecord.industry && <div><strong>Industry:</strong> {crmRecord.industry}</div>}
                </div>
              </div>

              {crmRecord.relationship_stage === 'prospect' && (
                <div className="detail-section">
                  <h3>Prospect Details</h3>
                  <div className="detail-grid">
                    <div><strong>Estimated Job Value:</strong> {formatCurrency(crmRecord.estimated_job_value)}</div>
                    <div><strong>Probability to Close:</strong> {crmRecord.probability_to_close ? `${crmRecord.probability_to_close}%` : 'N/A'}</div>
                    <div><strong>Next Follow-up:</strong> {formatDate(crmRecord.next_followup_date)}</div>
                  </div>
                </div>
              )}

              {crmRecord.relationship_stage === 'active_customer' && (
                <div className="detail-section">
                  <h3>Customer Details</h3>
                  <div className="detail-grid">
                    <div><strong>Lifetime Revenue:</strong> {formatCurrency(crmRecord.lifetime_revenue)}</div>
                    <div><strong>Total Jobs:</strong> {crmRecord.total_jobs || 0}</div>
                    <div><strong>First Job Date:</strong> {formatDate(crmRecord.first_job_date)}</div>
                    <div><strong>Last Job Date:</strong> {formatDate(crmRecord.last_job_date)}</div>
                  </div>
                </div>
              )}

              {crmRecord.relationship_stage === 'lost' && (
                <div className="detail-section">
                  <h3>Lost Details</h3>
                  <div className="detail-grid">
                    <div><strong>Lost Reason:</strong> {crmRecord.lost_reason || 'N/A'}</div>
                    <div><strong>Date Closed:</strong> {formatDate(crmRecord.date_closed)}</div>
                  </div>
                </div>
              )}

              {crmRecord.notes && (
                <div className="detail-section">
                  <h3>Notes</h3>
                  <p>{crmRecord.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'properties' && (
            <div className="properties-content">
              <div className="section-header">
                <h3>Properties</h3>
                <button className="btn-add" onClick={() => setShowPropertyForm(true)}>
                  Add Property
                </button>
              </div>
              {propertiesLoading ? (
                <div>Loading properties...</div>
              ) : (
                <PropertyList
                  properties={properties || []}
                  onEdit={(property) => {
                    setEditingProperty(property);
                    setShowPropertyForm(true);
                  }}
                  onDelete={handlePropertyDelete}
                />
              )}
              {showPropertyForm && (
                <PropertyForm
                  crmId={crmRecord.id}
                  property={editingProperty}
                  onSave={handlePropertySave}
                  onCancel={() => {
                    setShowPropertyForm(false);
                    setEditingProperty(null);
                  }}
                />
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="activities-content">
              <div className="section-header">
                <h3>Activities</h3>
                <button className="btn-add" onClick={() => setShowActivityForm(true)}>
                  Log Activity
                </button>
              </div>
              {activitiesLoading ? (
                <div>Loading activities...</div>
              ) : (
                <ActivityTimeline activities={activities || []} />
              )}
              {showActivityForm && (
                <ActivityForm
                  crmId={crmRecord.id}
                  activity={editingActivity}
                  onSave={handleActivitySave}
                  onCancel={() => {
                    setShowActivityForm(false);
                    setEditingActivity(null);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CRMDetail;

