import React from 'react';

const DIVISION_OPTIONS = ['All Divisions', 'HB Nashville', 'Large Loss'];
const STATUS_OPTIONS = ['All Statuses', 'Invoiced', 'Partial Payment', 'Overdue', 'Collections'];

export default function ARFilters({ filters, pmOptions, onFilterChange, onClear }) {
  return (
    <div className="bar-filters">
      <select
        value={filters.division}
        onChange={(e) => onFilterChange('division', e.target.value)}
      >
        {DIVISION_OPTIONS.map(opt => (
          <option key={opt} value={opt === 'All Divisions' ? '' : opt}>{opt}</option>
        ))}
      </select>

      <select
        value={filters.pm}
        onChange={(e) => onFilterChange('pm', e.target.value)}
      >
        <option value="">All PMs</option>
        {pmOptions.map(pm => (
          <option key={pm} value={pm}>{pm}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value)}
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt} value={opt === 'All Statuses' ? '' : opt}>{opt}</option>
        ))}
      </select>

      {(filters.division || filters.pm || filters.status || filters.agingBucket !== null) && (
        <button type="button" className="bar-clear-btn" onClick={onClear}>
          Clear Filters
        </button>
      )}
    </div>
  );
}
