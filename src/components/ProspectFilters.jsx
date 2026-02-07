import React from 'react';
import './ProspectFilters.css';

function ProspectFilters({ filters, onFilterChange }) {
  const {
    status = 'all',
    priority = 'all',
    salesRep = 'all',
    top10Only = false,
    prospectType = 'all',
    searchTerm = ''
  } = filters || {};

  return (
    <div className="prospect-filters-wrapper">
      <div className="prospect-search-bar">
        <label>Search</label>
        <input
          type="text"
          placeholder="Search prospects..."
          value={searchTerm}
          onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
          className="search-input"
        />
      </div>
      
      <div className="prospect-filters">
        <div className="filter-group">
          <label>Status</label>
          <select
            value={status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>

      <div className="filter-group">
        <label>Priority</label>
        <select
          value={priority}
          onChange={(e) => onFilterChange({ priority: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Priorities</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Prospect Type</label>
        <select
          value={prospectType}
          onChange={(e) => onFilterChange({ prospectType: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="commercial">Commercial</option>
          <option value="agent">Agent</option>
          <option value="adjuster">Adjuster</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Sales Rep</label>
        <select
          value={salesRep}
          onChange={(e) => onFilterChange({ salesRep: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Reps</option>
          <option value="bri">Bri</option>
          <option value="paige">Paige</option>
          <option value="tony">Tony</option>
        </select>
      </div>

      <div className="filter-group filter-checkbox">
        <label>
          <input
            type="checkbox"
            checked={top10Only}
            onChange={(e) => onFilterChange({ top10Only: e.target.checked })}
          />
          Top 10 Targets Only
        </label>
      </div>
      </div>
    </div>
  );
}

export default ProspectFilters;

