import React, { useState, useEffect, useRef } from 'react';
import './CRMForm.css';
import ActivityTimeline from '../ActivityTimeline';
import ActivityForm from '../ActivityForm';
import { useActivities } from '../../hooks/useActivities';
import crmActivityService from '../../services/crmActivityService';

function CRMForm({ crmRecord = null, parentRecords = [], onSave, onCancel, onCreateParent }) {
  const [activeTab, setActiveTab] = useState('details');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const parentInputRef = useRef(null);
  const parentDropdownRef = useRef(null);
  
  // Load activities for this CRM record
  const { data: activities, loading: activitiesLoading, refetch: refetchActivities } = useActivities(crmRecord?.id);
  
  // Handle activity save
  const handleActivitySave = async (activityData) => {
    try {
      await crmActivityService.create({ ...activityData, crm_id: crmRecord.id });
      setShowActivityForm(false);
      refetchActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Failed to save activity: ' + error.message);
    }
  };
  
  // Google Places Autocomplete refs
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [autocompleteStatus, setAutocompleteStatus] = useState('loading');
  
  const [formData, setFormData] = useState({
    prospect_type: 'commercial',
    parent_id: '',
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
    latitude: '',
    longitude: '',
    industry: '',
    association_membership: '',
    primary_sales_rep: '',
    secondary_sales_rep: '',
    account_manager: '',
    relationship_stage: 'prospect',
    priority: 'warm',
    is_top_target: false,
    lead_source: 'direct',
    damage_type: '',
    estimated_job_value: '',
    probability_to_close: '',
    courting_cost: '',
    initial_contact_date: '',
    insight_meeting_date: '',
    next_followup_date: '',
    date_closed: '',
    first_referral_date: '',
    lost_reason: '',
    notes: ''
  });

  useEffect(() => {
    if (crmRecord) {
      const parentId = crmRecord.parent_id || '';
      setFormData({
        prospect_type: crmRecord.prospect_type || 'commercial',
        parent_id: parentId,
        company_name: crmRecord.company_name || '',
        first_name: crmRecord.first_name || '',
        last_name: crmRecord.last_name || '',
        title: crmRecord.title || '',
        email: crmRecord.email || '',
        phone_primary: crmRecord.phone_primary || '',
        phone_secondary: crmRecord.phone_secondary || '',
        address: crmRecord.address || '',
        city: crmRecord.city || '',
        state: crmRecord.state || '',
        zip: crmRecord.zip || '',
        latitude: crmRecord.latitude || '',
        longitude: crmRecord.longitude || '',
        industry: crmRecord.industry || '',
        association_membership: crmRecord.association_membership || '',
        primary_sales_rep: crmRecord.primary_sales_rep || '',
        secondary_sales_rep: crmRecord.secondary_sales_rep || '',
        account_manager: crmRecord.account_manager || '',
        relationship_stage: crmRecord.relationship_stage || 'prospect',
        priority: crmRecord.priority || 'warm',
        is_top_target: crmRecord.is_top_target || false,
        lead_source: crmRecord.lead_source || 'direct',
        damage_type: crmRecord.damage_type || '',
        estimated_job_value: crmRecord.estimated_job_value || '',
        probability_to_close: crmRecord.probability_to_close || '',
        courting_cost: crmRecord.courting_cost || '',
        initial_contact_date: crmRecord.initial_contact_date || '',
        insight_meeting_date: crmRecord.insight_meeting_date || '',
        next_followup_date: crmRecord.next_followup_date || '',
        date_closed: crmRecord.date_closed || '',
        first_referral_date: crmRecord.first_referral_date || '',
        lost_reason: crmRecord.lost_reason || '',
        notes: crmRecord.notes || ''
      });
      
      // Set initial search term to parent company name if parent_id exists
      if (parentId && parentRecords.length > 0) {
        const parent = parentRecords.find(p => p.id === parentId);
        if (parent) {
          setParentSearchTerm(parent.company_name || `${parent.first_name} ${parent.last_name}`.trim() || '');
        }
      }
    }
  }, [crmRecord, parentRecords]);

  // Filter parent records based on search term
  const filteredParentRecords = parentRecords.filter(record => {
    const searchLower = parentSearchTerm.toLowerCase();
    const companyName = (record.company_name || '').toLowerCase();
    const fullName = `${record.first_name || ''} ${record.last_name || ''}`.toLowerCase().trim();
    return companyName.includes(searchLower) || fullName.includes(searchLower);
  });

  // Handle parent record selection
  const handleParentSelect = (parentId, displayName) => {
    setFormData(prev => ({ ...prev, parent_id: parentId }));
    setParentSearchTerm(displayName);
    setShowParentDropdown(false);
  };

  // Handle parent search input change
  const handleParentSearchChange = (e) => {
    const value = e.target.value;
    setParentSearchTerm(value);
    setShowParentDropdown(true);
    
    // If cleared, also clear parent_id
    if (!value) {
      setFormData(prev => ({ ...prev, parent_id: '' }));
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        parentInputRef.current &&
        !parentInputRef.current.contains(event.target) &&
        parentDropdownRef.current &&
        !parentDropdownRef.current.contains(event.target)
      ) {
        setShowParentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        console.log('Initializing Google Places Autocomplete for CRM form...');
        
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Exclude latitude and longitude - they're not columns in crm_records table
    // (used only for autocomplete UX, not stored on CRM record)
    const { latitude, longitude, ...formDataWithoutCoords } = formData;
    const data = {
      ...formDataWithoutCoords,
      parent_id: formData.parent_id || null,
      estimated_job_value: formData.estimated_job_value ? parseFloat(formData.estimated_job_value) : null,
      probability_to_close: formData.probability_to_close ? parseInt(formData.probability_to_close) : null,
      courting_cost: formData.courting_cost ? parseFloat(formData.courting_cost) : null,
      primary_sales_rep: formData.primary_sales_rep || null,
      secondary_sales_rep: formData.secondary_sales_rep || null,
      account_manager: formData.account_manager || null,
      initial_contact_date: formData.initial_contact_date || null,
      insight_meeting_date: formData.insight_meeting_date || null,
      next_followup_date: formData.next_followup_date || null,
      date_closed: formData.date_closed || null,
      first_referral_date: formData.first_referral_date || null,
      damage_type: formData.damage_type || null,
      industry: formData.industry || null,
      lead_source: formData.lead_source || null,
      priority: formData.priority || null
    };
    onSave(data);
  };

  const showIndustryField = formData.prospect_type === 'commercial';
  const isEditing = !!crmRecord;

  return (
    <div className="crm-form-container">
      {/* Tabs - only show when editing */}
      {isEditing && (
        <div className="crm-form-tabs">
          <button
            type="button"
            className={activeTab === 'details' ? 'active' : ''}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            type="button"
            className={activeTab === 'activities' ? 'active' : ''}
            onClick={() => setActiveTab('activities')}
          >
            Activities
          </button>
        </div>
      )}

      {/* Activities Tab */}
      {isEditing && activeTab === 'activities' && (
        <div className="crm-form-activities">
          <div className="activities-header">
            <h3>Activity Log</h3>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowActivityForm(true)}
            >
              Log Activity
            </button>
          </div>
          
          {showActivityForm && (
            <div className="activity-form-wrapper">
              <ActivityForm
                crmId={crmRecord.id}
                onSave={handleActivitySave}
                onCancel={() => setShowActivityForm(false)}
              />
            </div>
          )}
          
          {activitiesLoading ? (
            <div className="loading-message">Loading activities...</div>
          ) : (
            <ActivityTimeline activities={activities || []} />
          )}
          
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Details Tab (Form) */}
      {(!isEditing || activeTab === 'details') && (
      <form className="crm-form" onSubmit={handleSubmit}>
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
        <div className="form-group" style={{ position: 'relative' }}>
          <label>Parent Record</label>
          <input
            ref={parentInputRef}
            type="text"
            value={parentSearchTerm}
            onChange={handleParentSearchChange}
            onFocus={() => setShowParentDropdown(true)}
            placeholder="Search for parent company (leave empty for top level)"
            autoComplete="off"
          />
          {showParentDropdown && parentSearchTerm && filteredParentRecords.length > 0 && (
            <div
              ref={parentDropdownRef}
              className="parent-autocomplete-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'rgba(30, 41, 59, 0.98)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                marginTop: '4px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              {filteredParentRecords.map(record => {
                const displayName = record.company_name || `${record.first_name} ${record.last_name}`.trim() || 'Unnamed';
                return (
                  <div
                    key={record.id}
                    onClick={() => handleParentSelect(record.id, displayName)}
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                      color: '#f1f5f9'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    {displayName}
                  </div>
                );
              })}
              {onCreateParent && (
                <div
                  onClick={async () => {
                    setShowParentDropdown(false);
                    const newParent = await onCreateParent(parentSearchTerm);
                    if (newParent) {
                      handleParentSelect(newParent.id, parentSearchTerm);
                    }
                  }}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    borderTop: '1px solid rgba(59, 130, 246, 0.3)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#60a5fa',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                  }}
                >
                  + Create "{parentSearchTerm}" as new parent
                </div>
              )}
            </div>
          )}
          {showParentDropdown && parentSearchTerm && filteredParentRecords.length === 0 && (
            <div
              ref={parentDropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'rgba(30, 41, 59, 0.98)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                zIndex: 1000,
                marginTop: '4px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{ padding: '10px 15px', color: '#94a3b8' }}>
                No matching records found
              </div>
              {onCreateParent && (
                <div
                  onClick={async () => {
                    setShowParentDropdown(false);
                    const newParent = await onCreateParent(parentSearchTerm);
                    if (newParent) {
                      handleParentSelect(newParent.id, parentSearchTerm);
                    }
                  }}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    borderTop: '1px solid rgba(59, 130, 246, 0.3)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#60a5fa',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                  }}
                >
                  + Create "{parentSearchTerm}" as new parent
                </div>
              )}
            </div>
          )}
        </div>
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
        <label>
          Address
          {autocompleteStatus === 'ready' && <span style={{ color: '#22c55e', marginLeft: '8px', fontSize: '0.8em' }}>✓ Autocomplete active</span>}
          {autocompleteStatus === 'loading' && <span style={{ color: '#f59e0b', marginLeft: '8px', fontSize: '0.8em' }}>Loading...</span>}
          {autocompleteStatus === 'error' && <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '0.8em' }}>⚠ API Error</span>}
          {autocompleteStatus === 'unavailable' && <span style={{ color: '#94a3b8', marginLeft: '8px', fontSize: '0.8em' }}>Manual entry</span>}
        </label>
        <input
          type="text"
          name="address"
          ref={addressInputRef}
          value={formData.address}
          onChange={handleInputChange}
          placeholder={autocompleteStatus === 'ready' ? "Start typing address..." : "Enter full address manually"}
          autoComplete="off"
        />
        {autocompleteStatus === 'error' && (
          <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
            Google Maps API error. Please enter address manually or check browser console for details.
          </small>
        )}
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
        <div className="form-group">
          <label>Association Membership</label>
          <input
            type="text"
            name="association_membership"
            value={formData.association_membership}
            onChange={handleInputChange}
          />
        </div>
      )}

      <div className="form-section-divider"></div>
      <div className="form-section-header">Relationship & Sales Pipeline</div>

      <div className="form-row">
        <div className="form-group">
          <label>Relationship Stage *</label>
          <select
            name="relationship_stage"
            value={formData.relationship_stage}
            onChange={handleInputChange}
            required
          >
            <option value="prospect">Prospect</option>
            <option value="active_customer">Active Customer</option>
            <option value="inactive">Inactive</option>
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
        <div className="form-group">
          <label>Courting Cost ($)</label>
          <input
            type="number"
            name="courting_cost"
            value={formData.courting_cost}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="form-group form-checkbox">
        <label>
          <input
            type="checkbox"
            name="is_top_target"
            checked={formData.is_top_target}
            onChange={handleInputChange}
          />
          Top Target
        </label>
      </div>

      <div className="form-section-divider"></div>
      <div className="form-section-header">Sales Rep Assignment</div>

      <div className="form-row">
        <div className="form-group">
          <label>Primary Sales Rep</label>
          <select
            name="primary_sales_rep"
            value={formData.primary_sales_rep}
            onChange={handleInputChange}
          >
            <option value="">Unassigned</option>
            <option value="bri">Bri</option>
            <option value="paige">Paige</option>
            <option value="matt">Matt</option>
            <option value="tony">Tony</option>
            <option value="david">David</option>
            <option value="mike">Mike</option>
            <option value="ainsley">Ainsley</option>
            <option value="joe">Joe</option>
          </select>
        </div>
        <div className="form-group">
          <label>Secondary Sales Rep</label>
          <select
            name="secondary_sales_rep"
            value={formData.secondary_sales_rep}
            onChange={handleInputChange}
          >
            <option value="">Unassigned</option>
            <option value="bri">Bri</option>
            <option value="paige">Paige</option>
            <option value="matt">Matt</option>
            <option value="tony">Tony</option>
            <option value="david">David</option>
            <option value="mike">Mike</option>
            <option value="ainsley">Ainsley</option>
            <option value="joe">Joe</option>
          </select>
        </div>
        <div className="form-group">
          <label>Account Manager</label>
          <select
            name="account_manager"
            value={formData.account_manager}
            onChange={handleInputChange}
          >
            <option value="">Unassigned</option>
            <option value="bri">Bri</option>
            <option value="paige">Paige</option>
            <option value="matt">Matt</option>
            <option value="tony">Tony</option>
            <option value="david">David</option>
            <option value="mike">Mike</option>
            <option value="ainsley">Ainsley</option>
            <option value="joe">Joe</option>
          </select>
        </div>
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

      {formData.relationship_stage === 'lost' && (
        <div className="form-group">
          <label>Lost Reason</label>
          <textarea
            name="lost_reason"
            value={formData.lost_reason}
            onChange={handleInputChange}
            rows="3"
            placeholder="Reason why this record was lost"
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
          placeholder="Additional notes about this CRM record"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {crmRecord ? 'Update CRM Record' : 'Create CRM Record'}
        </button>
      </div>
    </form>
      )}
    </div>
  );
}

export default CRMForm;

