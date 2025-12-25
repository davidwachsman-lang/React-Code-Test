import React, { useState } from 'react';
import { useProperties } from '../hooks/useProperties';
import { useActivities } from '../hooks/useActivities';
import PropertyList from './PropertyList';
import PropertyForm from './PropertyForm';
import ActivityTimeline from './ActivityTimeline';
import ActivityForm from './ActivityForm';
import propertyService from '../services/propertyService';
import prospectActivityService from '../services/prospectActivityService';
import './ProspectDetail.css';

function ProspectDetail({ prospect, parentProspect, onEdit, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const { data: properties, loading: propertiesLoading, refetch: refetchProperties } = useProperties(prospect?.id);
  const { data: activities, loading: activitiesLoading, refetch: refetchActivities } = useActivities(prospect?.id);

  const handlePropertySave = async (propertyData) => {
    try {
      if (editingProperty) {
        await propertyService.update(editingProperty.id, propertyData);
      } else {
        await propertyService.create(propertyData);
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
      if (editingActivity) {
        await prospectActivityService.update(editingActivity.id, activityData);
      } else {
        await prospectActivityService.create(activityData);
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
      await prospectActivityService.delete(activityId);
      refetchActivities();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Failed to delete activity: ' + error.message);
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

  if (!prospect) {
    return null;
  }

  return (
    <div className="prospect-detail-modal">
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content prospect-detail-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="prospect-detail-header">
              {parentProspect && (
                <div className="breadcrumb">
                  <span onClick={() => onEdit && onEdit(parentProspect)} className="breadcrumb-link">
                    {parentProspect.company_name || `${parentProspect.first_name} ${parentProspect.last_name}`}
                  </span>
                  <span className="breadcrumb-separator">›</span>
                  <span>{prospect.company_name || `${prospect.first_name} ${prospect.last_name}`}</span>
                </div>
              )}
              <h2>{prospect.company_name || `${prospect.first_name} ${prospect.last_name}` || 'Prospect Details'}</h2>
            </div>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="prospect-detail-tabs">
            <button
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`tab-button ${activeTab === 'properties' ? 'active' : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              Properties ({properties?.length || 0})
            </button>
            <button
              className={`tab-button ${activeTab === 'activities' ? 'active' : ''}`}
              onClick={() => setActiveTab('activities')}
            >
              Activities ({activities?.length || 0})
            </button>
          </div>

          <div className="prospect-detail-body">
            {activeTab === 'overview' && (
              <div className="prospect-overview">
                <div className="overview-section">
                  <h3>Contact Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Company:</strong>
                      <span>{prospect.company_name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Contact:</strong>
                      <span>{prospect.first_name} {prospect.last_name}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Title:</strong>
                      <span>{prospect.title || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Email:</strong>
                      <span>{prospect.email || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Phone Primary:</strong>
                      <span>{prospect.phone_primary || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Phone Secondary:</strong>
                      <span>{prospect.phone_secondary || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="overview-section">
                  <h3>Address</h3>
                  <p>
                    {[prospect.address, prospect.city, prospect.state, prospect.zip]
                      .filter(Boolean)
                      .join(', ') || 'No address provided'}
                  </p>
                </div>

                <div className="overview-section">
                  <h3>Sales Pipeline</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Status:</strong>
                      <span className={`status-badge status-${prospect.status}`}>{prospect.status}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Priority:</strong>
                      <span className={`priority-badge priority-${prospect.priority}`}>{prospect.priority || 'warm'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Prospect Type:</strong>
                      <span>{prospect.prospect_type}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Lead Source:</strong>
                      <span>{prospect.lead_source || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Estimated Value:</strong>
                      <span>{formatCurrency(prospect.estimated_job_value)}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Probability to Close:</strong>
                      <span>{prospect.probability_to_close ? `${prospect.probability_to_close}%` : 'N/A'}</span>
                    </div>
                    {prospect.is_top_10_target && (
                      <div className="detail-item">
                        <strong>Top 10 Target:</strong>
                        <span className="top-10-badge">Yes</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overview-section">
                  <h3>Key Dates</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <strong>Initial Contact:</strong>
                      <span>{formatDate(prospect.initial_contact_date)}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Insight Meeting:</strong>
                      <span>{formatDate(prospect.insight_meeting_date)}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Next Follow-up:</strong>
                      <span>{formatDate(prospect.next_followup_date)}</span>
                    </div>
                    <div className="detail-item">
                      <strong>First Referral:</strong>
                      <span>{formatDate(prospect.first_referral_date)}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Date Closed:</strong>
                      <span>{formatDate(prospect.date_closed)}</span>
                    </div>
                  </div>
                </div>

                {prospect.notes && (
                  <div className="overview-section">
                    <h3>Notes</h3>
                    <p className="notes-content">{prospect.notes}</p>
                  </div>
                )}

                <div className="overview-actions">
                  <button className="btn-primary" onClick={() => onEdit && onEdit(prospect)}>
                    Edit Prospect
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="prospect-properties">
                {showPropertyForm ? (
                  <PropertyForm
                    prospectId={prospect.id}
                    property={editingProperty}
                    onSave={handlePropertySave}
                    onCancel={() => {
                      setShowPropertyForm(false);
                      setEditingProperty(null);
                    }}
                  />
                ) : (
                  <PropertyList
                    properties={properties || []}
                    loading={propertiesLoading}
                    onEdit={(property) => {
                      setEditingProperty(property);
                      setShowPropertyForm(true);
                    }}
                    onDelete={handlePropertyDelete}
                    onAdd={() => setShowPropertyForm(true)}
                  />
                )}
              </div>
            )}

            {activeTab === 'activities' && (
              <div className="prospect-activities">
                {showActivityForm ? (
                  <ActivityForm
                    prospectId={prospect.id}
                    activity={editingActivity}
                    onSave={handleActivitySave}
                    onCancel={() => {
                      setShowActivityForm(false);
                      setEditingActivity(null);
                    }}
                  />
                ) : (
                  <ActivityTimeline
                    activities={activities || []}
                    loading={activitiesLoading}
                    onEdit={(activity) => {
                      setEditingActivity(activity);
                      setShowActivityForm(true);
                    }}
                    onDelete={handleActivityDelete}
                    onAdd={() => setShowActivityForm(true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProspectDetail;

