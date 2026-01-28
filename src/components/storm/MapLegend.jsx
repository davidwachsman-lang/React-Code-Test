import React from 'react';
import './MapLegend.css';

// Default status color mapping - used when no dynamic mapping is provided
const DEFAULT_STATUS_COLORS = [
  { status: 'Stabilization', color: '#ef4444' },
  { status: 'Monitoring', color: '#f97316' },
  { status: 'Demo', color: '#eab308' },
  { status: 'Pickup', color: '#22c55e' },
  { status: 'Walk-Thru', color: '#3b82f6' },
  { status: 'No Work', color: '#6b7280' }
];

/**
 * MapLegend component
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.compact - Use compact layout
 * @param {Object} props.colorMapping - Dynamic color mapping { value: color }
 * @param {string} props.title - Legend title (defaults to "Legend")
 */
function MapLegend({ className = '', compact = false, colorMapping = null, title = 'Legend' }) {
  // Convert colorMapping object to array format
  const legendItems = colorMapping && Object.keys(colorMapping).length > 0
    ? Object.entries(colorMapping).map(([value, color]) => ({ status: value, color }))
    : DEFAULT_STATUS_COLORS;

  if (legendItems.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={`map-legend map-legend-compact ${className}`}>
        {legendItems.map(({ status, color }) => (
          <div key={status} className="legend-item-compact">
            <span 
              className="legend-dot" 
              style={{ backgroundColor: color }}
            />
            <span className="legend-label">{status}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`map-legend ${className}`}>
      <h4 className="legend-title">{title}</h4>
      <div className="legend-items">
        {legendItems.map(({ status, color }) => (
          <div key={status} className="legend-item">
            <span 
              className="legend-dot" 
              style={{ backgroundColor: color }}
            />
            <div className="legend-text">
              <span className="legend-label">{status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MapLegend;
