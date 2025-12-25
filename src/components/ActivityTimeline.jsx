import React from 'react';
import './ActivityTimeline.css';

function ActivityTimeline({ activities = [], onEdit, onDelete, onAdd }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="activity-timeline-empty">
        <p>No activities logged yet.</p>
        {onAdd && (
          <button className="btn-primary" onClick={onAdd}>
            Log First Activity
          </button>
        )}
      </div>
    );
  }

  const getActivityIcon = (type) => {
    const icons = {
      call: '📞',
      email: '📧',
      meeting: '🤝',
      site_visit: '🏢',
      proposal_sent: '📄',
      lunch: '🍽️'
    };
    return icons[type] || '📋';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isOverdue = (nextActionDate) => {
    if (!nextActionDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const actionDate = new Date(nextActionDate);
    actionDate.setHours(0, 0, 0, 0);
    return actionDate < today;
  };

  return (
    <div className="activity-timeline">
      {onAdd && (
        <div className="activity-timeline-header">
          <button className="btn-primary" onClick={onAdd}>
            + Log Activity
          </button>
        </div>
      )}
      <div className="activity-timeline-items">
        {activities.map((activity, index) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-item-icon">
              {getActivityIcon(activity.activity_type)}
            </div>
            <div className="activity-item-content">
              <div className="activity-item-header">
                <div className="activity-item-title">
                  <h4>{activity.activity_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                  <span className="activity-date">{formatDate(activity.activity_date)}</span>
                </div>
                <div className="activity-item-actions">
                  {onEdit && (
                    <button
                      className="btn-icon"
                      onClick={() => onEdit(activity)}
                      title="Edit activity"
                    >
                      ✏️
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this activity?')) {
                          onDelete(activity.id);
                        }
                      }}
                      title="Delete activity"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              {activity.outcome && (
                <div className="activity-outcome">
                  <strong>Outcome:</strong> {activity.outcome}
                </div>
              )}
              {activity.notes && (
                <div className="activity-notes">
                  {activity.notes}
                </div>
              )}
              {(activity.next_action || activity.next_action_date) && (
                <div className={`activity-next-action ${isOverdue(activity.next_action_date) ? 'overdue' : ''}`}>
                  <strong>Next Action:</strong> {activity.next_action || 'N/A'}
                  {activity.next_action_date && (
                    <span className="next-action-date">
                      {' '}by {formatDate(activity.next_action_date)}
                      {isOverdue(activity.next_action_date) && (
                        <span className="overdue-badge">OVERDUE</span>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityTimeline;

