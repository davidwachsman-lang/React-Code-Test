import React, { useState, useEffect, useRef } from 'react';
import stormEventService from '../services/stormEventService';
import './Page.css';
import './Storm.css';

function Storm() {
  console.log('Storm component rendering...');
  const [activeTab, setActiveTab] = useState('events');
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  
  // Storm Events State
  const [stormEvents, setStormEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    location: 'HB Nashville',
    locationOther: '',
    stormType: '',
    stormTypeOther: '',
    eventDate: new Date().toISOString().split('T')[0]
  });

  const [intakeFormData, setIntakeFormData] = useState({
    // Property Type
    propertyType: 'residential', // 'residential' | 'commercial'
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
    // Onsite Contact
    onsiteContactName: '',
    onsiteContactPhone: '',
    onsiteSameAsCustomer: false,
    // Commercial only
    msaOnFile: false,
    // Property Information - Shared
    causeOfLoss: '',
    causeFixed: false,
    sqftAffected: '',
    powerAtLocation: '',
    tarpingNeeded: false,
    boardupNeeded: false,
    // Residential specific
    roomsAffected: '',
    foundationType: '',
    basementType: '',
    // Commercial specific
    unitsAffected: '',
    floorsAffected: '',
    parkingLocation: '',
    // Payment Info
    paymentMethod: '', // 'insurance', 'self_pay', 'quote_request'
    insuranceProvider: '',
    insuranceClaimNumber: '',
    depositExplained: false,
    // Notes
    notes: '',
    // Intake Taken By
    intakeTakenBy: '',
    intakeDate: '',
    intakeTime: ''
  });

  // Load storm events on mount
  const loadStormEvents = async () => {
    setLoadingEvents(true);
    try {
      const events = await stormEventService.getAll();
      setStormEvents(events || []);
    } catch (error) {
      console.error('Error loading storm events:', error);
      setStormEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    try {
      loadStormEvents();
    } catch (error) {
      console.error('Error in useEffect loading events:', error);
      setStormEvents([]);
      setLoadingEvents(false);
    }
  }, []);

  // Handle event form input changes
  const handleEventInputChange = (e) => {
    const { name, value } = e.target;
    setEventFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle event form submission
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const location = eventFormData.location === 'Other' 
        ? eventFormData.locationOther 
        : eventFormData.location;
      
      const eventName = `${eventFormData.stormType} - ${location} (${eventFormData.eventDate})`;
      
      const newEvent = await stormEventService.create({
        event_name: eventName,
        event_date: eventFormData.eventDate,
        location: location,
        storm_type: eventFormData.stormType,
        storm_type_other: eventFormData.stormType === 'Other' ? eventFormData.stormTypeOther : null,
        is_active: true
      });
      
      // Refresh events list
      await loadStormEvents();
      
      // Select the new event
      setSelectedEventId(newEvent.id);
      setSelectedEvent(newEvent);
      
      // Reset form and hide it
      setEventFormData({
        location: 'HB Nashville',
        locationOther: '',
        stormType: '',
        stormTypeOther: '',
        eventDate: new Date().toISOString().split('T')[0]
      });
      setShowAddEventForm(false);
      
      alert('Storm event created successfully!');
    } catch (error) {
      console.error('Error creating storm event:', error);
      alert(`Failed to create storm event: ${error.message}`);
    }
  };

  // Handle selecting an event from the table
  const handleSelectEvent = (event) => {
    setSelectedEventId(event.id);
    setSelectedEvent(event);
  };

  // Set date and time when component mounts or when intake tab is selected
  useEffect(() => {
    if (activeTab === 'intake') {
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
  }, [activeTab]);

  // State for autocomplete status
  const [autocompleteStatus, setAutocompleteStatus] = useState('loading');

  // Initialize Google Places Autocomplete for property address
  useEffect(() => {
    // Only initialize when intake tab is selected
    if (activeTab !== 'intake') {
      return;
    }

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
        console.log('Initializing Google Places Autocomplete...');
        
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
              setIntakeFormData(prev => ({
                ...prev,
                propertyAddress: address,
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
  }, [activeTab]);


  // Format phone number with dashes (XXX-XXX-XXXX)
  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  // Strip formatting from phone number (remove dashes)
  const stripPhoneFormatting = (value) => {
    return value.replace(/\D/g, '');
  };

  // Format number with commas for thousands
  const formatNumberWithCommas = (value) => {
    const number = value.replace(/\D/g, '');
    if (!number) return '';
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Strip formatting from number (remove commas)
  const stripNumberFormatting = (value) => {
    return value.replace(/,/g, '');
  };

  const handleIntakeInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
    setIntakeFormData(prev => ({
      ...prev,
        [name]: checked
      }));
      return;
    }
    
    let processedValue = value;
    
    // Format phone numbers
    if (name === 'customerPhone' || name === 'onsiteContactPhone') {
      processedValue = formatPhoneNumber(value);
    }
    
    // Format square footage with commas
    if (name === 'sqftAffected') {
      processedValue = formatNumberWithCommas(value);
    }
    
    setIntakeFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handlePropertyTypeChange = (type) => {
    setIntakeFormData(prev => ({
      ...prev,
      propertyType: type
    }));
  };

  const handleSameAsCustomerToggle = () => {
    setIntakeFormData(prev => {
      const newChecked = !prev.onsiteSameAsCustomer;
      return {
      ...prev,
        onsiteSameAsCustomer: newChecked,
        onsiteContactName: newChecked ? prev.customerName : '',
        onsiteContactPhone: newChecked ? prev.customerPhone : ''
      };
    });
  };

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Strip formatting from phone numbers and square footage before submission
      const submissionData = {
        ...intakeFormData,
        customerPhone: stripPhoneFormatting(intakeFormData.customerPhone),
        onsiteContactPhone: stripPhoneFormatting(intakeFormData.onsiteContactPhone),
        sqftAffected: stripNumberFormatting(intakeFormData.sqftAffected),
        storm_event_id: selectedEventId
      };
      
      console.log('Submitting storm intake:', submissionData);
      
      // Import and use the storm intake service
      const stormIntakeService = (await import('../services/stormIntakeService')).default;
      const result = await stormIntakeService.createStormIntake(submissionData);
      
      if (result.success) {
        alert('Storm intake submitted successfully!');
        // Clear form
        setIntakeFormData({
          propertyType: 'residential',
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          propertyAddress: '',
          city: '',
          state: '',
          zip: '',
          latitude: '',
          longitude: '',
          onsiteContactName: '',
          onsiteContactPhone: '',
          onsiteSameAsCustomer: false,
          msaOnFile: false,
          causeOfLoss: '',
          causeFixed: false,
          sqftAffected: '',
          powerAtLocation: '',
          tarpingNeeded: false,
          boardupNeeded: false,
          roomsAffected: '',
          foundationType: '',
          basementType: '',
          unitsAffected: '',
          floorsAffected: '',
          parkingLocation: '',
          paymentMethod: '',
          insuranceProvider: '',
          insuranceClaimNumber: '',
          depositExplained: false,
          notes: '',
          intakeTakenBy: '',
          intakeDate: '',
          intakeTime: ''
        });
      }
    } catch (error) {
      console.error('Error submitting intake:', error);
      alert(`Failed to submit intake: ${error.message}`);
    }
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
          <title>Storm Intake Form</title>
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
          <h2>Storm Intake Form</h2>
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
            className={`manage-event-tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
          <button
            className={`manage-event-tab ${activeTab === 'intake' ? 'active' : ''}`}
            onClick={() => setActiveTab('intake')}
          >
            Intake
            {selectedEvent && <span className="tab-badge">{selectedEvent.event_name?.split(' - ')[0]}</span>}
          </button>
          <button
            className={`manage-event-tab ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            Jobs
          </button>
        </div>

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="events-tab-container">
            {/* Add Event Form */}
            <div className="add-event-section">
              <div className="section-header">
                <h3>Add Storm Event</h3>
                <button 
                  type="button"
                  className={`toggle-form-btn ${showAddEventForm ? 'active' : ''}`}
                  onClick={() => setShowAddEventForm(!showAddEventForm)}
                >
                  {showAddEventForm ? 'Hide Form' : 'New Event'}
                </button>
              </div>
              
              {showAddEventForm && (
                <form onSubmit={handleEventSubmit} className="event-form">
                  <div className="event-form-row">
                    <div className="form-group">
                      <label htmlFor="location">Location</label>
                      <select
                        id="location"
                        name="location"
                        value={eventFormData.location}
                        onChange={handleEventInputChange}
                        required
                      >
                        <option value="HB Nashville">HB Nashville</option>
                        <option value="National">National</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {eventFormData.location === 'Other' && (
                      <div className="form-group">
                        <label htmlFor="locationOther">Specify Location</label>
                        <input
                          type="text"
                          id="locationOther"
                          name="locationOther"
                          value={eventFormData.locationOther}
                          onChange={handleEventInputChange}
                          placeholder="Enter location"
                          required
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label htmlFor="stormType">Storm Type</label>
                      <select
                        id="stormType"
                        name="stormType"
                        value={eventFormData.stormType}
                        onChange={handleEventInputChange}
                        required
                      >
                        <option value="">Select type...</option>
                        <option value="Flood">Flood</option>
                        <option value="Freeze">Freeze</option>
                        <option value="Tornado">Tornado</option>
                        <option value="Hurricane">Hurricane</option>
                        <option value="Wildfire">Wildfire</option>
                        <option value="Hail">Hail</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {eventFormData.stormType === 'Other' && (
                      <div className="form-group">
                        <label htmlFor="stormTypeOther">Specify Type</label>
                        <input
                          type="text"
                          id="stormTypeOther"
                          name="stormTypeOther"
                          value={eventFormData.stormTypeOther}
                          onChange={handleEventInputChange}
                          placeholder="Enter storm type"
                          required
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label htmlFor="eventDate">Date</label>
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={eventFormData.eventDate}
                        onChange={handleEventInputChange}
                        required
                      />
                    </div>
                    <div className="form-group form-actions-inline">
                      <button type="submit" className="storm-btn storm-btn-primary">
                        Create Event
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Events Table */}
            <div className="events-table-section">
              <h3>Storm Events</h3>
              {loadingEvents ? (
                <p className="loading-text">Loading events...</p>
              ) : stormEvents.length === 0 ? (
                <p className="empty-text">No storm events yet. Create one above to get started.</p>
              ) : (
                <table className="events-table">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th>Location</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stormEvents.map(event => (
                      <tr 
                        key={event.id}
                        className={`event-row ${selectedEventId === event.id ? 'selected' : ''}`}
                        onClick={() => handleSelectEvent(event)}
                      >
                        <td className="event-name">{event.event_name}</td>
                        <td>{event.location}</td>
                        <td>{event.storm_type}</td>
                        <td>{new Date(event.event_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge ${event.is_active ? 'active' : 'inactive'}`}>
                            {event.is_active ? 'Active' : 'Closed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {selectedEvent && (
                <div className="selected-event-banner">
                  <span className="banner-label">Selected Event:</span>
                  <span className="banner-event-name">{selectedEvent.event_name}</span>
                  <button 
                    className="storm-btn storm-btn-primary"
                    onClick={() => setActiveTab('intake')}
                  >
                    Add Intake →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Intake Tab */}
        {activeTab === 'intake' && (
          <div className="intake-form-container">
            {!selectedEvent ? (
              <div className="no-event-selected">
                <h3>No Storm Event Selected</h3>
                <p>Please select a storm event from the Events tab before adding intake.</p>
                <button 
                  className="storm-btn storm-btn-primary"
                  onClick={() => setActiveTab('events')}
                >
                  Go to Events
                </button>
              </div>
            ) : (
              <>
                <div className="selected-event-header">
                  <span className="event-badge">{selectedEvent.storm_type}</span>
                  <span className="event-info">{selectedEvent.event_name}</span>
                  <button 
                    className="change-event-btn"
                    onClick={() => setActiveTab('events')}
                  >
                    Change Event
                  </button>
                </div>
                <h2 className="intake-header">Storm Intake Form</h2>
            <form onSubmit={handleIntakeSubmit} className="storm-intake-form">
              {/* Property Type Toggle */}
              <div className="form-section">
                <h3 className="form-section-title">Property Type</h3>
                <div className="property-type-toggle">
                  <button
                    type="button"
                    className={`property-type-option ${intakeFormData.propertyType === 'residential' ? 'active' : ''}`}
                    onClick={() => handlePropertyTypeChange('residential')}
                  >
                    Residential
                  </button>
                  <button
                    type="button"
                    className={`property-type-option ${intakeFormData.propertyType === 'commercial' ? 'active' : ''}`}
                    onClick={() => handlePropertyTypeChange('commercial')}
                  >
                    Commercial
                  </button>
                </div>
              </div>

              {/* Customer Info Section */}
              <div className="form-section">
                <h3 className="form-section-title">Customer Info</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="customerName">Customer Name</label>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={intakeFormData.customerName}
                      onChange={handleIntakeInputChange}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customerPhone">Phone</label>
                    <input
                      type="tel"
                      id="customerPhone"
                      name="customerPhone"
                      value={intakeFormData.customerPhone}
                      onChange={handleIntakeInputChange}
                      placeholder="555-555-5555"
                      maxLength="12"
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
                    <label htmlFor="propertyAddress">
                      Property Address
                      {autocompleteStatus === 'ready' && <span style={{ color: '#22c55e', marginLeft: '8px', fontSize: '0.8em' }}>✓ Autocomplete active</span>}
                      {autocompleteStatus === 'loading' && <span style={{ color: '#f59e0b', marginLeft: '8px', fontSize: '0.8em' }}>Loading...</span>}
                      {autocompleteStatus === 'error' && <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '0.8em' }}>⚠ API Error</span>}
                      {autocompleteStatus === 'unavailable' && <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '0.8em' }}>Manual entry</span>}
                    </label>
                    <input
                      type="text"
                      id="propertyAddress"
                      name="propertyAddress"
                      ref={addressInputRef}
                      value={intakeFormData.propertyAddress}
                      onChange={handleIntakeInputChange}
                      placeholder={autocompleteStatus === 'ready' ? "Start typing address..." : "Enter full address manually"}
                      autoComplete="off"
                    />
                    {autocompleteStatus === 'error' && (
                      <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                        Google Maps API error. Please enter address manually or check browser console for details.
                      </small>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="onsiteContactName">Onsite Point-of-Contact Name</label>
                    <div className="same-as-customer-container">
                      <input
                        type="text"
                        id="onsiteContactName"
                        name="onsiteContactName"
                        value={intakeFormData.onsiteContactName}
                        onChange={handleIntakeInputChange}
                        placeholder="Onsite contact name"
                        disabled={intakeFormData.onsiteSameAsCustomer}
                      />
                      <label className="same-as-customer-checkbox">
                      <input
                        type="checkbox"
                          checked={intakeFormData.onsiteSameAsCustomer}
                          onChange={handleSameAsCustomerToggle}
                      />
                        <span>Same as Customer</span>
                      </label>
                    </div>
                    </div>
                  <div className="form-group">
                    <label htmlFor="onsiteContactPhone">Onsite Point-of-Contact Phone</label>
                    <div className="same-as-customer-container">
                      <input
                        type="tel"
                        id="onsiteContactPhone"
                        name="onsiteContactPhone"
                        value={intakeFormData.onsiteContactPhone}
                        onChange={handleIntakeInputChange}
                        placeholder="555-555-5555"
                        maxLength="12"
                        disabled={intakeFormData.onsiteSameAsCustomer}
                      />
                    </div>
                    </div>
                  {intakeFormData.propertyType === 'commercial' && (
                    <div className="form-group">
                      <label className="checkbox-label">
                      <input
                        type="checkbox"
                          name="msaOnFile"
                          checked={intakeFormData.msaOnFile}
                          onChange={handleIntakeInputChange}
                        />
                        MSA on File
                      </label>
                    </div>
                  )}
                    </div>
                  </div>

              {/* Property Information Section */}
              <div className="form-section">
                <h3 className="form-section-title">Property Information</h3>
                
                {/* Damage Details Row */}
                <div className="property-info-row">
                  <div className="form-group flex-2">
                    <label htmlFor="causeOfLoss">Cause of Loss</label>
                    <select
                      id="causeOfLoss"
                      name="causeOfLoss"
                      value={intakeFormData.causeOfLoss}
                      onChange={handleIntakeInputChange}
                    >
                      <option value="">Select cause of loss...</option>
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
                  <div className="form-group flex-1">
                    <label htmlFor="sqftAffected">Sq. Ft. Affected</label>
                        <input
                      type="text"
                      id="sqftAffected"
                      name="sqftAffected"
                      value={intakeFormData.sqftAffected}
                      onChange={handleIntakeInputChange}
                      placeholder="e.g., 1,500"
                    />
                      </div>
                  <div className="form-group flex-1">
                    <label>Cause Fixed?</label>
                    <div className="inline-toggle">
                      <label className={`toggle-option ${intakeFormData.causeFixed ? 'active' : ''}`}>
                        <input
                          type="checkbox"
                          name="causeFixed"
                          checked={intakeFormData.causeFixed}
                          onChange={handleIntakeInputChange}
                        />
                        {intakeFormData.causeFixed ? 'Yes' : 'No'}
                      </label>
                      </div>
                  </div>
                </div>

                {/* Property-Type Specific Fields */}
                {intakeFormData.propertyType === 'residential' && (
                  <div className="property-info-row">
                    <div className="form-group flex-1">
                      <label htmlFor="roomsAffected"># Rooms Affected</label>
                        <input
                        type="number"
                        id="roomsAffected"
                        name="roomsAffected"
                        value={intakeFormData.roomsAffected}
                        onChange={handleIntakeInputChange}
                        placeholder="0"
                      />
                      </div>
                    <div className="form-group flex-1">
                      <label htmlFor="foundationType">Foundation</label>
                      <select
                        id="foundationType"
                        name="foundationType"
                        value={intakeFormData.foundationType}
                        onChange={handleIntakeInputChange}
                      >
                        <option value="">Select...</option>
                        <option value="crawlspace">Crawlspace</option>
                        <option value="slab">Slab</option>
                      </select>
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor="basementType">Basement</label>
                      <select
                        id="basementType"
                        name="basementType"
                        value={intakeFormData.basementType}
                        onChange={handleIntakeInputChange}
                      >
                        <option value="">Select...</option>
                        <option value="finished">Finished</option>
                        <option value="unfinished">Unfinished</option>
                        <option value="none">None</option>
                      </select>
                  </div>
                  </div>
                )}

                {intakeFormData.propertyType === 'commercial' && (
                  <div className="property-info-row">
                    <div className="form-group flex-1">
                      <label htmlFor="unitsAffected"># Units Affected</label>
                      <input
                        type="number"
                        id="unitsAffected"
                        name="unitsAffected"
                        value={intakeFormData.unitsAffected}
                        onChange={handleIntakeInputChange}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor="floorsAffected"># Floors Affected</label>
                      <input
                        type="number"
                        id="floorsAffected"
                        name="floorsAffected"
                        value={intakeFormData.floorsAffected}
                        onChange={handleIntakeInputChange}
                        placeholder="0"
                      />
                  </div>
                    <div className="form-group flex-2">
                      <label htmlFor="parkingLocation">Parking for Crew</label>
                      <input
                        type="text"
                        id="parkingLocation"
                        name="parkingLocation"
                        value={intakeFormData.parkingLocation}
                        onChange={handleIntakeInputChange}
                        placeholder="Describe parking location"
                      />
                </div>
              </div>
                )}

                {/* Site Conditions Row */}
                <div className="site-conditions-row">
                  <div className="condition-item">
                    <label>Power</label>
                    <div className="toggle-buttons">
                      <button
                        type="button"
                        className={`toggle-btn ${intakeFormData.powerAtLocation === 'on' ? 'active' : ''}`}
                        onClick={() => setIntakeFormData(prev => ({ ...prev, powerAtLocation: 'on' }))}
                      >
                        On
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${intakeFormData.powerAtLocation === 'off' ? 'active' : ''}`}
                        onClick={() => setIntakeFormData(prev => ({ ...prev, powerAtLocation: 'off' }))}
                      >
                        Off
                      </button>
                  </div>
                  </div>
                  <div className="condition-item">
                    <label className="condition-checkbox">
                    <input
                      type="checkbox"
                        name="tarpingNeeded"
                        checked={intakeFormData.tarpingNeeded}
                        onChange={handleIntakeInputChange}
                      />
                      <span>Tarping Needed</span>
                    </label>
                  </div>
                  <div className="condition-item">
                    <label className="condition-checkbox">
                    <input
                      type="checkbox"
                        name="boardupNeeded"
                        checked={intakeFormData.boardupNeeded}
                        onChange={handleIntakeInputChange}
                      />
                      <span>Board-Up Needed</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Payment Information Section */}
              <div className="form-section">
                <h3 className="form-section-title">Payment Information</h3>
                <div className="payment-method-radio-group">
                  <label className="payment-method-option">
                      <input
                      type="radio"
                      name="paymentMethod"
                      value="insurance"
                      checked={intakeFormData.paymentMethod === 'insurance'}
                      onChange={handleIntakeInputChange}
                    />
                    <span>Has Insurance</span>
                  </label>
                  {intakeFormData.paymentMethod === 'insurance' && (
                    <div className="payment-sub-fields">
                      <div className="form-group">
                        <label htmlFor="insuranceProvider">Insurance Provider Name</label>
                        <input
                          type="text"
                          id="insuranceProvider"
                          name="insuranceProvider"
                          value={intakeFormData.insuranceProvider}
                          onChange={handleIntakeInputChange}
                          placeholder="Provider name"
                        />
                    </div>
                      <div className="form-group">
                        <label htmlFor="insuranceClaimNumber">Claim #</label>
                      <input
                        type="text"
                          id="insuranceClaimNumber"
                          name="insuranceClaimNumber"
                          value={intakeFormData.insuranceClaimNumber}
                        onChange={handleIntakeInputChange}
                          placeholder="Claim number"
                      />
                      </div>
                    </div>
                  )}

                  <label className="payment-method-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="self_pay"
                      checked={intakeFormData.paymentMethod === 'self_pay'}
                      onChange={handleIntakeInputChange}
                    />
                    <span>Self-Pay</span>
                  </label>
                  {intakeFormData.paymentMethod === 'self_pay' && (
                    <div className="payment-sub-fields">
                      <label className="checkbox-label">
                      <input
                        type="checkbox"
                          name="depositExplained"
                          checked={intakeFormData.depositExplained}
                          onChange={handleIntakeInputChange}
                        />
                        50% deposit required - explained to customer
                      </label>
                    </div>
                  )}

                  <label className="payment-method-option">
                      <input
                      type="radio"
                      name="paymentMethod"
                      value="quote_request"
                      checked={intakeFormData.paymentMethod === 'quote_request'}
                      onChange={handleIntakeInputChange}
                    />
                    <span>Requesting Quote</span>
                  </label>
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
                    <label htmlFor="intakeTakenBy">Taken By</label>
                    <input
                      type="text"
                      id="intakeTakenBy"
                      name="intakeTakenBy"
                      value={intakeFormData.intakeTakenBy}
                      onChange={handleIntakeInputChange}
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
                  onClick={() => {
                    const now = new Date();
                    setIntakeFormData({
                      propertyType: 'residential',
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    propertyAddress: '',
                    city: '',
                    state: '',
                    zip: '',
                    latitude: '',
                    longitude: '',
                      onsiteContactName: '',
                      onsiteContactPhone: '',
                      onsiteSameAsCustomer: false,
                      msaOnFile: false,
                      causeOfLoss: '',
                      causeFixed: false,
                      sqftAffected: '',
                      powerAtLocation: '',
                      tarpingNeeded: false,
                      boardupNeeded: false,
                      roomsAffected: '',
                      foundationType: '',
                      basementType: '',
                      unitsAffected: '',
                      floorsAffected: '',
                      parkingLocation: '',
                      paymentMethod: '',
                      insuranceProvider: '',
                      insuranceClaimNumber: '',
                      depositExplained: false,
                    notes: '',
                    intakeTakenBy: '',
                      intakeDate: now.toLocaleDateString('en-US'),
                      intakeTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    });
                  }}
                >
                  Clear Form
                </button>
              </div>
            </form>
              </>
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
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
        {renderManageEvent()}
      </div>
    </div>
  );
}

export default Storm;
