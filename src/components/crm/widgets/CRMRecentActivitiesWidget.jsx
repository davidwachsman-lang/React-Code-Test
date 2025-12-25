import React from 'react';
import { useRecentActivities } from '../../../hooks/useActivities';
import './CRMFollowUpsDueWidget.css';

function CRMRecentActivitiesWidget({ onRecordClick }) {
  const { data: activities, loading, error } = useRecentActivities(10);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="crm-widget">Loading...</div>;
  if (error) return <div className="crm-widget">Error: {error}</div>;

  return (
    <div className="crm-widget crm-recent-activities-widget">
      <h3>Recent Activities</h3>
      {!activities || activities.length === 0 ? (
        <p className="widget-empty">No recent activities</p>
      ) : (
        <ul className="widget-list">
          {activities.map(activity => (
            <li
              key={activity.id}
              className="widget-item"
              onClick={() => {
                // Navigate to the CRM record
                if (onRecordClick && activity.crm_id) {
                  // This would need the full record, but for now just log
                  console.log('Navigate to CRM record:', activity.crm_id);
                }
              }}
            >
              <div className="item-activity">
                <span className="activity-type">{activity.activity_type}</span>
                <span className="activity-date">{formatDate(activity.activity_date)}</span>
              </div>
              {activity.notes && (
                <div className="item-notes">{activity.notes.substring(0, 50)}...</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CRMRecentActivitiesWidget;

