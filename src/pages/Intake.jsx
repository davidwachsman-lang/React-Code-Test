import React, { useState, useEffect, useRef } from 'react';
import intakeService from '../services/intakeService';
import './Intake.css';

const INTAKE_TEST_MODE = false;
const SKIP_VALIDATION_FOR_FLOW_TEST = INTAKE_TEST_MODE;
const INTAKE_DRAFT_KEY = 'dw_intake_draft_v1';
const PHONE_FIELDS = new Set([
  'callerPhone',
  'onsitePhone',
  'customerPhone',
  'restorationPhone',
  'insuranceAdjusterPhone',
  'adjPhone',
]);

const formatPhoneInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const formatCurrencyInput = (value) => {
  const cleaned = String(value || '').replace(/[^\d.]/g, '');
  const [rawInt = '', rawDec = ''] = cleaned.split('.');
  const intPart = rawInt.replace(/^0+(?=\d)/, '') || (cleaned.includes('.') ? '0' : '');
  const decPart = rawDec.slice(0, 2);
  return decPart.length > 0 ? `${intPart}.${decPart}` : intPart;
};

function Intake() {
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const draftHydratedRef = useRef(false);
  const autosaveTimeoutRef = useRef(null);
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
  const [standardStep, setStandardStep] = useState(1);
  const [onsiteSameAsCaller, setOnsiteSameAsCaller] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [pendingDraft, setPendingDraft] = useState(null);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState(null);

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
    access: 'Access Instructions',
    lossType: 'Loss Type',
    activeLeak: 'Active Leak',
    urgency: 'Urgency',
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
    let nextValue = value;

    if (PHONE_FIELDS.has(id)) {
      nextValue = formatPhoneInput(value);
    } else if (id === 'claim' || id === 'insurancePolicyNumber') {
      nextValue = String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    } else if (id === 'deductible') {
      nextValue = formatCurrencyInput(value);
    }

    setValidationErrors((prev) => {
      if (!prev[id] && !(id === 'lossType' && nextValue !== 'Water' && (prev.category || prev.wclass))) return prev;
      const next = { ...prev };
      delete next[id];
      if (id === 'lossType' && nextValue !== 'Water') {
        delete next.category;
        delete next.wclass;
      }
      return next;
    });

    // If loss type is changed, automatically update division
    if (id === 'lossType' && nextValue) {
      const mappedDivision = getLossTypeDivision(nextValue);
      setFormData(prev => ({ ...prev, [id]: nextValue, division: mappedDivision }));
    } else {
      setFormData(prev => ({ ...prev, [id]: nextValue }));
    }
  };

  const handleCheckboxChange = (value, setState, state) => {
    setState(prev => 
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const handleDivisionChange = (division) => {
    setFormData(prev => ({ ...prev, division }));
    setStandardStep(1);
    setOnsiteSameAsCaller(false);
  };

  const getStandardStepOneErrors = () => {
    const errors = {};
    const required = ['callerType', 'callerName', 'callerPhone', 'address', 'lossType', 'urgency', 'activeLeak', 'access'];

    for (const field of required) {
      if (!formData[field]) {
        errors[field] = `${fieldLabel[field]} is required`;
      }
    }

    return errors;
  };

  const validateRequired = ({ stepOneOnly = false } = {}) => {
    if (SKIP_VALIDATION_FOR_FLOW_TEST) {
      setValidationErrors({});
      return true;
    }

    // Check if this is a Referral or Large Loss intake
    const isReferralOrLargeLoss = formData.division === 'Referral' || formData.division === 'Large Loss';
    let errors = {};

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
      if (stepOneOnly) {
        errors = getStandardStepOneErrors();
      } else {
      // Validation for standard intake form
      const required = ['callerType', 'callerName', 'callerPhone', 'address', 'lossType', 'urgency', 'activeLeak', 'access'];
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
    }

    setValidationErrors(errors);
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) focusField(firstErrorField);

    if (firstErrorField) return false;
    return true;
  };

  const goToStandardStepTwo = () => {
    if (!validateRequired({ stepOneOnly: true })) return;
    setStandardStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOnsiteSameAsCallerChange = (checked) => {
    setOnsiteSameAsCaller(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        onsiteName: prev.callerName || '',
        onsitePhone: prev.callerPhone || '',
      }));
    }
  };

  const submitIntake = async () => {
    if (!validateRequired()) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    setActionMessage(null);
    setValidationErrors({});

    try {
      if (INTAKE_TEST_MODE) {
        setSubmitSuccess('Test mode is ON. Flow validated and no job was created.');
        return;
      }

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
    setStandardStep(1);
    setOnsiteSameAsCaller(false);
    setActionMessage(null);
    setValidationErrors({});
    localStorage.removeItem(INTAKE_DRAFT_KEY);
    setLastDraftSavedAt(null);
    setPendingDraft(null);
    draftHydratedRef.current = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!onsiteSameAsCaller) return;
    setFormData(prev => {
      const nextName = prev.callerName || '';
      const nextPhone = prev.callerPhone || '';
      if (prev.onsiteName === nextName && prev.onsitePhone === nextPhone) return prev;
      return {
        ...prev,
        onsiteName: nextName,
        onsitePhone: nextPhone,
      };
    });
  }, [onsiteSameAsCaller, formData.callerName, formData.callerPhone]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INTAKE_DRAFT_KEY);
      if (!raw) {
        draftHydratedRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.payload) {
        draftHydratedRef.current = true;
        return;
      }
      setPendingDraft(parsed);
      setLastDraftSavedAt(parsed.savedAt || null);
    } catch (error) {
      draftHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!pendingDraft) return;
    draftHydratedRef.current = false;
  }, [pendingDraft]);

  useEffect(() => {
    if (!draftHydratedRef.current) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      try {
        const savedAt = new Date().toISOString();
        const payload = {
          formData,
          affectedAreas,
          customerForms,
          standardStep,
          onsiteSameAsCaller,
        };
        localStorage.setItem(
          INTAKE_DRAFT_KEY,
          JSON.stringify({ savedAt, payload })
        );
        setLastDraftSavedAt(savedAt);
      } catch (error) {
        // No-op: draft persistence is best effort only.
      }
    }, 400);

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [formData, affectedAreas, customerForms, standardStep, onsiteSameAsCaller]);

  const standardStepOneErrors = getStandardStepOneErrors();
  const standardStepOneMissing = Object.keys(standardStepOneErrors);
  const standardStepOneTotal = 8;
  const standardStepOneComplete = standardStepOneTotal - standardStepOneMissing.length;

  const copyToClipboard = async (text, label) => {
    if (!text) {
      setActionMessage(`No ${label} to copy yet.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setActionMessage(`${label} copied.`);
    } catch (error) {
      setActionMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const openAddressInMaps = () => {
    if (!formData.address) {
      setActionMessage('No address available to open.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.address)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setActionMessage('Opened address in maps.');
  };

  const createDispatchNote = () => {
    const stamp = new Date().toLocaleString();
    const summary = [
      `[Dispatch ${stamp}]`,
      `Caller: ${formData.callerName || 'N/A'} (${formData.callerPhone || 'N/A'})`,
      `Address: ${formData.address || 'N/A'}`,
      `Urgency: ${formData.urgency || 'N/A'}`,
      `Active Leak: ${formData.activeLeak || 'N/A'}`,
    ].join('\n');
    setFormData((prev) => ({
      ...prev,
      notes: prev.notes ? `${prev.notes}\n\n${summary}` : summary,
    }));
    setStandardStep(2);
    setActionMessage('Dispatch note added to Notes.');
  };

  const restoreDraft = (draft) => {
    if (!draft) return;
    const payload = draft.payload || {};
    setFormData((prev) => ({ ...prev, ...(payload.formData || {}) }));
    setAffectedAreas(payload.affectedAreas || []);
    setCustomerForms(payload.customerForms || []);
    setStandardStep(payload.standardStep || 1);
    setOnsiteSameAsCaller(Boolean(payload.onsiteSameAsCaller));
    setLastDraftSavedAt(draft.savedAt || null);
    setPendingDraft(null);
    draftHydratedRef.current = true;
    setActionMessage('Draft restored.');
  };

  const discardDraft = () => {
    localStorage.removeItem(INTAKE_DRAFT_KEY);
    setPendingDraft(null);
    setLastDraftSavedAt(null);
    draftHydratedRef.current = true;
    setActionMessage('Saved draft discarded.');
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
          onClick={() => handleDivisionChange('HB - Nashville')}
        >
          HB - Nashville
        </button>
        <button
          className={`division-btn ${formData.division === 'Large Loss' ? 'active' : ''}`}
          onClick={() => handleDivisionChange('Large Loss')}
        >
          Large Loss
        </button>
        <button
          className={`division-btn ${formData.division === 'Referral' ? 'active' : ''}`}
          onClick={() => handleDivisionChange('Referral')}
        >
          Referral
        </button>
      </div>

      {INTAKE_TEST_MODE && (
        <section className="intake-panel intake-test-banner">
          <p><strong>TEST MODE</strong> is on. Submitting intake will not create a job.</p>
        </section>
      )}

      {pendingDraft && (
        <section className="intake-panel intake-draft-banner">
          <div>
            <strong>Saved draft found.</strong>{' '}
            {pendingDraft.savedAt ? `Saved ${new Date(pendingDraft.savedAt).toLocaleString()}.` : ''}
          </div>
          <div className="btn-group">
            <button type="button" className="btn btn-primary" onClick={() => restoreDraft(pendingDraft)}>
              Restore Draft
            </button>
            <button type="button" className="btn btn-ghost" onClick={discardDraft}>
              Discard Draft
            </button>
          </div>
        </section>
      )}

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
                  {autocompleteStatus === 'ready' && <span style={{ color: '#16A34A', marginLeft: '8px', fontSize: '0.8em' }}>✓ Autocomplete active</span>}
                  {autocompleteStatus === 'loading' && <span style={{ color: '#D97706', marginLeft: '8px', fontSize: '0.8em' }}>Loading...</span>}
                  {autocompleteStatus === 'error' && <span style={{ color: '#DC2626', marginLeft: '8px', fontSize: '0.8em' }}>⚠ API Error</span>}
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
                  <small style={{ color: '#DC2626', display: 'block', marginTop: '4px' }}>
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
      <div className="intake-standard-layout">
      <div className="intake-standard-main">
      <section className="intake-panel intake-step-panel">
        <p className="section-title">FNOL INTAKE FLOW</p>
        <div className="step-chip-row">
          <button
            type="button"
            className={`step-chip ${standardStep === 1 ? 'active' : ''}`}
            onClick={() => setStandardStep(1)}
          >
            1. Dispatch Essentials
          </button>
          <button
            type="button"
            className={`step-chip ${standardStep === 2 ? 'active' : ''}`}
            onClick={goToStandardStepTwo}
          >
            2. Insurance & Admin
          </button>
        </div>
        <div className="step-missing-row">
          {standardStepOneMissing.length === 0 ? (
            <span className="step-complete-chip">Step 1 essentials complete</span>
          ) : (
            standardStepOneMissing.map((field) => (
              <span key={field} className="step-missing-chip">
                Missing: {fieldLabel[field]}
              </span>
            ))
          )}
        </div>
      </section>

      {standardStep === 1 && (
      <>
      {/* STANDARD FORM - Step 1 */}
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
              {autocompleteStatus === 'ready' && <span style={{ color: '#16A34A', marginLeft: '8px', fontSize: '0.8em' }}>✓ Autocomplete active</span>}
              {autocompleteStatus === 'loading' && <span style={{ color: '#D97706', marginLeft: '8px', fontSize: '0.8em' }}>Loading...</span>}
              {autocompleteStatus === 'error' && <span style={{ color: '#DC2626', marginLeft: '8px', fontSize: '0.8em' }}>⚠ API Error</span>}
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
              <small style={{ color: '#DC2626', display: 'block', marginTop: '4px' }}>
                Google Maps API error. Please enter address manually or check browser console for details.
              </small>
            )}
          </div>
          <div className="col-6">
            <label htmlFor="access">Access Instructions</label>
            <input id="access" className={fieldClassName('access')} value={formData.access} onChange={handleInputChange} placeholder="Gate code, lockbox, pets…" aria-invalid={!!validationErrors.access} />
            {renderFieldError('access')}
            <label className="inline-check">
              <input
                type="checkbox"
                checked={onsiteSameAsCaller}
                onChange={(e) => handleOnsiteSameAsCallerChange(e.target.checked)}
              />
              On-site contact same as caller
            </label>
          </div>
          <div className="col-3">
            <label htmlFor="onsiteName">On-site Contact Name</label>
            <input id="onsiteName" value={formData.onsiteName} onChange={handleInputChange} disabled={onsiteSameAsCaller} />
          </div>
          <div className="col-3">
            <label htmlFor="onsitePhone">On-site Contact Phone</label>
            <input id="onsitePhone" value={formData.onsitePhone} onChange={handleInputChange} disabled={onsiteSameAsCaller} />
          </div>
        </div>
      </section>

      {/* Dispatch-Critical Loss Details */}
      <section className="intake-panel">
        <p className="section-title">DISPATCH-CRITICAL LOSS DETAILS</p>
        <div className="intake-grid">
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
            <label htmlFor="activeLeak">Active Leak?</label>
            <select id="activeLeak" className={fieldClassName('activeLeak')} value={formData.activeLeak} onChange={handleInputChange} aria-invalid={!!validationErrors.activeLeak}>
              <option value="">Select…</option>
              <option>Yes</option>
              <option>No</option>
            </select>
            {renderFieldError('activeLeak')}
          </div>
          <div className="col-3">
            <label htmlFor="urgency">Urgency</label>
            <select id="urgency" className={fieldClassName('urgency')} value={formData.urgency} onChange={handleInputChange} aria-invalid={!!validationErrors.urgency}>
              <option value="">Select…</option>
              <option>Emergency (1–3 hrs)</option>
              <option>Same Day</option>
              <option>Next Day</option>
              <option>Scheduled</option>
            </select>
            {renderFieldError('urgency')}
          </div>
        </div>
      </section>

      </>
      )}

      {standardStep === 2 && (
      <>
      <section className="intake-panel">
        <p className="section-title">PROPERTY PROFILE</p>
        <div className="intake-grid">
          <div className="col-3">
            <label htmlFor="propertyType">Property Type</label>
            <select id="propertyType" value={formData.propertyType} onChange={handleInputChange}>
              <option value="">Select…</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
            </select>
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

      <section className="intake-panel">
        <p className="section-title">LOSS DETAILS (DETAILED)</p>
        <div className="intake-grid">
          <div className="col-3">
            <label htmlFor="source">Source of Loss</label>
            <input id="source" value={formData.source} onChange={handleInputChange} placeholder="e.g., burst supply line" />
          </div>
          <div className="col-3">
            <label htmlFor="lossDate">Loss Date/Time</label>
            <input id="lossDate" type="datetime-local" value={formData.lossDate} onChange={handleInputChange} />
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
            <input id="deductible" type="text" inputMode="decimal" value={formData.deductible} onChange={handleInputChange} placeholder="0.00" />
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
      </div>
      <aside className="intake-panel intake-dispatch-card">
        <p className="section-title">DISPATCH CARD</p>
        {lastDraftSavedAt && (
          <p className="dispatch-meta">Draft saved {new Date(lastDraftSavedAt).toLocaleTimeString()}.</p>
        )}
        <div className="dispatch-progress">
          <span>Step 1 Essentials</span>
          <strong>{standardStepOneComplete}/{standardStepOneTotal}</strong>
        </div>
        <div className="dispatch-item">
          <span>Current Step</span>
          <strong>{standardStep === 1 ? 'Dispatch Essentials' : 'Insurance & Admin'}</strong>
        </div>
        <div className="dispatch-item">
          <span>Caller</span>
          <strong>{formData.callerName || 'Not set'}</strong>
        </div>
        <div className="dispatch-item">
          <span>Callback</span>
          <strong>{formData.callerPhone || 'Not set'}</strong>
        </div>
        <div className="dispatch-item">
          <span>Loss Address</span>
          <strong>{formData.address || 'Not set'}</strong>
        </div>
        <div className="dispatch-item">
          <span>Urgency</span>
          <strong>{formData.urgency || 'Not set'}</strong>
        </div>
        <div className="dispatch-item">
          <span>Active Leak</span>
          <strong>{formData.activeLeak || 'Not set'}</strong>
        </div>
        <div className="dispatch-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(formData.callerPhone, 'Callback')}>
            Copy Callback
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => copyToClipboard(formData.address, 'Address')}>
            Copy Address
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={openAddressInMaps}>
            Open in Maps
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={createDispatchNote}>
            Create Dispatch Note
          </button>
        </div>
        {actionMessage && <p className="dispatch-meta">{actionMessage}</p>}
      </aside>
      </div>
        </>
      )}

      {/* Success/Error Messages */}
      {submitSuccess && (
        <div className="intake-panel" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', borderColor: 'rgba(22, 163, 74, 0.3)' }}>
          <p style={{ color: '#16A34A', margin: 0, fontWeight: 600 }}>✓ {submitSuccess}</p>
        </div>
      )}
      {submitError && (
        <div className="intake-panel" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', borderColor: 'rgba(220, 38, 38, 0.3)' }}>
          <p style={{ color: '#DC2626', margin: 0, fontWeight: 600 }}>✗ {submitError}</p>
        </div>
      )}

      {/* Controls */}
      <section className="intake-panel intake-controls">
        {formData.division !== 'Referral' && formData.division !== 'Large Loss' ? (
          <div className="btn-group">
            {standardStep === 2 && (
              <button className="btn btn-ghost" onClick={() => setStandardStep(1)} disabled={submitting}>
                Back to Step 1
              </button>
            )}
            {standardStep === 1 ? (
              <button className="btn btn-primary" onClick={goToStandardStepTwo} disabled={submitting}>
                Continue to Step 2
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={submitIntake}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Intake'}
              </button>
            )}
          </div>
        ) : (
          <div className="btn-group">
            <button
              className="btn btn-primary"
              onClick={submitIntake}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Intake'}
            </button>
          </div>
        )}
        <div className="btn-group">
          <button className="btn btn-danger" onClick={clearForm} disabled={submitting}>Clear Form</button>
        </div>
      </section>
    </div>
  );
}

export default Intake;
