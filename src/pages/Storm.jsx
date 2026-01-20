import React, { useState, useEffect, useRef } from 'react';
import stormEventService from '../services/stormEventService';
import jobService from '../services/jobService';
import customerService from '../services/customerService';
import propertyService from '../services/propertyService';
import StormMap from '../components/storm/StormMap';
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

  // Jobs State
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobEditModal, setShowJobEditModal] = useState(false);
  const [jobEditFormData, setJobEditFormData] = useState(null);
  const [savingJob, setSavingJob] = useState(false);
  const [jobsView, setJobsView] = useState('table'); // 'table' or 'map'

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

  // Load jobs when selectedEventId changes
  const loadJobs = async () => {
    if (!selectedEventId) {
      setJobs([]);
      return;
    }

    setLoadingJobs(true);
    try {
      const jobsData = await jobService.getByStormEventId(selectedEventId);
      setJobs(jobsData || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [selectedEventId]);

  // Handle job row click - open edit modal
  const handleJobRowClick = async (job) => {
    setSelectedJobId(job.id);
    setSelectedJob(job);
    
    // Load full job data to get all fields
    try {
      const fullJob = await jobService.getById(job.id);
      if (!fullJob) {
        console.error('Job not found');
        return;
      }
      
      // Extract city, state, zip from property if available
      const property = fullJob.properties || {};
      const city = property.city || '';
      const state = property.state || '';
      const zip = property.postal_code || '';
      
      // Load property and customer data for the form
      const propertyType = fullJob.property_type || job.property_type;
      const normalizedPropertyType = propertyType 
        ? (String(propertyType).toLowerCase() === 'residential' ? 'residential' : 'commercial')
        : 'residential';
      
      setJobEditFormData({
        // Basic Info
        propertyType: normalizedPropertyType,
        customerName: fullJob.customers?.name || job.customer_name || '',
        customerPhone: fullJob.customers?.phone || job.customer_phone || '',
        customerEmail: fullJob.customers?.email || job.customer_email || '',
        propertyAddress: property.address1 || job.property_address || job.address || '',
        city: city,
        state: state,
        zip: zip,
        
        // Onsite Contact
        onsiteContactName: fullJob.onsite_contact_name || job.onsite_contact_name || '',
        onsiteContactPhone: fullJob.onsite_contact_phone || job.onsite_contact_phone || '',
        onsiteSameAsCustomer: false,
        
        // Property Information
        causeOfLoss: fullJob.cause_of_loss || job.cause_of_loss || '',
        causeFixed: fullJob.cause_fixed || job.cause_fixed || false,
        sqftAffected: fullJob.sqft_affected ? fullJob.sqft_affected.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '',
        powerAtLocation: fullJob.power_at_location || job.power_at_location || '',
        tarpingNeeded: fullJob.tarping_needed || job.tarping_needed || false,
        boardupNeeded: fullJob.boardup_needed || job.boardup_needed || false,
        
        // Residential specific
        roomsAffected: fullJob.rooms_affected || job.rooms_affected || '',
        foundationType: fullJob.foundation_type || job.foundation_type || '',
        basementType: fullJob.basement_type || job.basement_type || '',
        
        // Commercial specific
        unitsAffected: fullJob.units_affected || job.units_affected || '',
        floorsAffected: fullJob.floors_affected || job.floors_affected || '',
        parkingLocation: fullJob.parking_location || job.parking_location || '',
        msaOnFile: fullJob.msa_on_file || job.msa_on_file || false,
        
        // Payment Info
        paymentMethod: fullJob.payment_method || job.payment_method || '',
        insuranceProvider: fullJob.insurance_provider || job.insurance_provider || '',
        insuranceClaimNumber: fullJob.insurance_claim_number || job.insurance_claim_number || '',
        depositExplained: fullJob.deposit_explained || job.deposit_explained || false,
        
        // Notes
        notes: fullJob.internal_notes || job.internal_notes || '',
        
        // Team/Status
        pm: fullJob.pm || job.pm || '',
        status: fullJob.status || job.status || 'pending',
        priority: fullJob.priority || job.priority || '',
        estimateValue: fullJob.estimate_value ? fullJob.estimate_value.toString() : '',
        
        // Dates - format for date input (YYYY-MM-DD)
        dateOfLoss: fullJob.date_of_loss 
          ? (fullJob.date_of_loss.split('T')[0] || '')
          : (job.date_of_loss ? (job.date_of_loss.split('T')[0] || '') : ''),
        dateOpened: fullJob.date_opened 
          ? (fullJob.date_opened.split('T')[0] || '')
          : (job.date_opened ? (job.date_opened.split('T')[0] || '') : (job.date_received ? (job.date_received.split('T')[0] || '') : ''))
      });
      
      setShowJobEditModal(true);
    } catch (error) {
      console.error('Error loading job details:', error);
      alert('Failed to load job details: ' + error.message);
    }
  };

  // Handle job edit form input changes
  const handleJobEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setJobEditFormData(prev => ({
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
    
    setJobEditFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  // Handle job edit form submission
  const handleJobEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob || !jobEditFormData) return;

    setSavingJob(true);
    try {
      // Prepare update data - map form fields back to database columns
      const updateData = {
        // Basic Info
        property_type: jobEditFormData.propertyType 
          ? (jobEditFormData.propertyType.charAt(0).toUpperCase() + jobEditFormData.propertyType.slice(1).toLowerCase())
          : 'Residential',
        
        // Property Information
        cause_of_loss: jobEditFormData.causeOfLoss || null,
        cause_fixed: jobEditFormData.causeFixed || false,
        sqft_affected: jobEditFormData.sqftAffected ? parseInt(jobEditFormData.sqftAffected.toString().replace(/,/g, '')) : null,
        power_at_location: jobEditFormData.powerAtLocation || null,
        tarping_needed: jobEditFormData.tarpingNeeded || false,
        boardup_needed: jobEditFormData.boardupNeeded || false,
        
        // Onsite Contact
        onsite_contact_name: jobEditFormData.onsiteContactName || null,
        onsite_contact_phone: stripPhoneFormatting(jobEditFormData.onsiteContactPhone) || null,
        
        // Payment Info
        payment_method: jobEditFormData.paymentMethod || null,
        deposit_explained: jobEditFormData.depositExplained || false,
        insurance_provider: jobEditFormData.insuranceProvider || null,
        insurance_claim_number: jobEditFormData.insuranceClaimNumber || null,
        
        // Notes
        internal_notes: jobEditFormData.notes || null,
        
        // Team/Status
        pm: jobEditFormData.pm || null,
        status: jobEditFormData.status || 'pending',
        priority: jobEditFormData.priority || null,
        estimate_value: jobEditFormData.estimateValue ? parseFloat(jobEditFormData.estimateValue.toString().replace(/[^0-9.-]+/g, '')) : null,
        
        // Dates
        date_of_loss: jobEditFormData.dateOfLoss || null
      };

      // Add property-type specific fields
      if (jobEditFormData.propertyType === 'residential') {
        if (jobEditFormData.roomsAffected) {
          updateData.rooms_affected = parseInt(jobEditFormData.roomsAffected);
        }
        updateData.foundation_type = jobEditFormData.foundationType || null;
        updateData.basement_type = jobEditFormData.basementType || null;
        // Clear commercial fields
        updateData.units_affected = null;
        updateData.floors_affected = null;
        updateData.parking_location = null;
        updateData.msa_on_file = false;
      } else if (jobEditFormData.propertyType === 'commercial') {
        if (jobEditFormData.unitsAffected) {
          updateData.units_affected = parseInt(jobEditFormData.unitsAffected);
        }
        if (jobEditFormData.floorsAffected) {
          updateData.floors_affected = parseInt(jobEditFormData.floorsAffected);
        }
        updateData.parking_location = jobEditFormData.parkingLocation || null;
        updateData.msa_on_file = jobEditFormData.msaOnFile || false;
        // Clear residential fields
        updateData.rooms_affected = null;
        updateData.foundation_type = null;
        updateData.basement_type = null;
      }

      // Update customer if needed
      // Check if customer name/phone/email changed - if so, create a new customer to avoid affecting other jobs
      if (selectedJob.customer_id) {
        const currentCustomer = await customerService.getById(selectedJob.customer_id);
        const nameChanged = currentCustomer?.name !== jobEditFormData.customerName;
        const phoneChanged = currentCustomer?.phone !== stripPhoneFormatting(jobEditFormData.customerPhone);
        const emailChanged = currentCustomer?.email !== jobEditFormData.customerEmail;
        
        if (nameChanged || phoneChanged || emailChanged) {
          // Create a new customer record for this job to avoid affecting other jobs
          const newCustomer = await customerService.create({
            name: jobEditFormData.customerName || null,
            phone: stripPhoneFormatting(jobEditFormData.customerPhone) || null,
            email: jobEditFormData.customerEmail || null
          });
          
          // Update the job to reference the new customer
          updateData.customer_id = newCustomer.id;
        } else {
          // Only update email if it's different and provided (safe to update)
          if (jobEditFormData.customerEmail && jobEditFormData.customerEmail !== currentCustomer?.email) {
            await customerService.update(selectedJob.customer_id, {
              email: jobEditFormData.customerEmail
            });
          }
        }
      }

      // Update property if needed
      if (selectedJob.property_id) {
        await propertyService.update(selectedJob.property_id, {
          address1: jobEditFormData.propertyAddress || '',
          city: jobEditFormData.city || 'Unknown',
          state: jobEditFormData.state || '',
          postal_code: jobEditFormData.zip || ''
        });
      }

      // Update job
      await jobService.update(selectedJob.id, updateData);

      // Refresh jobs list
      await loadJobs();

      // Close modal
      setShowJobEditModal(false);
      setSelectedJob(null);
      setJobEditFormData(null);

      alert('Job updated successfully!');
    } catch (error) {
      console.error('Error updating job:', error);
      alert(`Failed to update job: ${error.message}`);
    } finally {
      setSavingJob(false);
    }
  };

  // Helper functions for transforming job data
  const getStatusDisplay = (status) => {
    const s = status?.toLowerCase();
    if (s === 'pending') return 'Intake';
    if (s === 'in_progress' || s === 'wip') return 'Drying';
    if (s?.includes('demo')) return 'Demo';
    if (s === 'complete' || s === 'completed') return 'Complete';
    return status || 'N/A';
  };

  const getJobTypeDisplay = (causeOfLoss) => {
    if (!causeOfLoss) return 'N/A';
    const cause = causeOfLoss.toLowerCase();
    if (cause.includes('water')) return 'Water';
    if (cause.includes('wind') || cause.includes('storm')) return 'Wind';
    if (cause.includes('mold')) return 'Mold';
    if (cause.includes('fire')) return 'Fire';
    return causeOfLoss;
  };

  const calculateDaysSinceLoss = (dateOfLoss) => {
    if (!dateOfLoss) return 'N/A';
    try {
      const lossDate = new Date(dateOfLoss);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lossDate.setHours(0, 0, 0, 0);
      const diffTime = today - lossDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays.toString() : '0';
    } catch (error) {
      return 'N/A';
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPropertyTypeDisplay = (propertyType, job = null) => {
    if (!propertyType) {
      // Try to infer from other fields if property_type is missing
      if (job) {
        // Check if it's a storm job - storm jobs default to residential unless specified
        if (job.storm_event_id) {
          return 'Residential'; // Default for storm jobs
        }
        // Check division - Large Loss/Referral are typically Commercial
        if (job.division && (job.division.includes('Large Loss') || job.division.includes('Referral'))) {
          return 'Commercial';
        }
      }
      return '-';
    }
    const type = String(propertyType).toLowerCase();
    if (type === 'residential' || type === 'res') return 'Residential';
    if (type === 'commercial' || type === 'comm') return 'Commercial';
    // Handle capitalized versions
    if (type === 'residential' || propertyType === 'Residential') return 'Residential';
    if (type === 'commercial' || propertyType === 'Commercial') return 'Commercial';
    return propertyType;
  };

  const getPayTypeDisplay = (paymentMethod) => {
    if (!paymentMethod) return '-';
    if (paymentMethod === 'insurance') return 'Insurance';
    if (paymentMethod === 'self_pay') return 'Self Pay';
    return paymentMethod;
  };

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
        // Refresh jobs list to show the new job
        await loadJobs();
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
          <div className="jobs-dashboard-container">
            {!selectedEvent ? (
              <div className="no-event-selected">
                <h3>No Storm Event Selected</h3>
                <p>Please select a storm event from the Events tab to view jobs.</p>
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
                
                {loadingJobs ? (
                  <div className="jobs-loading">
                    <p>Loading jobs...</p>
                  </div>
                ) : (
                  <div className="jobs-dashboard-layout">
                    {/* View Toggle */}
                    <div className="jobs-view-toggle">
          <button 
                        className={`view-toggle-btn ${jobsView === 'table' ? 'active' : ''}`}
                        onClick={() => setJobsView('table')}
                      >
                        Table View
                      </button>
                      <button
                        className={`view-toggle-btn ${jobsView === 'map' ? 'active' : ''}`}
                        onClick={() => setJobsView('map')}
                      >
                        Map View
          </button>
        </div>

                    {/* Table View */}
                    {jobsView === 'table' && (
                      <div className="jobs-table-container">
                        <h3>Jobs</h3>
                        {jobs.length === 0 ? (
                          <div className="empty-state">
                            <p>No jobs found for this storm event.</p>
                            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                              Add intake entries from the Intake tab to create jobs.
                            </p>
                          </div>
                        ) : (
                          <div className="jobs-table-wrapper">
                            <table className="jobs-table">
                              <thead>
                                <tr>
                                  <th>Priority Score</th>
                                  <th>Property Type</th>
                                  <th>Job Type</th>
                                  <th>Customer Name</th>
                                  <th>PM</th>
                                  <th>Days Since Loss</th>
                                  <th>Category</th>
                                  <th>Pay Type</th>
                                  <th>Est. Revenue</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobs.map(job => {
                                  return (
                                  <tr
                                    key={job.id}
                                    className={`job-row ${selectedJobId === job.id ? 'selected' : ''}`}
                                    onClick={() => handleJobRowClick(job)}
                                  >
                                    <td>
                                      <span className="priority-display">{job.priority || '-'}</span>
                                    </td>
                                    <td>
                                      <span className="property-type-display">
                                        {getPropertyTypeDisplay(job.property_type || job.propertyType, job)}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="job-type-display">{getJobTypeDisplay(job.cause_of_loss)}</span>
                                    </td>
                                    <td className="customer-name-cell">{job.customer_name || 'N/A'}</td>
                                    <td>{job.pm || '-'}</td>
                                    <td>
                                      <span className="days-since-loss">{calculateDaysSinceLoss(job.date_of_loss)}</span>
                                    </td>
                                    <td>{job.division || '-'}</td>
                                    <td>{getPayTypeDisplay(job.payment_method)}</td>
                                    <td className="revenue-cell">{formatCurrency(job.estimate_value)}</td>
                                    <td>
                                      <span className={`status-badge status-${job.status}`}>
                                        {getStatusDisplay(job.status)}
                                      </span>
                                    </td>
                                  </tr>
                                  );
                                })}
                              </tbody>
                            </table>
          </div>
        )}
                      </div>
                    )}

                    {/* Map View */}
                    {jobsView === 'map' && (
                      <div className="jobs-map-container">
                        <StormMap 
                          jobs={jobs}
                          selectedStormEventId={selectedEventId}
                          onJobClick={(job) => setSelectedJobId(job.id)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
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

      {/* Job Edit Modal */}
      {showJobEditModal && jobEditFormData && selectedJob && (
        <div className="modal-overlay" onClick={() => {
          setShowJobEditModal(false);
          setSelectedJob(null);
          setJobEditFormData(null);
        }}>
          <div className="modal-content job-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Job: {selectedJob.customer_name || 'Unknown'}</h2>
              <button 
                onClick={() => {
                  setShowJobEditModal(false);
                  setSelectedJob(null);
                  setJobEditFormData(null);
                }} 
                className="modal-close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleJobEditSubmit} className="storm-intake-form">
              {/* Property Type Toggle */}
              <div className="form-section">
                <h3 className="form-section-title">Property Type</h3>
                <div className="property-type-toggle">
                  <button
                    type="button"
                    className={`property-type-option ${jobEditFormData.propertyType === 'residential' ? 'active' : ''}`}
                    onClick={() => setJobEditFormData(prev => ({ ...prev, propertyType: 'residential' }))}
                  >
                    Residential
                  </button>
                  <button
                    type="button"
                    className={`property-type-option ${jobEditFormData.propertyType === 'commercial' ? 'active' : ''}`}
                    onClick={() => setJobEditFormData(prev => ({ ...prev, propertyType: 'commercial' }))}
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
                    <label htmlFor="edit-customerName">Customer Name</label>
                    <input
                      type="text"
                      id="edit-customerName"
                      name="customerName"
                      value={jobEditFormData.customerName}
                      onChange={handleJobEditInputChange}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-customerPhone">Phone</label>
                    <input
                      type="tel"
                      id="edit-customerPhone"
                      name="customerPhone"
                      value={jobEditFormData.customerPhone}
                      onChange={handleJobEditInputChange}
                      placeholder="555-555-5555"
                      maxLength="12"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-customerEmail">Email</label>
                    <input
                      type="email"
                      id="edit-customerEmail"
                      name="customerEmail"
                      value={jobEditFormData.customerEmail}
                      onChange={handleJobEditInputChange}
                      placeholder="customer@email.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-propertyAddress">Property Address</label>
                    <input
                      type="text"
                      id="edit-propertyAddress"
                      name="propertyAddress"
                      value={jobEditFormData.propertyAddress}
                      onChange={handleJobEditInputChange}
                      placeholder="Enter property address"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-city">City</label>
                    <input
                      type="text"
                      id="edit-city"
                      name="city"
                      value={jobEditFormData.city}
                      onChange={handleJobEditInputChange}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-state">State</label>
                    <input
                      type="text"
                      id="edit-state"
                      name="state"
                      value={jobEditFormData.state}
                      onChange={handleJobEditInputChange}
                      placeholder="State"
                      maxLength="2"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-zip">Zip Code</label>
                    <input
                      type="text"
                      id="edit-zip"
                      name="zip"
                      value={jobEditFormData.zip}
                      onChange={handleJobEditInputChange}
                      placeholder="Zip code"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-onsiteContactName">Onsite Point-of-Contact Name</label>
                    <input
                      type="text"
                      id="edit-onsiteContactName"
                      name="onsiteContactName"
                      value={jobEditFormData.onsiteContactName}
                      onChange={handleJobEditInputChange}
                      placeholder="Onsite contact name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-onsiteContactPhone">Onsite Point-of-Contact Phone</label>
                    <input
                      type="tel"
                      id="edit-onsiteContactPhone"
                      name="onsiteContactPhone"
                      value={jobEditFormData.onsiteContactPhone}
                      onChange={handleJobEditInputChange}
                      placeholder="555-555-5555"
                      maxLength="12"
                    />
                  </div>
                  {jobEditFormData.propertyType === 'commercial' && (
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="msaOnFile"
                          checked={jobEditFormData.msaOnFile}
                          onChange={handleJobEditInputChange}
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
                
                <div className="property-info-row">
                  <div className="form-group flex-2">
                    <label htmlFor="edit-causeOfLoss">Cause of Loss</label>
                    <select
                      id="edit-causeOfLoss"
                      name="causeOfLoss"
                      value={jobEditFormData.causeOfLoss}
                      onChange={handleJobEditInputChange}
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
                    <label htmlFor="edit-sqftAffected">Sq. Ft. Affected</label>
                    <input
                      type="text"
                      id="edit-sqftAffected"
                      name="sqftAffected"
                      value={jobEditFormData.sqftAffected}
                      onChange={handleJobEditInputChange}
                      placeholder="e.g., 1,500"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Cause Fixed?</label>
                    <div className="inline-toggle">
                      <label className={`toggle-option ${jobEditFormData.causeFixed ? 'active' : ''}`}>
                        <input
                          type="checkbox"
                          name="causeFixed"
                          checked={jobEditFormData.causeFixed}
                          onChange={handleJobEditInputChange}
                        />
                        {jobEditFormData.causeFixed ? 'Yes' : 'No'}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Property-Type Specific Fields */}
                {jobEditFormData.propertyType === 'residential' && (
                  <div className="property-info-row">
                    <div className="form-group flex-1">
                      <label htmlFor="edit-roomsAffected"># Rooms Affected</label>
                      <input
                        type="number"
                        id="edit-roomsAffected"
                        name="roomsAffected"
                        value={jobEditFormData.roomsAffected}
                        onChange={handleJobEditInputChange}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor="edit-foundationType">Foundation</label>
                      <select
                        id="edit-foundationType"
                        name="foundationType"
                        value={jobEditFormData.foundationType}
                        onChange={handleJobEditInputChange}
                      >
                        <option value="">Select...</option>
                        <option value="crawlspace">Crawlspace</option>
                        <option value="slab">Slab</option>
                      </select>
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor="edit-basementType">Basement</label>
                      <select
                        id="edit-basementType"
                        name="basementType"
                        value={jobEditFormData.basementType}
                        onChange={handleJobEditInputChange}
                      >
                        <option value="">Select...</option>
                        <option value="finished">Finished</option>
                        <option value="unfinished">Unfinished</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>
                )}

                {jobEditFormData.propertyType === 'commercial' && (
                  <div className="property-info-row">
                    <div className="form-group flex-1">
                      <label htmlFor="edit-unitsAffected"># Units Affected</label>
                      <input
                        type="number"
                        id="edit-unitsAffected"
                        name="unitsAffected"
                        value={jobEditFormData.unitsAffected}
                        onChange={handleJobEditInputChange}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor="edit-floorsAffected"># Floors Affected</label>
                      <input
                        type="number"
                        id="edit-floorsAffected"
                        name="floorsAffected"
                        value={jobEditFormData.floorsAffected}
                        onChange={handleJobEditInputChange}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-group flex-2">
                      <label htmlFor="edit-parkingLocation">Parking for Crew</label>
                      <input
                        type="text"
                        id="edit-parkingLocation"
                        name="parkingLocation"
                        value={jobEditFormData.parkingLocation}
                        onChange={handleJobEditInputChange}
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
                        className={`toggle-btn ${jobEditFormData.powerAtLocation === 'on' ? 'active' : ''}`}
                        onClick={() => setJobEditFormData(prev => ({ ...prev, powerAtLocation: 'on' }))}
                      >
                        On
                      </button>
                      <button
                        type="button"
                        className={`toggle-btn ${jobEditFormData.powerAtLocation === 'off' ? 'active' : ''}`}
                        onClick={() => setJobEditFormData(prev => ({ ...prev, powerAtLocation: 'off' }))}
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
                        checked={jobEditFormData.tarpingNeeded}
                        onChange={handleJobEditInputChange}
                      />
                      <span>Tarping Needed</span>
                    </label>
                  </div>
                  <div className="condition-item">
                    <label className="condition-checkbox">
                      <input
                        type="checkbox"
                        name="boardupNeeded"
                        checked={jobEditFormData.boardupNeeded}
                        onChange={handleJobEditInputChange}
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
                      checked={jobEditFormData.paymentMethod === 'insurance'}
                      onChange={handleJobEditInputChange}
                    />
                    <span>Has Insurance</span>
                  </label>
                  {jobEditFormData.paymentMethod === 'insurance' && (
                    <div className="payment-sub-fields">
                      <div className="form-group">
                        <label htmlFor="edit-insuranceProvider">Insurance Provider Name</label>
                        <input
                          type="text"
                          id="edit-insuranceProvider"
                          name="insuranceProvider"
                          value={jobEditFormData.insuranceProvider}
                          onChange={handleJobEditInputChange}
                          placeholder="Provider name"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-insuranceClaimNumber">Claim #</label>
                        <input
                          type="text"
                          id="edit-insuranceClaimNumber"
                          name="insuranceClaimNumber"
                          value={jobEditFormData.insuranceClaimNumber}
                          onChange={handleJobEditInputChange}
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
                      checked={jobEditFormData.paymentMethod === 'self_pay'}
                      onChange={handleJobEditInputChange}
                    />
                    <span>Self-Pay</span>
                  </label>
                  {jobEditFormData.paymentMethod === 'self_pay' && (
                    <div className="payment-sub-fields">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="depositExplained"
                          checked={jobEditFormData.depositExplained}
                          onChange={handleJobEditInputChange}
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
                      checked={jobEditFormData.paymentMethod === 'quote_request'}
                      onChange={handleJobEditInputChange}
                    />
                    <span>Requesting Quote</span>
                  </label>
                </div>
              </div>

              {/* Team & Status Section */}
              <div className="form-section">
                <h3 className="form-section-title">Team & Status</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="edit-pm">PM</label>
                    <input
                      type="text"
                      id="edit-pm"
                      name="pm"
                      value={jobEditFormData.pm}
                      onChange={handleJobEditInputChange}
                      placeholder="Project Manager"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-status">Status</label>
                    <select
                      id="edit-status"
                      name="status"
                      value={jobEditFormData.status}
                      onChange={handleJobEditInputChange}
                    >
                      <option value="pending">Pending (Intake)</option>
                      <option value="in_progress">In Progress (Drying)</option>
                      <option value="wip">Work In Progress</option>
                      <option value="complete">Complete</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-priority">Priority</label>
                    <select
                      id="edit-priority"
                      name="priority"
                      value={jobEditFormData.priority}
                      onChange={handleJobEditInputChange}
                    >
                      <option value="">Select priority...</option>
                      <option value="emergency">Emergency</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-estimateValue">Est. Revenue ($)</label>
                    <input
                      type="text"
                      id="edit-estimateValue"
                      name="estimateValue"
                      value={jobEditFormData.estimateValue}
                      onChange={handleJobEditInputChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-dateOfLoss">Date of Loss</label>
                    <input
                      type="date"
                      id="edit-dateOfLoss"
                      name="dateOfLoss"
                      value={jobEditFormData.dateOfLoss}
                      onChange={handleJobEditInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="form-section">
                <h3 className="form-section-title">Notes</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="edit-notes">Additional Notes</label>
                    <textarea
                      id="edit-notes"
                      name="notes"
                      value={jobEditFormData.notes}
                      onChange={handleJobEditInputChange}
                      rows="5"
                      placeholder="Any additional notes or information..."
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="storm-btn storm-btn-primary" disabled={savingJob}>
                  {savingJob ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  className="storm-btn storm-btn-gray"
                  onClick={() => {
                    setShowJobEditModal(false);
                    setSelectedJob(null);
                    setJobEditFormData(null);
                  }}
                  disabled={savingJob}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Storm;
