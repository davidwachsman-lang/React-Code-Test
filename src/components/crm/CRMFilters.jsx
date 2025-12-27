import React from 'react';
import './CRMFilters.css';

function CRMFilters({ filters, onFilterChange }) {
  const {
    relationship_stage = 'all',
    salesRep = 'all',
    topTargetsOnly = false,
    needsFollowup = false,
    prospectType = 'all',
    industry = 'all',
    searchTerm = ''
  } = filters || {};

  return (
    <div className="crm-filters-wrapper">
      <div className="crm-search-bar">
        <label>Search</label>
        <input
          type="text"
          placeholder="Search CRM records..."
          value={searchTerm}
          onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
          className="search-input"
        />
      </div>
      
      <div className="crm-filters">
        <div className="filter-group">
          <label>Relationship Stage</label>
          <select
            value={relationship_stage}
            onChange={(e) => onFilterChange({ relationship_stage: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Stages</option>
            <option value="prospect">Prospect</option>
            <option value="active_customer">Active Customer</option>
            <option value="inactive">Inactive</option>
            <option value="lost">Lost</option>
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
          <label>Industry</label>
          <select
            value={industry}
            onChange={(e) => onFilterChange({ industry: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Industries</option>
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
            <option value="matt">Matt</option>
            <option value="tony">Tony</option>
          </select>
        </div>

        <div className="filter-group filter-checkbox">
          <label>
            <input
              type="checkbox"
              checked={topTargetsOnly}
              onChange={(e) => onFilterChange({ topTargetsOnly: e.target.checked })}
            />
            Top Targets Only
          </label>
        </div>

        <div className="filter-group filter-checkbox">
          <label>
            <input
              type="checkbox"
              checked={needsFollowup}
              onChange={(e) => onFilterChange({ needsFollowup: e.target.checked })}
            />
            Needs Follow-up
          </label>
        </div>
      </div>
    </div>
  );
}

export default CRMFilters;

