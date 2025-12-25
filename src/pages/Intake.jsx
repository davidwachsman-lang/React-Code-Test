import React, { useState } from 'react';
import intakeService from '../services/intakeService';
import './Intake.css';


function Intake() {
  const [formData, setFormData] = useState({
    division: 'HB - Nashville',
    propertyType: '',
    callerType: '', callerName: '', callerPhone: '', callerEmail: '', relationship: '',
    address: '', city: '', state: '', zip: '', access: '', onsiteName: '', onsitePhone: '',
    lossType: '', source: '', lossDate: '', activeLeak: '', category: '', wclass: '', sqft: '',
    carrier: '', claim: '', adjName: '', adjEmail: '', adjPhone: '', deductible: '', coverage: '',
    urgency: '', arrival: '', notes: '', branch: '', assigned: '',
    authReq: '', payMethod: '', authSigner: '', authPhone: '',
    // Referral-specific fields
    jobName: '', customerName: '', customerEmail: '', customerPhone: '',
    insuranceCompany: '', insurancePolicyNumber: '', insuranceAdjusterName: '', insuranceAdjusterPhone: '', insuranceAdjusterEmail: '',
    restorationCompany: '', restorationContact: '', restorationPhone: '', restorationEmail: ''
  });

  const [affectedAreas, setAffectedAreas] = useState([]);
  const [customerForms, setCustomerForms] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // Map loss types to divisions
  const getLossTypeDivision = (lossType) => {
    // Reconstruction and Board-up go to RECON, everything else is MIT
    if (lossType === 'Reconstruction' || lossType === 'Board-up') {
      return 'RECON';
    }
    return 'MIT';
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;

    // If loss type is changed, automatically update division
    if (id === 'lossType' && value) {
      const mappedDivision = getLossTypeDivision(value);
      setFormData(prev => ({ ...prev, [id]: value, division: mappedDivision }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleCheckboxChange = (value, setState, state) => {
    setState(prev => 
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const validateRequired = () => {
    // Check if this is a Referral or Large Loss intake
    const isReferralOrLargeLoss = formData.division === 'Referral' || formData.division === 'Large Loss';

    if (isReferralOrLargeLoss) {
      // Validation for Referral/Large Loss forms
      const required = ['jobName', 'customerName', 'customerPhone', 'address'];
      for (const field of required) {
        if (!formData[field]) {
          alert(`Please complete required field: ${field}`);
          return false;
        }
      }

      // Referral-specific validation
      if (formData.division === 'Referral') {
        if (!formData.restorationCompany || !formData.restorationPhone) {
          alert('Please complete Restoration Company information');
          return false;
        }
      }
    } else {
      // Validation for standard intake form
      const required = ['callerType', 'callerName', 'callerPhone', 'address', 'lossType'];
      for (const field of required) {
        if (!formData[field]) {
          alert(`Please complete required field: ${field}`);
          return false;
        }
      }
      if (formData.lossType === 'Water') {
        if (!formData.category || !formData.wclass) {
          alert('For Water losses, please specify Category and Class.');
          return false;
        }
      }
    }

    return true;
  };

  const submitIntake = async () => {
    if (!validateRequired()) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const result = await intakeService.submitIntake({
        ...formData,
        affectedAreas
      });

      setSubmitSuccess(`Job created successfully! Job #: ${result.jobNumber}`);

      // Clear form after successful submission
      setTimeout(() => {
        clearForm();
        setSubmitSuccess(null);
      }, 3000);

    } catch (error) {
      setSubmitError(error.message || 'Failed to submit intake form');
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setFormData({
      division: 'HB - Nashville',
      callerType: '', callerName: '', callerPhone: '', callerEmail: '', relationship: '',
      address: '', city: '', state: '', zip: '', access: '', onsiteName: '', onsitePhone: '',
      lossType: '', source: '', lossDate: '', activeLeak: '', category: '', wclass: '', sqft: '',
      carrier: '', claim: '', adjName: '', adjEmail: '', adjPhone: '', deductible: '', coverage: '',
      urgency: '', arrival: '', notes: '', branch: '', assigned: '',
      authReq: '', payMethod: '', authSigner: '', authPhone: ''
    });
    setAffectedAreas([]);
    setCustomerForms([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="intake-wrap">
      {/* Division Selection */}
      <div className="division-buttons">
        <button
          className={`division-btn ${formData.division === 'HB - Nashville' || formData.division === 'MIT' || formData.division === 'RECON' ? 'active' : ''}`}
          onClick={() => setFormData(prev => ({ ...prev, division: 'HB - Nashville' }))}
        >
          HB - Nashville
        </button>
        <button
          className={`division-btn ${formData.division === 'Large Loss' ? 'active' : ''}`}
          onClick={() => setFormData(prev => ({ ...prev, division: 'Large Loss' }))}
        >
          Large Loss
        </button>
        <button
          className={`division-btn ${formData.division === 'Referral' ? 'active' : ''}`}
          onClick={() => setFormData(prev => ({ ...prev, division: 'Referral' }))}
        >
          Referral
        </button>
      </div>

      {/* REFERRAL OR LARGE LOSS FORM */}
      {formData.division === 'Referral' || formData.division === 'Large Loss' ? (
        <>
          {/* Job Name & Client Information */}
          <section className="intake-panel">
            <p className="section-title">JOB NAME & CLIENT INFORMATION</p>
            <div className="intake-grid">
              <div className="col-6">
                <label htmlFor="jobName">Job Name</label>
                <input id="jobName" value={formData.jobName} onChange={handleInputChange} placeholder="Enter job name" required />
              </div>
              <div className="col-6">
                <label htmlFor="propertyType">Property Type</label>
                <select id="propertyType" value={formData.propertyType || 'Commercial'} onChange={handleInputChange}>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
              <div className="col-6">
                <label htmlFor="customerName">Client Name</label>
                <input id="customerName" value={formData.customerName} onChange={handleInputChange} placeholder="John Doe" required />
              </div>
              <div className="col-4">
                <label htmlFor="customerPhone">Client Phone</label>
                <input id="customerPhone" type="tel" value={formData.customerPhone} onChange={handleInputChange} placeholder="(555) 555-5555" required />
              </div>
              <div className="col-4">
                <label htmlFor="customerEmail">Client Email</label>
                <input id="customerEmail" type="email" value={formData.customerEmail} onChange={handleInputChange} placeholder="customer@email.com" />
              </div>
            </div>
          </section>

          {/* Property & Access */}
          <section className="intake-panel">
            <p className="section-title">PROPERTY & ACCESS</p>
            <div className="intake-grid">
              <div className="col-6">
                <label htmlFor="address">Address</label>
                <input id="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main St" required />
              </div>
              <div className="col-3">
                <label htmlFor="city">City</label>
                <input id="city" value={formData.city} onChange={handleInputChange} placeholder="Nashville" required />
              </div>
              <div className="col-2">
                <label htmlFor="state">State</label>
                <input id="state" value={formData.state} onChange={handleInputChange} placeholder="TN" required />
              </div>
              <div className="col-2">
                <label htmlFor="zip">ZIP</label>
                <input id="zip" value={formData.zip} onChange={handleInputChange} placeholder="37201" required />
              </div>
              <div className="col-4">
                <label htmlFor="access">Access Instructions</label>
                <input id="access" value={formData.access} onChange={handleInputChange} placeholder="Gate code, lockbox, etc." />
              </div>
              <div className="col-4">
                <label htmlFor="onsiteName">Onsite Contact Name</label>
                <input id="onsiteName" value={formData.onsiteName} onChange={handleInputChange} placeholder="Contact name" />
              </div>
              <div className="col-4">
                <label htmlFor="onsitePhone">Onsite Contact Phone</label>
                <input id="onsitePhone" type="tel" value={formData.onsitePhone} onChange={handleInputChange} placeholder="(555) 555-5555" />
              </div>
            </div>
          </section>

          {/* Insurance Company Information */}
          <section className="intake-panel">
            <p className="section-title">INSURANCE COMPANY INFORMATION</p>
            <div className="intake-grid">
              <div className="col-6">
                <label htmlFor="insuranceCompany">Insurance Company</label>
                <input id="insuranceCompany" value={formData.insuranceCompany} onChange={handleInputChange} placeholder="ABC Insurance" />
              </div>
              <div className="col-6">
                <label htmlFor="insurancePolicyNumber">Policy Number</label>
                <input id="insurancePolicyNumber" value={formData.insurancePolicyNumber} onChange={handleInputChange} placeholder="POL-123456" />
              </div>
              <div className="col-4">
                <label htmlFor="insuranceAdjusterName">Adjuster Name</label>
                <input id="insuranceAdjusterName" value={formData.insuranceAdjusterName} onChange={handleInputChange} placeholder="Jane Smith" />
              </div>
              <div className="col-4">
                <label htmlFor="insuranceAdjusterPhone">Adjuster Phone</label>
                <input id="insuranceAdjusterPhone" type="tel" value={formData.insuranceAdjusterPhone} onChange={handleInputChange} placeholder="(555) 555-5555" />
              </div>
              <div className="col-4">
                <label htmlFor="insuranceAdjusterEmail">Adjuster Email</label>
                <input id="insuranceAdjusterEmail" type="email" value={formData.insuranceAdjusterEmail} onChange={handleInputChange} placeholder="adjuster@insurance.com" />
              </div>
            </div>
          </section>

          {/* Restoration Company Executing Referral - Only show for Referral division */}
          {formData.division === 'Referral' && (
            <section className="intake-panel">
              <p className="section-title">RESTORATION COMPANY EXECUTING REFERRAL</p>
              <div className="intake-grid">
                <div className="col-6">
                  <label htmlFor="restorationCompany">Company Name</label>
                  <input id="restorationCompany" value={formData.restorationCompany} onChange={handleInputChange} placeholder="XYZ Restoration" required />
                </div>
                <div className="col-6">
                  <label htmlFor="restorationContact">Contact Person</label>
                  <input id="restorationContact" value={formData.restorationContact} onChange={handleInputChange} placeholder="Contact Name" />
                </div>
                <div className="col-6">
                  <label htmlFor="restorationPhone">Phone</label>
                  <input id="restorationPhone" type="tel" value={formData.restorationPhone} onChange={handleInputChange} placeholder="(555) 555-5555" required />
                </div>
                <div className="col-6">
                  <label htmlFor="restorationEmail">Email</label>
                  <input id="restorationEmail" type="email" value={formData.restorationEmail} onChange={handleInputChange} placeholder="contact@restoration.com" />
                </div>
              </div>
            </section>
          )}

          {/* Additional Notes */}
          <section className="intake-panel">
            <p className="section-title">ADDITIONAL NOTES</p>
            <div className="intake-grid">
              <div className="col-12">
                <label htmlFor="notes">Notes</label>
                <textarea id="notes" value={formData.notes} onChange={handleInputChange} rows="4" placeholder="Any additional information..."></textarea>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
      {/* STANDARD FORM - Full intake form */}
      {/* Caller & Loss Identification */}
      <section className="intake-panel">
        <p className="section-title">CALLER & LOSS IDENTIFICATION</p>
        <div className="intake-grid">
          <div className="col-4">
            <label htmlFor="callerType">Caller Type</label>
            <select id="callerType" value={formData.callerType} onChange={handleInputChange} required>
              <option value="">Select…</option>
              <option>Homeowner</option>
              <option>Adjuster</option>
              <option>Property Manager / HOA</option>
              <option>GC</option>
              <option>Tenant</option>
            </select>
          </div>
          <div className="col-4">
            <label htmlFor="callerName">Caller Name</label>
            <input id="callerName" value={formData.callerName} onChange={handleInputChange} placeholder="Jane Smith" required />
          </div>
          <div className="col-4">
            <label htmlFor="callerPhone">Caller Phone</label>
            <input id="callerPhone" type="tel" value={formData.callerPhone} onChange={handleInputChange} placeholder="(555) 555-5555" required />
          </div>
          <div className="col-6">
            <label htmlFor="callerEmail">Caller Email</label>
            <input id="callerEmail" type="email" value={formData.callerEmail} onChange={handleInputChange} placeholder="name@email.com" />
          </div>
          <div className="col-6">
            <label htmlFor="relationship">Relationship to Property</label>
            <select id="relationship" value={formData.relationship} onChange={handleInputChange}>
              <option value="">Select…</option>
              <option>Owner</option>
              <option>Insured</option>
              <option>Tenant</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </section>

      {/* Property & Access */}
      <section className="intake-panel">
        <p className="section-title">PROPERTY & ACCESS</p>
        <div className="intake-grid">
          <div className="col-6">
            <label htmlFor="address">Loss Address</label>
            <input id="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main St" required />
          </div>
          <div className="col-2">
            <label htmlFor="city">City</label>
            <input id="city" value={formData.city} onChange={handleInputChange} />
          </div>
          <div className="col-2">
            <label htmlFor="state">State</label>
            <input id="state" maxLength="2" value={formData.state} onChange={handleInputChange} placeholder="TN" />
          </div>
          <div className="col-2">
            <label htmlFor="zip">ZIP</label>
            <input id="zip" value={formData.zip} onChange={handleInputChange} />
          </div>
          <div className="col-6">
            <label htmlFor="access">Access Instructions</label>
            <input id="access" value={formData.access} onChange={handleInputChange} placeholder="Gate code, lockbox, pets…" />
          </div>
          <div className="col-3">
            <label htmlFor="onsiteName">On-site Contact Name</label>
            <input id="onsiteName" value={formData.onsiteName} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="onsitePhone">On-site Contact Phone</label>
            <input id="onsitePhone" value={formData.onsitePhone} onChange={handleInputChange} />
          </div>
        </div>
      </section>

      {/* Loss Details */}
      <section className="intake-panel">
        <p className="section-title">LOSS DETAILS</p>
        <div className="intake-grid">
          <div className="col-3">
            <label htmlFor="propertyType">Property Type</label>
            <select id="propertyType" value={formData.propertyType} onChange={handleInputChange} required>
              <option value="">Select…</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
            </select>
          </div>
          <div className="col-3">
            <label htmlFor="lossType">Loss Type</label>
            <select id="lossType" value={formData.lossType} onChange={handleInputChange} required>
              <option value="">Select…</option>
              <option>Water</option>
              <option>Fire</option>
              <option>Mold</option>
              <option>Bio</option>
              <option>Trauma</option>
              <option>Board-up</option>
              <option>Reconstruction</option>
              <option>Contents</option>
            </select>
          </div>
          <div className="col-3">
            <label htmlFor="source">Source of Loss</label>
            <input id="source" value={formData.source} onChange={handleInputChange} placeholder="e.g., burst supply line" />
          </div>
          <div className="col-3">
            <label htmlFor="lossDate">Loss Date/Time</label>
            <input id="lossDate" type="datetime-local" value={formData.lossDate} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="activeLeak">Active Leak?</label>
            <select id="activeLeak" value={formData.activeLeak} onChange={handleInputChange}>
              <option value="">Select…</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
          <div className="col-3">
            <label htmlFor="category">Water Category</label>
            <select id="category" value={formData.category} onChange={handleInputChange}>
              <option value="">N/A / Unknown</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
          <div className="col-3">
            <label htmlFor="wclass">Water Class</label>
            <select id="wclass" value={formData.wclass} onChange={handleInputChange}>
              <option value="">N/A / Unknown</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
              <option>4</option>
            </select>
          </div>
          <div className="col-12">
            <label>Affected Areas</label>
            <div className="pill-container">
              {['Kitchen', 'Bath', 'Living Room', 'Bedroom', 'Basement', 'Attic', 'Exterior'].map(area => (
                <label key={area} className="pill">
                  <input 
                    type="checkbox" 
                    checked={affectedAreas.includes(area)}
                    onChange={() => handleCheckboxChange(area, setAffectedAreas, affectedAreas)}
                  />
                  {area}
                </label>
              ))}
            </div>
          </div>
          <div className="col-3">
            <label htmlFor="sqft">Estimated Affected SF</label>
            <input id="sqft" type="number" min="0" step="1" value={formData.sqft} onChange={handleInputChange} />
          </div>
        </div>
      </section>

      {/* Insurance */}
      <section className="intake-panel">
        <p className="section-title">INSURANCE</p>
        <div className="intake-grid">
          <div className="col-3">
            <label htmlFor="carrier">Carrier</label>
            <input id="carrier" value={formData.carrier} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="claim">Claim #</label>
            <input id="claim" value={formData.claim} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="adjName">Adjuster Name</label>
            <input id="adjName" value={formData.adjName} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="adjEmail">Adjuster Email</label>
            <input id="adjEmail" type="email" value={formData.adjEmail} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="adjPhone">Adjuster Phone</label>
            <input id="adjPhone" value={formData.adjPhone} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="deductible">Deductible ($)</label>
            <input id="deductible" type="number" min="0" step="0.01" value={formData.deductible} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="coverage">Coverage Confirmed</label>
            <select id="coverage" value={formData.coverage} onChange={handleInputChange}>
              <option value="">Unknown</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
        </div>
      </section>

      {/* Dispatch */}
      <section className="intake-panel">
        <p className="section-title">DISPATCH</p>
        <div className="intake-grid">
          <div className="col-3">
            <label htmlFor="urgency">Urgency</label>
            <select id="urgency" value={formData.urgency} onChange={handleInputChange}>
              <option value="">Select…</option>
              <option>Emergency (1–3 hrs)</option>
              <option>Same Day</option>
              <option>Next Day</option>
              <option>Scheduled</option>
            </select>
          </div>
          <div className="col-3">
            <label htmlFor="arrival">Preferred Arrival Window</label>
            <input id="arrival" value={formData.arrival} onChange={handleInputChange} placeholder="e.g., 2–4pm" />
          </div>
          <div className="col-3">
            <label htmlFor="branch">Branch Assignment</label>
            <input id="branch" value={formData.branch} onChange={handleInputChange} placeholder="e.g., Nashville" />
          </div>
          <div className="col-3">
            <label htmlFor="assigned">PM/Tech Assigned</label>
            <input id="assigned" value={formData.assigned} onChange={handleInputChange} placeholder="Optional" />
          </div>
          <div className="col-12">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" value={formData.notes} onChange={handleInputChange} placeholder="Special instructions, hazards, pets, etc."></textarea>
          </div>
        </div>
      </section>

      {/* Authorization & Payment */}
      <section className="intake-panel">
        <p className="section-title">AUTHORIZATION & PAYMENT</p>
        <div className="intake-grid">
          <div className="col-3">
            <label htmlFor="authReq">Authorization Required</label>
            <select id="authReq" value={formData.authReq} onChange={handleInputChange}>
              <option value="">Select…</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
          <div className="col-3">
            <label htmlFor="payMethod">Payment Method</label>
            <select id="payMethod" value={formData.payMethod} onChange={handleInputChange}>
              <option value="">Select…</option>
              <option>QBO Payment Link</option>
              <option>Apple Pay</option>
              <option>Card on File</option>
              <option>Check on Site</option>
            </select>
          </div>
          <div className="col-3">
            <label htmlFor="authSigner">Authorized Signer</label>
            <input id="authSigner" value={formData.authSigner} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="authPhone">Authorized Signer Phone/Email</label>
            <input id="authPhone" value={formData.authPhone} onChange={handleInputChange} placeholder="(555) 555-5555 or email" />
          </div>
        </div>
      </section>

      {/* Customer Forms */}
      <section className="intake-panel">
        <p className="section-title">CUSTOMER FORMS</p>
        <div className="pill-container">
          {['ATP', 'Equipment', 'Contents'].map(form => (
            <label key={form} className="pill">
              <input 
                type="checkbox" 
                checked={customerForms.includes(form)}
                onChange={() => handleCheckboxChange(form, setCustomerForms, customerForms)}
              />
              {form}
            </label>
          ))}
        </div>
      </section>
        </>
      )}

      {/* Success/Error Messages */}
      {submitSuccess && (
        <div className="intake-panel" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
          <p style={{ color: '#22c55e', margin: 0, fontWeight: 600 }}>✓ {submitSuccess}</p>
        </div>
      )}
      {submitError && (
        <div className="intake-panel" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <p style={{ color: '#ef4444', margin: 0, fontWeight: 600 }}>✗ {submitError}</p>
        </div>
      )}

      {/* Controls */}
      <section className="intake-panel intake-controls">
        <div className="btn-group">
          <button
            className="btn btn-primary"
            onClick={submitIntake}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Intake'}
          </button>
        </div>
        <div className="btn-group">
          <button className="btn btn-danger" onClick={clearForm} disabled={submitting}>Clear Form</button>
        </div>
      </section>
    </div>
  );
}

export default Intake;
