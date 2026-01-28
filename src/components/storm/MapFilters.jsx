import React, { useState, useMemo } from 'react';
import './MapFilters.css';

function MapFilters({ 
  jobs, 
  colorMapping, 
  colorColumn,
  columns = [],
  activeFilters = {},
  onFilterChange
}) {
  const [expandedColumns, setExpandedColumns] = useState(new Set([colorColumn].filter(Boolean)));
  const [showFilters, setShowFilters] = useState(true);

  // Get unique values for each column
  const columnValues = useMemo(() => {
    const values = {};
    columns.forEach(col => {
      const uniqueVals = new Set();
      jobs.forEach(job => {
        const val = job.rawData?.[col];
        if (val && val.trim() !== '') {
          uniqueVals.add(val);
        }
      });
      if (uniqueVals.size > 0 && uniqueVals.size <= 50) { // Only show columns with reasonable number of unique values
        values[col] = Array.from(uniqueVals).sort();
      }
    });
    return values;
  }, [jobs, columns]);

  // Get counts for each value in each column
  const getValueCount = (column, value) => {
    return jobs.filter(job => job.rawData?.[column] === value).length;
  };

  // Toggle column expansion
  const toggleColumn = (column) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(column)) {
      newExpanded.delete(column);
    } else {
      newExpanded.add(column);
    }
    setExpandedColumns(newExpanded);
  };

  // Toggle a filter value
  const toggleFilter = (column, value) => {
    const currentFilters = activeFilters[column] || [];
    let newColumnFilters;
    
    if (currentFilters.includes(value)) {
      // Remove value
      newColumnFilters = currentFilters.filter(v => v !== value);
    } else {
      // Add value
      newColumnFilters = [...currentFilters, value];
    }
    
    const newFilters = { ...activeFilters };
    if (newColumnFilters.length === 0) {
      delete newFilters[column]; // Remove column from filters if no values selected
    } else {
      newFilters[column] = newColumnFilters;
    }
    
    onFilterChange(newFilters);
  };

  // Select all values for a column
  const selectAllForColumn = (column) => {
    const newFilters = { ...activeFilters };
    delete newFilters[column]; // No filter = show all
    onFilterChange(newFilters);
  };

  // Select none for a column
  const selectNoneForColumn = (column) => {
    const newFilters = { ...activeFilters };
    newFilters[column] = []; // Empty array = show none
    onFilterChange(newFilters);
  };

  // Check if a value is visible
  const isValueVisible = (column, value) => {
    if (!activeFilters[column]) return true; // No filter for this column = all visible
    if (activeFilters[column].length === 0) return false; // Empty array = none visible
    return activeFilters[column].includes(value);
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFilterChange({});
  };

  // Get filterable columns (columns with reasonable number of unique values)
  const filterableColumns = Object.keys(columnValues);

  if (filterableColumns.length === 0) {
    return null;
  }

  // Count active filters
  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className="map-filters-container">
      <div className="map-filters-header" onClick={() => setShowFilters(!showFilters)}>
        <h4>
          <span className="filter-icon">🔍</span>
          Filters
          {activeFilterCount > 0 && (
            <span className="active-filter-badge">{activeFilterCount} active</span>
          )}
        </h4>
        <span className={`toggle-arrow ${showFilters ? 'open' : ''}`}>▼</span>
      </div>
      
      {showFilters && (
        <div className="map-filters-content">
          {activeFilterCount > 0 && (
            <button className="clear-all-btn" onClick={clearAllFilters}>
              Clear All Filters
            </button>
          )}
          
          <div className="filter-columns">
            {filterableColumns.map(column => (
              <div key={column} className="filter-column-group">
                <div 
                  className={`filter-column-header ${expandedColumns.has(column) ? 'expanded' : ''}`}
                  onClick={() => toggleColumn(column)}
                >
                  <span className="column-name">
                    {column}
                    {column === colorColumn && <span className="color-badge">color</span>}
                  </span>
                  <span className="column-count">
                    ({columnValues[column].length})
                  </span>
                  <span className={`column-arrow ${expandedColumns.has(column) ? 'open' : ''}`}>
                    ▶
                  </span>
                </div>
                
                {expandedColumns.has(column) && (
                  <div className="filter-column-content">
                    <div className="filter-actions">
                      <button onClick={() => selectAllForColumn(column)}>All</button>
                      <button onClick={() => selectNoneForColumn(column)}>None</button>
                    </div>
                    
                    <div className="filter-values">
                      {columnValues[column].map(value => (
                        <label 
                          key={value} 
                          className={`filter-value ${isValueVisible(column, value) ? 'active' : 'inactive'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isValueVisible(column, value)}
                            onChange={() => toggleFilter(column, value)}
                          />
                          {column === colorColumn && (
                            <span 
                              className="filter-color-dot"
                              style={{ backgroundColor: colorMapping[value] || '#6b7280' }}
                            />
                          )}
                          <span className="filter-value-label">{value}</span>
                          <span className="filter-value-count">{getValueCount(column, value)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MapFilters;
