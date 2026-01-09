import React, { useState, useEffect } from 'react';
import jobService from '../../services/jobService';
import './StormJobEditModal.css';

function StormJobEditModal({ job, onClose, onSave }) {
  const [formData, setFormData] = useState({
    // Basic info
    customer_name: '',
    customer_phone: '',
    property_address: '',
    // Priority and status
    priority: '',
    status: '',
    // Property info
    property_type: 'residential',
    cause_of_loss: '',
    cause_fixed: false,
    sqft_affected: '',
    power_at_location: '',
    tarping_needed: false,
    boardup_needed: false,
    // Residential
    rooms_affected: '',
    foundation_type: '',
    basement_type: '',
    // Commercial
    units_affected: '',
    floors_affected: '',
    parking_location: '',
    msa_on_file: false,
    // Onsite contact
    onsite_contact_name: '',
    onsite_contact_phone: '',
    // Payment
    payment_method: '',
    insurance_provider: '',
    insurance_claim_number: '',
    deposit_explained: false,
    // Job details
    pm: '',
    estimate_value: '',
    inspection_completed: false,
    inspection_date: '',
    // Notes
    internal_notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job) {
      setFormData({
        customer_name: job.customer_name || '',
        customer_phone: job.customer_phone || '',
        property_address: job.property_address || '',
        priority: job.priority || '',
        status: job.status || '',
        property_type: job.property_type || 'residential',
        cause_of_loss: job.cause_of_loss || '',
        cause_fixed: job.cause_fixed || false,
        sqft_affected: job.sqft_affected || '',
        power_at_location: job.power_at_location || '',
        tarping_needed: job.tarping_needed || false,
        boardup_needed: job.boardup_needed || false,
        rooms_affected: job.rooms_affected || '',
        foundation_type: job.foundation_type || '',
        basement_type: job.basement_type || '',
        units_affected: job.units_affected || '',
        floors_affected: job.floors_affected || '',
        parking_location: job.parking_location || '',
        msa_on_file: job.msa_on_file || false,
        onsite_contact_name: job.onsite_contact_name || '',
        onsite_contact_phone: job.onsite_contact_phone || '',
        payment_method: job.payment_method || '',
        insurance_provider: job.insurance_provider || '',
        insurance_claim_number: job.insurance_claim_number || '',
        deposit_explained: job.deposit_explained || false,
        pm: job.pm || '',
        estimate_value: job.estimate_value || '',
        inspection_completed: job.inspection_completed || false,
        inspection_date: job.inspection_date || '',
        internal_notes: job.internal_notes || ''
      });
    }
  }, [job]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update job (excluding read-only fields like customer_name, property_address)
      const updateData = {
        priority: formData.priority || null,
        status: formData.status || null,
        property_type: formData.property_type || null,
        cause_of_loss: formData.cause_of_loss || null,
        cause_fixed: formData.cause_fixed,
        sqft_affected: formData.sqft_affected ? parseInt(formData.sqft_affected) : null,
        power_at_location: formData.power_at_location || null,
        tarping_needed: formData.tarping_needed,
        boardup_needed: formData.boardup_needed,
        rooms_affected: formData.rooms_affected ? parseInt(formData.rooms_affected) : null,
        foundation_type: formData.foundation_type || null,
        basement_type: formData.basement_type || null,
        units_affected: formData.units_affected ? parseInt(formData.units_affected) : null,
        floors_affected: formData.floors_affected ? parseInt(formData.floors_affected) : null,
        parking_location: formData.parking_location || null,
        msa_on_file: formData.msa_on_file,
        onsite_contact_name: formData.onsite_contact_name || null,
        onsite_contact_phone: formData.onsite_contact_phone || null,
        payment_method: formData.payment_method || null,
        insurance_provider: formData.insurance_provider || null,
        insurance_claim_number: formData.insurance_claim_number || null,
        deposit_explained: formData.deposit_explained,
        pm: formData.pm || null,
        estimate_value: formData.estimate_value ? parseFloat(formData.estimate_value) : null,
        inspection_completed: formData.inspection_completed,
        inspection_date: formData.inspection_date || null,
        internal_notes: formData.internal_notes || null
      };

      await jobService.update(job.id, updateData);
      onSave?.();
      alert('Job updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating job:', error);
      alert(`Failed to update job: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!job) return null;

  return (
    <div className="storm-job-edit-modal-overlay" onClick={onClose}>
      <div className="storm-job-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="storm-job-edit-header">
          <h2>Edit Job: {job.property_reference || job.id}</h2>
          <button type="button" className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="storm-job-edit-form">
          {/* Read-only info */}
          <div className="form-section">
            <h3>Customer Information (Read-Only)</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Customer Name</label>
                <input type="text" value={formData.customer_name} disabled readOnly />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={formData.customer_phone} disabled readOnly />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <input type="text" value={formData.property_address} disabled readOnly />
              </div>
            </div>
          </div>

          {/* Priority and Status */}
          <div className="form-section">
            <h3>Priority & Status</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select id="priority" name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="">Select priority...</option>
                  <option value="emergency">Emergency</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange}>
                  <option value="">Select status...</option>
                  <option value="lead">Lead</option>
                  <option value="inspection_scheduled">Inspection Scheduled</option>
                  <option value="inspected">Inspected</option>
                  <option value="pending_crew">Pending Crew</option>
                  <option value="in_progress">In Progress</option>
                  <option value="wip">WIP</option>
                  <option value="ready_to_bill">Ready to Bill</option>
                  <option value="complete">Complete</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Job Assignment */}
          <div className="form-section">
            <h3>Job Assignment</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="pm">Project Manager</label>
                <input
                  type="text"
                  id="pm"
                  name="pm"
                  value={formData.pm}
                  onChange={handleChange}
                  placeholder="PM name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="estimate_value">Estimate Value</label>
                <input
                  type="number"
                  id="estimate_value"
                  name="estimate_value"
                  value={formData.estimate_value}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label htmlFor="inspection_date">Inspection Date</label>
                <input
                  type="date"
                  id="inspection_date"
                  name="inspection_date"
                  value={formData.inspection_date}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="inspection_completed"
                    checked={formData.inspection_completed}
                    onChange={handleChange}
                  />
                  <span>ATP Signed</span>
                </label>
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="form-section">
            <h3>Property Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="property_type">Property Type</label>
                <select id="property_type" name="property_type" value={formData.property_type} onChange={handleChange}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="cause_of_loss">Cause of Loss</label>
                <select id="cause_of_loss" name="cause_of_loss" value={formData.cause_of_loss} onChange={handleChange}>
                  <option value="">Select cause...</option>
                  <option value="Water Damage">Water Damage</option>
                  <option value="Fire">Fire</option>
                  <option value="Storm/Wind">Storm/Wind</option>
                  <option value="Flood">Flood</option>
                  <option value="Freeze/Burst Pipe">Freeze/Burst Pipe</option>
                  <option value="Sewage Backup">Sewage Backup</option>
                  <option value="Mold">Mold</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sqft_affected">Square Footage Affected</label>
                <input
                  type="number"
                  id="sqft_affected"
                  name="sqft_affected"
                  value={formData.sqft_affected}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="power_at_location">Power at Location</label>
                <select id="power_at_location" name="power_at_location" value={formData.power_at_location} onChange={handleChange}>
                  <option value="">Select...</option>
                  <option value="on">On</option>
                  <option value="off">Off</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="cause_fixed"
                    checked={formData.cause_fixed}
                    onChange={handleChange}
                  />
                  <span>Cause Fixed</span>
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="tarping_needed"
                    checked={formData.tarping_needed}
                    onChange={handleChange}
                  />
                  <span>Tarping Needed</span>
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="boardup_needed"
                    checked={formData.boardup_needed}
                    onChange={handleChange}
                  />
                  <span>Board-Up Needed</span>
                </label>
              </div>
            </div>

            {/* Conditional fields based on property type */}
            {formData.property_type === 'residential' && (
              <div className="form-grid" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="rooms_affected"># Rooms Affected</label>
                  <input
                    type="number"
                    id="rooms_affected"
                    name="rooms_affected"
                    value={formData.rooms_affected}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="foundation_type">Foundation Type</label>
                  <select id="foundation_type" name="foundation_type" value={formData.foundation_type} onChange={handleChange}>
                    <option value="">Select...</option>
                    <option value="crawlspace">Crawlspace</option>
                    <option value="slab">Slab</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="basement_type">Basement</label>
                  <select id="basement_type" name="basement_type" value={formData.basement_type} onChange={handleChange}>
                    <option value="">Select...</option>
                    <option value="finished">Finished</option>
                    <option value="unfinished">Unfinished</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            )}

            {formData.property_type === 'commercial' && (
              <div className="form-grid" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="units_affected"># Units Affected</label>
                  <input
                    type="number"
                    id="units_affected"
                    name="units_affected"
                    value={formData.units_affected}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="floors_affected"># Floors Affected</label>
                  <input
                    type="number"
                    id="floors_affected"
                    name="floors_affected"
                    value={formData.floors_affected}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="parking_location">Parking Location</label>
                  <input
                    type="text"
                    id="parking_location"
                    name="parking_location"
                    value={formData.parking_location}
                    onChange={handleChange}
                    placeholder="Parking location for crew"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="msa_on_file"
                      checked={formData.msa_on_file}
                      onChange={handleChange}
                    />
                    <span>MSA on File</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Payment Information */}
          <div className="form-section">
            <h3>Payment Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="payment_method">Payment Method</label>
                <select id="payment_method" name="payment_method" value={formData.payment_method} onChange={handleChange}>
                  <option value="">Select...</option>
                  <option value="insurance">Insurance</option>
                  <option value="self_pay">Self-Pay</option>
                  <option value="quote_request">Quote Request</option>
                </select>
              </div>
              {formData.payment_method === 'insurance' && (
                <>
                  <div className="form-group">
                    <label htmlFor="insurance_provider">Insurance Provider</label>
                    <input
                      type="text"
                      id="insurance_provider"
                      name="insurance_provider"
                      value={formData.insurance_provider}
                      onChange={handleChange}
                      placeholder="Insurance company"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="insurance_claim_number">Claim #</label>
                    <input
                      type="text"
                      id="insurance_claim_number"
                      name="insurance_claim_number"
                      value={formData.insurance_claim_number}
                      onChange={handleChange}
                      placeholder="Claim number"
                    />
                  </div>
                </>
              )}
              {formData.payment_method === 'self_pay' && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="deposit_explained"
                      checked={formData.deposit_explained}
                      onChange={handleChange}
                    />
                    <span>50% deposit explained</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="form-section">
            <h3>Notes</h3>
            <div className="form-group" style={{ width: '100%' }}>
              <label htmlFor="internal_notes">Internal Notes</label>
              <textarea
                id="internal_notes"
                name="internal_notes"
                value={formData.internal_notes}
                onChange={handleChange}
                rows="4"
                placeholder="Add any additional notes..."
              />
            </div>
          </div>

          <div className="storm-job-edit-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StormJobEditModal;
