import React from 'react';
import './ProspectList.css';

function ProspectList({ prospects = [], onProspectClick, onQuickLogActivity }) {
  if (!prospects || prospects.length === 0) {
    return (
      <div className="prospect-list-empty">
        <p>No prospects found.</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'lead':
        return 'status-lead';
      case 'won':
        return 'status-won';
      case 'lost':
        return 'status-lost';
      default:
        return '';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'hot':
        return 'priority-hot';
      case 'warm':
        return 'priority-warm';
      case 'cold':
        return 'priority-cold';
      default:
        return '';
    }
  };

  const isOverdue = (nextFollowupDate) => {
    if (!nextFollowupDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followupDate = new Date(nextFollowupDate);
    followupDate.setHours(0, 0, 0, 0);
    return followupDate < today;
  };

  return (
    <div className="prospect-list-container">
      <table className="prospect-list-table">
        <thead>
          <tr>
            <th className="col-company" style={{ width: '200px' }}>Company</th>
            <th className="col-contact" style={{ width: '180px' }}>Contact</th>
            <th className="col-status" style={{ width: '120px' }}>Status</th>
            <th className="col-priority" style={{ width: '120px' }}>Priority</th>
            <th className="col-followup" style={{ width: '160px' }}>Next Follow-up</th>
            <th className="col-value" style={{ width: '140px' }}>Value</th>
            <th className="col-sales-rep" style={{ width: '160px' }}>Sales Rep</th>
            <th className="col-actions" style={{ width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((prospect, index) => (
            <tr
              key={prospect.id}
              data-prospect-index={index}
              className="prospect-row"
              onClick={() => onProspectClick && onProspectClick(prospect)}
            >
              <td className="prospect-company col-company">
                {prospect.company_name || 'Unnamed'}
                {prospect.is_top_10_target && (
                  <span className="top-10-badge">Top 10</span>
                )}
              </td>
              <td className="prospect-contact col-contact">
                <div className="contact-name">
                  {prospect.first_name} {prospect.last_name}
                </div>
                {prospect.title && (
                  <div className="contact-title">{prospect.title}</div>
                )}
              </td>
              <td className="col-status">
                <span className={`status-badge ${getStatusClass(prospect.status)}`}>
                  {prospect.status}
                </span>
              </td>
              <td className="col-priority">
                <span className={`priority-badge ${getPriorityClass(prospect.priority)}`}>
                  {prospect.priority || 'warm'}
                </span>
              </td>
              <td className={`prospect-followup col-followup ${isOverdue(prospect.next_followup_date) ? 'overdue' : ''}`}>
                {prospect.next_followup_date ? (
                  <>
                    {formatDate(prospect.next_followup_date)}
                    {isOverdue(prospect.next_followup_date) && (
                      <span className="overdue-indicator">⚠️</span>
                    )}
                  </>
                ) : (
                  'N/A'
                )}
              </td>
              <td className="prospect-value col-value">
                {formatCurrency(prospect.estimated_job_value)}
              </td>
              <td className="prospect-sales-rep col-sales-rep">
                {prospect.primary_sales_rep || 'Unassigned'}
              </td>
              <td className="prospect-actions col-actions" onClick={(e) => e.stopPropagation()}>
                {onQuickLogActivity && (
                  <button
                    className="btn-quick-action"
                    onClick={() => onQuickLogActivity(prospect)}
                    title="Quick log activity"
                  >
                    📝
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProspectList;

