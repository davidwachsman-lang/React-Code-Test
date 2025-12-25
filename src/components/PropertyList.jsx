import React from 'react';
import './PropertyList.css';

function PropertyList({ properties = [], onEdit, onDelete, onAdd }) {
  if (!properties || properties.length === 0) {
    return (
      <div className="property-list-empty">
        <p>No properties found.</p>
        {onAdd && (
          <button className="btn-primary" onClick={onAdd}>
            Add Property
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="property-list">
      {onAdd && (
        <div className="property-list-header">
          <button className="btn-primary" onClick={onAdd}>
            + Add Property
          </button>
        </div>
      )}
      <div className="property-list-items">
        {properties.map(property => (
          <div key={property.id} className="property-item">
            <div className="property-item-header">
              <div className="property-item-title">
                <h4>{property.property_name || 'Unnamed Property'}</h4>
                {property.is_primary_location && (
                  <span className="primary-badge">Primary</span>
                )}
              </div>
              <div className="property-item-actions">
                {onEdit && (
                  <button
                    className="btn-icon"
                    onClick={() => onEdit(property)}
                    title="Edit property"
                  >
                    ✏️
                  </button>
                )}
                {onDelete && (
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this property?')) {
                        onDelete(property.id);
                      }
                    }}
                    title="Delete property"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            <div className="property-item-details">
              <div className="property-detail-row">
                <span className="property-label">Address:</span>
                <span className="property-value">
                  {[property.address, property.city, property.state, property.zip]
                    .filter(Boolean)
                    .join(', ') || 'No address'}
                </span>
              </div>
              {property.property_type && (
                <div className="property-detail-row">
                  <span className="property-label">Type:</span>
                  <span className="property-value">{property.property_type}</span>
                </div>
              )}
              {(property.units_count || property.square_footage || property.year_built) && (
                <div className="property-detail-row">
                  <span className="property-label">Details:</span>
                  <span className="property-value">
                    {[
                      property.units_count && `${property.units_count} units`,
                      property.square_footage && `${property.square_footage.toLocaleString()} sq ft`,
                      property.year_built && `Built ${property.year_built}`
                    ].filter(Boolean).join(' • ')}
                  </span>
                </div>
              )}
              {property.notes && (
                <div className="property-detail-row">
                  <span className="property-label">Notes:</span>
                  <span className="property-value">{property.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PropertyList;

