import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import intakeService from '../services/intakeService';
import './Intake.css';

function Intake() {
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [autocompleteStatus, setAutocompleteStatus] = useState('loading');
  const [currentTime, setCurrentTime] = useState(new Date());

  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Removed local theme effect - handled globally now

  const [formData, setFormData] = useState({
    division: 'HB - Nashville',
    propertyType: 'Residential',
    callerType: '', callerName: '', callerPhone: '', callerEmail: '', relationship: '',
    address: '', city: '', state: '', zip: '', latitude: '', longitude: '', access: '', onsiteName: '', onsitePhone: '',
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

  // Specialized handler for Tile Selectors
  const handleTileSelect = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      setSubmitSuccess(`JOB ID: ${result.jobNumber}`);

      // Clear form after successful submission
      setTimeout(() => {
        clearForm();
        setSubmitSuccess(null);
      }, 3000);

    } catch (error) {
      setSubmitError(error.message || 'Submission Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setFormData({
      division: 'HB - Nashville',
      callerType: '', callerName: '', callerPhone: '', callerEmail: '', relationship: '',
      address: '', city: '', state: '', zip: '', latitude: '', longitude: '', access: '', onsiteName: '', onsitePhone: '',
      lossType: '', source: '', lossDate: '', activeLeak: '', category: '', wclass: '', sqft: '',
      carrier: '', claim: '', adjName: '', adjEmail: '', adjPhone: '', deductible: '', coverage: '',
      urgency: '', arrival: '', notes: '', branch: '', assigned: '',
      authReq: '', payMethod: '', authSigner: '', authPhone: ''
    });
    setAffectedAreas([]);
    setCustomerForms([]);
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
    <div className="precision-layout">
      {/* Utility Sidebar Removed - Handled by Navigation */}

      {/* Main Sheet */}
      <main className="precision-main">
        <header className="precision-header">
          <h1>New Loss Intake</h1>
          <div className="p-meta">
            <span style={{ fontFamily: 'var(--precision-mono)' }}>
              {currentTime.toLocaleTimeString()}
            </span>
            <span className="p-separator">|</span>
            <span>{currentTime.toLocaleDateString()}</span>
          </div>
        </header>

        {/* Division Tabs - Pill Style */}
        <div className="precision-tabs">
          <button
            className={`p-tab ${formData.division === 'HB - Nashville' || formData.division === 'MIT' || formData.division === 'RECON' ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, division: 'HB - Nashville' }))}
          >
            Nashville
          </button>
          <button
            className={`p-tab ${formData.division === 'Large Loss' ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, division: 'Large Loss' }))}
          >
            Large Loss
          </button>
          <button
            className={`p-tab ${formData.division === 'Referral' ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, division: 'Referral' }))}
          >
            Referral
          </button>
        </div>

        <div className="precision-content">

          {/* Notifications */}
          {submitSuccess && (
            <div className="p-alert success">
              <span className="icon">✓</span> {submitSuccess}
            </div>
          )}
          {submitError && (
            <div className="p-alert error">
              <span className="icon">⚠</span> {submitError}
            </div>
          )}

          {/* REFERRAL / LARGE LOSS MODE */}
          {formData.division === 'Referral' || formData.division === 'Large Loss' ? (
            <div className="p-grid">

              <section className="p-card">
                <div className="p-card-header">Client Information</div>
                <div className="p-card-body grid-2">
                  <div className="p-input-group full-width">
                    <label>Job Name</label>
                    <input id="jobName" value={formData.jobName} onChange={handleInputChange} className="p-input" placeholder="e.g. Smith Residence" required />
                  </div>
                  <div className="p-input-group">
                    <label>Property Type</label>
                    <select id="propertyType" value={formData.propertyType || 'Commercial'} onChange={handleInputChange} className="p-input">
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                  <div className="p-input-group">
                    <label>Client Name</label>
                    <input id="customerName" value={formData.customerName} onChange={handleInputChange} className="p-input" required />
                  </div>
                  <div className="p-input-group">
                    <label>Phone</label>
                    <input id="customerPhone" type="tel" value={formData.customerPhone} onChange={handleInputChange} className="p-input" required />
                  </div>
                  <div className="p-input-group">
                    <label>Email</label>
                    <input id="customerEmail" type="email" value={formData.customerEmail} onChange={handleInputChange} className="p-input" />
                  </div>
                </div>
              </section>

              <section className="p-card">
                <div className="p-card-header">Location & Access</div>
                <div className="p-card-body grid-2">
                  <div className="p-input-group full-width">
                    <label>
                      Service Address
                      {autocompleteStatus === 'loading' && <span className="p-status loading">Loading...</span>}
                    </label>
                    <input
                      id="address"
                      ref={addressInputRef}
                      value={formData.address}
                      onChange={handleInputChange}
                      className="p-input"
                      placeholder="Start typing..."
                      required
                    />
                  </div>
                  <div className="p-input-group">
                    <label>Access Instructions</label>
                    <input id="access" value={formData.access} onChange={handleInputChange} className="p-input" placeholder="Codes, keys..." />
                  </div>
                  <div className="p-input-group">
                    <label>Onsite Contact</label>
                    <input id="onsiteName" value={formData.onsiteName} onChange={handleInputChange} className="p-input" />
                  </div>
                </div>
              </section>

              {/* Insurance Info */}
              <section className="p-card">
                <div className="p-card-header">Insurance</div>
                <div className="p-card-body grid-2">
                  <div className="p-input-group">
                    <label>Carrier</label>
                    <input id="insuranceCompany" value={formData.insuranceCompany} onChange={handleInputChange} className="p-input" />
                  </div>
                  <div className="p-input-group">
                    <label>Policy #</label>
                    <input id="insurancePolicyNumber" value={formData.insurancePolicyNumber} onChange={handleInputChange} className="p-input" />
                  </div>
                  <div className="p-input-group">
                    <label>Adjuster Name</label>
                    <input id="insuranceAdjusterName" value={formData.insuranceAdjusterName} onChange={handleInputChange} className="p-input" />
                  </div>
                  <div className="p-input-group">
                    <label>Adjuster Phone</label>
                    <input id="insuranceAdjusterPhone" type="tel" value={formData.insuranceAdjusterPhone} onChange={handleInputChange} className="p-input" />
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="p-grid">

              {/* PRIMARY CONTACT */}
              <section className="p-card">
                <div className="p-card-header">Contact Information</div>
                <div className="p-card-body grid-2">
                  <div className="p-input-group">
                    <label>Caller Type</label>
                    <select id="callerType" value={formData.callerType} onChange={handleInputChange} className="p-input" required>
                      <option value="">Select...</option>
                      <option>Homeowner</option>
                      <option>Adjuster</option>
                      <option>Property Manager</option>
                      <option>Tenant</option>
                    </select>
                  </div>
                  <div className="p-input-group">
                    <label>Caller Name</label>
                    <input id="callerName" value={formData.callerName} onChange={handleInputChange} className="p-input" required />
                  </div>
                  <div className="p-input-group">
                    <label>Phone Number</label>
                    <input id="callerPhone" type="tel" value={formData.callerPhone} onChange={handleInputChange} className="p-input highlight" required />
                  </div>
                  <div className="p-input-group">
                    <label>Email</label>
                    <input id="callerEmail" type="email" value={formData.callerEmail} onChange={handleInputChange} className="p-input" />
                  </div>
                </div>
              </section>

              {/* LOCATION */}
              <section className="p-card">
                <div className="p-card-header">Location Details</div>
                <div className="p-card-body grid-2">
                  <div className="p-input-group full-width">
                    <label>
                      Service Address
                      {autocompleteStatus === 'loading' && <span className="p-status loading">...</span>}
                    </label>
                    <input
                      id="address"
                      ref={addressInputRef}
                      value={formData.address}
                      onChange={handleInputChange}
                      className="p-input"
                      placeholder="Start typing address..."
                      required
                    />
                  </div>
                  <div className="p-input-group">
                    <label>Property Type</label>
                    <div className="p-radio-group">
                      <button
                        className={`p-radio-btn ${formData.propertyType === 'Residential' ? 'selected' : ''}`}
                        onClick={() => handleTileSelect('propertyType', 'Residential')}
                      >Residential</button>
                      <button
                        className={`p-radio-btn ${formData.propertyType === 'Commercial' ? 'selected' : ''}`}
                        onClick={() => handleTileSelect('propertyType', 'Commercial')}
                      >Commercial</button>
                    </div>
                  </div>
                  <div className="p-input-group">
                    <label>Access Info</label>
                    <input id="access" value={formData.access} onChange={handleInputChange} className="p-input" placeholder="Gate codes..." />
                  </div>
                </div>
              </section>

              {/* LOSS TILES - CLEAN */}
              <section className="p-card">
                <div className="p-card-header">Loss Classification</div>
                <div className="p-card-body">
                  <div className="p-tile-grid">
                    {['Water', 'Fire', 'Mold', 'Bio', 'Contents'].map(type => (
                      <div
                        key={type}
                        className={`p-tile ${formData.lossType === type ? 'selected' : ''}`}
                        onClick={() => {
                          handleTileSelect('lossType', type);
                          const div = getLossTypeDivision(type);
                          setFormData(prev => ({ ...prev, lossType: type, division: div }));
                        }}
                      >
                        <div className="icon">
                          {type === 'Water' && '💧'}
                          {type === 'Fire' && '🔥'}
                          {type === 'Mold' && '🦠'}
                          {type === 'Bio' && '☣️'}
                          {type === 'Contents' && '📦'}
                        </div>
                        <span className="label">{type}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid-2 mt-4">
                    <div className="p-input-group">
                      <label>Date of Loss</label>
                      <input id="lossDate" type="datetime-local" value={formData.lossDate} onChange={handleInputChange} className="p-input" />
                    </div>
                    <div className="p-input-group">
                      <label>Source</label>
                      <input id="source" value={formData.source} onChange={handleInputChange} className="p-input" placeholder="e.g. Pipe burst" />
                    </div>

                    {formData.lossType === 'Water' && (
                      <>
                        <div className="p-input-group">
                          <label>Category</label>
                          <select id="category" value={formData.category} onChange={handleInputChange} className="p-input">
                            <option value="">Select...</option>
                            <option>1</option>
                            <option>2</option>
                            <option>3</option>
                          </select>
                        </div>
                        <div className="p-input-group">
                          <label>Class</label>
                          <select id="wclass" value={formData.wclass} onChange={handleInputChange} className="p-input">
                            <option value="">Select...</option>
                            <option>1</option>
                            <option>2</option>
                            <option>3</option>
                            <option>4</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Billing */}
              <section className="p-card">
                <div className="p-card-header">Billing & Insurance</div>
                <div className="p-card-body grid-2">
                  <div className="p-input-group">
                    <label>Carrier</label>
                    <input id="carrier" value={formData.carrier} onChange={handleInputChange} className="p-input" />
                  </div>
                  <div className="p-input-group">
                    <label>Claim #</label>
                    <input id="claim" value={formData.claim} onChange={handleInputChange} className="p-input" />
                  </div>
                  <div className="p-input-group">
                    <label>Deductible</label>
                    <input id="deductible" type="number" value={formData.deductible} onChange={handleInputChange} className="p-input" placeholder="0.00" />
                  </div>
                  <div className="p-input-group">
                    <label>Pay Method</label>
                    <select id="payMethod" value={formData.payMethod} onChange={handleInputChange} className="p-input">
                      <option value="">Select...</option>
                      <option>Insurance</option>
                      <option>Self Pay</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Dispatch */}
              <section className="p-card">
                <div className="p-card-header">Dispatch Priority</div>
                <div className="p-card-body grid-2">
                  <div className="p-input-group">
                    <label>Urgency</label>
                    <select id="urgency" value={formData.urgency} onChange={handleInputChange} className="p-input">
                      <option value="">Select...</option>
                      <option>Emergency (Immediate)</option>
                      <option>Same Day</option>
                      <option>Next Day</option>
                      <option>Scheduled</option>
                    </select>
                  </div>
                  <div className="p-input-group">
                    <label>Notes</label>
                    <textarea id="notes" value={formData.notes} onChange={handleInputChange} className="p-input" placeholder="Special instructions..." rows="1"></textarea>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* Precision Footer */}
          <div className="precision-footer">
            <button className="p-btn-secondary" onClick={clearForm} disabled={submitting}>Reset</button>
            <button className="p-btn-primary" onClick={submitIntake} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Job'}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

export default Intake;
