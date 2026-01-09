import React from 'react';
import './StormFilters.css';

function StormFilters({ activeFilters, onFilterChange, selectedStormEventId }) {
  const quickFilters = [
    {
      id: 'needsInspection',
      label: 'Needs Inspection',
      description: 'Properties awaiting initial assessment'
    },
    {
      id: 'readyForMitigation',
      label: 'Ready for Mitigation',
      description: 'Inspected and awaiting crew assignment'
    },
    {
      id: 'inProgress',
      label: 'In Progress',
      description: 'Crews actively working on site'
    },
    {
      id: 'emergencyOnly',
      label: 'Emergency Only',
      description: 'High priority/urgent properties'
    },
    {
      id: 'insurancePreApproved',
      label: 'Insurance Pre-Approved',
      description: 'Insurance confirmed coverage'
    }
  ];

  const handleFilterToggle = (filterId) => {
    const isActive = activeFilters?.includes(filterId);
    if (isActive) {
      // Remove filter
      const newFilters = activeFilters.filter(f => f !== filterId);
      onFilterChange?.(newFilters);
    } else {
      // Add filter
      const newFilters = [...(activeFilters || []), filterId];
      onFilterChange?.(newFilters);
    }
  };

  const handleClearAll = () => {
    onFilterChange?.([]);
  };

  return (
    <div className="storm-filters">
      <div className="storm-filters-header">
        <h4>Quick Filters</h4>
        {activeFilters && activeFilters.length > 0 && (
          <button
            type="button"
            className="storm-filters-clear"
            onClick={handleClearAll}
          >
            Clear All ({activeFilters.length})
          </button>
        )}
      </div>
      <div className="storm-filters-grid">
        {quickFilters.map(filter => {
          const isActive = activeFilters?.includes(filter.id);
          return (
            <button
              key={filter.id}
              type="button"
              className={`storm-filter-button ${isActive ? 'active' : ''}`}
              onClick={() => handleFilterToggle(filter.id)}
              title={filter.description}
            >
              <span className="storm-filter-label">{filter.label}</span>
              {isActive && <span className="storm-filter-badge">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StormFilters;
