import React, { useState, useEffect } from 'react';
import './PropertyForm.css';

function PropertyForm({ prospectId, crmId, property = null, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    property_name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    property_type: '',
    units_count: '',
    square_footage: '',
    year_built: '',
    is_primary_location: false,
    notes: ''
  });

  useEffect(() => {
    if (property) {
      setFormData({
        property_name: property.property_name || '',
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        zip: property.zip || '',
        property_type: property.property_type || '',
        units_count: property.units_count || '',
        square_footage: property.square_footage || '',
        year_built: property.year_built || '',
        is_primary_location: property.is_primary_location || false,
        notes: property.notes || ''
      });
    }
  }, [property]);

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
      crm_id: crmId || prospectId, // Support both for backward compatibility
      prospect_id: prospectId, // Keep for backward compatibility
      units_count: formData.units_count ? parseInt(formData.units_count) : null,
      square_footage: formData.square_footage ? parseInt(formData.square_footage) : null,
      year_built: formData.year_built ? parseInt(formData.year_built) : null
    };
    onSave(data);
  };

  return (
    <form className="property-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Property Name</label>
          <input
            type="text"
            name="property_name"
            value={formData.property_name}
            onChange={handleInputChange}
            placeholder="Property name or identifier"
          />
        </div>
        <div className="form-group">
          <label>Property Type</label>
          <select
            name="property_type"
            value={formData.property_type}
            onChange={handleInputChange}
          >
            <option value="">Select type...</option>
            <option value="apartment">Apartment</option>
            <option value="office">Office</option>
            <option value="retail">Retail</option>
            <option value="warehouse">Warehouse</option>
            <option value="hotel">Hotel</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Address</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          placeholder="Street address"
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

      <div className="form-row">
        <div className="form-group">
          <label>Units Count</label>
          <input
            type="number"
            name="units_count"
            value={formData.units_count}
            onChange={handleInputChange}
            min="0"
          />
        </div>
        <div className="form-group">
          <label>Square Footage</label>
          <input
            type="number"
            name="square_footage"
            value={formData.square_footage}
            onChange={handleInputChange}
            min="0"
          />
        </div>
        <div className="form-group">
          <label>Year Built</label>
          <input
            type="number"
            name="year_built"
            value={formData.year_built}
            onChange={handleInputChange}
            min="1800"
            max={new Date().getFullYear()}
          />
        </div>
      </div>

      <div className="form-group form-checkbox">
        <label>
          <input
            type="checkbox"
            name="is_primary_location"
            checked={formData.is_primary_location}
            onChange={handleInputChange}
          />
          Primary Location
        </label>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows="3"
          placeholder="Additional notes about this property"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {property ? 'Update Property' : 'Add Property'}
        </button>
      </div>
    </form>
  );
}

export default PropertyForm;

