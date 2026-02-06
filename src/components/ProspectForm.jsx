import React, { useState, useEffect } from 'react';
import './ProspectForm.css';

function ProspectForm({ prospect = null, parentProspects = [], onSave, onCancel }) {
  const [formData, setFormData] = useState({
    prospect_type: 'commercial',
    parent_prospect_id: '',
    company_name: '',
    first_name: '',
    last_name: '',
    title: '',
    email: '',
    phone_primary: '',
    phone_secondary: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    industry: '',
    association_membership: '',
    primary_sales_rep: '',
    secondary_sales_rep: '',
    account_manager: '',
    status: 'lead',
    priority: 'warm',
    is_top_10_target: false,
    lead_source: 'direct',
    damage_type: '',
    estimated_job_value: '',
    probability_to_close: '',
    initial_contact_date: '',
    insight_meeting_date: '',
    next_followup_date: '',
    date_closed: '',
    first_referral_date: '',
    lost_reason: '',
    notes: ''
  });

  useEffect(() => {
    if (prospect) {
      setFormData({
        prospect_type: prospect.prospect_type || 'commercial',
        parent_prospect_id: prospect.parent_prospect_id || '',
        company_name: prospect.company_name || '',
        first_name: prospect.first_name || '',
        last_name: prospect.last_name || '',
        title: prospect.title || '',
        email: prospect.email || '',
        phone_primary: prospect.phone_primary || '',
        phone_secondary: prospect.phone_secondary || '',
        address: prospect.address || '',
        city: prospect.city || '',
        state: prospect.state || '',
        zip: prospect.zip || '',
        industry: prospect.industry || '',
        association_membership: prospect.association_membership || '',
        primary_sales_rep: prospect.primary_sales_rep || '',
        secondary_sales_rep: prospect.secondary_sales_rep || '',
        account_manager: prospect.account_manager || '',
        status: prospect.status || 'lead',
        priority: prospect.priority || 'warm',
        is_top_10_target: prospect.is_top_10_target || false,
        lead_source: prospect.lead_source || 'direct',
        damage_type: prospect.damage_type || '',
        estimated_job_value: prospect.estimated_job_value || '',
        probability_to_close: prospect.probability_to_close || '',
        initial_contact_date: prospect.initial_contact_date || '',
        insight_meeting_date: prospect.insight_meeting_date || '',
        next_followup_date: prospect.next_followup_date || '',
        date_closed: prospect.date_closed || '',
        first_referral_date: prospect.first_referral_date || '',
        lost_reason: prospect.lost_reason || '',
        notes: prospect.notes || ''
      });
    }
  }, [prospect]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      parent_prospect_id: formData.parent_prospect_id || null,
      estimated_job_value: formData.estimated_job_value ? parseFloat(formData.estimated_job_value) : null,
      probability_to_close: formData.probability_to_close ? parseInt(formData.probability_to_close) : null,
      primary_sales_rep: formData.primary_sales_rep || null,
      secondary_sales_rep: formData.secondary_sales_rep || null,
      account_manager: formData.account_manager || null,
      initial_contact_date: formData.initial_contact_date || null,
      insight_meeting_date: formData.insight_meeting_date || null,
      next_followup_date: formData.next_followup_date || null,
      date_closed: formData.date_closed || null,
      first_referral_date: formData.first_referral_date || null
    };
    onSave(data);
  };

  const showIndustryField = formData.prospect_type === 'commercial';

  return (
    <form className="prospect-form" onSubmit={handleSubmit}>
      <div className="form-section-header">Basic Information</div>

      <div className="form-row">
        <div className="form-group">
          <label>Prospect Type *</label>
          <select
            name="prospect_type"
            value={formData.prospect_type}
            onChange={handleInputChange}
            required
          >
            <option value="commercial">Commercial</option>
            <option value="agent">Agent</option>
            <option value="adjuster">Adjuster</option>
          </select>
        </div>
        {parentProspects.length > 0 && (
          <div className="form-group">
            <label>Parent Prospect</label>
            <select
              name="parent_prospect_id"
              value={formData.parent_prospect_id}
              onChange={handleInputChange}
            >
              <option value="">None (Top Level)</option>
              {parentProspects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.company_name || `${p.first_name} ${p.last_name}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Company Name</label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleInputChange}
          />
        </div>
        {showIndustryField && (
          <div className="form-group">
            <label>Industry</label>
            <select
              name="industry"
              value={formData.industry}
              onChange={handleInputChange}
            >
              <option value="">Select industry...</option>
              <option value="multi_family">Multi-Family</option>
              <option value="retail">Retail</option>
              <option value="office">Office</option>
              <option value="hotel">Hotel</option>
              <option value="restaurant">Restaurant</option>
              <option value="healthcare">Healthcare</option>
              <option value="school">School</option>
              <option value="warehouse">Warehouse</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>First Name</label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>Cell Phone</label>
          <input
            type="tel"
            name="phone_primary"
            value={formData.phone_primary}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>Office Line</label>
          <input
            type="tel"
            name="phone_secondary"
            value={formData.phone_secondary}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="form-section-divider"></div>
      <div className="form-section-header">Address</div>

      <div className="form-group">
        <label>Address</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            maxLength="2"
            placeholder="CA"
          />
        </div>
        <div className="form-group">
          <label>ZIP</label>
          <input
            type="text"
            name="zip"
            value={formData.zip}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {showIndustryField && (
        <>
          <div className="form-group">
            <label>Association Membership</label>
            <input
              type="text"
              name="association_membership"
              value={formData.association_membership}
              onChange={handleInputChange}
            />
          </div>
        </>
      )}

      <div className="form-section-divider"></div>
      <div className="form-section-header">Sales Pipeline</div>

      <div className="form-row">
        <div className="form-group">
          <label>Status *</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            required
          >
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
        <div className="form-group">
          <label>Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleInputChange}
          >
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>
        <div className="form-group">
          <label>Lead Source</label>
          <select
            name="lead_source"
            value={formData.lead_source}
            onChange={handleInputChange}
          >
            <option value="google">Google</option>
            <option value="facebook">Facebook</option>
            <option value="referral">Referral</option>
            <option value="insurance">Insurance</option>
            <option value="direct">Direct</option>
            <option value="cold_call">Cold Call</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Damage Type</label>
          <select
            name="damage_type"
            value={formData.damage_type}
            onChange={handleInputChange}
          >
            <option value="">Select type...</option>
            <option value="water">Water</option>
            <option value="fire">Fire</option>
            <option value="mold">Mold</option>
            <option value="storm">Storm</option>
            <option value="reconstruction">Reconstruction</option>
          </select>
        </div>
        <div className="form-group">
          <label>Estimated Job Value</label>
          <input
            type="number"
            name="estimated_job_value"
            value={formData.estimated_job_value}
            onChange={handleInputChange}
            min="0"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>Probability to Close (%)</label>
          <input
            type="number"
            name="probability_to_close"
            value={formData.probability_to_close}
            onChange={handleInputChange}
            min="0"
            max="100"
          />
        </div>
      </div>

      <div className="form-group form-checkbox">
        <label>
          <input
            type="checkbox"
            name="is_top_10_target"
            checked={formData.is_top_10_target}
            onChange={handleInputChange}
          />
          Top 10 Target
        </label>
      </div>

      <div className="form-section-divider"></div>
      <div className="form-section-header">Key Dates</div>

      <div className="form-row">
        <div className="form-group">
          <label>Initial Contact Date</label>
          <input
            type="date"
            name="initial_contact_date"
            value={formData.initial_contact_date}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>Insight Meeting Date</label>
          <input
            type="date"
            name="insight_meeting_date"
            value={formData.insight_meeting_date}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>Next Follow-up Date</label>
          <input
            type="date"
            name="next_followup_date"
            value={formData.next_followup_date}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>First Referral Date</label>
          <input
            type="date"
            name="first_referral_date"
            value={formData.first_referral_date}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>Date Closed</label>
          <input
            type="date"
            name="date_closed"
            value={formData.date_closed}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {formData.status === 'lost' && (
        <div className="form-group">
          <label>Lost Reason</label>
          <textarea
            name="lost_reason"
            value={formData.lost_reason}
            onChange={handleInputChange}
            rows="3"
            placeholder="Reason why this prospect was lost"
          />
        </div>
      )}

      <div className="form-section-divider"></div>
      <div className="form-section-header">Notes</div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows="4"
          placeholder="Additional notes about this prospect"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {prospect ? 'Update Prospect' : 'Create Prospect'}
        </button>
      </div>
    </form>
  );
}

export default ProspectForm;

