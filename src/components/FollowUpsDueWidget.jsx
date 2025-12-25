import React from 'react';
import { useProspectsNeedingFollowup } from '../hooks/useProspects';
import './FollowUpsDueWidget.css';

function FollowUpsDueWidget({ onProspectClick }) {
  const { data: prospects, loading, error } = useProspectsNeedingFollowup();

  if (loading) {
    return (
      <div className="followups-widget">
        <h3>Follow-ups Due</h3>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="followups-widget">
        <h3>Follow-ups Due</h3>
        <p className="error">Error loading follow-ups</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = (prospects || []).filter(p => {
    if (!p.next_followup_date) return false;
    const followupDate = new Date(p.next_followup_date);
    followupDate.setHours(0, 0, 0, 0);
    return followupDate < today;
  });

  const todayDue = (prospects || []).filter(p => {
    if (!p.next_followup_date) return false;
    const followupDate = new Date(p.next_followup_date);
    followupDate.setHours(0, 0, 0, 0);
    return followupDate.getTime() === today.getTime();
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateDaysOverdue = (dateString) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    const diffTime = today - date;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="followups-widget">
      <div className="widget-header">
        <h3>Follow-ups Due</h3>
        <span className="widget-count">{(prospects || []).length}</span>
      </div>
      <div className="widget-content">
        {overdue.length > 0 && (
          <div className="followup-section">
            <h4 className="section-title overdue-title">Overdue ({overdue.length})</h4>
            <div className="followup-list">
              {overdue.map(prospect => (
                <div
                  key={prospect.id}
                  className="followup-item overdue"
                  onClick={() => onProspectClick && onProspectClick(prospect)}
                >
                  <div className="followup-item-header">
                    <span className="followup-company">{prospect.company_name || 'Unnamed'}</span>
                    <span className="followup-days">{calculateDaysOverdue(prospect.next_followup_date)} days</span>
                  </div>
                  <div className="followup-details">
                    <span className="followup-contact">{prospect.first_name} {prospect.last_name}</span>
                    <span className="followup-date">Due: {formatDate(prospect.next_followup_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {todayDue.length > 0 && (
          <div className="followup-section">
            <h4 className="section-title today-title">Today ({todayDue.length})</h4>
            <div className="followup-list">
              {todayDue.map(prospect => (
                <div
                  key={prospect.id}
                  className="followup-item today"
                  onClick={() => onProspectClick && onProspectClick(prospect)}
                >
                  <div className="followup-item-header">
                    <span className="followup-company">{prospect.company_name || 'Unnamed'}</span>
                  </div>
                  <div className="followup-details">
                    <span className="followup-contact">{prospect.first_name} {prospect.last_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {overdue.length === 0 && todayDue.length === 0 && (
          <div className="no-followups">
            <p>No follow-ups due</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FollowUpsDueWidget;

