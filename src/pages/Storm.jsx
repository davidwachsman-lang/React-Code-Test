import React, { useState, useEffect, useRef } from 'react';
import './Page.css';
import './Storm.css';

function Storm() {
  const [activeView, setActiveView] = useState(null);
  const [manageEventTab, setManageEventTab] = useState('intake');
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [intakeFormData, setIntakeFormData] = useState({
    // Customer Info
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    propertyAddress: '',
    city: '',
    state: '',
    zip: '',
    latitude: '',
    longitude: '',
    // Emergency Details
    standingWaterNow: false,
    waterReceded: false,
    structuralDamageVisible: false,
    electricalHazard: false,
    moldVisible: false,
    sewageContamination: false,
    affectedAreaSize: '',
    waterDepth: '',
    // Priority
    priority: '',
    // Insurance
    hasInsurance: false,
    insuranceCompany: '',
    cashPrivatePay: false,
    unknownWillCallBack: false,
    // Notes
    notes: '',
    // Intake Taken By
    intakeTakenBy: '',
    intakeDate: '',
    intakeTime: ''
  });

  // Set date and time when component mounts or when intake tab is selected
  useEffect(() => {
    if (manageEventTab === 'intake') {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      
      setIntakeFormData(prev => ({
        ...prev,
        intakeDate: prev.intakeDate || dateStr,
        intakeTime: prev.intakeTime || timeStr
      }));
    }
  }, [manageEventTab]);

  // Initialize Google Places Autocomplete for property address using new PlaceAutocompleteElement
  useEffect(() => {
    // Only initialize when manage event is active and intake tab is selected
    if (activeView !== 'manage-event' || manageEventTab !== 'intake') {
      return;
    }

    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max wait time

    const initAutocomplete = () => {
      // Check if input element exists and is in the DOM
      if (!addressInputRef.current || !document.contains(addressInputRef.current)) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        }
        return;
      }

      // Check if Google Maps API is loaded with new Places API
      if (!window.google || !window.google.maps || !window.google.maps.places || !window.google.maps.places.PlaceAutocompleteElement) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        } else {
          console.warn('Google Maps API not loaded. Autocomplete will not work. You can still type addresses manually.');
          console.warn('Make sure you have enabled "Places API (New)" in Google Cloud Console.');
        }
        return;
      }

      // Initialize new PlaceAutocompleteElement
      try {
        // Create the web component if it doesn't exist
        if (!customElements.get('gmp-place-autocomplete')) {
          customElements.define(
            'gmp-place-autocomplete',
            window.google.maps.places.PlaceAutocompleteElement
          );
        }

        // Create autocomplete element
        const autocompleteElement = document.createElement('gmp-place-autocomplete');
        autocompleteElement.setAttribute('id', 'property-address-autocomplete');
        autocompleteElement.setAttribute('placeholder', 'Start typing address...');
        autocompleteElement.setAttribute('requested-result-type', 'address');
        autocompleteElement.setAttribute('country-restrictions', 'us');
        
        // Style the element to match other form inputs exactly
        autocompleteElement.style.width = '100%';
        // Use lighter background for better contrast with dark text
        autocompleteElement.style.setProperty('--gmpx-color-surface', 'rgba(51, 65, 85, 0.9)', 'important');
        autocompleteElement.style.setProperty('--gmpx-color-on-surface', '#1e293b', 'important');
        autocompleteElement.style.setProperty('--gmpx-color-on-surface-variant', '#334155', 'important');
        autocompleteElement.style.setProperty('--gmpx-color-primary', '#3b82f6', 'important');
        autocompleteElement.style.setProperty('--gmpx-color-outline', 'rgba(59, 130, 246, 0.3)', 'important');
        autocompleteElement.style.setProperty('--gmpx-font-family-base', 'inherit', 'important');
        autocompleteElement.style.setProperty('--gmpx-font-size-base', '0.95rem', 'important');
        
        // Create a wrapper div with the styling we want
        const wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-wrapper';
        wrapper.style.width = '100%';
        wrapper.style.padding = '0.75rem';
        wrapper.style.border = '1px solid rgba(59, 130, 246, 0.3)';
        wrapper.style.borderRadius = '8px';
        wrapper.style.backgroundColor = '#ffffff'; // White background for better contrast
        wrapper.style.transition = 'all 0.3s ease';
        wrapper.style.boxSizing = 'border-box';
        
        // Style the autocomplete element itself - make it completely transparent and remove all borders
        autocompleteElement.style.width = '100%';
        autocompleteElement.style.display = 'block';
        autocompleteElement.style.padding = '0';
        autocompleteElement.style.border = 'none';
        autocompleteElement.style.borderRadius = '0';
        autocompleteElement.style.background = 'transparent';
        autocompleteElement.style.margin = '0';
        autocompleteElement.style.boxShadow = 'none';
        autocompleteElement.style.outline = 'none';
        
        // Function to inject styles into shadow DOM
        const injectShadowStyles = () => {
          if (autocompleteElement.shadowRoot) {
            // Check if styles already injected
            if (autocompleteElement.shadowRoot.querySelector('style[data-custom-styles]')) {
              return;
            }
            
            const style = document.createElement('style');
            style.setAttribute('data-custom-styles', 'true');
            style.textContent = `
              * {
                box-sizing: border-box !important;
              }
              input,
              input[type="text"],
              input[type="search"],
              [role="combobox"],
              [role="textbox"] {
                color: #1e293b !important;
                background-color: transparent !important;
                border: none !important;
                border-radius: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                font-size: 0.95rem !important;
                font-family: inherit !important;
                width: 100% !important;
                box-sizing: border-box !important;
                outline: none !important;
                box-shadow: none !important;
                pointer-events: auto !important;
                cursor: text !important;
              }
              input::placeholder,
              [role="combobox"]::placeholder,
              [role="textbox"]::placeholder {
                color: #64748b !important;
                opacity: 1 !important;
              }
              input:focus,
              [role="combobox"]:focus,
              [role="textbox"]:focus {
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
                background-color: transparent !important;
                color: #1e293b !important;
              }
            `;
            autocompleteElement.shadowRoot.appendChild(style);
            
            // Also directly style any input elements found - remove all borders and backgrounds
            const inputs = autocompleteElement.shadowRoot.querySelectorAll('input, [role="combobox"], [role="textbox"]');
            inputs.forEach(input => {
              input.style.color = '#1e293b';
              input.style.backgroundColor = 'transparent';
              input.style.border = 'none';
              input.style.borderRadius = '0';
              input.style.padding = '0';
              input.style.margin = '0';
              input.style.fontSize = '0.95rem';
              input.style.fontFamily = 'inherit';
              input.style.width = '100%';
              input.style.boxSizing = 'border-box';
              input.style.outline = 'none';
              input.style.boxShadow = 'none';
              input.style.pointerEvents = 'auto';
              input.style.cursor = 'text';
              // Ensure input is not disabled
              input.disabled = false;
              input.readOnly = false;
            });
            
            // Also remove borders from any containers
            const containers = autocompleteElement.shadowRoot.querySelectorAll('div, form');
            containers.forEach(container => {
              container.style.border = 'none';
              container.style.boxShadow = 'none';
              container.style.backgroundColor = 'transparent';
            });
          } else {
            // Retry if shadow root isn't ready yet
            setTimeout(injectShadowStyles, 50);
          }
        };

        // Replace the input with the wrapper containing autocomplete element
        const inputParent = addressInputRef.current.parentNode;
        
        // Hide the original input completely but keep it for form submission
        addressInputRef.current.style.display = 'none';
        addressInputRef.current.style.visibility = 'hidden';
        addressInputRef.current.style.position = 'absolute';
        addressInputRef.current.style.width = '1px';
        addressInputRef.current.style.height = '1px';
        addressInputRef.current.style.opacity = '0';
        addressInputRef.current.style.pointerEvents = 'none';
        addressInputRef.current.setAttribute('tabindex', '-1');
        addressInputRef.current.setAttribute('aria-hidden', 'true');
        
        // Put autocomplete element inside wrapper
        wrapper.appendChild(autocompleteElement);
        
        // Insert wrapper in place of the original input
        inputParent.insertBefore(wrapper, addressInputRef.current);
        
        // Add focus styles to wrapper
        const handleWrapperFocus = () => {
          wrapper.style.borderColor = '#3b82f6';
          wrapper.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          wrapper.style.backgroundColor = '#ffffff'; // Stay white on focus
        };
        
        const handleWrapperBlur = () => {
          wrapper.style.borderColor = 'rgba(59, 130, 246, 0.3)';
          wrapper.style.boxShadow = 'none';
          wrapper.style.backgroundColor = '#ffffff'; // White background
        };
        
        // Listen for focus events on the autocomplete element
        autocompleteElement.addEventListener('focusin', handleWrapperFocus);
        autocompleteElement.addEventListener('focusout', handleWrapperBlur);
        
        // Inject styles into shadow DOM after element is connected
        setTimeout(injectShadowStyles, 100);
        
        // Also retry after a delay to catch late initialization
        const retryInterval = setInterval(() => {
          if (autocompleteElement.shadowRoot) {
            injectShadowStyles();
            clearInterval(retryInterval);
          }
        }, 100);
        
        // Clear retry after 5 seconds
        setTimeout(() => clearInterval(retryInterval), 5000);

        // Handle place selection
        autocompleteElement.addEventListener('gmp-placeselect', async (event) => {
          try {
            const place = event.place;
            if (place) {
              // Get formatted address
              const address = place.formattedAddress || place.displayName || '';
              
              // Extract address components
              let city = '';
              let state = '';
              let zip = '';
              let latitude = '';
              let longitude = '';
              
              if (place.addressComponents) {
                place.addressComponents.forEach(component => {
                  const types = component.types;
                  if (types.includes('locality')) {
                    city = component.longText || component.shortText || '';
                  }
                  if (types.includes('administrative_area_level_1')) {
                    state = component.shortText || component.longText || '';
                  }
                  if (types.includes('postal_code')) {
                    zip = component.longText || component.shortText || '';
                  }
                });
              }
              
              // Extract coordinates for mapping
              // New API might have location as an object with lat/lng or as separate properties
              if (place.location) {
                if (typeof place.location.lat === 'function') {
                  // Google Maps LatLng object
                  latitude = place.location.lat().toString();
                  longitude = place.location.lng().toString();
                } else if (place.location.lat !== undefined) {
                  // Plain object with lat/lng
                  latitude = place.location.lat.toString();
                  longitude = place.location.lng.toString();
                }
              } else if (place.geometry && place.geometry.location) {
                // Fallback to geometry.location (old API structure)
                const loc = place.geometry.location;
                if (typeof loc.lat === 'function') {
                  latitude = loc.lat().toString();
                  longitude = loc.lng().toString();
                } else {
                  latitude = loc.lat?.toString() || '';
                  longitude = loc.lng?.toString() || '';
                }
              }
              
              // Update the hidden input value for form submission
              addressInputRef.current.value = address;
              
              setIntakeFormData(prev => ({
                ...prev,
                propertyAddress: address,
                city: city,
                state: state,
                zip: zip,
                latitude: latitude,
                longitude: longitude
              }));
              
              // Log coordinates for debugging (remove in production if desired)
              if (latitude && longitude) {
                console.log('Coordinates captured:', { latitude, longitude });
              }
            }
          } catch (error) {
            console.error('Error processing place selection:', error);
          }
        });

        // Sync autocomplete value to hidden input on input events
        autocompleteElement.addEventListener('input', (event) => {
          addressInputRef.current.value = event.target.value || '';
          setIntakeFormData(prev => ({
            ...prev,
            propertyAddress: event.target.value || ''
          }));
        });

        autocompleteRef.current = { element: autocompleteElement, wrapper: wrapper, retryInterval: retryInterval };
      } catch (error) {
        console.error('Google Places initialization error:', error);
        // Fallback: show the original input if autocomplete fails
        if (addressInputRef.current) {
          addressInputRef.current.style.display = 'block';
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initAutocomplete, 200);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (autocompleteRef.current) {
        const element = autocompleteRef.current.element || autocompleteRef.current;
        const wrapper = autocompleteRef.current.wrapper;
        const retryInterval = autocompleteRef.current.retryInterval;
        
        if (retryInterval) {
          clearInterval(retryInterval);
        }
        
        // Remove wrapper (which contains the element)
        if (wrapper && wrapper.parentNode) {
          wrapper.remove();
        } else if (element && element.parentNode) {
          element.remove();
        }
        autocompleteRef.current = null;
      }
      // Show the original input again
      if (addressInputRef.current) {
        addressInputRef.current.style.display = 'block';
      }
    };
  }, [activeView, manageEventTab]);

  const handleAddNewEvent = () => {
    setActiveView('add-event');
    // TODO: Implement Add New Event functionality
    console.log('Add New Event clicked');
  };

  const handleManageEvent = () => {
    setActiveView('manage-event');
    setManageEventTab('intake');
  };

  const handlePostEvent = () => {
    setActiveView('post-event');
    // TODO: Implement Post Event functionality
    console.log('Post Event clicked');
  };

  const handleIntakeInputChange = (e) => {
    const { name, value } = e.target;
    setIntakeFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePriorityChange = (priorityValue) => {
    setIntakeFormData(prev => ({
      ...prev,
      priority: prev.priority === priorityValue ? '' : priorityValue
    }));
  };

  const handleEmergencyCheckboxChange = (field) => {
    setIntakeFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleAffectedAreaChange = (value) => {
    setIntakeFormData(prev => ({
      ...prev,
      affectedAreaSize: prev.affectedAreaSize === value ? '' : value
    }));
  };

  const handleIntakeSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement intake submission
    console.log('Intake form submitted:', intakeFormData);
    alert('Intake form submitted! (Functionality to be implemented)');
  };

  const handlePrintToPDF = () => {
    // Create a new window with the form content for printing
    const printWindow = window.open('', '_blank');
    
    // Get the form element
    const formElement = document.querySelector('.storm-intake-form');
    if (!formElement) return;
    
    // Clone the form to avoid modifying the original
    const formClone = formElement.cloneNode(true);
    
    // Create HTML content for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Storm Surge - Quick Intake</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000;
            }
            h2 {
              color: #1e293b;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .form-section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .form-section-title {
              font-size: 18px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 15px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 5px;
            }
            .form-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 15px;
            }
            .form-group {
              margin-bottom: 10px;
            }
            label {
              display: block;
              font-weight: bold;
              margin-bottom: 5px;
              color: #334155;
            }
            input[type="text"],
            input[type="email"],
            input[type="tel"],
            textarea {
              width: 100%;
              padding: 8px;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              font-size: 14px;
            }
            .emergency-checkbox-item {
              display: flex;
              align-items: center;
              margin-bottom: 10px;
            }
            .emergency-checkbox-item input[type="checkbox"] {
              margin-right: 8px;
            }
            .priority-option {
              display: flex;
              align-items: center;
              margin-bottom: 10px;
            }
            .priority-option input[type="checkbox"] {
              margin-right: 8px;
            }
            .readonly-field {
              background-color: #f1f5f9;
            }
            @media print {
              body {
                padding: 10px;
              }
              .form-section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <h2>Storm Surge -- Quick Intake</h2>
          ${formClone.innerHTML}
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const renderManageEvent = () => {
    return (
      <div className="manage-event-container">
        <div className="manage-event-tabs">
          <button
            className={`manage-event-tab ${manageEventTab === 'intake' ? 'active' : ''}`}
            onClick={() => setManageEventTab('intake')}
          >
            Intake
          </button>
          <button
            className={`manage-event-tab ${manageEventTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setManageEventTab('jobs')}
          >
            Jobs
          </button>
        </div>

        {manageEventTab === 'intake' && (
          <div className="intake-form-container">
            <h2 className="intake-header">Storm Surge -- Quick Intake</h2>
            <form onSubmit={handleIntakeSubmit} className="storm-intake-form">
              {/* Customer Info Section */}
              <div className="form-section">
                <h3 className="form-section-title">Customer Info</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="customerName">Customer Name *</label>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={intakeFormData.customerName}
                      onChange={handleIntakeInputChange}
                      required
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customerPhone">Phone *</label>
                    <input
                      type="tel"
                      id="customerPhone"
                      name="customerPhone"
                      value={intakeFormData.customerPhone}
                      onChange={handleIntakeInputChange}
                      required
                      placeholder="(555) 555-5555"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customerEmail">Email</label>
                    <input
                      type="email"
                      id="customerEmail"
                      name="customerEmail"
                      value={intakeFormData.customerEmail}
                      onChange={handleIntakeInputChange}
                      placeholder="customer@email.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="propertyAddress">Property Address *</label>
                    <input
                      type="text"
                      id="propertyAddress"
                      name="propertyAddress"
                      ref={addressInputRef}
                      value={intakeFormData.propertyAddress}
                      onChange={handleIntakeInputChange}
                      required
                      placeholder="Start typing address (autocomplete if available)..."
                      autoComplete="off"
                      onInvalid={(e) => {
                        // Custom validation message
                        if (e.target.validity.valueMissing) {
                          e.target.setCustomValidity('Please enter a property address');
                        }
                      }}
                      onInput={(e) => {
                        // Clear custom validation message when user types
                        e.target.setCustomValidity('');
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Details Section */}
              <div className="form-section">
                <h3 className="form-section-title">Emergency Details</h3>
                <div className="emergency-details-container">
                  <div className="emergency-checkboxes-grid">
                    <div className="emergency-checkbox-item">
                      <input
                        type="checkbox"
                        id="standingWaterNow"
                        checked={intakeFormData.standingWaterNow}
                        onChange={() => handleEmergencyCheckboxChange('standingWaterNow')}
                      />
                      <label htmlFor="standingWaterNow">Standing water NOW</label>
                    </div>
                    <div className="emergency-checkbox-item">
                      <input
                        type="checkbox"
                        id="waterReceded"
                        checked={intakeFormData.waterReceded}
                        onChange={() => handleEmergencyCheckboxChange('waterReceded')}
                      />
                      <label htmlFor="waterReceded">Water has receded</label>
                    </div>
                    <div className="emergency-checkbox-item">
                      <input
                        type="checkbox"
                        id="structuralDamageVisible"
                        checked={intakeFormData.structuralDamageVisible}
                        onChange={() => handleEmergencyCheckboxChange('structuralDamageVisible')}
                      />
                      <label htmlFor="structuralDamageVisible">Structural damage visible</label>
                    </div>
                    <div className="emergency-checkbox-item">
                      <input
                        type="checkbox"
                        id="electricalHazard"
                        checked={intakeFormData.electricalHazard}
                        onChange={() => handleEmergencyCheckboxChange('electricalHazard')}
                      />
                      <label htmlFor="electricalHazard">Electrical hazard</label>
                    </div>
                    <div className="emergency-checkbox-item">
                      <input
                        type="checkbox"
                        id="moldVisible"
                        checked={intakeFormData.moldVisible}
                        onChange={() => handleEmergencyCheckboxChange('moldVisible')}
                      />
                      <label htmlFor="moldVisible">Mold visible</label>
                    </div>
                    <div className="emergency-checkbox-item">
                      <input
                        type="checkbox"
                        id="sewageContamination"
                        checked={intakeFormData.sewageContamination}
                        onChange={() => handleEmergencyCheckboxChange('sewageContamination')}
                      />
                      <label htmlFor="sewageContamination">Sewage/contamination</label>
                    </div>
                  </div>

                  <div className="affected-area-section">
                    <label className="section-label">Affected area size:</label>
                    <div className="affected-area-checkboxes">
                      <div className="affected-area-item">
                        <input
                          type="checkbox"
                          id="area-small"
                          checked={intakeFormData.affectedAreaSize === 'Small'}
                          onChange={() => handleAffectedAreaChange('Small')}
                        />
                        <label htmlFor="area-small">Small (1 room)</label>
                      </div>
                      <div className="affected-area-item">
                        <input
                          type="checkbox"
                          id="area-medium"
                          checked={intakeFormData.affectedAreaSize === 'Medium'}
                          onChange={() => handleAffectedAreaChange('Medium')}
                        />
                        <label htmlFor="area-medium">Medium (2-3 rooms)</label>
                      </div>
                      <div className="affected-area-item">
                        <input
                          type="checkbox"
                          id="area-large"
                          checked={intakeFormData.affectedAreaSize === 'Large'}
                          onChange={() => handleAffectedAreaChange('Large')}
                        />
                        <label htmlFor="area-large">Large (whole floor)</label>
                      </div>
                      <div className="affected-area-item">
                        <input
                          type="checkbox"
                          id="area-entire"
                          checked={intakeFormData.affectedAreaSize === 'Entire'}
                          onChange={() => handleAffectedAreaChange('Entire')}
                        />
                        <label htmlFor="area-entire">Entire building</label>
                      </div>
                    </div>
                  </div>

                  <div className="water-depth-section">
                    <label htmlFor="waterDepth" className="section-label">Water depth (estimate):</label>
                    <div className="water-depth-input-container">
                      <input
                        type="number"
                        id="waterDepth"
                        name="waterDepth"
                        value={intakeFormData.waterDepth}
                        onChange={handleIntakeInputChange}
                        placeholder="0"
                        min="0"
                        step="0.1"
                        className="water-depth-input"
                      />
                      <span className="water-depth-unit">inches</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority Section */}
              <div className="form-section">
                <h3 className="form-section-title">Priority</h3>
                <div className="priority-checkboxes">
                  <div className="priority-checkbox-item">
                    <input
                      type="checkbox"
                      id="priority-emergency"
                      checked={intakeFormData.priority === 'EMERGENCY'}
                      onChange={() => handlePriorityChange('EMERGENCY')}
                    />
                    <label htmlFor="priority-emergency" className="priority-label">
                      <span className="priority-title">EMERGENCY</span>
                      <span className="priority-description">Immediate (Active Flooding, Safety Hazard)</span>
                    </label>
                  </div>
                  <div className="priority-checkbox-item">
                    <input
                      type="checkbox"
                      id="priority-urgent"
                      checked={intakeFormData.priority === 'URGENT'}
                      onChange={() => handlePriorityChange('URGENT')}
                    />
                    <label htmlFor="priority-urgent" className="priority-label">
                      <span className="priority-title">URGENT</span>
                      <span className="priority-description">Same day (water receded, high damage)</span>
                    </label>
                  </div>
                  <div className="priority-checkbox-item">
                    <input
                      type="checkbox"
                      id="priority-standard"
                      checked={intakeFormData.priority === 'STANDARD'}
                      onChange={() => handlePriorityChange('STANDARD')}
                    />
                    <label htmlFor="priority-standard" className="priority-label">
                      <span className="priority-title">STANDARD</span>
                      <span className="priority-description">Next 24-48 hours</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Insurance Section */}
              <div className="form-section">
                <h3 className="form-section-title">Insurance</h3>
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <div className="emergency-checkbox-item">
                      <input
                        type="checkbox"
                        id="hasInsurance"
                        checked={intakeFormData.hasInsurance}
                        onChange={() => setIntakeFormData(prev => ({
                          ...prev,
                          hasInsurance: !prev.hasInsurance,
                          // Clear insurance company if unchecking
                          insuranceCompany: !prev.hasInsurance ? prev.insuranceCompany : ''
                        }))}
                      />
                      <label htmlFor="hasInsurance">Has insurance</label>
                    </div>
                  </div>
                  {intakeFormData.hasInsurance && (
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label htmlFor="insuranceCompany">Insurance Co:</label>
                      <input
                        type="text"
                        id="insuranceCompany"
                        name="insuranceCompany"
                        value={intakeFormData.insuranceCompany}
                        onChange={handleIntakeInputChange}
                        placeholder="Insurance company name"
                      />
                    </div>
                  )}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <div className="emergency-checkbox-item">
                      <input
                        type="checkbox"
                        id="cashPrivatePay"
                        checked={intakeFormData.cashPrivatePay}
                        onChange={() => setIntakeFormData(prev => ({
                          ...prev,
                          cashPrivatePay: !prev.cashPrivatePay
                        }))}
                      />
                      <label htmlFor="cashPrivatePay">Cash/Private pay</label>
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <div className="emergency-checkbox-item">
                      <input
                        type="checkbox"
                        id="unknownWillCallBack"
                        checked={intakeFormData.unknownWillCallBack}
                        onChange={() => setIntakeFormData(prev => ({
                          ...prev,
                          unknownWillCallBack: !prev.unknownWillCallBack
                        }))}
                      />
                      <label htmlFor="unknownWillCallBack">Unknown/Will call back</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="form-section">
                <h3 className="form-section-title">Notes</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="notes">Additional Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={intakeFormData.notes}
                      onChange={handleIntakeInputChange}
                      rows="5"
                      placeholder="Any additional notes or information..."
                    />
                  </div>
                </div>
              </div>

              {/* Intake Taken By Section */}
              <div className="form-section">
                <h3 className="form-section-title">Intake Taken By</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="intakeTakenBy">Taken By *</label>
                    <input
                      type="text"
                      id="intakeTakenBy"
                      name="intakeTakenBy"
                      value={intakeFormData.intakeTakenBy}
                      onChange={handleIntakeInputChange}
                      required
                      placeholder="Your name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="intakeDate">Date</label>
                    <input
                      type="text"
                      id="intakeDate"
                      name="intakeDate"
                      value={intakeFormData.intakeDate}
                      onChange={handleIntakeInputChange}
                      readOnly
                      className="readonly-field"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="intakeTime">Time</label>
                    <input
                      type="text"
                      id="intakeTime"
                      name="intakeTime"
                      value={intakeFormData.intakeTime}
                      onChange={handleIntakeInputChange}
                      readOnly
                      className="readonly-field"
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="storm-btn storm-btn-primary">
                  Submit Intake
                </button>
                <button 
                  type="button" 
                  className="storm-btn storm-btn-secondary"
                  onClick={handlePrintToPDF}
                >
                  Print to PDF
                </button>
                <button 
                  type="button" 
                  className="storm-btn storm-btn-gray"
                  onClick={() => setIntakeFormData({
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    propertyAddress: '',
                    city: '',
                    state: '',
                    zip: '',
                    latitude: '',
                    longitude: '',
                    standingWaterNow: false,
                    waterReceded: false,
                    structuralDamageVisible: false,
                    electricalHazard: false,
                    moldVisible: false,
                    sewageContamination: false,
                    affectedAreaSize: '',
                    waterDepth: '',
                    priority: '',
                    hasInsurance: false,
                    hasInsurance: false,
                    insuranceCompany: '',
                    cashPrivatePay: false,
                    unknownWillCallBack: false,
                    notes: '',
                    intakeTakenBy: '',
                    intakeDate: intakeFormData.intakeDate,
                    intakeTime: intakeFormData.intakeTime
                  })}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        )}

        {manageEventTab === 'jobs' && (
          <div className="jobs-container">
            <h2>Jobs</h2>
            <p>Jobs section coming soon...</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Storm</h1>
      </div>
      <div className="page-content">
        <div className="storm-buttons-container">
          <button 
            onClick={handleAddNewEvent}
            className="storm-btn storm-btn-primary"
          >
            Add New Event
          </button>
          <button 
            onClick={handleManageEvent}
            className="storm-btn storm-btn-secondary"
          >
            Manage Event
          </button>
          <button 
            onClick={handlePostEvent}
            className="storm-btn storm-btn-tertiary"
          >
            Post Event
          </button>
        </div>
        {activeView === 'manage-event' && renderManageEvent()}
        {activeView && activeView !== 'manage-event' && (
          <div className="storm-content-section">
            <p>Content for {activeView} will be displayed here...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Storm;

