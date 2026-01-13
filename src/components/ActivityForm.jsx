import React, { useState, useEffect } from 'react';
import './ActivityForm.css';

function ActivityForm({ prospectId, crmId, activity = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    activity_type: 'call',
    activity_date: new Date().toISOString().split('T')[0],
    outcome: '',
    notes: '',
    next_action: '',
    next_action_date: ''
  });

  useEffect(() => {
    if (activity) {
      setFormData({
        activity_type: activity.activity_type || 'call',
        activity_date: activity.activity_date || new Date().toISOString().split('T')[0],
        outcome: activity.outcome || '',
        notes: activity.notes || '',
        next_action: activity.next_action || '',
        next_action_date: activity.next_action_date || ''
      });
    }
  }, [activity]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-suggest next_action_date based on activity_type
    if (name === 'activity_type' && !activity) {
      const today = new Date();
      let daysToAdd = 7; // Default: 7 days

      switch (value) {
        case 'call':
          daysToAdd = 3;
          break;
        case 'email':
          daysToAdd = 5;
          break;
        case 'meeting':
          daysToAdd = 14;
          break;
        case 'site_visit':
          daysToAdd = 30;
          break;
        case 'proposal_sent':
          daysToAdd = 7;
          break;
        case 'lunch':
          daysToAdd = 14;
          break;
        default:
          daysToAdd = 7;
      }

      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysToAdd);
      setFormData(prev => ({
        ...prev,
        activity_type: value,
        next_action_date: nextDate.toISOString().split('T')[0]
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      crm_id: crmId || prospectId,
      // Convert empty strings to null for date fields (PostgreSQL requires null, not "")
      next_action_date: formData.next_action_date || null,
      activity_date: formData.activity_date || null
    };
    onSave(data);
  };

  return (
    <form className="activity-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Activity Type *</label>
          <select
            name="activity_type"
            value={formData.activity_type}
            onChange={handleInputChange}
            required
          >
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="site_visit">Site Visit</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="lunch">Lunch</option>
          </select>
        </div>
        <div className="form-group">
          <label>Activity Date *</label>
          <input
            type="date"
            name="activity_date"
            value={formData.activity_date}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Outcome</label>
        <input
          type="text"
          name="outcome"
          value={formData.outcome}
          onChange={handleInputChange}
          placeholder="Brief outcome of the activity"
        />
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows="4"
          placeholder="Detailed notes about this activity"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Next Action</label>
          <input
            type="text"
            name="next_action"
            value={formData.next_action}
            onChange={handleInputChange}
            placeholder="What should happen next?"
          />
        </div>
        <div className="form-group">
          <label>Next Action Date</label>
          <input
            type="date"
            name="next_action_date"
            value={formData.next_action_date}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {activity ? 'Update Activity' : 'Log Activity'}
        </button>
      </div>
    </form>
  );
}

export default ActivityForm;

