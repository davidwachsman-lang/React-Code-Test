import React, { useState, useEffect, useRef } from 'react';
import intakeService from '../services/intakeService';
import './Intake.css';


function Intake() {
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [autocompleteStatus, setAutocompleteStatus] = useState('loading');
  
  const [formData, setFormData] = useState({
    division: 'HB - Nashville',
    propertyType: '',
    callerType: '', callerName: '', callerPhone: '', callerEmail: '', relationship: '',
    address: '', city: '', state: '', zip: '', latitude: '', longitude: '', access: '', onsiteName: '', onsitePhone: '',
    propertyStatus: '', powerStatus: '', yearBuilt: '', foundationType: '',
    lossType: '', source: '', lossDate: '', activeLeak: '', category: '', wclass: '', sqft: '',
    roomsAffected: '', floorsAffected: '', unitsAffected: '', affectedMaterials: '', tempRepairs: '',
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
  const [validationErrors, setValidationErrors] = useState({});

  const fieldLabel = {
    jobName: 'Job Name',
    customerName: 'Client Name',
    customerPhone: 'Client Phone',
    address: 'Address',
    restorationCompany: 'Restoration Company',
    restorationPhone: 'Restoration Phone',
    callerType: 'Caller Type',
    callerName: 'Caller Name',
    callerPhone: 'Caller Phone',
    lossType: 'Loss Type',
    category: 'Water Category',
    wclass: 'Water Class',
  };

  const fieldClassName = (id) => (validationErrors[id] ? 'field-invalid' : '');
  const renderFieldError = (id) => (
    validationErrors[id] ? <small className="field-error">{validationErrors[id]}</small> : null
  );

  const focusField = (fieldId) => {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    requestAnimationFrame(() => el.focus());
  };

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

    setValidationErrors((prev) => {
      if (!prev[id] && !(id === 'lossType' && value !== 'Water' && (prev.category || prev.wclass))) return prev;
      const next = { ...prev };
      delete next[id];
      if (id === 'lossType' && value !== 'Water') {
        delete next.category;
        delete next.wclass;
      }
      return next;
    });

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
    const errors = {};

    if (isReferralOrLargeLoss) {
      // Validation for Referral/Large Loss forms
      const required = ['jobName', 'customerName', 'customerPhone', 'address'];
      for (const field of required) {
        if (!formData[field]) {
          errors[field] = `${fieldLabel[field]} is required`;
        }
      }

      // Referral-specific validation
      if (formData.division === 'Referral') {
        if (!formData.restorationCompany || !formData.restorationPhone) {
          if (!formData.restorationCompany) errors.restorationCompany = `${fieldLabel.restorationCompany} is required`;
          if (!formData.restorationPhone) errors.restorationPhone = `${fieldLabel.restorationPhone} is required`;
        }
      }
    } else {
      // Validation for standard intake form
      const required = ['callerType', 'callerName', 'callerPhone', 'address', 'lossType'];
      for (const field of required) {
        if (!formData[field]) {
          errors[field] = `${fieldLabel[field]} is required`;
        }
      }
      if (formData.lossType === 'Water') {
        if (!formData.category || !formData.wclass) {
          if (!formData.category) errors.category = `${fieldLabel.category} is required for Water loss`;
          if (!formData.wclass) errors.wclass = `${fieldLabel.wclass} is required for Water loss`;
        }
      }
    }

    setValidationErrors(errors);
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) focusField(firstErrorField);

    if (firstErrorField) return false;
    return true;
  };

  const submitIntake = async () => {
    if (!validateRequired()) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    setValidationErrors({});

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
      propertyType: '',
      callerType: '', callerName: '', callerPhone: '', callerEmail: '', relationship: '',
      address: '', city: '', state: '', zip: '', latitude: '', longitude: '', access: '', onsiteName: '', onsitePhone: '',
      propertyStatus: '', powerStatus: '', yearBuilt: '', foundationType: '',
      lossType: '', source: '', lossDate: '', activeLeak: '', category: '', wclass: '', sqft: '',
      roomsAffected: '', floorsAffected: '', unitsAffected: '', affectedMaterials: '', tempRepairs: '',
      carrier: '', claim: '', adjName: '', adjEmail: '', adjPhone: '', deductible: '', coverage: '',
      urgency: '', arrival: '', notes: '', branch: '', assigned: '',
      authReq: '', payMethod: '', authSigner: '', authPhone: '',
      jobName: '', customerName: '', customerEmail: '', customerPhone: '',
      insuranceCompany: '', insurancePolicyNumber: '', insuranceAdjusterName: '', insuranceAdjusterPhone: '', insuranceAdjusterEmail: '',
      restorationCompany: '', restorationContact: '', restorationPhone: '', restorationEmail: '',
    });
    setAffectedAreas([]);
    setCustomerForms([]);
    setValidationErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initialize Google Places Autocomplete for property address
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 30; // 3 seconds max wait time

    const initAutocomplete = () => {
      // Check for Google Maps errors first
      if (window.googleMapsError) {
        console.error('Google Maps Error:', window.googleMapsError);
        setAutocompleteStatus('error');
        return;
      }

      // Check if input element exists and is in the DOM
      if (!addressInputRef.current || !document.contains(addressInputRef.current)) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        }
        return;
      }

      // Check if Google Maps API is loaded with standard Places library
      if (!window.google || !window.google.maps || !window.google.maps.places || !window.google.maps.places.Autocomplete) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        } else {
          console.warn('Google Maps API not loaded after 3 seconds. Autocomplete disabled.');
          setAutocompleteStatus('unavailable');
        }
        return;
      }

      // Initialize standard Google Places Autocomplete
      try {
        console.log('Initializing Google Places Autocomplete for Intake form...');
        
        // Create autocomplete instance directly on the input element
        const autocompleteInstance = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'address_components', 'geometry', 'name']
          }
        );
        
        console.log('✓ Autocomplete initialized successfully');
        setAutocompleteStatus('ready');
        
        // Listen for place selection
        autocompleteInstance.addListener('place_changed', () => {
          try {
            const place = autocompleteInstance.getPlace();
            console.log('Place selected:', place);
            
            if (!place || !place.geometry) {
              console.warn('No geometry found for selected place');
              return;
            }
            
            // Get formatted address
            const address = place.formatted_address || place.name || '';
            console.log('Address:', address);
              
            // Extract address components
            let city = '';
            let state = '';
            let zip = '';
          
            if (place.address_components) {
              place.address_components.forEach(component => {
                const types = component.types || [];
                if (types.includes('locality')) {
                  city = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                  state = component.short_name;
                }
                if (types.includes('postal_code')) {
                  zip = component.long_name;
                }
              });
            }
              
            // Extract coordinates
            let latitude = '';
            let longitude = '';
            if (place.geometry && place.geometry.location) {
              latitude = place.geometry.location.lat().toString();
              longitude = place.geometry.location.lng().toString();
            }
            
            // Fallback for city if not found
            if (!city) {
              const parts = address.split(',');
              if (parts.length >= 2) {
                city = parts[1].trim();
              } else {
                city = 'Unknown';
              }
            }
              
            console.log('Extracted data:', { address, city, state, zip, latitude, longitude });
              
            // Update form state
            setFormData(prev => ({
              ...prev,
              address: address,
              city: city || 'Unknown',
              state: state || '',
              zip: zip || '',
              latitude: latitude || '',
              longitude: longitude || ''
            }));
            
            // Show user feedback
            if (latitude && longitude) {
              console.log('✓ Address with coordinates captured successfully');
            } else {
              console.warn('⚠ Address captured but no coordinates');
            }
          } catch (error) {
            console.error('Error processing place selection:', error);
          }
        });

        // Store reference for cleanup
        autocompleteRef.current = autocompleteInstance;
      } catch (error) {
        console.error('Google Places initialization error:', error);
        setAutocompleteStatus('error');
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initAutocomplete, 200);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

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

      {Object.keys(validationErrors).length > 0 && (
        <section className="intake-panel intake-validation-panel">
          <p className="section-title">REQUIRED FIELDS</p>
          <ul className="intake-error-list">
            {Object.entries(validationErrors).map(([field, message]) => (
              <li key={field}>
                <button type="button" className="intake-error-link" onClick={() => focusField(field)}>{message}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* REFERRAL OR LARGE LOSS FORM */}
      {formData.division === 'Referral' || formData.division === 'Large Loss' ? (
        <>
          {/* Job Name & Client Information */}
          <section className="intake-panel">
            <p className="section-title">JOB NAME & CLIENT INFORMATION</p>
            <div className="intake-grid">
              <div className="col-6">
                <label htmlFor="jobName">Job Name</label>
                <input id="jobName" className={fieldClassName('jobName')} value={formData.jobName} onChange={handleInputChange} placeholder="Enter job name" aria-invalid={!!validationErrors.jobName} required />
                {renderFieldError('jobName')}
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
                <input id="customerName" className={fieldClassName('customerName')} value={formData.customerName} onChange={handleInputChange} placeholder="John Doe" aria-invalid={!!validationErrors.customerName} required />
                {renderFieldError('customerName')}
              </div>
              <div className="col-4">
                <label htmlFor="customerPhone">Client Phone</label>
                <input id="customerPhone" className={fieldClassName('customerPhone')} type="tel" value={formData.customerPhone} onChange={handleInputChange} placeholder="(555) 555-5555" aria-invalid={!!validationErrors.customerPhone} required />
                {renderFieldError('customerPhone')}
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
              <div className="col-12">
                <label htmlFor="address">
                  Address
                  {autocompleteStatus === 'ready' && <span style={{ color: '#22c55e', marginLeft: '8px', fontSize: '0.8em' }}>✓ Autocomplete active</span>}
                  {autocompleteStatus === 'loading' && <span style={{ color: '#f59e0b', marginLeft: '8px', fontSize: '0.8em' }}>Loading...</span>}
                  {autocompleteStatus === 'error' && <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '0.8em' }}>⚠ API Error</span>}
                  {autocompleteStatus === 'unavailable' && <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '0.8em' }}>Manual entry</span>}
                </label>
                <input 
                  id="address" 
                  className={fieldClassName('address')}
                  ref={addressInputRef}
                  value={formData.address} 
                  onChange={handleInputChange} 
                  placeholder={autocompleteStatus === 'ready' ? "Start typing address..." : "Enter full address manually"}
                  autoComplete="off"
                  aria-invalid={!!validationErrors.address}
                  required 
                />
                {renderFieldError('address')}
                {autocompleteStatus === 'error' && (
                  <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                    Google Maps API error. Please enter address manually or check browser console for details.
                  </small>
                )}
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
                  <input id="restorationCompany" className={fieldClassName('restorationCompany')} value={formData.restorationCompany} onChange={handleInputChange} placeholder="XYZ Restoration" aria-invalid={!!validationErrors.restorationCompany} required />
                  {renderFieldError('restorationCompany')}
                </div>
                <div className="col-6">
                  <label htmlFor="restorationContact">Contact Person</label>
                  <input id="restorationContact" value={formData.restorationContact} onChange={handleInputChange} placeholder="Contact Name" />
                </div>
                <div className="col-6">
                  <label htmlFor="restorationPhone">Phone</label>
                  <input id="restorationPhone" className={fieldClassName('restorationPhone')} type="tel" value={formData.restorationPhone} onChange={handleInputChange} placeholder="(555) 555-5555" aria-invalid={!!validationErrors.restorationPhone} required />
                  {renderFieldError('restorationPhone')}
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
            <select id="callerType" className={fieldClassName('callerType')} value={formData.callerType} onChange={handleInputChange} aria-invalid={!!validationErrors.callerType} required>
              <option value="">Select…</option>
              <option>Homeowner</option>
              <option>Adjuster</option>
              <option>Property Manager / HOA</option>
              <option>GC</option>
              <option>Tenant</option>
            </select>
            {renderFieldError('callerType')}
          </div>
          <div className="col-4">
            <label htmlFor="callerName">Caller Name</label>
            <input id="callerName" className={fieldClassName('callerName')} value={formData.callerName} onChange={handleInputChange} placeholder="Jane Smith" aria-invalid={!!validationErrors.callerName} required />
            {renderFieldError('callerName')}
          </div>
          <div className="col-4">
            <label htmlFor="callerPhone">Caller Phone</label>
            <input id="callerPhone" className={fieldClassName('callerPhone')} type="tel" value={formData.callerPhone} onChange={handleInputChange} placeholder="(555) 555-5555" aria-invalid={!!validationErrors.callerPhone} required />
            {renderFieldError('callerPhone')}
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
          <div className="col-12">
            <label htmlFor="address">
              Loss Address
              {autocompleteStatus === 'ready' && <span style={{ color: '#22c55e', marginLeft: '8px', fontSize: '0.8em' }}>✓ Autocomplete active</span>}
              {autocompleteStatus === 'loading' && <span style={{ color: '#f59e0b', marginLeft: '8px', fontSize: '0.8em' }}>Loading...</span>}
              {autocompleteStatus === 'error' && <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '0.8em' }}>⚠ API Error</span>}
              {autocompleteStatus === 'unavailable' && <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '0.8em' }}>Manual entry</span>}
            </label>
            <input 
              id="address" 
              className={fieldClassName('address')}
              ref={addressInputRef}
              value={formData.address} 
              onChange={handleInputChange} 
              placeholder={autocompleteStatus === 'ready' ? "Start typing address..." : "Enter full address manually"}
              autoComplete="off"
              aria-invalid={!!validationErrors.address}
              required 
            />
            {renderFieldError('address')}
            {autocompleteStatus === 'error' && (
              <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                Google Maps API error. Please enter address manually or check browser console for details.
              </small>
            )}
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
          <div className="col-3">
            <label htmlFor="propertyStatus">Property Status</label>
            <select id="propertyStatus" value={formData.propertyStatus} onChange={handleInputChange}>
              <option value="">Select…</option>
              <option>Vacant</option>
              <option>Occupied</option>
            </select>
          </div>
          <div className="col-3">
            <label htmlFor="powerStatus">Power Status</label>
            <select id="powerStatus" value={formData.powerStatus} onChange={handleInputChange}>
              <option value="">Select…</option>
              <option>Power</option>
              <option>No Power</option>
            </select>
          </div>
          <div className="col-3">
            <label htmlFor="yearBuilt">Year Built</label>
            <input id="yearBuilt" type="text" value={formData.yearBuilt} onChange={handleInputChange} placeholder="e.g., 1995" />
          </div>
          <div className="col-3">
            <label htmlFor="foundationType">Foundation Type</label>
            <select id="foundationType" value={formData.foundationType} onChange={handleInputChange}>
              <option value="">Select…</option>
              <option>Slab</option>
              <option>Crawlspace</option>
            </select>
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
            <select id="lossType" className={fieldClassName('lossType')} value={formData.lossType} onChange={handleInputChange} aria-invalid={!!validationErrors.lossType} required>
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
            {renderFieldError('lossType')}
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
            <select id="category" className={fieldClassName('category')} value={formData.category} onChange={handleInputChange} aria-invalid={!!validationErrors.category}>
              <option value="">N/A / Unknown</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
            {renderFieldError('category')}
          </div>
          <div className="col-3">
            <label htmlFor="wclass">Water Class</label>
            <select id="wclass" className={fieldClassName('wclass')} value={formData.wclass} onChange={handleInputChange} aria-invalid={!!validationErrors.wclass}>
              <option value="">N/A / Unknown</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
              <option>4</option>
            </select>
            {renderFieldError('wclass')}
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
          <div className="col-3">
            <label htmlFor="roomsAffected"># of Rooms Affected</label>
            <input id="roomsAffected" type="number" min="0" step="1" value={formData.roomsAffected} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="floorsAffected"># of Floors Affected</label>
            <input id="floorsAffected" type="number" min="0" step="1" value={formData.floorsAffected} onChange={handleInputChange} />
          </div>
          <div className="col-3">
            <label htmlFor="unitsAffected"># of Units Affected</label>
            <input id="unitsAffected" type="number" min="0" step="1" value={formData.unitsAffected} onChange={handleInputChange} />
          </div>
          <div className="col-6">
            <label htmlFor="affectedMaterials">Affected Materials</label>
            <input id="affectedMaterials" value={formData.affectedMaterials} onChange={handleInputChange} placeholder="e.g., drywall, carpet, hardwood" />
          </div>
          <div className="col-6">
            <label htmlFor="tempRepairs">Temp Repairs</label>
            <input id="tempRepairs" value={formData.tempRepairs} onChange={handleInputChange} placeholder="e.g., tarp on roof, shut off valve" />
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
